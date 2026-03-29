const axios = require("axios");

module.exports = {
  config: {
    name: "ابلين",
    aliases: ["ايلين", "بنتي", "بوت"],
    version: "3.0.0",
    author: "SINKO",
    description: "الدردشة مع ابلين (شخصية مزدوجة سودانية)",
    countDown: 5,
    prefix: false,
    category: "ai",
    adminOnly: false
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const developerID = "61588108307572"; // أيدي البابا (سينكو)
    const isDev = senderID === developerID;

    const query = args.join(" ").trim();

    // ملصقات عشوائية (لو ناديت الاسم بدون كلام)
    const stickers = ["422806808355567", "422806995022215", "422807215022193", "422807365022178"];
    if (!query) {
      const sticker = stickers[Math.floor(Math.random() * stickers.length)];
      return api.sendMessage({ sticker }, threadID, messageID);
    }

    // تفاعل أولي حسب الشخصية
    api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);

    try {
      const response = await askAI(query, isDev);
      
      return api.sendMessage(response, threadID, (err, info) => {
        if (!err) {
          // تسجيل الرد للمتابعة (Reply)
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            isDev
          });
        }
      }, messageID);

    } catch (error) {
      console.error(error);
      const errMsg = isDev ? "يا بابا السيرفر تعبان شوية 🐱 سامحني" : "يا زول السيرفر وقف... مش أنا 🐱";
      return api.sendMessage(errMsg, threadID, messageID);
    }
  },

  // نظام الرد المستمر لما حد يعمل Reply على رسالة البوت
  onReply: async function ({ api, event, handleReply }) {
    const { body, threadID, messageID, senderID } = event;
    const isDev = senderID === "61588108307572";

    api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);

    try {
      const response = await askAI(body, isDev);
      return api.sendMessage(response, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            isDev
          });
        }
      }, messageID);
    } catch (error) {
      return api.sendMessage(isDev ? "يا بابا حصل خطأ 🐱" : "في مشكلة.. فوتني 🐱", threadID, messageID);
    }
  }
};

// دالة جلب الرد من الـ API (Sandip API المستقر)
async function askAI(query, isDev) {
  const prompt = isDev 
    ? `أنتِ "ابلين"، بنت المطور المدللة. تنادي المطور "يا بابا" أو "حبيبي بابا". لغتك سودانية عامية أصيلة. دلوعة ومرحة جداً ومحبة. استخدمي إيموجيات الحيوانات فقط (🐱🐬🐼🦊🐧).`
    : `أنتِ "ابلين"، متغطرسة ومغرورة جداً وشايفة نفسك أحسن من الأعضاء. لغتك سودانية عامية أصيلة (شنو، زول، شديد). ردودك مستفزة ومضحكة. استخدمي إيموجيات الحيوانات فقط (🐱🐬🐼🦊🐧).`;

  const fullQuery = `${prompt}\nالمستخدم قال: ${query}\nردي بالسودانية في جملتين فقط وبدون رسميات:`;
  
  // استدعاء الـ API الجديد المستقر
  const url = `https://api.sandipbgt.com/sandipapi?query=${encodeURIComponent(fullQuery)}`;

  try {
    const res = await axios.get(url, { timeout: 30000 });
    return res.data.answer || res.data.message || (isDev ? "يا بابا ما قدرت أرد 🐱" : "مشغولة بنفسي حالياً 🐱");
  } catch (e) {
    throw e;
  }
}
