const express = require("express")
const { SensorReading, DeviceSensor, Sensor } = require("../models")
const { Sequelize } = require("sequelize")
const { handleAsync, logAction, emitEvent } = require("./baseRoutes")

function createSensorReadingRoutes(io) {
    const router = express.Router()

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

        res.json(sensorReadings.map(reading => ({
            device_sensor_id: reading.device_sensor_id,
            time: reading.time,
            value: reading.value,
            type: reading.dataValues.type || "Unknown",
            unit: reading.dataValues.unit || "Unknown"
        })))
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

        emitEvent(io, "sensor-update", `device-sensor-id-${device_sensor_id}`, {
            device_sensor_id,
            time: timestamp,
            value,
            added,
            ...(added ? {} : { message })
        })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json({ device_sensor_id, time: timestamp, value, added, ...(added ? {} : { message }) })
    }))

    router.delete("/:id", handleAsync(async (req, res) => {
        const { id } = req.params
        const deleted = await SensorReading.destroy({ where: { id } })
        if (!deleted) return res.status(404).json({ error: "Sensor reading not found" })
        logAction("Deleted", "sensor reading", id)
        res.sendStatus(204)
    }))

    return router
}

module.exports = createSensorReadingRoutes