"use strict";

//user
const mongoose = require("mongoose");
const crypto = require("crypto");

//Schema
const Schema = mongoose.Schema;

//用户定义
const UserSchema = new Schema({
  account: String, //账户
  name: String, //姓名
  mail: String, //邮箱
  phone: String, //电话
  addr: String, //住址
  company: String, //所属单位
  hashed_password: String, //hash加盐过的passwd
  salt: String, //加盐
  role: Number, // 0 维保人员 1 维保公司 2维保主管 3 普通用户 4 区总 5 高级用户 9999 电梯厂家 6 安装公司用户
  owner: String, //账户所属的父账户id
  valid: Number, // 0/1 无效/有效
  photo_path: String, //头像存放路径
  dev_list: [String], //所管理的电梯列表名称
  user_list: [String], //所管理的所有子用户
  canAccept_b: Boolean,
  canAccept_x: Boolean
});

//虚拟属性，不会写入到db中，但是可以直接读取
UserSchema.virtual("password")
  .set(function(password) {
    var tmp_salt = this.makeSalt();
    var tmp_pass = this.encryptPassword(password, tmp_salt);
    if (tmp_pass == "") {
      return false;
    }
    this.hashed_password = tmp_pass;
    this.salt = tmp_salt;
    this._password = password;
    return true;
  })
  .get(function () {
    return this._password;
  });

//定义user模型所需要的方法
UserSchema.methods = {
  //认证
  authenticate: function (plainText) {
    return this.encryptPassword(plainText, this.salt) === this.hashed_password;
  },

  //加盐
  makeSalt: function () {
    return Math.round(new Date().valueOf() * Math.random()) + "";
  },

  //加密passwd
  encryptPassword: function (password, salt) {
    if (!password) return "";
    try {
      return crypto
        .createHmac("sha1", salt)
        .update(password)
        .digest("hex");
    } catch (err) {
      return "";
    }
  }

};

UserSchema.set("toObject", {
  virtuals: true
});
UserSchema.set("toJSON", {
  virtuals: true
});

//导出

module.exports = mongoose.model("User", UserSchema, "user");