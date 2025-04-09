const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 播放列表数据文件路径
const playlistsFilePath = path.join(__dirname, '../../data/playlists.json');
const playlistsContentDir = path.join(__dirname, '../../data/playlists');

// 确保播放列表数据文件和目录存在
const ensurePlaylistsFile = () => {
  // 确保数据目录存在
  const dataDir = path.dirname(playlistsFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 确保播放列表内容目录存在
  if (!fs.existsSync(playlistsContentDir)) {
    fs.mkdirSync(playlistsContentDir, { recursive: true });
  }
  
  // 确保播放列表索引文件存在
  if (!fs.existsSync(playlistsFilePath)) {
    fs.writeFileSync(playlistsFilePath, JSON.stringify([]), 'utf8');
  }
};

// 获取所有播放列表
const getPlaylists = (req, res) => {
  try {
    ensurePlaylistsFile();
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    res.json(playlists);
  } catch (error) {
    console.error('获取播放列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 解析M3U内容
const parseM3U = (content) => {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 跳过空行和注释
    if (!line || line.startsWith('#') && !line.startsWith('#EXTINF:')) {
      continue;
    }
    
    // 解析频道信息
    if (line.startsWith('#EXTINF:')) {
      const titleMatch = line.match(/tvg-name="([^"]*)"|,(.+)$/);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/); 
      const groupMatch = line.match(/group-title="([^"]*)"/); 
      
      currentChannel = {
        title: (titleMatch && (titleMatch[1] || titleMatch[2])) || 'Unknown Channel',
        logo: (logoMatch && logoMatch[1]) || '',
        group: (groupMatch && groupMatch[1]) || 'Uncategorized',
        url: ''
      };
    } else if (currentChannel && !currentChannel.url && (line.startsWith('http') || line.startsWith('rtmp'))) {
      // 设置频道URL
      currentChannel.url = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
};

// 导入播放列表
const importPlaylist = async (req, res) => {
  try {
    const { url, name } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: '播放列表URL是必需的' });
    }
    
    // 下载M3U文件
    const response = await axios.get(url);
    const m3uContent = response.data;
    
    // 解析M3U内容
    const channels = parseM3U(m3uContent);
    
    if (channels.length === 0) {
      return res.status(400).json({ message: '无法解析播放列表或播放列表为空' });
    }
    
    // 创建新播放列表记录
    const playlistId = uuidv4();
    const playlist = {
      id: playlistId,
      name: name || `播放列表 ${new Date().toLocaleString()}`,
      url,
      channelCount: channels.length,
      importedAt: new Date().toISOString(),
      userId: req.user.id
    };
    
    // 保存播放列表内容
    const playlistContentPath = path.join(playlistsContentDir, `${playlistId}.json`);
    fs.writeFileSync(playlistContentPath, JSON.stringify(channels, null, 2), 'utf8');
    
    // 更新播放列表索引
    ensurePlaylistsFile();
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    playlists.push(playlist);
    fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), 'utf8');
    
    res.status(201).json({
      message: '播放列表导入成功',
      playlist
    });
  } catch (error) {
    console.error('导入播放列表错误:', error);
    res.status(500).json({ message: '服务器错误，无法导入播放列表' });
  }
};

// 获取特定播放列表详情
const getPlaylistById = (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取播放列表索引
    ensurePlaylistsFile();
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    const playlist = playlists.find(p => p.id === id);
    
    if (!playlist) {
      return res.status(404).json({ message: '播放列表不存在' });
    }
    
    // 检查权限
    if (playlist.userId !== req.user.id) {
      return res.status(403).json({ message: '无权访问此播放列表' });
    }
    
    // 获取播放列表内容
    const playlistContentPath = path.join(playlistsContentDir, `${id}.json`);
    if (!fs.existsSync(playlistContentPath)) {
      return res.status(404).json({ message: '播放列表内容不存在' });
    }
    
    const channels = JSON.parse(fs.readFileSync(playlistContentPath, 'utf8'));
    
    res.json({
      ...playlist,
      channels
    });
  } catch (error) {
    console.error('获取播放列表详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除播放列表
const deletePlaylist = (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取播放列表索引
    ensurePlaylistsFile();
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    const playlistIndex = playlists.findIndex(p => p.id === id);
    
    if (playlistIndex === -1) {
      return res.status(404).json({ message: '播放列表不存在' });
    }
    
    // 检查权限
    if (playlists[playlistIndex].userId !== req.user.id) {
      return res.status(403).json({ message: '无权删除此播放列表' });
    }
    
    // 删除播放列表内容文件
    const playlistContentPath = path.join(playlistsContentDir, `${id}.json`);
    if (fs.existsSync(playlistContentPath)) {
      fs.unlinkSync(playlistContentPath);
    }
    
    // 更新播放列表索引
    playlists.splice(playlistIndex, 1);
    fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), 'utf8');
    
    res.json({ message: '播放列表删除成功' });
  } catch (error) {
    console.error('删除播放列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = {
  getPlaylists,
  importPlaylist,
  getPlaylistById,
  deletePlaylist
};