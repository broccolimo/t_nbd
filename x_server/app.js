"use strict";

//总入口

const fs = require("fs");
const join = require("path").join;

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const config = require("./config/index.js");

const models = join(__dirname, "models");
const port = process.env.PORT || 3000;
const app = express();
const access = require("./routes/login")

app.use(express.static("public"));

module.exports = app;

// 加载所有model下的模块,数据定义
fs
  .readdirSync(models)
  .filter(file => ~file.search(/^[^\.].*\.js$/))
  .forEach(file => require(join(models, file)));

//加载express相关配置,这里是http服务器相关配置
require("./config/express")(app);
//加载routes相关配置,这里是url路由,且注意登录配置
require("./config/routes")(app);

var redis = require("./config/redis");

//连接mongodb
function connectMongo() {
  var options = {
    native_parser: true,
    poolSize: config.mongoPoolSize || 20,
    connectTimeoutMS: 3000,
    keepAlive: 1,
    useMongoClient: 1
  };
  mongoose.Promise = global.Promise;
  return mongoose.connect(config.mongo, options).connection;
}

//连接mongo数据库成功后,开启web服务
connectMongo()
  .on("error", function(){})
  .on("disconnected", connectMongo)
  .once("open", function () {
    //执行一次监听web服务
    app.listen(port);
    console.log("Express app started on port " + port);
    //查看是否root帐号已经创建
    access.NewRoot();
  });
