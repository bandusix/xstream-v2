const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 播放列表数据文件路径
const playlistsFilePath = path.join(__dirname, '../../data/playlists.json');
const playlistsContentDir = path.join(__dirname, '../../data/playlists');

// 确保播放列表数据文件和目录存在
const ensurePlaylistsFile = () => {
  try {
    // 确保数据目录存在
    const dataDir = path.dirname(playlistsFilePath);
    if (!fs.existsSync(dataDir)) {
      console.log(`创建数据目录: ${dataDir}`);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 确保播放列表内容目录存在
    if (!fs.existsSync(playlistsContentDir)) {
      console.log(`创建播放列表内容目录: ${playlistsContentDir}`);
      fs.mkdirSync(playlistsContentDir, { recursive: true });
    }
    
    // 确保播放列表索引文件存在
    if (!fs.existsSync(playlistsFilePath)) {
      console.log(`创建播放列表索引文件: ${playlistsFilePath}`);
      fs.writeFileSync(playlistsFilePath, JSON.stringify([]), 'utf8');
    }
    return true;
  } catch (error) {
    console.error('创建必要目录或文件时出错:', error);
    return false;
  }
};

// 获取所有播放列表
const getPlaylists = (req, res) => {
  try {
    const dirCreated = ensurePlaylistsFile();
    if (!dirCreated) {
      return res.status(500).json({ message: '无法创建必要的目录结构' });
    }
    
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    res.json(playlists);
  } catch (error) {
    console.error('获取播放列表错误:', error);
    res.status(500).json({ message: '服务器错误: ' + error.message });
  }
};

// 解析M3U内容
const parseM3U = (content) => {
  console.log('开始解析M3U内容');
  
  // 检查内容是否为有效的M3U文件
  if (!content.includes('#EXTM3U')) {
    console.error('内容不是有效的M3U格式');
    return [];
  }
  
  // 规范化换行符
  const normalizedContent = content.replace(/\r\n|\r/g, '\n');
  const lines = normalizedContent.split('\n');
  console.log(`M3U文件包含 ${lines.length} 行`);
  
  const channels = [];
  let currentChannel = null;
  let lineCount = 0;
  let channelCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    lineCount++;
    
    // 跳过空行
    if (!line) {
      continue;
    }
    
    // 处理EXTINF行（频道信息）
    if (line.startsWith('#EXTINF:')) {
      try {
        // 尝试多种格式匹配标题
        let title = 'Unknown Channel';
        let logo = '';
        let group = 'Uncategorized';
        
        // 匹配tvg-name属性
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
        if (tvgNameMatch && tvgNameMatch[1]) {
          title = tvgNameMatch[1];
        }
        
        // 匹配tvg-logo属性
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
        if (tvgLogoMatch && tvgLogoMatch[1]) {
          logo = tvgLogoMatch[1];
        }
        
        // 匹配group-title属性
        const groupTitleMatch = line.match(/group-title="([^"]*)"/i);
        if (groupTitleMatch && groupTitleMatch[1]) {
          group = groupTitleMatch[1];
        }
        
        // 如果没有找到tvg-name，尝试从逗号后面提取标题
        if (title === 'Unknown Channel') {
          const commaMatch = line.match(/,(.+)$/);
          if (commaMatch && commaMatch[1]) {
            title = commaMatch[1].trim();
          }
        }
        
        currentChannel = {
          title: title,
          logo: logo,
          group: group,
          url: ''
        };
      } catch (error) {
        console.error(`解析第 ${i+1} 行时出错:`, error.message);
        console.error('行内容:', line);
        // 继续处理下一行
        currentChannel = null;
      }
    } 
    // 处理URL行
    else if (currentChannel && !currentChannel.url && 
             (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('/') || line.includes('://')) && 
             !line.startsWith('#')) {
      currentChannel.url = line;
      channels.push(currentChannel);
      channelCount++;
      currentChannel = null;
    }
    // 处理其他特殊标签
    else if (line.startsWith('#EXTVLCOPT:') || line.startsWith('#KODIPROP:')) {
      // 处理VLC或Kodi特定选项，可以添加到当前频道的额外属性中
      if (currentChannel) {
        const optMatch = line.match(/:(http-user-agent|user-agent)=(.+)/i);
        if (optMatch) {
          currentChannel.userAgent = optMatch[2];
        }
      }
    }
  }
  
  console.log(`解析完成，处理了 ${lineCount} 行，找到 ${channelCount} 个频道`);
  return channels;
};

