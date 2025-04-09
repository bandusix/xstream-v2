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
  
  // 记录认证请求信息（不包含敏感信息）
  console.log('XStream认证请求:', {
    url: req.originalUrl,
    query: req.query,
    method: req.method,
    hasAuth: !!authHeader
  });
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.log('认证失败: 缺少Basic认证头');
    // 返回401但不发送WWW-Authenticate头，避免浏览器弹出认证框
    return res.status(401).json({ message: '需要基本认证' });
  }
  
  // 解码Base64编码的凭据
  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');
    
    console.log(`尝试认证用户: ${username}`);
    
    // 验证用户
    if (!fs.existsSync(usersFilePath)) {
      console.log('认证失败: 用户数据文件不存在');
      return res.status(401).json({ message: '认证失败' });
    }
    
    // 检查是否是XStream连接的用户名和密码
    const xstreamConnectionsFilePath = path.join(__dirname, '../../data/xstream_connections.json');
    if (fs.existsSync(xstreamConnectionsFilePath)) {
      const connections = JSON.parse(fs.readFileSync(xstreamConnectionsFilePath, 'utf8'));
      const connection = connections.find(conn => conn.username === username && conn.password === password);
      
      if (connection) {
        console.log(`找到匹配的XStream连接: ${connection.id}`);
        // 从用户数据中获取完整用户信息
        const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        const user = usersData.find(u => u.id === connection.userId);
        
        if (user) {
          console.log(`XStream认证成功: 用户 ${user.username}`);
          req.user = { id: user.id, username: user.username };
          req.xstreamConnection = connection; // 保存XStream连接信息以供后续使用
          return next();
        }
      } else {
        console.log('未找到匹配的XStream连接');
      }
    }
    
    // 如果不是XStream连接，检查普通用户
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const user = usersData.find(u => u.username === username);
    
    if (!user || user.password !== password) { // 注意：实际应用中应使用bcrypt比较
      console.log('认证失败: 用户名或密码错误');
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    console.log(`普通用户认证成功: ${user.username}`);
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