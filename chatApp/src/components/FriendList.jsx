import { useState, useEffect } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import { useSocket } from '@/context/SocketContext'
import { useNavigate } from 'react-router-dom'

const FriendItem = ({ friend, onDoubleClick }) => (
  <div
    className="flex items-start gap-2 px-4 py-2 hover:bg-muted cursor-pointer"
    onDoubleClick={() => onDoubleClick(friend)}
  >
    <img
      src={`/avatars/${friend.avatar || 1}.png`}
      alt={friend.username}
      className="w-12 h-12 rounded-none border-2 border-border flex-shrink-0"
    />
    <div className="flex-1 min-w-0">
      {/* 윗줄: 닉네임 + 관심사 태그 */}
      <div className="flex items-center flex-wrap gap-2">
        <span className="text-xs font-medium truncate">{friend.username}</span>
        {friend.interests && friend.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {friend.interests.map(tag => (
              <Badge key={tag} variant="secondary" className="text-pixel-cyan">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 아랫줄: 한마디 말풍선 (왼쪽 꼬리) */}
      {friend.statusMessage && (
        <div className="mt-1.5 pl-1.5">
          <span className="relative inline-block bg-muted border-1 border-border text-xs px-2 py-0.5
            before:content-[''] before:absolute before:-left-[6px] before:top-1.5 before:w-2 before:h-2
            before:bg-muted before:border-l-1 before:border-b-1 before:border-border before:rotate-45">
            {friend.statusMessage}
          </span>
        </div>
      )}
    </div>
  </div>
)

const FriendGroup = ({ label, friends, onDoubleClick }) => {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 px-3 py-1 text-xs text-pixel-mint hover:bg-muted w-full uppercase tracking-wider">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label} ({friends.length})
      </CollapsibleTrigger>
      <CollapsibleContent>
        {friends.map(friend => (
          <FriendItem key={friend._id} friend={friend} onDoubleClick={onDoubleClick} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

const FriendList = () => {
  const [friends, setFriends] = useState([])
  const { onlineUsers } = useSocket()
  const STATUS_LABEL = {
    online: '온라인',
    away: '자리비움',
    offline: '오프라인'
  }
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await api.get('api/friends').json()
        setFriends(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchFriends()
  }, [])

  if (loading) {
    return (
      <div className="py-2 px-4 space-y-2">
        <div className="h-12 bg-muted border-2 border-border animate-pulse" />
        <div className="h-12 bg-muted border-2 border-border animate-pulse" />
        <div className="h-12 bg-muted border-2 border-border animate-pulse" />
      </div>
    )
  }

  const handleDoubleClick = async (friend) => {
    try {
      // 채팅방 생성 or 기존 방 반환
      const room = await api.post('api/chatrooms', {
        json: { participantId: friend._id }
      }).json()

      // IPC로 main.js에 채팅창 열기 요청
      // Electron이면 새 창, 웹이면 같은 탭에서 이동
      if (window.electron) {
        window.electron.openChat({ roomId: room._id, friend })
      } else {
        navigate(`/chat/${room._id}`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const friendsWithStatus = friends.map(f => ({
    ...f,
    status: onlineUsers[f._id] ?? f.status
  }))

  const online = friendsWithStatus.filter(f => f.status === 'online')
  const away = friendsWithStatus.filter(f => f.status === 'away')
  const offline = friendsWithStatus.filter(f => f.status === 'offline')

  return (
    <div className="py-2">
      <FriendGroup label={STATUS_LABEL['online']} friends={online} onDoubleClick={handleDoubleClick} />
      <FriendGroup label={STATUS_LABEL['away']} friends={away} onDoubleClick={handleDoubleClick} />
      <FriendGroup label={STATUS_LABEL['offline']} friends={offline} onDoubleClick={handleDoubleClick} />
    </div>
  )
}

export default FriendList