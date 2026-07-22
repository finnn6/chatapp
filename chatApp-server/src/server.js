const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authMiddleware = require('./middleware/auth');
const chatroomRouter = require('./routes/chatrooms');
const ChatRoom = require('./models/ChatRoom');
const { onlineUsers, getVisibleStatus } = require('./onlineUsers');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// MongoDB 연결
const connectDB = require('./db');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

// MongoDB 연결 실행
connectDB();

// CORS 설정 (Electron에서 접근 가능하게)
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use('/auth', require('./routes/auth'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/chatrooms', chatroomRouter);
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// passport 초기화
app.use(passport.initialize());
const User = require('./models/User');

// Socket.io 설정
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true
  }
});
app.set('io', io);   // ⭐ 라우터에서 io 쓸 수 있게

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3001/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      console.log("없음")
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName, // google name
        username: profile.displayName
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// WebSocket 연결
const offlineTimers = new Map()  // 새로고침 시 상대방 화면에서 온/오프라인 이동 방지

io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('토큰이 없습니다'))

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.id  // jwt.sign 안에 있는 payload
    socket.username = decoded.username
    next()
  } catch (err) {
    next(new Error('유효하지 않은 토큰입니다'))
  }
})

io.on('connection', async (socket) => {
  console.log('클라이언트 연결:', socket.id)
  const userId = socket.userId

  socket.join(`user:${userId}`) // 개인 소켓 join. 메시지 실시간 처리

  // 재연결시 (새로고침 시 소켓 타임아웃 해결)
  if (offlineTimers.has(userId)) {
    clearTimeout(offlineTimers.get(userId))
    offlineTimers.delete(userId)
  }

  // 그릇 없으면 만들고, 이번 연결 추가
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
  const wasOffline = onlineUsers.get(userId).size === 0
  onlineUsers.get(userId).add(socket.id)

  // 첫 연결일 때만 친구들에게 온라인 알림
  if (wasOffline) {
    const user = await User.findById(userId).select('customStatus')
    console.log('connection userId:', userId, typeof userId)
    const visible = getVisibleStatus(userId, user.customStatus)
    if (visible !== 'offline') {  // invisible이면 알리지 않음
      socket.broadcast.emit('user:status', { userId, status: visible })
    }
  }

  socket.on('user:status', async ({ status }) => {
    try {
      await User.findByIdAndUpdate(userId, { customStatus: status })  // ⭐ DB 저장
      const visibleForOthers = status === 'invisible' ? 'offline' : status
      socket.broadcast.emit('user:status', { userId, status: visibleForOthers })
    } catch (err) {
      console.error('status update failed:', err)
    }
  })

  // 채팅방 입장
  socket.on('room:join', (roomId) => {
    socket.join(roomId)
    console.log(`${socket.id} joined room ${roomId}`)
  })

  // 채팅방 퇴장
  socket.on('room:leave', (roomId) => {
    socket.leave(roomId)
    console.log(`${socket.id} left room ${roomId}`)
  })

  // 메시지 수신
  socket.on('message', async ({ roomId, senderId, text }) => {
    try {
      const message = new Message({
        roomId,
        senderId,
        text
      })

      await message.save()

      // lastMessage 업데이트 + 발신자를 leftParticipants에서 제거
      await ChatRoom.updateOne(
        { _id: roomId },
        {
          $set: { lastMessage: text },
          // $pull: { leftParticipants: { user: senderId } }
        }
      )

      // populate해서 발화자 정보 포함
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username avatar')

      // 해당 방에만 전송
      io.to(roomId).emit('message', populatedMessage)

      // 실시간 메시지 방 목록 갱신용 → 참가자 전원의 개인 룸으로
      const room = await ChatRoom.findById(roomId)
      room.participants.forEach(p => {
        const participantId = p.user.toString()
        io.to(`user:${participantId}`).emit('room:update', {
          roomId,
          lastMessage: text,
          senderId,   // 누가 보냈는지 (내가 보낸 거면 unread 안 올리려고)
          senderName: populatedMessage.senderId.username,
        })
      })
    } catch (err) {
      console.error('메시지 저장 실패:', err)
    }
  })

  // 실시간 메시지 읽음 처리
  socket.on('room:read', async (roomId) => {
    const userId = socket.userId
    try {
      // lastReadAt 갱신
      await ChatRoom.updateOne(
        { _id: roomId, 'participants.user': userId },
        { $set: { 'participants.$.lastReadAt': new Date() } }
      )
      // 내 모든 개인 룸에 "이 방 읽음" 알림
      io.to(`user:${userId}`).emit('room:read', { roomId })
    } catch (err) {
      console.error('읽음 처리 실패:', err)
    }
  })

  // 타이핑
  socket.on('typing:start', async ({ roomId }) => {
    const userId = socket.userId
    const user = await User.findById(userId).select('username')

    // 본인에게도 보이기 위해 socket.to 가 아닌 io.to 를 씀.
    io.to(roomId).emit('typing:start', {
      userId,
      username: user.username,
    })
  })

  socket.on('typing:stop', ({ roomId }) => {
    io.to(roomId).emit('typing:stop', { userId: socket.userId })
  })

  // 연결 해제
  socket.on('disconnect', () => {
    console.log(`[disconnect] socket=${socket.id}`)

    for (const [userId, socketIds] of onlineUsers.entries()) {
      if (socketIds.has(socket.id)) {
        socketIds.delete(socket.id)
        console.log(`  → removed ${socket.id} from ${userId}, remaining: ${[...socketIds]}`)

        if (socketIds.size === 0) {
          const timer = setTimeout(() => {
            onlineUsers.delete(userId)
            offlineTimers.delete(userId)
            io.emit('user:status', { userId, status: 'offline' })
          }, 5000)
          offlineTimers.set(userId, timer)
        }
        break
      }
    }
  })
})


const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
