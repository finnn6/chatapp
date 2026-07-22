import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/context/SocketContext'
import { useChat } from '@/context/ChatContext'

const ChatRoomList = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  // const [rooms, setRooms] = useState([])
  // const [loading, setLoading] = useState(true)
  const { rooms, loading } = useChat()

  // useEffect(() => {
  //   const fetchRooms = async () => {
  //     try {
  //       const data = await api.get('api/chatrooms').json()
  //       setRooms(data)
  //     } catch (err) {
  //       console.error(err)
  //     } finally {
  //       setLoading(false)
  //     }
  //   }
  //   fetchRooms()
  // }, [])

  // 안읽음 배지 실시간 갱신
  // useEffect(() => {
  //   if (!socket) return

  //   const handleRoomUpdate = ({ roomId, lastMessage, senderId }) => {
  //     setRooms(prev => {
  //       const updated = prev.map(room => {
  //         if (room._id !== roomId) return room

  //         // 내가 보낸 메시지가 아니면 unread +1
  //         const isMine = senderId === user._id
  //         return {
  //           ...room,
  //           lastMessage,
  //           unreadCount: isMine ? room.unreadCount : (room.unreadCount || 0) + 1,
  //           updatedAt: new Date().toISOString(),
  //         }
  //       })

  //       // 방금 온 방을 맨 위로 정렬
  //       return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  //     })
  //   }

  //   socket.on('room:update', handleRoomUpdate)
  //   return () => socket.off('room:update', handleRoomUpdate)
  // }, [socket, user._id])

  // 읽음 처리
  // useEffect(() => {
  //   if (!socket) return
  //   const handleRoomRead = ({ roomId }) => {
  //     setRooms(prev => prev.map(room =>
  //       room._id === roomId ? { ...room, unreadCount: 0 } : room
  //     ))
  //   }
  //   socket.on('room:read', handleRoomRead)
  //   return () => socket.off('room:read', handleRoomRead)
  // }, [socket])

  const handleDoubleClick = (room) => {
    const others = room.participants.filter(p => p._id !== user._id)
    if (window.electron) {
      window.electron.openChat({ roomId: room._id, friend: others[0] })
    } else {
      window.location.href = `/chat/${room._id}`
    }
  }

  const getOtherParticipants = (room) => {
    return room.participants.filter(p => p.user._id !== user._id)
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }

    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="py-2 px-4 space-y-2">
        <div className="h-12 bg-muted border-2 border-border animate-pulse" />
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <span className="text-2xl mb-2">▨</span>
        <p className="text-xs">채팅방이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {rooms.map(room => {
        const others = getOtherParticipants(room)
        return (
          <div
            key={room._id}
            className="flex items-center gap-3 px-3 py-2 border-b border-border/50 hover:bg-muted cursor-pointer"
            onDoubleClick={() => handleDoubleClick(room)}
          >
            <span className="text-lg flex-shrink-0 text-pixel-mint">▨</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {others.map(p => p.user.username).join(', ')}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {formatTime(room.updatedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {room.lastMessage ? (
                  <p className="text-xs text-muted-foreground truncate">{room.lastMessage}</p>
                ) : (
                  <span />
                )}
                {room.unreadCount > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-[11px] font-bold text-primary-foreground bg-pixel-pink border border-black/40 rounded-none">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ChatRoomList