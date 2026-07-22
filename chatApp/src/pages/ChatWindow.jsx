import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import api from '@/lib/api'
import { useSocket } from '@/context/SocketContext'
import { useAuth } from '@/context/AuthContext'
import { handleEnter } from '@/utils/keyboard'
import { useChat } from '@/context/ChatContext'

const ChatWindow = () => {
  const { roomId } = useParams()
  const { socket } = useSocket()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [participants, setParticipants] = useState([])
  const bottomRef = useRef(null)
  const { leaveRoom } = useChat()
  const typingTimerRef = useRef(null)
  const isTypingRef = useRef(false)
  const [typingUsers, setTypingUsers] = useState({})   // { userId: username }
  const typingTimeoutsRef = useRef({})   // { userId: timeout }

  // 메시지 히스토리 + 방 정보 불러오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 채팅창 열었을 때 읽음 처리
        // api.patch(`api/chatrooms/${roomId}/read`).catch(err =>
        //   console.error('읽음 처리 실패', err)
        // )

        const [messages, room] = await Promise.all([
          api.get(`api/chatrooms/${roomId}/messages`).json(),
          api.get(`api/chatrooms/${roomId}`).json()
        ])

        setMessages(messages)
        setParticipants(room.participants)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [roomId])

  useEffect(() => {
    if (!socket) return

    socket.emit('room:join', roomId)
    socket.emit('room:read', roomId)   // 방 열 때 읽음

    const handleMessage = (message) => {
      setMessages(prev => [...prev, message])

      // 보낸 사람 인디케이터 제거
      const senderId = String(message.senderId?._id || message.senderId)
      handleTypingStop({ userId: senderId })

      // 보는 중 메시지 왔을 때 읽음. 내 메시지가 아닌지 판별 & 실제 창을 보고있을 때 판별
      const isMine = senderId === String(user._id)
      if (!isMine && document.hasFocus()) {
        socket.emit('room:read', roomId)
      }
    }

    socket.on('message', handleMessage)

    return () => {
      socket.emit('room:leave', roomId)
      socket.off('message', handleMessage)
    }
  }, [socket, roomId, user?._id])

  // 새 메시지 오면 스크롤 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* 타이핑!!!! */
  const handleInputChange = (e) => {
    setInputValue(e.target.value)

    // 아직 "입력 중" 상태가 아니면 start 쏨 (한 번만)
    if (!isTypingRef.current) {
      socket.emit('typing:start', { roomId })
      isTypingRef.current = true
    }

    // 정지 타이머 리셋 — 2초간 입력 없으면 stop
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', { roomId })
      isTypingRef.current = false
    }, 2000)
  }

  // 메시지 보낼 때 즉시 stop
  const handleSend = () => {
    // 메시지 전송
    if (!inputValue.trim()) return
    socket.emit('message', {
      roomId,
      senderId: user._id,
      text: inputValue.trim()
    })
    setInputValue('')

    // 타이핑 인디케이터 클리어
    clearTimeout(typingTimerRef.current)
    if (isTypingRef.current) {
      socket.emit('typing:stop', { roomId })
      isTypingRef.current = false
    }
  }

  // 언마운트 시 정리 (창 닫기/방 나가기)
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current)
      if (isTypingRef.current) {
        socket?.emit('typing:stop', { roomId })
      }
    }
  }, [socket, roomId])

  useEffect(() => {
    if (!socket) return

    const handleTypingStart = ({ userId, username }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: username }))

      // 안전장치: stop이 안 와도 5초 뒤 자동 제거
      clearTimeout(typingTimeoutsRef.current[userId])
      typingTimeoutsRef.current[userId] = setTimeout(() => {
        setTypingUsers(prev => {
          const next = { ...prev }
          delete next[userId]
          return next
        })
      }, 5000)
    }

    const handleTypingStop = ({ userId }) => {
      clearTimeout(typingTimeoutsRef.current[userId])
      setTypingUsers(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }

    socket.on('typing:start', handleTypingStart)
    socket.on('typing:stop', handleTypingStop)

    return () => {
      socket.off('typing:start', handleTypingStart)
      socket.off('typing:stop', handleTypingStop)
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout)
    }
  }, [socket])

  const others = participants.filter(p => p.user._id !== user._id)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">

      {/* 상단 헤더 */}
      <div className="bg-background px-4 py-2 flex items-center justify-between">
        <span className="text-foreground font-bold text-sm">
          {others.map(p => p.user.username).join(', ')}님과의 대화
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => leaveRoom(roomId)}
          className="text-muted-foreground hover:text-destructive text-xs h-6"
        >
          나가기
        </Button>
      </div>

      {/* 구성원 */}
      <div className="px-3 py-1 text-xs text-muted-foreground border-b-1 border-border bg-card">
        구성원: {participants.map(p => p.user.username).join(', ')}
      </div>

      {/* 메시지 영역 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 대화 내역 */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {messages.map(msg => (
            <div key={msg._id} className={`flex flex-col ${msg.senderId === user._id || msg.senderId?._id === user._id ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-muted-foreground">
                {msg.senderId?.username ?? '나'}
              </span>
              <div className={`px-3 py-1.5 rounded-none border-2 text-sm max-w-[70%] shadow-[2px_2px_0_0_var(--pixel-shadow)] ${msg.senderId === user._id || msg.senderId?._id === user._id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-card-foreground border-border'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 상대방 아바타 */}
        <div className="w-24 border-l-1 border-border p-2 flex flex-col gap-2">
          {others.map(p => (
            <div key={p.user._id} className="flex flex-col items-center gap-1">
              <img
                src={`/avatars/${p.user.avatar || 1}.png`}
                alt={p.user.username}
                className="w-14 h-14 rounded-none border-1 border-border"
              />
              <span className="text-xs text-muted-foreground">{p.user.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="flex border-t-1 border-border bg-card">

        {/* 텍스트 입력 */}
        <div className="flex-1 flex flex-col p-2 gap-2">
          <div className="flex gap-2 text-xs text-muted-foreground">
            <button className="hover:text-pixel-mint">A</button>
            <button className="hover:text-pixel-mint">😊</button>
          </div>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleEnter(handleSend)}
              placeholder="메시지를 입력하세요"
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
            >
              send
            </Button>
          </div>
          {/* 인디케이터 - 입력창 아래, 높이 고정 */}
          <div className="h-5 px-1 text-xs text-muted-foreground flex items-center gap-1">
            {Object.keys(typingUsers).length > 0 && (
              <>
                <span className="flex gap-0.5 ml-0.5">
                  <span className="w-1 h-1 rounded-none bg-pixel-mint animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-none bg-pixel-mint animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-none bg-pixel-mint animate-bounce" />
                </span>
                <span>{Object.values(typingUsers).join(', ')}님이 입력 중</span>
              </>
            )}
          </div>
        </div>


        {/* 내 아바타 */}
        <div className="w-24 border-border p-2 flex flex-col items-center gap-1">
          <img
            src={`/avatars/${user.avatar || 1}.png`}
            alt={user.username}
            className="w-14 h-14 rounded-none border-1 border-pixel-mint"
          />
          <span className="text-xs text-muted-foreground">{user.username}</span>
        </div>

      </div>
    </div>
  )
}

export default ChatWindow