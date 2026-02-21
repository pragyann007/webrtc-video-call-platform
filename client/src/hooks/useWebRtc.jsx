import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export function useWebRTC(roomId) {
  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const iceCandidateQueue = useRef([])

  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [status, setStatus] = useState('idle')

  // ─────────────────────────────────────────────────────────────
  // We store the handler functions in refs too.
  // WHY? Because socket.on() captures the function at the time it
  // is registered. If we pass a normal function or a useCallback,
  // the socket holds the OLD version of that function forever —
  // this is called a "stale closure". The function it captured
  // remembers old values of pcRef, socketRef, etc from when it
  // was first created.
  //
  // The fix: store the LATEST version of each handler in a ref,
  // then the socket listener calls ref.current() which always
  // points to the newest version.
  // ─────────────────────────────────────────────────────────────
  const createOfferRef = useRef(null)
  const handleOfferRef = useRef(null)
  const handleAnswerRef = useRef(null)
  const handleIceCandidateRef = useRef(null)

  // ── Step 1: get camera and mic ───────────────────────────────
  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  // ── Step 2: build RTCPeerConnection ─────────────────────────
  const createPeerConnection = useCallback(() => {
    // close any old connection first
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    const pc = new RTCPeerConnection(RTC_CONFIG)

    // add our camera/mic tracks so the other peer receives them
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current)
    })

    // when browser discovers an ICE candidate, forward it
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate')
        socketRef.current.emit('ice-candidate', event.candidate)
      }
    }

    // when we receive the other peer's video/audio
    pc.ontrack = (event) => {
      console.log('Got remote track!')
      setRemoteStream(event.streams[0])
    }

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'connected') setStatus('connected')
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('disconnected')
      }
    }

    // log ICE gathering so you can see it working in console
    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState)
    }

    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState)
    }

    pcRef.current = pc
    return pc
  }, [])

  // ── Drain queued ICE candidates ─────────────────────────────
  const drainIceCandidateQueue = useCallback(async () => {
    console.log('Draining ICE queue, size:', iceCandidateQueue.current.length)
    for (const candidate of iceCandidateQueue.current) {
      try {
        await pcRef.current.addIceCandidate(candidate)
      } catch (e) {
        console.error('Error adding queued ICE candidate:', e)
      }
    }
    iceCandidateQueue.current = []
  }, [])

  // ── C1: create and send offer ────────────────────────────────
  const createOffer = useCallback(async () => {
    console.log('Creating offer...')
    setStatus('connecting')
    createPeerConnection()

    const offer = await pcRef.current.createOffer()
    await pcRef.current.setLocalDescription(offer)

    console.log('Offer created, sending to server')
    socketRef.current.emit('offer', offer)
  }, [createPeerConnection])

  // keep ref current — this is the stale closure fix
  useEffect(() => { createOfferRef.current = createOffer }, [createOffer])

  // ── C2: receive offer, create answer ────────────────────────
  const handleOffer = useCallback(async (offer) => {
    console.log('Received offer, creating answer...')
    setStatus('connecting')
    createPeerConnection()

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer))
    await drainIceCandidateQueue()

    const answer = await pcRef.current.createAnswer()
    await pcRef.current.setLocalDescription(answer)

    console.log('Answer created, sending to server')
    socketRef.current.emit('answer', answer)
  }, [createPeerConnection, drainIceCandidateQueue])

  useEffect(() => { handleOfferRef.current = handleOffer }, [handleOffer])

  // ── C1: receive answer ───────────────────────────────────────
  const handleAnswer = useCallback(async (answer) => {
    console.log('Received answer, setting remote description...')

    // guard: only set if we are in the right signaling state
    if (!pcRef.current) {
      console.warn('handleAnswer called but pcRef is null')
      return
    }
    if (pcRef.current.signalingState !== 'have-local-offer') {
      console.warn('handleAnswer called in wrong state:', pcRef.current.signalingState)
      return
    }

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    await drainIceCandidateQueue()
  }, [drainIceCandidateQueue])

  useEffect(() => { handleAnswerRef.current = handleAnswer }, [handleAnswer])

  // ── Both: handle incoming ICE candidate ─────────────────────
  const handleIceCandidate = useCallback(async (candidate) => {
    console.log('Received ICE candidate')
    if (pcRef.current && pcRef.current.remoteDescription) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('Error adding ICE candidate:', e)
      }
    } else {
      // not ready yet — queue it
      console.log('Queuing ICE candidate (no remote description yet)')
      iceCandidateQueue.current.push(candidate)
    }
  }, [])

  useEffect(() => { handleIceCandidateRef.current = handleIceCandidate }, [handleIceCandidate])

  // ── Main effect: connect socket, join room ───────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await getMedia()
        if (cancelled) return

        // connect to your server — change port if needed
        const socket = io('http://localhost:8080')
        socketRef.current = socket

        socket.on('connect', () => {
          console.log('Socket connected:', socket.id)
        })

        socket.on('waiting', () => {
          console.log('Waiting for peer...')
          setStatus('waiting')
        })

        socket.on('ready', () => {
          console.log('Peer joined, waiting for offer...')
          setStatus('connecting')
        })

        // Use ref wrappers so we always call the LATEST version
        // of these functions — this is the stale closure fix
        socket.on('initiate-offer', () => {
          console.log('Server told us to create offer')
          createOfferRef.current()       // ← calls latest version via ref
        })

        socket.on('offer', (offer) => {
          console.log('Received offer from peer')
          handleOfferRef.current(offer)  // ← calls latest version via ref
        })

        socket.on('answer', (answer) => {
          console.log('Received answer from peer')
          handleAnswerRef.current(answer) // ← calls latest version via ref
        })

        socket.on('ice-candidate', (candidate) => {
          handleIceCandidateRef.current(candidate)
        })

        socket.on('room-full', () => {
          console.log('Room is full')
          setStatus('room-full')
        })

        socket.on('peer-disconnected', () => {
          console.log('Peer disconnected')
          setStatus('disconnected')
          setRemoteStream(null)
          pcRef.current?.close()
          pcRef.current = null
        })

        socket.emit('join-room', roomId)

      } catch (error) {
        console.error('WebRTC init failed:', error)
        setStatus('error')
      }
    }

    init()

    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach(track => track.stop())
      pcRef.current?.close()
      socketRef.current?.disconnect()
    }
  }, [roomId])

  return { localStream, remoteStream, status }
}