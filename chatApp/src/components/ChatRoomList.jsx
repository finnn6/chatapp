import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/context/SocketContext'
import { useChat } from '@/context/ChatContext'
import NotificationBanner from './NotificationBanner'

const STATUS_DOT = {
  online: 'bg-pixel-cyan',
  away: 'bg-pixel-yellow',
  offline: 'bg-muted-foreground/50',
}

const ParticipantAvatar = ({ user, status }) => (
  <span className="relative flex-shrink-0">
    <img
      src={`/avatars/${user.avatar || 1}.png`}
      alt={user.username}
      className="w-10 h-10 rounded-none border-2 border-border"
    />
    <span
      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border border-background ${STATUS_DOT[status] || STATUS_DOT.offline}`}
      title={status}
    />
  </span>
)

const ChatRoomList = ({ query = '' }) => {
  const { user } = useAuth()
  const { onlineUsers } = useSocket()
  const { rooms, loading } = useChat()

  const handleDoubleClick = (room) => {
    const others = getOtherParticipants(room)
    const friend = others[0]?.user
    if (window.electron) {
      window.electron.openChat({ roomId: room._id, friend })
    } else {
      window.location.href = `/chat/${room._id}`
    }
  }

  const getOtherParticipants = (room) => {
    return room.participants.filter(p => p.user._id !== user._id)
  }

  // 소켓으로 들어온 실시간 상태가 있으면 그걸 우선 사용
  const statusOf = (participant) =>
    onlineUsers[participant.user._id] ?? participant.user.status ?? 'offline'

  const roomTitle = (room) =>
    getOtherParticipants(room).map(p => p.user.username).join(', ')

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rooms
    return rooms.filter(room => roomTitle(room).toLowerCase().includes(q))
  }, [rooms, query, user._id])

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
    <>
    {/* <NotificationBanner/> */}
    <div className="flex flex-col">
      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <p className="text-xs">'{query}' 검색 결과가 없습니다</p>
        </div>
      ) : (
        filteredRooms.map(room => {
          const others = getOtherParticipants(room)
          return (
            <div
              key={room._id}
              className="flex items-center gap-3 px-3 py-2 border-b border-border/50 hover:bg-muted cursor-pointer"
              onDoubleClick={() => handleDoubleClick(room)}
            >
              <div className="flex items-center flex-shrink-0 -space-x-2">
                {others.slice(0, 2).map(p => (
                  <ParticipantAvatar key={p.user._id} user={p.user} status={statusOf(p)} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">
                    {roomTitle(room)}
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
        })
      )}
    </div>
    </>
  )
}

export default ChatRoomList
