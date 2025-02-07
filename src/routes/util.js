/**
 * Wraps an asynchronous function with error handling.
 */
const handleAsync = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error.message)
        res.status(500).json({error: "Internal server error"})
    }
}

/**
 * Logs an action performed on an entity.
 */
const logAction = (action, model, details = "", success = true) => {
    console.log(
        `${success ? "✅" : "❌"} ${action} ${
            model && (typeof model === "string"
                ? model
                : model.name || "UnknownModel")
        }${details ? `: ${details}` : ""}`
    )
}

/**
 * Emits an event via WebSocket and sends a response.
 */
const emitEvent = (io, eventName, room, data) => {
    // logging and error handling in websocket.js middleware
    io.to(room).emit(eventName, data)
}

module.exports = {handleAsync, logAction, emitEvent}