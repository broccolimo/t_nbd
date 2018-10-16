"use strict";
//电梯定义

const mongoose = require("mongoose");

//Schema
const Schema = mongoose.Schema;

const DeviceSchema = new Schema({
  // usecomponey:String,//电梯名称
  // code: String, //设备id
  // addr: {       // 电梯地址
  //   area:String,//区
  //   province: String, //省
  //   city: String, //市
  //   addr: String //详细地址
  // },
  // usecomponeyID:String,
  // productID:String,
  // type: String,
  // gps: {
  //   //GPS信息
  //   lat: Number,
  //   lng: Number
  // },
  // vendor: String, //生成厂家
  // model: String, //产品型号
  // start_date: Date, //启用时间
  name:String,
  useUnit:String,//使用单位名称
  code:String,//设备id
  addr: {       // 电梯地址
    area:String,//区
    province: String, //省
    city: String, //市
    district:String,//区 
    addr: String //详细地址
  },
  //标志位 0未审核 1已审核
  flag:Number,
  //摄像头id
  cameraID:String,
  jing: Number,
  wei: Number,
  registerID:String,//注册代码
  useUnitID:String,//使用单位编号
  productID:String,//产品编号
  makeUnit:String,//制造单位
  installUnit:String,//安装单位
  repairUnit:String,//改造、修理单位
  maintainUnit:String,//维保单位
  //维保人员信息
  maintain_perInfo:[{
    maintainPer:String,//维保人员姓名
    maintainTel:String//维保人员电话
  }],
  //安装人员信息
  install_perInfo:[{
    installPer:String,//安装人员姓名
    installTel:String//安装人员电话
  }],

  elevatorModel:String,//电梯型号
  real_time_status:String,//实时状态 0正常 1预警 2故障 3应急困人 4维保
  send_message:String,// 0 无，1.0 预警未发 1.1 预警已发 2.0 告警未发 2.1 告警已发 3.0 应急告警未发 3.1 应急告警已发 4.0维保未发 4.1维保已发
  tractionMachineModel:String,//曳引机型号
  tractionMachine:{ //曳引机数据
    num:String,//数量
    diameter:String,//直径
  },
  motorPower:String,//电机功率
  controlBox:String,//控制柜型号
  brakes:String,//制动器型号
  speedLimiter:String,//限速器型号
  safetyGear:String,//安全钳型号
  doorLock:String,//门锁型号
  ratedSpeed:String,//额定速度
  ratedLoad:String,//额定载重
  layers:{
    floor:String,//层
    station:String,//站
    door:String,//门
  },
  transformModel:String,//改造后型号
  install_date: Date,//安装时间
  start_date: Date, //启用时间
  annualInspection:String,//年检有效期
 
  maintain_data: [String], //维保记录外键
  alert_data: [
    {
      record: {
        type: Schema.Types.ObjectId,
        ref: "Alert"
      }
    }
  ], //alert记录外键
  //维保配置外键
  half_month_maintain:[
    {
      type:Schema.Types.ObjectId,
      ref:"half_month_maintain"
    }
  ],//半月
  quarterly_maintain:[
    {
      type:Schema.Types.ObjectId,
      ref:"quarterly_maintain"
    }
  ],//季度
  half_year_maintain:[
    {
      type:Schema.Types.ObjectId,
      ref:"half_year_maintain"
    }
  ],//半年
  year_maintain:[
    {
      type:Schema.Types.ObjectId,
      ref:"year_maintain"
    }
  ]//整年

});

//导出
module.exports = mongoose.model("Device", DeviceSchema, "device");
