'use strict';
//维保定义

const mongoose = require('mongoose');

//Schema
const Schema = mongoose.Schema;

const CompanySchema = new Schema({
  name:String,
  address:String,
  phone:Number,
  email:String,
});

//导出
module.exports = mongoose.model('Company', CompanySchema, "company");