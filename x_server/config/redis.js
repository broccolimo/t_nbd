//redis
var redis = require('redis');
const redisPort = (process.env.REDIS_PORT || 26379);
const redisHost = (process.env.REDIS_HOST || '47.93.3.105');
const redisOpt = {
    auth_pass: (process.env.REDIS_PASS || '')
};

var redisClient = redis.createClient(redisPort, redisHost, redisOpt);

redisClient.on('connect', function () {
    console.log("redis client is connected.");
}).on('ready', function (res) {
    console.log("redis client is ready.");
}).on('error', function (err) {
    console.log("redis client error: " + err)
}).on('end', function (err) {
    console.log("redis connection is closed: " + err)
})

//exports.xx 相当于一个对象实例
//module.exports 相当于一个类，要new
//每个require，只会加载执行一次，以require的名字来索引

exports.update = function (key, val, callback) {
    redisClient.hmset(key, val, function (err, reply) {
        if (callback)
            callback(err, reply);
    });
};

exports.query = function (key, callback) {
    redisClient.hgetall(key, function (err, obj) {
        if (callback)
            callback(err, obj);
    });
};

exports.remove = function (key, callback) {
    redisClient.del(key, function (err, num) {
        if (callback)
            callback(err, num);
    })
}