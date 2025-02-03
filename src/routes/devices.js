const express = require("express")
const { Device } = require("../models")
const { getAllRecords, createRecord, deleteRecord } = require("./baseRoutes")

function createDeviceRoutes(io) {
    const router = express.Router()

    router.get("/", getAllRecords(Device, "devices"))
    router.post("/", createRecord(io, Device, "device", "device-created"))
    router.delete("/:id", deleteRecord(Device, "device"))

    return router
}

module.exports = createDeviceRoutes