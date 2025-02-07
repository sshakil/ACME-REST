const express = require("express")
const devicesRoutes = require("./devices")
const sensorsRoutes = require("./sensors")
const deviceSensorsRoutes = require("./deviceSensors")
const sensorReadingsRoutes = require("./sensorReadings")

/**
 * Sets up the main API router.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function createRouter(io) {
    const router = express.Router()

    router.use("/devices", devicesRoutes(io))
    router.use("/sensors", sensorsRoutes(io))
    router.use("/device-sensors", deviceSensorsRoutes(io))
    router.use("/sensor-readings", sensorReadingsRoutes(io))

    return router
}

module.exports = createRouter