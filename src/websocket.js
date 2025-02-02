const { Server } = require("socket.io")

function setupWebSocket(server) {
    const io = new Server(server, { cors: { origin: "*" } })

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