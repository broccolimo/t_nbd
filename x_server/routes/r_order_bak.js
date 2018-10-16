"use strict"

const express = require("express");
const router = express.Router();
const fs = require("fs");

const OrderModel = require("../models/order");
const UserModel = require("../models/user");
const DeviceModel = require("../models/device");

const halfMonthMaintainModel = require("../models/maintainConfig").halfMonthMaintain;
const quarterlyMaintainModel = require("../models/maintainConfig").quarterlyMaintain;
const halfYearMaintainModel = require("../models/maintainConfig").halfYearMaintain;
const yearMaintainModel = require("../models/maintainConfig").yearMaintain;


const SMSClient = require("@alicloud/sms-sdk");
const accessKeyId = "LTAIGfKWPMOBRGoj";
const secretAccessKey = "6cZ4Fmeb4Aytbymz0psxv8o5KKR9Ni";

let smsClient = new SMSClient({accessKeyId, secretAccessKey});
//test
const fffModel = require("../models/test");
router.post("/t0425", function(req, res, next){
	const fff = new fffModel({
		f1: "fff",
		f2: "ggg"
	});

	fff.save();
});

//添加工单 测试用
router.post("/addOrder", async function(req, res, next){
	const order = new OrderModel({
		order_id : req.param("order_id") || "",
		flag : req.param("flag") || "",
		maintain_id : req.param("maintain_id") || "",
		maintain_type : req.param("maintain_type") || "",
		list_id : req.param("list_id") || "",
		release_time : req.param("release_time") || "",
		rating_time : req.param("rating_time") || "",
		rating_person : req.param("rating_person") || ""
	});

	order.save(async function(err){
		console.log("添加工单成功!");
	});

	res.send("添加工单成功!");
});

//总览
//findAllOrder 		通用 			获取订单对象(flag, n)
//getThisInfo  		我的任务
//getOrderInfo		通用				获取订单对象(order_id, 1)
//Opt_1				接单
//Opt_2				通用				获取订单对象及部分电梯信息
//Opt_3				开始
//Opt_4				退单管理
//Opt_5				填完维保单下一步
//Opt_6				填完额外信息下一步
//Opt_7				填完用户反馈下一步
//Opt_8				已提交

//通用
//获取所有想要的工单
//根据flag不同返回不同类型的工单
router.get("/findAllOrder", function(req, res, next){
	OrderModel.find(
	{
		flag : req.param("flag")
	}, 
	function(error, result){
		if(error){
			res.send({
				code : -1,
				msg : "查询order表失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result
				}
			});
		}
	}
	);
});


//显示工单池
router.get("/showOrders", function(req, res, next){
	OrderModel.find(
	{
		flag : 0,
		rating_person : {
			$elemMatch : {
				name : req.param("rating_person")
			}
		}
	},
	function(error, result){
		if(error){
			res.send({
				code : -1,
				msg : "Order表查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result
				}
			});
		}
	}
	);
});

//仅用于我的任务
//获取当前用户正在进行订单的信息
//输入 - 用户名
//输出 - 正在进行的订单对象
router.get("/getThisInfo", async function(req, res, next){
	UserModel.findOne(
	{
		name : req.param("name")
	}, 
	function(err, result){
		if(result){
			OrderModel.findOne(
			{
				order_id : result.order_processing
			}, 
			function(err2, result2){
				if(result2){
					res.send({
						code : 0,
						msg : {
							obj : result2
						}
					});
				}
				else{
					res.send(
					{
						code: -2,
						msg: "从order表中查询失败"
					}
					);
				}
			});
		}
		else{
			res.send({
				code: -1,
				msg: "从user表中查询失败"
			});
		}
	});
}
);

//通用 
//根据order_id 查出 工单对象
//输入 order_id
//输出 该工单对象
router.get("/getOrderInfo", function(req, res, next){
	OrderModel.findOne(
	{
		order_id : req.param("order_id")
	},
	function(err, result){
		if(result){
			res.send({
				code : 0,
				msg : {
					obj : result
				}
			});
		}
		else{
			res.send({
				code : -1,
				msg : "查询失败"
			});
		}
	}
	);
});

