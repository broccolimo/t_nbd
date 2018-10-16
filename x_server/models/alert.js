'use strict';
//报警定义

const mongoose = require('mongoose');

//Schema
const Schema = mongoose.Schema;

//警报类型定义
const AlertClassSchema = new Schema({
  user_name: String,//客户名称
  product_model: String,//产品型号
  device_id: String, //电梯id
  class: String, //警报类型
  level: Number, //警报级别
  event: String, //警报事件
  to_user: [String], //报警用户列表
});

//警报事件定义
const AlertEventSchema = new Schema({
  create_time: Date, //发生时间
  alert_class: String, //警报类型
  is_report: String, //是否已经发送
  response_user: [String] //响应人列表
});
const GovermentSchema = new Schema({
  liftCode: String,
  Identifier: String,
  date: Date,
  isNormal: Number,
  door: Number,
  trapped: Number,
  runMode: Number,
  floor: String,
  speed: String,
  falutCode: String,
})

//导出
exports.AlertConfig = mongoose.model('AlertClass', AlertClassSchema, "alert_class");
exports.AlertEvent = mongoose.model('AlertEvent', AlertEventSchema, "alert_event");
exports.Goverment = mongoose.model('Goverment', GovermentSchema, "goverment_submit");