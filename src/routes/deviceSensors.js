const express = require("express")
const { DeviceSensor } = require("../models")

/**
 * Creates and configures the device-sensor routes.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function createDeviceSensorRoutes(io) {
    const { getAllRecords, getRecordsByField, createRecord, deleteRecord } = require("./baseRoutes")(io)

    const router = express.Router()

    router.get("/", getAllRecords(DeviceSensor, "device-sensor mappings"))
    router.get("/:device_id", getRecordsByField(DeviceSensor, "device-sensor mappings", "device_id"))
    router.post("/", createRecord(DeviceSensor, "device-sensor mapping", "device-sensor-mapped"))
    router.delete("/:id", deleteRecord(DeviceSensor, "device-sensor mapping"))

    return router
}

module.exports = createDeviceSensorRoutes