//接单时 调用的 api
//操作
//1 user.order_processing设为该订单order_id
//2 user.user_status设为false
//3 order.flag设为1
//4 order.accept_person设为该用户name
//5 order.accept_time进行添加
//order表操作失败则还原user表
router.post("/Opt_1", function(req, res, next){
	UserModel.update(
	{
		name : req.param("name")
	},
	{
		$set : {
			order_processing : req.param("orderId"),
			user_status : false
		}
	},
	function(err){
		if(err){
			res.send({
				code: -1,
				msg: "user表操作失败"
			});
			return;
		}
		else{
			OrderModel.update(
			{
				order_id : req.param("orderId")
			},
			{
				$set : {
					flag : 1,
					accept_person : req.param("name")
				},
				$addToSet : {
					accept_time : req.param("accept_time")
				}
			},
			function(err){
				if(err){
					UserModel.update(
					{
						name : req.param("name")
					},
					{
						$unset : {
							order_list : req.param("orderId")
						},
						$set : {
							user_status : true
						}
					}
					);
					res.send({
						code : -1,
						msg : "order表操作失败"
					});
					return;
				}
				else{
					res.send({
						code : 0,
						msg: "全部操作成功"
					});
				}
			}
			);
		}
	})
});

//由工单id查所负责电梯的信息
router.get("/getDeviceInfo", function(req, res, next){
	OrderModel.findOne(
	{
		order_id : req.param("order_id")
	},
	function(err, result){
		if(result){
			DeviceModel.findOne(
			{
				code: result.list_id
			},
			function(e, r){
				if(r){
					res.send({
						code: 0,
						msg: {
							obj: r
						}
					});
				}
				else{
					res.send({
						code: -1,
						msg: "从device表中查询失败"
					});
				}
			}
			);
		}
		else{
			res.send({
				code: -1,
				msg: "从order表中查询失败"
			});
		}
	} 
	);
});




router.get("/Opt_2", function(req, res, next){
	OrderModel.findOne(
	{
		order_id : req.param("order_id")
	},
	function(err, result){
		if(result){
			DeviceModel.findOne(
			{
				code: result.list_id
			},
			function(err2, result2){
				if(result2){
					res.send({
						code: 0,
						msg: {
							obj: result,
							addr: result2.addr.province + result2.addr.city + result2.addr.addr,
							xinghao: result2.elevatorModel,
							useUnit: result2.useUnit,
							registerID: result2.registerID,
							jing: result2.jing,
							wei:result2.wei
						}
					});
				}
				else{
					res.send({
						code: -1,
						msg: "从device表中查询失败"
					});
				}
			}
			);
		}
		else{
			res.send({
				code: -1,
				msg: "从order表中查询失败"
			});
		}
	} 
	);
});

//工单开始时 调用的 api
router.post("/Opt_3", function(req, res, next){
	OrderModel.update(
	{
		order_id: req.param("order_id")
	},
	{
		$set : {
			flag : 2,
			accept_person : req.param("accept_person")
		},
		$addToSet : {
			start_time : req.param("start_time")
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

//退单管理api
//由user name查 审核没有通过的工单
router.get("/Opt_4", function(req, res ,next){
	UserModel.findOne(
	{
		name : req.param("name")
	},
	function(err, result){
		if(result){
			res.send({
				code : 0,
				msg : {
					obj : result.order_failed_list
				}
			});
		}
		else{
			res.send({
				code : -1,
				msg : "查询失败"
			});
		}
	}
	);
});

//维保单填完 点击下一步 api
//1 更新维保单(未做)
//2 工单更新prefinish_time
router.post("/Opt_5", function(req, res, next){
	OrderModel.update(
	{
		order_id : req.param("order_id")
	},
	{
		$set : {
			prefinish_time : req.param("prefinish_time")
		}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : "操作失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "操作成功"
			});
		}
	}
	);
});

//填写额外信息 的 更新api
router.post("/Opt_6", function(req, res, next){
	OrderModel.update(
	{
		order_id : req.param("order_id")
	},
	{
		$set : {
			artificial_cost: req.param("artificial_cost"),
			trip_cost: req.param("trip_cost"),
			material_cost: req.param("material_cost"),
			note_information: req.param("note_information")
		},
		$addToSet : {
			assist : {
				assist_name: req.param("assist_name"),
				assist_commany: req.param("assist_commany"),
				assist_phone: req.param("assist_phone")
			}
		}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : "更新order表失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : "更新order表成功"
			});
		}
	}
	);
});


