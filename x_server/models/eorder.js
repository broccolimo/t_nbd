"use strict";

const Sequelize = require("sequelize");

const sequelize = require("../config/mysql");

const eorder = sequelize.define('eorder', {
	//紧急工单编号
	eorder_id: {type: Sequelize.STRING, primaryKey: true, field: "eorder_id"},
	//0 没结束 1 已结束
	flag: {type: Sequelize.INTEGER, field: "flag"},
	//电梯id
	lift_id: {type: Sequelize.STRING, field: "lift_id"},
	//电梯故障码
	//faultCode: {type: Sequelize.INTEGER, field: "faultCode"},
	//用户单位
	useUnit: {type: Sequelize.STRING, field: "useUnit"},
	//安装位置
	addr: {type: Sequelize.STRING, field: "addr"},
	//报警时间
	release_time: {type: Sequelize.DATE, field: "release_time"},
	//救援信息
	text: {type: Sequelize.TEXT, field: "text"},

	t1: {type: Sequelize.DATE, field: "t1"},
	t2: {type: Sequelize.DATE, field: "t2"},
	t3: {type: Sequelize.DATE, field: "t3"},
	t4: {type: Sequelize.DATE, field: "t4"},
	t5: {type: Sequelize.DATE, field: "t5"},

	p1:{type: Sequelize.STRING, field: "p1"},
	p2:{type: Sequelize.STRING, field: "p2"},
	p3:{type: Sequelize.STRING, field: "p3"},
	p4:{type: Sequelize.STRING, field: "p4"},
	p5:{type: Sequelize.STRING, field: "p5"},

}, {
	//默认是false 会把定义的表名变成复数
	freezeTableName: true,
	//默认是true 会添加createAt updateAt属性
	timestamps: false
});

//同步到数据库中
eorder.sync({force: false}).then((data) => {
	console.log("成功连接mysql-eorder");
});

module.exports = eorder;