"use strict"

const express = require("express");
const router = express.Router();
const fs = require("fs");

const redis = require("../config/redis");
const async = require("async");

const OrderModel = require("../models/order");
const UserModel = require("../models/user");
const DeviceModel = require("../models/device");
const FaultStatisticsModel = require("../models/faultStatistics");

const halfMonthMaintainModel = require("../models/maintainConfig").halfMonthMaintain;
const quarterlyMaintainModel = require("../models/maintainConfig").quarterlyMaintain;
const halfYearMaintainModel = require("../models/maintainConfig").halfYearMaintain;
const yearMaintainModel = require("../models/maintainConfig").yearMaintain;

const rawModel = require("../models/dt_data");
const temp_faultModel = require("../models/fault");

const SMSClient = require("@alicloud/sms-sdk");
const accessKeyId = "LTAIGfKWPMOBRGoj";
const secretAccessKey = "6cZ4Fmeb4Aytbymz0psxv8o5KKR9Ni";

let smsClient = new SMSClient({accessKeyId, secretAccessKey});

const order = require("../models/order");
const xorder = require("../models/xorder");
const eorder = require("../models/eorder");



//添加维保工单 测试用
//所需属性
//time maintain_type lift_id rating_time rating_person
router.post("/addOrder", function(req, res, next){
	//时间处理
	var time = new Date(req.param("time"));
	var year = time.getFullYear();
	var month = time.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = time.getDate();
	day = (day < 10 ? "0" : "") + day;
	var hour = time.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var minute = time.getMinutes();
	minute = (minute < 10 ? "0" : "") + minute;
	var second = time.getSeconds();
	second = (second < 10 ? "0" : "") + second;
	var times = year + month + day + hour + minute + second;

	var prefix;
	switch(req.param("maintain_type")){
		case "0":
			prefix = "MM";
			break;
		case "1":
			prefix = "MQ";
			break;
		case "2":
			prefix = "MH";
			break;
		case "3":
			prefix = "MY";
			break;
		default:
			break;
	}
	//从电梯表里边取一些数据
	DeviceModel.findOne({
		code: req.param("lift_id")
	}, function(e, r){
		if(r){
			order.create({
				order_id: prefix + times + req.param("lift_id"),
				flag: 0,
				maintain_id: prefix + times + req.param("lift_id"),
				maintain_type: req.param("maintain_type"),
				lift_id: req.param("lift_id"),
				release_time: time,
				rating_time: req.param("rating_time"),
				rating_person: req.param("rating_person"),
				jing: r.jing,
				wei: r.wei,
				useUnit: r.useUnit,
				addr: r.addr.province + r.addr.city + r.addr.district + r.addr.addr,
				registerID: r.registerID,
				productID: r.productID
			}).then((data) => {
				switch(req.param("maintain_type")){
					case "0":
						addHalfMonthMaintain(req.param("lift_id"), prefix + times + req.param("lift_id"), time);
						break;
					case "1":
						addQuarterlyMaintain(req.param("lift_id"), prefix + times + req.param("lift_id"), time);
						break;
					case "2":
						addHalfYearMaintain(req.param("lift_id"), prefix + times + req.param("lift_id"), time);
						break;
					case "3":
						addYearMaintain(req.param("lift_id"), prefix + times + req.param("lift_id"), time);
						break;
					default:
						break;
				}
				res.send({
					code: 0,
					msg: "add order successfully"
				});
			}).catch((err) => {
				res.send({
					code: -1,
					msg: "unable to add order",
					err: err
				});
			});
		}
	});
});

//根据flag不同返回不同类型的工单
router.get("/findAllOrder", function(req, res, next){
	order.findAll({
		where: {
			flag : req.param("flag")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query order table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query order table"
		});
	});
});

//显示工单池(Mysql)
router.get("/showOrders", function(req, res, next){
	order.findAll({
		where: {
			rating_person: {
				$like: "%," + req.param("account") + ",%"
			},
			flag: 0
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query order successfully",
			obj: data,
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query order"
		});
	});
});

//仅用于我的任务
//获取当前用户正在进行订单的信息
//输入 - 用户名
//输出 - 正在进行的订单对象
router.get("/getThisInfo", function(req, res, next){
	order.findAll({
		where: {
			accept_account: req.param("account"),
			flag: {
				$or : [1, 2, 4, 6]
			}
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query order table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query order table"
		});
	});
});

//通用 
//根据order_id 查出 工单对象
//输入 order_id
//输出 该工单对象
router.get("/getOrderInfo", function(req, res, next){
	order.find({
		where: {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query order table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query table"
		});
	});
});

//接单api
//考虑到多人操作 先判断一下工单的状态
//不考虑order更新出错的情况
router.post("/Opt_1", async function(req, res, next){
	var flag1 = false;
	var flag2 = false;

	//先查此用户是否可以接单
	await UserModel.findOne({
		account: req.param("account")
	}, function(err, result){
		if(result.canAccept_b == false){
			flag1 = true;
			res.send({
				code: 1,
				msg: "此用户当前有进行中的维保单,不能继续接单"
			});
		}
	});
	if(flag1) return;

	//查看此订单是否可接
	await order.findOne({
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		if(data.flag != 0){
			res.send({
				code: 2,
				msg: "此订单已被其他人接取"
			});
			flag2 = true;
		}
	}).catch();
	if(flag2) return;

	//更新用户接单状态
	await UserModel.update({
		account: req.param("account")
	}, {
		$set: {
			canAccept_b: false
		}
	},
	function(){}
	); 

	//更新维修单内容
	order.update({
		flag: 1,
		accept_person: req.param("name"),
		accept_person_company: req.param("company"),
		accept_account: req.param("account"),
		accept_time: req.param("accept_time")
	},{
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "operate successfully"
		});
	}).catch();
});


//由工单id查所负责电梯的信息
router.get("/getDeviceInfo", function(req, res, next){
	order.find({
		where: {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		DeviceModel.findOne(
		{
			code: data.lift_id
		},
		function(err, result){
			if(result){
				res.send({
					code: 0,
					msg: "query order and device table successfully",
					obj: result
				});
			}
			else{
				res.send({
					code: -1,
					msg: "unable to query device table"
				});
			}
		}
		);
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query order table"
		});
	});
});



//usually
router.get("/Opt_2", function(req, res, next){
	order.findOne({
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "get infomation of order and device successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query from order table"
		});
	});
});

