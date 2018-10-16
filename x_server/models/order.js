"use strict";

const Sequelize = require("sequelize");

const sequelize = require("../config/mysql");

const order = sequelize.define('_order', {
	//工单单编号
	order_id: {type: Sequelize.STRING, primaryKey: true, field: "order_id"},
	//0 系统生成订单且未有人接单 1 有人接 未开始 2 已开始 3 已提交 在复核中 4复核未通过 5复核通过 6 延时中 7 退单
	flag: {type: Sequelize.INTEGER, field: "flag"},
	//对应维保单的编号 在工单处生成 电梯id+类型+时间
	maintain_id: {type: Sequelize.STRING, field: "maintain_id"},
	//0 半月维保 1 季度维保 2 半年维保 3 1年维保 4 一般故障 5 紧急故障
	maintain_type: {type: Sequelize.INTEGER, field: "maintain_type"},
	//接单人账号姓名
	accept_person: {type: Sequelize.STRING, field: "accept_person"},
	//接单人账号
	accept_account: {type: Sequelize.STRING, field: "accept_account"},
	//接单人公司
	accept_person_company: {type: Sequelize.STRING, field: "accept_person_company"},
	//额定接单人 工单池匹配
	rating_person: {type: Sequelize.STRING, field: "rating_person"},
	//额定审核人 里边放的是account
	rating_check: {type: Sequelize.STRING, field: "rating_check"},
	//实际审核人 账号 备用
	actual_check_account: {type: Sequelize.STRING, field: "actual_check_account"},
	//实际审核人 名字
	actual_check_name: {type: Sequelize.STRING, field: "actual_check_name"},
	//电梯编号
	lift_id: {type: Sequelize.STRING, field: "lift_id"},
	//发单时间
	release_time: {type: Sequelize.DATE, field: "release_time"},
	//额定时间
	rating_time: {type: Sequelize.STRING, field: "rating_time"},
	//接单时间 重新维保时 该值更新
	accept_time: {type: Sequelize.DATE, field: "accept_time"},
	//开始时间 重新维保时 该值更新
	start_time: {type: Sequelize.DATE, field: "start_time"},
	//维保单填完 点击下一步的时间 这个值更新时覆盖
	prefinish_time: {type: Sequelize.DATE, field: "prefinish_time"},
	//提交时间 重新维保时 该值更新
	commit_time: {type: Sequelize.DATE, field: "commit_time"},
	//审核通过时间
	pass_time: {type: Sequelize.DATE, field: "pass_time"},
	//审核不通过时间 只记单值 更新
	refuse_time: {type: Sequelize.DATE, field: "refuse_time"},
	//审核不通过原因
	refuse_reason: {type: Sequelize.TEXT, field: "refuse_reason"},
	//退单时间
	cancel_time: {type: Sequelize.DATE, field: "cancel_time"},
	//退单原因
	cancel_reason: {type: Sequelize.TEXT, field: "cancel_reason"},
	//延时开始时间
	delay_time: {type: Sequelize.DATE, field: "delay_time"},
	//延时描述
	delay_description: {type: Sequelize.TEXT, field: "delay_description"},
	//人工费用
	artificial_cost: {type: Sequelize.STRING, field: "artificial_cost"},
	//出差费用
	trip_cost: {type: Sequelize.STRING, field: "trip_cost"},
	//材料费用
	material_cost: {type: Sequelize.STRING, field: "material_cost"},
	//服务费用
	service_cost: {type: Sequelize.STRING, field: "service_cost"},
	//协助人 姓名|电话|单位, 姓名|电话|单位
	assist: {type: Sequelize.TEXT, field: "assist"},
	//0非常满意 1满意 2一般 3不满意
	customer_satisfaction: {type: Sequelize.INTEGER, field: "customer_satisfaction"},
	//客户签名存储路径
	customer_signature_path: {type: Sequelize.STRING, field: "customer_signature_path"},
	//备注信息
	note_information: {type: Sequelize.TEXT, field: "note_information"},
	//经度
	jing: {type: Sequelize.DOUBLE, field: "jing"},
	//纬度
	wei: {type: Sequelize.DOUBLE, field: "wei"},
	//使用单位名称
	useUnit: {type: Sequelize.STRING, field: "useUnit"},
	//电梯地址
	addr: {type: Sequelize.STRING, field: "addr"},
	//注册代码
	registerID: {type: Sequelize.STRING, field: "registerID"},
	//电梯型号
	productID: {type: Sequelize.STRING, field: "productID"}
},{
	//默认是false 会把定义的表名变成复数
	freezeTableName: true,
	//默认是true 会添加createAt updateAt属性
	timestamps: false
});

//同步到数据库中
order.sync({force: false}).then((data) => {
	console.log("成功连接mysql-order");
});

module.exports = order;

