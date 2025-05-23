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

3. 配置SSL

- 使用[acme.sh](https://docs.certcloud.cn/docs/edupki/acme/)
```bash
# 下载
curl https://get.acme.sh | sh -s email=your@example.com
```

- 使用Aliyun的服务器 及 DNS解析

> 在aliyun服务器创建Access Key用户，获取到Key和UserId的信息
> 在服务器内设置诸如`.zshrc`, `.bashrc`等
```bash
echo 'export Ali_Key="*********************"'>> .zshrc
echo 'export Ali_Secret="***********************"'>> .zshrc
source .zshrc
```

- 申请SSL
```bash
cme.sh --issue --dns dns_ali \ # 使用的Aliyun DNS
-d your_domain.com \ # 使用的你的域名
-d "*.your_domain.com" \ # 使用 *.your_domain.com 匹配所有子域
--keylength ec-256
# 如果看到 类似 success、save to /home/YOUR_USER/.acme.sh/your_domain.com_ecc:/etc/ssl/live/your_domain.com 即成功
```

- 修改docker-compose.yml
```bash
    vim docker-compose.yml
```
将
```bash
volumes:
  - ./logs:/app/logs
  - /home/YOUR_USER/.acme.sh/your_domain.com_ecc:/etc/ssl/live/your_domain.com:ro # 替换为实际域名
  # :ro表示只读
```

4. 启动服务
```bash
docker-compose up -d
```

## Redis配置

使用Redis存储用户的对话历史，确保不同用户的对话上下文得到有效隔离和持久化。Redis数据将通过Docker卷进行持久化。

相关配置：
- 使用内部网络非暴露端口连接Redis
- Dead time 为 1 h

## 安全性

- 所有API请求通过HTTPS传输
- 跨域资源共享(CORS)限制
- 请求速率限制防止滥用
- Redis数据仅在内部网络可访问
