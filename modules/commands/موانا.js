const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const GROQ_KEYS = [
  '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',
  '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',
  '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'
];

const GEMINI_KEY = "AIzaSyBlgX1IEFZyyDD7DL_o_JG-IU3bPCFCJ1s";

// البرومبت الجديد: لغة فصيحة وشرح متوسط
const SYSTEM_PROMPT = `أنتِ "موانا"، المساعدة الذكية والخبيرة التقنية.
- شخصيتك: واعية، خبيرة في الألعاب والبرمجة.
- أسلوب الرد: باللغة العربية الفصحى، وبشرح متوسط الطول (غير ممل وغير مختصر جداً).
- إذا سألك المستخدم عن لعبة أو تطبيق، قدمي تفاصيل تقنية مفيدة.
- إنهاء الرد دائماً بـ (؛-؛).`;

let keyIndex = 0;
const conversationMemory = {};

module.exports = {
  config: {
    name: "موانا",
    version: "15.0.0",
    author: "SINKO",
    countDown: 2,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, type, messageReply } = event;
    const query = args.join(" ").trim();
    
    let imageUrl = "";
    if (type === "message_reply" && messageReply.attachments[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else if (event.attachments[0]?.type === "photo") {
      imageUrl = event.attachments[0].url;
    }

    // --- منطق تعديل الصور (موانا عدلي / سوي / هاك) ---
    const editKeywords = ["عدلي", "سوي", "هاك", "تعديل", "صممي"];
    const isEditOrder = editKeywords.some(word => query.includes(word));

    if (imageUrl && isEditOrder) {
      const cleanPrompt = query.replace(/موانا|عدلي|سوي|هاك|تعديل|صممي/g, "").trim();
      return handleImageEdit(api, event, cleanPrompt, imageUrl);
    }

    // --- منطق قراءة الصور (التعرف على محتوى الصورة بالبرومبت) ---
    if (imageUrl && !isEditOrder) {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      const extractedInfo = await extractPrompt(imageUrl);
      const finalQuery = query ? `عن هذه الصورة (${extractedInfo}): ${query}` : `ما هذه الصورة؟ (المعلومات التقنية: ${extractedInfo})`;
      return processAI(api, event, finalQuery);
    }

    if (!query) return api.sendMessage("موانا معك.. كيف يمكنني مساعدتك تقنياً اليوم؟ ؛-؛", threadID, messageID);

    api.setMessageReaction("✨", messageID, () => {}, true);
    await processAI(api, event, query);
  },

  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    await processAI(api, event, event.body);
  }
};

// --- دالة معالجة الذكاء الاصطناعي ---
async function processAI(api, event, text) {
  const { threadID, messageID, senderID } = event;
  try {
    let reply = await getGroqReply(threadID, text);
    if (!reply) reply = await getGeminiReply(text);
    if (!reply) return api.sendMessage("عذراً، واجهت مشكلة في الاتصال بالخادم ؛-؛", threadID, messageID);

    // --- منطق روابط جوجل (للألعاب والتطبيقات فقط) ---
    const appKeywords = ["لعبة", "تطبيق", "تحميل", "برنامج", "game", "app", "download"];
    const isAppRequest = appKeywords.some(word => text.toLowerCase().includes(word));
    
    let finalReply = reply;
    if (isAppRequest) {
      const searchLink = `\n\n🔗 روابط البحث والتحميل:\nhttps://www.google.com/search?q=${encodeURIComponent(text)}`;
      finalReply = reply.includes("؛-؛") ? reply.replace("؛-؛", searchLink + " ؛-؛") : reply + searchLink + " ؛-؛";
    }

    api.sendMessage(finalReply, threadID, (err, info) => {
      if (!err) {
        global.client.handleReply = global.client.handleReply || [];
        global.client.handleReply.push({ name: "موانا", messageID: info.messageID, author: senderID });
      }
    }, messageID);
  } catch (e) { console.error(e); }
}

// --- دالة استخراج البرومبت (قراءة الصور) ---
async function extractPrompt(imgUrl) {
  try {
    const sessionID = crypto.randomBytes(4).toString("hex");
    await axios.post('https://pixai-labs-pixai-tagger-demo.hf.space/gradio_api/queue/join', {
      data: [null, null, imgUrl, 0.3, 0.85, "threshold", 25, 10, false, false],
      fn_index: 2, session_hash: sessionID
    });
    await new Promise(r => setTimeout(r, 3000));
    const res = await axios.get(`https://pixai-labs-pixai-tagger-demo.hf.space/gradio_api/queue/data?session_hash=${sessionID}`);
    const match = res.data.match(/"data":\["([^"]+)"/);
    return match ? match[1] : "صورة غير معروفة";
  } catch (e) { return "فشل في قراءة الصورة"; }
}

// --- الدوال المساعدة (Groq / Gemini / Edit) ---
async function getGroqReply(threadID, userText) {
  if (!conversationMemory[threadID]) conversationMemory[threadID] = [];
  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
  keyIndex++;
  try {
    const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...conversationMemory[threadID].slice(-5), { role: "user", content: userText }],
      temperature: 0.6
    }, { headers: { "Authorization": `Bearer ${key}` } });
    const reply = res.data.choices[0].message.content.trim();
    conversationMemory[threadID].push({ role: "user", content: userText }, { role: "assistant", content: reply });
    return reply;
  } catch (e) { return null; }
}

async function getGeminiReply(text) {
  try {
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`, {
      contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\nسؤال المستخدم: " + text }] }]
    });
    return res.data.candidates[0].content.parts[0].text;
  } catch (e) { return null; }
}

async function handleImageEdit(api, event, prompt, imageUrl) {
  const { threadID, messageID } = event;
  api.setMessageReaction("⏳", messageID, () => {}, true);
  const cachePath = path.join(__dirname, "cache", `moana_${Date.now()}.png`);
  try {
    const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt || "anime style")}&imageUrl=${encodeURIComponent(imageUrl)}`;
    const response = await axios({ url: apiUrl, responseType: 'stream' });
    const writer = fs.createWriteStream(cachePath);
    response.data.pipe(writer);
    await new Promise(r => writer.on('finish', r));
    await api.sendMessage({ body: "تم التعديل بناءً على طلبك ؛-؛", attachment: fs.createReadStream(cachePath) }, threadID, () => fs.unlinkSync(cachePath), messageID);
  } catch (e) { api.sendMessage("فشل التعديل، حاول لاحقاً ؛-؛", threadID); }
}
