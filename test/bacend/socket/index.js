import { io } from "../server.js"

export const socketFunc = ()=>{

    // random match features
    



    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id)
    })

}