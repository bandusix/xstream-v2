# XStream IPTV Server

一个功能强大的IPTV服务器，用于生成和管理XStream IPTV播放列表，支持M3U播放列表导入、用户认证和多设备访问。

## 功能特点

- **M3U播放列表导入**：支持从URL导入M3U格式的IPTV播放列表
- **用户认证系统**：完整的用户注册、登录和认证功能
- **XStream连接生成**：为IPTV客户端生成专用的XStream连接
- **RESTful API**：提供完整的API接口，方便集成和扩展
- **命令行工具**：内置CLI工具，便于快速操作和管理
- **跨平台兼容**：支持各种IPTV播放器和设备

## 安装步骤

### 前提条件

- Node.js 14.0.0 或更高版本
- npm 或 yarn 包管理器

### 本地安装

1. 克隆仓库

```bash
git clone https://github.com/yourusername/xstream-v2.git
cd xstream-v2
```

2. 安装依赖

```bash
npm install
```

3. 创建环境变量文件

在项目根目录创建 `.env` 文件，添加以下内容：

```
PORT=3000
JWT_SECRET=your_secret_key_here
```

4. 启动服务器

```bash
npm start
```

开发模式（自动重启）：

```bash
npm run dev
```

## 使用方法

### Web API

启动服务器后，可以通过以下API接口使用：

#### 认证接口

- `POST /api/auth/register` - 注册新用户
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/verify` - 验证用户令牌
- `GET /api/auth/profile` - 获取用户信息

#### 播放列表接口

- `POST /api/playlist/import` - 导入M3U播放列表
- `GET /api/playlist/list` - 获取所有导入的播放列表
- `GET /api/playlist/:id` - 获取特定播放列表详情
- `DELETE /api/playlist/:id` - 删除播放列表

#### XStream接口

- `POST /api/xstream/generate` - 生成XStream连接
- `GET /api/xstream/list` - 获取所有XStream连接

### 命令行工具

项目内置命令行工具，提供交互式界面进行操作：

```bash
node src/cli.js
```

命令行工具功能：

1. 用户注册和登录
2. 导入M3U播放列表
3. 查看已导入的播放列表
4. 生成XStream连接
5. 查看已生成的XStream连接

### 在IPTV客户端使用

1. 在命令行工具中生成XStream连接
2. 记录生成的服务器地址、用户名和密码
3. 在支持XStream协议的IPTV播放器中添加新的XStream源
4. 输入服务器地址、用户名和密码
5. 连接并享受您的IPTV频道

## 在Railway上部署

[Railway](https://railway.app/) 是一个现代化的应用部署平台，可以轻松部署Node.js应用。以下是在Railway上部署XStream IPTV Server的步骤：

### 1. 准备工作

- 注册 [Railway](https://railway.app/) 账号
- 将项目推送到GitHub仓库

### 2. 创建新项目

1. 登录Railway控制台
2. 点击 "New Project" 按钮
3. 选择 "Deploy from GitHub repo"
4. 选择包含XStream IPTV Server的GitHub仓库
5. Railway会自动检测Node.js项目并设置基本构建命令

### 3. 配置环境变量

在Railway项目设置中，添加以下环境变量：

- `PORT`: Railway会自动分配端口，无需手动设置
- `JWT_SECRET`: 设置一个安全的密钥用于JWT令牌加密（必须设置）

### 4. 部署设置

Railway会自动检测 `package.json` 文件并使用以下命令：

- 构建命令: `npm install`
- 启动命令: `npm start`

### 5. 访问应用

部署完成后，Railway会提供一个公共URL，可以通过该URL访问您的XStream IPTV Server。

### 6. 数据持久化

Railway提供了持久化存储，但对于生产环境，建议配置外部数据库来存储用户和播放列表数据。

## 环境变量说明

| 变量名 | 必填 | 描述 | 默认值 |
|--------|------|------|--------|
| PORT | 否 | 服务器监听端口 | 3000 |
| JWT_SECRET | 是 | JWT令牌加密密钥 | xstream_secret_key |
| SERVER_ADDRESS | 否 | CLI工具使用的服务器地址 | http://localhost:PORT |

## 项目结构

```
├── data/                  # 数据存储目录
├── src/                   # 源代码
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── routes/            # 路由
│   ├── cli.js             # 命令行工具
│   └── index.js           # 主入口文件
├── .env                   # 环境变量文件
├── .gitignore             # Git忽略文件
├── package.json           # 项目依赖
└── README.md              # 项目文档
```

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件