const pool = require("../db");
const express = require("express");
const firebase = require('firebase-admin');
const firebaseCredential = require("../gdjang_firebase.json");
const router = express.Router();

// 주문 처리 함수
async function processOrder(user_id, md_id, store_id, select_qty, order_price, pu_date, pu_time, order_name, md_name) {
  let connection;
  
  const order_pu_date = new Date(pu_date); //문자열을 날짜형으로 변환
  const order_date = new Date();
  const order_pu_time = new Date(pu_date + " " + pu_time + ":00");

  const uData = await pool.query("SELECT user_no, user_name, fcm_token FROM user WHERE user_id=? ", [user_id]);
  const userno = uData[0][0].user_no;
  const user_name = uData[0][0].user_name;
  const targetToken = uData[0][0].fcm_token;

  const mTitle = md_name + " 무통장 입금 안내";
  const mContent = `안녕하세요. ${user_name}님. 무통장 입금 계좌 안내드립니다. 은행 : 우리은행 계좌번호 : 1002-363-127161 예금주 : 김민서 금액 : ${order_price}원 입금 확인 시간은 매일 11-15시/18-22시 진행됩니다. 문의사항은 [마이페이지 > 고객센터 > 문의하기]를 사용해주세요.`;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orderInsert] = await connection.execute(
      `INSERT INTO ggdjang.order (order_select_qty, order_pu_date, order_date, order_pu_time, order_price, user_id, md_id, store_id, user_name, order_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [select_qty, order_pu_date, order_date, order_pu_time, order_price, user_id, md_id, store_id, user_name, order_name]
    );

    await connection.commit();

    return { orderInsert, userno, targetToken, mTitle, mContent };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error in processOrder:", error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 알림 전송 함수
async function sendNotification(targetToken, mTitle, mContent) {
  const message = {
    notification: {
      title: mTitle,
      body: mContent,
    },
    data: {
      title: mTitle,
      body: mContent,
    },
    token: targetToken,
  };

  try {
    await firebase.messaging().send(message);
  } catch (error) {
    //console.error("Error in sendNotification:", error);
    //throw error;
  }
}

// 데이터베이스 업데이트 함수
async function updateDatabase(select_qty, md_id, user_id, userno, store_id, mTitle, mContent) {
  let connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 재고 감소 & 총 주문 수량 증가
    await connection.execute(`UPDATE stock SET stk_remain = stk_remain - ?, stk_total = stk_total + ? WHERE md_id = ?`, [select_qty, select_qty, md_id]);
    
    // 장바구니 리스트 삭제
    await connection.execute(`DELETE FROM cart WHERE user_id = ? and store_id = ? and md_id= ?`, [user_id, store_id, md_id]);

    // 알림 테이블 추가
    const result = await connection.execute(
      `INSERT INTO notification (notification_title, notification_content, notification_type, notification_target, notification_push_type) VALUES (?, ?, ?, ?, ?)`,
      [mTitle, mContent, "결제알림", "개인", "실시간"]
    );

    // 사용자 알림 추가
    await connection.execute(`INSERT INTO notification_by_user (notification_user, notification_id, status) VALUES (?, ?, ?)`, [userno, result[0].insertId, 'SENT']);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Error in updateDatabase:", error);
    throw error;
  } finally {
    connection.release();
  }
}

router.post("/", async (req, res) => {
  let connection; // connection 변수를 상위 스코프에 정의

  try {
    const { user_id, md_id, store_id, select_qty, order_price, pu_date, pu_time, order_name, md_name } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { orderInsert, userno, targetToken, mTitle, mContent } = await processOrder(user_id, md_id, store_id, select_qty, order_price, pu_date, pu_time, order_name, md_name);

    if (orderInsert && orderInsert.insertId) {
      await sendNotification(targetToken, mTitle, mContent);
      await updateDatabase(select_qty, md_id, user_id, userno, store_id, mTitle, mContent);

      await connection.commit();

      return res.json({
        code: 200,
        message: "orderInsert success",
        order_id: orderInsert.insertId,
      });
    } else {
      return res.json({
        code: 404,
        message: "에러가 발생했습니다.",
      });
    }
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error: ", error);
    return res.status(500).json(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;