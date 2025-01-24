const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['normal', 'admin'],
    default: 'normal'
  },
  files: [{
    filename: String,
    originalName: String,
    uploadDate: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = process.env.SALT;
  this.password = await bcrypt.hash(this.password + salt, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  const salt = process.env.SALT;
  return bcrypt.compare(candidatePassword + salt, this.password);
};

module.exports = mongoose.model('User', userSchema);