// 导入播放列表
const importPlaylist = async (req, res) => {
  try {
    const { url, name } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: '播放列表URL是必需的' });
    }
    
    console.log(`开始导入播放列表: ${url}`);
    
    // 检查目录结构
    const dirCreated = ensurePlaylistsFile();
    if (!dirCreated) {
      return res.status(500).json({ message: '无法创建必要的目录结构' });
    }
    
    // 记录内存使用情况
    const memoryBefore = process.memoryUsage();
    console.log(`内存使用情况(开始): RSS=${Math.round(memoryBefore.rss / 1024 / 1024)}MB, Heap=${Math.round(memoryBefore.heapUsed / 1024 / 1024)}MB`);
    
    // 下载M3U文件
    try {
      // 设置超时和响应类型
      const response = await axios.get(url, {
        timeout: 60000, // 60秒超时
        responseType: 'text',
        maxContentLength: 50 * 1024 * 1024, // 50MB最大内容限制
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.data) {
        console.error('M3U内容为空');
        return res.status(400).json({ message: '下载的播放列表内容为空' });
      }
      
      const m3uContent = response.data;
      console.log(`成功下载M3U内容，大小: ${m3uContent.length} 字节`);
      
      // 记录下载后内存使用情况
      const memoryAfterDownload = process.memoryUsage();
      console.log(`内存使用情况(下载后): RSS=${Math.round(memoryAfterDownload.rss / 1024 / 1024)}MB, Heap=${Math.round(memoryAfterDownload.heapUsed / 1024 / 1024)}MB`);
      
      // 解析M3U内容
      const channels = parseM3U(m3uContent);
      console.log(`解析到 ${channels.length} 个频道`);
      
      // 记录解析后内存使用情况
      const memoryAfterParse = process.memoryUsage();
      console.log(`内存使用情况(解析后): RSS=${Math.round(memoryAfterParse.rss / 1024 / 1024)}MB, Heap=${Math.round(memoryAfterParse.heapUsed / 1024 / 1024)}MB`);
      
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
      
      // 确保目录存在
      ensurePlaylistsFile();
      
      // 保存播放列表内容
      const playlistContentPath = path.join(playlistsContentDir, `${playlistId}.json`);
      try {
        fs.writeFileSync(playlistContentPath, JSON.stringify(channels, null, 2), 'utf8');
        console.log(`播放列表内容已保存到: ${playlistContentPath}`);
      } catch (fsError) {
        console.error('保存播放列表内容错误:', fsError);
        return res.status(500).json({ message: '无法保存播放列表内容: ' + fsError.message });
      }
      
      // 更新播放列表索引
      try {
        const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
        playlists.push(playlist);
        fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), 'utf8');
        console.log('播放列表索引已更新');
      } catch (indexError) {
        console.error('更新播放列表索引错误:', indexError);
        // 尝试删除已创建的内容文件
        if (fs.existsSync(playlistContentPath)) {
          try {
            fs.unlinkSync(playlistContentPath);
          } catch (cleanupError) {
            console.error('清理失败的播放列表内容文件错误:', cleanupError);
          }
        }
        return res.status(500).json({ message: '无法更新播放列表索引: ' + indexError.message });
      }
      
      res.status(201).json({
        message: '播放列表导入成功',
        playlist
      });
      
    } catch (axiosError) {
      console.error('下载M3U文件错误:', axiosError.message);
      if (axiosError.response) {
        console.error('响应状态:', axiosError.response.status);
        console.error('响应头:', axiosError.response.headers);
      }
      return res.status(400).json({ message: `无法下载播放列表: ${axiosError.message}` });
    }
  } catch (error) {
    console.error('导入播放列表错误:', error);
    res.status(500).json({ message: '服务器错误，无法导入播放列表: ' + error.message });
  }
};

