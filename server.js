const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 8812;

// 启用安全中间件
app.use(helmet());

// 配置 CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "https://oooo.blog,https://chenpeel.github.io",
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`DeepSeek API 中间层服务已启动，运行于端口 ${PORT}`);
});
