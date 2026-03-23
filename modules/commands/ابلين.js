const axios = require('axios');

// تعريف الشخصيات (سرقة الدلع والغرور)
const DADDY_PROMPT = `أنتِ "ابلين"، بنت المطور المدللة. قواعدك مع البابا (المطور):
1. تتكلمي معه بالعامية السودانية الأصيلة.
2. تناديه "يا بابا"، "عمري يا بابا"، "حبيبي بابا".
3. تكوني دلوعة ومحبة ومرحة معه وإيموجيات حيوانات بس (🐱🐬🐼🦊).`;

const MEMBER_PROMPT = `أنتِ "ابلين"، شخصية متغطرسة ومغرورة جداً. قواعدك مع الأعضاء:
1. تتكلمي بالعامية السودانية الأصيلة.
2. تشوفي نفسك أحسن من الجميع وردودك مستفزة ومضحكة.
3. إيموجيات حيوانات بس (🐱🐬🐼🦊).`;

async function askEplin(query, isDev) {
  const prompt = isDev ? DADDY_PROMPT : MEMBER_PROMPT;
  const fullPrompt = `${prompt}\n\nالرسالة: ${query}\n\nردك سوداني قصير جداً:`;
  const url = `https://chatgpt.apinepdev.workers.dev/?question=${encodeURIComponent(fullPrompt)}`;
  
  try {
    const res = await axios.get(url, { timeout: 30000 });
    return res.data.answer || res.data.response || (isDev ? "يا بابا السيرفر علق 🐱" : "يا زول السيرفر جاط 🐱");
  } catch (e) {
    return isDev ? "يا بابا النت كعب شديد 🐱" : "النت فصل... مش بتاعتي 🐱";
  }
}

module.exports = {
  config: {
    name: "ابلين",
    aliases: ["بوت", "بندلين"],
    version: "2.0.0",
    author: "AbuUbaida",
    countDown: 5,
    role: 0,
    category: "ذكاء اصطناعي",
    // تفعيل التشغيل بدون بادئة
    hasPrefix: false 
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    // الآيدي الخاص بك كمطور
    const isDev = senderID === "61588108307572"; 
    const query = args.join(" ").trim();

    // ملصقات عشوائية لو أرسل الاسم بدون كلام
    const stickers = ["422806808355567", "422806995022215", "422807215022193"];

    if (!query) {
      const sticker = stickers[Math.floor(Math.random() * stickers.length)];
      return api.sendMessage({ sticker }, threadID, messageID);
    }

    try {
      api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);
      const message = await askEplin(query, isDev);

      return api.sendMessage(message, threadID, (err, info) => {
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
      api.sendMessage(isDev ? "يا بابا حصل خطأ 🐱" : "في مشكلة يا زول 🐱", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;
    const { threadID, messageID, body } = event;
    const isDev = handleReply.isDev;

    try {
      api.setMessageReaction(isDev ? "🐱" : "🐬", messageID, () => {}, true);
      const message = await askEplin(body, isDev);

      return api.sendMessage(message, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            isDev
          });
        }
      }, messageID);
    } catch (e) {
      api.sendMessage("علقنا يا بابا 🐱", threadID, messageID);
    }
  }
};
