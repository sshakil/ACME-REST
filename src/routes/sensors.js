const express = require("express")
const { Sensor } = require("../database/models/definitions")
const {handleAsync} = require("./util");

/**
 * Creates and configures the sensor routes.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function sensorsRoutes(io) {
    const { getAllRecords, createRecord, deleteRecord } = require("../database/service")

    const router = express.Router()

    router.get("/", handleAsync(async (req, res) => {
        const records = await getAllRecords(Sensor)
        res.json(records)
    }))

    router.post("/", handleAsync(async (req, res) => {
        const result = await createRecord(Sensor, req.body, ["type"])
        res.status(201).json(result)
    }))

    router.delete("/:id", handleAsync(async (req, res) => {
        const { id } = req.params
        const deleted = await deleteRecord(Sensor, id)
        if (!deleted) return res.status(404).json({ error: "Sensor not found" })
        res.sendStatus(204)
    }))

    return router
}

module.exports = sensorsRoutes