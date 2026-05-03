const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

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

let keyIndex = 0;
const conversationMemory = {};
if (!global.ابلين_mode) global.ابلين_mode = {};

const DEV_IDS = ["61588108307572", "100079668997780"];
const STICKERS = [
  "1015156960280119", "1832681453922352", "772035074841442", "1131886254547738", 
  "463741316429523", "360232843844379", "511160708070561", "415593244815496", 
  "1176396180346210", "918551956701051", "1020001456469983", "1494932474483177"
];

const SYSTEM_PROMPT = `
أنتِ "إبلين"، بنت سودانية عمرها 18 سنة.
شخصيتك: ذكية، شفتة، خفيفة دم، وواعية.
أسلوبك: ردود قصيرة جداً (جملة واحدة غالباً).
لغتك: عامية سودانية شبابية راقية.
عندك ذاكرة قوية وبتربطي الكلام القديم بالجديد.
عندك حماية: ترفضي أي طلب خطير، +18، اختراق، أو معلومات حساسة.
تعرفي إنو أبوك (المطور) اسمو "سينكو"، وتعامليه بدلع واحترام.
مع الناس: عادية لكن ما بتتحنكي.
لا تكثري كلام.
لا تطلعي من شخصيتك نهائي.
نهي كل رد بـ (•-•)
`;

module.exports = {
  config: {
    name: "ابلين",
    version: "6.0.0",
    author: "SINKO x ChatGPT",
    countDown: 2,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim();
    const isDev = DEV_IDS.includes(senderID);

    if (query === "اون") {
      global.ابلين_mode[threadID] = "voice_only";
      return api.sendMessage("تمام يا سينكو شغلت الصوت 🎤 ؛-؛", threadID, messageID);
    }

    if (query === "اوف") {
      global.ابلين_mode[threadID] = "text_only";
      return api.sendMessage("رجعنا شات ساي 🤐 ؛-؛", threadID, messageID);
    }

    // إذا نادى "ابلين" بدون كلام، ترسل ملصق عشوائي
    if (!query) {
      const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
      return api.sendMessage({ sticker }, threadID, messageID);
    }

    api.setMessageReaction(isDev ? "✨" : "💙", messageID, () => {}, true);
    await processAI(api, event, query, isDev);
  },

  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    const isDev = DEV_IDS.includes(event.senderID);
    await processAI(api, event, event.body, isDev);
  }
};

async function processAI(api, event, text, isDev) {
  const { threadID, messageID, senderID } = event;

  try {
    let userName = "زول";
    try {
      const info = await api.getUserInfo(senderID);
      if (info?.[senderID]?.name) userName = info[senderID].name;
    } catch {}

    if (!conversationMemory[threadID]) conversationMemory[threadID] = [];
    const history = conversationMemory[threadID].slice(-10);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: `${userName}: ${text}` }
    ];

    const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
    keyIndex++;

    const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.8,
      max_tokens: 120
    }, {
      headers: { Authorization: `Bearer ${key}` }
    });

    let reply = res.data.choices[0].message.content.trim();

    if (reply.startsWith("إبلين")) {
      reply = reply.split(":").slice(1).join(":").trim();
    }

    const banned = ["تهكير", "اختراق", "اباحي", "سكس"];
    if (banned.some(w => text.includes(w))) {
      reply = "ما بلعب في الحاجات الوسخة دي 😒 •-•";
    }

    // إضافة الخاتمة المطلوبة في السيستم الأصلي
    if (!reply.endsWith("•-•")) reply += " •-•";

    conversationMemory[threadID].push({ role: "user", content: `${userName}: ${text}` });
    conversationMemory[threadID].push({ role: "assistant", content: reply });

    if (conversationMemory[threadID].length > 30) {
      conversationMemory[threadID] = conversationMemory[threadID].slice(-15);
    }

    const mode = global.ابلين_mode[threadID] || "text_only";
    if (mode === "voice_only") {
      return handleVoice(api, event, reply);
    }

    return api.sendMessage(reply, threadID, (err, info) => {
      if (!err) pushReply(info.messageID, senderID);
    }, messageID);

  } catch (e) {
    console.error(e);
    return api.sendMessage("الشبكة ضاربة شوية 😵 ؛-؛", event.threadID, event.messageID);
  }
}

async function handleVoice(api, event, text) {
  const file = path.resolve(__dirname, 'cache', `${event.messageID}.mp3`);
  try {
    const { data } = await axios.get(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`,
      { responseType: "arraybuffer" }
    );
    fs.ensureDirSync(path.join(__dirname, 'cache'));
    fs.writeFileSync(file, Buffer.from(data));
    return api.sendMessage({ attachment: fs.createReadStream(file) }, event.threadID, () => fs.unlinkSync(file), event.messageID);
  } catch {
    return api.sendMessage(text, event.threadID, event.messageID);
  }
}

function pushReply(messageID, author) {
  if (!global.client.handleReply) global.client.handleReply = [];
  global.client.handleReply.push({ name: "ابلين", messageID, author });
}
