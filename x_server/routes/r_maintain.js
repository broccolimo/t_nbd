("use strict");

//设备API子路由

var express = require("express");
var formidable = require("formidable");
var fs = require("fs")
var router = express.Router();


//alert数据
var HalfMonthMaintain = require("../models/maintainConfig").halfMonthMaintain;
var QuarterlyMaintain = require("../models/maintainConfig").quarterlyMaintain;
var HalfYearMaintain = require("../models/maintainConfig").halfYearMaintain;
var YearMaintain = require("../models/maintainConfig").yearMaintain;
var Maintain = require("../models/maintain");
var DeviceModel = require("../models/device");
var UserModel = require("../models/user");
var thePermission = require("../config/exportPermissions").getPermissions;

//图片上传
router.post("/uploadPhoto", async function (req, res, next){
  var form = new formidable.IncomingForm;
  form.uploadDir = "public/upload/";
  form.parse(req, function(err, fields, files){
    if(err){
      res.send({
        code:-1,
        msg:"photo upload faild"
      })
      return;
    }else{
      var item = files["photo"];
      var newPath = form.uploadDir + item.name + "." + item.type.split("/")[1];
      console.log("111: " + newPath);
      fs.renameSync(item.path, newPath);
      res.send({
        code:0,
        msg:"photo upload success"
      });
    }
  });
  
});

//图片加载
router.post("/loadPhoto", function(req, res, next){
  var reply = {
    code:-1,
    data:"",
    msg:"faild"
  };

  if(req.body.photoUrl){
    var bData =  fs.readFileSync(req.body.photoUrl);
    var base64str = bData.toString("base64");
    reply.data = base64str;
    reply.code = 0;
    reply.msg = "success!"
  }
  res.send(reply);
});