//工单开始时 调用的 api
router.post("/Opt_3", function(req, res, next){
	order.update({
		flag: 2,
		start_time: req.param("time")
	}, {
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "modify order table successfully"
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});


//退单api
router.post("/Opt_4", function(req, res, next){
	order.update({
		flag: 7,
		cancel_reason: req.param("cancel_reason"),
		cancel_time: req.param("cancel_time")
	}, {
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		UserModel.update(
		{	
			account : req.param("account")
		},
		{
			$set : {
				canAccept_b : true
			},
		},
		function(e, result){
			if(!e){
				res.send({
					code: 0,
					msg: "modify order and user table successfully"
				});
			}
		}
		);
		
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});

//维保单填完 点击下一步 api
router.post("/Opt_5", function(req, res, next){
	order.update({
		prefinish_time: req.param("prefinish_time")
	}, {
		where: {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "modify order table successfully"
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});

//填写额外信息 的 更新api
router.post("/Opt_6", function(req, res, next){
	order.update({
		artificial_cost: req.param("artificial_cost"),
		trip_cost: req.param("trip_cost"),
		material_cost: req.param("material_cost"),
		note_information: req.param("note_information"),
		assist: req.param("assist")
	}, {
		where: {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "modify order table successfully"
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});


//维保最终提交api
router.post("/Opt_7", function(req, res, next){
	console.log(req.param("time"));
	order.update({
		flag : 3,
		customer_satisfaction : req.param("customer_satisfaction"),
		customer_signature_path : req.param("customer_signature_path"),
		commit_time : req.param("time")
	}, {
		where: {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		UserModel.update(
		{
			account : req.param("account")
		},
		{
			$set : {
				canAccept_b : true
			}
		},
		function(){}
		);
		res.send({
			code: 0,
			msg: "modify order table successfully"
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});

//已提交api
router.get("/Opt_8", function(req, res, next){
	order.findAll({
		where: {
			accept_account: req.param("account"),
			flag: 3
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query order table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query order table"
		});
	});
});

//由code获取电梯对象
router.get("/Opt_9", function(req, res, next){
	DeviceModel.findOne(
	{
		code : req.param("code")
	},
	function(err, result){
		if(err){
			res.send({
				code : -1,
				msg : "unable to query device table"
			});
		}
		else{
			res.send({
				code : 0,
				msg: "quert device table successfully",
				extras : {
					addr: result.addr.province + result.addr.city + result.addr.addr,
					xinghao: result.elevatorModel,
					useUnit: result.useUnit,
					registerID: result.registerID
				}
			});
		}
	}
	);
});


//审核通过api
router.post("/Opt_10", function(req, res, next){
	order.update({
		flag: 5,
		pass_time : req.param("pass_time"),
		actual_check_account : req.param("actual_check_account"),
		actual_check_name : req.param("actual_check_name")
	}, {
		where: {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "modify order table successfully"
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});


//已完成api
router.get("/Opt_11", function(req, res, next){
	order.findAll({
		where: {
			accept_account : req.param("account"),
			flag: 5
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query order table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query order table"
		});
	});
});


//审核未通过api
router.post("/Opt_12", function(req, res, next){
	order.update({
		flag : 4,
		refuse_time : req.param("refuse_time"),
		refuse_reason : req.param("refuse_reason"),
		actual_check_account : req.param("actual_check_account"),
		actual_check_name : req.param("actual_check_name")
	}, {
		where: {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "modify order table successfully"
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});

//重新维保api
router.post("/Opt_13", function(req, res, next){
	UserModel.findOne({account: req.param("account")}, function(err, result){
		if(err){
			res.send({
				code: -1
			});
			return;
		}
		if(result.canAccept_b == false){
			res.send({
				code: 1
			});
			return;
		}
		order.update({
			flag: 1,
			accept_time : req.param("accept_time")
		}, {
			where: {
				order_id : req.param("order_id")
			}
		}).then((data) => {
			res.send({
				code: 0,
				msg: "modify order and user table successfully"
			});
		}).catch((err) => {
			res.send({
				code: -1,
				msg: "unable to modify order table"
			});
		});
	});
});

//延时申请
router.post("/Opt_14", function(req, res, next){
	order.update({
		flag: 6,
		delay_description: req.param("delay_description"),
		delay_time: req.param("delay_time")
	}, {
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		UserModel.update(
		{	
			account : req.param("account")
		},
		{
			$set : {
				canAccept_b : true
			},
		},
		function(){}
		);
		res.send({
			code: 0,
			msg: "modify order and user table successfully"
		})
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});


//延时相关
router.get("/Opt_15", function(req, res, next){
	order.find({
		where: {
			accept_account: req.param("accept_account"),
			flag: {
				$or : [1, 2]
			}
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query order table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query order table"
		});
	});
});

//延时 重新接单
router.post("/Opt_16", function(req, res, next){
	order.update({
		flag: 1,
		accept_time: req.param("accept_time")
	}, {
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		UserModel.update(
		{
			account : req.param("account")
		},
		{
			$set : {
				canAccept_b : false
			}
		},
		function(e, result){
			if(!e){
				res.send({
					code: 0,
					msg: "modify order table successfully"
				});
			}
		}
		);
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify order table"
		});
	});
});

//退单管理 查询单项信息接口
router.get("/Opt_17", function(req, res, next){
	order.find({
		where : {
			order_id : req.param("order_id")
		}
	}).then((data) => {
		UserModel.find({
			company : data.accept_person_company
		}, function(e, r){
			if(e){
				res.send({
					code : -1,
					msg: "a"
				});
				return;
			}
			var name = [];
			var account = [];
			for(var i = 0; i < r.length; i++){
				name.push(r[i].name);
				account.push(r[i].account);
			}
			res.send({
				code : 0,
				obj : {
					name: name,
					account: account,
					cancel_time : data.cancel_time,
					cancel_reason : data.cancel_reason
				}
			});
		});
	}).catch((err) => {
		res.send({
			code : -1,
			mag : "b"
		});
	});
});


//退单 重新指派
router.post("/Opt_18", function(req, res, next){
	order.update({
		flag: 1,
		accept_person: req.param("accept_person"),
		accept_account: req.param("accept_account"),
		accept_time: req.param("time")
	},{	
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		UserModel.update({
			account: req.param("accept_account")
		}, {
			$set: {
				canAccept_b: false
			}
		}, function(e){
			if(e){
				res.send({
					code: -1
				});
				return;
			}
			res.send({
				code: 0
			});
		});
	}).catch((err) => {
		res.send({
			code: -1
		});
	});
});

//判断用户是否可以接单
router.get("/Opt_19", function(req, res, next){
	UserModel.findOne({
		account : req.param("account")
	}, function(err, result){
		if(result){
			res.send({
				code: 0,
				canAccept_b: result.canAccept_b,
				canAccept_x: result.canAccept_x
			});
		}
		else{
			res.send({
				code : -1
			});
		}
	});
});

//上传用户签名图片
router.post("/sendSignature", function(req, res, next){
	var data = req.param("base64");
	var name = req.param("order_id");
	var dataBuffer = new Buffer(data, 'base64');
	fs.writeFile("public/Signature/" + name + ".jpeg", dataBuffer, function(err) {
		if(err){
			res.send({
				code : -1,
				msg : "unable to store photo"
			});
		}
		else{
			order.update({
				customer_signature_path : "public/Signature/" + name + ".jpeg"
			}, {
				where: {
					order_id : req.param("order_id")
				}
			}).then((data) => {
				res.send({
					code: 0,
					msg: "modify order table successfully"
				});
			}).catch((err) => {
				res.send({
					code: -1,
					msg: "unable to modify order table"
				});
			});
		}
	});
});

//查看用户签名图片
router.get("/showSignature", function(req, res, next){
	order.findOne({
		where: {
			order_id: req.param("order_id")
		}
	}).then((data) => {
		var bData =  fs.readFileSync(data.customer_signature_path);
		var base64str = bData.toString("base64");
		res.send({
			code: 0,
			obj:base64str
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "query order table successfully"
		});
	});
});

//手机维保单图片上传
router.post("/photoAndUpload", function(req, res, next){
	var data = req.param("data");
	var name = req.param("name");
	var dataBuffer = new Buffer(data, 'base64');
	fs.writeFile("public/maintenance/" + name + ".jpg", dataBuffer, function(err) {
		if(err){
			res.send({
				code : -1,
				msg : err
			});
		}
		else{
			res.send({
				code : 0,
				msg : "操作成功"
			});
		}
	});
});


//拍完存路径0
router.post("/StorePhotoPath0", function(req, res, next){
	var item = req.param("item");
	var path = "public/maintenance/" + req.param("maintain_id") + "/" + req.param("item") + ".jpg";
	halfMonthMaintainModel.update(
	{
		maintain_id : req.param("maintain_id")
	},
	{	
		"$set" : {[`maintainContent.${item}.imagePath`] : [`${path}`]}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : "路径存储失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "路径存储成功"
			});
		}
	}
	);
});


//拍完存路径1
router.post("/StorePhotoPath1", function(req, res, next){
	var item = req.param("item");
	var path = "public/maintenance/" + req.param("maintain_id") + "/" + req.param("item") + ".jpg";
	quarterlyMaintainModel.update(
	{
		maintain_id : req.param("maintain_id")
	},
	{	
		"$set" : {[`maintainContent.${item}.imagePath`] : [`${path}`]}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : "路径存储失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "路径存储成功"
			});
		}
	}
	);
});



//拍完存路径2
router.post("/StorePhotoPath2", function(req, res, next){
	var item = req.param("item");
	var path = "public/maintenance/" + req.param("maintain_id") + "/" + req.param("item") + ".jpg";
	halfYearMaintainModel.update(
	{
		maintain_id : req.param("maintain_id")
	},
	{	
		"$set" : {[`maintainContent.${item}.imagePath`] : [`${path}`]}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : "路径存储失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "路径存储成功"
			});
		}
	}
	);
});


//拍完存路径3
router.post("/StorePhotoPath3", function(req, res, next){
	var item = req.param("item");
	var path = "public/maintenance/" + req.param("maintain_id") + "/" + req.param("item") + ".jpg";
	yearMaintainModel.update(
	{
		maintain_id : req.param("maintain_id")
	},
	{	
		"$set" : {[`maintainContent.${item}.imagePath`] : [`${path}`]}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : "路径存储失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "路径存储成功"
			});
		}
	}
	);
});

//存ststus
router.post("/StoreStatus0", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 31; i++) {
		halfMonthMaintainModel.update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.status`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storestatus halfmonth succeed"
	});
});

router.post("/StoreStatus1", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 12; i++) {
		quarterlyMaintainModel.update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.status`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storestatus quarterly succeed"
	});
});

router.post("/StoreStatus2", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 14; i++) {
		halfYearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.status`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storestatus halfyear succeed"
	});
});

router.post("/StoreStatus3", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 16; i++) {
		yearMaintainModel.update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.status`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storestatus year succeed"
	});
});

