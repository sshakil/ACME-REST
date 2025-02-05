const express = require("express")
const cors = require("cors")
const db = require("./database/connection")
const http = require("http")
const setupWebSocket = require("./websocket")
const createDeviceRoutes = require("./routes/devices")
const createSensorRoutes = require("./routes/sensors")
const createDeviceSensorRoutes = require("./routes/deviceSensors")
const createSensorReadingRoutes = require("./routes/sensorReadings")

const app = express()
app.use(cors({ origin: "*" }))
app.use(express.json())

const server = http.createServer(app)
const io = setupWebSocket(server)

app.use("/acme/devices", createDeviceRoutes(io))
app.use("/acme/sensors", createSensorRoutes(io))
app.use("/acme/device-sensors", createDeviceSensorRoutes(io))
app.use("/acme/sensor-readings", createSensorReadingRoutes(io))
app.get('/health', (req, res) => res.sendStatus(200))

async function checkDatabaseHealth() {
    try {
        console.log("🔍 Checking database health...")

        await db.authenticate()
        console.log("✅ Database connection is healthy!")

        await db.query("CREATE EXTENSION IF NOT EXISTS timescaledb")

        const [result] = await db.query(`
            SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'sensor_readings'
        `)

        if (result.length === 0) {
            console.log("🛠️ Converting sensor_readings into a TimescaleDB hypertable...")
            await db.query(`SELECT create_hypertable('sensor_readings', 'time')`)
            console.log("✅ sensor_readings is now a hypertable!")
        } else {
            console.log("✅ sensor_readings is already a hypertable.")
        }

    } catch (error) {
        console.error("❌ Database health check failed:", error)
        throw error
    }
}

async function startServer() {
    return new Promise((resolve, reject) => {
        server.listen(4000, (err) => {
            if (err) {
                console.error("❌ Server startup failed:", err)
                reject(err)
            } else {
                console.log("🚀 Server running on port 4000")
                resolve()
            }
        })
    })
}

async function initializeApp() {
    try {
        await checkDatabaseHealth()
        await startServer()
        console.log("✅ Application initialized successfully!")
    } catch (error) {
        console.error("❌ App initialization failed:", error)
        process.exit(1)
    }
}

process.on("SIGINT", async () => {
    console.log("🔌 Closing database connection...")
    await db.close()
    console.log("✅ Database connection closed.")
    process.exit(0)
})

initializeApp()