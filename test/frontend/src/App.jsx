import React, { useEffect } from 'react'
import {io} from "socket.io-client"


const App = () => {
  useEffect(()=>{
    const socket = io("http://localhost:8080")
    socket.on("connect",()=>{
      console.log("connected")
    })

    socket.emit("find-match");
    socket.on("matched",({room,initiator})=>{
      console.log("matched in room:",room,"initiator:",initiator)

  

    })

    socket.on("waiting",()=>{
      console.log("waiting for a match...")
    })

    // web rtc implementation will go here
    



  })
  return (
    <div>App</div>
  )
}

export default App