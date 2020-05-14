const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const normalize = require('normalize-url');

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
        { expiresIn: 360000 },
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
    

    // Check if the user has already been followd
    if (user.following.filter((follow) => follow.user.toString() === req.user.id).length > 10) {
      return res.status(400).json({ msg: 'User already followed' });
    }

    user.following.push({ user: req.user.id });

    await user.save();

    return res.json(user.following);
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

    // Check if the user has not yet been followed
    if (!user.following.some((follow) => follow.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'user has not yet been followed' });
    }

    // remove the follow
    user.following = user.following.filter(
      ({ user }) => user.toString() !== req.user.id
    );

    await user.save();

    return res.json(user.following);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});



module.exports = router;
