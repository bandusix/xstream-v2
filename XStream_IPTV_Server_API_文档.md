# XStream IPTV Server API 文档

本文档提供了XStream IPTV Server的所有API端点的详细说明，包括请求参数、响应格式和示例。适用于使用Postman进行API测试和集成。

## 基础信息

- **基础URL**: `http://localhost:3000/api`（或您的服务器地址）
- **内容类型**: `application/json`

## 认证方式

### JWT令牌认证（Web API）

大多数API端点需要JWT令牌认证。在Postman中设置方法：

1. 在请求的「Authorization」标签页中选择「Bearer Token」类型
2. 在Token字段中输入从登录或注册API获取的JWT令牌

### 基本认证（IPTV客户端API）

IPTV客户端API使用基本认证。在Postman中设置方法：

1. 在请求的「Authorization」标签页中选择「Basic Auth」类型
2. 输入用户名和密码

## API端点

### 认证接口

#### 注册新用户

- **URL**: `POST /auth/register`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **成功响应** (201 Created):
  ```json
  {
    "message": "用户注册成功",
    "user": {
      "id": "user_uuid",
      "username": "your_username"
    },
    "token": "jwt_token_here"
  }
  ```
- **错误响应**:
  - 400 Bad Request: 用户名已存在或缺少必要字段
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X POST "http://localhost:3000/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "your_username",
      "password": "your_password"
    }'
  ```

#### 用户登录

- **URL**: `POST /auth/login`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "message": "登录成功",
    "user": {
      "id": "user_uuid",
      "username": "your_username"
    },
    "token": "jwt_token_here"
  }
  ```
