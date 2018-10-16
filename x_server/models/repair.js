"use strict";
//维修单定义

const mongoose = require("mongoose");

//Schema
const Schema = mongoose.Schema;

const RepairSchema = new Schema({
    fault_type:String,//故障类型 0 普通故障 1 紧急故障
    fault_time:Date,//故障时间
    lift_id:String,//电梯编号
    
})