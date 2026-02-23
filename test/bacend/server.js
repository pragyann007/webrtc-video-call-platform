
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { socketFunc } from './socket/index.js'

const app = express()
const server = http.createServer(app)
export const io = new Server(server, {
    cors: {
        origin: '*',
    },
    })

    socketFunc()


const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})  