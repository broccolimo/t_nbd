"use strict";

const Sequelize = require("sequelize");
var sequelize = new Sequelize('xizi', 'root', 'yizhimc', {
  port: '23306',
  //默认就是localhost
  //host: '47.93.225.155',
  host: '47.93.3.105',
  //必须指定方言
  dialect: 'mysql',
  //不加这一行启动时会出现弃用信息
  //operatorsAliases: false
});

sequelize.authenticate().then(() => {
  console.log("已成功连接至mysql数据库");
}).catch((err) => {
  console.log("Unable to connect to database: ", err);
  return;
});

module.exports = sequelize;
