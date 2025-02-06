const express = require("express")
const {handleAsync, emitEvent, logAction} = require("./util")
const {
    getRecordsByField,
    createRecord,
    createRecords,
    deleteRecord,
    validateForeignKey,
    getRecordsWithMax
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


    const processSensorReadings = async (device_id, readings, no_validation) => {
        let validMappings

        if (!no_validation) {
            const mappings = await DeviceSensor.findAll({
                where: {device_id},
                include: [{model: Sensor, as: "sensor", attributes: ["type", "unit"]}]
            })

            validMappings = new Map(mappings.map(({id, sensor}) => [id, {type: sensor.type, unit: sensor.unit}]))
        } else {
            validMappings = new Map()
        }

        const timestamp = new Date().toISOString()

        // Process readings and collect valid ones
        const processedReadings = readings.map(({device_sensor_id, time, value}) => {
            const mapping = validMappings.get(device_sensor_id) || {type: "Unknown", unit: "Unknown"}
            const added = no_validation || validMappings.has(device_sensor_id)
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

        // Bulk insert only valid readings
        const validReadings = processedReadings.filter(r => r.added).map(({device_sensor_id, time, value}) => ({
            time,
            device_sensor_id,
            value
        }))

        if (validReadings.length) {
            await SensorReading.bulkCreate(validReadings)
        }

        return processedReadings
    }


    /**
     * Handles bulk insertion of sensor readings for a device.
     */
    router.post("/:device_id", handleAsync(async (req, res) => {
        const {device_id} = req.params
        const {readings, no_validation, no_response_body} = req.body

        if (!Array.isArray(readings) || !readings.length) {
            return res.status(400).json({error: "Readings must be a non-empty array"})
        }

        let processedReadings
        if (!no_response_body) {
            processedReadings = await Promise.all(await processSensorReadings(device_id, readings, no_validation))
        } else {
            await Promise.all(await processSensorReadings(device_id, readings, no_validation))
        }

        logAction("Created", `bulk sensor readings for device ${device_id}`, `${readings.length} readings`)

        emitEvent(io, "sensors-update", `device-id-${device_id}`, {
            device_id,
            ...(no_response_body ? {} : {readings: processedReadings})
        })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json(processedReadings)
    }))

    /**
     * Handles single sensor reading insertion.
     */
    router.post("/", handleAsync(async (req, res) => {
        const {device_sensor_id, time, value, no_validation, no_response_body} = req.body

        if (!device_sensor_id || value === undefined) {
            return res.status(400).json({error: "device_sensor_id and value are required"})
        }

        let timestamp = time || new Date().toISOString()

        if (!no_validation) {
            const validSensor = await validateForeignKey(DeviceSensor, "id", device_sensor_id)
            if (!validSensor) {
                return res.status(400).json({error: "Invalid device_sensor_id, no matching sensor found"})
            }
        }

        const result = await createRecord(SensorReading, {time: timestamp, device_sensor_id, value})

        emitEvent(io, "sensor-update", `device-sensor-id-${device_sensor_id}`, {
            device_sensor_id,
            time: timestamp,
            value,
            added: result.added,
            message: result.message,
        })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json(result)
    }))

    /**
     * Deletes a sensor reading by ID.
     */
    router.delete("/:id", handleAsync(async (req, res) => {
        const {id} = req.params
        const deleted = await deleteRecord(SensorReading, id)

        if (!deleted) return res.status(404).json({error: "Sensor reading not found"})

        res.sendStatus(204)
    }))

    return router
}

module.exports = sensorReadingsRoutes