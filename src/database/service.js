const { Op, Sequelize} = require("sequelize")
const {emitEvent} = require("../routes/util");

/**
 * Logs an action performed on an entity.
 */
const logAction = (action, entity, details = "") => {
    console.log(`✅ ${action} ${entity}${details ? `: ${details}` : ""}`)
}

/**
 * Fetches all records of a given model.
 */
const getAllRecords = async (model) => {
    const records = await model.findAll()

    logAction("Fetched", model.name, `${records.length} records`)
    return records.length ? records : null
}

/**
 * Fetches records by a specific field value.
 */
const getRecordsByField = async (model, field, value, options = {}) => {
    const records = await model.findAll({ where: { [field]: value }, ...options })

    logAction(records.length ? "Fetched" : "Fetched (empty)", `${model.name} by ${field}`, value)
    return records.length ? records : null
}

/**
 * Creates a single record with optional uniqueness check.
 */
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

    logAction(added ? "Created" : "Skipped creating", model.name, JSON.stringify({ id: record?.id, added, message }))
    return { id: record?.id, time: record?.createdAt || new Date().toISOString(), added, message }
}

/**
 * Bulk creates records without HTTP request/response handling.
 */
const createRecords = async (io, model, entityName, eventName, dataList, uniqueFields = []) => {
    if (!Array.isArray(dataList) || !dataList.length) {
        throw new Error("Input must be a non-empty array of objects")
    }

    let newRecords = dataList
    let existingRecords = []

    if (uniqueFields.length) {
        const whereClauses = dataList.map(item =>
            Object.fromEntries(uniqueFields.map(field => [field, item[field]]))
        )

        existingRecords = await model.findAll({ where: { [Op.or]: whereClauses } })
        const existingKeys = new Set(existingRecords.map(r => JSON.stringify(r.dataValues)))
        newRecords = dataList.filter(item => !existingKeys.has(JSON.stringify(item)))
    }

    if (newRecords.length) {
        await model.bulkCreate(newRecords)
        logAction("Bulk Created", entityName, `${newRecords.length} records`)
    }

    dataList.forEach(item => {
        const exists = existingRecords.some(r => uniqueFields.every(field => r[field] === item[field]))
        const responseData = {
            id: exists ? existingRecords.find(r => uniqueFields.every(field => r[field] === item[field]))?.id : null,
            time: new Date().toISOString(),
            added: !exists,
            message: exists ? "pre-existed" : "new"
        }

        logAction(responseData.added ? "Created" : "Skipped", entityName, JSON.stringify(responseData))
        emitEvent(io, eventName, entityName, responseData)
    })

    return dataList.map(item => ({
        id: existingRecords.find(r => uniqueFields.every(field => r[field] === item[field]))?.id || null,
        time: new Date().toISOString(),
        added: !existingRecords.some(r => uniqueFields.every(field => r[field] === item[field])),
        message: existingRecords.some(r => uniqueFields.every(field => r[field] === item[field])) ? "pre-existed" : "new"
    }))
}


/**
 * Deletes a record by ID.
 */
const deleteRecord = async (model, id) => {
    const deleted = await model.destroy({ where: { id } })

    logAction(deleted ? "Deleted" : "Deletion failed", model.name, `ID: ${id}`)
    return deleted
}

/**
 * Validates foreign key relationships dynamically.
 */
const validateForeignKey = async (model, field, value) => {
    const record = await model.findOne({ where: { [field]: value } })
    return !!record
}

module.exports = {
    getAllRecords,
    getRecordsByField,
    createRecord,
    createRecords,
    deleteRecord,
    validateForeignKey,
}