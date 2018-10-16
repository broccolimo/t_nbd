"use strict";

const Sequelize = require("sequelize");

const sequelize = require("../config/mysql");

const xorder = sequelize.define('xorder', {
	//维修工单编号
	xorder_id: {type: Sequelize.STRING, primaryKey: true, field: "xorder_id"},
	//0 系统生成订单且未有人接单 1 有人接 未开始 2 已开始 3 已提交 完成 4 延时(暂时挂起)
	flag: {type: Sequelize.INTEGER, field: "flag"},
	//电梯id
	lift_id: {type: Sequelize.STRING, field: "lift_id"},
	//电梯故障码
	faultCode: {type: Sequelize.INTEGER, field: "faultCode"},
	//经度
	jing: {type: Sequelize.DOUBLE, field: "jing"},
	//纬度
	wei: {type: Sequelize.DOUBLE, field: "wei"},
	//用户单位
	useUnit: {type: Sequelize.STRING, field: "useUnit"},
	//层站
	layers: {type: Sequelize.STRING, field: "layers"},
	//载重量
	ratedLoad: {type: Sequelize.STRING, field: "ratedLoad"},
	//产品型号
	elevatorModel: {type: Sequelize.STRING, field: "elevatorModel"},
	//注册代码
	registerID: {type: Sequelize.STRING, field: "registerID"},
	//运行速度
	ratedSpeed: {type: Sequelize.STRING, field: "ratedSpeed"},
	//安装位置
	addr: {type: Sequelize.STRING, field: "addr"},
	//制造厂家
	makeUnit: {type: Sequelize.STRING, field: "makeUnit"},
	//是否保修 1表示不保修 2表示保修
	isGuarantee: {type: Sequelize.INTEGER, field: "isGuarantee"},
	
	//维修人员
	accept_person: {type: Sequelize.STRING, field: "accept_person"},
	//外键用
	accept_account: {type: Sequelize.STRING, field: "accept_account"},
	//额定接单人 工单池匹配
	rating_person: {type: Sequelize.STRING, field: "rating_person"},
	//故障原因
	faultCause: {type: Sequelize.TEXT, field: "faultCause"},
	//处理结果
	dealResult: {type: Sequelize.TEXT, field: "dealResult"},
	//更换配件
	replacement: {type: Sequelize.TEXT, field: "replacement"},
	//故障时间
	fault_time: {type: Sequelize.DATE, field: "fault_time"},

	//手动输入
	//召修时间
	release_time: {type: Sequelize.DATE, field: "release_time"},
	//出发时间
	start_time: {type: Sequelize.DATE, field: "start_time"},
	//到达时间
	arrive_time: {type: Sequelize.DATE, field: "arrive_time"},
	//修理时间
	repair_time: {type: Sequelize.DATE, field: "repair_time"},

	//接单时间 系统用
	accept_time: {type: Sequelize.DATE, field: "accept_time"},
	//延时时间 系统用
	delay_time: {type: Sequelize.DATE, field: "delay_time"},

	//用户意见
	customerOpinion: {type: Sequelize.TEXT, field: "customerOpinion"},
	//经办人签名
	official_signature: {type: Sequelize.STRING, field: "official_signature"},
	//电话
	tel: {type: Sequelize.STRING, field: "tel"},
	//收费项目：
	chargeItem: {type: Sequelize.TEXT, field: "chargeItem"},
	//修理费
	repair_cost: {type: Sequelize.STRING, field: "repari_cost"},
	//配件费
	fittings_cost: {type: Sequelize.STRING, field: "fittings_cost"},
	//主管签名
	director_signature: {type: Sequelize.STRING, field: "director_signature"},
}, {
	//默认是false 会把定义的表名变成复数
	freezeTableName: true,
	//默认是true 会添加createAt updateAt属性
	timestamps: false
});

//同步到数据库中
xorder.sync({force: false}).then((data) => {
	console.log("成功连接mysql-xorder");
});

module.exports = xorder;