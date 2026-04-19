const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

if (!global.ابلين_mode) { global.ابلين_mode = {}; }

const GROQ_KEYS = [
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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'
];

module.exports = {
  config: {
    name: "ابلين",
    aliases: ["بوت"],
    version: "25.0.0",
    author: "SINKO",
    countDown: 1,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim();
    const isDev = senderID === "61588108307572" || senderID === "100079668997780"; // ضفت الـ UID حقك

    if (query === "اون") {
        global.ابلين_mode[threadID] = "voice_only";
        return api.sendMessage("أبشر.. وضع الصوت 🎤 حيشتغل هسة.", threadID, messageID);
    }
    if (query === "اوف") {
        global.ابلين_mode[threadID] = "text_only";
        return api.sendMessage("خلاص.. قلبنا نص 🤐.", threadID, messageID);
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
      return api.sendMessage("السيرفر كبس هسة يا بابا، جرب تاني 🐱", threadID, messageID); 
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    if (handleReply.author !== senderID) return; // عشان ما يتداخل مع غيرك
    const isDev = senderID === "61588108307572" || senderID === "100079668997780";
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

async function askGroq(query, isDev) {
  // اختيار مفتاح عشوائي من المصفوفة لضمان الاستمرارية
  const key = GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];
  
  const systemPrompt = `أنتِ "إبلين"، فتاة سودانية 100% من قلب الخرطوم. 
  شخصيتك: لسانك طويل، شفتة، ومستفزة شديد مع الغرباء. 
  لغتك: عامية سودانية بحتة (أقري يا فردة، يا زول، في شنو، قايلني هينة، جلد عديل).
  ممنوع نهائياً: كلمات (بتاع، هيك، شو، مافيش، إيش). 
  علاقتك بالمطور: لو السائل هو "بابا" (المطور)، كوني رقيقة وحنينة ومطيعة لأبعد حد. 
  لو زول تاني: بليهو بل الجن، وردي بكلمات قصيرة وقاتلة.`;

  const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query }
    ],
    temperature: 0.8, // عشان الكلام يبقى فيه روح سودانية أكتر
  }, { headers: { "Authorization": `Bearer ${key}` } });
  
  return res.data.choices[0].message.content;
}

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
    if (!global.client.handleReply) global.client.handleReply = [];
    global.client.handleReply.push({ name: "ابلين", messageID, author });
}
