const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { authenticateToken } = require('../middleware/auth');

// 导入在线M3U播放列表
router.post('/import', authenticateToken, playlistController.importPlaylist);

// 获取所有导入的播放列表
router.get('/list', authenticateToken, playlistController.getPlaylists);

// 获取特定播放列表详情
router.get('/:id', authenticateToken, playlistController.getPlaylistById);

// 删除播放列表
router.delete('/:id', authenticateToken, playlistController.deletePlaylist);

module.exports = router;