//存result
router.post("/StoreResult0", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 31; i++) {
		halfMonthMaintainModel.update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.result`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storeresult halfmonth succeed"
	});
})

router.post("/StoreResult1", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 12; i++) {
		quarterlyMaintainModel.update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.result`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storeresult quarterly succeed"
	})
})

router.post("/StoreResult2", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 14; i++) {
		halfYearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.result`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storeresult halfyear succeed"
	})
})

router.post("/StoreResult3", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	for (var i = 0; i <= 16; i++) {
		yearMaintainModel.update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.result`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "storeresult year succeed"
	})
})

//函数 增加半月维保单
function addHalfMonthMaintain(liftId, maintain_id, time){
	const halfMonthMaintain = new halfMonthMaintainModel({
		liftId: liftId,
		maintain_id: maintain_id,
		startDate: time,
		maintainContent:{
			num1:{
				status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num2:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num3:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num4:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num5:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num6:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num7:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num8:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num9:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num10:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num11:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num12:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num13:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num14:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num15:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num16:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num17:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num18:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num19:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num20:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num21:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num22:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num23:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num24:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num25:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num26:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num27:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num28:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num29:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num30:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num31:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num32:{
        		status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	}
        }
    });
	halfMonthMaintain.save();
	fs.exists("public/maintenance/" + maintain_id + "/", function(exists){
		if(!exists){
			fs.mkdir("public/maintenance/" + maintain_id + "/");
		}
	});
}

//函数 生成季度维保单
function addQuarterlyMaintain(liftId, maintain_id, time){
	const quarterlyMaintain = new quarterlyMaintainModel ({
		liftId : liftId,
		maintain_id : maintain_id,
		startDate : time,
		maintainContent:{
			num1:{
				status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num2:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num3:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num4:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num5:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num6:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num7:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num8:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num9:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num10:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num11:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num12:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num13:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	}
        }
    });
	quarterlyMaintain.save();
	fs.exists("public/maintenance/" + maintain_id + "/", function(exists){
		if(!exists){
			fs.mkdir("public/maintenance/" + maintain_id + "/");
		}
	});
}


//函数 生成半年维保单
function addHalfYearMaintain(liftId, maintain_id, time){
	const halfYearMaintain = new halfYearMaintainModel ({
		liftId : liftId,
		maintain_id : maintain_id,
		startDate : time,
		maintainContent:{
			num1:{
				status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num2:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num3:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num4:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num5:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num6:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num7:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num8:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num9:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num10:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num11:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num12:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num13:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num14:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num15:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	}
        }
    });
	fs.exists("public/maintenance/" + maintain_id + "/", function(exists){
		if(!exists){
			fs.mkdir("public/maintenance/" + maintain_id + "/");
		}
	});
	halfYearMaintain.save();
}


//函数 生成一年维保单
function addYearMaintain(liftId, maintain_id, time){
	const yearMaintain = new yearMaintainModel({
		liftId : liftId,
		maintain_id : maintain_id,
		startDate : time,
		maintainContent:{
			num1:{
				status:"",
				imagePath:"",
				result:"",
				tj:"",
				gh:"",
				cb1:"",
				cb2:""
        	},
        	num2:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
       		},
       		num3:{
       			status:"",
       			imagePath:"",
       			result:"",
       			tj:"",
       			gh:"",
       			cb1:"",
       			cb2:""
        	},	
        	num4:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num5:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num6:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num7:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num8:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num9:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num10:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num11:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num12:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num13:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num14:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num15:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num16:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	},
        	num17:{
        		status:"",
        		imagePath:"",
        		result:"",
        		tj:"",
        		gh:"",
        		cb1:"",
        		cb2:""
        	}
        },
    });
	yearMaintain.save();
	fs.exists("public/maintenance/" + maintain_id + "/", function(exists){
		if(!exists){
			fs.mkdir("public/maintenance/" + maintain_id + "/");
		}
	}); 
}






//半月 取
router.get("/maintenance0", function(req, res, next){
	halfMonthMaintainModel.findOne(
	{
		maintain_id : req.param("maintain_id")
	},
	function(err, result){
		if(err){
			res.send({
				code : -1,
				msg : "halfMonthMaintain qurey fail"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "query halfMonthMaintain successfully",
				obj : result
			})
		}
	}
	);
});

//季度 取
router.get("/maintenance1", function(req, res, next){
	quarterlyMaintainModel .findOne(
	{
		maintain_id : req.param("maintain_id")
	},
	function(err, result){
		if(err){
			res.send({
				code : -1,
				msg : "quarterlyMaintain query fail"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "query quarterlyMaintain successfully",
				obj : result
			})
		}
	}
	);
});

