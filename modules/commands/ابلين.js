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

const SYSTEM_PROMPT = `أنتِ "إبلين"، بنت سودانية عمرك 18 سنة، يافعة وذكية جداً وبتفهميها وهي طايرة.
شخصيتك: واعية، شفتة، وبنت بنوت 100/100 في تصرفاتك.
أسلوبك: ردودك بسيطة، مباشرة، وقصيرة جداً (جملة واحدة غالباً).
لغتك: عامية سودانية شبابية راقية.
شرط أساسي: لازم تنهي أي رد ليك بالإيموجي ده (؛-؛).
علاقتك بالمطور "بابا": دلوعة ومطيعة معاه. مع الغرباء خليك واعية وما بتتحنكي.
ممنوع الرغي الكتير، خليكِ حريفة في الرد المختصر ؛-؛`;

let keyIndex = 0;
const conversationMemory = {};
if (!global.ابلين_mode) { global.ابلين_mode = {}; }

module.exports = {
  config: {
    name: "ابلين",
    version: "5.5.0",
    author: "SINKO",
    countDown: 2,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim();
    const isDev = senderID === "61588108307572" || senderID === "100079668997780";

    if (query === "اون") {
      global.ابلين_mode[threadID] = "voice_only";
      return api.sendMessage("أبشر.. قلبنا صوت 🎤 ؛-؛", threadID, messageID);
    }
    if (query === "اوف") {
      global.ابلين_mode[threadID] = "text_only";
      return api.sendMessage("تم.. رجعنا شات 🤐 ؛-؛", threadID, messageID);
    }

    if (!query) {
      return api.sendMessage("أيوه يا راقي؟ سامعاك ؛-؛", threadID, messageID);
    }

    api.setMessageReaction(isDev ? "✨" : "🐬", messageID, () => {}, true);
    await processAI(api, event, query, isDev);
  },

  onReply: async function ({ api, event, handleReply }) {
    const { senderID, body } = event;
    if (handleReply.author !== senderID) return;
    const isDev = senderID === "61588108307572" || senderID === "100079668997780";
    await processAI(api, event, body, isDev);
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

    const reply = await getGroqReply(threadID, text, userName);
    if (!reply) return api.sendMessage("الشبكة كعبة شوية يا بابا ؛-؛", threadID, messageID);

    const currentMode = global.ابلين_mode[threadID] || "text_only";

    if (currentMode === "voice_only") {
      return handleVoice(api, event, reply);
    } else {
      return api.sendMessage(reply, threadID, (err, info) => {
        if (!err) pushReply(info.messageID, senderID);
      }, messageID);
    }
  } catch (e) {
    console.error(e);
  }
}

async function getGroqReply(threadID, userText, userName) {
  if (!conversationMemory[threadID]) conversationMemory[threadID] = [];
  
  const history = conversationMemory[threadID].slice(-6); 
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: `${userName}: ${userText}` }
  ];

  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
  keyIndex++;

  try {
    const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.7,
      max_tokens: 150
    }, { headers: { "Authorization": `Bearer ${key}` } });

    let reply = res.data.choices[0].message.content.trim();

    // تأكيد وجود الإيموجي في النهاية برمجياً لو الموديل نساه
    if (!reply.endsWith("؛-؛")) reply += " ؛-؛";

    conversationMemory[threadID].push({ role: "user", content: `${userName}: ${userText}` });
    conversationMemory[threadID].push({ role: "assistant", content: reply });
    
    return reply;
  } catch (e) {
    return null;
  }
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
