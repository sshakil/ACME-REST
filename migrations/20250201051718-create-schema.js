"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Enable TimescaleDB extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');

    // Create Devices Table
    await queryInterface.createTable("devices", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.TEXT, allowNull: false },
      type: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
    });

    // Indexes for Devices
    await queryInterface.addIndex("devices", ["type"], { name: "idx_devices_type" });
    await queryInterface.addIndex("devices", ["created_at"], { name: "idx_devices_created_at" });

    // Create Sensors Table
    await queryInterface.createTable("sensors", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      type: { type: Sequelize.TEXT, allowNull: false, unique: true },
      unit: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn("NOW") },
    });

    // Indexes for Sensors
    await queryInterface.addIndex("sensors", ["type"], { name: "idx_sensors_type" });
    await queryInterface.addIndex("sensors", ["created_at"], { name: "idx_sensors_created_at" });

    // Create Device-Sensors Table
    await queryInterface.createTable("device_sensors", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      device_id: { type: Sequelize.INTEGER, references: { model: "devices", key: "id" }, onDelete: "CASCADE" },
      sensor_id: { type: Sequelize.INTEGER, references: { model: "sensors", key: "id" }, onDelete: "CASCADE" },
    });

    // Indexes for Device-Sensors
    await queryInterface.addIndex("device_sensors", ["device_id"], { name: "idx_device_sensors_device_id" });
    await queryInterface.addIndex("device_sensors", ["sensor_id"], { name: "idx_device_sensors_sensor_id" });

    // Create Sensor Readings Table
    await queryInterface.createTable("sensor_readings", {
      time: { type: Sequelize.DATE, allowNull: false, primaryKey: true },
      device_sensor_id: { type: Sequelize.INTEGER, references: { model: "device_sensors", key: "id" }, onDelete: "CASCADE" },
      value: { type: Sequelize.FLOAT, allowNull: false },
    });

    // Indexes for Sensor Readings
    await queryInterface.addIndex("sensor_readings", ["time"], { name: "idx_sensor_readings_time" });
    await queryInterface.addIndex("sensor_readings", ["device_sensor_id"], { name: "idx_sensor_readings_device_sensor_id" });
    await queryInterface.addIndex("sensor_readings", ["value"], { name: "idx_sensor_readings_value" });

    // Convert sensor_readings into a TimescaleDB hypertable
    await queryInterface.sequelize.query("SELECT create_hypertable('sensor_readings', 'time');");
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order to avoid dependency conflicts
    await queryInterface.dropTable("sensor_readings");
    await queryInterface.dropTable("device_sensors");
    await queryInterface.dropTable("sensors");
    await queryInterface.dropTable("devices");

    // Drop TimescaleDB extension (cascading dependencies)
    await queryInterface.sequelize.query("DROP EXTENSION IF EXISTS timescaledb CASCADE;");
  }
};