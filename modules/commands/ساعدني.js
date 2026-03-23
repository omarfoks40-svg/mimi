const axios = require("axios");

module.exports = {
  config: {
    name: "ساعدني",
    version: "3.0.0",
    author: "سينكو",
    countDown: 0,
    role: 0,
    category: "ai",
    description: "مساعد ذكي يجاوب على كل أسئلتك بذكاء عالي.",
    aliases: ["ai", "جمناي", "gpt"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const prompt = args.join(" ");

    if (!prompt) {
      return api.sendMessage("يا غالي اكتب سؤالك ", threadID, messageID);
    }

    try {
      // إرسال تفاعل "جاري الكتابة"
      api.setMessageReaction("⬇️", messageID, () => {}, true);
      
      const response = await askAI(prompt);
      
      api.setMessageReaction("✅", messageID, () => {}, true);

      // إرسال الرد نصي صافي بدون أي زخرفة
      return api.sendMessage(response, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        }
      }, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("معليش يا زول، السيرفر فيه ضغط شوية. جرب تسألني تاني.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;

    if (handleReply.author !== senderID) return;

    try {
      api.setMessageReaction("⬇️", messageID, () => {}, true);
      
      const response = await askAI(body);
      
      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(response, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        }
      }, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("حصل خطأ بسيط، جرب تسأل مرة تانية.", threadID, messageID);
    }
  }
};

// دالة الذكاء الاصطناعي مع توجيهات ليكون مساعداً شاملاً
async function askAI(question) {
  // تعليمات للذكاء الاصطناعي ليكون مفيداً وشاملاً في كل المجالات
  const systemInstruction = "أنت مساعد ذكي ومثقف جداً، تجيب على كل الأسئلة بدقة ووضوح وبأسلوب ودي ومفيد.";
  
  try {
    const url = `https://chatgpt.apinepdev.workers.dev/?question=${encodeURIComponent(systemInstruction + "\n\nالسؤال: " + question)}`;
    const res = await axios.get(url, { timeout: 40000 });
    
    let answer = res.data.answer || res.data.response || "لم أجد إجابة دقيقة حالياً.";
    
    // تنظيف الإجابة من أي إشارات لـ ChatGPT إذا وجدت ليكون الرد حيادياً ومفيداً
    return answer;
  } catch (error) {
    throw new Error("Error");
  }
}
