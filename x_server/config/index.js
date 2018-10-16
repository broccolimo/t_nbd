// config
const mongoLink =
  "mongodb://" +
  (process.env.MONGO_HOST || "47.93.3.105") +
  ":" +
  (process.env.MONGO_PORT || "27018");
const mongoDB = process.env.MONGO_DB || "xizi";


module.exports = {
  development: {
    mongo: mongoLink + "/" + mongoDB,
    mongoPoolSize: 50,
    redis: {
      host: process.env.REDIS_HOST || "47.93.3.105",
      port: process.env.REDIS_PORT || "26379",
      ttl: 600,
      logErrors: true
    },
    cookie: {
      path: "/",
      //expires: 10 * 60 * 1000 //失效时间
    },
    mysql: {
      username: "root",
      password: "testgs",
      database: "x_dev_data",
      host: "mysql_server",
      dialect: "mysql",
      timezone: "+08:00",
      autoMigrateOldSchema: true,
      logging: true,
      dialectOptions: {
        charset: "utf8mb4"
      }
    }
  },
  production: {
    mongo: mongoLink + "/" + mongoDB,
    mongoPoolSize: 50,
    redis: {
      host: process.env.REDIS_HOST || "47.93.3.105",
      port: process.env.REDIS_PORT || "26379",
      ttl: 600,
      logErrors: true
    },
    cookie: {
      path: "/"
      //expires: 10 * 60 * 1000 //失效时间
    },
    mysql: {
      username: "root",
      password: "testgs",
      database: "x_dev_data",
      host: "mysql_server",
      dialect: "mysql",
      timezone: "+08:00",
      autoMigrateOldSchema: true,
      logging: true,
      dialectOptions: {
        charset: "utf8mb4"
      }
    }
  }
}[process.env.NODE_ENV || "development"];

