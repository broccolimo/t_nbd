"use strict";

const api = require("../routes/api");
const access = require("../routes/login");
const video = require("../routes/mqtt_publish").video;
module.exports = function (app) {
  //登入,
  app.all("/login", access.login);

  //登出
  app.all("/logout", access.logout);

  //验证是否已经登录,否则直接转向登录页
  app.use(access.islogin);

  
  //注册
  app.all("/register", access.register);
  //删除账户
  app.all("/unregister", access.delUser);
  //修改账户密码
  app.all("/chgpass", access.chgPassword);
  // api数据接口
  app.use("/api/v1", api);

  //下面是错误处理
  app.use(function (err, req, res, next) {
    // treat as 404
    if (
      err.message &&
      (~err.message.indexOf("not found") ||
        ~err.message.indexOf("Cast to ObjectId failed"))
    ) {
      return next();
    }

    console.error(err.stack);

    if (err.stack.includes("ValidationError")) {
      res.status(422).render("422", {
        error: err.stack
      });
      return;
    }

    // error page
    res.status(500).render("500", {
      error: err.stack
    });
  });

  // assume 404 since no middleware responded
  app.use(function (req, res) {
    const payload = {
      url: req.originalUrl,
      error: "Not found"
    };
    if (req.accepts("json")) return res.status(404).json(payload);
    res.status(404).render("404", payload);
  });
};