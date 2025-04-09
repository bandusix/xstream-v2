const express = require('express');
const router = express.Router();
const xstreamController = require('../controllers/xstreamController');
const { authenticateToken, authenticateBasic } = require('../middleware/auth');

// 生成XStream连接
router.post('/generate', authenticateToken, xstreamController.generateXstreamConnection);

// 获取用户的XStream连接列表
router.get('/list', authenticateToken, xstreamController.listXstreamConnections);

// 获取特定XStream连接详情
router.get('/:id', authenticateToken, xstreamController.getXstreamConnectionById);

// 删除XStream连接
router.delete('/:id', authenticateToken, xstreamController.deleteXstreamConnection);

// XStream IPTV客户端API
// 这些端点使用基本认证，用于IPTV客户端访问
router.get('/player_api.php', authenticateBasic, xstreamController.handleXstreamRequest);

module.exports = router;