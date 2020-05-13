const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

//method for a user to favorite an article
UserSchema.methods.favorite = function (id) {
  if (this.favorites.indexOf(id) === -1) {
      this.favorites.push(id);
  }

  return this.save();
};

//method for a user to unfavorite an article
UserSchema.methods.unfavorite = function (id) {
  this.favorites.remove(id);
  return this.save();
};

//method for a user to check if they've favorited an article
UserSchema.methods.isFavorite = function (id) {
  return this.favorites.some(function (favoriteId) {
      return favoriteId.toString() === id.toString();
  });
};

//method for a following another user
UserSchema.methods.follow = function (id) {
  if (this.following.indexOf(id) === -1) {
      this.following.push(id);
  }

  return this.save();
};

//method for a unfollowing another user
UserSchema.methods.unfollow = function (id) {
  this.following.remove(id);
  return this.save();
};

//method for checking if a user is following another user
UserSchema.methods.isFollowing = function (id) {
  return this.following.some(function (followId) {
      return followId.toString() === id.toString();
  });
};

module.exports = User = mongoose.model('user', UserSchema);
