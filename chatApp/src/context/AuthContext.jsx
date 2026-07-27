import { createContext, useContext, useEffect, useState } from 'react';
import ky from 'ky';
import { API_URL } from '@/lib/config';

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem('token')
  useEffect(() => {
    if (token) {
      // 토큰으로 유저 정보 가져오기
      ky.get(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setUser(data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (userData) => setUser(userData)
  const logout = () => { 
    setUser(null)
    localStorage.removeItem('token')
  }
  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }))

  if (loading) return <div>로딩 중...</div>

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext);    