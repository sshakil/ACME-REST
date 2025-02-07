const express = require("express")
const {Sensor} = require("../database/models/definitions")
const {handleAsync} = require("./util")
const {getAllRecords} = require("../database/service")

/**
 * Sets up routes for sensor-related operations.
 *
 * @param {import("socket.io").Server} io - The Socket.IO instance for real-time events.
 * @returns {express.Router} An Express router for sensor endpoints.
 */
function sensorsRoutes(io) {
    const {createRecord, updateRecord} = require("../database/service")

    const router = express.Router()

    // Fetches all sensors
    router.get("/", handleAsync(async (req, res) => {
        const sensors = await getAllRecords(Sensor)
        sensors ? res.json(sensors) : res.sendStatus(204)
    }))

    // Updates a sensor by ID
    router.post("/:id", handleAsync(async (req, res) => {
        const updated = await updateRecord(Sensor, req.params.id, req.body)
        updated ? res.sendStatus(204) : res.status(404).json({error: "Sensor not found"})
    }))

    return router
}

module.exports = sensorsRoutes