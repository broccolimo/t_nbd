"use strict";
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const thisSchema = new Schema({
	//网关id
	code: String,
	//故障代码
	faultCode: Number,
	//电梯注册代码
	registerID: String,
	//电梯型号
	elevatorModel: String,
	//电梯地址
	addr: {
		area:String,//区
    	province: String, //省
    	city: String, //市
    	district:String,//区 
    	addr: String //详细地址
	},
	//电梯安装日期
	install_date: Date,
	//电梯累计运行时间
	totalUpTime: Number,
	//电梯累计运行次数
	totalRunTimes: Number,
	//故障发生时间
	faultTime: Date,
	//主板类型
	mainBoardType: Number,
	//运行接触器吸合时间
	runPullUpTime: Number,
	//系统上电时间
	uptime: Number
});

module.exports = mongoose.model("faultStatistics", thisSchema, "faultStatistics");