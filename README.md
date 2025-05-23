# Chat-Live2D

作为看板娘和DeepSeek中间层

## 功能特点

- 使用DeepSeek API提供对话能力
- 支持多个用户的独立聊天上下文
- 使用Redis持久化存储用户对话历史
- HTTPS安全连接
- 跨域安全控制
- 请求速率限制

## 安装与配置

### 前置条件

- Docker和Docker Compose
- SSL证书（用于HTTPS）

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/chenpeel/chat-live2d.git
cd chat-live2d
```

2. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件，填入您的API密钥和其他设置
```

3. 启动服务
```bash
docker-compose up -d
```

## Redis配置

本项目使用Redis存储用户的对话历史，确保不同用户的对话上下文得到有效隔离和持久化。Redis数据将通过Docker卷进行持久化。

相关配置：
- `REDIS_URL`: Redis服务器连接URL，默认为`redis://redis:6379`
- 数据持久化: 使用Redis的AOF（Append Only File）机制
- 数据过期时间: 用户对话历史默认保存7天

## 安全性

- 所有API请求通过HTTPS传输
- 跨域资源共享(CORS)限制
- 请求速率限制防止滥用
- Redis数据仅在内部网络可访问