//用户反馈api
//更新订单状态
//更新user表
router.post("/Opt_7", function(req, res, next){
	OrderModel.update(
	{
		order_id : req.param("order_id")
	},
	{
		$set : {
				//原来是2 进行中 改为3 已提交在审核中
				flag : 3,
				customer_satisfaction : req.param("customer_satisfaction"),
				customer_signature_path : req.param("customer_signature_path")
			},
			$addToSet : {
				commit_time : req.param("commit_time")
			}
		},
		function(err){
			if(err){
				res.send({
					code : -1,
					msg : "更新order表失败"
				});
			}
			else{
				//order表更新成功了再更新user表
				UserModel.update(
				{
					name : req.param("name")
				},
				{
					$set : {
							//订单提交了 那么改用户就可以接单了
							user_status : true
						},
						$unset : {
							//把改单从正在进行订单字段中除去
							order_processing : req.param("order_id")
						},
						$addToSet : {
							//加在正在审核的字段中
							order_checking_list : req.param("order_id")
						}
					},
					function(error){
						if(error){
							//回退
							OrderModel.update(
							{
								order_id : req.param("order_id")
							},
							{
								$set : {
									flag : 2
								},
								$unset : {
									customer_satisfaction : req.param("customer_satisfaction"),
									customer_signature_path : req.param("customer_signature_path")
								}
							}
							);
							res.send({
								code : -1,
								msg : "更新user表失败"
							});
						}
						else{
							res.send({
								code : 0,
								msg : "更新order表和user表成功"
							});
						}
					}
					);
			}
		}
		);
});

//已提交api
router.get("/Opt_8", function(req, res, next){
	UserModel.findOne(
	{
		name : req.param("name")
	},
	function(err, result){
		if(err){
			res.send({
				code : -1,
				msg : "user表查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result.order_checking_list
				}
			})
		}
	}
	);
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
				msg : "device表查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
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
	OrderModel.update(
	{
		order_id : req.param("order_id")
	},
	{
		$set : {
			flag : 5,
			pass_time : req.param("pass_time")
		}
	},
	function(err){
		if(err){
			res.send({
				code : -1,
				msg : "order表操作失败"
			});
		}
		else{
			UserModel.update(
			{
				name : req.param("accept_person")
			},
			{
				$pull : {
					order_checking_list : req.param("order_id")
				},
				$addToSet : {
					order_finished_list : req.param("order_id")
				}
			},
			function(err){
				if(err){
					OrderModel.update(
					{
						order_id : req.param("order_id")
					},
					{
						$set : {
							flag : 3
						},
						$unset : {
							pass_time : req.param("pass_time")
						}
					},
					function(err){}
					);
					res.send({
						code : -1,
						msg : "user表操作失败"
					});
				}
				else{
					res.send({
						code : 0,
						msg : "全部操作成功"
					})
				}
			}
			);
		}
	}
	);
});


//已完成api
router.get("/Opt_11", function(req, res, next){
	UserModel.findOne(
	{
		name : req.param("name")
	},
	function(err, result){
		if(err){
			res.send({
				code : -1,
				msg : "user表查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result.order_finished_list
				}
			})
		}
	}
	);
});


//审核未通过api
router.post("/Opt_12", function(req, res, next){
	UserModel.update(
	{
		name : req.param("accept_person")
	},
	{
		$pull : {
			order_checking_list : req.param("order_id")
		},
		$addToSet : {
			order_failed_list : req.param("order_id")
		}
	},
	function(err1){
		if(err1){
			res.send({
				code : -1,
				msg : "user表操作失败"
			})
		}
		else{
			OrderModel.update(
			{
				order_id : req.param("order_id")
			},
			{
				$set : {
					flag : 4
				},
				$addToSet : {
					refuse_time : req.param("refuse_time"),
					refuse_reason : req.param("refuse_reason")
				}
			},
			function(err2){
				if(err2){
					UserModel.update(
					{
						name : req.param("accept_person")
					},
					{
						$addToSet : {
							order_checking_list : req.param("order_id")
						},
						$pull : {
							order_failed_list : req.param("order_id")
						}
					},
					function(e){}
					);
					res.send({
						code : -1,
						msg : "order表操作失败"
					});
				}
				else{
					res.send({
						code : 0,
						msg : "全部操作成功"
					});
				}
			}
			);
		}
	}
	);
});

