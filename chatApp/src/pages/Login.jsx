import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/config'
import api from '@/lib/api'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async () => {
    // 데스크톱 앱: 시스템 브라우저로 인증 → 루프백으로 토큰 수신
    if (window.electron?.login) {
      try {
        const token = await window.electron.login(API_URL)
        localStorage.setItem('token', token)
        const data = await api.get('api/users/me').json()   // 토큰은 api 훅이 자동 첨부
        login(data.user)
        navigate('/')
      } catch (err) {
        console.error('로그인 실패', err)
      }
    } else {
      // 웹: 기존 리다이렉트 흐름
      window.location.href = `${API_URL}/auth/google`
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-card pixel-box p-8 w-[480px] text-center">
        <div className="text-pixel-mint text-3xl font-bold mb-4 tracking-widest">▚ MESSENGER</div>
        <h1 className="text-foreground text-2xl font-bold mb-2">만나서 반가워요!</h1>
        <p className="text-muted-foreground mb-6">로그인하여 계속하세요</p>

        <Button
          onClick={handleLogin}
          variant="secondary"
          className="w-full h-11 flex items-center justify-center gap-3"
        >
          <GoogleIcon />
          Google로 로그인
        </Button>
      </div>
    </div>
  )
}

export default Login