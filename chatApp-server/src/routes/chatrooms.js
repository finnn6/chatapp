const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const ChatRoom = require('../models/ChatRoom')
const Message = require('../models/Message')
const { getVisibleStatus } = require('../onlineUsers')

// 채팅방 생성 or 기존 방 반환 - 나갔던 방이면 leftParticipants에서 제거
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { participantId } = req.body
    const userId = req.user.id

    // const existing = await ChatRoom.findOne({
    //   participants: { $all: [userId, participantId], $size: 2 }
    // })
    const existing = await ChatRoom.findOne({
      'participants.user': { $all: [userId, participantId] },
      $expr: { $eq: [{ $size: '$participants' }, 2] }
    })

    if (existing) {
      // 나갔던 방이면 다시 들어오기
      // await ChatRoom.findByIdAndUpdate(existing._id, {
      //   $pull: { leftParticipants: { user: userId } }
      // })
      return res.json(existing)
    }

    // const room = await ChatRoom.create({
    //   participants: [userId, participantId]
    // })
    const room = await ChatRoom.create({
      participants: [
        { user: userId, lastReadAt: new Date() },
        { user: participantId, lastReadAt: new Date() }
      ]
    })

    res.status(201).json(room)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// 내 채팅방 목록 전체 - 내가 나가지 않은 방만 반환, 안읽음 개수 포함
// router.get('/', authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user.id
//     const rooms = await ChatRoom.find({
//       'participants.user': userId,
//       'leftParticipants.user': { $ne: userId } // 내가 나간 방 제외
//     })
//       .populate('participants.user', 'username email')
//       .sort({ updatedAt: -1 })

//     // 방마다 안읽음 개수 계산
//     const roomsWithUnread = await Promise.all(
//       rooms.map(async (room) => {
//         console.log(room.participants)
//         // 이 방에서 내 lastReadAt 찾기
//         const me = room.participants.find(
//           p => p.user._id.toString() === userId
//         )
//         console.log(me,"adsfasdf")
//         const lastReadAt = me?.lastReadAt || new Date(0)  // 없으면 아주 옛날로
//         // lastReadAt 이후 + 내가 보낸 게 아닌 메시지 개수
//         const unreadCount = await Message.countDocuments({
//           roomId: room._id,
//           createdAt: { $gt: lastReadAt },
//           senderId: { $ne: userId }
//         })

//         // room을 일반 객체로 바꿔서 unreadCount 붙이기
//         return { ...room.toObject(), unreadCount }
//       })
//     )

//     res.json(roomsWithUnread)
//   } catch (err) {
//     res.status(500).json({ message: err.message })
//   }
// })
// GET / 방 목록
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id

    // 나간 방도 일단 다 가져옴 (leftParticipants 필터 제거)
    const allRooms = await ChatRoom.find({ 'participants.user': userId })
      .populate('participants.user', 'username email avatar customStatus')
      .sort({ updatedAt: -1 })

    const roomsWithUnread = []

    for (const room of allRooms) {
      const myLeft = room.leftParticipants.find(
        lp => lp.user.toString() === userId
      )

      // 나간 방이면, 나간 이후 새 메시지가 있는지 확인
      if (myLeft) {
        const hasNewMessage = await Message.exists({
          roomId: room._id,
          createdAt: { $gt: myLeft.leftAt }
        })
        if (!hasNewMessage) continue   // 새 메시지 없으면 목록에서 숨김
      }

      // 안읽음 개수 계산
      const me = room.participants.find(
        p => p.user._id.toString() === userId
      )
      // 나갔던 방이면 leftAt 이후부터, 아니면 lastReadAt 이후부터
      const since = myLeft
        ? new Date(Math.max(myLeft.leftAt, me?.lastReadAt || 0))
        : (me?.lastReadAt || new Date(0))

      const unreadCount = await Message.countDocuments({
        roomId: room._id,
        createdAt: { $gt: since },
        senderId: { $ne: userId }
      })

      // 참여자별 접속 상태 부여 (customStatus는 노출하지 않음)
      const roomObj = room.toObject()
      roomObj.participants = roomObj.participants.map(p => {
        const { customStatus, ...userRest } = p.user || {}
        return {
          ...p,
          user: {
            ...userRest,
            status: getVisibleStatus(String(p.user?._id), customStatus)
          }
        }
      })

      roomsWithUnread.push({ ...roomObj, unreadCount })
    }

    res.json(roomsWithUnread)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// 특정 채팅방 조회
