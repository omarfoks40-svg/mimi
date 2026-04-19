const axios = require('axios');

module.exports = {
  config: {
    name: "ترجمي",
    aliases: ["trans", "translate"],
    version: "1.2.0",
    author: "Sinko",
    role: 0,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply } = event;
    let content = type == "message_reply" ? messageReply.body : args.join(" ");

    if (!content) return api.sendMessage("❌ اكتب نصاً أو رد على رسالة لترجمتها!", threadID, messageID);

    try {
      api.setMessageReaction("✔️", messageID, () => {}, true);
      
      const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(content)}`);
      
      // تجميع أجزاء النص المترجم لو كان طويلاً
      let translation = "";
      res.data[0].forEach(item => {
        if (item[0]) translation += item[0];
      });

      // التنسيق الملكي كما في الصورة
      const msg = `\n\n${translation}\n\n`;

      return api.sendMessage(msg, threadID, messageID);
    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ فشل في الاتصال بخدمة الترجمة، تأكد من اتصال الإنترنت.", threadID, messageID);
    }
  }
};