//半年 取
router.get("/maintenance2", function(req, res, next){
	halfYearMaintainModel .findOne(
	{
		maintain_id : req.param("maintain_id")
	},
	function(err, result){
		if(err){
			res.send({
				code : -1,
				msg : "yearMaintain query fail"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "query yearMaintain successfully",
				obj : result
			})
		}
	}
	);
});


//一年 取
router.get("/maintenance3", function(req, res, next){
	yearMaintainModel.findOne(
	{
		maintain_id : req.param("maintain_id")
	},
	function(err, result){
		if(err){
			res.send({
				code : -1,
				msg : "yearMaintain query fail"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "query yearMaintain successfully",
				obj : result
			})
		}
	}
	);
});

//-----------------------分割线---------------------------------------------------------------------
//4种维保类型的调校和更换 存储

//半月 调校
router.post("/StoreTj0", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfMonthMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.tj`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfmonth StoreTj succeed"
	});
});

//半月 更换
router.post("/StoreGh0", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfMonthMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.gh`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfmonth StoreGh succeed"
	});
});

//季度 调校
router.post("/StoreTj1", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		quarterlyMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.tj`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "quarterly StoreTj succeed"
	});
});

//季度 更换
router.post("/StoreGh1", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		quarterlyMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.gh`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "quarterly StoreGh succeed"
	});
});

//半年 调校
router.post("/StoreTj2", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfYearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.tj`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfyear StoreTj succeed"
	});
});

//半年 更换
router.post("/StoreGh2", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfYearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.gh`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfyear StoreGh succeed"
	});
});

//一年 调校
router.post("/StoreTj3", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		yearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.tj`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "year StoreTj succeed"
	});
});

//一年 更换
router.post("/StoreGh3", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		yearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.gh`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "year StoreGh succeed"
	});
});

//------------------Start-----------------------scb-s-1749
//Create At 218-06-01
//用于app 存是否调校和是否更换的单选框的状态
//半月
router.post("/StoreCb1_0", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfMonthMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb1`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfmonth StoreCb1 succeed"
	});
});

router.post("/StoreCb2_0", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfMonthMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb2`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfmonth StoreCb2 succeed"
	});
});

//季度
router.post("/StoreCb1_1", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		quarterlyMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb1`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "quarterly StoreCb1 succeed"
	});
});

router.post("/StoreCb2_1", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		quarterlyMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb2`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "quarterly StoreCb2 succeed"
	});
});

//半年
router.post("/StoreCb1_2", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfYearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb1`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfyear StoreCb1 succeed"
	});
});

router.post("/StoreCb2_2", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		halfYearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb2`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "halfyear StoreCb2 succeed"
	});
});

