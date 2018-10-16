"use strict";

//子路由模版

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.write("x_server is running.");
});

module.exports = router;
