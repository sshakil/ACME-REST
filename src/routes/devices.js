const express = require("express")
const { getAllRecords, createRecord, createRecords } = require("../database/service")
const { handleAsync, logAction, emitEvent } = require("./util")
const {DeviceSensor, Device} = require("../database/models/definitions")

 function devicesRoutes(io) {
    const router = express.Router()

    router.get("/", handleAsync(async (req, res) => {
        const devices = await getAllRecords(Device)
        devices ? res.json(devices) : res.sendStatus(204)
    }))

    router.post("/", handleAsync(async (req, res) => {
        const responseData = await createRecord(Device, req.body)
        logAction("Created", "device", JSON.stringify(responseData))
        emitEvent(io, "device-created", "devices", responseData)
        res.status(201).json(responseData)
    }))

    router.post("/:id/sensors", handleAsync(async (req, res) => {
        const { id: device_id } = req.params
        const sensorList = req.body

        if (!Array.isArray(sensorList) || !sensorList.length) {
            return res.status(400).json({ error: "Request body must be a non-empty array of sensor objects" })
        }

        try {
            const createdMappings = await createRecords(DeviceSensor, sensorList, ["type", "unit"])
            return res.status(201).json({ message: "Sensors created and mapped successfully", createdMappings })
        } catch (error) {
            console.error("❌ Error in POST /devices/:id/sensors:", error.message)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }))

    return router
}

module.exports = devicesRoutes