const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const https = require("https"); // 引入 https 模块
const fs = require("fs"); // 引入 fs 模块

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 8812; // Node.js 应用将在容器内监听此端口提供 HTTPS 服务

// SSL 证书配置
// 路径是容器内的路径，我们稍后会在 docker-compose.yml 中设置卷挂载
const sslOptions = {
  key: fs.readFileSync("/etc/ssl/live/chenpeel.xyz/chenpeel.xyz.key"),
  cert: fs.readFileSync("/etc/ssl/live/chenpeel.xyz/fullchain.cer"),
};

// 启用安全中间件
app.use(helmet());

// 配置 CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "https://oooo.blog", // 修正了这里的默认值，使其成为一个字符串数组
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
app.use("/api/", apiLimiter);

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use("/api/chat", require("./routes/chat"));

// 健康检查端点
app.get("/health", (req, res) => res.status(200).send("OK"));

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: "Not found", success: false });
});

// 创建 HTTPS 服务器并启动
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`DeepSeek API 中间层 HTTPS 服务已启动，运行于端口 ${PORT}`);
});