//维保配置
router.post("/maintainconfig", async function (req, res, next) {

  var theType;
  var form = new formidable.IncomingForm();
  form.encoding = 'utf-8';
  form.uploadDir = 'public/upload/';
  form.keepExtensions = true;
  form.maxFieldSize = 2 * 1024 * 1024;
  form.parse(req, function (err, fields, files) {
    if (err) {
      console.log('文件上传错误！')
      return;
    }
    theType = fields.theType;
    var pathObj = {};
    for (var x in files) {
      var typeArr = files[x].type.split("/")
      var type = typeArr[typeArr.length - 1];
      var date = new Date();
      var time = '-' + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "_" + date.getHours() + "-" + date.getMinutes();
      var newName = files[x].name + time + "." + type;
      var newPath = form.uploadDir + newName;
      var thisName = files[x].name;

      pathObj[thisName] = newPath.split("public")[1]
      fs.renameSync(files[x].path, newPath);
    }

    analyticalData(fields, pathObj);

  })
  function analyticalData(fields, pathObj) {
    var dateYear = new Date(fields.startDate).getFullYear();
    var dateMonth = (new Date(fields.startDate).getMonth() + 1);
    if (dateMonth < 10) {
      dateMonth = "0" + dateMonth;
    }
    var dateDay = new Date(fields.startDate).getDate();
    if (dateDay < 10) {
      dateDay = "0" + dateDay
    }
    var theDate = dateYear + dateMonth + dateDay;
    switch (theType) {
      case "liftHalfMonth":

        const halfMonthMaintainModel = new HalfMonthMaintain({
          liftId: fields.liftId,
          auditStatus: "1",
          maintain_id: fields.liftId + theDate,
          startDate: fields.startDate,
          maintainContent: {
            num1: {
              isChooseNormal: fields.num - 1 - 1,
              useTime: fields.num - 1 - 3,
              adjustmentTimes: fields.num - 1 - 4,
              imagePath: pathObj["num1"] || ""
            },
            num2: {
              isChooseNormal: fields.num - 2 - 1,
              useTime: fields.num - 2 - 3,
              adjustmentTimes: fields.num - 2 - 4,
              imagePath: pathObj["num2"] || ""
            },
            num3: {
              isChooseNormal: fields.num - 3 - 1,
              useTime: fields.num - 3 - 3,
              adjustmentTimes: fields.num - 3 - 4,
              imagePath: pathObj["num3"] || ""
            },
            num4: {
              isChooseNormal: fields.num - 4 - 1,
              useTime: fields.num - 4 - 3,
              adjustmentTimes: fields.num - 4 - 4,
              imagePath: pathObj["num4"] || ""
            },
            num5: {
              isChooseNormal: fields.num - 5 - 1,
              useTime: fields.num - 5 - 3,
              adjustmentTimes: fields.num - 5 - 4,
              imagePath: pathObj["num5"] || ""
            },
            num6: {
              isChooseNormal: fields.num - 6 - 1,
              useTime: fields.num - 6 - 3,
              adjustmentTimes: fields.num - 6 - 4,
              imagePath: pathObj["num6"] || ""
            },
            num7: {
              isChooseNormal: fields.num - 7 - 1,
              useTime: fields.num - 7 - 3,
              adjustmentTimes: fields.num - 7 - 4,
              imagePath: pathObj["num7"] || ""
            },
            num8: {
              isChooseNormal: fields.num - 8 - 1,
              useTime: fields.num - 8 - 3,
              adjustmentTimes: fields.num - 8 - 4,
              imagePath: pathObj["num8"] || ""
            },
            num9: {
              isChooseNormal: fields.num - 9 - 1,
              useTime: fields.num - 9 - 3,
              adjustmentTimes: fields.num - 9 - 4,
              imagePath: pathObj["num9"] || ""
            },
            num10: {
              isChooseNormal: fields.num - 10 - 1,
              useTime: fields.num - 10 - 3,
              adjustmentTimes: fields.num - 10 - 4,
              imagePath: pathObj["num10"] || ""
            },
            num11: {
              isChooseNormal: fields.num - 11 - 1,
              useTime: fields.num - 11 - 3,
              adjustmentTimes: fields.num - 11 - 4,
              imagePath: pathObj["num11"] || ""
            },
            num12: {
              isChooseNormal: fields.num - 12 - 1,
              useTime: fields.num - 12 - 3,
              adjustmentTimes: fields.num - 12 - 4,
              imagePath: pathObj["num12"] || ""
            },
            num13: {
              isChooseNormal: fields.num - 13 - 1,
              useTime: fields.num - 13 - 3,
              adjustmentTimes: fields.num - 13 - 4,
              imagePath: pathObj["num13"] || ""
            },
            num14: {
              isChooseNormal: fields.num - 14 - 1,
              useTime: fields.num - 14 - 3,
              adjustmentTimes: fields.num - 14 - 4,
              imagePath: pathObj["num14"] || ""
            },
            num15: {
              isChooseNormal: fields.num - 15 - 1,
              useTime: fields.num - 15 - 3,
              adjustmentTimes: fields.num - 15 - 4,
              imagePath: pathObj["num15"] || ""
            },
            num16: {
              isChooseNormal: fields.num - 16 - 1,
              useTime: fields.num - 16 - 3,
              adjustmentTimes: fields.num - 16 - 4,
              imagePath: pathObj["num16"] || ""
            },
            num17: {
              isChooseNormal: fields.num - 17 - 1,
              useTime: fields.num - 17 - 3,
              adjustmentTimes: fields.num - 17 - 4,
              imagePath: pathObj["num17"] || ""
            },
            num18: {
              isChooseNormal: fields.num - 18 - 1,
              useTime: fields.num - 18 - 3,
              adjustmentTimes: fields.num - 18 - 4,
              imagePath: pathObj["num18"] || ""
            },
            num19: {
              isChooseNormal: fields.num - 19 - 1,
              useTime: fields.num - 19 - 3,
              adjustmentTimes: fields.num - 19 - 4,
              imagePath: pathObj["num19"] || ""
            },
            num20: {
              isChooseNormal: fields.num - 20 - 1,
              useTime: fields.num - 20 - 3,
              adjustmentTimes: fields.num - 20 - 4,
              imagePath: pathObj["num20"] || ""
            },
            num21: {
              isChooseNormal: fields.num - 21 - 1,
              useTime: fields.num - 21 - 3,
              adjustmentTimes: fields.num - 21 - 4,
              imagePath: pathObj["num21"] || ""
            },
            num22: {
              isChooseNormal: fields.num - 22 - 1,
              useTime: fields.num - 22 - 3,
              adjustmentTimes: fields.num - 22 - 4,
              imagePath: pathObj["num22"] || ""
            },
            num23: {
              isChooseNormal: fields.num - 23 - 1,
              useTime: fields.num - 23 - 3,
              adjustmentTimes: fields.num - 23 - 4,
              imagePath: pathObj["num23"] || ""
            },
            num24: {
              isChooseNormal: fields.num - 24 - 1,
              useTime: fields.num - 24 - 3,
              adjustmentTimes: fields.num - 24 - 4,
              imagePath: pathObj["num24"] || ""
            },
            num25: {
              isChooseNormal: fields.num - 25 - 1,
              useTime: fields.num - 25 - 3,
              adjustmentTimes: fields.num - 25 - 4,
              imagePath: pathObj["num25"] || ""
            },
            num26: {
              isChooseNormal: fields.num - 26 - 1,
              useTime: fields.num - 26 - 3,
              adjustmentTimes: fields.num - 26 - 4,
              imagePath: pathObj["num26"] || ""
            },
            num27: {
              isChooseNormal: fields.num - 27 - 1,
              useTime: fields.num - 27 - 3,
              adjustmentTimes: fields.num - 27 - 4,
              imagePath: pathObj["num27"] || ""
            },
            num28: {
              isChooseNormal: fields.num - 28 - 1,
              useTime: fields.num - 28 - 3,
              adjustmentTimes: fields.num - 28 - 4,
              imagePath: pathObj["num28"] || ""
            },
            num29: {
              isChooseNormal: fields.num - 29 - 1,
              useTime: fields.num - 29 - 3,
              adjustmentTimes: fields.num - 29 - 4,
              imagePath: pathObj["num29"] || ""
            },
            num30: {
              isChooseNormal: fields.num - 30 - 1,
              useTime: fields.num - 30 - 3,
              adjustmentTimes: fields.num - 30 - 4,
              imagePath: pathObj["num30"] || ""
            },
            num31: {
              isChooseNormal: fields.num - 31 - 1,
              useTime: fields.num - 31 - 3,
              adjustmentTimes: fields.num - 31 - 4,
              imagePath: pathObj["num31"] || ""
            },
            num32: {
              isChooseNormal: fields.num - 32 - 1,
              useTime: fields.num - 32 - 3,
              adjustmentTimes: fields.num - 32 - 4,
              imagePath: pathObj["num32"] || ""
            }

          }
        })

        halfMonthMaintainModel.save(async function (err) {
          if (err) {
            res.send({
              code: -1,
              msg: "save halfMonthMaintainModel failed." + err
            });
            return;
          }
          //保存成功，更新对应设备的内容
          await DeviceModel.update(
            {
              code: fields.liftId
            },
            {
              $addToSet: {
                half_month_maintain: halfMonthMaintainModel
              }
            },
            {
              upsert: true
            },
            //错误
            function (err) {
              if (err) {
                //更新用户下设备列表失败
                halfMonthMaintainModel.remove({ code: fields.liftId });
                res.send({
                  code: -1,
                  msg: "config maintain faild"
                });
                return;
              }
            },
          );
          //更新对应维保内容
          await Maintain.update(
            {
              device_id: fields.liftId,

            },
            {
              half_month_start_time: new Date(fields.startDate),
              half_month_next_time: new Date(new Date(fields.startDate).getTime() + 15 * 24 * 60 * 60 * 1000),
              $addToSet: {
                maintain_number: {
                  maintain_type: "half_month",
                  maintain_id: fields.liftId + new Date(fields.startDate).getFullYear() + (new Date(fields.startDate).getMonth() + 1) + new Date(fields.startDate).getDay(),
                  user_id: "man",
                  time: fields.startDate
                }
              }
            },
            function (err, result) {
              if (err) {
                res.send({
                  code: -1,
                  msg: "update message failds"
                })
                return;
              }
              res.send({
                code: 0,
                msg: "update message success!"
              })
            }
          )
        })
        break;
      case "quarterly":

        const quarterlyMaintainModel = new QuarterlyMaintain({
          liftId: fields.liftId,
          auditStatus: "1",
          maintain_id: fields.liftId + theDate,
          startDate: fields.startDate,
          maintainContent: {
            num1: {
              isChooseNormal: fields.num - 1 - 1,
              useTime: fields.num - 1 - 3,
              adjustmentTimes: fields.num - 1 - 4,
              imagePath: pathObj["num1"] || ""
            },
            num2: {
              isChooseNormal: fields.num - 2 - 1,
              useTime: fields.num - 2 - 3,
              adjustmentTimes: fields.num - 2 - 4,
              imagePath: pathObj["num2"] || ""
            },
            num3: {
              isChooseNormal: fields.num - 3 - 1,
              useTime: fields.num - 3 - 3,
              adjustmentTimes: fields.num - 3 - 4,
              imagePath: pathObj["num3"] || ""
            },
            num4: {
              isChooseNormal: fields.num - 4 - 1,
              useTime: fields.num - 4 - 3,
              adjustmentTimes: fields.num - 4 - 4,
              imagePath: pathObj["num4"] || ""
            },
            num5: {
              isChooseNormal: fields.num - 5 - 1,
              useTime: fields.num - 5 - 3,
              adjustmentTimes: fields.num - 5 - 4,
              imagePath: pathObj["num5"] || ""
            },
            num6: {
              isChooseNormal: fields.num - 6 - 1,
              useTime: fields.num - 6 - 3,
              adjustmentTimes: fields.num - 6 - 4,
              imagePath: pathObj["num6"] || ""
            },
            num7: {
              isChooseNormal: fields.num - 7 - 1,
              useTime: fields.num - 7 - 3,
              adjustmentTimes: fields.num - 7 - 4,
              imagePath: pathObj["num7"] || ""
            },
            num8: {
              isChooseNormal: fields.num - 8 - 1,
              useTime: fields.num - 8 - 3,
              adjustmentTimes: fields.num - 8 - 4,
              imagePath: pathObj["num8"] || ""
            },
            num9: {
              isChooseNormal: fields.num - 9 - 1,
              useTime: fields.num - 9 - 3,
              adjustmentTimes: fields.num - 9 - 4,
              imagePath: pathObj["num9"] || ""
            },
            num10: {
              isChooseNormal: fields.num - 10 - 1,
              useTime: fields.num - 10 - 3,
              adjustmentTimes: fields.num - 10 - 4,
              imagePath: pathObj["num10"] || ""
            },
            num11: {
              isChooseNormal: fields.num - 11 - 1,
              useTime: fields.num - 11 - 3,
              adjustmentTimes: fields.num - 11 - 4,
              imagePath: pathObj["num11"] || ""
            },
            num12: {
              isChooseNormal: fields.num - 12 - 1,
              useTime: fields.num - 12 - 3,
              adjustmentTimes: fields.num - 12 - 4,
              imagePath: pathObj["num12"] || ""
            },
            num13: {
              isChooseNormal: fields.num - 13 - 1,
              useTime: fields.num - 13 - 3,
              adjustmentTimes: fields.num - 13 - 4,
              imagePath: pathObj["num13"] || ""
            }
          }
        })
        quarterlyMaintainModel.save(async function (err) {
          if (err) {
            res.send({
              code: -1,
              msg: "save quarterlyMaintain failed." + err
            });
            return;
          }
          //保存成功，更新对应设备的内容
          await DeviceModel.update(
            {
              code: fields.liftId
            },
            {
              $addToSet: {
                quarterly_maintain: quarterlyMaintainModel
              }
            },
            {
              upsert: true
            },
            //错误
            function (err) {
              if (err) {
                //更新用户下设备列表失败
                quarterlyMaintainModel.remove({ code: fields.liftId });
                res.send({
                  code: -1,
                  msg: "config maintain faild"
                });
                return;
              }
            },
          );
          //更新对应维保内容
          await Maintain.update(
            {
              device_id: fields.liftId
            },
            {
              quarterly_time: new Date(fields.startDate),
              quarterly_next_time: new Date(new Date(fields.startDate).getTime() + 90 * 24 * 60 * 60 * 1000)
            },
            function (err, result) {
              if (err) {
                res.send({
                  code: -1,
                  msg: "update message failds"
                })
                return;
              }
              res.send({
                code: 0,
                msg: "update message success!"
              })
            }
          )
        })
        break;
      case "halfYear":
        const halfYearMaintainModel = new HalfYearMaintain({
          liftId: fields.liftId,
          auditStatus: "1",
          maintain_id: fields.liftId + theDate,
          startDate: fields.startDate,
          maintainContent: {
            num1: {
              isChooseNormal: fields.num - 1 - 1,
              useTime: fields.num - 1 - 3,
              adjustmentTimes: fields.num - 1 - 4,
              imagePath: pathObj["num1"] || ""
            },
            num2: {
              isChooseNormal: fields.num - 2 - 1,
              useTime: fields.num - 2 - 3,
              adjustmentTimes: fields.num - 2 - 4,
              imagePath: pathObj["num2"] || ""
            },
            num3: {
              isChooseNormal: fields.num - 3 - 1,
              useTime: fields.num - 3 - 3,
              adjustmentTimes: fields.num - 3 - 4,
              imagePath: pathObj["num3"] || ""
            },
            num4: {
              isChooseNormal: fields.num - 4 - 1,
              useTime: fields.num - 4 - 3,
              adjustmentTimes: fields.num - 4 - 4,
              imagePath: pathObj["num4"] || ""
            },
            num5: {
              isChooseNormal: fields.num - 5 - 1,
              useTime: fields.num - 5 - 3,
              adjustmentTimes: fields.num - 5 - 4,
              imagePath: pathObj["num5"] || ""
            },
            num6: {
              isChooseNormal: fields.num - 6 - 1,
              useTime: fields.num - 6 - 3,
              adjustmentTimes: fields.num - 6 - 4,
              imagePath: pathObj["num6"] || ""
            },
            num7: {
              isChooseNormal: fields.num - 7 - 1,
              useTime: fields.num - 7 - 3,
              adjustmentTimes: fields.num - 7 - 4,
              imagePath: pathObj["num7"] || ""
            },
            num8: {
              isChooseNormal: fields.num - 8 - 1,
              useTime: fields.num - 8 - 3,
              adjustmentTimes: fields.num - 8 - 4,
              imagePath: pathObj["num8"] || ""
            },
            num9: {
              isChooseNormal: fields.num - 9 - 1,
              useTime: fields.num - 9 - 3,
              adjustmentTimes: fields.num - 9 - 4,
              imagePath: pathObj["num9"] || ""
            },
            num10: {
              isChooseNormal: fields.num - 10 - 1,
              useTime: fields.num - 10 - 3,
              adjustmentTimes: fields.num - 10 - 4,
              imagePath: pathObj["num10"] || ""
            },
            num11: {
              isChooseNormal: fields.num - 11 - 1,
              useTime: fields.num - 11 - 3,
              adjustmentTimes: fields.num - 11 - 4,
              imagePath: pathObj["num11"] || ""
            },
            num12: {
              isChooseNormal: fields.num - 12 - 1,
              useTime: fields.num - 12 - 3,
              adjustmentTimes: fields.num - 12 - 4,
              imagePath: pathObj["num12"] || ""
            },
            num13: {
              isChooseNormal: fields.num - 13 - 1,
              useTime: fields.num - 13 - 3,
              adjustmentTimes: fields.num - 13 - 4,
              imagePath: pathObj["num13"] || ""
            },
            num14: {
              isChooseNormal: fields.num - 14 - 1,
              useTime: fields.num - 14 - 3,
              adjustmentTimes: fields.num - 14 - 4,
              imagePath: pathObj["num14"] || ""
            },
            num15: {
              isChooseNormal: fields.num - 15 - 1,
              useTime: fields.num - 15 - 3,
              adjustmentTimes: fields.num - 15 - 4,
              imagePath: pathObj["num15"] || ""
            }
          }
        })
        halfYearMaintainModel.save(async function (err) {
          if (err) {
            res.send({
              code: -1,
              msg: "save halfYearMaintain failed." + err
            });
            return;
          }
          //保存成功，更新对应设备的内容
          await DeviceModel.update(
            {
              code: fields.liftId
            },
            {
              $addToSet: {
                half_year_maintain: halfYearMaintainModel
              }
            },
            {
              upsert: true
            },
            //错误
            function (err) {
              if (err) {
                //更新用户下设备列表失败
                halfYearMaintainModel.remove({ code: fields.liftId });
                res.send({
                  code: -1,
                  msg: "config maintain faild"
                });
                return;
              }

            },
          );
          //更新对应维保内容
          await Maintain.update(
            {
              device_id: fields.liftId
            },
            {
              half_year_time: new Date(fields.startDate),
              half_year_next_time: new Date(new Date(fields.startDate).getTime() + 180 * 24 * 60 * 60 * 1000)
            },
            function (err, result) {
              if (err) {
                res.send({
                  code: -1,
                  msg: "update message failds"
                })
                return;
              }
              res.send({
                code: 0,
                msg: "update message success!"
              })
            }
          )
        })
        break;
      case "year":
        const yearMaintainModel = new YearMaintain({
          liftId: fields.liftId,
          auditStatus: "1",
          maintain_id: fields.liftId + theDate,
          startDate: fields.startDate,
          maintainContent: {
            num1: {
              isChooseNormal: fields.num - 1 - 1,
              useTime: fields.num - 1 - 3,
              adjustmentTimes: fields.num - 1 - 4,
              imagePath: pathObj["num1"] || ""
            },
            num2: {
              isChooseNormal: fields.num - 2 - 1,
              useTime: fields.num - 2 - 3,
              adjustmentTimes: fields.num - 2 - 4,
              imagePath: pathObj["num2"] || ""
            },
            num3: {
              isChooseNormal: fields.num - 3 - 1,
              useTime: fields.num - 3 - 3,
              adjustmentTimes: fields.num - 3 - 4,
              imagePath: pathObj["num3"] || ""
            },
            num4: {
              isChooseNormal: fields.num - 4 - 1,
              useTime: fields.num - 4 - 3,
              adjustmentTimes: fields.num - 4 - 4,
              imagePath: pathObj["num4"] || ""
            },
            num5: {
              isChooseNormal: fields.num - 5 - 1,
              useTime: fields.num - 5 - 3,
              adjustmentTimes: fields.num - 5 - 4,
              imagePath: pathObj["num5"] || "",
              number: fields.num - 5 - 5,
              maximum: fields.num5Max,
              minimum: fields.num5Min,
              step: fields.num5Step
            },
            num6: {
              isChooseNormal: fields.num - 6 - 1,
              useTime: fields.num - 6 - 3,
              adjustmentTimes: fields.num - 6 - 4,
              imagePath: pathObj["num6"] || ""
            },
            num7: {
              isChooseNormal: fields.num - 7 - 1,
              useTime: fields.num - 7 - 3,
              adjustmentTimes: fields.num - 7 - 4,
              imagePath: pathObj["num7"] || ""
            },
            num8: {
              isChooseNormal: fields.num - 8 - 1,
              useTime: fields.num - 8 - 3,
              adjustmentTimes: fields.num - 8 - 4,
              imagePath: pathObj["num8"] || ""
            },
            num9: {
              isChooseNormal: fields.num - 9 - 1,
              useTime: fields.num - 9 - 3,
              adjustmentTimes: fields.num - 9 - 4,
              imagePath: pathObj["num9"] || ""
            },
            num10: {
              isChooseNormal: fields.num - 10 - 1,
              useTime: fields.num - 10 - 3,
              adjustmentTimes: fields.num - 10 - 4,
              imagePath: pathObj["num10"] || ""
            },
            num11: {
              isChooseNormal: fields.num - 11 - 1,
              useTime: fields.num - 11 - 3,
              adjustmentTimes: fields.num - 11 - 4,
              imagePath: pathObj["num11"] || ""
            },
            num12: {
              isChooseNormal: fields.num - 12 - 1,
              useTime: fields.num - 12 - 3,
              adjustmentTimes: fields.num - 12 - 4,
              imagePath: pathObj["num12"] || ""
            },
            num13: {
              isChooseNormal: fields.num - 13 - 1,
              useTime: fields.num - 13 - 3,
              adjustmentTimes: fields.num - 13 - 4,
              imagePath: pathObj["num13"] || ""
            },
            num14: {
              isChooseNormal: fields.num - 14 - 1,
              useTime: fields.num - 14 - 3,
              adjustmentTimes: fields.num - 14 - 4,
              imagePath: pathObj["num14"] || ""
            },
            num15: {
              isChooseNormal: fields.num - 15 - 1,
              useTime: fields.num - 15 - 3,
              adjustmentTimes: fields.num - 15 - 4,
              imagePath: pathObj["num15"] || ""
            },
            num16: {
              isChooseNormal: fields.num - 16 - 1,
              useTime: fields.num - 16 - 3,
              adjustmentTimes: fields.num - 16 - 4,
              imagePath: pathObj["num16"] || ""
            },
            num17: {
              isChooseNormal: fields.num - 17 - 1,
              useTime: fields.num - 17 - 3,
              adjustmentTimes: fields.num - 17 - 4,
              imagePath: pathObj["num17"] || ""
            }
          }
        })
        yearMaintainModel.save(async function (err) {
          if (err) {
            res.send({
              code: -1,
              msg: "save yearMaintain failed." + err
            });
            return;
          }
          //保存成功，更新对应设备的内容
          await DeviceModel.update(
            {
              code: fields.liftId
            },
            {
              $addToSet: {
                year_maintain: yearMaintainModel
              }
            },
            {
              upsert: true
            },
            //错误
            function (err) {
              if (err) {
                //更新用户下设备列表失败
                yearMaintainModel.remove({ code: fields.liftId });
                res.send({
                  code: -1,
                  msg: "config maintain faild"
                });
                return;
              }
            },
          );
          //更新对应维保内容
          await Maintain.update(
            {
              device_id: fields.liftId
            },
            {
              year_time: new Date(fields.startDate),
              year_next_time: new Date(new Date(fields.startDate).getTime() + 365 * 24 * 60 * 60 * 1000)
            },
            function (err, result) {
              if (err) {
                res.send({
                  code: -1,
                  msg: "update message failds"
                })
                return;
              }
              res.send({
                code: 0,
                msg: "update message success!"
              })
            }
          )
        })
        break;
    }

  }

})

