const express = require("express")
const { Device, Sensor, DeviceSensor, SensorReading } = require("./models")

function createRouter(io) {
    const router = express.Router()

    // 🔧 Utility: Handle async API calls with error handling
    const handleAsync = (fn) => async (req, res) => {
        try {
            await fn(req, res)
        } catch (error) {
            console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error.message)
            res.status(500).json({ error: `Failed to process request` })
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

    /** 🚀 Generic GET endpoint for fetching all records of a model */
    const getAll = (model, entityName) =>
        handleAsync(async (req, res) => {
            const records = await model.findAll()
            logAction("Fetched", entityName, `${records.length} records`)
            res.json(records)
        })

    /** 🚀 Generic POST endpoint for creating a record */
    const createRecord = (model, entityName, eventName) =>
        handleAsync(async (req, res) => {
            const record = await model.create(req.body)
            logAction("Created", entityName, JSON.stringify(req.body))
            io.emit(eventName, record)
            res.status(201).json(record)
        })

    /** 🚀 Generic DELETE endpoint */
    const deleteRecord = (model, entityName) =>
        handleAsync(async (req, res) => {
            const { id } = req.params
            await model.destroy({ where: { id } })
            logAction("Deleted", entityName, id)
            res.sendStatus(204)
        })

    /** 🚀 Devices Endpoints */
    router.get("/devices", getAll(Device, "devices"))
    router.post("/devices", createRecord(Device, "device", "device-created"))
    router.delete("/devices/:id", deleteRecord(Device, "device"))

    /** 🚀 Sensors Endpoints */
    router.get("/sensors", getAll(Sensor, "sensors"))
    router.post("/sensors", createRecord(Sensor, "sensor", "sensor-created"))
    router.delete("/sensors/:id", deleteRecord(Sensor, "sensor"))

    /** 🚀 Device-Sensors Endpoints */
    router.get("/device-sensors", getAll(DeviceSensor, "device-sensor mappings"))

    router.get("/device-sensors/:device_id", handleAsync(async (req, res) => {
        const { device_id } = req.params
        const mappings = await DeviceSensor.findAll({ where: { device_id } })
        logAction("Fetched", `device-sensor mappings for device ${device_id}`, `${mappings.length} records`)
        res.json(mappings)
    }))

    router.post("/device-sensor", createRecord(DeviceSensor, "device-sensor mapping", "device-sensor-mapped"))
    router.delete("/device-sensor/:id", deleteRecord(DeviceSensor, "device-sensor mapping"))

    /** 🚀 Sensor Readings Endpoints */
    router.get("/sensor-readings", handleAsync(async (req, res) => {
        const { device_sensor_id } = req.query
        const whereClause = device_sensor_id ? { device_sensor_id } : {}
        const readings = await SensorReading.findAll({ where: whereClause, order: [["time", "DESC"]] })
        logAction("Fetched", "sensor readings", `${readings.length} records`)
        res.json(readings)
    }))

    router.get("/latest-sensors-reading", handleAsync(async (req, res) => {
        const { device_id } = req.query
        if (!device_id) return res.status(400).json({ error: "device_id is required" })

        const deviceSensors = await DeviceSensor.findAll({ where: { device_id }, include: [{ model: Sensor, as: "sensor" }] })
        if (!deviceSensors.length) return res.json([])

        const readings = await Promise.all(
            deviceSensors.map(async (ds) => {
                const latestReading = await SensorReading.findOne({
                    where: { device_sensor_id: ds.id },
                    order: [["time", "DESC"]],
                })

                return {
                    id: ds.sensor.id,
                    type: ds.sensor.type,
                    value: latestReading ? latestReading.value : "N/A",
                    unit: ds.sensor.unit,
                    time: latestReading ? latestReading.time : "No Data"
                }
            })
        )

        logAction("Fetched", `latest sensor readings for device ${device_id}`, `${readings.length} records`)
        res.json(readings)
    }))

    // 🚀 Add a single sensor reading
    router.post("/sensor-reading", handleAsync(async (req, res) => {
        const { device_sensor_id, time, value, no_validation, no_response_body } = req.body
        let added = true
        let message

        if (!no_validation) {
            const exists = await DeviceSensor.findByPk(device_sensor_id)
            if (!exists) {
                added = false
                message = "invalid_mapping"
            }
        }

        if (added) await SensorReading.create({ time, device_sensor_id, value })

        logAction("Processed", "sensor reading", `Device-Sensor ${device_sensor_id} => ${value}, added: ${added}`)

        emitEvent("sensor-update", `device-sensor-id-${device_sensor_id}`, { device_sensor_id, time, value, added, ...(message && { message }) })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json({ device_sensor_id, time, value, added, ...(message && { message }) })
    }))

    // 🚀 Bulk add sensor readings for a device
    router.post("/sensor-readings/:device_id", handleAsync(async (req, res) => {
        const { device_id } = req.params
        const { readings, no_validation, no_response_body } = req.body

        if (!Array.isArray(readings) || !readings.length) return res.status(400).json({ error: "Readings must be a non-empty array" })

        let validMappings = new Set()
        if (!no_validation) {
            const mappings = await DeviceSensor.findAll({ where: { device_id } })
            validMappings = new Set(mappings.map(m => m.id))
        }

        const results = readings.map(({ device_sensor_id, time, value }) => {
            const added = no_validation || validMappings.has(device_sensor_id)
            const message = added ? undefined : "invalid_mapping"

            if (added) SensorReading.create({ time, device_sensor_id, value })

            return { device_sensor_id, time, value, added, ...(message && { message }) }
        })

        logAction("Processed", `bulk sensor readings for device ${device_id}`, `${readings.length} readings`)

        emitEvent("sensors-update", `device-id-${device_id}`, { device_id, readings: results })

        if (no_response_body) return res.sendStatus(201)
        res.status(201).json(results)
    }))

    // 🚀 Delete a sensor reading
    router.delete("/sensor-reading/:id", deleteRecord(SensorReading, "sensor reading"))

    return router
}

module.exports = createRouter