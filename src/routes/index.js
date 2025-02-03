const express = require("express")
const createDeviceRoutes = require("./devices")
const createSensorRoutes = require("./sensors")
const createDeviceSensorRoutes = require("./deviceSensors")
const createSensorReadingRoutes = require("./sensorReadings")

/**
 * Creates and configures the main router.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function createRouter(io) {
    const router = express.Router()

    router.use("/devices", createDeviceRoutes(io))
    router.use("/sensors", createSensorRoutes(io))
    router.use("/device-sensors", createDeviceSensorRoutes(io))
    router.use("/sensor-readings", createSensorReadingRoutes(io))

    return router
}

module.exports = createRouter