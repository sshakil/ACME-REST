const { Client } = require("pg")

const client = new Client({
    host: process.env.DB_HOST || "acme-db",
    user: process.env.DB_USER || "demo",
    password: process.env.DB_PASS || "P@ssword!1",
    database: process.env.DB_NAME || "acme",
    port: 5432
})

client.connect()
    .then(() => {
        console.log("✅ Connected to database successfully")
        process.exit(0)  // Exit with success
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err)
        process.exit(1)  // Exit with failure
    })