/**
 * Wraps an asynchronous function with error handling.
 */
const handleAsync = (fn) => async (req, res) => {
    try {
        await fn(req, res)
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error.message)
        console.log("")
        res.status(500).json({ error: "Internal server error" })
    }
}

/**
 * Logs an action performed on an entity.
 */
const logAction = (action, entity, details = "") => {
    console.log(`✅ ${action} ${entity}${details ? `: ${details}` : ""}`)
    console.log("")
}

/**
 * Emits a WebSocket event to a specific room.
 */
const emitEvent = (io) => (event, room, data) => {
    io.to(room).emit(event, data)
    console.log(`📡 Emitted "${event}" to ${room}`)
    console.log("")
}

/**
 * Fetches all records of a given model.
 */
const getAllRecords = (model, entityName) =>
    handleAsync(async (req, res) => {
        const records = await model.findAll()
        if (!records.length) return res.sendStatus(204)
        logAction("Fetched", entityName, `${records.length} records`)
        res.json(records)
    })

/**
 * Fetches records by a specific field value.
 */
const getRecordsByField = (model, entityName, field, options = {}) =>
    handleAsync(async (req, res) => {
        const value = req.params[field]
        const records = await model.findAll({
            where: { [field]: value },
            ...options
        })
        if (!records.length) return res.sendStatus(204)
        logAction("Fetched", `${entityName} by ${field}`, value)
        res.json(records)
    })

/**
 * Creates a new record in the database and emits an event.
 */
const createRecord = (io) => (model, entityName, eventName) =>
    handleAsync(async (req, res) => {
        const record = await model.create(req.body)
        logAction("Created", entityName, JSON.stringify(req.body))

        emitEvent(io)(eventName, "global", record)
        console.log("")

        res.status(201).json(record)
    })

/**
 * Deletes a record by ID.
 */
const deleteRecord = (model, entityName) =>
    handleAsync(async (req, res) => {
        const { id } = req.params
        const deleted = await model.destroy({ where: { id } })
        if (!deleted) return res.status(404).json({ error: `${entityName} not found` })
        logAction("Deleted", entityName, id)
        console.log("")
        res.sendStatus(204)
    })

/**
 * Exports the base route utilities, ensuring `io` is passed correctly.
 */
module.exports = (io) => ({
    handleAsync,
    logAction,
    emitEvent: emitEvent(io),
    getAllRecords,
    getRecordsByField,
    createRecord: createRecord(io),
    deleteRecord
})