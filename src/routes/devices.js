const express = require("express")
const { Device, DeviceSensor, Sensor} = require("../models")
const {createRecords, handleAsync} = require("./baseRoutes");

/**
 * Creates and configures the device routes.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function devicesRoutes(io) {
    const { getAllRecords, createRecord, deleteRecord, handleAsync } = require("./baseRoutes")(io)

    const router = express.Router()

    router.get("/", getAllRecords(Device, "devices"))
    router.post("/", createRecord(Device, "device", "device-created"))

    /**
     * Bulk create sensors and map them to a device.
     */
    router.post("/:id/sensors", handleAsync(async (req, res) => {
        const { id: device_id } = req.params
        const sensorList = req.body // Expected format: [{ "type": "Cargo Humidity", "unit": "%" }, ...]

        if (!Array.isArray(sensorList) || !sensorList.length) {
            return res.status(400).json({ error: "Request body must be a non-empty array of sensor objects" })
        }

        // Step 1: Create sensors if they don't exist (returns array instead of HTTP response)
        const createdSensors = await createRecords(io)(Sensor, "sensor", "sensors-created", ["type", "unit"])(
            { ...req, body: sensorList },
            res,
            true
        )

        // Step 2: Map sensors to the device
        const deviceSensorMappings = createdSensors.map(sensor => ({
            device_id,
            sensor_id: sensor.sensor_id
        }))

        // Step 3: Create device-sensor mappings (final response)
        const createdMappings = await createRecords(io)(DeviceSensor, "device-sensor", "device-sensors-created", ["device_id", "sensor_id"])(
            { ...req, body: deviceSensorMappings },
            res
        )

        res.status(201).json(createdMappings)
    }))

    router.delete("/:id", deleteRecord(Device, "device"))

    return router
}

module.exports = devicesRoutes