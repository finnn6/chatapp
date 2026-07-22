import { createContext, useContext, useState, useEffect } from 'react'
import { useSocket } from './SocketContext'
import { useAuth } from './AuthContext'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'

const ChatContext = createContext(null)

export const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

export const ChatProvider = ({ children }) => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const { socket } = useSocket()
  const { user } = useAuth()
  const navigate = useNavigate()

  // 방 목록 최초 로드
  useEffect(() => {
    if (!user) return

    const fetchRooms = async () => {
      try {
        const data = await api.get('api/chatrooms').json()
        setRooms(data)
      } catch (err) {
        console.error('방 목록 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [user?._id])

  // 새 메시지 → lastMessage 갱신 + unread +1 + 맨 위로
  useEffect(() => {
    if (!socket || !user) return

    const handleRoomUpdate = async ({ roomId, lastMessage, senderId, senderName }) => {
      const isMine = String(senderId) === String(user._id)

      let wasWatching = false

      // 남이 보낸 거면 알림 요청 (Electron만)
      if (!isMine && window.electron?.notifyMessage) {
        try {
          const result = await window.electron.notifyMessage({
            roomId,
            senderName,
            text: lastMessage,
          })
          wasWatching = result.wasWatching
        } catch (err) {
          console.error('알림 실패:', err)
        }
      }

      setRooms(prev => {
        const exists = prev.some(r => r._id === roomId)
        if (!exists) {
          // 목록에 없는 방 (나갔던 방) → 서버에서 다시 fetch
          api.get('api/chatrooms').json()
            .then(data => setRooms(data))
            .catch(err => console.error(err))
          return prev
        }

        const updated = prev.map(room => {
          if (room._id !== roomId) return room

          const isMine = String(senderId) === String(user._id)
          return {
            ...room,
            lastMessage,
            unreadCount: isMine ? room.unreadCount : (room.unreadCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          }
        })
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      })
    }

    socket.on('room:update', handleRoomUpdate)
    return () => socket.off('room:update', handleRoomUpdate)
  }, [socket, user?._id])

  // 방 읽음 → unread 0
  useEffect(() => {
    if (!socket) return

    const handleRoomRead = ({ roomId }) => {
      setRooms(prev => prev.map(room =>
        room._id === roomId ? { ...room, unreadCount: 0 } : room
      ))
    }

    socket.on('room:read', handleRoomRead)
    return () => socket.off('room:read', handleRoomRead)
  }, [socket])

  // 웹-뒤로가기 문제 해결
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted) {
        // bfcache에서 복원됨 → 최신 상태로 다시 fetch
        console.log('bfcache 복원 감지, 방 목록 refetch')
        api.get('api/chatrooms').json()
          .then(data => setRooms(data))
          .catch(err => console.error(err))
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  // 채팅방 나가기
  const leaveRoom = async (roomId) => {
    // await api.delete(`api/chatrooms/${roomId}`)
    // setRooms(prev => prev.filter(room => room._id !== roomId))
    try {
      await api.delete(`api/chatrooms/${roomId}`)

      // Electron이면 창 닫기, 웹이면 홈으로
      if (window.electron) {
        window.close()
      } else {
        navigate('/?tab=chat')
      }
    } catch (err) {
      console.error(err)
    }
  }

  // '채팅방 나가기' 이후 목록에서 채팅방 제거하기 위해
  useEffect(() => {
    if (!socket) return

    const handleRoomLeft = ({ roomId }) => {
      setRooms(prev => prev.filter(room => room._id !== roomId))
    }

    socket.on('room:left', handleRoomLeft)
    return () => socket.off('room:left', handleRoomLeft)
  }, [socket])

  // 안읽은 방이 하나라도 있나
  const hasUnread = rooms.some(room => room.unreadCount > 0)

  return (
    <ChatContext.Provider value={{ rooms, setRooms, loading, hasUnread, leaveRoom }}>
      {children}
    </ChatContext.Provider>
  )
}