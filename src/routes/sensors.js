const express = require("express")
const { Sensor } = require("../models")
const { getAllRecords, createRecord, deleteRecord } = require("./baseRoutes")

function createSensorRoutes(io) {
    const router = express.Router()

    router.get("/", getAllRecords(Sensor, "sensors"))
    router.post("/", createRecord(io, Sensor, "sensor", "sensor-created"))
    router.delete("/:id", deleteRecord(Sensor, "sensor"))

    return router
}

module.exports = createSensorRoutes