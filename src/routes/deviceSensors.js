const express = require("express")
const {getRecordsByField, createRecord, deleteRecord} = require("../database/service")
const {handleAsync, emitEvent} = require("./util")
const {DeviceSensor} = require("../database/models/definitions")

function deviceSensorsRoutes(io) {
    const router = express.Router()

    router.get("/:device_id", handleAsync(async (req, res) => {
        const records = await getRecordsByField(DeviceSensor, "device_id", req.params.device_id)
        records ? res.json(records) : res.sendStatus(204)
    }))

    router.post("/", handleAsync(async (req, res) => {
        const responseData = await createRecord(DeviceSensor, req.body)
        //todo emit event
        res.status(201).json(responseData)
    }))

    router.delete("/:id", handleAsync(async (req, res) => {
        const id = req.params.id
        const deleted = await deleteRecord(DeviceSensor, id)

        if (deleted) {
            emitEvent(io, "device-sensor-deleted", "devices-sensors", {id})
            res.sendStatus(204)
        } else {
            res.status(404).json({error: "Device-Sensor not found"})
        }
    }))

    return router
}

module.exports = deviceSensorsRoutes