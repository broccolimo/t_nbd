'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stat_error = new Schema({
  company: String,
  data: [{
    time: String,
    broken: Number,
    running: Number
  }]
});

//导出
module.exports = mongoose.model('stat_error', stat_error, "stat_error");