//重新维保api
router.post("/Opt_13", function(req, res, next){
	OrderModel.update(
	{
		order_id : req.param("order_id")
	},
	{
		$set : {
			flag : 1
		},
		$addToSet : {
			accept_time : req.param("accept_time")
		}
	},
	function(err1){
		if(err1){
			res.send({
				code : -1,
				msg : "order表操作失败"
			});
		}
		else{
			UserModel.update(
			{
				name : req.param("name")
			},
			{
				$pull : {
					order_failed_list : req.param("order_id")
				},
				$set : {
					order_processing : req.param("order_id"),
					user_status : false
				}
			},
			function(err2){
				if(err2){
					OrderModel.update(
					{
						order_id : req.param("order_id")
					},
					{
						$set : {
							flag : 4
						},
						$pull : {
							accept_time : req.param("accept_time")
						}
					},
					function(err){}
					);
					res.send({
						code : -1,
						msg : "user表操作失败"
					});
				}
				else{
					res.send({
						code : 0,
						msg : "全部操作完成"
					});
				}
			}
			);
		}
	}
	);
});

//延时申请
router.post("/Opt_14", function(req, res, next){
	UserModel.update(
		{	
			name : req.param("name")
		},
		{
			$unset : {
				order_processing : req.param("order_id")
			},
			$set : {
				user_status : true
			},
			$addToSet : {
				order_delay_list : req.param("order_id")
			}
		},
		function(err){
			if(err){
				res.send({
					code : -1,
					msg : "modify user fail"
				});
				return;
			}
			else{
				OrderModel.update(
					{
						order_id : req.param("order_id")
					},
					{
						$set : {
							flag : 6
						},
						$addToSet : {
							delay_description : req.param("delay_description"),
							delay_time : req.param("delay_time")
						}
					},
					function(e1){
						if(e1){
							UserModel.update(
								{
									name : req.param("name")
								},
								{
									$set : {
										order_processing : req.param("order_id")
									},
									$set : {
										user_status : false
									},
									$unset : {
										order_delay_list : req.param("order_id")
									}
								},
								function(e2){}
							);
							res.send({
								code : -1,
								msg : "modify order fail"
							});
							return;
						}
						else{
							res.send({
								code : 0,
								msg : "all modify succeed"
							});
						}
					}
				);
			}
		}
	);
});


//延时相关
router.post("/Opt_15", function(req, res, next){
	UserModel.findOne(
	{
		name : req.param("name")
	}, 
	function(err, result){
		if(result){
			res.send({
				code : 0,
				msg : "query user succeed",
				obj : result.order_delay_list
			});
		}
		else{
			res.send({
				code: -1,
				msg: "query user fail"
			});
			return;
		}
	});
});

//延时 重新接单
router.post("/Opt_16", function(req, res, next){
	OrderModel.update(
		{
			order_id : req.param("order_id")
		},
		{
			$set : {
				flag : 1
			},
			$addToSet : {
				accept_time : req.param("accept_time")
			}
		},
		function(err){
			if(err){
				res.send({
					code : -1,
					msg : "modify order fail"
				});
				return;
			}
			else{
				UserModel.update(
					{
						name : req.param("name")
					},
					{
						$set : {
							user_status : false,
							order_processing : req.param("order_id")
						},
						$pull : {
							order_delay_list : req.param("order_id")
						}
					},
					function(e){
						if(e){
							OrderModel.update(
								{
									order_id : req.param("order_id")
								},
								{
									$set : {
										flag : 6
									},
									$pull : {
										accept_time : req.param("accept_time")
									}
								},
								function(e2){}
							);
							res.send({
								code : -1,
								msg : "modify user fail"
							});
							return;
						}
						else{
							res.send({
								code : 0,
								msg : "all modify succeed"
							})
						}
					}
				);
			}
		}
	);
});
router.post("/sendSignature", function(req, res, next){
	var data = req.param("base64");
	var name = req.param("order_id");
	var dataBuffer = new Buffer(data, 'base64');
	fs.writeFile("public/Signature/" + name + ".jpeg", dataBuffer, function(err) {
		if(err){
			res.send({
				code : -1,
				msg : err
			});
		}
		else{
			OrderModel.update(
			{
				order_id : req.param("order_id")
			},
			{
				$set : {
					customer_signature_path : "public/Signature/" + name + ".jpeg"
				}
			},
			function(e){
				if(e){
					res.send({
						code : -1,
						msg : "order表操作失败"
					});
				}
				else{
					res.send({
						code : 0,
						msg : "上传成功"
					});
				}
			}
			);
		}
	});

});


