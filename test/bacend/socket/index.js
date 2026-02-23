import { io } from "../server.js"

export const socketFunc = ()=>{

    // random match features

    const waitingQuee = [];
    // waitingQuee = [ "sadikshya"  ]
    const activePairs = new Map();

io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on("find-match",()=>{
            if(waitingQuee.length>0){

                const partnerId = waitingQuee.shift();
                // waitingQuee = ["hell"  ]-> partnerId = "hell"  -> waitingQuee = []

                const partnerSocket = io.sockets.sockets.get(partnerId);

                if(!partnerSocket){
                    socket.emit("find-match");
                    return;
                }

                const roomId = `room-${socket.id}-${partnerId}`;

                socket.join(roomId);
                partnerSocket.join(roomId);

                activePairs.set(socket.id,partnerId);
                activePairs.set(partnerId,socket.id);

                partnerSocket.emit("matched",{room:roomId,initiator:true});

                socket.emit("matched",{room:roomId,initiator:false});

                // testingg onlyyy



           
                
             
                
               
             
                




            }
            else{
                waitingQuee.push(socket.id);
                socket.emit("waiting");
            }

        })

        socket.on("offer",({offer,room})=>{
            socket.to(room).emit("offer",{offer,room});
        })

        socket.on("answer",({answer,room})=>{
            socket.to(room).emit("answer",{answer,room});
        })


        socket.on("ice-candidate",({candidate,room})=>{
            socket.to(room).emit("ice-candidate",{candidate,room});
        })


       


    })

}