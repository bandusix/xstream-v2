const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// XStream连接数据文件路径
const xstreamConnectionsFilePath = path.join(__dirname, '../../data/xstream_connections.json');
const playlistsFilePath = path.join(__dirname, '../../data/playlists.json');
const playlistsContentDir = path.join(__dirname, '../../data/playlists');

// 确保XStream连接数据文件存在
const ensureXstreamConnectionsFile = () => {
  const dataDir = path.dirname(xstreamConnectionsFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(xstreamConnectionsFilePath)) {
    fs.writeFileSync(xstreamConnectionsFilePath, JSON.stringify([]), 'utf8');
  }
};

// 生成随机密码
const generateRandomPassword = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// 生成XStream连接
const generateXstreamConnection = (req, res) => {
  try {
    const { playlistId } = req.body;
    
    if (!playlistId) {
      return res.status(400).json({ message: '播放列表ID是必需的' });
    }
    
    // 检查播放列表是否存在
    if (!fs.existsSync(playlistsFilePath)) {
      return res.status(404).json({ message: '没有找到任何播放列表' });
    }
    
    const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      return res.status(404).json({ message: '播放列表不存在' });
    }
    
    // 检查权限
    if (playlist.userId !== req.user.id) {
      return res.status(403).json({ message: '无权访问此播放列表' });
    }
    
    // 生成XStream连接 - 动态获取当前部署域名
    let serverAddress;
    let serverPort = process.env.PORT || 3000;
    
    // Railway环境变量处理 - 优先级从高到低
    if (process.env.RAILWAY_STATIC_URL) {
      // 使用Railway提供的静态URL（已包含完整URL和端口）
      serverAddress = process.env.RAILWAY_STATIC_URL;
      console.log(`[Railway部署] 使用Railway静态URL: ${serverAddress}`);
    } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      // 使用Railway提供的公共域名（Railway自动处理HTTPS和端口）
      serverAddress = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
      console.log(`[Railway部署] 使用Railway公共域名: ${serverAddress}`);
    } else if (process.env.SERVER_ADDRESS) {
      // 使用自定义服务器地址（完整的自定义地址，包含协议和可能的端口）
      serverAddress = process.env.SERVER_ADDRESS;
      console.log(`[自定义部署] 使用SERVER_ADDRESS环境变量: ${serverAddress}`);
    } else if (process.env.HOST) {
      // 使用HOST环境变量
      const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
      serverAddress = `${protocol}://${process.env.HOST}`;
      // 只有在非标准端口时才添加端口号
      const isStandardPort = (protocol === 'http' && serverPort === 80) || 
                            (protocol === 'https' && serverPort === 443);
      if (!isStandardPort) {
        serverAddress += `:${serverPort}`;
      }
      console.log(`[标准部署] 使用HOST环境变量: ${serverAddress}`);
    } else {
      // 从请求头中提取域名
      const host = req.get('host');
      if (host) {
        // 检查是否已包含协议
        const protocol = req.protocol || (req.get('x-forwarded-proto') || 'http');
        serverAddress = host.includes('://') ? host : `${protocol}://${host}`;
        console.log(`[动态检测] 从请求头获取域名: ${serverAddress}`);
      } else {
        // 默认回退地址
        serverAddress = `http://localhost:${serverPort}`;
        console.log(`[本地开发] 使用默认回退地址: ${serverAddress}`);
      }
    }
    
    // 确保地址格式正确
    if (!serverAddress.startsWith('http://') && !serverAddress.startsWith('https://')) {
      serverAddress = `http://${serverAddress}`;
    }
    
    // 记录最终使用的服务器地址
    console.log(`最终使用的服务器地址: ${serverAddress}`);
    const username = `user_${req.user.id.substring(0, 8)}`;
    const password = generateRandomPassword();
    
    // 创建新的XStream连接
    // 确保serverAddress不包含尾部斜杠，这对XStream客户端很重要
    if (serverAddress.endsWith('/')) {
      serverAddress = serverAddress.slice(0, -1);
    }
    
    // 构建完整的XStream API URL
    const xstreamApiUrl = serverAddress;
    
    const connection = {
      id: uuidv4(),
      userId: req.user.id,
      playlistId,
      name: playlist.name,
      serverAddress: xstreamApiUrl,
      username,
      password,
      createdAt: new Date().toISOString()
    };
    
    // 保存XStream连接
    ensureXstreamConnectionsFile();
    const connections = JSON.parse(fs.readFileSync(xstreamConnectionsFilePath, 'utf8'));
    connections.push(connection);
    fs.writeFileSync(xstreamConnectionsFilePath, JSON.stringify(connections, null, 2), 'utf8');
    
    res.status(201).json({
      message: 'XStream连接生成成功',
      serverAddress,
      username,
      password
    });
  } catch (error) {
    console.error('生成XStream连接错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取用户的XStream连接列表
const listXstreamConnections = (req, res) => {
  try {
    ensureXstreamConnectionsFile();
    const connections = JSON.parse(fs.readFileSync(xstreamConnectionsFilePath, 'utf8'));
    
    // 过滤出用户的连接
    const userConnections = connections.filter(conn => conn.userId === req.user.id);
    
    res.json(userConnections);
  } catch (error) {
    console.error('获取XStream连接列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取特定XStream连接详情
const getXstreamConnectionById = (req, res) => {
  try {
    const { id } = req.params;
    
    ensureXstreamConnectionsFile();
    const connections = JSON.parse(fs.readFileSync(xstreamConnectionsFilePath, 'utf8'));
    const connection = connections.find(conn => conn.id === id);
    
    if (!connection) {
      return res.status(404).json({ message: 'XStream连接不存在' });
    }
    
    // 检查权限
    if (connection.userId !== req.user.id) {
      return res.status(403).json({ message: '无权访问此XStream连接' });
    }
    
    res.json(connection);
  } catch (error) {
    console.error('获取XStream连接详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除XStream连接
const deleteXstreamConnection = (req, res) => {
  try {
    const { id } = req.params;
    
    ensureXstreamConnectionsFile();
    const connections = JSON.parse(fs.readFileSync(xstreamConnectionsFilePath, 'utf8'));
    const connectionIndex = connections.findIndex(conn => conn.id === id);
    
    if (connectionIndex === -1) {
      return res.status(404).json({ message: 'XStream连接不存在' });
    }
    
    // 检查权限
    if (connections[connectionIndex].userId !== req.user.id) {
      return res.status(403).json({ message: '无权删除此XStream连接' });
    }
    
    // 删除连接
    connections.splice(connectionIndex, 1);
    fs.writeFileSync(xstreamConnectionsFilePath, JSON.stringify(connections, null, 2), 'utf8');
    
    res.json({ message: 'XStream连接删除成功' });
  } catch (error) {
    console.error('删除XStream连接错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 处理XStream IPTV客户端请求
const handleXstreamRequest = (req, res) => {
  // 这里实现XStream协议的处理逻辑
  // 根据请求类型返回不同的数据
  
  // 记录请求信息，便于调试
  console.log('XStream API请求:', {
    url: req.originalUrl,
    query: req.query,
    method: req.method,
    auth_header: req.headers.authorization ? '存在' : '不存在',
    user: req.user ? req.user.username : 'unknown'
  });
  
  // 检查用户认证是否成功
  if (!req.user) {
    console.error('认证失败: 用户信息不存在');
    return res.status(401).json({ message: '认证失败' });
  }
  
  console.log('认证成功，用户信息:', {
    id: req.user.id,
    username: req.user.username
  });
  
  // 检查XStream连接信息
  if (req.xstreamConnection) {
    console.log('XStream连接信息:', {
      id: req.xstreamConnection.id,
      playlistId: req.xstreamConnection.playlistId
    });
  } else {
    console.log('警告: 没有找到XStream连接信息，将尝试使用用户的默认播放列表');
  }
  
  // 如果没有提供action或type参数，返回用户信息和服务器状态
  // 这是客户端初始连接测试时的预期响应
  if (!req.query.action && !req.query.type) {
    // 获取当前日期并添加一年作为到期日期
    const today = new Date();
    const expDate = new Date(today);
    expDate.setFullYear(expDate.getFullYear() + 1);
    const expDateStr = expDate.toISOString().split('T')[0];
    
    return res.json({
      user_info: {
        username: req.user.username,
        password: req.xstreamConnection ? req.xstreamConnection.password : '',
        message: "",
        auth: 1,
        status: "Active",
        exp_date: expDateStr,
        is_trial: "0",
        active_cons: "1",
        created_at: new Date().toISOString().split('T')[0],
        max_connections: "1",
        allowed_output_formats: ["m3u8", "ts", "rtmp"]
      },
      server_info: {
        url: req.headers.host || "localhost",
        port: process.env.PORT || "3000",
        https_port: "443",
        server_protocol: req.secure ? "https" : "http",
        rtmp_port: "1935",
        timezone: "Europe/London",
        timestamp_now: Math.floor(Date.now() / 1000),
        time_now: new Date().toISOString()
      }
    });
  }
  
  let { type, action } = req.query;
  
  // 处理action参数的请求（另一种XStream API请求方式）
  if (action) {
    console.log(`处理action请求: ${action}`);
    switch (action) {
      case 'get_live_categories':
      case 'get_live_streams':
      case 'get_vod_categories':
      case 'get_vod_streams':
      case 'get_vod_info':
      case 'get_short_epg':
        // 重定向到type处理逻辑
        req.query.type = action;
        type = action; // 更新type变量以匹配更新后的req.query.type
        break;
      default:
        return res.json({ action, status: 'ok' });
    }
  }

  // 处理type参数的请求
  if (req.query.type) {
  console.log(`处理type请求: ${type}`);
  switch (type) {
    case 'get_vod_categories':
      // 返回VOD分类
      res.json([]);
      break;
    case 'get_live_categories':
      // 返回直播分类
      // 从用户的播放列表中提取分类
      try {
        // 获取用户的播放列表
        console.log('正在处理get_live_categories请求');
        console.log('用户ID:', req.user.id);
        console.log('XStream连接:', req.xstreamConnection ? req.xstreamConnection.id : 'none');
        
        // 检查播放列表文件是否存在
        if (!fs.existsSync(playlistsFilePath)) {
          console.log(`播放列表索引文件不存在: ${playlistsFilePath}`);
          // 确保目录存在
          const dataDir = path.dirname(playlistsFilePath);
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          fs.writeFileSync(playlistsFilePath, JSON.stringify([]), 'utf8');
          return res.json([]);
        }
        
        const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
        console.log(`找到 ${playlists.length} 个播放列表`);
        
        // 如果有XStream连接，优先使用连接中指定的播放列表
        let playlistId;
        if (req.xstreamConnection && req.xstreamConnection.playlistId) {
          playlistId = req.xstreamConnection.playlistId;
          console.log(`使用XStream连接指定的播放列表ID: ${playlistId}`);
        } else {
          // 否则使用用户的第一个播放列表
          const userPlaylists = playlists.filter(p => p.userId === req.user.id);
          console.log(`用户拥有 ${userPlaylists.length} 个播放列表`);
          
          if (userPlaylists.length === 0) {
            console.log('未找到用户播放列表');
            return res.json([]);
          }
          
          playlistId = userPlaylists[0].id;
          console.log(`使用用户的第一个播放列表ID: ${playlistId}`);
        }
        
        // 确保播放列表内容目录存在
        if (!fs.existsSync(playlistsContentDir)) {
          fs.mkdirSync(playlistsContentDir, { recursive: true });
        }
        
        const playlistContentPath = path.join(playlistsContentDir, `${playlistId}.json`);
        console.log(`播放列表内容路径: ${playlistContentPath}`);
        
        if (!fs.existsSync(playlistContentPath)) {
          console.log(`播放列表内容文件不存在: ${playlistContentPath}`);
          return res.json([]);
        }
        
        const channels = JSON.parse(fs.readFileSync(playlistContentPath, 'utf8'));
        console.log(`找到 ${channels.length} 个频道`);
        
        // 提取唯一的分类
        const categories = [...new Set(channels.map(channel => channel.group || 'Uncategorized'))];
        console.log(`提取 ${categories.length} 个分类: ${categories.join(', ')}`);
        
        // 格式化为XStream格式
        const formattedCategories = categories.map((category, index) => ({
          category_id: String(index + 1),
          category_name: category,
          parent_id: 0
        }));
        
        console.log(`返回 ${formattedCategories.length} 个分类`);
        res.json(formattedCategories);
      } catch (error) {
        console.error('获取直播分类错误:', error);
        res.json([]);
      }
      break;
    case 'get_live_streams':
      // 返回直播流
      try {
        const { category_id } = req.query;
        console.log(`获取直播流, 分类ID: ${category_id || '所有'}`);
        console.log('用户ID:', req.user.id);
        console.log('XStream连接:', req.xstreamConnection ? req.xstreamConnection.id : 'none');
        
        // 检查播放列表文件是否存在
        if (!fs.existsSync(playlistsFilePath)) {
          console.error(`播放列表索引文件不存在: ${playlistsFilePath}`);
          // 确保目录存在
          const dataDir = path.dirname(playlistsFilePath);
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          fs.writeFileSync(playlistsFilePath, JSON.stringify([]), 'utf8');
          return res.json([]);
        }
        
        const playlists = JSON.parse(fs.readFileSync(playlistsFilePath, 'utf8'));
        console.log(`找到 ${playlists.length} 个播放列表`);
        
        // 如果有XStream连接，优先使用连接中指定的播放列表
        let playlistId;
        if (req.xstreamConnection && req.xstreamConnection.playlistId) {
          playlistId = req.xstreamConnection.playlistId;
          console.log(`使用XStream连接指定的播放列表ID: ${playlistId}`);
          
          // 验证播放列表是否存在
          const playlistExists = playlists.some(p => p.id === playlistId);
          if (!playlistExists) {
            console.error(`XStream连接指定的播放列表ID ${playlistId} 不存在于播放列表索引中`);
          }
        } else {
          // 否则使用用户的第一个播放列表
          const userPlaylists = playlists.filter(p => p.userId === req.user.id);
          console.log(`用户拥有 ${userPlaylists.length} 个播放列表`);
          
          if (userPlaylists.length === 0) {
            console.error('未找到用户播放列表，请先导入播放列表');
            return res.json([]);
          }
          
          playlistId = userPlaylists[0].id;
          console.log(`使用用户的第一个播放列表ID: ${playlistId}`);
        }
        
        // 确保播放列表内容目录存在
        if (!fs.existsSync(playlistsContentDir)) {
          fs.mkdirSync(playlistsContentDir, { recursive: true });
        }
        
        const playlistContentPath = path.join(playlistsContentDir, `${playlistId}.json`);
        console.log(`播放列表内容路径: ${playlistContentPath}`);
        
        if (!fs.existsSync(playlistContentPath)) {
          console.error(`播放列表内容文件不存在: ${playlistContentPath}`);
          console.error('可能原因: 播放列表已被删除或未正确导入');
          return res.json([]);
        }
        
        let channels;
        try {
          const fileContent = fs.readFileSync(playlistContentPath, 'utf8');
          if (!fileContent || fileContent.trim() === '') {
            console.error(`播放列表内容文件为空: ${playlistContentPath}`);
            return res.json([]);
          }
          channels = JSON.parse(fileContent);
        } catch (parseError) {
          console.error(`解析播放列表内容文件错误: ${parseError.message}`);
          return res.json([]);
        }
        
        console.log(`找到 ${channels.length} 个频道`);
        
        if (channels.length === 0) {
          console.error('播放列表中没有频道');
          return res.json([]);
        }
        
        // 获取分类映射表（从数字ID到分类名称）
        const categoryMap = {};
        const uniqueCategories = [...new Set(channels.map(channel => channel.group || 'Uncategorized'))];
        uniqueCategories.forEach((category, index) => {
          categoryMap[String(index + 1)] = category;
        });
        console.log('分类映射表:', categoryMap);
        
        // 过滤指定分类的频道
        let filteredChannels;
        if (category_id) {
          // 如果提供了分类ID，查找对应的分类名称
          const categoryName = categoryMap[category_id];
          console.log(`查找分类ID ${category_id} 对应的分类名称: ${categoryName}`);
          
          if (categoryName) {
            filteredChannels = channels.filter(channel => (channel.group || 'Uncategorized') === categoryName);
          } else {
            // 如果找不到对应的分类名称，尝试直接用分类ID匹配
            filteredChannels = channels.filter(channel => (channel.group || 'Uncategorized') === category_id);
          }
        } else {
          // 如果没有提供分类ID，返回所有频道
          filteredChannels = channels;
        }
        
        console.log(`过滤后 ${filteredChannels.length} 个频道`);
        
        // 格式化为XStream格式
        const formattedChannels = filteredChannels.map((channel, index) => {
          // 查找频道分类对应的ID
          let categoryId = '1'; // 默认分类ID
          const channelCategory = channel.group || 'Uncategorized';
          
          // 反向查找分类ID
          for (const [id, name] of Object.entries(categoryMap)) {
            if (name === channelCategory) {
              categoryId = id;
              break;
            }
          }
          
          // 检查频道URL是否存在
          if (!channel.url) {
            console.error(`频道 ${channel.title || 'Unknown'} 没有URL`);
            return null; // 跳过没有URL的频道
          }
          
          return {
            num: index + 1,
            name: channel.title || 'Unknown Channel',
            stream_type: 'live',
            stream_id: index + 1,
            stream_icon: channel.logo || '',
            epg_channel_id: channel.title || '',
            added: new Date().toISOString().split('T')[0],
            category_id: categoryId,
            custom_sid: '',
            tv_archive: 0,
            direct_source: channel.url,
            tv_archive_duration: 0
          };
        }).filter(channel => channel !== null); // 过滤掉无效的频道
        
        console.log(`返回 ${formattedChannels.length} 个直播流`);
        res.json(formattedChannels);
      } catch (error) {
        console.error('获取直播流错误:', error);
        console.error('错误堆栈:', error.stack);
        res.json([]);
      }
      break;
    case 'get_vod_streams':
      // 返回VOD流
      res.json([]);
      break;
    case 'get_vod_info':
      // 返回VOD信息
      res.json({});
      break;
    case 'get_short_epg':
      // 返回短EPG
      res.json({});
      break;
    case 'get_simple_data_table':
      // 返回简单数据表
      res.json([]);
      break;
    default:
      res.json({ type, status: 'ok' });
  }
} else if (!action) {
  // 如果既没有type也没有action参数，返回一个通用响应
  res.json({ status: 'ok' });
}
};

module.exports = {
  generateXstreamConnection,
  listXstreamConnections,
  getXstreamConnectionById,
  deleteXstreamConnection,
  handleXstreamRequest
};