//手机维保单图片上传
router.post("/photoAndUpload", function(req, res, next){
	var data = req.param("data");
	var name = req.param("name");
	var dataBuffer = new Buffer(data, 'base64');
	fs.exists("public/maintenance/" + req.param("maintain_id") + "/", function(exists){
		if(!exists){
			fs.mkdir("public/maintenance/" + req.param("maintain_id") + "/");
		}
	});
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

//测试用 增加半月维保单
router.post("/add-halfMonthMaintain", function(req, res, next){
	const halfMonthMaintain = new halfMonthMaintainModel({
		liftId : req.param("liftId") || "",
		maintain_id : req.param("maintain_id") || "",
		startDate : req.param("startDate") || ""
	});

	halfMonthMaintain.save();

	res.send({
		code : 0,
		msg : "添加维保单成功"
	});
});

//测试用 增加季度维保单
router.post("/add-quarterlyMaintain", function(req, res, next){
	const quarterlyMaintain = new quarterlyMaintainModel ({
		liftId : req.param("liftId") || "",
		maintain_id : req.param("maintain_id") || "",
		startDate : req.param("startDate") || ""
	});

	quarterlyMaintain.save();

	res.send({
		code : 0,
		msg : "添加维保单成功"
	});
});


//测试用 增加半年维保单
router.post("/add-halfYearMaintain", function(req, res, next){
	const halfYearMaintain = new halfYearMaintainModel ({
		liftId : req.param("liftId") || "",
		maintain_id : req.param("maintain_id") || "",
		startDate : req.param("startDate") || ""
	});

	halfYearMaintain.save();

	res.send({
		code : 0,
		msg : "添加维保单成功"
	});
});


//测试用 增加一年维保单
router.post("/add-yearMaintain", function(req, res, next){
	const yearMaintain = new yearMaintainModel({
		liftId : req.param("liftId") || "",
		maintain_id : req.param("maintain_id") || "",
		startDate : req.param("startDate") || ""
	});

	yearMaintain.save();

	res.send({
		code : 0,
		msg : "添加维保单成功"
	});
});






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
				msg : "维保单查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result
				}
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
				msg : "维保单查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result
				}
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
				msg : "维保单查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result
				}
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
				msg : "维保单查询失败"
			});
		}
		else{
			res.send({
				code : 0,
				msg : {
					obj : result
				}
			})
		}
	}
	);
});

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
		code : 0
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
		code : 0
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
		code : 0
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
		code : 0
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
		code : 0
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
		code : 0
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
		code : 0
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
		code : 0
	});
});



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

	var maintain_type = req.param("maintain_type");
	//生成维保单
	switch(maintain_type){
		case "0":
			maintain_id = "m0-" + times;
			maintain = new halfMonthMaintainModel({
				maintain_id : "m0-" + times,
				liftId : req.param("lift_id"),
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
				liftId : req.param("lift_id"),
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
				liftId : req.param("lift_id"),
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
				liftId : req.param("lift_id"),
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

		case "4":
			repaire_id = "r4-" + times;
			break;

		case "5":
			repaire_id = "r5-" + times;
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

	switch(maintain_type){
		case "4" :
			DeviceModel.update(
				{
					code : req.param("lift_id")
				},
				{
					$set : {
						real_time_status : "2.2"
					}
				},
				function(err){}
			);
			break;
		
		case "5" :
			DeviceModel.update(
				{
					code : req.param("lift_id")
				},
				{
					$set : {
						real_time_status : "3.2"
					}
				},
				function(err){}
			);
			break;

		default:
			break;
	}

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
	var list_id = req.param("device_id");
	if(list_id == 9999){
		order.findAll
	}

});
module.exports = router;