//一年 
router.post("/StoreCb1_3", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		yearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb1`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "year StoreCb1 succeed"
	});
});

router.post("/StoreCb2_3", function(req, res, next){
	var item = req.param("item");
	var value = req.param("value");
	var l = item.length;
	for (var i = 0; i <= l; i++) {
		yearMaintainModel .update(
		{
			maintain_id : req.param("maintain_id")
		},
		{	
			"$set" : {[`maintainContent.${item[i]}.cb2`] : [`${value[i]}`]}
		},
		function(){}
		);
	}
	res.send({
		code : 0,
		msg : "year StoreCb2 succeed"
	});
});

//------------------End-----------------------scb-e-1924


router.post("/dispatch", async function(req, res, next){
	//处理时间
	var time = new Date(req.param("time"));
	var year = time.getFullYear();
	var month = time.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = time.getDate();
	day = (day < 10 ? "0" : "") + day;
	var hour = time.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var minute = time.getMinutes();
	minute = (minute < 10 ? "0" : "") + minute;
	var second = time.getSeconds();
	second = (second < 10 ? "0" : "") + second;
	var times = year + month + day + hour + minute + second;

	var maintain;
	var maintain_id;

	var persons = req.param("persons");
	var numbers = req.param("PhoneNumbers");
	console.log(req)
	console.log(typeof(req.param("maintain_type")))
	//生成维保单
	switch(req.param("maintain_type")){
		case "0":
		maintain_id = "m0-" + times;
		maintain = new halfMonthMaintainModel({
			maintain_id : "m0-" + times,
			liftId : req.param("list_id"),
			auditStatus : 1,
			startDate : req.param("time")
		});
		maintain.save(async function(err){
			if(err){
				res.send({
					code : -1,
					msg : "增加半月维保单失败"
				});
				return;
			}
		});
		break;
		case "1":
		maintain_id = "m1-" + times;
		maintain = new quarterlyMaintainModel({
			maintain_id : "m1-" + times,
			liftId : req.param("list_id"),
			auditStatus : 1,
			startDate : req.param("time")
		});
		maintain.save(async function(err){
			if(err){
				res.send({
					code : -1,
					msg : "增加季度维保单失败"
				});
				return;
			}
		});
		break;
		case "2":
		maintain_id = "m2-" + times;
		maintain = new halfYearMaintainModel({
			maintain_id : "m2-" + times,
			liftId : req.param("list_id"),
			auditStatus : 1,
			startDate : req.param("time")
		});
		maintain.save(async function(err){
			if(err){
				res.send({
					code : -1,
					msg : "增加半年维保单失败"
				});
				return;
			}
		});
		break;
		case "3":
		maintain_id = "m3-" + times;
		maintain = new yearMaintainModel({
			maintain_id : "m3-" + times,
			liftId : req.param("list_id"),
			auditStatus : 1,
			startDate : req.param("time")
		});
		maintain.save(async function(err){
			if(err){
				res.send({
					code : -1,
					msg : "增加一年维保单失败"
				});
				return;
			}
		});
		break;

		default:
		res.send({
			code : -1,
			msg : "添加维保单失败"
		})
		return;
	}
	//生成工单
	var neworder = new OrderModel({
		order_id : "xz" + times,
		flag : 0,
		maintain_id : maintain_id,
		maintain_type : req.param("maintain_type"),
		list_id : req.param("list_id"),
		release_time : req.param("time"),
		rating_time : req.param("rating_time") || "未规定"
	});

	var order_id = "xz" + times;
	neworder.save( function(err){
		if(err){
			res.send({
				code : -1,
				msg : "工单生成失败"
			});
			return;
		}
		else{
			for(var i = 0; i < persons.length; i++){
				(function(i){
					var number = numbers[i];
					var person = persons[i];
					OrderModel.update(
					{
						order_id : "xz" + times
					},
					{	
						$addToSet : {
							rating_person : {
								name : persons[i]
							}
						}
					},
					function(era){
						if(era){
							res.send({
								code : -1,
								msg : "向工单里边添加相应维保工失败"
							});
							return;
						}
						else{
							smsClient.sendSMS({
								PhoneNumbers: number,
								SignName: '王春梅',
								TemplateCode: 'SMS_122282790',
								TemplateParam: '{"per":"' + person + '","address":"' + req.param("address") + '","model":"' + req.param("model") + '","orderID":"' + order_id + '"}'
							}).
							then(
								function (r) {
									let {Code} = r;
									if (Code === 'OK') {
									}
								}, 
								function (erb){
									res.send({
										code : -1,
										msg : erb
									});
									return;
								}
								);
						}
					}
					);
				})(i)
			}
		}
	});
	res.send({
		code : 0,
		msg : "接口调用成功"
	});
});

//测试 
//一个字段的属性是数组 数组里边的元素是对象 对象只有一个属性Name
//测试是否能插进去
router.post("/ttt1", function(req, res, next){
	OrderModel.update(
	{
		order_id : "tttttttttttt2"
	},
	{
		$addToSet : {
			rating_person : {
				name : "yangye"
			}
		}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : err
			});
		}
		else{
			res.send({
				code : 0,
				msg : "success"
			});
		}
	}
	);
});

//测试 目录存在与否与创建
router.post("/ttt2", function(req, res, next){
	fs.exists("public/maintenance/" + req.param("maintain_id") + "/", function(exists){
		console.log("public/maintenance/" + req.param("maintain_id") + "/");
		console.log(exists);
		if(!exists){
			fs.mkdir("public/maintenance/" + req.param("maintain_id") + "/");
			res.send("新建了");
		}
		else{
			res.send("本来就有");
		}
	});
});


//以下是维修api

//添加维修工单 测试用
router.post("/addXorder", function(req, res, next){
	//时间处理 用于形成工单编号
	var time = new Date(req.param("time"));
	var year = time.getFullYear();
	var month = time.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = time.getDate();
	day = (day < 10 ? "0" : "") + day;
	var hour = time.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var minute = time.getMinutes();
	minute = (minute < 10 ? "0" : "") + minute;
	var second = time.getSeconds();
	second = (second < 10 ? "0" : "") + second;
	var times = year + month + day + hour + minute + second;

	var num = 0;

	var useUnit;
	var layers;
	var ratedLoad;
	var elevatorModel;
	var ratedSpeed;
	var addr;
	var makeUnit;
	var jing;
	var wei;
	var registerID;

	DeviceModel.findOne({
		code: req.param("lift_id")
	}, function(err, result){
		if(err){
			res.send({
				code: -1,
				msg: "unable to query device table"
			});
			return;
		}
		registerID = result.registerID;
		useUnit = result.useUnit;
		layers = result.layers.floor + "层" + result.layers.station + "站" + result.layers.door + "门";
		ratedLoad = result.ratedLoad;
		elevatorModel = result.elevatorModel;
		ratedSpeed = result.ratedSpeed;
		addr = result.addr.province + result.addr.city + result.addr.district + result.addr.addr;
		makeUnit = result.makeUnit;
		jing = result.jing;
		wei = result.wei;

		//加数据
		xorder.create({
			xorder_id: "CR" + times + req.param("lift_id"),
			flag: 0,
			lift_id: req.param("lift_id"),
			release_time: time,
			fault_time: time,
			faultCode: req.param("faultCode"),
			rating_person: req.param("rating_person"),
			useUnit: useUnit,
			layers: layers,
			registerID: registerID,
			ratedLoad: ratedLoad,
			elevatorModel: elevatorModel,
			ratedSpeed: ratedSpeed,
			addr: addr,
			makeUnit: makeUnit,
			jing: jing,
			wei: wei
		}).then((data) => {
			res.send({
				code: 0,
				msg: "add xorder successfully"
			});
		}).catch((err) => {
			res.send({
				code: -1,
				msg: "unable to add xorder"
			})
		});
	});

	
});

//维修 显示工单池(Mysql)
router.get("/showXOrders", function(req, res, next){
	xorder.findAll({
		where: {
			rating_person: {
				$like: "%," + req.param("account") + ",%"
			},
			flag: 0
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query xorder successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query xorder table",
			err: err
		});
	});
});

//维修 接单
//不考虑所有系统错误
router.post("/x_1", async function(req, res, next){
	var flag1 = false;
	var flag2 = false;

	//先查此用户是否可以接单
	await UserModel.findOne({
		account: req.param("account")
	}, function(err, result){
		if(result.canAccept_x == false){
			flag1 = true;
			res.send({
				code: 1,
				msg: "此用户当前有进行中的维修单,不能继续接单"
			});
		}
	});
	if(flag1) return;

	//查看此订单是否可接
	await xorder.findOne({
		where: {
			xorder_id: req.param("xorder_id")
		}
	}).then((data) => {
		if(data.flag != 0){
			res.send({
				code: 2,
				msg: "此订单已被其他人接取"
			});
			flag2 = true;
		}
	}).catch();
	if(flag2) return;

	//更新用户接单状态
	await UserModel.update({
		account: req.param("account")
	}, {
		$set: {
			canAccept_x: false
		}
	},
	function(){}
	); 

	//更新维修单内容
	await xorder.update({
		flag: 1,
		accept_person: req.param("name"),
		accept_account: req.param("account"),
		accept_time: req.param("accept_time")
	},{
		where: {
			xorder_id: req.param("xorder_id")
		}
	}).then(() => {
		res.send({
			code: 0,
			msg: "接单成功"
		});
	}).catch();
});

//根据xorder_id获取对象
router.get("/x_2", function(req, res, next){
	xorder.findOne({
		where: {
			xorder_id: req.param("xorder_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query xorder table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query xorder table"
		});
	});
});

//加载我的任务
router.get("/x_3", function(req, res, next){
	xorder.findAll({
		where: {
			accept_account: req.param("account"),
			flag: {
				$or : [1, 2, 4]
			}
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query xorder table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query xorder table",
			err: err
		});
	});
});

//维修单开始api
//只修改flag
router.post("/x_4", function(req, res, next){
	xorder.update({
		flag: 2,
	}, {
		where: {
			xorder_id: req.param("xorder_id")
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "modify xorder table successfully"
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to modify xorder table"
		});
	});
});

//维修延时
router.post("/x_5", async function(req, res, next){
	await UserModel.update({
		account: req.param("account")
	}, {
		$set: {
			canAccept_x: true
		}
	}, function(err){
		if(err){
			res.send({
				code: -1,
				msg: "用户维修接单状态修改出错"
			});
			return;
		}
		xorder.update({
			flag: 4,
			delay_time: req.param("delay_time")
		}, {
			where: {
				xorder_id: req.param("xorder_id")
			}
		}).then(() => {
			res.send({
				code: 0,
				msg: "维修单更新成功"
			});
		}).catch((err) => {
			res.send({
				code: -1,
				msg: "维修单更新失败"
			});
		});
	});
});



router.get("/x_6", function(req, res, next){
	xorder.findAll({
		where: {
			accept_account : req.param("account"),
			flag: 3
		}
	}).then((data) => {
		res.send({
			code: 0,
			msg: "query xorder table successfully",
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "unable to query xorder table"
		});
	});
});

//x-finished-detail
router.get("/x_7", function(req, res, next){
	var d1 = fs.readFileSync(req.param("official_signature"));
	var d2 = fs.readFileSync(req.param("director_signature"));
	var base64str1 = d1.toString("base64");
	var base64str2 = d2.toString("base64");
	res.send({
		official_signature: base64str1,
		director_signature: base64str2
	});
});


//维修单填写1界面
router.post("/x_8", function(req, res, next){
	xorder.update({
		isGuarantee:req.param("isGuarantee"),
		faultCause:req.param("faultCause"),
		dealResult:req.param("dealResult"),
		replacement:req.param("replacement"),
		start_time:req.param("start_time"),
		arrive_time:req.param("arrive_time"),
		repair_time:req.param("repair_time"),
		chargeItem:req.param("chargeItem"),
		repair_cost:req.param("repair_cost"),
		fittings_cost:req.param("fittings_cost")
	}, {
		where: {
			xorder_id: req.param("xorder_id")
		}
	}).then((data) => {
		res.send({
			code: 0
		});
	}).catch((err) => {
		res.send({
			date: err,
			code: -1
		});
	});
});


//维修 2页面
router.post("/x_9", function(req, res, next){
	var data = req.param("base64");
	var name = req.param("xorder_id") + req.param("suffix");
	var dataBuffer = new Buffer(data, 'base64');
	fs.writeFile("public/Signature/" + name + ".jpeg", dataBuffer, function(err) {
		if(err){
			res.send({
				code : -1,
				msg : "unable to store photo"
			});
		}
		else{
			xorder.update({
				customerOpinion:req.param("customerOpinion"),
				tel:req.param("tel"),
				official_signature:req.param("official_signature"),
			}, {
				where: {
					xorder_id: req.param("xorder_id")
				}
			}).then((data) => {
				res.send({
					code: 0
				});
			}).catch((err) => {
				res.send({
					code: -1
				});
			});
		}
	});
});


router.post("/x_10", function(req, res, next){
	var data = req.param("base64");
	var name = req.param("xorder_id") + req.param("suffix");
	var dataBuffer = new Buffer(data, 'base64');
	fs.writeFile("public/Signature/" + name + ".jpeg", dataBuffer, function(err) {
		if(err){
			res.send({
				code : -1,
				msg : "unable to store photo"
			});
		}
		else{
			xorder.update({
				flag:3,
				director_signature: req.param("director_signature")
			}, {
				where: {
					xorder_id: req.param("xorder_id")
				}
			}).then((data) => {
				UserModel.update(
				{
					account : req.param("account")
				},
				{
					$set : {
						canAccept_x: true
					}
				},
				function(e1, r1){
					if(r1){
						res.send({
							code: 0
						});
					}
				});
			}).catch((err) => {
				res.send({
					code: -1
				});
			});
		}
	});
});


//继续维修
//不考虑所有系统数据错误
router.post("/x_11", async function(req, res, next){
	var flag1 = false;
	var flag2 = false;

	//先查此用户是否可以接单
	await UserModel.findOne({
		account: req.param("account")
	}, function(err, result){
		if(err){
			flag1 = true;
			res.send({
				code: -1
			});
			return;
		}
		if(result.canAccept_x == false){
			flag1 = true;
			res.send({
				code: 1,
				msg: "此用户当前有进行中的维修单,不能继续接单"
			});
		}
	});
	if(flag1) return;

	//更新用户状态
	await UserModel.update({
		account: req.param("account")
	}, {
		$set: {
			canAccept_x: false
		}
	}, function(err, result){
		if(err){
			flag2 = true;
			res.send({
				code: -1
			});
		}
	});
	if(flag2) return;

	//更新维修单内容
	await xorder.update({
		flag: 1,
		accept_time: req.param("accept_time")
	}, {
		where: {
			xorder_id: req.param("xorder_id")
		}
	}).then(() => {
		res.send({
			code: 0
		});
	}).catch(() => {
		res.send({
			code: -1
		});
	});

});
//----------------------alarm接口----------------------

//增加接警
/*router.post("/addAlarm", async function(req, res, next){
	var time = new Date(req.param("time"));
	var year = time.getFullYear();
	var month = time.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = time.getDate();
	day = (day < 10 ? "0" : "") + day;
	var hour = time.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var minute = time.getMinutes();
	minute = (minute < 10 ? "0" : "") + minute;
	var second = time.getSeconds();
	second = (second < 10 ? "0" : "") + second;
	var times = year + month + day + hour + minute + second;

	var addr;
	var trapped = req.param("trapped") == 0 ? false : true;
	await DeviceModel.findOne({
		code: req.param("lift_id")
	}, function(err, result){
		if(err){
			res.send({
				code: -1,
				msg: "unable to query device table"
			});
			return;
		}
		else{
			addr = result.addr.addr
		}
	});

	alarm.create({
		alarm_id: "al" + times,
		lift_id: req.param("lift_id"),
		addr: addr,
		trapped: trapped,
		status: 0,
		release_time: req.param("time")
	}).then((data) => {
		res.send({
			code: 0,
			msg: "create alarm table successfully"
		})
	}).catch((err) => {
		res.send({
			code: 0,
			msg: "unable to create alarm table"
		});
	});
});*/

//------------------网页----------
//网页派单api
router.post("/w_1", function(req, res, next){
	var name = req.param("name");
	var order_id = "xz12345678";
	var number = req.param("number");
	DeviceModel.findOne(
	{
		code: req.param("code")
	},
	function(err, result){
		if(err){
			res.send({
				code: -1
			});
			return;
		}
		else{
			smsClient.sendSMS({
				PhoneNumbers: number,
				SignName: '王春梅',
				TemplateCode: 'SMS_122282790',
				TemplateParam: '{"per":"' + name + '","address":"' + result.addr.addr + '","model":"' + result.elevatorModel + '","orderID":"' + order_id + '"}'
			}).
			then(
				function (r) {
					let {Code} = r;
					if (Code === 'OK') {
					}
				}, 
				function (erb){
					res.send({
						code : -1,
						msg : erb
					});
					return;
				}
				);
		}
	}
	);
	res.send({
		code : 0
	});
});

//网页维保查询
router.get("/w_2", function(req, res, next){
	var lift_id = req.param("device_id");
	var flag = req.param("mainstatus");
	var maintain_type = req.param("maintype");
	var deviceArr = req.param("deviceArr");
	var timeline = req.param("timeline");
	//查所有电梯的
	if(lift_id == 9999){
		//已接单 对应flag有1和2
		if(flag == 1){
			order.findAll({
				where: {
					lift_id: {
						$in: deviceArr
					},
					maintain_type: maintain_type,
					flag: {
						$in: [1, 2]
					}
				}
			}).then((data) => {
				res.send({
					code: 0,
					obj: data
				});
			}).catch((err) => {
				res.send({
					code: -1,
					obj: err
				})
			});
			return;
		}
		//已完成  要考虑时间
		else if(flag == 5){
			order.findAll({
				where: {
					lift_id: {
						$in: deviceArr
					},
					maintain_type: maintain_type,
					flag: 5,
					pass_time: {
						$gt: timeline
					}
				}
			}).then((data) => {
				res.send({
					code: 0,
					obj: data
				});
			}).catch((err) => {
				res.send({
					code: -1,
					obj: err
				})
			});
			return;
		}
		//其他情况
		else{
			order.findAll({
				where: {
					lift_id: {
						$in: deviceArr
					},
					maintain_type: maintain_type,
					flag: flag
				}
			}).then((data) => {
				res.send({
					code: 0,
					obj: data
				});
			}).catch((err) => {
				res.send({
					code: -1,
					obj: err
				})
			});
			return;
		}
	}
	//查单一电梯
	else{
		//已接单 对应flag有1和2
		if(flag == 1){
			order.findAll({
				where: {
					lift_id: lift_id,
					maintain_type: maintain_type,
					flag: {
						$in: [1, 2]
					}
				}
			}).then((data) => {
				res.send({
					code: 0,
					obj: data
				});
			}).catch((err) => {
				res.send({
					code: -1,
					obj: err
				})
			});
			return;
		}
		//已完成  要考虑时间
		else if(flag == 5){
			order.findAll({
				where: {
					lift_id: lift_id,
					maintain_type: maintain_type,
					flag: 5,
					pass_time: {
						$gt: timeline
					}
				}
			}).then((data) => {
				res.send({
					code: 0,
					obj: data
				});
			}).catch((err) => {
				res.send({
					code: -1,
					obj: err
				})
			});
			return;
		}
		//其他情况
		else{
			order.findAll({
				where: {
					lift_id: lift_id,
					maintain_type: maintain_type,
					flag: flag
				}
			}).then((data) => {
				res.send({
					code: 0,
					obj: data
				});
			}).catch((err) => {
				res.send({
					code: -1,
					obj: err
				})
			});
			return;
		}
	}
	res.send({
		code: -1,
		msg: "难道还有没有考虑到的情况?"
	})
});

router.get("/w_3", function(req, res, next){
	temp_faultModel.findOne({
		lift_id: req.param("lift_id"),
		faultCode: req.param("faultCode")
	}, function(err, result){
		if(result == null){
			res.send({
				flag: false
			});
			return;
		}
		res.send({
			flag: true
		});
	});
});

//获得断网电梯数组
router.get("/w_4", async function(req, res, next){
	var devicelist = req.param("devicelist");
	var time = new Date(req.param("time"));
	var broken = [];
	var i = 0;
	var process = function(i){
		if(i == devicelist.length){
			res.send({
				code: 0,
				data: broken,
				msg: "返回一个数组，里边是断网电梯的id"
			});
			return;
		}

		redis.query("common:" + devicelist[i], function(err, rec){
			if(!rec){
				broken.push(devicelist[i]);
			}
			else{
				var lasttime = new Date(rec.date);
				var sub = parseInt(time - lasttime);
				if(sub >= 10 * 60 * 1000){
					broken.push(devicelist[i]);
				}
			}
			process(++i);
		});
	}
	process(i);
});

//断网派单
router.post("/w_5", function(req, res, next){
	var time = new Date(req.param("time"));

	var year = time.getFullYear();
	var month = time.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = time.getDate();
	day = (day < 10 ? "0" : "") + day;
	var hour = time.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var minute = time.getMinutes();
	minute = (minute < 10 ? "0" : "") + minute;
	var second = time.getSeconds();
	second = (second < 10 ? "0" : "") + second;
	var times = year + month + day + hour + minute + second;

	DeviceModel.findOne({
		code: req.param("code")
	}, function(err, result){
		if(err){
			res.send({
				code: -1,
				msg: "mongo-device-query有问题"
			});
			return;
		}
		if(result == null){
			res.send({
				code: 0,
				msg: "此电梯没有在数据库中定义: " + req.param("code")
			});
			return;
		}
		xorder.create({
			xorder_id: "xzx" + times,
			flag: 0,
			lift_id: req.param("code"),
			code: 8888,
			jing: result.jing,
			wei: result.wei,
			useUnit: result.useUnit,
			layers: result.layers.floor + "层" + result.layers.station + "站" + result.layers.door + "门",
			ratedLoad: result.ratedLoad,
			elevatorModel: result.elevatorModel,
			ratedSpeed: result.ratedSpeed,
			makeUnit: result.makeUnit,
			addr: result.addr.province + result.addr.city + result.addr.district + result.addr.addr,
			release_time: time,
			rating_person: result.rating_person
		}).then((data) => {
			var temp = new temp_faultModel({
				lift_id: req.param("code"),
				faultCode: 8888
			});
			temp.save(function(err_){
				if(err_){
					res.send({
						code: -1,
						msg: "mongo-temp_fault-insert有问题"
					});
					return;
				}
				res.send({
					code: 0,
					msg: "流程正常走通"
				});
				return;
			});
		}).catch((err) => {
			res.send({
				code: -1,
				msg: "mysql-xorder-insert有问题"
			});
		});
	});
});


//cf/ef派单
router.post("/w_6", function(req, res, next){
	var time = new Date(req.param("time"));

	var year = time.getFullYear();
	var month = time.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = time.getDate();
	day = (day < 10 ? "0" : "") + day;
	var hour = time.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var minute = time.getMinutes();
	minute = (minute < 10 ? "0" : "") + minute;
	var second = time.getSeconds();
	second = (second < 10 ? "0" : "") + second;
	var times = year + month + day + hour + minute + second;

	DeviceModel.findOne({
		code: req.param("code")
	}, function(err, result){
		if(err){
			res.send({
				code: -1,
				msg: "mongo-device-query有问题"
			});
			return;
		}
  		//这种情况在完备的系统下是不可能发生的 但测试时难免会碰到
  		if(result == null){
  			res.send({
  				code: 0,
  				msg: "此电梯没有在数据库中定义: " + req.param("code")
  			});
  			return;
  		}
  		xorder.create({
  			xorder_id: "xzx" + times,
  			flag: 0,
  			lift_id: req.param("code"),
  			code: req.param("faultCode"),
  			jing: result.jing,
  			wei: result.wei,
  			useUnit: result.useUnit,
  			layers: result.layers.floor + "层" + result.layers.station + "站" + result.layers.door + "门",
  			ratedLoad: result.ratedLoad,
  			elevatorModel: result.elevatorModel,
  			ratedSpeed: result.ratedSpeed,
  			makeUnit: result.makeUnit,
  			addr: result.addr.province + result.addr.city + result.addr.district + result.addr.addr,
  			release_time: time,
  			rating_person: result.rating_person
  		}).then((data) => {
  			temp_faultModel.remove({
  				lift_id: req.param("code"),
  				faultCode: req.param("faultCode")
  			}, function(err){
  				if(err){
  					res.send({
  						code: -1,
  						msg: "mongo-temp_fault-remove有问题"
  					});
  					return;
  				}
  				res.send({
  					code: 0,
  					msg: "流程正常走通"
  				});
  			});
  		}).catch((err) => {
  			res.send({
  				code: -1,
  				msg: "mysql-xorder-insert有问题"
  			});
  		});
  	});
});

//----------------------app api
//图片加载
router.get("/androidLoadPhoto", function(req, res, next){
	var path = req.param("imagePath");
	var data =  fs.readFileSync(path);
	var bdata = data.toString("base64");
	res.send(bdata);
});


router.post("/addNewDevice", function(req, res, next){

	var code = req.param("gatewayID");
	var cameraID = req.param("cameraID");
	var area = req.param("area");
	var province = req.param("province");
	var city = req.param("city");
	var district = req.param("district");
	var addr = req.param("addr");
	var start_date = new Date(req.param("start_date"));
	var installUnit = req.param("installUnit");
	var useUnit = req.param("useUnit");
	var useUnitID = req.param("useUnitID");
	var registerID = req.param("registerID");
	var makeUnit = req.param("makeUnit");
	var maintainUnit = req.param("maintainUnit");
	//电梯型号
	var elevatorModel = req.param("elevatorModel");
	//曳引机型号
	var tractionMachineModel = req.param("tractionMachineModel");
	//曳引机根数
	var tractionMachine_num = req.param("tractionMachine_num");
	//曳引机直径
	var tractionMachine_diameter = req.param("tractionMachine_diameter");
	//电机功率
	var motorPower = req.param("motorPower");
	//控制柜型号
	var controlBox = req.param("controlBox");
	//制动器型号
	var brakes = req.param("brakes");
	//限速器型号
	var speedLimiter = req.param("speedLimiter");
	//安全钳型号
	var safetyGear = req.param("safetyGear");
	//门锁型号
	var doorLock = req.param("doorLock");
	//额定速度
	var ratedSpeed = req.param("ratedSpeed");
	//额定载重
	var ratedLoad = req.param("ratedLoad");
	//层
	var floor = req.param("floor");
	//站
	var station = req.param("station");
	//门
	var door = req.param("door");
	var jing = req.param("jing");
	var wei = req.param("wei");
	//安装人员姓名
	var installPer = req.param("installPer");
	//安装人员电话
	var installTel = req.param("installTel");
	var device = new DeviceModel({
		code: code,
		cameraID: cameraID,
		addr: {
      		area: area || "",
      		province: province || "",
      		city: city || "",
      		district: district,
      		addr: addr || "" 
    	},
		start_date: start_date || new Date(),
		installUnit: installUnit || "",
		useUnit: useUnit || "",
		useUnitID: useUnitID || "",
		registerID: registerID || "",
		makeUnit: makeUnit || "",
		maintainUnit: maintainUnit || "",
		elevatorModel: elevatorModel || "",
		tractionMachineModel: tractionMachineModel || "",
		tractionMachine: { 
    		num: tractionMachine_num || "",
    		diameter: tractionMachine_diameter || ""
  		},
		motorPower: motorPower || "",
		controlBox: controlBox || "",
		brakes: brakes || "",
		speedLimiter: speedLimiter || "",
		safetyGear: safetyGear || "",
		doorLock: doorLock || "",
		ratedSpeed: ratedSpeed || "",
		ratedLoad: ratedLoad || "",
		layers: {
      		floor: floor || "",
      		station: station || "",
      		door: door || ""
    	},
    	flag: 0,
    	jing: jing,
    	wei: wei
	});
	device.save(async function(err){
		if(!err){
			for(var i = 0; i < installPer.length; i++){
				await DeviceModel.update(
					{
						code : code
					},
					{
						$addToSet : {
							install_perInfo : {
								installPer : installPer[i],
								installTel : installTel[i]
							}
						}
					},
					function(){}
				);
			}
		}
	});

	res.send({
		code: 0
	});
	

});

router.get("/newDeviceCheck", function(req, res, next){
	DeviceModel.find({
		code : req.param("gatewayID")
	}, function(err, result){
		if(result.length == 0){
			res.send({
				code: 0
			});
			return;
		}
		res.send({
			code: -1
		});
	});
});


//-----------------------------
//添加紧急单
router.post("/e_1", function(req, res, next){

	var time = new Date();
	var year = time.getFullYear();
	var month = time.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = time.getDate();
	day = (day < 10 ? "0" : "") + day;
	var hour = time.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var minute = time.getMinutes();
	minute = (minute < 10 ? "0" : "") + minute;
	var second = time.getSeconds();
	second = (second < 10 ? "0" : "") + second;
	var times = year + month + day + hour + minute + second;

	DeviceModel.findOne({
		code: req.param("code")
	}, function(err, result){
		if(err){
			res.send({
				code: -1
			});
			return;
		}
		eorder.create({
			eorder_id: "ER" + times + req.param("code"),
			addr: result.addr.province + result.addr.city + result.addr.district + result.addr.addr,
			useUnit: result.useUnit,
			//faultCode: req.param("faultCode"),
			release_time: time,
			flag: 0,
			lift_id: req.param("code"),
			text: ""
		}).then((data) => {
			res.send({
				code: 0
			});
		}).catch((err) => {
			res.send({
				obj: err,
				code: -1
			});
		});
	});
});

router.get("/e_2", function(req, res, next){
	eorder.findAll({
		where: {
			flag: req.param("flag")
		}
	}).then((data) => {
		res.send({
			code: 0,
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1,
			obj: err
		});
	});
});


router.get("/e_3", function(req, res, next){
	eorder.find({
		where: {
			eorder_id: req.param("eorder_id")	
		}
	}).then((data) => {
		res.send({
			code: 0,
			obj: data
		});
	}).catch((err) => {
		res.send({
			code: -1
		})
	});
});

router.post("/e_4", function(req, res, next){
	var t = "t" + req.param("num");
	var p = "p" + req.param("num");
	var date = new Date(req.param("time"));
	if(req.param("num") == 5){
		eorder.update({
			[`${t}`]: date,
			[`${p}`]: req.param("name"),
			flag: 1
		}, {
			where: {
				eorder_id: req.param("eorder_id")
			}
		}).then((data) => {
			res.send({
				code: 0
			});
		}).catch((err) => {
			res.send({
				code: -1,
				data: err
			});
		});
	}
	else{
		eorder.update({
			[`${t}`]: date,
			[`${p}`]: req.param("name")
		}, {
			where: {
				eorder_id: req.param("eorder_id")
			}
		}).then((data) => {
			res.send({
				code: 0
			});
		}).catch((err) => {
			res.send({
				code: -1,
				data: err
			});
		});
	}
});


router.post("/e_5", function(req, res, next){
	var old;
	eorder.find({
		where: {
			eorder_id: req.param("eorder_id")
		}
	}).then((data) => {
		old = data.text;
		console.log("old old: " + old);
		old += (new Date() + "|" + req.param("text") + "|"); 
		console.log("new old: " + old);
		eorder.update({
			text: old
		}, {
			where: {
				eorder_id: req.param("eorder_id")
			}
		}).then((_data) => {
			res.send({
				code: 0
			});
		}).catch((_err) => {
			res.send({
				code: -1,
				msg: "更新出错",
				obj: _err
			});
		});
	}).catch((err) => {
		res.send({
			code: -1,
			msg: "查询出错或then处理过程出错",
			obj: err
		});
	});
});

//获取当前用户所拥有的电梯列表
//不考虑dev_list数据出错的问题 即循环里边的查询不考虑错误情况
/*router.get("/app_1", function(req, res, next){
	var info = [];
	UserModel.findOne({account: req.param"account"}, function(err, result){
		if(err){
			res.send({
				code: -1
			});
			return;
		}
		for(var i = 0; i < result.dev_list.length; i++){
			await DeviceModel.findOne({code: result.dev_list[i]}, function(e, r){
				var obj = {
					code: r.code,
					cameraID: r.cameraID,
					addr: r.addr.province + r.addr.city + r.addr.district + r.addr.addr
				};
				info.append(obj);
			});
		}
		res.send({
			code: 0,
			obj: info
		});
	});
});*/

//---平台后续所需接口
router.get("/c_1", function(req, res, next){
	var start_date = req.param("start_date");
	var end_date = req.param("end_date");
	var registerID = req.param("registerID");
	var elevatorModel = req.param("elevatorModel");
	
	if(registerID === "" && elevatorModel === ""){
		FaultStatisticsModel.find({
			faultTime: {
				$gt: start_date,
				$lt: end_date
			}
		}, function(e, r){
			if(e){
				res.send({
					code: -1
				});
				return;
			}
			res.send({
				code: 0,
				obj: r
			});
		});
	}

	if(registerID === "" && elevatorModel !== ""){
		FaultStatisticsModel.find({
			faultTime: {
				$gt: start_date,
				$lt: end_date
			},
			elevatorModel: elevatorModel
		}, function(e, r){
			if(e){
				res.send({
					code: -1
				});
				return;
			}
			res.send({
				code: 0,
				obj: r
			});
		});
	}

	if(registerID !== "" && elevatorModel === ""){
		FaultStatisticsModel.find({
			faultTime: {
				$gt: start_date,
				$lt: end_date
			},
			registerID: registerID
		}, function(e, r){
			if(e){
				res.send({
					code: -1
				});
				return;
			}
			res.send({
				code: 0,
				obj: r
			});
		});
	}
});

module.exports = router;