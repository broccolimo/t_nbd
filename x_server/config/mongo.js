"use strict";

var mongo = require("mongodb").MongoClient;
const mongoLink =
  "mongodb://" +
  (process.env.MONGO_HOST || "127.0.0.1") +
  ":" +
  (process.env.MONGO_PORT || "27017");
const mongoDB = process.env.MONGO_DB || "xizi";
const mongoPoolSize = process.env.MONGO_POOLSIZE || 30;
var thisDB = null;
module.exports = function(db) {
  this.mongoPath = mongoLink + "/" + db;

  this.connect = function() {
    mongo.connect(
      this.mongoPath,
      {
        native_parser: true,
        poolSize: mongoPoolSize,
        connectTimeoutMS: 3000
      },
      function(err, db) {
        if (err) {
          console.log("connect to mongo failed, " + err);
          thisDB = null;
        } else {
          console.log("connect to mongo success.");
          thisDB = db;
        }
      }
    );
  };

  this.insert = function(collection, data, callback) {
    if (thisDB == null) {
      console.log("Err: mongo db isnot connected.");
      return;
    }
    //get raw collection
    var col = thisDB.collection(collection);
    col.insertOne(data, function(err, result) {
      if (err) {
        console.log("mongo: insert data failed," + err);
      }
      callback(result);
    });
  };

  this.update = function(collection, filter, data, callback) {
    if (thisDB == null) {
      console.log("Err: mongo db isnot connected.");
      return;
    }
    var col = thisDB.collection(collection);
    col.updateOne(filter, data, function(err, result) {
      if (err) {
        console.log("mongo: update data failed, " + err);
      }
      callback(err, result);
    });
  };

  this.find = function(collection, filter, callback) {
    if (thisDB == null) {
      console.log("Err: mongo db isnot connected.");
      return;
    }
    var col = thisDB.collection(collection);
    col.find(filter, function(err, result) {
      callback(err, result);
    });
  };

  this.delete = function(collection, data, callback) {
    if (thisDB == null) {
      console.log("Err: mongo db isnot connected.");
      return;
    }
    var col = thisDB.collection(collection);
    col.deleteOne(filter, function(err, result) {
      callback(err, result);
    });
  };
};
