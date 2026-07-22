const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const { getVisibleStatus } = require('../onlineUsers');

// 친구 요청 보내기
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    if (userId === friendId) {
      return res.status(400).json({ message: '자기 자신에게 요청할 수 없습니다' });
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다' });
    }

    // 이미 친구인지 확인
    const isAlreadyFriend = (friend.friends || []).some(
      f => f.toString() === userId
    );
    if (isAlreadyFriend) {
      return res.status(400).json({ message: '이미 친구입니다' });
    }

    // 이미 요청했는지 확인
    const already = friend.friendRequests.find(
      r => r.from.toString() === userId && r.status === 'pending'
    );
    if (already) {
      return res.status(400).json({ message: '이미 요청을 보냈습니다' });
    }

    await User.findByIdAndUpdate(friendId, {
      $push: { friendRequests: { from: userId } }
    });

    res.status(201).json({ message: '친구 요청 완료' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 친구 요청 대기 목록
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friendRequests.from', 'username email');
    const pending = user.friendRequests.filter(r => r.status === 'pending');
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 친구 요청 수락/거절
router.patch('/requests/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // 'accepted' | 'rejected'
    const userId = req.user.id;

    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ message: '잘못된 status 값 입니다.' });

    // 요청 상태 변경
    const user = await User.findOneAndUpdate(
      { _id: userId, 'friendRequests._id': requestId },
      { $set: { 'friendRequests.$.status': status } },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ message: '요청을 찾을 수 없습니다. ' });

    const request = user.friendRequests.id(requestId);
    const friendId = request.from.toString();

    // 수락일 때 양방향 친구 추가
    if (status === 'accepted') {
      await User.findByIdAndUpdate(userId, { $push: { friends: friendId } });
      await User.findByIdAndUpdate(friendId, { $push: { friends: userId } });
    }

    // 수락이든 거절이든 처리 끝났으면 요청 제거
    await User.findByIdAndUpdate(userId, {
      $pull: { friendRequests: { _id: requestId } }
    })

    res.json({ message: status === 'accepted' ? '친구 요청 수락' : '친구 요청 거절' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 친구 목록
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username email avatar statusMessage interests customStatus')
    const friends = user.friends.map(f => ({
      _id: f._id,
      username: f.username,
      avatar: f.avatar,
      status: getVisibleStatus(f._id.toString(), f.customStatus),
      statusMessage: f.statusMessage,
      interests: f.interests,
    }))
    res.json(friends)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
});

module.exports = router;