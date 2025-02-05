const { Sequelize } = require("sequelize")
require("dotenv").config()
const config = require("../config")

const db = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
})

module.exports = db