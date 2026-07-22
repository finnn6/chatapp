const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String },
  username: { type: String },
  email: { type: String },
  name: { type: String },

  avatar: {
    type: Number,
    default: () => Math.floor(Math.random() * 27) + 1,
    min: 1,
    max: 27
  },
  statusMessage: {
    type: String,
    default: '',
    maxlength: 50
  },
  interests: [{
    type: String,
    maxlength: 20  // 태그 하나당 20자 제한
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],
  customStatus: {
    type: String,
    enum: ['online', 'away', 'busy', 'invisible'],
    default: 'online'
  }
});

module.exports = mongoose.model('User', userSchema);