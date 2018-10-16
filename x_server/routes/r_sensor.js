"use strict";

// 传感器API子路由

var express = require("express");
var router = express.Router();
//redis
var redis = require("../config/redis");

//Device数据
var Dev = require("../models/device");

//电梯数据
var DT_Data = require("../models/dt_data.js");
function queryData(req, res, prefix) {
  var id = req.query.id;
  var reply = {
    code: -1,
    msg: "unknown error"
  };
  if (!id) {
    res.send(reply);
    return;
  }
  redis.query(prefix + ":" + id, function(err, obj) {
    if (err || !obj) {
      reply.msg = "NOT found record " + prefix + ":" + id;
      res.send(reply);
      return;
    } else {
      if (process.env.NODE_ENV != "production") {
        
      }
      reply = {
        code: 0,
        msg: "OK",
        data: obj
      };
      res.send(reply);
    }
  });
}

function historyData(req, res, next, filter, tc) {
  var reply = {
    code: -1,
    msg: "param lost"
  };
  if (!req.query || !req.query.id) {
    res.send(reply);
    return;
  }
  //find
  // filteredField 是需要返回查询结果的字段过滤列表
  DT_Data.find(tc, filter, function(err, datas) {
    if (err) {
      reply.msg = err.msg;
      res.send(reply);
      return;
    } else {
      reply = {
        code: "0",
        msg: "",
        data: datas
      };
      res.send(reply);
    }
  });
}

//电梯剪切力传感器
router.get("/shearforce", function(req, res, next) {
  queryData(req, res, "shearForce");
});

//电梯普通传观器
router.get("/common", function(req, res, next) {
  queryData(req, res, "common");
});
router.get("/realfault",function(req,res,next){
  queryData(req,res,"fault")
})


router.get("/faultC", function(req, res, next){
  queryData(req, res, "faultC");
});

router.get("/faultE", function(req, res, next){
  queryData(req, res, "faultE");
});

//电梯终端发送故障
router.get("/hisfault", function(req, res, next) {
  const filterField1 = ["common.date", "common.fault"];
  var tc = {};
  if (req.query.start || req.query.end) {
    tc = {
      "common.date": {}
    };
    if (req.query.start) {
      tc["common.date"]["$gte"] = new Date(req.query.start);
    }

    if (req.query.end) {
      tc["common.date"]["$lt"] = new Date(req.query.end);
    }
  }
  var id = req.query.id;
  tc["id"] = id;
  //故障位为1过滤条件
  tc["common.warning"] = 1;
  //historyData(req, res, next, filterField1, tc);
});

//自检状态下数据查询
router.get("/selfcheck", function(req, res, next) {
  const filteredField2 = [
    "shearForce",
    "common.date",
    "common.brakeCurrent",
    "common.torqueSign",
    "common.noLoad",
    "common.balanceFactor"
  ];

  var tc = {};

  //添加时间过滤条件
  if (req.query.start || req.query.end) {
    tc = {
      "common.date": {}
    };

    if (req.query.start) {
      tc["common.date"]["$gte"] = new Date(req.query.start);
    }

    if (req.query.end) {
      tc["common.date"]["$lt"] = new Date(req.query.end);
    }
  }

  var id = req.query.id;
  //id过滤条件
  tc["id"] = id;

  //力矩自检状态过滤条件
  tc["common.torqueSign"] = "1";
  //historyData(req, res, next, filteredField2, tc);
  return;
});

//平衡系数
router.get("/balancefactor", function(req, res, next) {
  const filteredField3 = [
    "common.date",
    "common.balanceFactor",
    "common.noLoad"
  ];

  var tc = {};

  //添加时间过滤条件
  if (req.query.start || req.query.end) {
    tc = {
      "common.date": {}
    };

    if (req.query.start) {
      tc["common.date"]["$gte"] = new Date(req.query.start);
    }

    if (req.query.end) {
      tc["common.date"]["$lt"] = new Date(req.query.end);
    }
  }

  var id = req.query.id;
  //id过滤条件
  tc["id"] = id;

  //空载标志
  tc["common.noLoad"] = 1;
  //historyData(req, res, next, filteredField3, tc);
  return;
});

module.exports = router;