- **错误响应**:
  - 400 Bad Request: 缺少必要字段
  - 401 Unauthorized: 用户名或密码错误
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X POST "http://localhost:3000/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "your_username",
      "password": "your_password"
    }'
  ```

#### 验证用户令牌

- **URL**: `GET /auth/verify`
- **认证**: Bearer Token
- **成功响应** (200 OK):
  ```json
  {
    "valid": true,
    "user": {
      "id": "user_uuid",
      "username": "your_username"
    }
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌
- **cURL示例**:
  ```bash
  curl -X GET "http://localhost:3000/api/auth/verify" \
    -H "Authorization: Bearer jwt_token_here"
  ```

#### 获取用户信息

- **URL**: `GET /auth/profile`
- **认证**: Bearer Token
- **成功响应** (200 OK):
  ```json
  {
    "id": "user_uuid",
    "username": "your_username",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌
  - 404 Not Found: 用户不存在
- **cURL示例**:
  ```bash
  curl -X GET "http://localhost:3000/api/auth/profile" \
    -H "Authorization: Bearer jwt_token_here"
  ```

### 播放列表管理

#### 导入在线M3U播放列表

- **URL**: `POST /playlist/import`
- **认证**: Bearer Token
- **请求体**:
  ```json
  {
    "url": "http://example.com/playlist.m3u",
    "name": "我的播放列表"
  }
  ```
- **成功响应** (201 Created):
  ```json
  {
    "message": "播放列表导入成功",
    "playlist": {
      "id": "playlist_uuid",
      "name": "我的播放列表",
      "channelCount": 100,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```
- **错误响应**:
  - 400 Bad Request: 播放列表URL是必需的或无法解析播放列表
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X POST "http://localhost:3000/api/playlist/import" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer jwt_token_here" \
    -d '{
      "url": "http://example.com/playlist.m3u",
      "name": "我的播放列表"
    }'
  ```

#### 获取所有导入的播放列表

- **URL**: `GET /playlist/list`
- **认证**: Bearer Token
- **成功响应** (200 OK):
  ```json
  [
    {
      "id": "playlist_uuid_1",
      "name": "播放列表1",
      "channelCount": 100,
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    {
      "id": "playlist_uuid_2",
      "name": "播放列表2",
      "channelCount": 50,
      "createdAt": "2023-01-02T00:00:00.000Z"
    }
  ]
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X GET "http://localhost:3000/api/playlist/list" \
    -H "Authorization: Bearer jwt_token_here"
  ```

#### 获取特定播放列表详情

- **URL**: `GET /playlist/:id`
- **认证**: Bearer Token
- **URL参数**: `id` - 播放列表ID
- **成功响应** (200 OK):
  ```json
  {
    "id": "playlist_uuid",
    "name": "我的播放列表",
    "userId": "user_uuid",
    "sourceUrl": "http://example.com/playlist.m3u",
    "channelCount": 100,
    "channels": [
      {
        "title": "频道1",
        "logo": "http://example.com/logo1.png",
        "group": "电影",
        "url": "http://example.com/stream1.m3u8"
      },
      {
        "title": "频道2",
        "logo": "http://example.com/logo2.png",
        "group": "体育",
        "url": "http://example.com/stream2.m3u8"
      }
    ],
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌或无权访问此播放列表
  - 404 Not Found: 播放列表不存在
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X GET "http://localhost:3000/api/playlist/playlist_uuid" \
    -H "Authorization: Bearer jwt_token_here"
  ```

#### 删除播放列表

- **URL**: `DELETE /playlist/:id`
- **认证**: Bearer Token
- **URL参数**: `id` - 播放列表ID
- **成功响应** (200 OK):
  ```json
  {
    "message": "播放列表删除成功"
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌或无权删除此播放列表
  - 404 Not Found: 播放列表不存在
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X DELETE "http://localhost:3000/api/playlist/playlist_uuid" \
    -H "Authorization: Bearer jwt_token_here"
  ```

### XStream连接管理

#### 生成XStream连接

- **URL**: `POST /xstream/generate`
- **认证**: Bearer Token
- **请求体**:
  ```json
  {
    "playlistId": "playlist_uuid"
  }
  ```
- **成功响应** (201 Created):
  ```json
  {
    "message": "XStream连接生成成功",
    "serverAddress": "http://localhost:3000",
    "username": "user_12345678",
    "password": "random_password"
  }
  ```
- **错误响应**:
  - 400 Bad Request: 播放列表ID是必需的
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌或无权访问此播放列表
  - 404 Not Found: 播放列表不存在
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X POST "http://localhost:3000/api/xstream/generate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer jwt_token_here" \
    -d '{
      "playlistId": "playlist_uuid"
    }'
  ```

#### 获取用户的XStream连接列表

- **URL**: `GET /xstream/list`
- **认证**: Bearer Token
- **成功响应** (200 OK):
  ```json
  [
    {
      "id": "connection_uuid_1",
      "name": "连接1",
      "serverAddress": "http://localhost:3000",
      "username": "user_12345678",
      "password": "password1",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    {
      "id": "connection_uuid_2",
      "name": "连接2",
      "serverAddress": "http://localhost:3000",
      "username": "user_12345678",
      "password": "password2",
      "createdAt": "2023-01-02T00:00:00.000Z"
    }
  ]
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X GET "http://localhost:3000/api/xstream/list" \
    -H "Authorization: Bearer jwt_token_here"
  ```

#### 获取特定XStream连接详情

- **URL**: `GET /xstream/:id`
- **认证**: Bearer Token
- **URL参数**: `id` - XStream连接ID
- **成功响应** (200 OK):
  ```json
  {
    "id": "connection_uuid",
    "userId": "user_uuid",
    "playlistId": "playlist_uuid",
    "name": "我的XStream连接",
    "serverAddress": "http://localhost:3000",
    "username": "user_12345678",
    "password": "random_password",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌或无权访问此连接
  - 404 Not Found: 连接不存在
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X GET "http://localhost:3000/api/xstream/connection_uuid" \
    -H "Authorization: Bearer jwt_token_here"
  ```

#### 删除XStream连接

- **URL**: `DELETE /xstream/:id`
- **认证**: Bearer Token
- **URL参数**: `id` - XStream连接ID
- **成功响应** (200 OK):
  ```json
  {
    "message": "XStream连接删除成功"
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 未提供访问令牌
  - 403 Forbidden: 无效或过期的令牌或无权删除此连接
  - 404 Not Found: 连接不存在
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  curl -X DELETE "http://localhost:3000/api/xstream/connection_uuid" \
    -H "Authorization: Bearer jwt_token_here"
  ```

### IPTV客户端API

#### XStream播放器API

- **URL**: `GET /xstream/player_api.php`
- **认证**: Basic Auth
- **查询参数**:
  - `username`: 用户名
  - `password`: 密码
  - `action`: 操作类型，可选值：
    - `get_live_categories`: 获取直播分类
    - `get_live_streams`: 获取直播流
    - `get_vod_categories`: 获取点播分类
    - `get_vod_streams`: 获取点播流
    - `get_series_categories`: 获取剧集分类
    - `get_series`: 获取剧集

- **示例请求**:
  ```
  GET /xstream/player_api.php?username=user_12345678&password=random_password&action=get_live_categories
  ```

- **成功响应** (200 OK):
  根据不同的action参数，返回不同的数据结构。例如，对于`get_live_categories`：
  ```json
  [
    {
      "category_id": "1",
      "category_name": "电影",
      "parent_id": 0
    },
    {
      "category_id": "2",
      "category_name": "体育",
      "parent_id": 0
    }
  ]
  ```

- **错误响应**:
  - 401 Unauthorized: 认证失败
  - 400 Bad Request: 缺少必要参数
  - 500 Internal Server Error: 服务器错误
- **cURL示例**:
  ```bash
  # 获取直播分类
  curl -X GET "http://localhost:3000/api/xstream/player_api.php?username=user_12345678&password=random_password&action=get_live_categories" \
    -u "user_12345678:random_password"
  
  # 获取直播流
  curl -X GET "http://localhost:3000/api/xstream/player_api.php?username=user_12345678&password=random_password&action=get_live_streams" \
    -u "user_12345678:random_password"
  
  # 获取点播分类
  curl -X GET "http://localhost:3000/api/xstream/player_api.php?username=user_12345678&password=random_password&action=get_vod_categories" \
    -u "user_12345678:random_password"
  ```

## 使用示例

### 完整流程示例

1. 注册新用户
2. 使用获取的令牌登录
3. 导入M3U播放列表
4. 生成XStream连接
5. 使用生成的连接信息在IPTV客户端中访问内容

### Postman集合导入

您可以将此API文档导入到Postman中，方法如下：

1. 在Postman中，点击「Import」按钮
2. 选择「Raw text」选项
3. 将此文档中的API端点信息复制粘贴到文本框中
4. 点击「Continue」并完成导入

## 注意事项

- 所有需要认证的API都需要在请求头中包含有效的JWT令牌或基本认证信息
- 请确保在生产环境中使用HTTPS以保护API通信安全
- API响应中的错误消息可能会根据具体情况有所不同