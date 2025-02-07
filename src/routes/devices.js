const express = require("express")
const {getAllRecords, createRecord, createRecords, deleteRecord} = require("../database/service")
const {handleAsync, logAction, emitEvent} = require("./util")
const {DeviceSensor, Device, Sensor} = require("../database/models/definitions")

function devicesRoutes(io) {
    const router = express.Router()

    router.get("/", handleAsync(async (req, res) => {
        const devices = await getAllRecords(Device)
        devices ? res.json(devices) : res.sendStatus(204)
    }))

    //todo move emit to inside?
    router.post("/", handleAsync(async (req, res) => {
        const devices = await createRecord(Device, req.body)
        emitEvent(io, "device-created", "devices", devices)
        res.status(201).json(devices)
    }))

    router.post("/:id/sensors", handleAsync(async (req, res) => {
        const { id: device_id } = req.params
        const sensorList = req.body

        if (!Array.isArray(sensorList) || !sensorList.length) {
            return res.status(400).json({ error: "Request body must be a non-empty array of sensor objects" })
        }

        try {
            // Step 1: Create sensors
            const createdSensors = await createRecords(
                io, Sensor, device_id, "sensors-created", sensorList, ["type", "unit"], false
            )

            if (!Array.isArray(createdSensors) || !createdSensors.length) {
                return res.status(500).json({ error: "Failed to create sensors" })
            }

            // Step 2: Create device-sensor mappings
            const deviceSensorMappings = createdSensors.map(sensor => ({
                device_id,
                sensor_id: sensor.id
            }))

            const createdMappings = await createRecords(
                io, DeviceSensor, device_id,"device-sensors-created",
                deviceSensorMappings, ["device_id", "sensor_id"],
                false
            )

            if (!Array.isArray(createdMappings) || !createdMappings.length) {
                return res.status(500).json({ error: "Failed to create device-sensor mappings" })
            }

            return res.status(201).json({ message: "Sensors created and mapped successfully", createdMappings })
        } catch (error) {
            logAction("Error", "POST /devices/:id/sensors", error.message, false)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }))

    router.delete("/:id", handleAsync(async (req, res) => {
        const id = req.params.id
        const deleted = await deleteRecord(Device, id)

        if (deleted) {
            emitEvent(io, "device-deleted", "devices", {id})
            res.sendStatus(204)
        } else {
            res.status(404).json({error: "Device not found"})
        }
    }))


    return router
}

module.exports = devicesRoutes