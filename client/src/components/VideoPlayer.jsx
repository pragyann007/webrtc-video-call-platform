import { useRef, useEffect } from 'react'
// ✅ NO useWebRTC import here — VideoPlayer doesn't need it at all

function VideoPlayer({ stream, muted = false, label }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover rounded-lg bg-gray-900"
      />
      <span className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
        {label}
      </span>
    </div>
  )
}

export default VideoPlayer