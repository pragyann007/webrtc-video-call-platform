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
    console.log(`socket connected : ${socket.id}`);

    socket.on("join-room",(roomId)=>{
        // we are getting the particular rrom with the rrom id 
        // in socket there is many many roomsso we are intersted in that room
        // where our user is in which is obtain from roomId 
        const room = io.sockets.adapter.rooms.get(roomId);

        const numusers = room? room.size : 0 ; //we got the no of user in that room 

        if(numusers >= 2){
            socket.emit("room-full");
            return ;
        }
        // as this is p2p call so if the no of sockets in room is more than 2 then returning else joining that socket to the room 

        socket.join(roomId);

        socket.roomId = roomId ;

        if(numusers===0){
            // if only 1 person thenn wait...
            socket.emit("waiting");

        }else{
            // if its alrdy 1 then it means alrdy one is there and u joined means there are 2 ones so you are then eleigible 
            socket.emit("ready");
            socket.to(roomId).emit("initiate-offer");

        }

        socket.on("offer",(offer)=>{
            socket.to(socket.roomId).emit("offer",offer)
        })

        socket.on("answer",(answer)=>{
            socket.to(socket.roomId).emit("answer",answer)
        })

        socket.on("ice-candidtae",(candidate)=>{
            socket.to(socket.roomId).emit("ice-candidate",candidate);
        })

        socket.on("disconnect",()=>{
            socket.to(socket.roomId).emit("peer-disconnected ")
        })



    })



})





app.get("/",(req,res)=>{


    res.send("hi i am pragyan the fucking great full staclk web dev ")
})


server.listen(port,()=>{
    console.log("server is running at port " , port )
})