router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.id
    const room = await ChatRoom.findOne({
      _id: roomId,
      'participants.user': userId,
      // 'leftParticipants.user': { $ne: req.user.id }
    })
      .populate('participants.user', 'username email avatar')

    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })

    res.json(room)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// 채팅방 읽음 처리 - lastReadAt 갱신 -> 서버의 socket:read 기능으로 대체됨
// router.patch('/:roomId/read', authMiddleware, async (req, res) => {
//   try {
//     const { roomId } = req.params
//     const userId = req.user.id

//     const result = await ChatRoom.updateOne(
//       { _id: roomId, 'participants.user': userId },
//       { $set: { 'participants.$.lastReadAt': new Date() } }
//     )

//     if (result.matchedCount === 0) {
//       return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })
//     }

//     res.json({ message: '읽음 처리 완료' })
//   } catch (err) {
//     res.status(500).json({ message: err.message })
//   }
// })

// 채팅방 나가기
router.delete('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.id

    const room = await ChatRoom.findById(roomId)
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })

    const result = await ChatRoom.updateOne(
      { _id: roomId, 'leftParticipants.user': userId },
      { $set: { 'leftParticipants.$.leftAt': new Date() } }
    )

    // 매칭되는 게 없으면 (= 처음 나가는 경우) push
    if (result.matchedCount === 0) {
      await ChatRoom.updateOne(
        { _id: roomId },
        { $push: { leftParticipants: { user: userId, leftAt: new Date() } } }
      )
    }

    // 둘 다 나갔으면 채팅방 삭제
    const updatedRoom = await ChatRoom.findById(roomId)
    const allLeft = updatedRoom.participants.every(p =>
      updatedRoom.leftParticipants.map(l => l.user.toString()).includes(p.user.toString())
    )

    // if (allLeft) {
    //   await ChatRoom.findByIdAndDelete(roomId)
    //   await Message.deleteMany({ roomId })
    // }

    if (allLeft) {
      // 가장 이른 leftAt 이후에 메시지가 있는지 확인
      const earliestLeftAt = updatedRoom.leftParticipants.reduce(
        (min, l) => (l.leftAt < min ? l.leftAt : min),
        updatedRoom.leftParticipants[0].leftAt
      )

      const hasMessageAfterLeft = await Message.exists({
        roomId,
        createdAt: { $gt: earliestLeftAt }
      })

      // 나간 뒤 아무도 말 안 걸었으면 → 진짜 죽은 방 → 삭제
      if (!hasMessageAfterLeft) {
        await ChatRoom.findByIdAndDelete(roomId)
        await Message.deleteMany({ roomId })
      }
    }

    // 내 모든 클라이언트에 "이 방 나갔음" 알림
    req.app.get('io').to(`user:${userId}`).emit('room:left', { roomId })

    res.json({ message: '채팅방 나가기 완료' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// 메시지 히스토리
router.get('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { roomId } = req.params

    const room = await ChatRoom.findById(roomId)
    if (!room) return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' })

    // 내가 나갔던 기록 찾기
    const myLeftEntry = room.leftParticipants.find(
      lp => lp.user.toString() === userId
    )

    const query = { roomId }
    if (myLeftEntry) {
      query.createdAt = { $gt: myLeftEntry.leftAt } // greater than. leftAt 보다 큰 시간 가져오는 비교문
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username avatar')
      .sort({ createdAt: 1 })

    res.json(messages)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router