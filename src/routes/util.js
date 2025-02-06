/**
 * Wraps an asynchronous function with error handling.
 */
const handleAsync = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error.message)
        res.status(500).json({ error: "Internal server error" })
    }
}

/**
 * Logs an action performed on an entity.
 */
const logAction = (action, entity, details = "") => {
    console.log(`✅ ${action} ${entity}${details ? `: ${details}` : ""}`)
}

/**
 * Emits an event via WebSocket and sends a response.
 */
const emitEvent = (io, eventName, room, data) => {
    try {
        io.to(room).emit(eventName, data)
        console.log(`📡 Emitted "${eventName}" to ${room}`)
    } catch (err) {
        console.error(`❌ Failed to emit event "${eventName}" to ${room}:`, err)
    }
}

module.exports = { handleAsync, logAction, emitEvent }