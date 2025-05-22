// DeepSeek API 测试脚本
require("dotenv").config();
const { OpenAI } = require("openai");

const openai = new OpenAI({
    baseURL: process.env.ALLOWED_ORIGINS || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

async function testDeepSeekAPI() {
  try {
    console.log("Testing DeepSeek API connection...");

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "你是一个友好的助手。" },
        { role: "user", content: "请用一句话介绍自己。" },
      ],
      model: "deepseek-chat",
    });

    console.log("API 响应成功:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("API 连接错误:", error.message);
    if (error.response) {
      console.error("错误详情:", error.response.data);
    }
  }
}

testDeepSeekAPI();
