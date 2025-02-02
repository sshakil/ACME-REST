const { Server } = require("socket.io");

function setupWebSocket(server) {
    const io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        console.log("🔌 New client connected");

        // Subscribe clients to specific device updates
        socket.on("subscribeToDevice", (deviceId) => {
            console.log(`📡 Client subscribed to device-${deviceId}`);
            socket.join(`device-${deviceId}`);
        });

        socket.on("disconnect", () => {
            console.log("❌ Client disconnected");
        });
    });

    return io;
}

module.exports = setupWebSocket;