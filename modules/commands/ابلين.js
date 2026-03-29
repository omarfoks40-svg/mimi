const axios = require("axios");

module.exports = {
  config: {
    name: "ابلين",
    aliases: ["بندلين", "بوت"],
    version: "5.0.0",
    author: "SINKO",
    description: "دردشة ابلين بنظام سيرفر DeepAI المستقر",
    countDown: 5,
    prefix: false,
    category: "ai",
    adminOnly: false
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const developerID = "61588108307572"; // أيدي البابا سينكو
    const isDev = senderID === developerID;
    const query = args.join(" ").trim();

    if (!query) {
      const stickers = ["422806808355567", "422806995022215", "422807215022193"];
      return api.sendMessage({ sticker: stickers[Math.floor(Math.random() * stickers.length)] }, threadID, messageID);
    }

    api.setMessageReaction(isDev ? "🐱" : "🐬", messageID, () => {}, true);

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
      return api.sendMessage(isDev ? "يا بابا السيرفر ده كمان غلبني 🐱" : "مشغولة.. ما وقتك 🐱", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { body, threadID, messageID, senderID } = event;
    const isDev = senderID === "61588108307572";

    api.setMessageReaction(isDev ? "🐱" : "🐬", messageID, () => {}, true);

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
      return api.sendMessage("حصلت لخبطة في الرد.. 🐱", threadID, messageID);
    }
  }
};

// الدالة الأساسية لاستدعاء DeepAI (الابل الجديد)
async function askDeepAI(query, isDev) {
  const prompt = isDev 
    ? `أنتِ "ابلين"، بنت المطور سينكو المدللة. لغتك سودانية عامية. تناديه "يا بابا". دلوعة ومحبة ومرحة. استخدمي إيموجيات الحيوانات (🐱🐬🐼). ردي في جملتين.`
    : `أنتِ "ابلين"، مغرورة جداً وشايفة نفسك أحسن من الأعضاء. لغتك سودانية عامية (زول، شنو). ردودك مستفزة ومضحكة. استخدمي إيموجيات الحيوانات (🐱🐬🐼). ردي في جملتين.`;

  const history = [
    { role: "system", content: prompt },
    { role: "user", content: query }
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
    return reply.trim() || (isDev ? "يا بابا ما لقيت رد 🐱" : "ما دايرة أرد 🐱");
  } catch (e) {
    console.error("DeepAI Error:", e.message);
    throw e;
  }
}
