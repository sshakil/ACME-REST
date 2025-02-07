const {Server} = require("socket.io")
const config = require("./config")

const validLogLevels = ["disabled", "minimal", "verbose"]
const logLevel = validLogLevels.includes(config.websocketLogLevel) ? config.websocketLogLevel : "minimal"

function logEmit(event, room, args) {
    if (logLevel === "minimal") {
        console.log(`📡 [WebSocket] ${room ? `(room: ${room})` : ""} Emitted event: "${event}"`)
    } else if (logLevel === "verbose") {
        console.log(`📡 [WebSocket] ${room ? `(room: ${room})` : ""} Emitting "${event}" with data:`, JSON.stringify(args, null, 2))
    }
}

function setupWebSocket(server) {
    const io = new Server(server, {cors: {origin: "*"}})

    // Wrap `io.emit` with error handling
    const originalEmit = io.emit
    io.emit = function (event, ...args) {
        try {
            if (logLevel !== "disabled") {
                logEmit(event, null, args)
            }
            return originalEmit.apply(io, [event, ...args])
        } catch (error) {
            console.error(`❌ Error emitting event "${event}":`, error)
        }
    }

    // Wrap `.to().emit` for room-based emissions with error handling
    const originalTo = io.to
    io.to = function (room) {
        return {
            emit: (event, ...args) => {
                try {
                    if (logLevel !== "disabled") {
                        logEmit(event, room, args)
                    }
                    return originalTo.call(io, room).emit(event, ...args)
                } catch (error) {
                    console.error(`❌ Error emitting event "${event}" to room "${room}":`, error)
                }
            }
        }
    }

    io.on("connection", (socket) => {
        console.log("🔌 [WebSocket] New client connected")

        socket.on("subscribe", (room) => {
            try {
                console.log(`📡 [WebSocket] Client subscribed to ${room}`)
                socket.join(room)
            } catch (error) {
                console.error(`❌ Error subscribing client to room "${room}":`, error)
            }
        })

        socket.on("disconnect", () => {
            console.log("🔌 [WebSocket] Client disconnected")
        })
    })

    return io
}

module.exports = setupWebSocket