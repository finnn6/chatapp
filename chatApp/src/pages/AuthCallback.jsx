import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ky from 'ky';
import { useAuth } from '@/context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
   
    if (token) {
      localStorage.setItem('token', token)
      ky.get('http://localhost:3001/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          login(data.user)
          navigate('/')
        })
        .catch(() => navigate('/login'))
    } else {
      navigate('/login')
    }
  }, [])
}