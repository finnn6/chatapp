import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState({})
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const s = io('http://localhost:3001', {
      auth: { token: localStorage.getItem('token') }
    })
    setSocket(s)

    s.on('user:status', ({ userId, status }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: status }))
    })

    return () => {
      s.off('connect')
      s.disconnect()
    }
  }, [user?._id])

  useEffect(() => {
    if (!socket || !user) return

    const handleReconnectIfNeeded = () => {
      if (!socket.connected) {
        console.log('[Socket] 재연결 시도')
        socket.connect()  // 자동 reconnect 안 됐어도 강제로 시도
      }
    }

    // 탭 다시 활성화
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReconnectIfNeeded()
      }
    }

    // 네트워크 복구
    const handleOnline = () => {
      handleReconnectIfNeeded()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
    }
  }, [socket, user])

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)