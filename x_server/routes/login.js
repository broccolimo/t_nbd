var express = require("express");
var router = express.Router();
var UserModel = require("../models/user");

//登录验证
exports.login = async function (req, res) {
  var account = req.param("account");
  var pass = req.param("pass");

  if (req.method == "GET") {
    res.send({
      code: -1,
      msg: "not support."
    });
    return;
  }

  if (!account || !pass) {
    res.send({
      code: -1,
      msg: "name or pass is empty."
    });
    return;
  } else {
    //数据库中查找用户
    await UserModel.findOne({
        account: account
      },
      async function (err, doc) {
        if (err) {
          //查询错误
          res.send({
            code: -1,
            msg: "query user failed: " + err
          });
          return;
        }
        if (!doc) {
          //不存在记录
          res.send({
            code: -1,
            msg: "user not exist."
          });
          return;
        }
        if (doc.valid != 1) {
          //已经失效的记录
          res.send({
            code: -1,
            msg: "user invalid."
          });
          return;
        }
        if (!await doc.authenticate(pass)) {
          //密码验证错误
          res.send({
            code: -1,
            msg: "password is incorrect."
          });
          return;
        }
        //成功的验证
        //登陆成功，生成session，便于后面继续调用
        req.session.user = account;
        req.session.info = doc; //存储用户相关信息
        res.send({
          code: 0,
          role: doc.role,
          msg: "welcome," + account + "!"
        });
      }
    );
  }
};

//登出
exports.logout = function (req, res) {
  var user = "游客";
  if (req.session && req.session.user) {
    user = req.session.user;
    //清理掉session.id,表示此用户无效
    req.session.user = null;
    req.session.info = null;
  }
  res.send({
    code: 0,
    msg: user + " logout."
  });
};

//登录检查
exports.islogin = function (req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.send({
      code: -1,
      msg: "need login to get access right."
    });
    return;
  }
};

//用户注册
exports.register = async function (req, res, next) {
  var account = req.param("account");
  var result;
  //判断用户是否存在
  await UserModel.findOne({
      account: account
    },
    async function (err, doc) {
      if (err) {
        result = {
          code: -1,
          msg: "query db failed."
        };
      } else if (doc) {
        if (doc.valid == 1) {
          result = {
            code: -1,
            msg: "user id already registered."
          };
        } else {
          await UserModel.update({
              account: account
            }, {
              $set: {
                valid: 1
              }
            },
            function (err) {
              if (err) {
                res.send({
                  code: -1,
                  msg: "re-valid exist user failed."
                });
                return;
              }

              res.send({
                code: 0,
                msg: "re-valid exist user success."
              });
              return;
            }
          );
        }
      }
    }
  );

  if (result) {
    res.send(result);
    return;
  }

  //如果不存在,则读取
  var master = req.session.user;
  var level = req.param("level") || 1;

  var u = new UserModel({
    account: req.param("account"),
    name: req.param("name") || "",
    password: req.param("pass") || "",
    mail: req.param("mail") || "",
    role: level,
    phone: req.param("phone") || "",
    addr: req.param("addr") || "",
    company: req.param("company") || "",
    valid: 1,
    photo_path: req.param("photo_path") || "",
    user_status: true
  });

  u.save(async function (err) {
    if (err) {
      res.send({
        code: -1,
        msg: "save record failed." + err
      });
      return;
    }

    //保存成功,则将此用户更新到当前用户的管理之下
    await UserModel.update({
        account: master
      }, {
        $addToSet: {
          user_list: account
        }
      },
      async function (err) {
        if (err) {
          await UserModel.remove({
            account: account
          });
          res.send({
            code: -1,
            msg: "add user to master failed."
          });
          return;
        }
        //更新user_list
        if (req.session.info) {
          req.session.info.user_list.push(account);
        }
        res.send({
          code: 0,
          msg: "create user success."
        });
      }
    );
  });
};

//用户修改密码
exports.chgPassword = async function (req, res, next) {
  var curUser = req.session.user;
  var curInfo = req.session.info;
  if (!curUser || !curInfo) {
    res.send({
      code: -1,
      msg: "need login to unregister user."
    });
    return;
  }

  var oldPass = req.param("oldpass");
  var newPass1 = req.param("newpass1");
  var newPass2 = req.param("newpass2");

  //两次新密码一致检测
  if (newPass1 != newPass2) {
    res.send({
      code: -2,
      msg: "password2 not same to password1."
    });
    return;
  }

  //读取账户信息
  await UserModel.findOne({
      account: curUser
    },
    async function (err, doc) {
      if (err || !doc) {
        res.send({
          code: -1,
          msg: "user `" + curUser + "` not exist."
        });
        return;
      }

      //旧密码验证
      if (!doc.authenticate(oldPass)) {
        res.send({
          code: -3,
          msg: "old password is not valid."
        });
        return;
      }

      //更新模式新帐号密码
      doc.password = newPass1;

      await doc.save(
        function (err) {
          if (err) {
            res.send({
              code: -1,
              msg: "change password for user `" + curUser + "` failed."
            });
            return;
          }

          //注销当前已经登录用户信息
          //清理掉session.id,表示此用户无效
          req.session.user = null;
          req.session.info = null;

          res.send({
            code: 0,
            msg: "change password for user `" + curUser + "` success."
          });
        });
    });
};

//删除用户
exports.delUser = async function (req, res, next) {
  var account = req.param("account");
  if (!account) {
    res.send({
      code: -1,
      msg: "param `name` is null."
    });
    return;
  }
  var curUser = req.session.user;
  var curInfo = req.session.info;
  if (!curUser || !curInfo) {
    res.send({
      code: -1,
      msg: "need login to unregister user."
    });
    return;
  }

  var validDel = 0;
  var array = curInfo.user_list;
  for (let index = 0; index < array.length; index++) {
    if (array[index] == name) {
      validDel = 1;
      break;
    }
  }

  if (validDel != 1) {
    res.send({
      code: -1,
      msg: name + " cannot be deleted by you."
    });
    return;
  }

  await UserModel.findOne({
      account: account
    },
    async function (err, doc) {
      if (err || !doc) {
        res.send({
          code: 0,
          msg: "user `" + account + "` not exist."
        });
        return;
      }

      //更新用户列表,表示无效用户
      await UserModel.update({
          account: account
        }, {
          $set: {
            valid: 0
          }
        },
        function (err) {
          if (err) {
            res.send({
              code: -1,
              msg: "delete user `" + account + "` failed."
            });
            return;
          }

          res.send({
            code: 0,
            msg: "delete user `" + account + "` success."
          });
        }
      );
    }
  );
};

exports.NewRoot = function () {
  UserModel.findOne({
      account: "root"
    },
    function (err, data) {
      if (err || !data) {
        //创建一个默认的root用户,如果root用户不存在的话
        var u = new UserModel({
          account: "root",
          password: "root",
          name: "root",
          mail: "master@yizhimc.com",
          role: 9999,
          phone: "0",
          addr: "0",
          company: "0",
          valid: 1
        });
        u.save(function (err) {
          if (err) {
            //failed.
          } else {
            //success
          }
        });
      }
    }
  );
};