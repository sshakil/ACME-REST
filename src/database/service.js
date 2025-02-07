const {Op, Sequelize} = require("sequelize")
const {emitEvent, logAction} = require("../routes/util")

/* Fetches all records of a given model. */
const getAllRecords = async (model) => {
    const records = await model.findAll()
    logAction("Fetched", model, `${records.length} records`)
    return records.length ? records : null
}

/* Fetches records by a specific field value. */
const getRecordsByField = async (model, field, value, options = {}) => {
    const records = await model.findAll({where: {[field]: value}, ...options})
    logAction(records.length ? "Fetched" : "Fetched (empty)", `${model.name} by ${field}`, value)
    return records.length ? records : null
}

/* Creates a single record with optional uniqueness check. */
const createRecord = async (model, data, uniqueFields = []) => {
    let record
    let added = true
    let message = "new"

    try {
        if (uniqueFields.length) {
            record = await model.findOne({
                where: Object.fromEntries(uniqueFields.map(field => [field, data[field]])),
            })
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
    }

    logAction(added ? "Created" : "Skipped creating", model, JSON.stringify({id: record?.id, added, message}))
    return {
        id: record?.id || null,
        time: record?.createdAt || new Date().toISOString(),
        ...(record?.name ? {name: record.name} : {}),
        type: record?.type || model.name.toLowerCase(),
        added,
        message
    }
}

/* Bulk creates records */
const createRecords = async (io, model, eventName, dataList, uniqueFields = [], emit = true) => {
    if (!model) throw new Error("Model must be provided")
    if (!Array.isArray(dataList) || !dataList.length) {
        throw new Error("Input must be a non-empty array of objects")
    }

    let insertedRecords = []
    let existingRecords = []

    if (uniqueFields.length) {
        const whereClauses = dataList.map(item =>
            Object.fromEntries(uniqueFields.map(field => [field, item[field]]))
        )

        existingRecords = await model.findAll({where: {[Op.or]: whereClauses}})
        const existingKeys = new Set(existingRecords.map(r => JSON.stringify(r.dataValues)))

        const newRecords = dataList.filter(item => !existingKeys.has(JSON.stringify(item)))

        if (newRecords.length) {
            try {
                for (const record of newRecords) {
                    const [createdRecord, created] = await model.findOrCreate({
                        where: Object.fromEntries(uniqueFields.map(field => [field, record[field]])),
                        defaults: record
                    })

                    if (created) {
                        insertedRecords.push(createdRecord)
                    } else {
                        existingRecords.push(createdRecord)
                    }
                }
            } catch (e) {
                logAction("Failed", model, `Error: ${e.message}`, false)
                throw e
            }
        }
    }

    const finalRecords = insertedRecords.concat(existingRecords)

    if (insertedRecords.length) {
        logAction("Bulk Created", model, `${insertedRecords.length} new records`)
    }

    // 🔹 Event emission **only for newly created records**, if `emit` is true
    if (emit && insertedRecords.length) {
        emitEvent(io, eventName, model.name.toLowerCase(), insertedRecords.map(item => ({
            id: item.id,
            time: item.createdAt || new Date().toISOString(),
            added: true,
            message: "new"
        })))
    }

    return finalRecords.map(item => ({
        id: item.id,
        time: item.createdAt || new Date().toISOString(),
        added: !existingRecords.includes(item),
        message: existingRecords.includes(item) ? "pre-existed" : "new"
    }))
}

/* Deletes a record by ID. */
const deleteRecord = async (model, id) => {
    const deleted = await model.destroy({where: {id}})

    logAction(
        deleted ? "Deleted" : "Deletion failed",
        model,
        `ID: ${id}`,
        deleted
    )

    return deleted
}

/* Updates a record by ID. */
const updateRecord = async (model, id, data) => {
    const [updatedRows] = await model.update(data, {where: {id}})

    logAction(
        updatedRows ? "Updated" : "Update failed",
        model,
        `ID: ${id}, Data: ${JSON.stringify(data)}`,
        updatedRows
    )

    return updatedRows // Returns the number of updated rows
}

/* Validates foreign key relationships dynamically. */
const validateForeignKey = async (model, field, value) => {
    const record = await model.findOne({where: {[field]: value}})
    return !!record
}

module.exports = {
    getAllRecords,
    getRecordsByField,
    createRecord,
    createRecords,
    updateRecord,
    deleteRecord,
    validateForeignKey,
}