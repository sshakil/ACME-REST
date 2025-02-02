const { DataTypes } = require("sequelize")
const sequelize = require("./db")

// Devices Table (Explicit table name set to "devices")
const Device = sequelize.define("Device", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    tableName: "devices",
    indexes: [
        { fields: ["type"], name: "idx_devices_type" },
        { fields: ["created_at"], name: "idx_devices_created_at" }
    ],
    timestamps: false
})

// Sensors Table
const Sensor = sequelize.define("Sensor", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.TEXT, allowNull: false, unique: true },
    unit: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    tableName: "sensors",
    indexes: [
        { fields: ["type"], name: "idx_sensors_type" },
        { fields: ["created_at"], name: "idx_sensors_created_at" }
    ],
    timestamps: false
})

// Device_Sensors (Maps Sensors to Devices - Many-to-Many)
const DeviceSensor = sequelize.define("DeviceSensor", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    device_id: { type: DataTypes.INTEGER, references: { model: Device, key: "id" }, onDelete: "CASCADE" },
    sensor_id: { type: DataTypes.INTEGER, references: { model: Sensor, key: "id" }, onDelete: "CASCADE" }
}, {
    tableName: "device_sensors",
    indexes: [
        { fields: ["device_id"], name: "idx_device_sensors_device_id" },
        { fields: ["sensor_id"], name: "idx_device_sensors_sensor_id" }
    ],
    timestamps: false
})

// Sensor Readings Table (Hypertable in TimescaleDB)
const SensorReading = sequelize.define("SensorReading", {
    time: { type: DataTypes.DATE, allowNull: false, primaryKey: true },
    device_sensor_id: {
        type: DataTypes.INTEGER,
        references: { model: DeviceSensor, key: "id" },
        onDelete: "CASCADE",
        primaryKey: true
    },
    value: { type: DataTypes.FLOAT, allowNull: false, primaryKey: true }
}, {
    tableName: "sensor_readings",
    indexes: [
        { fields: ["time"], name: "idx_sensor_readings_time", order: "DESC" },
        { fields: ["device_sensor_id"], name: "idx_sensor_readings_device_sensor_id" },
        { fields: ["value"], name: "idx_sensor_readings_value" }
    ],
    timestamps: false
})

// Associations
Device.belongsToMany(Sensor, { through: DeviceSensor, foreignKey: "device_id", onDelete: "CASCADE" })
Sensor.belongsToMany(Device, { through: DeviceSensor, foreignKey: "sensor_id", onDelete: "CASCADE" })

DeviceSensor.hasMany(SensorReading, { foreignKey: "device_sensor_id", onDelete: "CASCADE" })
SensorReading.belongsTo(DeviceSensor, { foreignKey: "device_sensor_id" })

module.exports = { sequelize, Device, Sensor, DeviceSensor, SensorReading }
