const {Server} = require("socket.io")

// Read WebSocket logging level from environment variables
const wsEmitLogging = process.env.WS_EMIT_LOGGING || "minimal"
const validLogLevels = ["disabled", "minimal", "verbose"]
const logLevel = validLogLevels.includes(wsEmitLogging) ? wsEmitLogging : "minimal"

function logEmit(event, room, args) {
    if (logLevel === "minimal") {
        console.log(`📡 [WebSocket] ${room ? `(room: ${room})` : ""} Emitted event: "${event}"`)
    } else if (logLevel === "verbose") {
        console.log(`📡 [WebSocket] ${room ? `(room: ${room})` : ""} Emitting "${event}" with data:`,
            JSON.stringify(args, null, 2)
        )
    }
}

function setupWebSocket(server) {
    const io = new Server(server, {cors: {origin: "*"}})

    // Wrap `io.emit` to control logging based on level
    const originalEmit = io.emit
    io.emit = function (event, ...args) {
        if (logLevel !== "disabled") {
            logEmit(event, null, args)
        }
        return originalEmit.apply(io, [event, ...args])
    }

    // Wrap `.to().emit` for room-based emissions
    const originalTo = io.to
    io.to = function (room) {
        return {
            emit: (event, ...args) => {
                if (logLevel !== "disabled") {
                    logEmit(event, room, args)
                }
                return originalTo.call(io, room).emit(event, ...args)
            }
        }
    }

    io.on("connection", (socket) => {
        console.log("🔌 [WebSocket] New client connected")

        socket.on("subscribeToDevice", (room) => {
            console.log(`📡 [WebSocket] Client subscribed to ${room}`)
            socket.join(room)
        })

        socket.on("disconnect", () => {
            console.log("❌ [WebSocket] Client disconnected")
        })
    })

    return io
}

module.exports = setupWebSocket