#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 服务器地址
const serverUrl = process.env.SERVER_ADDRESS || `http://localhost:${process.env.PORT || 3000}`;

// 保存令牌的文件
const tokenFile = path.join(__dirname, '../data/cli_token.json');

// 确保数据目录存在
const ensureDataDir = () => {
  const dataDir = path.dirname(tokenFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// 保存令牌
const saveToken = (token, username) => {
  ensureDataDir();
  fs.writeFileSync(tokenFile, JSON.stringify({ token, username }), 'utf8');
};

// 读取令牌
const readToken = () => {
  if (fs.existsSync(tokenFile)) {
    try {
      return JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    } catch (error) {
      return null;
    }
  }
  return null;
};

// 清除令牌
const clearToken = () => {
  if (fs.existsSync(tokenFile)) {
    fs.unlinkSync(tokenFile);
  }
};

// 显示主菜单
const showMainMenu = async () => {
  console.log('\n===== XStream IPTV 服务器 =====');
  
  const tokenData = readToken();
  if (tokenData && tokenData.token) {
    console.log(`当前登录用户: ${tokenData.username}\n`);
    console.log('1. 导入M3U播放列表');
    console.log('2. 查看我的播放列表');
    console.log('3. 生成XStream连接');
    console.log('4. 查看我的XStream连接');
    console.log('5. 退出登录');
  } else {
    console.log('1. 注册');
    console.log('2. 登录');
  }
  console.log('0. 退出程序');
  
  rl.question('\n请选择操作: ', async (answer) => {
    if (tokenData && tokenData.token) {
      // 已登录状态的菜单选项
      switch (answer) {
        case '1':
          await importPlaylist();
          break;
        case '2':
          await listPlaylists();
          break;
        case '3':
          await generateXstreamConnection();
          break;
        case '4':
          await listXstreamConnections();
          break;
        case '5':
          clearToken();
          console.log('已退出登录');
          showMainMenu();
          break;
        case '0':
          rl.close();
          console.log('感谢使用，再见！');
          process.exit(0);
          break;
        default:
          console.log('无效的选择，请重试');
          showMainMenu();
      }
    } else {
      // 未登录状态的菜单选项
      switch (answer) {
        case '1':
          await register();
          break;
        case '2':
          await login();
          break;
        case '0':
          rl.close();
          console.log('感谢使用，再见！');
          process.exit(0);
          break;
        default:
          console.log('无效的选择，请重试');
          showMainMenu();
      }
    }
  });
};

// 注册新用户
const register = async () => {
  rl.question('请输入用户名: ', (username) => {
    rl.question('请输入密码: ', async (password) => {
      try {
        const response = await axios.post(`${serverUrl}/api/auth/register`, {
          username,
          password
        });
        
        console.log('\n注册成功！');
        saveToken(response.data.token, username);
        showMainMenu();
      } catch (error) {
        console.error('\n注册失败:', error.response?.data?.message || error.message);
        showMainMenu();
      }
    });
  });
};

// 用户登录
const login = async () => {
  rl.question('请输入用户名: ', (username) => {
    rl.question('请输入密码: ', async (password) => {
      try {
        const response = await axios.post(`${serverUrl}/api/auth/login`, {
          username,
          password
        });
        
        console.log('\n登录成功！');
        saveToken(response.data.token, username);
        showMainMenu();
      } catch (error) {
        console.error('\n登录失败:', error.response?.data?.message || error.message);
        showMainMenu();
      }
    });
  });
};

// 导入M3U播放列表
const importPlaylist = async () => {
  rl.question('请输入M3U播放列表URL: ', (url) => {
    rl.question('请输入播放列表名称 (可选): ', async (name) => {
      try {
        const tokenData = readToken();
        if (!tokenData || !tokenData.token) {
          console.log('\n请先登录');
          showMainMenu();
          return;
        }
        
        console.log('\n正在导入播放列表，请稍候...');
        const response = await axios.post(
          `${serverUrl}/api/playlist/import`,
          { url, name },
          { headers: { Authorization: `Bearer ${tokenData.token}` } }
        );
        
        console.log('\n播放列表导入成功！');
        console.log(`播放列表ID: ${response.data.playlist.id}`);
        console.log(`频道数量: ${response.data.playlist.channelCount}`);
        showMainMenu();
      } catch (error) {
        console.error('\n导入失败:', error.response?.data?.message || error.message);
        showMainMenu();
      }
    });
  });
};

// 查看播放列表
const listPlaylists = async () => {
  try {
    const tokenData = readToken();
    if (!tokenData || !tokenData.token) {
      console.log('\n请先登录');
      showMainMenu();
      return;
    }
    
    const response = await axios.get(
      `${serverUrl}/api/playlist/list`,
      { headers: { Authorization: `Bearer ${tokenData.token}` } }
    );
    
    if (response.data.length === 0) {
      console.log('\n你还没有导入任何播放列表');
      showMainMenu();
      return;
    }
    
    console.log('\n===== 我的播放列表 =====');
    response.data.forEach((playlist, index) => {
      console.log(`${index + 1}. ${playlist.name} (ID: ${playlist.id})`);
      console.log(`   频道数量: ${playlist.channelCount}`);
      console.log(`   导入时间: ${new Date(playlist.importedAt).toLocaleString()}`);
      console.log('----------------------------');
    });
    
    rl.question('\n输入播放列表编号查看详情，或按0返回: ', async (answer) => {
      const index = parseInt(answer) - 1;
      if (answer === '0' || isNaN(index) || index < 0 || index >= response.data.length) {
        showMainMenu();
        return;
      }
      
      const playlistId = response.data[index].id;
      try {
        const detailResponse = await axios.get(
          `${serverUrl}/api/playlist/${playlistId}`,
          { headers: { Authorization: `Bearer ${tokenData.token}` } }
        );
        
        console.log(`\n===== ${detailResponse.data.name} =====`);
        console.log(`播放列表ID: ${detailResponse.data.id}`);
        console.log(`频道数量: ${detailResponse.data.channels.length}`);
        console.log(`源URL: ${detailResponse.data.url}`);
        
        console.log('\n频道列表 (前10个):');
        detailResponse.data.channels.slice(0, 10).forEach((channel, idx) => {
          console.log(`${idx + 1}. ${channel.title} (${channel.group})`);
        });
        
        if (detailResponse.data.channels.length > 10) {
          console.log(`...以及${detailResponse.data.channels.length - 10}个更多频道`);
        }
        
        rl.question('\n按Enter键返回: ', () => {
          showMainMenu();
        });
      } catch (error) {
        console.error('\n获取详情失败:', error.response?.data?.message || error.message);
        showMainMenu();
      }
    });
  } catch (error) {
    console.error('\n获取播放列表失败:', error.response?.data?.message || error.message);
    showMainMenu();
  }
};

// 生成XStream连接
const generateXstreamConnection = async () => {
  try {
    const tokenData = readToken();
    if (!tokenData || !tokenData.token) {
      console.log('\n请先登录');
      showMainMenu();
      return;
    }
    
    // 获取播放列表
    const playlistResponse = await axios.get(
      `${serverUrl}/api/playlist/list`,
      { headers: { Authorization: `Bearer ${tokenData.token}` } }
    );
    
    if (playlistResponse.data.length === 0) {
      console.log('\n你需要先导入播放列表才能生成XStream连接');
      showMainMenu();
      return;
    }
    
    console.log('\n===== 选择播放列表 =====');
    playlistResponse.data.forEach((playlist, index) => {
      console.log(`${index + 1}. ${playlist.name} (${playlist.channelCount}个频道)`);
    });
    
    rl.question('\n请选择播放列表编号: ', async (answer) => {
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= playlistResponse.data.length) {
        console.log('\n无效的选择');
        showMainMenu();
        return;
      }
      
      const playlistId = playlistResponse.data[index].id;
      
      try {
        // 生成XStream连接
        const response = await axios.post(
          `${serverUrl}/api/xstream/generate`,
          { playlistId },
          { headers: { Authorization: `Bearer ${tokenData.token}` } }
        );
        
        console.log('\n===== XStream连接生成成功 =====');
        console.log(`Server Address: ${response.data.serverAddress}`);
        console.log(`Username: ${response.data.username}`);
        console.log(`Password: ${response.data.password}`);
        console.log('\n你可以使用以上信息在任何支持XStream IPTV的播放器中观看节目');
        
        rl.question('\n按Enter键返回: ', () => {
          showMainMenu();
        });
      } catch (error) {
        console.error('\n生成XStream连接失败:', error.response?.data?.message || error.message);
        showMainMenu();
      }
    });
  } catch (error) {
    console.error('\n获取播放列表失败:', error.response?.data?.message || error.message);
    showMainMenu();
  }
};

// 查看XStream连接
const listXstreamConnections = async () => {
  try {
    const tokenData = readToken();
    if (!tokenData || !tokenData.token) {
      console.log('\n请先登录');
      showMainMenu();
      return;
    }
    
    const response = await axios.get(
      `${serverUrl}/api/xstream/list`,
      { headers: { Authorization: `Bearer ${tokenData.token}` } }
    );
    
    if (response.data.length === 0) {
      console.log('\n你还没有生成任何XStream连接');
      showMainMenu();
      return;
    }
    
    console.log('\n===== 我的XStream连接 =====');
    response.data.forEach((connection, index) => {
      console.log(`${index + 1}. ${connection.name || '未命名连接'}`);
      console.log(`   Server Address: ${connection.serverAddress}`);
      console.log(`   Username: ${connection.username}`);
      console.log(`   Password: ${connection.password}`);
      console.log(`   创建时间: ${new Date(connection.createdAt).toLocaleString()}`);
      console.log('----------------------------');
    });
    
    rl.question('\n按Enter键返回: ', () => {
      showMainMenu();
    });
  } catch (error) {
    console.error('\n获取XStream连接失败:', error.response?.data?.message || error.message);
    showMainMenu();
  }
};

// 启动CLI
console.log('欢迎使用XStream IPTV服务器命令行工具');
showMainMenu();