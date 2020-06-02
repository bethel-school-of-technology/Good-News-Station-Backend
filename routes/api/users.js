const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const normalize = require('normalize-url');
const mongoose = require('mongoose');

const User = require('../../models/User');
const checkObjectId = require('../../middleware/checkObjectId');

// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
  '/',
  [
    check('name', 'Name is required')
      .not()
      .isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      const avatar = normalize(
        gravatar.url(email, {
          s: '200',
          r: 'pg',
          d: 'mm'
        }),
        { forceHttps: true }
      );

      user = new User({
        name,
        email,
        avatar,
        password
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: '1 day' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    PUT api/users/follow/:id
// @desc     follow a user
// @access   Private
router.put('/follow/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const me = await User.findById(req.user.id);

    if (me.id === user.id) {
      return res.status(400).json({ alreadyfollow: "You cannot follow yourself" })
    }

    if (user.followers.some((follow) => follow.user.toString() === me.id)) {
      return res.status(400).json({ msg: 'User already followed' });
    } else {
      user.followers.unshift({ user: me.id });
      await user.save();

      if (me.following.some((follow) => follow.user.toString() === user.id)) {
        
      } else {
        me.following.unshift({ user: user.id });
        await me.save();
      }

      res.status(200).json({ followers: user.followers });

      return res.json(user.following);
      
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/users/unfollow/:id
// @desc     Unfollow a user
// @access   Private
router.put('/unfollow/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const me = await User.findById(req.user.id);

    console.log("user: ", user.id);
    console.log("me: ", me.id);

    if (user.followers.some((follow) => follow.user.toString() === me.id)) {
      
      user.followers.shift({ user: me.id });
      await user.save();

      if (me.following.some((follow) => follow.user.toString() === user.id)) {
        me.following.shift({ user: user.id });
        await me.save();
      } else {
        
        console.log("Succesfully unfollowed user");

      }

      res.status(200).json({ followers: user.followers });
      return res.json(user.following);

    } else {
      return res.status(400).json({ msg: 'Not Sucessful' });
      

    
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/user/:user_id
// @desc     Get user by user ID
// @access   Public
router.get('/:user_id', async ({ params: { user_id } }, res) => {
  // check if the id is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(user_id))
      return res.status(400).json({ msg: 'Invalid user ID' });

  try {
      const user = await User.findOne({
          _id: user_id
      }).populate('user', ['name', 'email', 'avatar', 'following', 'followers']);
console.log('user_id', user_id);
console.log('user', user);
      if (!user) return res.status(400).json({ msg: 'User not found' });

      return res.json(user);
  } catch (err) {
      console.error(err.message);
      return res.status(400).json({ msg: 'User not found' });
  }
});



module.exports = router;
