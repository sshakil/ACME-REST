const express = require("express")
const { SensorReading, DeviceSensor, Sensor } = require("../models")
const { Sequelize } = require("sequelize")

/**
 * Creates and configures the sensor readings router.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function createSensorReadingRoutes(io) {
    const { handleAsync, logAction, emitEvent } = require("./baseRoutes")(io)

    const router = express.Router()

    // 🔧 Utility: Process and create multiple sensor readings efficiently
    const processSensorReadings = async (device_id, readings, no_validation) => {
        let validMappings = new Set()
        if (!no_validation) {
            const mappings = await DeviceSensor.findAll({ where: { device_id } })
            validMappings = new Set(mappings.map(m => m.id))
        }

        const timestamp = new Date().toISOString()

        return readings.map(({ device_sensor_id, time, value }) => {
            const added = no_validation || validMappings.has(device_sensor_id)
            const message = added ? (time ? "used device time" : "used server time") : "invalid_mapping"

            if (added) {
                SensorReading.create({ time: time || timestamp, device_sensor_id, value })
            }

            return { device_sensor_id, time: time || timestamp, value, added, ...(added ? {} : { message }) }
        })
    }

    router.get("/:device_id", handleAsync(async (req, res) => {
        const { device_id } = req.params

        if (isNaN(device_id)) {
            return res.status(400).json({ error: "Invalid device_id parameter" })
        }

        const sensorReadings = await SensorReading.findAll({
            attributes: [
                "device_sensor_id",
                "time",
                "value",
                [Sequelize.col("DeviceSensor.sensor.type"), "type"],
                [Sequelize.col("DeviceSensor.sensor.unit"), "unit"]
            ],
            include: [
                {
                    model: DeviceSensor,
                    attributes: [],
                    required: true,
                    include: [
                        {
                            model: Sensor,
                            as: "sensor",
                            attributes: []
                        }
                    ]
                }
            ],
            where: {
                time: {
                    [Sequelize.Op.eq]: Sequelize.literal(
                        `(SELECT MAX(sr.time) FROM sensor_readings sr WHERE sr.device_sensor_id = "SensorReading"."device_sensor_id")`
                    )
                },
                "$DeviceSensor.device_id$": device_id
            },
        })

        logAction("Fetched", "sensor readings", `for device ${device_id}`)

        res.json(sensorReadings.map(reading => ({
            device_sensor_id: reading.device_sensor_id,
            time: reading.time,
            value: reading.value,
            type: reading.dataValues.type || "Unknown",
            unit: reading.dataValues.unit || "Unknown"
        })))
    }))

    router.post("/:device_id", handleAsync(async (req, res) => {
        const { device_id } = req.params
        const { readings, no_validation, no_response_body } = req.body

        if (!Array.isArray(readings) || !readings.length) {
            return res.status(400).json({ error: "Readings must be a non-empty array" })
        }

        let processedReadings
        if (!no_response_body) {
            processedReadings = await Promise.all(await processSensorReadings(device_id, readings, no_validation))
        } else {
            await Promise.all(await processSensorReadings(device_id, readings, no_validation))
        }

        logAction("Processed", `bulk sensor readings for device ${device_id}`, `${readings.length} readings`)

        emitEvent("sensors-update", `device-id-${device_id}`, {
            device_id,
            ...(no_response_body ? {} : { readings: processedReadings })
        })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json(processedReadings)
    }))

    router.post("/", handleAsync(async (req, res) => {
        const { device_sensor_id, time, value, no_validation, no_response_body } = req.body

        if (!device_sensor_id || value === undefined) {
            return res.status(400).json({ error: "device_sensor_id and value are required" })
        }

        let added = true, message
        const timestamp = time || new Date().toISOString()

        if (!no_validation) {
            const exists = await DeviceSensor.findByPk(device_sensor_id)
            if (!exists) {
                added = false
                message = "invalid_mapping"
            }
        }

        if (added) {
            await SensorReading.create({ time: timestamp, device_sensor_id, value })
            message = time ? "used device time" : "used server time"
        }

        logAction("Processed", "sensor reading", `Device-Sensor ${device_sensor_id} => ${value}, added: ${added}, ${message}`)
        console.log("")

        emitEvent("sensor-update", `device-sensor-id-${device_sensor_id}`, {
            device_sensor_id,
            time: timestamp,
            value,
            added,
            ...(added ? {} : { message })
        })

        console.log("")

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json({ device_sensor_id, time: timestamp, value, added, ...(added ? {} : { message }) })
    }))

    router.delete("/:id", handleAsync(async (req, res) => {
        const { id } = req.params
        const deleted = await SensorReading.destroy({ where: { id } })
        if (!deleted) return res.status(404).json({ error: "Sensor reading not found" })

        logAction("Deleted", "sensor reading", id)
        console.log("")

        res.sendStatus(204)
    }))

    return router
}

module.exports = createSensorReadingRoutes