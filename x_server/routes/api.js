"use strict";
// API总路由
// url: /api/v1/xxx

var express = require("express");
var router = express.Router();

var UserModel = require("../models/user");

//帐号API子路由
router.use("/user", require("./r_user"));
//设备API子路由
router.use("/device", require("./r_device"));
//传感器API子路由
router.use("/sensor", require("./r_sensor"));
//维保事件API子路由
router.use("/maintain",require("./r_maintain"));
//警报事件api子路由
router.use("/warning",require("./r_alert"));
//订单子路由
router.use("/order", require("./r_order"));
//公司子路由
router.use("/company",require("./r_company"));
//sms
router.use("/sms", require("./r_sms"));

//发送视频信号
router.use("/video",require("./mqtt_publish"));
module.exports = router;
