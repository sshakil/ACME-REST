const express = require("express")
const {getRecordsByField, createRecord, deleteRecord} = require("../database/service")
const {handleAsync, emitEvent} = require("./util")
const {DeviceSensor} = require("../database/models/definitions")

/**
 * Sets up routes for device-sensor relationships.
 *
 * @param {import("socket.io").Server} io - The Socket.IO instance for real-time events.
 * @returns {express.Router} An Express router for device-sensor endpoints.
 */
function deviceSensorsRoutes(io) {
    const router = express.Router()

    // Fetches all sensors associated with a device
    router.get("/:device_id", handleAsync(async (req, res) => {
        const records = await getRecordsByField(DeviceSensor, "device_id", req.params.device_id)
        records ? res.json(records) : res.sendStatus(204)
    }))

    return router
}

module.exports = deviceSensorsRoutes