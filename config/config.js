require("dotenv").config();

module.exports = {
  development: {
    username: "demo",
    password: "P@ssword!1",
    database: "acme",
    host: "localhost",
    port: 5432,
    dialect: "postgres"
  },
  dockerDev: {
    username: process.env.DB_USER || "demo",
    password: process.env.DB_PASS || "P@ssword!1",
    database: process.env.DB_NAME || "acme",
    host: process.env.DB_HOST || "acme-db",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres"
  }
}