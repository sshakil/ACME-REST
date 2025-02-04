const express = require("express")
const { Sensor } = require("../models")

/**
 * Creates and configures the sensor routes.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function sensorsRoutes(io) {
    const { getAllRecords, createRecord, deleteRecord } = require("./baseRoutes")(io)

    const router = express.Router()

    router.get("/", getAllRecords(Sensor, "sensors"))
    router.post("/", createRecord(Sensor, "sensor", "sensor-created", ["type"]))
    router.delete("/:id", deleteRecord(Sensor, "sensor"))

    return router
}

module.exports = sensorsRoutes