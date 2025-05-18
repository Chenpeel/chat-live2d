// chat-api/routes/chat.js
const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

// 初始化OpenAI客户端
const openai = new OpenAI({
  baseURL: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 读取纳西妲角色设定
let nahidaSystemPrompt = "";
try {
  nahidaSystemPrompt = fs.readFileSync(
    path.join(__dirname, "Nahida.txt"),
    "utf8",
  );
} catch (error) {
  console.error("无法读取纳西妲角色设定文件:", error);
  nahidaSystemPrompt =
    "你是纳西妲，草之神，小吉祥草王，拥有丰富的知识，语气温柔可爱又睿智。";
}

// 聊天历史记录缓存（实际生产环境应使用数据库）
const chatHistories = {};

// 聊天API
router.post("/", async (req, res) => {
  try {
    const {
      message,
      userId = "anonymous",
      character = "nahida",
      timestamp,
      history,
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "消息不能为空" });
    }

    // 初始化或获取用户聊天历史
    if (!chatHistories[userId]) {
      chatHistories[userId] = [];
    }

    // 限制历史记录长度以避免token超限
    if (chatHistories[userId].length > 10) {
      chatHistories[userId] = chatHistories[userId].slice(-10);
    }

    // 获取当前时间信息（用于提供给模型）
    const now = new Date(timestamp || new Date());
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const dayOfWeek = ["日", "一", "二", "三", "四", "五", "六"][now.getDay()];

    // 格式化时间字符串，用于系统提示
    const timeInfo = `当前时间是: ${year}年${month}月${day}日 星期${dayOfWeek} ${hours}:${minutes.toString().padStart(2, "0")}`;

    // 将时间信息添加到系统提示中
    const systemPromptWithTime = `${nahidaSystemPrompt}\n\n${timeInfo}\n请在回答关于当前时间的问题时，使用上面提供的准确时间。`;

    // 构建消息历史
    const messages = [
      { role: "system", content: systemPromptWithTime },
      ...chatHistories[userId],
      { role: "user", content: message },
    ];

    // 调用API
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reply = completion.choices[0].message.content;

    // 更新聊天历史
    chatHistories[userId].push({ role: "user", content: message });
    chatHistories[userId].push({ role: "assistant", content: reply });
    // 返回响应
    res.json({
      success: true,
      reply,
      character,
    });
  } catch (error) {
    console.error("聊天API错误:", error);
    res.status(500).json({
      success: false,
      error: "处理请求时发生错误",
      details: error.message,
    });
  }
});

// 清除聊天历史
router.post("/clear", (req, res) => {
  const { userId = "anonymous" } = req.body;
  if (chatHistories[userId]) {
    chatHistories[userId] = [];
  }
  res.json({ success: true, message: "聊天历史已清除" });
});

module.exports = router;
