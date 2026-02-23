import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const App = () => {
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentRoomRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [callStarted, setCallStarted] = useState(false);

  // ---------------- SOCKET SETUP ----------------
  useEffect(() => {
    const socket = io("http://localhost:8080");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    socket.on("matched", async ({ room, initiator }) => {
      currentRoomRef.current = room;
      console.log("Matched:", room, "Initiator:", initiator);

      if (initiator) {
        await createOffer();
      }
    });

    socket.on("offer", async ({ offer }) => {
      await createAnswer(offer);
    });

    socket.on("answer", async ({ answer }) => {
      await pcRef.current.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("ICE error:", err);
      }
    });

    return () => socket.disconnect();
  }, []);

  // ---------------- LOCAL VIDEO FIX ----------------
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ---------------- START CALL ----------------
  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);

    createPeerConnection(stream);

    setCallStarted(true);

    socketRef.current.emit("find-match");
  };

  // ---------------- PEER CONNECTION ----------------
  const createPeerConnection = (stream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          candidate: event.candidate,
          room: currentRoomRef.current,
        });
      }
    };

    pcRef.current = pc;
  };

  // ---------------- OFFER ----------------
  const createOffer = async () => {
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socketRef.current.emit("offer", {
      offer,
      room: currentRoomRef.current,
    });
  };

  // ---------------- ANSWER ----------------
  const createAnswer = async (offer) => {
    await pcRef.current.setRemoteDescription(offer);

    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    socketRef.current.emit("answer", {
      answer,
      room: currentRoomRef.current,
    });
  };

  return (
    <div>
      <h1>WebRTC Omegle Demo</h1>
      <button onClick={startCall}>Start Call</button>

      {callStarted && (
        <div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "300px" }}
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "300px" }}
          />
        </div>
      )}
    </div>
  );
};

export default App;