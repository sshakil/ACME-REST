const express = require("express")
const { DeviceSensor } = require("../models")
const { getAllRecords, getRecordsByField, createRecord, deleteRecord } = require("./baseRoutes")

function createDeviceSensorRoutes(io) {
    const router = express.Router()

    router.get("/", getAllRecords(DeviceSensor, "device-sensor mappings"))
    router.get("/:device_id", getRecordsByField(DeviceSensor, "device-sensor mappings", "device_id"))
    router.post("/", createRecord(io, DeviceSensor, "device-sensor mapping", "device-sensor-mapped"))
    router.delete("/:id", deleteRecord(DeviceSensor, "device-sensor mapping"))

    return router
}

module.exports = createDeviceSensorRoutes