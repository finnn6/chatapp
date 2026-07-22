import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from "@/components/ui/badge"
import { Input } from '@/components/ui'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '@/lib/api'
import { useSocket } from '@/context/SocketContext'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const ProfileHeader = () => {
  const { user, updateUser, logout } = useAuth()
  const [editingField, setEditingField] = useState(null)  // 'username' | 'statusMessage' | 'interests' | null
  const [inputValue, setInputValue] = useState('')
  const navigate = useNavigate()
  const { socket } = useSocket()
  const [status, setStatus] = useState('online')
  const TOTAL_AVATARS = 27
  const STATUS_LABEL = {
    online: '온라인',
    away: '자리비움',
    invisible: '오프라인',
    offline: '오프라인',
  }

  const handleAvatarSelect = async (avatarNumber) => {
    if (avatarNumber === user.avatar) return  // 같은 거 클릭하면 skip

    try {
      const updated = await api.patch('api/users/me', {
        json: { avatar: avatarNumber }
      }).json()
      updateUser(updated)
    } catch (err) {
      console.error(err)
    }
  }

  const startEdit = (field, currentValue) => {
    setEditingField(field)
    // interests는 배열이라 문자열로 변환
    if (field === 'interests') {
      // ["게임", "코딩"] → "#게임 #코딩"
      setInputValue(currentValue.map(tag => `#${tag}`).join(' '))
    } else {
      setInputValue(currentValue || '')
    }
  }

  const handleSave = async () => {
    if (!editingField) return
    let valueToSave = inputValue

    // interests는 문자열을 배열로 파싱
    if (editingField === 'interests') {
      valueToSave = inputValue
        .split(/\s+/)                      // 공백으로 분리
        .filter(t => t.startsWith('#'))    // # 시작만
        .map(t => t.slice(1))              // # 제거
        .filter(t => t.length > 0)         // 빈 거 제거

      valueToSave = [...new Set(valueToSave)]  // 중복 제거
    }

    // 변경 없으면 스킵
    const originalValue = user[editingField]
    const isUnchanged = editingField === 'interests'
      ? JSON.stringify(valueToSave) === JSON.stringify(originalValue)
      : valueToSave === originalValue

    if (isUnchanged) {
      setEditingField(null)
      return
    }

    try {
      const updated = await api.patch('api/users/me', {
        json: { [editingField]: valueToSave }
      }).json()
      updateUser(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setEditingField(null)
    }
  }

  const handleLogout = () => {
    socket?.disconnect()
    logout()
    navigate('/login')
  }

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus)
    socket?.emit('user:status', { userId: user._id, status: newStatus })
    try {
      const updated = await api.patch('api/users/me', {
        json: { ['customStatus']: newStatus }
      }).json()
      updateUser(updated)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div className="p-4 bg-card">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <img
                src={`/avatars/${user.avatar || 1}.png`}
                alt="avatar"
                className="w-16 h-16 rounded-none flex-shrink-0 cursor-pointer border-2 border-pixel-mint pixel-box-sm hover:opacity-80 transition-opacity"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: TOTAL_AVATARS }, (_, i) => i + 1).map(num => (
                  <button
                    key={num}
                    onClick={() => handleAvatarSelect(num)}
                    className={`w-12 h-12 rounded-none overflow-hidden border-2 transition-colors ${user.avatar === num
                      ? 'border-pixel-mint'
                      : 'border-transparent hover:border-border'
                      }`}
                  >
                    <img
                      src={`/avatars/${num}.png`}
                      alt={`avatar ${num}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div>
            <div className="flex items-center gap-2">
              <div>
                {editingField === 'username' ? (
                  <Input
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    autoFocus
                  />
                ) : (
                  <p onDoubleClick={() => startEdit('username', user.username)} className="text-sm font-bold cursor-pointer">{user.username}</p>
                )}
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-pixel-mint text-xs">
                  ▼
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleStatusChange('online')}>🟢 온라인</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('away')}>🟡 자리비움</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('invisible')}>⚫ 오프라인</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>로그아웃</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-xs">({STATUS_LABEL[user.customStatus] || '온라인'})</span>
            </div>
            <div className="mt-1">
              {editingField === 'statusMessage' ? (
                <Input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="한마디"
                  className="text-xs w-40"
                  autoFocus
                />
              ) : (
                <p
                  onDoubleClick={() => startEdit('statusMessage', user.statusMessage)}
                  className="relative inline-block bg-muted font-bold border-2 border-border text-xs px-3 py-1 ml-1.5 cursor-pointer
                    before:content-[''] before:absolute before:-left-[6px] before:top-2 before:w-2 before:h-2
                    before:bg-muted before:border-l-2 before:border-b-2 before:border-border before:rotate-45"
                >
                  {user.statusMessage || '한마디'}
                </p>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {editingField === 'interests' ? (
                <Input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="#태그1 #태그2"
                  className="text-xs w-40"
                  autoFocus
                />
              ) : (
                <div
                  onDoubleClick={() => startEdit('interests', user.interests || [])}
                  className="flex flex-wrap gap-1 mt-1 cursor-pointer min-h-[20px]"
                >
                  {user.interests && user.interests.length > 0 ? (
                    user.interests.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs text-pixel-cyan">
                        #{tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">관심사를 추가하세요</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader