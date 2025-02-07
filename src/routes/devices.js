const express = require("express")
const {
    getAllRecords, createRecord,
    createRecords, deleteRecord
} = require("../database/service")
const {
    handleAsync, logAction,
    emitEvent
} = require("./util")
const {
    DeviceSensor, Device,
    Sensor
} = require("../database/models/definitions")

/**
 * Sets up routes for device-related operations.
 *
 * @param {import("socket.io").Server} io - The Socket.IO instance for real-time events.
 * @returns {express.Router} An Express router for device endpoints.
 */
function devicesRoutes(io) {
    const router = express.Router()

    // Fetches all devices
    router.get("/", handleAsync(async (req, res) => {
        const devices = await getAllRecords(Device)
        devices ? res.json(devices) : res.sendStatus(204)
    }))

    // Creates a new device and emits an event
    router.post("/", handleAsync(async (req, res) => {
        const devices = await createRecord(Device, req.body)
        emitEvent(io, "device-created", "devices", devices)
        res.status(201).json(devices)
    }))

    // Adds sensors to a device and creates mappings
    router.post("/:id/sensors", handleAsync(async (req, res) => {
        const {id: device_id} = req.params
        const sensorList = req.body

        if (!Array.isArray(sensorList) || !sensorList.length) {
            return res.status(400).json({error: "Request body must be a non-empty array of sensor objects"})
        }

        try {
            // Creates sensors
            const createdSensors = await createRecords(
                io, Sensor, device_id, "sensors-created", sensorList, ["type", "unit"], false
            )

            if (!createdSensors.length) {
                return res.status(500).json({error: "Failed to create sensors"})
            }

            // Creates device-sensor mappings
            const deviceSensorMappings = createdSensors.map(sensor => ({
                device_id,
                sensor_id: sensor.id
            }))

            const createdMappings = await createRecords(
                io, DeviceSensor, device_id, "device-sensors-created",
                deviceSensorMappings, ["device_id", "sensor_id"],
                false
            )

            if (!createdMappings.length) {
                return res.status(500).json({error: "Failed to create device-sensor mappings"})
            }

            return res.status(201).json({message: "Sensors created and mapped successfully", createdMappings})
        } catch (error) {
            logAction("Error", "POST /devices/:id/sensors", error.message, false)
            return res.status(500).json({error: "Internal Server Error"})
        }
    }))

    // Deletes a device by ID and emits an event
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