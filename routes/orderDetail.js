const pool = require("../db");
const express = require("express");
const router = express.Router();

router.post("/", async (req, res, next) => {
  let resultCode = 404;
  let message = "에러가 발생했습니다.";
  const {user_id} = req.body;

  try {
    //문제 없으면 try문 실행
    const [order_detail] = await pool.execute(
      `SELECT order_select_qty, order_pu_date, store_name, store_lat, store_long, pay_price, md_name FROM gdjang.order join store on gdjang.order.store_id = store.store_id join payment on payment.md_id = gdjang.order.md_id join md on gdjang.order.md_id = md.md_id WHERE gdjang.order.user_id = ${user_id}`
    );

    let pu_date = new Array();
    for (let i = 0; i < order_detail.length; i++) {
      pu_date[i] = new Date(order_detail[i].order_pu_date).toLocaleDateString();
    }

    resultCode = 200;
    message = "storeView 성공";

    //사용자주소 추가하기.
    //const [distance_result]=

    return res.json({
      code: resultCode,
      message: message,
      order_detail: order_detail,
      pu_date: pu_date,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json(err);
  }
});

module.exports = router;
