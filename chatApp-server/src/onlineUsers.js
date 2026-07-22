const onlineUsers = new Map()  // userId → Set<socketId>

// 남들한테 보여줄 상태 판정
function getVisibleStatus(userId, customStatus) {
  const sockets = onlineUsers.get(userId)
  const isConnected = sockets && sockets.size > 0

  if (!isConnected) return 'offline'
  if (customStatus === 'invisible') return 'offline'
  return customStatus
}

module.exports = { onlineUsers, getVisibleStatus }