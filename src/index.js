const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 设置中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 导入路由
const authRoutes = require('./routes/auth');
const playlistRoutes = require('./routes/playlist');
const xstreamRoutes = require('./routes/xstream');

// 使用路由
app.use('/api/auth', authRoutes);
app.use('/api/playlist', playlistRoutes);
app.use('/api/xstream', xstreamRoutes);

// 首页路由
app.get('/', (req, res) => {
  res.send('XStream IPTV Server is running!');
});

// 设置端口
const PORT = process.env.PORT || 3000;

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server Address: http://localhost:${PORT}`);
});