//获取维保信息
router.get("/maintainmessage", async function (req, res, next) {
  // var theLevel = thePermission(req,res);
  // if(theLevel != 2){
  //   res.send({
  //     code:-2,
  //     msg:"Insufficient permissions!"
  //   })
  //   return;
  // }
  var reply = {
    code: -1,
    msg: "get message faild"
  }
  //   var obj = req.session.info.dev_list;
  //   var msgList = [];
  //   for(let i in obj){
  //    let singleData = await Maintain.find({device_id:obj[i]})
  //    msgList.push(singleData[0])
  //  }

  //  //按照objectid进行查找
  // //  HalfMonthMaintain.find({_id:require("mongoose").Types.ObjectId("5a41fa61923c5107f4804d33")},function(err,result){
  // //    console.log(err)
  // //    console.log(result)
  // //  })
  //  console.log(msgList)
  //  reply.code = 0;
  //  reply.msg = 'get maintain_message success'
  //  reply.data = msgList
  //  res.send(reply)
  var maintainId = req.param("maintainId");
  var type = req.param("type");
  var liftId = req.param("liftId");
  switch (type) {
    case "halfMon":
      HalfMonthMaintain.find({ liftId: liftId, maintain_id: maintainId }, function (err, obj) {
        if (err) {
          res.send(reply);
          return;
        }
        reply.code = 0;
        reply.msg = "get message success!";
        reply.data = obj;
        res.send(reply);
      })
      break;
    case "quarterly":
      QuarterlyMaintain.find({ liftId: liftId, maintain_id: maintainId }, function (err, obj) {
        if (err) {
          res.send(reply);
          return;
        }
        reply.code = 0;
        reply.msg = "get message success!";
        reply.data = obj;
        res.send(reply);
      })
      break;
  }
})
router.get("/maintainlist", async function (req, res, next) {
  // var theLevel = thePermission(req,res);
  // if(theLevel != 2){
  //   res.send({
  //     code:-2,
  //     msg:"Insufficient permissions!"
  //   })
  //   return;
  // }
  var mainstatus = req.param("mainstatus");
  var maintainType = req.param("maintaintype");
  var liftId = req.param("liftId");
  var reply = {
    code: -1,
    msg: "get list faild"
  }
  console.log(mainstatus,maintainType)
  if (!mainstatus || !maintainType) {
    res.send(reply);
  }
  var searchObj = {};
  if(!(liftId == "all" || liftId === undefined)){
    searchObj.liftId = liftId;
  }
  if(mainstatus != "4"){
    searchObj.auditStatus = mainstatus
  }
  var replyObj  = {}
  switch (maintainType) {
    case "halfMon":
      HalfMonthMaintain.find(searchObj, async function (err, obj) {
        if (err) {
          res.send(reply);
          return;
        }
        replyObj = {
          "halfMon":obj
        }
        reply.data = replyObj;
        reply.code = 0;
        reply.msg = "get list success!";
        res.send(reply);
      })
      break;
    case "quarterly":
      quarterlyMaintain.find(searchObj, async function (err, obj) {
        if (err) {
          res.send(reply);
          return;
        } 
        replyObj = {
          "quart":obj
        }
        reply.data = replyObj;
        reply.code = 0;
        reply.msg = "get list success!";
        res.send(reply);
      })
      break;
    case "halfYear":
      halfYearMaintain.find(searchObj, async function (err, obj) {
        if (err) {
          res.send(reply);
          return;
        }
        replyObj = {
          "halfYear":obj
        }
        reply.data = replyObj;
        reply.code = 0;
        reply.msg = "get list success!";
        console.log(reply)
        res.send(reply);
      })
      break;
    case "year":
      yearMaintain.find(searchObj, async function (err, obj) {
        if (err) {
          res.send(reply);
          return;
        }
        replyObj = {
          "year":obj
        }
        reply.data = replyObj;
        reply.code = 0;
        reply.msg = "get list success!";
        res.send(reply);
      })
      break;
    case "all":
      var halfMon = await HalfMonthMaintain.find(searchObj);
      var quart = await QuarterlyMaintain.find(searchObj);
      var halfYear = await HalfYearMaintain.find(searchObj);
      var year = await YearMaintain.find(searchObj);
      reply.code = 0;
      var replyObj = {
        "halfMon":halfMon,
        "quart":quart,
        "halfYear":halfYear,
        "year":year
      }
      reply.data = replyObj;
      reply.msg = "get list success!";
      res.send(reply)
    break;
  }

})


module.exports = router;

