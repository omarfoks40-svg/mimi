const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const moment = require('moment-timezone');

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

// مفتاح Gemini اللي رسلتو في الصورة يا ملك
const GEMINI_KEY = "AIzaSyBlgX1IEFZyyDD7DL_o_JG-IU3bPCFCJ1s";

const SYSTEM_PROMPT = `أنتِ "موانا"، المساعدة العملاقة والخبيرة التقنية.
- شخصيتك: سودانية شفتة، واعية جداً، وموسوعة في الألعاب والبرمجة.
- المهمة: إذا سألك المستخدم عن أي شيء (خاصة الألعاب مثل Poppy Playtime)، قدمي شرحاً مفصلاً جداً، عميقاً، وممتعاً. لا تختصري أبداً.
- لغتك: السودانية العامية الراقية.
- شرط: إنهاء الرد بـ (؛-؛).`;

let keyIndex = 0;
const conversationMemory = {};

module.exports = {
  config: {
    name: "موانا",
    version: "13.0.0",
    author: "SINKO",
    countDown: 2,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, type, messageReply } = event;
    const query = args.join(" ").trim();
    const isDev = senderID === "61588108307572" || senderID === "100079668997780";

    let imageUrl = "";
    if (type === "message_reply" && messageReply.attachments[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else if (event.attachments[0]?.type === "photo") {
      imageUrl = event.attachments[0].url;
    }

    // نظام التعديل (الصاروخ) - شغال زي ما هو
    if (imageUrl) {
      return handleImageEdit(api, event, query, imageUrl);
    }

    if (!query) return api.sendMessage("المساعد العملاق معاك.. داير شرح لشنو الليلة؟ ؛-؛", threadID, messageID);

    api.setMessageReaction("✨", messageID, () => {}, true);
    await processAI(api, event, query, isDev);
  },

  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    const { body, attachments, senderID } = event;
    let imageUrl = attachments[0]?.type === "photo" ? attachments[0].url : "";

    if (imageUrl) return handleImageEdit(api, event, body, imageUrl);
    await processAI(api, event, body, (senderID === "61588108307572" || senderID === "100079668997780"));
  }
};

async function processAI(api, event, text, isDev) {
  const { threadID, messageID, senderID } = event;
  try {
    let userName = "صديق";
    try {
      const info = await api.getUserInfo(senderID);
      if (info?.[senderID]?.name) userName = info[senderID].name;
    } catch (e) {}

    // محاولة الحصول على رد عملاق
    let reply = await getGroqReply(threadID, text, userName);
    
    // لو Groq فشل، نستخدم Gemini اللي في الصورة
    if (!reply) reply = await getGeminiReply(text);

    if (!reply) return api.sendMessage("الشبكة كعبة، جرب تاني يا ملك ؛-؛", threadID, messageID);

    // --- منطق الرابط الإجباري المطور ---
    // أي رسالة نصية (غير ردا على صورة) حنعتبرها طلب معلومة وحنضيف الرابط
    const searchLink = `\n\n🔗 روابط البحث والتحميل (Google): \nhttps://www.google.com/search?q=${encodeURIComponent(text + " game download info")}`;
    
    // دمج الرابط قبل الإيموجي النهائي
    let finalReply = reply.includes("؛-؛") ? reply.replace("؛-؛", searchLink + " ؛-؛") : reply + searchLink + " ؛-؛";

    api.sendMessage(finalReply, threadID, (err, info) => {
      if (!err) {
        if (!global.client.handleReply) global.client.handleReply = [];
        global.client.handleReply.push({ name: "موانا", messageID: info.messageID, author: senderID });
      }
    }, messageID);
  } catch (e) { console.error(e); }
}

async function getGroqReply(threadID, userText, userName) {
  if (!conversationMemory[threadID]) conversationMemory[threadID] = [];
  const history = conversationMemory[threadID].slice(-15);
  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
  keyIndex++;

  try {
    const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: `${userName}: ${userText}` }],
      temperature: 0.7,
      max_tokens: 3000 // رفع السقف لأقصى حد للشرح العملاق
    }, { headers: { "Authorization": `Bearer ${key}` }, timeout: 20000 });

    let reply = res.data.choices[0].message.content.trim();
    conversationMemory[threadID].push({ role: "user", content: userText }, { role: "assistant", content: reply });
    return reply;
  } catch (e) { return null; }
}

async function getGeminiReply(text) {
  try {
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`, {
      contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\nالمستخدم سأل: " + text }] }]
    });
    return res.data.candidates[0].content.parts[0].text;
  } catch (e) { return null; }
}

async function handleImageEdit(api, event, prompt, imageUrl) {
  const { threadID, messageID } = event;
  api.setMessageReaction("⏳", messageID, () => {}, true);
  api.sendMessage(`> ˼🌌˹↜  Moana  ↶\nجاري تحميل نانو بنانا 🤙⏳ ؛-؛`, threadID, async (err, info) => {
    const cachePath = path.join(__dirname, "cache", `edit_${crypto.randomBytes(3).toString('hex')}.png`);
    try {
      const finalPrompt = prompt || "high quality anime style";
      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(finalPrompt)}&imageUrl=${encodeURIComponent(imageUrl)}&v=${Date.now()}`;
      const response = await axios({ method: 'get', url: apiUrl, responseType: 'stream', timeout: 120000 });
      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);
      await new Promise((res) => writer.on('finish', res));

      await api.sendMessage({ body: `> ˼⏰˹↜ تـم الـتعديـل الـعـملاق ↶ ؛-؛`, attachment: fs.createReadStream(cachePath) }, threadID, () => {
        fs.unlinkSync(cachePath);
        api.setMessageReaction("✔️", messageID, () => {}, true);
        if (info) api.unsendMessage(info.messageID);
      }, messageID);
    } catch (e) { 
      api.setMessageReaction("❌", messageID, () => {}, true);
      if (info) api.unsendMessage(info.messageID);
    }
  }, messageID);
}
