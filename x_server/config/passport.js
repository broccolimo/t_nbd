<<<<<<< HEAD
'use strict';
// passport related logic

var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

//用来存储
var User = require('../models/user.js');

//用户名验证
var localSt = new LocalStrategy({
    usernameField: 'username', //这里是form提交的用户字段名
    passwordField: 'password', //这里是form提交的密码字段名
    passReqToCallback: true //这个必须是ture，否则下面callback没有req
  },
  function (req, username, password, done) {
    var options = {
      criteria: {
        id: id
      }
    };

    //查找用户
    User.find({
      user: username
    }, function (err, user) {
      //查找错误
      if (err) return done(err);
      //用户不存在
      if (!user) {
        return done(null, false, {
          message: 'Unknown user'
        });
      }
      //验证用户失败
      if (!user.authenticate(password)) {
        return done(null, false, {
          message: 'Invalid password'
        });
      }
      //验证用户成功
      return done(null, user);
    });
  });

//直接加载
module.exports = function (passport) {

  //验证ok后，将user.session_id写入session的Store中
  passport.serializeUser(function (user, cb) {
    console.log("passport.serializeUser id=" + user.session_id);
    cb(null, user.session_id);
  });

  //从sessionStore中读取id对应的user，存入req.user,并设置req.isAuth()为true
  passport.deserializeUser(function (id, cb) {
    User.findById(id, function (err, user) {
      console.log("passport.deserializeUser id=" + user.session_id);
      done(err, user);
    });
  });

  // 加载passport策略
  passport.use(localSt);
=======
'use strict';
// passport related logic

var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

//用来存储
var User = require('../models/user.js');

//用户名验证
var localSt = new LocalStrategy({
    usernameField: 'username', //这里是form提交的用户字段名
    passwordField: 'password', //这里是form提交的密码字段名
    passReqToCallback: true //这个必须是ture，否则下面callback没有req
  },
  function (req, username, password, done) {
    var options = {
      criteria: {
        id: id
      }
    };

    //查找用户
    User.find({
      user: username
    }, function (err, user) {
      //查找错误
      if (err) return done(err);
      //用户不存在
      if (!user) {
        return done(null, false, {
          message: 'Unknown user'
        });
      }
      //验证用户失败
      if (!user.authenticate(password)) {
        return done(null, false, {
          message: 'Invalid password'
        });
      }
      //验证用户成功
      return done(null, user);
    });
  });

//直接加载
module.exports = function (passport) {

  //验证ok后，将user.session_id写入session的Store中
  passport.serializeUser(function (user, cb) {
    console.log("passport.serializeUser id=" + user.session_id);
    cb(null, user.session_id);
  });

  //从sessionStore中读取id对应的user，存入req.user,并设置req.isAuth()为true
  passport.deserializeUser(function (id, cb) {
    User.findById(id, function (err, user) {
      console.log("passport.deserializeUser id=" + user.session_id);
      done(err, user);
    });
  });

  // 加载passport策略
  passport.use(localSt);
>>>>>>> a5c5312fac4bebecfb903624bcb94f09d9239428
};