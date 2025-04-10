const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// 用户数据文件路径
const usersFilePath = path.join(__dirname, '../../data/users.json');

// 验证JWT令牌的中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供访问令牌' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'xstream_secret_key');
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: '无效或过期的令牌' });
  }
};

// 验证基本认证的中间件（用于IPTV客户端）
const authenticateBasic = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: '需要基本认证' });
  }

  // 解码 Basic Auth 信息
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // 验证用户名和密码
  if (username !== process.env.VALID_USERNAME || password !== process.env.VALID_PASSWORD) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  next();
};

module.exports = {
  authenticateToken,
  authenticateBasic
};