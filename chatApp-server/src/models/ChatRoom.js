const mongoose = require('mongoose')

const chatRoomSchema = new mongoose.Schema({
  // participants: [{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User'
  // }],
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastReadAt: { type: Date, default: Date.now }
  }],
  leftParticipants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    leftAt: { type: Date, default: Date.now }
  }],
  lastMessage: {
    type: String,
    default: ''
  },
}, { timestamps: true })

module.exports = mongoose.model('ChatRoom', chatRoomSchema)