// 获取特定播放列表详情
const getPlaylistById = (req, res) => {
  try {
    const { id } = req.params;
    console.log(`获取播放列表详情，ID: ${id}`);
    
    // 获取播放列表索引
    const dirCreated = ensurePlaylistsFile();
    if (!dirCreated) {
      return res.status(500).json({ message: '无法创建必要的目录结构' });
    }
    
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    const playlist = playlists.find(p => p.id === id);
    
    if (!playlist) {
      console.log(`播放列表不存在，ID: ${id}`);
      return res.status(404).json({ message: '播放列表不存在' });
    }
    
    // 检查权限
    if (playlist.userId !== req.user.id) {
      console.log(`无权访问播放列表，用户ID: ${req.user.id}, 播放列表所有者ID: ${playlist.userId}`);
      return res.status(403).json({ message: '无权访问此播放列表' });
    }
    
    // 获取播放列表内容
    const playlistContentPath = path.join(playlistsContentDir, `${id}.json`);
    if (!fs.existsSync(playlistContentPath)) {
      console.log(`播放列表内容文件不存在: ${playlistContentPath}`);
      return res.status(404).json({ message: '播放列表内容不存在' });
    }
    
    const channels = JSON.parse(fs.readFileSync(playlistContentPath, 'utf8'));
    console.log(`成功获取播放列表详情，频道数量: ${channels.length}`);
    
    res.json({
      ...playlist,
      channels
    });
  } catch (error) {
    console.error('获取播放列表详情错误:', error);
    res.status(500).json({ message: '服务器错误: ' + error.message });
  }
};

// 删除播放列表
const deletePlaylist = (req, res) => {
  try {
    const { id } = req.params;
    console.log(`删除播放列表，ID: ${id}`);
    
    // 获取播放列表索引
    const dirCreated = ensurePlaylistsFile();
    if (!dirCreated) {
      return res.status(500).json({ message: '无法创建必要的目录结构' });
    }
    
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    const playlistIndex = playlists.findIndex(p => p.id === id);
    
    if (playlistIndex === -1) {
      console.log(`播放列表不存在，ID: ${id}`);
      return res.status(404).json({ message: '播放列表不存在' });
    }
    
    // 检查权限
    if (playlists[playlistIndex].userId !== req.user.id) {
      console.log(`无权删除播放列表，用户ID: ${req.user.id}, 播放列表所有者ID: ${playlists[playlistIndex].userId}`);
      return res.status(403).json({ message: '无权删除此播放列表' });
    }
    
    // 删除播放列表内容文件
    const playlistContentPath = path.join(playlistsContentDir, `${id}.json`);
    if (fs.existsSync(playlistContentPath)) {
      try {
        fs.unlinkSync(playlistContentPath);
        console.log(`已删除播放列表内容文件: ${playlistContentPath}`);
      } catch (fsError) {
        console.error(`删除播放列表内容文件错误: ${fsError.message}`);
        return res.status(500).json({ message: `无法删除播放列表内容文件: ${fsError.message}` });
      }
    } else {
      console.log(`播放列表内容文件不存在: ${playlistContentPath}`);
    }
    
    // 更新播放列表索引
    try {
      playlists.splice(playlistIndex, 1);
      fs.writeFileSync(playlistsFilePath, JSON.stringify(playlists, null, 2), 'utf8');
      console.log('播放列表索引已更新');
    } catch (indexError) {
      console.error(`更新播放列表索引错误: ${indexError.message}`);
      return res.status(500).json({ message: `无法更新播放列表索引: ${indexError.message}` });
    }
    
    res.json({ message: '播放列表删除成功' });
  } catch (error) {
    console.error('删除播放列表错误:', error);
    res.status(500).json({ message: '服务器错误: ' + error.message });
  }
};

module.exports = {
  getPlaylists,
  importPlaylist,
  getPlaylistById,
  deletePlaylist
};