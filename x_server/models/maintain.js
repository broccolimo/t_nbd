'use strict';
//维保定义

const mongoose = require('mongoose');

//Schema
const Schema = mongoose.Schema;

const MaintainSchema = new Schema({
  maintain_number:[{
    maintain_type:String,
    matintain_id:String,
    user_id:String,
    time:Date
  }],
  user_name:String,//客户名称
  product_model:String,//产品型号
  lift_load:String,//电梯载重
  device_id: String, //电梯id
  rate_speed:String,//额定速度
  door_model:String,//门机型号
  half_month_start_time: Date, //半月维保单创建时间
  quarterly_time: Date,  // 季度维保单创建时间
  half_year_time: Date,  // 半年维保单创建时间  
  year_time: Date,  //  年度维保单创建时间
  half_month_next_time: Date, //下次半月维保时间
  quarterly_next_time: Date,  // 下次季度维保时间
  half_year_next_time: Date,  // 下次半年维保时间  
  year_next_time: Date,  //  下次年度维保时间
  record: [{
    //user_id: [String], //维保人记录
    update_time: Date, //记录更新时间
    comment: String, //记录
  }]
});

//导出
module.exports = mongoose.model('Maintain', MaintainSchema, "maintain");