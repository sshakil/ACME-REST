const express = require("express");
const { Device, Sensor, DeviceSensor, SensorReading } = require("./models");

const router = express.Router();

/** 🚀 Devices Endpoints */
// Get all devices
router.get("/devices", async (req, res) => {
    try {
        const devices = await Device.findAll();
        res.json(devices);
    } catch (error) {
        console.error("Error fetching devices:", error);
        res.status(500).json({ error: "Failed to fetch devices" });
    }
});

// Create a new device
router.post("/devices", async (req, res) => {
    try {
        const { name, type } = req.body;
        const newDevice = await Device.create({ name, type });
        res.status(201).json(newDevice);
    } catch (error) {
        console.error("Error creating device:", error);
        res.status(500).json({ error: "Failed to create device" });
    }
});

// Delete a device (Cascade deletes device-sensor mappings)
router.delete("/devices/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await Device.destroy({ where: { id } });
        res.sendStatus(204);
    } catch (error) {
        console.error("Error deleting device:", error);
        res.status(500).json({ error: "Failed to delete device" });
    }
});

/** 🚀 Sensors Endpoints */
// Get all sensors
router.get("/sensors", async (req, res) => {
    try {
        const sensors = await Sensor.findAll();
        res.json(sensors);
    } catch (error) {
        console.error("Error fetching sensors:", error);
        res.status(500).json({ error: "Failed to fetch sensors" });
    }
});

// Create a new sensor
router.post("/sensors", async (req, res) => {
    try {
        const { type, unit } = req.body;
        const newSensor = await Sensor.create({ type, unit });
        res.status(201).json(newSensor);
    } catch (error) {
        console.error("Error creating sensor:", error);
        res.status(500).json({ error: "Failed to create sensor" });
    }
});

// Delete a sensor (Cascade deletes device-sensor mappings)
router.delete("/sensors/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await Sensor.destroy({ where: { id } });
        res.sendStatus(204);
    } catch (error) {
        console.error("Error deleting sensor:", error);
        res.status(500).json({ error: "Failed to delete sensor" });
    }
});

/** 🚀 Device-Sensors Mapping Endpoints */
// Get all device-sensor mappings
router.get("/device-sensors", async (req, res) => {
    try {
        const mappings = await DeviceSensor.findAll();
        res.json(mappings);
    } catch (error) {
        console.error("Error fetching device-sensor mappings:", error);
        res.status(500).json({ error: "Failed to fetch mappings" });
    }
});

// Map a sensor to a device
router.post("/device-sensors", async (req, res) => {
    try {
        const { device_id, sensor_id } = req.body;
        const mapping = await DeviceSensor.create({ device_id, sensor_id });
        res.status(201).json(mapping);
    } catch (error) {
        console.error("Error mapping sensor to device:", error);
        res.status(500).json({ error: "Failed to map sensor to device" });
    }
});

// Remove a device-sensor mapping
router.delete("/device-sensors/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await DeviceSensor.destroy({ where: { id } });
        res.sendStatus(204);
    } catch (error) {
        console.error("Error deleting device-sensor mapping:", error);
        res.status(500).json({ error: "Failed to delete mapping" });
    }
});

/** 🚀 Sensor Readings Endpoints */
// Get all sensor readings (with optional filtering)
router.get("/sensor-readings", async (req, res) => {
    try {
        const { device_sensor_id } = req.query;
        const whereClause = device_sensor_id ? { device_sensor_id } : {};
        const readings = await SensorReading.findAll({ where: whereClause, order: [["time", "DESC"]] });
        res.json(readings);
    } catch (error) {
        console.error("Error fetching sensor readings:", error);
        res.status(500).json({ error: "Failed to fetch sensor readings" });
    }
});

// Add a new sensor reading
router.post("/sensor-readings", async (req, res) => {
    try {
        const { time, device_sensor_id, value } = req.body;
        const newReading = await SensorReading.create({ time, device_sensor_id, value });
        res.status(201).json(newReading);
    } catch (error) {
        console.error("Error creating sensor reading:", error);
        res.status(500).json({ error: "Failed to create sensor reading" });
    }
});

// Delete a sensor reading
router.delete("/sensor-readings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await SensorReading.destroy({ where: { id } });
        res.sendStatus(204);
    } catch (error) {
        console.error("Error deleting sensor reading:", error);
        res.status(500).json({ error: "Failed to delete sensor reading" });
    }
});

module.exports = router;