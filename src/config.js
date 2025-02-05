const {join} = require("node:path")
require("dotenv").config()

const ENV = process.env.NODE_ENV || "development"

const configs = {
    development: {
        // sequelize requires these particular keys?
        username: process.env.DB_USER || "demo",
        password: process.env.DB_PASS || "P@ssword!1",
        database: process.env.DB_NAME || "acme",
        host: process.env.DB_HOST || "acme-db",
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        logging: process.env.DB_LOGGING === true,
        dialect: process.env.DB_DIALECT || "postgres",

        websocketLogLevel: process.env.WS_EMIT_LOGGING || "minimal"
    }
}

module.exports = configs[ENV]