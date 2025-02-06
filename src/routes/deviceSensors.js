const express = require("express")
const {getAllRecords, getRecordsByField, createRecord, deleteRecord} = require("../database/service")
const {handleAsync} = require("./util")
const {DeviceSensor} = require("../database/models/definitions")

function deviceSensorsRoutes(io) {
    const router = express.Router()

    router.get("/", handleAsync(async (req, res) => {
        const deviceSensors = await getAllRecords(DeviceSensor)
        deviceSensors ? res.json(deviceSensors) : res.sendStatus(204)
    }))

    router.get("/:device_id", handleAsync(async (req, res) => {
        const records = await getRecordsByField(DeviceSensor, "device_id", req.params.device_id)
        records ? res.json(records) : res.sendStatus(204)
    }))

    router.post("/", handleAsync(async (req, res) => {
        const responseData = await createRecord(DeviceSensor, req.body)
        res.status(201).json(responseData)
    }))

    router.delete("/:id", handleAsync(async (req, res) => {
        const deleted = await deleteRecord(DeviceSensor, req.params.id)
        deleted ? res.sendStatus(204) : res.status(404).json({error: "Device sensor not found"})
    }))

    return router
}

module.exports = deviceSensorsRoutes