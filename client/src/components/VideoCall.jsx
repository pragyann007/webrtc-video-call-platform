import { useWebRTC } from '../hooks/useWebRtc'
import VideoPlayer from './VideoPlayer'

export default function VideoCall({ roomId }) {
  const { localStream, remoteStream, status } = useWebRTC(roomId)

  const statusMessages = {
    idle: 'Starting camera...',
    waiting: 'Waiting for someone to join...',
    connecting: 'Connecting...',
    connected: 'Connected!',
    disconnected: 'Peer disconnected',
    'room-full': 'Room is full!',
    error: 'Something went wrong'
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="mb-4 px-4 py-2 bg-gray-800 rounded-full text-white text-sm">
        {statusMessages[status] || status}
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
        <VideoPlayer stream={localStream} muted={true} label="You" />
        {remoteStream ? (
          <VideoPlayer stream={remoteStream} muted={false} label="Stranger" />
        ) : (
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Waiting for stranger...</p>
          </div>
        )}
      </div>
    </div>
  )
}