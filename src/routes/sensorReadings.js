const express = require("express")
const {handleAsync, emitEvent, logAction} = require("./util")
const {
    getRecordsByField,
    createRecords,
} = require("../database/service")
const {SensorReading, DeviceSensor, Sensor} = require("../database/models/definitions")
const {Sequelize} = require("sequelize");

/**
 * Creates and configures the sensor readings router.
 *
 * @param {import("socket.io").Server} io - Socket.IO instance for real-time events.
 * @returns {express.Router} The configured Express router.
 */
function sensorReadingsRoutes(io) {
    const router = express.Router()

    /**
     * Retrieves the latest sensor readings for a given device ID.
     */
    router.get("/:device_id", handleAsync(async (req, res) => {
        const {device_id} = req.params

        if (isNaN(device_id)) {
            return res.status(400).json({error: "Invalid device_id parameter"})
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
        if (!sensorReadings) {
            return res.status(204).json({message: "No sensor readings found."})
        }

        res.json(sensorReadings)
    }))


    const getValidSensorMappings = async (device_id, validateMappings) => {
        if (!validateMappings) return new Map()

        const mappings = await getRecordsByField(DeviceSensor, "device_id", device_id, {
            include: [{model: Sensor, as: "sensor", attributes: ["type", "unit"]}]
        })

        return new Map((mappings || []).map(({id, sensor}) => [id, {
            type: sensor?.type || "Unknown",
            unit: sensor?.unit || "Unknown"
        }]))
    }

    /**
     * Processes and validates sensor readings.
     */
    const processSensorReadings = async (device_id, readings, validateMappings) => {
        const validMappings = await getValidSensorMappings(device_id, validateMappings)
        const timestamp = new Date().toISOString()

        return readings.map(({device_sensor_id, time, value}) => {
            const mapping = validMappings.get(device_sensor_id) || {type: "Unknown", unit: "Unknown"}
            const added = !validateMappings || validMappings.has(device_sensor_id)
            const message = added ? (time ? "used device time" : "used server time") : "invalid_mapping"

            return {
                device_sensor_id,
                time: time || timestamp,
                value,
                added,
                type: mapping.type,
                unit: mapping.unit,
                ...(added ? {} : {message})
            }
        })
    }

    /**
     * Handles bulk insertion of sensor readings for a device.
     */
    router.post("/:device_id", handleAsync(async (req, res) => {
        const {device_id} = req.params
        const {readings, validateMappings, responseBody} = req.body

        if (!Array.isArray(readings) || !readings.length) {
            return res.status(400).json({error: "Readings must be a non-empty array"})
        }

        const processedReadings = await processSensorReadings(device_id, readings, validateMappings)

        // Extract only valid readings
        const validReadings = processedReadings.filter(r => r.added).map(
            (
                {device_sensor_id, time, value}) => ({
                    time,
                    device_sensor_id,
                    value
                }
            )
        )

        if (validReadings.length) {
            await createRecords(io, SensorReading, "sensors-update", validReadings)
        }

        logAction("Created", `bulk sensor readings for device ${device_id}`, `${validReadings.length} readings`)

        emitEvent(io, "sensors-update", `device-id-${device_id}`, {
            device_id,
            ...(!responseBody ? {} : {readings: processedReadings})
        })

        if (!responseBody) return res.sendStatus(200)
        res.status(201).json(processedReadings)
    }))

    return router
}

module.exports = sensorReadingsRoutes