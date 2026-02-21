import React, { useEffect } from 'react'
import { io } from "socket.io-client"

const App = () => {

  const socket = io("http://localhost:8080")


  return (
    <div>
      

      <h1> Hi i am pragyan thapaliy a</h1>
    </div>
  )
}

export default App