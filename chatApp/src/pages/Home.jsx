import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FriendRequest from '@/components/FriendRequest'
import FriendList from '@/components/FriendList'
import ProfileHeader from '@/components/ProfileHeader'
import ChatRoomList from '@/components/ChatRoomList'
import { useChat } from '@/context/ChatContext'
import { useSearchParams } from 'react-router-dom'

const Home = () => {
  // const [activeTab, setActiveTab] = useState('friends')
  const { hasUnread } = useChat()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL의 ?tab=chat을 읽음, 없으면 friends
  const activeTab = searchParams.get('tab') || 'friends'

  const handleTabChange = (value) => {
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
        </div>

        <TabsContent value="friends">
          <FriendList />
        </TabsContent>

        <TabsContent value="chat">
          <ChatRoomList />
        </TabsContent>

        <TabsContent value="addFriends">
          <FriendRequest />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default Home