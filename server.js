const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const https = require("https");
const http = require("http");
const fs = require("fs");
const { client: redisClient } = require("./utils/redis");
const logger = require("./utils/logger");

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 8812;

// 检查是否使用 HTTPS
const USE_HTTPS = process.env.USE_HTTPS === "true";

// SSL 证书配置（仅在使用 HTTPS 时）
let sslOptions = null;
if (USE_HTTPS) {
  try {
    sslOptions = {
      key: fs.readFileSync("/etc/ssl/live/chenpeel.xyz/chenpeel.xyz.key"),
      cert: fs.readFileSync("/etc/ssl/live/chenpeel.xyz/fullchain.cer"),
    };
    logger.info("SSL 证书加载成功");
  } catch (error) {
    logger.error("SSL 证书加载失败:", {
      error: error.message,
      stack: error.stack,
    });
    logger.info("将以 HTTP 模式启动");
    USE_HTTPS = false;
  }
}

// 安全中间件配置 - 放宽一些限制以解决CORS问题
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// 允许的来源域名
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(origin => origin.trim()) || [
  "https://oooo.blog",
];

// 配置CORS - 使用更完整的配置
app.use(
  cors({
    origin: function (origin, callback) {
      // 健康检查端点允许所有来源访问
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        logger.warn(`拒绝来自未授权域名的请求: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin"],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
  }),
);

// 专门为健康检查端点配置CORS
app.options("/health", cors({ 
  origin: "*",
  methods: ["GET", "OPTIONS"],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

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

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
    origin: req.get("origin") || "unknown",
  });
  next();
});

// 添加CORS错误处理中间件
app.use((err, req, res, next) => {
  if (err.name === "SyntaxError") {
    logger.error("请求体解析错误:", { error: err.message, body: req.body });
    return res.status(400).json({
      success: false,
      error: "请求格式错误",
      details: err.message,
    });
  }
  next(err);
});

// 路由
app.use("/chat", require("./routes/chat"));

// 404处理
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.originalUrl}`);
  res.status(404).json({ error: "Not found", success: false });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error("应用错误", { error: err.message, stack: err.stack });

  // 处理CORS错误
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "跨域请求被拒绝",
      success: false,
      message: "此API仅允许来自授权域名的请求",
    });
  }

  res.status(500).json({ error: "服务器内部错误", success: false });
});

// 初始化 Redis 连接
async function initRedis() {
  try {
    await redisClient.connect();
    logger.info("Redis连接成功");
  } catch (error) {
    logger.error("Redis连接失败:", {
      error: error.message,
      stack: error.stack,
    });
    logger.info("应用将以无Redis模式启动，用户聊天记录将不会持久化");
  }
}

// 创建服务器并启动
const startServer = async () => {
  await initRedis();

  if (USE_HTTPS && sslOptions) {
    // HTTPS 模式
    https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
      logger.info(`DeepSeek API 中间层 HTTPS 服务已启动，运行于端口 ${PORT}`);
    });
  } else {
    // HTTP 模式
    http.createServer(app).listen(PORT, "0.0.0.0", () => {
      logger.info(`DeepSeek API 中间层 HTTP 服务已启动，运行于端口 ${PORT}`);
    });
  }
};

// 处理未捕获的异常
process.on("uncaughtException", (error) => {
  logger.error("未捕获的异常:", { error: error.message, stack: error.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("未处理的Promise拒绝:", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : "No stack trace available",
  });
});

startServer();
