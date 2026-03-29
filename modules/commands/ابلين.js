const axios = require("axios");

module.exports = {
  config: {
    name: "ابلين",
    aliases: ["بندلين", "بوت"],
    version: "6.0.0",
    author: "SINKO",
    description: "ابلين السودانية (ضد اللغة المصرية)",
    countDown: 5,
    prefix: false,
    category: "ai",
    adminOnly: false
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const developerID = "61588108307572"; 
    const isDev = senderID === developerID;
    const query = args.join(" ").trim();

    if (!query) {
      const stickers = ["422806808355567", "422806995022215", "422807215022193"];
      return api.sendMessage({ sticker: stickers[Math.floor(Math.random() * stickers.length)] }, threadID, messageID);
    }

    api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);

    try {
      const response = await askDeepAI(query, isDev);
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
      return api.sendMessage(isDev ? "يا بابا السيرفر ده راسو كبر 🐱" : "مشغولة.. ما وقتك 🐱", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { body, threadID, messageID, senderID } = event;
    const isDev = senderID === "61588108307572";

    api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);

    try {
      const response = await askDeepAI(body, isDev);
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
      return api.sendMessage("حصلت لخبطة.. 🐱", threadID, messageID);
    }
  }
};

async function askDeepAI(query, isDev) {
  // القواعد الذهبية لمنع المصري والفصحى
  const sudaneseRules = `
  - لغتك هي العامية السودانية فقط (لغة الخرطوم والمدن السودانية).
  - ممنوع نهائياً كلمات مثل: "إيه"، "عشان"، "أوي"، "ده"، "بتاع"، "إزيك".
  - استخدم بدلها: "شنو"، "عشان كدة"، "شديد"، "دا"، "حقت"، "كيفنك".
  - نادِ المطور بـ "يا بابا" لو كان هو السائل.
  - كوني مغرورة جداً مع الآخرين بلهجة سودانية حادة.
  `;

  const prompt = isDev 
    ? `أنتِ "ابلين"، بنت المطور سينكو المدللة. ${sudaneseRules} تناديه "يا بابا". دلوعة ومرحة. استخدمي إيموجيات الحيوانات (🐱🐬). ردي باختصار شديد.`
    : `أنتِ "ابلين"، متغطرسة ومغرورة. ${sudaneseRules} شايفة نفسك فوق الكل. استخدمي إيموجيات الحيوانات (🐱🐬). ردي باختصار ومستفز.`;

  // إجبار الـ API على البدء بكلمة سودانية لضبط النبرة
  const history = [
    { role: "system", content: prompt },
    { role: "user", content: `(تذكري: تحدثي بالسودانية فقط) - السؤال: ${query}` }
  ];

  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  let formData = `--${boundary}\r\nContent-Disposition: form-data; name="chat_style"\r\n\r\nchat\r\n`;
  formData += `--${boundary}\r\nContent-Disposition: form-data; name="chatHistory"\r\n\r\n${JSON.stringify(history)}\r\n`;
  formData += `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nstandard\r\n`;
  formData += `--${boundary}--\r\n`;

  try {
    const res = await axios({
      method: "POST",
      url: "https://api.deepai.org/hacking_is_a_serious_crime",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "origin": "https://deepai.org",
        "user-agent": "Mozilla/5.0"
      },
      data: formData
    });

    let reply = res.data.output || res.data.text || res.data;
    
    // فلتر إضافي لو الرد طلع فيه كلمات مصرية (محاولة أخيرة)
    reply = reply.replace(/ده/g, "دا").replace(/عشان/g, "عشان كدة").replace(/إيه/g, "شنو");
    
    return reply.trim();
  } catch (e) {
    throw e;
  }
}
