const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 用户数据文件路径
const usersFilePath = path.join(__dirname, '../../data/users.json');

// 确保用户数据文件存在
const ensureUsersFile = () => {
  const dataDir = path.dirname(usersFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([]), 'utf8');
  }
};

// 获取所有用户
const getUsers = () => {
  ensureUsersFile();
  try {
    return JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
  } catch (error) {
    console.error('读取用户数据失败:', error);
    return [];
  }
};

// 保存用户数据
const saveUsers = (users) => {
  ensureUsersFile();
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存用户数据失败:', error);
    return false;
  }
};

// 用户注册
const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码都是必需的' });
    }
    
    // 获取现有用户
    const users = getUsers();
    
    // 检查用户名是否已存在
    if (users.some(user => user.username === username)) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      password: password, // 存储明文密码用于IPTV客户端认证
      hashedPassword, // 存储哈希密码用于Web认证
      createdAt: new Date().toISOString()
    };
    
    // 保存新用户
    users.push(newUser);
    saveUsers(users);
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      process.env.JWT_SECRET || 'xstream_secret_key',
      { expiresIn: '7d' }
    );
    
    // 返回用户信息和令牌
    res.status(201).json({
      message: '用户注册成功',
      user: {
        id: newUser.id,
        username: newUser.username
      },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码都是必需的' });
    }
    
    // 获取用户
    const users = getUsers();
    const user = users.find(u => u.username === username);
    
    // 检查用户是否存在
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'xstream_secret_key',
      { expiresIn: '7d' }
    );
    
    // 返回用户信息和令牌
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 验证令牌
const verifyToken = (req, res) => {
  // 如果中间件通过，则令牌有效
  res.json({ valid: true, user: req.user });
};

// 获取用户信息
const getUserProfile = (req, res) => {
  try {
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = {
  register,
  login,
  verifyToken,
  getUserProfile
};