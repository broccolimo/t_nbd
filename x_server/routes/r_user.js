"use strict";

//账户子路由

var express = require("express");
var router = express.Router();
var UserModel = require("../models/user");
var DeviceModel = require("../models/device");

//注册
router.post("/register", function (req, res, next) {
  UserModel.findOne({}, function (err, data) {
    var level = 1;
    if (err) {
      //初始化最高用户
      level = 8888;
    } else {
      level = req.param("level");
    }

    var ret = {
      code: -1,
      msg: "NA",
      level: level
    };

    var u = new UserModel({
      account:req.param("account") || "",
      name: req.param("name") || "",
      password: req.param("pass") || "",
      mail: req.param("mail") || "",
      role: level,
      phone: req.param("phone") || "",
      addr: req.param("addr") || "",
      company: req.param("company") || ""
    });

    u.save(function (err) {
      if (err) {
        ret.msg = "save record failed." + err;
        res.write(ret);
        return;
      }

      ret.code = 0;
      res.write(ret);
    });
  });
});

//登录用户基本信息
router.get("/baseinfo", function (req, res, next) {
  var reply = {
    code: -1,
    msg: "get userinfo faild"
  }
  var obj = req.session.info;
  if (obj) {
    reply.code = 0;
    reply.msg = "get userinfo success";
    reply.obj = obj;
    res.send(reply)
  }

});


//获取用户基本信息
router.post("/getuserinfo",function(req,res,next){
  var reply = {
    code:-1,
    msg:"get user info faild"
  }
  var account = req.param("account");
  UserModel.findOne({account:account},function(err,data){
    //console.log(data,err)
    if(err){
      res.send(reply);
      return;
    }
    reply.code = 0;
    reply.msg = "get userinfo success";
    reply.data = data;
    res.send(reply)
  })
})

//手机上用的
router.get("/getUserInfo",function(req,res,next){
  var reply = {
    code: -1,
    msg: "fail to get user info"
  }
  var account = req.param("account");
  UserModel.findOne({account:account},function(err, result){
    if(err){
      res.send(reply);
      return;
    }
    reply.code = 0;
    reply.msg = "get userinfo success";
    reply.obj = result;
    res.send(reply);
  })
})

//电梯列表
router.get("/devicelist", async function (req, res, next) {
  var reply = {
    code: -1,
    msg: "get liftlist faild"
  }
  var deviceList = [];
  var obj = req.session.info.dev_list;
  var lastUserList = req.session.info.user_list;
  var isReturn = false;
  for (let i in obj) {
    let singleData = await DeviceModel.find({ code: obj[i] })
    deviceList.push(singleData[0])
  }
  // async function getList(thisName) {
  //   let thisUser = await UserModel.findOne({ name: thisName });
  //   if (thisUser.dev_list.length != 0) {
  //     for (var j = 0; j < thisUser.dev_list.length; j++) {
  //       // var thisId = thisUser[0].dev_list[j].id["readIntBE"](0, 6).toString(16) + thisUser[0].dev_list[j].id["readIntBE"](6, 6).toString(16);
  //       thisId = thisUser.dev_list[j]
  //       deviceList.push(thisId);
  //     }
  //   }
  //   if(thisUser.user_list.length == 0){
  //     return;
  //   }
  //   for(var k = 0; k < thisUser.user_list.length; k++){
  //     getList(thisUser.user_list[k]);
  //   }
  //   console.log(2.1,devicelist)
  // }
  // console.log(3,devicelist)
  // for (var i = 0; i < lastUserList.length; i++) {
  //   getList(lastUserList[i])
  // }
  reply.code = 0;
  reply.msg = 'get liftlist success'
  reply.data = deviceList
  res.send(reply)
})
module.exports = router;
