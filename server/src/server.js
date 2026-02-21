import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "node:http"
import {Server} from "socket.io"
dotenv.config()

const port = process.env.PORT

const app = express()
const server = http.createServer(app)

const io = new Server(server,{
    cors:{
        origin:"http://localhost:5173"
    }
})


io.on("connection",(socket)=>{
    console.log(`socket connected with an id of ${socket.id}`)
})

app.get("/",(req,res)=>{


    res.send("hi i am pragyan the fucking great full staclk web dev ")
})


server.listen(port,()=>{
    console.log("server is running at port " , port )
})