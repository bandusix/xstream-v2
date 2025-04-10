const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { authenticateToken } = require('../middleware/auth');
const upload = playlistController.uploadConfig();

// 导入在线M3U播放列表
router.post('/import', authenticateToken, playlistController.importPlaylist);

// 上传M3U文件
router.post('/upload', authenticateToken, upload.single('file'), playlistController.importFilePlaylist);

// 获取所有导入的播放列表
router.get('/list', authenticateToken, playlistController.getPlaylists);

// 获取特定播放列表详情
router.get('/:id', authenticateToken, playlistController.getPlaylistById);

// 删除播放列表
router.delete('/:id', authenticateToken, playlistController.deletePlaylist);

module.exports = router;