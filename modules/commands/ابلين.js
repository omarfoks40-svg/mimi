const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

if (!global.ابلين_mode) { global.ابلين_mode = {}; }

module.exports = {
  config: {
    name: "ابلين",
    aliases: ["بوت"],
    version: "21.0.0",
    author: "SINKO",
    countDown: 2,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim();
    const isDev = senderID === "61588108307572";

    if (query === "اون") {
        global.ابلين_mode[threadID] = "voice_only";
        return api.sendMessage("تم تشغيل وضع الصوت 🎤🐱 (بدون كتابة)", threadID, messageID);
    }
    if (query === "اوف") {
        global.ابلين_mode[threadID] = "text_only";
        return api.sendMessage("تم تشغيل وضع النص 🤐🐬 (بدون صوت)", threadID, messageID);
    }

    if (!query) {
      const stickers = ["422806808355567", "422806995022215", "422807215022193"];
      return api.sendMessage({ sticker: stickers[Math.floor(Math.random() * stickers.length)] }, threadID, messageID);
    }

    api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);

    try {
      const response = await askGroq(query, isDev);
      const currentMode = global.ابلين_mode[threadID] || "text_only";

      if (currentMode === "voice_only") {
        return handleVoice(api, event, response);
      } else {
        return api.sendMessage(response, threadID, (err, info) => {
          if (!err) pushReply(info.messageID, senderID);
        }, messageID);
      }
    } catch (e) { 
      console.error(e);
      return api.sendMessage("يا بابا الموديل ده جلا، جرب تاني 🐱", threadID, messageID); 
    }
  },

  onReply: async function ({ api, event }) {
    const { threadID, messageID, senderID, body } = event;
    const isDev = senderID === "61588108307572";
    api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);
    try {
      const response = await askGroq(body, isDev);
      if ((global.ابلين_mode[threadID] || "text_only") === "voice_only") {
        return handleVoice(api, event, response);
      } else {
        api.sendMessage(response, threadID, (err, info) => {
          if (!err) pushReply(info.messageID, senderID);
        }, messageID);
      }
    } catch (e) { console.error(e); }
  }
};

async function handleVoice(api, event, text) {
  const pathAudio = path.resolve(__dirname, 'cache', `${event.messageID}.mp3`);
  try {
    const { data } = await axios.get(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`, { responseType: "arraybuffer" });
    fs.ensureDirSync(path.join(__dirname, 'cache'));
    fs.writeFileSync(pathAudio, Buffer.from(data, "utf-8"));
    return api.sendMessage({ attachment: fs.createReadStream(pathAudio) }, event.threadID, (err, info) => {
      if (!err) pushReply(info.messageID, event.senderID);
      if (fs.existsSync(pathAudio)) fs.unlinkSync(pathAudio);
    }, event.messageID);
  } catch (e) { 
    if (fs.existsSync(pathAudio)) fs.unlinkSync(pathAudio);
    return api.sendMessage(text, event.threadID, event.messageID);
  }
}

function pushReply(messageID, author) {
    global.client.handleReply.push({ name: "ابلين", messageID, author });
}

async function askGroq(query, isDev) {
  // تحديث الموديل لنسخة Llama-3.3 القوية لحل مشاكل اللغة
  const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: `أنتِ إبلين، فتاة سودانية. لغتك هي العامية السودانية الحقيقية. ممنوع كلمات (مافيش، هيك، بتاع). لو السائل بابا (${isDev}) كوني رقيقة. لو غريب كوني مستفزة جداً. ردي باختصار.` },
      { role: "user", content: query }
    ]
  }, { headers: { "Authorization": `Bearer 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` } });
  return res.data.choices[0].message.content;
}
