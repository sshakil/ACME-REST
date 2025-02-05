const express = require("express")
const {Device, DeviceSensor, Sensor} = require("../database/models/definitions")

/**
 * Creates and configures the device routes.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function devicesRoutes(io) {
    const {getAllRecords, createRecord, createRecords, createRecordsWithoutReqResp,
        deleteRecord, handleAsync} = require("./baseRoutes")(io)

    const router = express.Router()

    router.get("/", getAllRecords(Device, "devices"))
    router.post("/", createRecord(Device, "device", "device-created"))

    /**
     * Bulk create sensors and map them to a device.
     */
    router.post("/:id/sensors", handleAsync(async (req, res) => {
        const { id: device_id } = req.params
        const sensorList = req.body

        if (!Array.isArray(sensorList) || !sensorList.length) {
            return res.status(400).json({ error: "Request body must be a non-empty array of sensor objects" })
        }

        try {
            // Step 1: Create sensors without handling HTTP response
            const createdSensors = await createRecordsWithoutReqResp(
                Sensor, "sensor",
                "sensors-created",
                ["type", "unit"],
                sensorList
            )

            if (!Array.isArray(createdSensors) || !createdSensors.length) {
                return res.status(500).json({ error: "Failed to create sensors" })
            }

            // Step 2: Map sensors to the device
            const deviceSensorMappings = createdSensors.map(sensor => ({
                device_id,
                sensor_id: sensor.id
            }))

            // Step 3: Create device-sensor mappings
            const createdMappings = await createRecordsWithoutReqResp(
                DeviceSensor, "device-sensor",
                "device-sensors-created",
                ["device_id", "sensor_id"],
                deviceSensorMappings
            )

            if (!Array.isArray(createdMappings) || !createdMappings.length) {
                return res.status(500).json({ error: "Failed to create device-sensor mappings" })
            }

            return res.status(201).json({
                message: "Sensors created and mapped successfully",
                createdMappings
            })

        } catch (error) {
            console.error("❌ Error in POST /acme/devices/:id/sensors:", error)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }))


    router.delete("/:id", deleteRecord(Device, "device", "device-deleted"))

    return router
}

module.exports = devicesRoutes