/**
 * Wraps an asynchronous function with error handling.
 */
const handleAsync = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
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
    try {
        io.to(room).emit(event, data)
        console.log(`📡 Emitted "${event}" to ${room}`)
        console.log("")
    } catch (err) {
        console.error(`❌ Failed to emit event "${event}" to ${room}:`, err)
    }
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
 * Handles the logic for creating records, used by both `createRecord` and `createRecords`.
 */
const processRecordCreation = async (model, entityName, data, uniqueFields = []) => {
    let record, added = true, message = "new"

    try {
        let whereClause = null

        // Only check for existing records if uniqueFields are provided
        if (uniqueFields.length) {
            whereClause = { where: Object.fromEntries(uniqueFields.map(field => [field, data[field]])) }
            record = await model.findOne(whereClause)
        }

        if (record) {
            added = false
            message = "pre-existed"
        } else {
            record = await model.create(data)
        }
    } catch (error) {
        added = false
        message = error.message
        console.error(`❌ Failed to create ${entityName}:`, message)
    }

    return {
        id: record?.id || null,
        time: record?.createdAt || new Date().toISOString(),
        ...(record?.name ? { name: record.name } : {}),
        type: record?.type || entityName,
        added,
        message
    }
}

/**
 * Creates a new record in the database and emits an event.
 */
const createRecord = (io) => (model, entityName, eventName, uniqueFields = []) =>
    handleAsync(async (req, res) => {
        const responseData = await processRecordCreation(model, entityName, req.body, uniqueFields)

        logAction(responseData.added ? "Created" : "Skipped creating", entityName, JSON.stringify(responseData))
        emitEvent(io)(eventName, entityName, responseData)

        // If an error occurred, send a 500 response
        if (!responseData.added && responseData.message !== "pre-existed") {
            return res.status(500).json(responseData)
        }

        res.status(201).json(responseData)
    })

/**
 * Creates multiple new records in the database and emits an event for each.
 */
const createRecords = (io) => (model, entityName, eventName, uniqueFields = []) =>
    handleAsync(async (req, res) => {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ error: "Request body must be an array of objects" })
        }

        let results = await Promise.all(req.body.map(item => processRecordCreation(model, entityName, item, uniqueFields)))

        results.forEach(responseData => {
            logAction(responseData.added ? "Created" : "Skipped", entityName, JSON.stringify(responseData))
            emitEvent(io)(eventName, entityName, responseData)
        })

        res.status(201).json(results)
    })

const createRecordsWithoutReqResp = (io) => async (model, entityName, eventName, uniqueFields = [], records) => {
    if (!Array.isArray(records) || !records.length) {
        throw new Error("Input must be a non-empty array of objects")
    }

    let results = await Promise.all(records.map(item => processRecordCreation(model, entityName, item, uniqueFields)))

    results.forEach(responseData => {
        logAction(responseData.added ? "Created" : "Skipped", entityName, JSON.stringify(responseData))
        emitEvent(io)(eventName, entityName, responseData)
    })

    return results
}


/**
 * Deletes a record by ID.
 */
const deleteRecord = (io) => (model, entityName, eventName) =>
    handleAsync(async (req, res) => {
        const { id } = req.params
        const deleted = await model.destroy({ where: { id } })

        if (!deleted) {
            logAction(`Deletion failed for ${entityName} with id ${id}`, entityName)
            return res.status(404).json({ error: `${entityName} with ${id} not found` })
        }
        logAction("Deleted", entityName, id)
        emitEvent(io)(eventName, entityName, { id: id })

        res.status(200).send()
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
    createRecords: createRecords(io),
    createRecordsWithoutReqResp: createRecordsWithoutReqResp(io),
    deleteRecord: deleteRecord(io),
})