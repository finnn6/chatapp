const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query
    const meId = req.user.id

    const target = await User.findOne({ email }).select('_id username email friends friendRequests')
    if (!target) {
      return res.status(404).json({ message: '유저를 찾을 수 없습니다' })
    }

    const me = await User.findById(meId).select('friends friendRequests')

    // 관계 판별: self | friend | pending | none
    let relationship = 'none'
    if (target._id.toString() === meId) {
      relationship = 'self'
    } else if ((me.friends || []).some(f => f.toString() === target._id.toString())) {
      relationship = 'friend'
    } else if (
      // 내가 상대에게 보낸 요청
      (target.friendRequests || []).some(
        r => r.from.toString() === meId && r.status === 'pending'
      ) ||
      // 상대가 나에게 보낸 요청
      (me.friendRequests || []).some(
        r => r.from.toString() === target._id.toString() && r.status === 'pending'
      )
    ) {
      relationship = 'pending'
    }

    res.json({
      _id: target._id,
      username: target.username,
      email: target.email,
      relationship,
    })

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v')
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    // 그냥 req.body 를 통채로 가져와서 업데이트 시키면 해커가 악의적으로 개인정보를 수정할 수 있기 때문에 걸러줌
    const allowedUpdates = ['statusMessage', 'interests', 'avatar', 'username', 'customStatus']
    const updates = {}
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    )
    console.log(user)
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    }

    res.json(user)
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message })
    }
    console.error(err)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
})

module.exports = router;