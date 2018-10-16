// import { request } from "https";

("use strict");

//设备API子路由

var express = require("express");
var router = express.Router();

//Device数据
var DeviceModel = require("../models/device");
var UserModel = require("../models/user");
var maintainModel = require("../models/maintain");
var thePermission = require("../config/exportPermissions").getPermissions;

//注册设备
router.post("/register", async function(req, res) {
  var curUser = req.session.user;
  var curInfo = req.session.info;
  var devCode = req.param("code");
  console.log(devCode)
  if (!devCode) {
    res.send({ code: -1, msg: "device code lost." });
    return;
  }
  var mai = new maintainModel({
    user_name: req.param("useUnit") || "",
    product_model: req.param("elevatorModel") || "",
    lift_load: req.param("ratedLoad") || "",
    device_id: req.param("code") || "",
    rate_speed: req.param("ratedSpeed") || "",
    door_model: req.param("doorLock") || "",
  })
  const dev = new DeviceModel({
    name: req.param("name") || "NA",
    useUnit: req.param("useUnit") || "NA",//使用单位名称
    code: devCode,//设备id
    addr: {       // 电梯地址
      area: req.param("area") || "",//区
      province: req.param("province") || "", //省
      city: req.param("city") || "", //市
      addr: req.param("addr") || "" //详细地址
    },
    registerID: req.param("registerID") || "",//注册代码
    useUnitID: req.param("useUnitID") || "",//使用单位编号
    productID: req.param("productID") || "",//产品编号
    makeUnit: req.param("makeUnit") || "",//制造单位
    real_time_status:0,//默认状态为正常
    send_message : 0,//默认是否发送消息为无
    installUnit: req.param("installUnit") || "",//安装单位
    repairUnit: req.param("repairUnit") || "",//改造、修理单位
    maintainUnit: req.param("maintainUnit") || "",//维保单位
    maintainPer: req.param("maintainPer") || "",//维保人
    maintainTel: req.param("maintainTel") || "",//维保电话
    elevatorModel: req.param("elevatorModel") || "",//电梯型号
    tractionMachineModel: req.param("tractionMachineModel") || "",//曳引机型号
    tractionMachine: { //曳引机数据
      num: req.param("num") || "",//数量
      diameter: req.param("diameter") || "",//直径
    },
    motorPower: req.param("motorPower") || "",//电机功率
    jing:req.param("jing"),
    wei:req.param("wei"),
    controlBox: req.param("controlBox") || "",//控制柜型号
    brakes: req.param("brakes") || "",//制动器型号
    speedLimiter: req.param("speedLimiter") || "",//限速器型号
    safetyGear: req.param("safetyGear") || "",//安全钳型号
    doorLock: req.param("doorLock") || "",//门锁型号
    ratedSpeed: req.param("ratedSpeed") || "",//额定速度
    ratedLoad: req.param("ratedLoad") || "",//额定载重
    layers: {
      floor: req.param("floor") || "",//层
      station: req.param("station") || "",//站
      door: req.param("door") || "",//门
    },
    start_date: req.param("start_date") || "", //启用时间
  });
  await dev.save(async function (err) {
    if (err) {
      res.send({
        code: -1,
        msg: "register device `" + code + "` failed."
      });
      return;
    }

    //保存成功,则继续将此电梯关联增加到当前用户列表下

    await UserModel.update(
      { account: curUser },
      {
        $addToSet: {
          dev_list: devCode
        }
      },
      function (err) {
        console.log(err)
        if (err) {
          //更新用户下设备列表失败
          dev.remove({ code: devCode });
          res.send({
            code: -1,
            msg:
            "assign device `" +
            devCode +
            "` to user `" +
            curUser +
            "` failed."
          });
          return;
        }


      }
    );
    //同时更新维保人员下设备列表
    await UserModel.update(
      {
        account:req.param("maintainPer")
      },
      {
        $addToSet:{
          dev_list:devCode
        }
      },
      function(err,doc){
        console.log(err,doc)
        if(err){
          //更新维保人员用户设备列表失败
          
          dev.remove({code:devCode});
          res.send({
            code: -1,
            msg:
            "assign device `" +
            devCode +
            "` to user `" +
            req.param("maintainPer") +
            "` failed."
          })
        };
        return;
      }
    )
  });
  await mai.save(async function (err) {
    if (err) {
      res.send({
        code: -1,
        msg: "device `" + code + "`maintain add failed"
      })
      return;
    }
    await DeviceModel.update(
      {
        code: devCode
      },
      {
        $addToSet: {
          maintain_data: devCode
        }
      },
      {
        upsert: true
      },
      //错误
      function (err) {
        if (err) {
          //更新用户下设备列表失败
          mai.remove({ device_id: devCode });
          res.send({
            code: -1,
            msg: "config maintain faild"
          });
          return;
        }
        
        
      })
    await UserModel.findOne({
        account: req.session.info.account
      },async function (err, doc){
        if(doc){
          req.session.info = doc
        }
      });
    //更新成功
    res.send({ code: 0, msg: "register device `" + req.param("name") + "`success." });
    return;
  })


});

//删除设备
router.post("/unregister", function (req, res, next) {
  var curUser = req.session.user;
  var curInfo = req.session.info;

  var devCode = req.param("code");
  if (!devCode) {
    res.send({ code: -1, msg: 'paramter `code` lost' });
    return;
  }
  var validDel = 0;
  var array = curInfo.dev_list;
  for (let index = 0; index < array.length; index++) {
    if (array[index] == devCode) {
      validDel = 1;
      break;
    }
  }

  if (validDel != 1) {
    res.send({ code: -1, msg: 'device `' + devCode + '` not belong to you, cannot be unregistered by you.' });
    return;
  }

  DeviceModel.remove({ code: devCode }, async function (err) {
    if (err) {
      res.send({ code: -1, msg: 'unregister device `' + devCode + '` failed: ' + err });
      return;
    }

    await UserModel.update(
      { name: curUser },
      {
        $unset: {
          dev_list: devCode
        }
      },
      function (err) {
        if (err) {
          //更新用户下设备列表失败
          DeviceModel.remove({ code: devCode });
          res.send({
            code: -1,
            msg:
            "assign device `" +
            devCode +
            "` to user `" +
            curUser +
            "` failed."
          });
          return;
        }
      });

    res.send({ code: -1, msg: 'unregister device success.' });
  })
});

//获取设备信息
router.get("/info", function (req, res, next) {
  var id = req.query.id;
  thePermission(req,res)
  if (!id) {
    res.send({
      code: -1,
      msg: "device id is not valid."
    });
    return;
  } else {
    DeviceModel.findOne(
      {
        code: id
      },
      function (err, obj) {
        if (err || !obj) {
          res.send({
            code: -1,
            msg: "dev: [" + id + "] is not found."
          });
          return;
        } else {
          res.send({
            code: 0,
            data: obj
          });
        }
      }
    );
  }
});
//获取所有设备位置信息
router.get("/locationinfo", function (req, res, next) {
  var reply = {
    code: -1,
    msg: ""
  }
  DeviceModel.find({}, async function (err, data) {
    if (err) {
      reply.msg = "find location faild";
      res.send(reply);
      return;
    }
    var location = [];
    for (var i = 0; i < data.length; i++) {
      var singleLocation = {
        "code": data[i].code,
        "area": data[i].addr.area,
        "province": data[i].addr.province,
        "city": data[i].addr.city,
        "addr": data[i].addr.addr
      }

      location.push(singleLocation)
    }
    reply.code = 0;
    reply.msg = "find location success";
    reply.data = location;
    res.send(reply)
  })
})
module.exports = router;
