const express = require("express")
const { Device } = require("../models")

/**
 * Creates and configures the device routes.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function createDeviceRoutes(io) {
    const { getAllRecords, createRecord, deleteRecord } = require("./baseRoutes")(io)

    const router = express.Router()

    router.get("/", getAllRecords(Device, "devices"))
    router.post("/", createRecord(Device, "device", "device-created"))
    router.delete("/:id", deleteRecord(Device, "device"))

    return router
}

module.exports = createDeviceRoutes