const {Client} = require("pg")
const config = require("../../config")

const client = new Client({
    host: config.host,
    user: config.username, // needs to be user, not username
    password: config.password,
    database: config.database,
    port: config.port
})

console.log("🔌 DB Util - Attempting Connection...")

client.connect()
    .then(() => {
        console.log("✅ Connected to database successfully")
        process.exit(0)  // Exit with success
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err)
        process.exit(1)  // Exit with failure
    })