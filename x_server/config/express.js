"use strict";

// express相关配置

const express = require("express");
// session加载
const session = require("express-session");
//压缩
const compression = require("compression");
// log URL
const morgan = require("morgan");
// cookie
const cookieParser = require("cookie-parser");

//cookie-session, 将sesion部分数据保存到cookie中
// const cookieSession = require("cookie-session");
// html body
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
//跨站攻击token防护
// const csrf = require('csurf');

//上传
// const upload = require('multer')();

//const mongoStore = require('connect-mongo')(session);
const sessStore = require("connect-redis")(session);

const config = require("./index");
const pkg = require("../package.json");

//当前环境
const env = process.env.NODE_ENV || "development";

//express配置的实际代码执行
module.exports = function(app) {
  // Compression middleware (should be placed before express.static)
  app.use(compression({ threshold: 512 }));

  // 静态文件
  app.use(express.static(config.root + "/public"));

  // 记录URL访问
  let log = "short";
  if (process.env.NODE_ENV != "production") {
    log = "dev";
  }
  //所有请求都要执行morgan中间件
  app.use(morgan(log));

  // 解析body中的json
  app.use(bodyParser.json({limit:"50mb"}));
  app.use(bodyParser.urlencoded({ extended: true ,limit: "50mb"}));

  // CookieParser should be above session
  app.use(cookieParser());
  // app.use(cookieSession({ secret: "secret.yzmc.com" }));

  //redis来保存和更新sessionid
  app.use(
    session({
      resave: true,
      rolling: true,
      saveUninitialized: false,
      secret: "secret.yzmc.com", //密钥
      store: new sessStore(config.redis),
      cookie: config.cookie
    })
  );

  if (env === "development") {
    app.locals.pretty = true;
  }
};
