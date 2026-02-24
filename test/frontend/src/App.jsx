import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const App = () => {
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentRoomRef = useRef(null);
  const dataChannelRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [callStarted, setCallStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

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

  // ---------------- LOCAL VIDEO SYNC ----------------
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

  // ---------------- CREATE PEER ----------------
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

    // 🔥 RECEIVER SIDE DATA CHANNEL
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannelRef.current = channel;
      setupDataChannel(channel);
    };

    pcRef.current = pc;
  };

  // ---------------- OFFER (INITIATOR) ----------------
  const createOffer = async () => {
    // 🔥 CREATE DATA CHANNEL FIRST
    const channel = pcRef.current.createDataChannel("chat");
    dataChannelRef.current = channel;
    setupDataChannel(channel);

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

  // ---------------- DATA CHANNEL SETUP ----------------
  const setupDataChannel = (channel) => {
    channel.onopen = () => {
      console.log("Data channel opened 🔥");
    };

    channel.onmessage = (event) => {
      setMessages((prev) => [
        ...prev,
        { text: event.data, sender: "remote" },
      ]);
    };

    channel.onclose = () => {
      console.log("Data channel closed");
    };
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = () => {
    const channel = dataChannelRef.current;

    if (!channel || channel.readyState !== "open") {
      console.log("Channel not ready");
      return;
    }

    if (!input.trim()) return;

    channel.send(input);

    setMessages((prev) => [
      ...prev,
      { text: input, sender: "me" },
    ]);

    setInput("");
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

      {/* CHAT UI */}
      <div style={{ width: "300px", marginTop: "20px" }}>
        <div style={{ height: "200px", overflowY: "auto" }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                textAlign: msg.sender === "me" ? "right" : "left",
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default App;