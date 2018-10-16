("use strict");

//设备API子路由

var express = require("express");
var router = express.Router();


//alert数据
var AlertConfigModel = require("../models/alert").AlertConfig;
var AlertEvent = require("../models/alert").AlertEvent;
var Goverment = require("../models/alert").Goverment;
var DeviceModel = require("../models/device");
var UserModel = require("../models/user");


//警报类型
router.post("/alertclass", function (req, res, next) {
  const AlertModel = new AlertConfigModel({
    user_name: req.param("userName") || "",//客户名称
    product_model: req.param("productModel") || "",//产品型号
    device_id: req.param("deviceCode") || "", //电梯id
    class: req.param("class") || "", //警报类型
    level: req.param("level") || "", //警报级别
    event: req.param("event") || "", //警报事件
  });
  AlertModel.save(async function (err) {
    if (err) {
      res.send({
        code: -1,
        msg: "save alertmodel failed." + err
      });
      return;
    }
  })
  var code = req.param("code");
  DeviceModel.update({
    code: code
  },
    {
      $set: {
        alert_data: AlertModel
      }
    },
    function (err) {
      if (err) {
        res.send({
          code: -1,
          msg: "send " + code + " alert class faild!"
        });
        return;
      }

      res.send({
        code: 0,
        msg: "send " + code + " alert class success!"
      });
    })
})
router.post("/govermentSubmit", async (req, res) => {
  const GovermentModel = new Goverment({
    liftCode: req.param("liftCode") || '',
    Identifier: req.param("Identifier") || '',
    date: req.param("date") || '',
    isNormal: req.param("isNormal") || '',
    door: req.param("door") || '',
    trapped: req.param("trapped") || '',
    runMode: req.param("runMode") || '',
    floor: req.param("floor") || '',
    speed: req.param("speed") || '',
    falutCode: req.param("falutCode") || '',
  });
  const reply = {
    code: -1,
    message: '',
  }
  console.log(GovermentModel)
  await GovermentModel.save(async (err) => {
    if (err) {
      reply.message = 'save faild';
      res.send(reply);
      return
    }
    reply.message = 'save success';
    reply.code = 0;
    res.send(reply);
  })
})


module.exports = router;