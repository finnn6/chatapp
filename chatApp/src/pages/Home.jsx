import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FriendRequest from '@/components/FriendRequest'
import FriendList from '@/components/FriendList'
import ProfileHeader from '@/components/ProfileHeader'
import ChatRoomList from '@/components/ChatRoomList'
import SearchBar from '@/components/SearchBar'
import { useChat } from '@/context/ChatContext'
import { useSearchParams } from 'react-router-dom'

const SEARCH_PLACEHOLDER = {
  friends: '친구 검색 (이름 · 한마디 · 관심사)',
  chat: '채팅방 검색',
}

const Home = () => {
  // const [activeTab, setActiveTab] = useState('friends')
  const { hasUnread } = useChat()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  // URL의 ?tab=chat을 읽음, 없으면 friends
  const activeTab = searchParams.get('tab') || 'friends'

  // 친구요청 탭은 자체 이메일 검색이 있으므로 제외
  const searchable = activeTab === 'friends' || activeTab === 'chat'

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  const handleTabChange = (value) => {
    // 탭을 옮기면 검색은 초기화
    closeSearch()
    setSearchParams({ tab: value })
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">

      {/* 상단 픽셀 헤더 */}
      <div className="bg-background border-b-2 border-border px-4 py-2 flex items-center justify-between">
        <span className="text-foreground font-bold text-sm tracking-widest">▚ MESSENGER</span>
      </div>

      {/* 내 프로필 */}
      <ProfileHeader />

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center border-b-1 border-border bg-card">
          <TabsList className="bg-transparent rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="friends"
              className="text-xs rounded-none text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-pixel-mint data-[state=active]:border-t-2 data-[state=active]:border-t-pixel-mint"
            >
              친구목록
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="text-xs rounded-none text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-pixel-mint data-[state=active]:border-t-2 data-[state=active]:border-t-pixel-mint"
            >
              <span className="relative">
                <span className="relative z-10">채팅방</span>
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-1 w-1 h-1 bg-pixel-pink z-0" />
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="addFriends"
              className="text-xs rounded-none text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-pixel-mint data-[state=active]:border-t-2 data-[state=active]:border-t-pixel-mint"
            >
              친구요청
            </TabsTrigger>
          </TabsList>

          {searchable && (
            <button
              type="button"
              onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              aria-label={searchOpen ? '검색 닫기' : '검색'}
              aria-pressed={searchOpen}
              className={`ml-auto mr-2 p-1.5 hover:bg-muted ${searchOpen ? 'text-pixel-mint' : 'text-muted-foreground'}`}
            >
              {searchOpen ? <X size={14} /> : <Search size={14} />}
            </button>
          )}
        </div>

        {searchable && searchOpen && (
          <SearchBar
            value={query}
            onChange={setQuery}
            onClose={closeSearch}
            placeholder={SEARCH_PLACEHOLDER[activeTab]}
          />
        )}

        <TabsContent value="friends">
          <FriendList query={query} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatRoomList query={query} />
        </TabsContent>

        <TabsContent value="addFriends">
          <FriendRequest />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default Home