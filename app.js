const express = require("express");
const app = express();
let bodyParser = require("body-parser");
const loginRouter = require("./routes/user/login.js");
const signupRouter = require("./routes/user/signup.js");
const googleLoginRouter = require("./routes/user/googleLogin.js");

const farmViewRouter = require("./routes/farm/farmView.js");
const storeViewRouter = require("./routes/store/storeView.js");
const mdViewMainRouter = require("./routes/md/mdView_main.js");
const kakaoLoginRouter = require("./routes/user/kakaoLogin.js");
const farmDetailRouter = require("./routes/farm/farmDetail.js");
const logoutRouter = require("./routes/user/logout.js");
const addressRouter = require("./routes/address/register_address.js");
const jointPurchaseRouter = require("./routes/md/jointPurchase.js");
const keepRouter = require("./routes/keep/keep.js");
const keeplistRouter = require("./routes/keep/keeplist.js");
const orderDetailRouter = require("./routes/order/orderDetail.js");
const orderDetailMdRouter = require("./routes/order/orderDetailMd.js");
const cartListRouter = require("./routes/cart/cartList.js");
const mypageRouter = require("./routes/user/mypage.js");
const noticeRouter = require("./routes/notice/notice.js");
const reviewRegisterRouter = require("./routes/review/reviewRegister.js");
const reviewListRouter = require("./routes/review/reviewList.js");
const changeRouter = require("./routes/user/changeUserInfo.js");
const contentListRouter = require("./routes/content/contentList.js");

const auth_middleware = require("./routes/user/auth_middleware.js");
// const refreshRouter = require("./routes/")

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get("/", async (req, res) => {
  res.send("consumer_server");
});

app.get("/post_search", (req, res) => {
  res.sendFile(__dirname + "/postSearch.html");
});

app.use("/signup", signupRouter);
app.get("/is_id_dup", signupRouter);
app.use("/register_address", addressRouter);
app.use("/edit_address", require("./routes/address/edit_address.js"));
app.use("/get_address", require("./routes/address/get_address.js"));
app.use("/delete_address", require("./routes/address/delete_address.js"));
app.use("/standard_address", require("./routes/address/standard_address.js"));

app.post("/kakaoLogin", kakaoLoginRouter);
app.post("/googleLogin", googleLoginRouter);

app.post("/login", loginRouter);
app.get("/logout", logoutRouter);

app.use("/orderDetailView", orderDetailRouter);
app.use("/orderDetailMd", orderDetailMdRouter);

app.get("/farmView", farmViewRouter);
app.post("/farmDetail", farmDetailRouter);

app.get("/storeView", storeViewRouter);
app.post("/storeDetail", require("./routes/store/storeDetail.js"));
app.get("/mdView_main", mdViewMainRouter);

app.post("/jointPurchase", jointPurchaseRouter);

app.post("/cartPost", cartListRouter);
app.get("/cartList", cartListRouter);
app.get("/cartUpdate", cartListRouter);
app.get("/cartDelete", cartListRouter);
app.get("/cartChecked", cartListRouter);

app.post("/isKeep", keepRouter);
app.post("/keep", keepRouter);
app.post("/keeplist", keeplistRouter);

app.get("/mypage", mypageRouter);

app.get("/check_id", changeRouter);
app.get("/change_pw", changeRouter);
app.get("/change_name", changeRouter);
app.get("/change_phone", changeRouter);

app.get("/notice", noticeRouter);

app.use("/payUserInfo", require("./routes/order/payUserInfo.js"));
app.use("/orderInsert", require("./routes/order/orderInsert.js"));
app.use("/orderCancel", require("./routes/order/orderCancel.js"));

app.use("/notification", require("./routes/notification/notification.js"));
app.use("/notification_pudate", require("./routes/notification/notification_pudate.js"));

//알람
app.use("/alarm_token", require("./routes/notification/alarm_token.js"));

//리뷰
app.use("/review", reviewRegisterRouter);
app.use("/reviewList", reviewListRouter);

//콘텐츠
app.use("/content", contentListRouter);
app.use("/contentDetail", require("./routes/content/contentDetail.js"));
app.use(auth_middleware);

app.listen(3000, function () {
  console.log("server is running.");
});
