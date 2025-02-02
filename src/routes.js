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
    router.post("/device-sensors", async (req, res) => {
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
    router.delete("/device-sensors/:id", async (req, res) => {
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

    // Get all sensor readings (with optional filtering)
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

    // Add a new sensor reading
    router.post("/sensor-readings", async (req, res) => {
        try {
            const {time, device_sensor_id, value} = req.body
            const newReading = await SensorReading.create({time, device_sensor_id, value})

            console.log(`✅ Created sensor reading: ${device_sensor_id} => ${value} at ${time}`)

            // Emit WebSocket event to subscribers of this device
            io.to(`device-${device_sensor_id}`).emit("sensor-update", {device_sensor_id, time, value})

            res.status(201).json(newReading)
        } catch (error) {
            console.error("❌ Error creating sensor reading:", error.message)
            res.status(500).json({error: "Failed to create sensor reading"})
        }
    })

    // Delete a sensor reading
    router.delete("/sensor-readings/:id", async (req, res) => {
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