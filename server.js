const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const https = require("https");
const http = require("http"); // 添加 http 模块
const fs = require("fs");
const { client: redisClient } = require("./utils/redis");

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 8812;

// 检查是否使用 HTTPS
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// SSL 证书配置（仅在使用 HTTPS 时）
let sslOptions = null;
if (USE_HTTPS) {
  try {
    sslOptions = {
      key: fs.readFileSync("/etc/ssl/live/chenpeel.xyz/chenpeel.xyz.key"),
      cert: fs.readFileSync("/etc/ssl/live/chenpeel.xyz/fullchain.cer"),
    };
    console.log("SSL 证书加载成功");
  } catch (error) {
    console.error("SSL 证书加载失败:", error.message);
    console.log("将以 HTTP 模式启动");
    USE_HTTPS = false;
  }
}

// 启用安全中间件
app.use(helmet());

// 配置 CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "https://oooo.blog",
  "https://chenpeel.github.io",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// 限制请求频率
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP 15分钟内最多100个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: "请求频率过高，请稍后再试。",
});

app.use("/", apiLimiter);

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use("/chat", require("./routes/chat"));

// 健康检查端点
app.get("/health", (req, res) => res.status(200).send("OK"));

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: "Not found", success: false });
});

// 初始化 Redis 连接
async function initRedis() {
  try {
    await redisClient.connect();
    console.log("Redis连接成功");
  } catch (error) {
    console.error("Redis连接失败:", error);
    console.log("应用将以无Redis模式启动，用户聊天记录将不会持久化");
  }
}

// 创建服务器并启动
const startServer = async () => {
  await initRedis();
  
  if (USE_HTTPS && sslOptions) {
    // HTTPS 模式
    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`DeepSeek API 中间层 HTTPS 服务已启动，运行于端口 ${PORT}`);
    });
  } else {
    // HTTP 模式
    http.createServer(app).listen(PORT, () => {
      console.log(`DeepSeek API 中间层 HTTP 服务已启动，运行于端口 ${PORT}`);
    });
  }
};

startServer();