const { Server } = require("socket.io")

function setupWebSocket(server) {
    const io = new Server(server, { cors: { origin: "*" } });

    // WebSocket Middleware Override: Logs all emitted events
    const originalEmit = io.emit
    io.emit = function (event, ...args) {
        console.log(`📡 WebSocket Middleware: Emitting event "${event}" with data:`, JSON.stringify(args, null, 2))
        return originalEmit.apply(io, [event, ...args])
    }

    // Wrap `.to().emit` to capture room-based emissions
    const originalTo = io.to
    io.to = function (room) {
        return {
            emit: (event, ...args) => {
                console.log(`📡 WebSocket Middleware (room: ${room}): Emitting event "${event}" with data:`, JSON.stringify(args, null, 2))
                return originalTo.call(io, room).emit(event, ...args)
            }
        }
    }


    io.on("connection", (socket) => {
        console.log("🔌 New client connected")

        // Subscribe clients to specific device updates
        socket.on("subscribeToDevice", (room) => {
            console.log(`📡 Client subscribed to ${room}`)
            socket.join(room)

        })

        socket.on("disconnect", () => {
            console.log("❌ Client disconnected")
        })
    })

    return io
}

module.exports = setupWebSocket