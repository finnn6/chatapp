import { useState, useEffect } from 'react'
import { Input, Button } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'

const FriendRequest = () => {
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [requestsData, setRequestsData] = useState([])

  // 친구 요청 목록 조회
  useEffect(() => {
    const getRequests = async () => {
      try {
        const data = await api.get('api/friends/requests').json()
        setRequestsData(data)
      } catch (err) {
        console.error(err)
      }
    }
    getRequests()
  }, [])

  const findUser = async (email) => {
    setSearchError('')
    setSearchResult(null)
    try {
      const data = await api.get(`api/users/search?email=${email}`).json()
      setSearchResult(data)
    } catch (err) {
      if (err.name === 'HTTPError') {
        const errorData = await err.response.json()
        setSearchError(errorData.message)
      } else {
        setSearchError('유저를 찾을 수 없습니다.')
      }
    } finally {
      setAddError('')
    }
  }

  const addFriends = async (friendId) => {
    setAddError('')
    setAddSuccess('')
    try {
      await api.post('api/friends', { json: { friendId } }).json()
      setAddSuccess('친구 요청을 보냈습니다!')
      setSearchResult(null)
      setSearchEmail('')
    } catch (err) {
      if (err.name === 'HTTPError') {
        const errorData = await err.response.json()
        setAddError(errorData.message)
      } else {
        setAddError('친구 요청에 실패했습니다.')
      }
    }
  }

  const handleRequest = async (requestId, status) => {
    try {
      await api.patch(`api/friends/requests/${requestId}`,
        {
          json: { status }
        }).json()

      // 처리된 요청을 목록에서 제거
      setRequestsData(prev => prev.filter(r => r._id !== requestId))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-4">
      {
        requestsData.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-1 text-pixel-mint">요청 대기 목록</h2>
            {requestsData.map(request => (
              <div key={request._id} className="pixel-box bg-card p-3 mb-3">
                <p className="font-medium">{request.from.username}</p>
                <p className="text-sm text-muted-foreground mb-2">{request.from.email}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRequest(request._id, 'accepted')}>수락</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleRequest(request._id, 'rejected')}>거절</Button>
                </div>
              </div>
            ))}
          </div>
        )
      }
      <h2 className="text-lg font-bold mb-1 text-pixel-mint">친구 추가하기</h2>
      <p className="text-sm text-muted-foreground mb-4">이메일을 사용하여 친구를 추가할 수 있어요.</p>

      <div className="flex gap-2 p-3 pixel-box-accent bg-card">
        <Input
          placeholder="이메일을 입력하세요"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && findUser(searchEmail)}
          className="border-none shadow-none bg-transparent focus-visible:ring-0 p-0"
        />
        <Button
          onClick={() => findUser(searchEmail)}
          disabled={!searchEmail}
          className="shrink-0"
        >
          검색
        </Button>
      </div>

      {/* 검색 에러 */}
      {searchError && (
        <p className="text-destructive text-xs mt-2">{searchError}</p>
      )}

      {/* 검색 결과 */}
      {searchResult && (
        <div className="mt-3 p-3 pixel-box bg-card flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{searchResult.username}</p>
            <p className="text-xs text-muted-foreground">{searchResult.email}</p>
          </div>
          {searchResult.relationship === 'friend' ? (
            <Badge variant="outline">이미 추가되어 있어요</Badge>
          ) : searchResult.relationship === 'pending' ? (
            <Badge variant="secondary" className="text-pixel-yellow">요청 대기중</Badge>
          ) : searchResult.relationship === 'self' ? (
            <Badge variant="secondary" className="text-muted-foreground">나</Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => addFriends(searchResult._id)}
            >
              친구 추가
            </Button>
          )}
        </div>
      )}

      {/* 추가 성공/에러 */}
      {addSuccess && <p className="text-pixel-mint text-xs mt-2">{addSuccess}</p>}
      {addError && <p className="text-destructive text-xs mt-2">{addError}</p>}
    </div>
  )
}

export default FriendRequest