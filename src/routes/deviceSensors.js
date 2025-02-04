const express = require("express")
const { DeviceSensor } = require("../models")

/**
 * Creates and configures the device-sensor routes.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function deviceSensorsRoutes(io) {
    const { getAllRecords, getRecordsByField, createRecord, deleteRecord } = require("./baseRoutes")(io)

    const router = express.Router()

    router.get("/", getAllRecords(DeviceSensor, "device-sensors"))
    router.get("/:device_id", getRecordsByField(DeviceSensor, "device-sensors", "device_id"))
    router.post("/", createRecord(DeviceSensor, "device-sensor ", "device-sensor-mapped"))
    router.delete("/:id", deleteRecord(DeviceSensor, "device-sensor"))

    return router
}

module.exports = deviceSensorsRoutes