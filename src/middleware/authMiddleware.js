const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/tokenBlacklistModel');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1];
}

async function authenticateJWT(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authorization token is missing' });
  }

  const blacklistedToken = await TokenBlacklist.findOne({ token });

  if (blacklistedToken) {
    return res.status(401).json({ message: 'Token is no longer valid' });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
    }

    const payload = jwt.verify(token, secret);
    req.user = payload;
    req.token = token;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = {
  authenticateJWT,
  extractBearerToken,
};
