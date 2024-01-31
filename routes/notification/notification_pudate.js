const pool = require("../../db");
const express = require("express");
const firebase = require('firebase-admin');
const firebaseCredential = require("../../gdjang_firebase.json");
const scheduler = require('node-schedule');
const router = express.Router();

firebase.initializeApp({
    credential: firebase.credential.cert(firebaseCredential),
});

const createTokenMessage = (token, title, content) => {
    let message;

    message = {
        notification: {                
            title: title,
            body: content
        },
        data: {
            title: title,
            body: content
        },
            tokens: token
        }

    return message;
}

//알림테이블에 해당상품 픽업D-1 예약알림 존재 여부 파악 후 없으면 테이블에 Insert
const createPickUpMessage = async (title, content, userno, date) => {
    let result;
    [alarm_info]= 
    await pool.execute(`SELECT notification_title, notification_date FROM notification 
            JOIN notification_by_user ON notification.notification_id = notification_by_user.notification_id 
            WHERE notification_user=${userno} and notification_type="픽업D-1" `);

    if (alarm_info.length> 0){
        for (let i=0;i<alarm_info.length; i++){
            if (alarm_info[i].notification_title==title && alarm_info[i].notification_date==date) break;  // 중복알림 방지
        }
        console.log("이미 해당상품 예약알림 존재");
    } else{
        [result] = await pool.execute(`INSERT INTO notification (notification_title, notification_content, notification_type, notification_target,
            notification_push_type, notification_date) VALUES (?, ?, ?, ?, ?, ?)`, [title, content, "픽업D-1", "개인", "예약", date]);
        
        try {
            console.log(result.insertId);
            await pool.execute(`INSERT INTO notification_by_user (notification_user, notification_id, status) VALUES (?, ?, ?)`,
            [userno, result.insertId, 'SCHEDULED']);

            res.send({msg: "NOTIFICATION_RESERVE_SUCCESS"});
       // }
        } catch (e) {
            console.log(e);
        }
    }   
}

/** 매 정각에 예약된 알림(정각 ~ 5분 사이) 확인 후 발송 */
scheduler.scheduleJob('0 * * * *', async () => {
    try {
        const [notifications, field] = await db.execute(`SELECT notification_id, notification_target, notification_title, notification_content FROM notification 
                                                                      WHERE notification_push_type = ? AND notification_date BETWEEN NOW() and NOW() + INTERVAL 5 MINUTE`, ['예약']);

        for (const notification of notifications) {
            const notificationId = notification.notification_id;
            const target = notification.notification_target;
            const title = notification.notification_title;
            const content = notification.notification_content;
            const image = notification.notification_img;

            const [users, fields] = await db.execute(`SELECT notification_user FROM notification_by_user WHERE notification_id = ?`, [notificationId]);
            let userIds = [];
            for (let user of users) {
                userIds.push(user.notification_user);
            }

            if (target === '개인') {
                const tokens = await getTokensByUser(userIds);

                const message = createTokenMessage(tokens, title, content, image);
                const msgResult = await firebase.messaging().sendMulticast(message);
            }

            await db.execute(`UPDATE notification_by_user SET status = ? WHERE notification_id = ?`, ['SENT', notificationId]);
            console.log(`NOTIFICATION_SEND_SUCCESS (schedule) :: notificationId = ${notificationId}`);
        }
    } catch (e) {
        console.log(`NOTIFICATION_SEND_FAILED: ` , e);
    }
})

// 픽업 하루 전 확인 후 알림 예약
router.post('/push', async (req, res) => {
    const user_id = req.body.user_id;
    let userno, user_name, count;

    try{
        const u_data = await pool.query("SELECT user_no, fcm_token, user_name FROM user WHERE user_id=? ",[user_id]);
        userno = u_data[0][0].user_no;
        user_name=u_data[0][0].user_name;

        [pu_info] = await pool.execute(`SELECT md_name, order_pu_date FROM md JOIN ggdjang.order ON md.md_id = ggdjang.order.md_id WHERE ggdjang.order.user_id=?`, [user_id]);
        count=pu_info.length;
    } catch(error) {
        console.log(error);
    }

    let title, content;

    for(let i =0; i<count; i++) {
        const TIME_ZONE = 9 * 60 * 60 * 1000; // 9시간 (UTC(미국) 기준 -> 한국 변환)
        const date = new Date(Date() + TIME_ZONE).toISOString().split('T')[0];
        console.log(pu_info[i].order_pu_date);

        let arr1 = date.split('-');
        let arr2 = pu_info[i].order_pu_date.split('-');
        let dat1 = new Date(arr1[0], arr1[1], arr1[2]);
        let dat2 = new Date(arr2[0], arr2[1], arr2[2]);

        const now= new Date();
        let tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow= tomorrow.toISOString().split('T')[0];
        //console.log("내일:", tomorrow);

        //날짜 차이 (pu_time이 2일 전 일때 테이블에 삽입)
        let diff = dat2 - dat1;  //3월 5일 - 3월 3일
        let currDay = 24 * 60 * 60 * 1000;// 시 * 분 * 초 * 밀리세컨

        if(parseInt(diff/currDay)==2) {
            title="["+ pu_info[i].md_name + "] 픽업 D-1 알림"  ;
            content="내일은 " + user_name+ "님이 구매하신 "+ pu_info[i].md_name+ " 픽업날입니다. 픽업 정보를 확인해보세요!" ;
            createPickUpMessage(title,content,userno,tomorrow);
        }
    }

})

module.exports = router; 