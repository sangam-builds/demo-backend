const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/userModel');
const TokenBlacklist = require('../models/tokenBlacklistModel');
const { extractBearerToken } = require('../middleware/authMiddleware');

function getJwtSecret() {
  return process.env.JWT_SECRET;
}

function buildToken(user) {
  const secret = getJwtSecret();

  if (!secret) {
    throw new Error('JWT_SECRET is not configured on server');
  }

  const payload = {
    sub: user.id,
    email: user.email,
  };

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

async function signup(req, res) {
  const { name = '', email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'email is required and must be a string' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'password must be at least 6 characters' });
  }

  try {
    if (!getJwtSecret()) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: typeof name === 'string' ? name.trim() : '',
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = buildToken(user);

    return res.status(201).json({
      message: 'Signup successful',
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create user' });
  }
}

function login(req, res, next) {
  passport.authenticate('local', { session: false }, (error, user, info) => {
    if (error) {
      return res.status(500).json({ message: 'Login failed' });
    }

    if (!user) {
      return res.status(401).json({ message: info && info.message ? info.message : 'Invalid credentials' });
    }

    let token;

    try {
      token = buildToken(user);
    } catch (tokenError) {
      return res.status(500).json({ message: tokenError.message });
    }

    return res.status(200).json({
      message: 'Login successful',
      token,
      user,
    });
  })(req, res, next);
}

async function logout(req, res) {
  try {
    const secret = getJwtSecret();

    if (!secret) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
    }

    const token = extractBearerToken(req);

    if (!token) {
      return res.status(400).json({ message: 'Authorization token is required' });
    }

    const decoded = jwt.verify(token, secret);
    const expiresAt = new Date(decoded.exp * 1000);

    await TokenBlacklist.findOneAndUpdate(
      { token },
      { token, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(200).json({ message: 'Token already expired' });
    }

    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = {
  signup,
  login,
  logout,
};
