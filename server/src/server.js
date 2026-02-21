import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "node:http"
import { Server } from "socket.io"

dotenv.config()

const port = process.env.PORT
const app = express()
const server = http.createServer(app)

const io = new Server(server, {
    cors: { origin: "http://localhost:5173" }
})

io.on("connection", (socket) => {
    console.log(`socket connected: ${socket.id}`)

    socket.on("join-room", (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId)
        const numUsers = room ? room.size : 0

        if (numUsers >= 2) {
            socket.emit("room-full")
            return
        }

        socket.join(roomId)
        socket.roomId = roomId

        if (numUsers === 0) {
            socket.emit("waiting")
        } else {
            socket.emit("ready")
            socket.to(roomId).emit("initiate-offer")
        }
    })

    // ✅ All listeners outside join-room
    socket.on("offer", (offer) => {
        socket.to(socket.roomId).emit("offer", offer)
    })

    socket.on("answer", (answer) => {
        socket.to(socket.roomId).emit("answer", answer)
    })

    socket.on("ice-candidate", (candidate) => {        // ✅ typo fixed
        socket.to(socket.roomId).emit("ice-candidate", candidate)
    })

    socket.on("disconnect", () => {
        socket.to(socket.roomId).emit("peer-disconnected")  // ✅ no trailing space
    })
})

app.get("/", (req, res) => {
    res.send("server running")
})

server.listen(port, () => {
    console.log("server running at port", port)
})