import React, { useEffect, useState } from 'react'
import { io } from "socket.io-client"
const socket = io("http://localhost:8080")


const App = () => {

  const [name,setName] = useState()
  const [id,setId] = useState(null)

  useEffect(()=>{

    socket.on("connected-user",data=>{
      console.log(data)
    })

  },[])

  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302' // Public Google STUN server
      },
    ]
    
  })

  const streams = navigator.mediaDevices.getUserMedia({audio:true,video:true})

  streams.getTracks().foreach(async(track)=>{

   await  pc.addTrack(track,streams)
  })


  const createOffer = async()=>{
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
  }






  const handleSubmit = (e)=>{
    e.preventDefault()

    socket.emit("join-room",{name,id});


  }




  return (
    <div>

      <form action="" onSubmit={handleSubmit} >
        <h3>Enter name, </h3>
        <input  value={name} onChange={(e)=>setName(e.target.value)} type="text" />

        <h3>Enter id, </h3>
        <input type="number" value={id} onChange={(e)=>setId(e.target.value)} />

        <button>Join room </button>



      </form>
      


    </div>
  )
}

export default App