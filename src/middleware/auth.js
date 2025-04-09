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
  // 获取Authorization头
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: '需要基本认证' });
  }
  
  // 解码Base64编码的凭据
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');
  
  // 验证用户
  try {
    if (!fs.existsSync(usersFilePath)) {
      return res.status(401).json({ message: '认证失败' });
    }
    
    // 检查是否是XStream连接的用户名和密码
    const xstreamConnectionsFilePath = path.join(__dirname, '../../data/xstream_connections.json');
    if (fs.existsSync(xstreamConnectionsFilePath)) {
      const connections = JSON.parse(fs.readFileSync(xstreamConnectionsFilePath, 'utf8'));
      const connection = connections.find(conn => conn.username === username && conn.password === password);
      
      if (connection) {
        // 从用户数据中获取完整用户信息
        const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        const user = usersData.find(u => u.id === connection.userId);
        
        if (user) {
          req.user = { id: user.id, username: user.username };
          return next();
        }
      }
    }
    
    // 如果不是XStream连接，检查普通用户
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const user = usersData.find(u => u.username === username);
    
    if (!user || user.password !== password) { // 注意：实际应用中应使用bcrypt比较
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    req.user = { id: user.id, username: user.username };
    next();
  } catch (error) {
    console.error('认证错误:', error);
    return res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = {
  authenticateToken,
  authenticateBasic
};