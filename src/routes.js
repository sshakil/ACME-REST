const express = require("express")
const {Device, Sensor, DeviceSensor, SensorReading} = require("./models")

function createRouter(io) {
    const router = express.Router()

    /** 🚀 Devices Endpoints */

    // Get all devices
    router.get("/devices", async (req, res) => {
        try {
            const devices = await Device.findAll()
            console.log(`📡 Fetched ${devices.length} devices`)
            res.json(devices)
        } catch (error) {
            console.error("❌ Error fetching devices:", error.message)
            res.status(500).json({error: "Failed to fetch devices"})
        }
    })

    // Create a new device
    router.post("/devices", async (req, res) => {
        try {
            const {name, type} = req.body
            const newDevice = await Device.create({name, type})

            console.log(`✅ Created device: ${newDevice.id} (${name}, ${type})`)

            // Emit event for new device creation
            io.emit("device-created", newDevice)

            res.status(201).json(newDevice)
        } catch (error) {
            console.error("❌ Error creating device:", error.message)
            res.status(500).json({error: "Failed to create device"})
        }
    })

    // Delete a device
    router.delete("/devices/:id", async (req, res) => {
        try {
            const {id} = req.params
            await Device.destroy({where: {id}})
            console.log(`🗑️ Deleted device: ${id}`)
            res.sendStatus(204)
        } catch (error) {
            console.error("❌ Error deleting device:", error.message)
            res.status(500).json({error: "Failed to delete device"})
        }
    })

    /** 🚀 Sensors Endpoints */

    // Get all sensors
    router.get("/sensors", async (req, res) => {
        try {
            const sensors = await Sensor.findAll()
            console.log(`📡 Fetched ${sensors.length} sensors`)
            res.json(sensors)
        } catch (error) {
            console.error("❌ Error fetching sensors:", error.message)
            res.status(500).json({error: "Failed to fetch sensors"})
        }
    })

    // Create a new sensor
    router.post("/sensors", async (req, res) => {
        try {
            const {type, unit} = req.body
            const newSensor = await Sensor.create({type, unit})

            console.log(`✅ Created sensor: ${newSensor.id} (${type}, ${unit})`)

            // Emit event for new sensor creation
            io.emit("sensor-created", newSensor)

            res.status(201).json(newSensor)
        } catch (error) {
            console.error("❌ Error creating sensor:", error.message)
            res.status(500).json({error: "Failed to create sensor"})
        }
    })

    // Delete a sensor
    router.delete("/sensors/:id", async (req, res) => {
        try {
            const {id} = req.params
            await Sensor.destroy({where: {id}})
            console.log(`🗑️ Deleted sensor: ${id}`)
            res.sendStatus(204)
        } catch (error) {
            console.error("❌ Error deleting sensor:", error.message)
            res.status(500).json({error: "Failed to delete sensor"})
        }
    })

    /** 🚀 Device-Sensors Mapping Endpoints */

    // Get all device-sensor mappings
    router.get("/device-sensors", async (req, res) => {
        try {
            const mappings = await DeviceSensor.findAll()
            console.log(`📡 Fetched ${mappings.length} device-sensor mappings`)
            res.json(mappings)
        } catch (error) {
            console.error("❌ Error fetching device-sensor mappings:", error.message)
            res.status(500).json({error: "Failed to fetch mappings"})
        }
    })

    // Map a sensor to a device
    router.post("/device-sensor", async (req, res) => {
        try {
            const {device_id, sensor_id} = req.body
            const mapping = await DeviceSensor.create({device_id, sensor_id})

            console.log(`✅ Mapped sensor ${sensor_id} to device ${device_id}`)

            // Emit event for new device-sensor mapping
            io.emit("device-sensor-mapped", mapping)

            res.status(201).json(mapping)
        } catch (error) {
            console.error("❌ Error mapping sensor to device:", error.message)
            res.status(500).json({error: "Failed to map sensor to device"})
        }
    })

    // Remove a device-sensor mapping
    router.delete("/device-sensor/:id", async (req, res) => {
        try {
            const {id} = req.params
            await DeviceSensor.destroy({where: {id}})
            console.log(`🗑️ Removed device-sensor mapping: ${id}`)
            res.sendStatus(204)
        } catch (error) {
            console.error("❌ Error deleting device-sensor mapping:", error.message)
            res.status(500).json({error: "Failed to delete mapping"})
        }
    })

    /** 🚀 Sensor Readings Endpoints */

    // Get all readings for a particular device sensor (with optional filtering)
    router.get("/sensor-readings", async (req, res) => {
        try {
            const {device_sensor_id} = req.query
            const whereClause = device_sensor_id ? {device_sensor_id} : {}
            const readings = await SensorReading.findAll({where: whereClause, order: [["time", "DESC"]]})

            console.log(`📡 Fetched ${readings.length} sensor readings`)
            res.json(readings)
        } catch (error) {
            console.error("❌ Error fetching sensor readings:", error.message)
            res.status(500).json({error: "Failed to fetch sensor readings"})
        }
    })

    // Get latest sensors reading for all sensors of a given device
    router.get("/latest-sensors-reading", async (req, res) => {
        try {
            const {device_id} = req.query
            if (!device_id) {
                return res.status(400).json({error: "device_id is required"})
            }

            console.log(`📡 Fetching sensor readings for device ${device_id}`)

            // Find all device-sensor mappings for the given device
            const deviceSensors = await DeviceSensor.findAll({
                where: {device_id},
                include: [{model: Sensor, as: "sensor"}]
            })

            if (deviceSensors.length === 0) {
                console.log(`⚠️ No sensors found for device ${device_id}`)
                return res.json([])
            }

            // Get the latest readings for each sensor
            const readings = await Promise.all(
                deviceSensors.map(async (ds) => {
                    const latestReading = await SensorReading.findOne({
                        where: {device_sensor_id: ds.id},
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

            console.log(`✅ Retrieved ${readings.length} sensor readings for device ${device_id}`)
            res.json(readings)
        } catch (error) {
            console.error("❌ Error fetching sensor readings for device:", error.message)
            res.status(500).json({error: "Failed to fetch sensor readings"})
        }
    })

    // Add a new sensor reading
    router.post("/sensor-reading", async (req, res) => {
        try {
            const { device_sensor_id, time, value, no_validation, no_response_body } = req.body

            if (!no_validation) {
                const exists = await DeviceSensor.findByPk(device_sensor_id)
                if (!exists) {
                    console.warn(`⚠️ Validation failed: device_sensor_id ${device_sensor_id} not found`)
                    return res.status(400).json({ error: "Invalid device_sensor_id" })
                }
            }

            const newReading = await SensorReading.create({ time, device_sensor_id, value })
            console.log(`✅ Created sensor reading: ${device_sensor_id} => ${value} at ${time}`)

            // Emit WebSocket event
            const room = `device-sensor-id-${device_sensor_id}`
            io.to(room).emit("sensor-update", { device_sensor_id, time, value })
            console.log(`📡 Emitted "sensor-update" to ${room}`)

            if (no_response_body) return res.sendStatus(201)
            res.status(201).json(newReading)
        } catch (error) {
            console.error("❌ Error creating sensor reading:", error.message)
            res.status(500).json({ error: "Failed to create sensor reading" })
        }
    })

    // Bulk add sensor readings for a specific device
    router.post("/sensor-readings/:device_id", async (req, res) => {
        try {
            const { device_id } = req.params
            const { readings, no_validation, no_response_body } = req.body

            if (!Array.isArray(readings) || readings.length === 0) {
                return res.status(400).json({ error: "Readings must be a non-empty array" })
            }

            let validMappings = new Set()
            if (!no_validation) {
                const mappings = await DeviceSensor.findAll({ where: { device_id } })
                validMappings = new Set(mappings.map(m => m.id))
            }

            const results = []
            const createdReadings = []

            for (const { device_sensor_id, time, value } of readings) {
                let added = true
                let reason = ""

                if (!no_validation && !validMappings.has(device_sensor_id)) {
                    added = false
                    reason = "invalid_mapping"
                }

                if (added) {
                    const reading = await SensorReading.create({ time, device_sensor_id, value })
                    createdReadings.push(reading)
                }

                results.push({ device_sensor_id, time, value, added, reason })
            }

            console.log(`✅ Processed ${readings.length} readings for device ${device_id}`)

            // Emit bulk WebSocket event
            io.to(`device-id-${device_id}`).emit("sensors-update", {
                device_id,
                readings: results
            })
            console.log(`📡 Emitted "sensors-update" to device-id-${device_id}`)

            if (no_response_body) return res.sendStatus(201)
            res.status(201).json(results)
        } catch (error) {
            console.error("❌ Error processing sensor readings:", error.message)
            res.status(500).json({ error: "Failed to process sensor readings" })
        }
    })


    // Delete a sensor reading
    router.delete("/sensor-reading/:id", async (req, res) => {
        try {
            const {id} = req.params
            await SensorReading.destroy({where: {id}})
            console.log(`🗑️ Deleted sensor reading: ${id}`)
            res.sendStatus(204)
        } catch (error) {
            console.error("❌ Error deleting sensor reading:", error.message)
            res.status(500).json({error: "Failed to delete sensor reading"})
        }
    })

    return router
}

module.exports = createRouter