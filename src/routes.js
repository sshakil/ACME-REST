const express = require("express")
const {Device, Sensor, DeviceSensor, SensorReading} = require("./models")
const { Sequelize } = require("sequelize")

function createRouter(io) {
    const router = express.Router()

    // 🔧 Utility: Handle async API calls with error handling
    const handleAsync = (fn) => async (req, res) => {
        try {
            await fn(req, res)
        } catch (error) {
            console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error.message)
            res.status(500).json({error: "Internal server error"})
        }
    }

    // 🔧 Utility: Standardized logging
    const logAction = (action, entity, details = "") =>
        console.log(`✅ ${action} ${entity}${details ? `: ${details}` : ""}`)

    // 🔧 Utility: Emit WebSocket events
    const emitEvent = (event, room, data) => {
        io.to(room).emit(event, data)
        console.log(`📡 Emitted "${event}" to ${room}`)
    }

    // 🔧 Utility: Fetch all records of a model
    const getAllRecords = (model, entityName) =>
        handleAsync(async (req, res) => {
            const records = await model.findAll()
            if (!records.length) return res.sendStatus(204)
            logAction("Fetched", entityName, `${records.length} records`)
            res.json(records)
        })

    // 🔧 Utility: Fetch records by field (e.g., device-sensor mappings for a device)
    const getRecordsByField = (model, entityName, field, options = {}) =>
        handleAsync(async (req, res) => {
            const value = req.params[field]
            const records = await model.findAll({
                where: {[field]: value},
                ...options
            })
            if (!records.length) return res.sendStatus(204)
            logAction("Fetched", `${entityName} by ${field}`, value)
            res.json(records)
        })

    // 🔧 Utility: Create a record
    const createRecord = (model, entityName, eventName) =>
        handleAsync(async (req, res) => {
            const record = await model.create(req.body)
            logAction("Created", entityName, JSON.stringify(req.body))
            io.emit(eventName, record)
            res.status(201).json(record)
        })

    // 🔧 Utility: Delete a record
    const deleteRecord = (model, entityName) =>
        handleAsync(async (req, res) => {
            const {id} = req.params
            const deleted = await model.destroy({where: {id}})
            if (!deleted) return res.status(404).json({error: `${entityName} not found`})
            logAction("Deleted", entityName, id)
            res.sendStatus(204)
        })

    /** 🚀 Devices Endpoints */
    router.get("/devices", getAllRecords(Device, "devices"))
    router.post("/devices", createRecord(Device, "device", "device-created"))
    router.delete("/devices/:id", deleteRecord(Device, "device"))

    /** 🚀 Sensors Endpoints */
    router.get("/sensors", getAllRecords(Sensor, "sensors"))
    router.post("/sensors", createRecord(Sensor, "sensor", "sensor-created"))
    router.delete("/sensors/:id", deleteRecord(Sensor, "sensor"))

    /** 🚀 Device-Sensors Endpoints */
    router.get("/device-sensors", getAllRecords(DeviceSensor, "device-sensor mappings"))
    router.get("/device-sensors/:device_id", getRecordsByField(DeviceSensor, "device-sensor mappings", "device_id"))
    router.post("/device-sensor", createRecord(DeviceSensor, "device-sensor mapping", "device-sensor-mapped"))
    router.delete("/device-sensor/:id", deleteRecord(DeviceSensor, "device-sensor mapping"))

    /** 🚀 Sensor Readings Endpoints */

    // 🚀 Fetch latest sensor readings for all sensors of a given device
    router.get("/sensor-readings/:device_id", handleAsync(async (req, res) => {
        const { device_id } = req.params;

        if (isNaN(device_id)) {
            return res.status(400).json({ error: "Invalid device_id parameter" });
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
        });

        // Transform response
        const cleanedReadings = sensorReadings.map(reading => ({
            device_sensor_id: reading.device_sensor_id,
            time: reading.time,
            value: reading.value,
            type: reading.dataValues.type || "Unknown",
            unit: reading.dataValues.unit || "Unknown"
        }));

        res.json(cleanedReadings);
    }))

    router.post("/sensor-reading", handleAsync(async (req, res) => {
        const {device_sensor_id, time, value, no_validation, no_response_body} = req.body

        if (!device_sensor_id || value === undefined) {
            return res.status(400).json({error: "device_sensor_id and value are required"})
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
            await SensorReading.create({time: timestamp, device_sensor_id, value})
            message = time ? "used device time" : "used server time"
        }

        logAction("Processed", "sensor reading", `Device-Sensor ${device_sensor_id} => ${value}, added: ${added}, ${message}`)

        emitEvent("sensor-update", `device-sensor-id-${device_sensor_id}`, {
            device_sensor_id,
            time: timestamp,
            value,
            added,
            ...(added ? {} : {message})
        })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json({device_sensor_id, time: timestamp, value, added, ...(added ? {} : {message})})
    }))

    // 🔧 Utility: Process and create multiple sensor readings efficiently
    const processSensorReadings = async (device_id, readings, no_validation) => {
        let validMappings = new Set()
        if (!no_validation) {
            const mappings = await DeviceSensor.findAll({where: {device_id}})
            validMappings = new Set(mappings.map(m => m.id))
        }

        const timestamp = new Date().toISOString()

        return readings.map(({device_sensor_id, time, value}) => {
            const added = no_validation || validMappings.has(device_sensor_id)
            const message = added ? (time ? "used device time" : "used server time") : "invalid_mapping"

            if (added) {
                SensorReading.create({time: time || timestamp, device_sensor_id, value})
            }

            return {device_sensor_id, time: time || timestamp, value, added, ...(added ? {} : {message})}
        })
    }

    router.post("/sensor-readings/:device_id", handleAsync(async (req, res) => {
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

        logAction("Processed", `bulk sensor readings for device ${device_id}`, `${readings.length} readings`)

        emitEvent("sensors-update", `device-id-${device_id}`, {
            device_id,
            ...(no_response_body ? {} : {readings: processedReadings})
        })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json(processedReadings)
    }))

    // 🚀 Delete a sensor reading
    router.delete("/sensor-reading/:id", deleteRecord(SensorReading, "sensor reading"))

    return router
}

module.exports = createRouter