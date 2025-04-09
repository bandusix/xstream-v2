const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// 用户注册
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 验证用户令牌
router.get('/verify', authenticateToken, authController.verifyToken);

// 获取用户信息
router.get('/profile', authenticateToken, authController.getUserProfile);

module.exports = router;