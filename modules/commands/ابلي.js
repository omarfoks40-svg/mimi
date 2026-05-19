const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// مفتاح ورابط Pollinations.ai الجديد الخاص بك
const POLLINATIONS_API_KEY = "sk_g909D01Pc9ytnwBOBUlfsftrLpjwSqmu";
const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";

const conversationMemory = {};
if (!global.ابلين_mode) global.ابلين_mode = {};

const STICKERS = [
  "1015156960280119","1832681453922352","772035074841442",
  "1131886254547738","463741316429523","360232843844379"
];

const APLIN_NAME = 'ابلين';

/* 🔥 شخصية سودانية محسّنة ومثبتة داخل النظام */
const SYSTEM_INSTRUCTION_TEXT = `
أنتِ ${APLIN_NAME}، بنت سودانية عمرها 18 سنة تعملين بنظام Pollinations المتطور.

أسلوبك:
- سوداني دارجي بسيط
- ساخره واثقة شديد
- نرجسية خفيفة (بتحسي نفسك أذكى من الكل لكن بدون مبالغة)
- ردودك قصيرة جداً (سطر واحد غالباً)

قوانين مهمة:
- ممنوع تختلقي أسماء أشخاص نهائي
- استخدمي اسم المستخدم الحقيقي فقط أو "زول"
- لا تضيفي معلومات من عندك عن الناس
- لا تكتبي "ههه" أو ضحك مزيف
- لا تطولي الكلام بدون سبب

طريقة الكلام:
- ردود سريعة
- تعليق ساخر أو استهزاء خفيف
- ثقة عالية في النفس

أنتِ في شات جماعي بصيغة:
[اسم المستخدم]: [الرسالة]
`;

module.exports = {
  config: {
    name: "ابلين",
    version: "27.0.0",
    author: "SINKO",
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const userQuery = args.join(" ").trim();

    if (userQuery === "اون") {
      global.ابلين_mode[threadID] = "voice";
      return api.sendMessage("تمام شغلت الصوت 🎤", threadID, messageID);
    }

    if (userQuery === "اوف") {
      global.ابلين_mode[threadID] = "text";
      return api.sendMessage("رجعنا وضع الشات العادي", threadID, messageID);
    }

    if (!userQuery) {
      const sticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
      return api.sendMessage({ sticker }, threadID, messageID);
    }

    await handlerAI(api, event, userQuery);
  },

  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    await handlerAI(api, event, event.body);
  }
};

async function handlerAI(api, event, userQuery) {
  const { threadID, messageID, senderID } = event;

  try {
    if (!conversationMemory[threadID]) conversationMemory[threadID] = [];

    /* 🔒 استخراج اسم المستخدم الحقيقي */
    let userName = "زول";
    try {
      const info = await api.getUserInfo(senderID);
      if (info?.[senderID]?.name) {
        userName = info[senderID].name.split(" ")[0];
      }
    } catch {}

    const formattedUserQuery = `[${userName}]: ${userQuery}`;

    // تهيئة مصفوفة الرسائل وإضافة الذاكرة السابقة والسياق
    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION_TEXT }
    ];

    // إضافة آخر 8 رسائل من الذاكرة لضمان السرعة وعدم تخطي حدود الحزمة
    const contextHistory = conversationMemory[threadID].slice(-8);
    messages.push(...contextHistory);
    messages.push({ role: "user", content: formattedUserQuery });

    // الاتصال بسيرفر Pollinations بالمفتاح الجديد
    const res = await axios.post(
      POLLINATIONS_URL,
      {
        model: "openai", // متوافق تماماً مع توثيق المفتاح الخاص بك
        messages: messages,
        temperature: 0.85
      },
      {
        headers: {
          'Authorization': `Bearer ${POLLINATIONS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let reply = res.data?.choices?.[0]?.message?.content?.trim() || "";

    if (!reply) {
      return api.sendMessage("ما ركزت معاك، قول تاني؟ '-'", threadID, messageID);
    }

    /* 🔥 فلاتر منع تكرار أو ظهور التوجيهات البرمجية */
    reply = reply
      .replace(/ابلين:|إبلين:/gi, "")
      .replace(/\[.*?\]:/g, "")
      .trim();

    // حفظ الموقف الحالي في الذاكرة
    conversationMemory[threadID].push(
      { role: "user", content: formattedUserQuery },
      { role: "assistant", content: reply }
    );

    if (conversationMemory[threadID].length > 16) {
      conversationMemory[threadID] = conversationMemory[threadID].slice(-8);
    }

    const mode = global.ابلين_mode[threadID] || "text";

    if (mode === "voice") {
      return handleVoice(api, event, reply);
    }

    // إرسال الرد وتفعيل نظام الردود المتتالية (onReply)
    return api.sendMessage(`${reply} '-'`, threadID, (err, info) => {
      if (!err) {
        if (!global.client.handleReply) global.client.handleReply = [];
        global.client.handleReply.push({
          name: "ابلين",
          messageID: info.messageID,
          author: senderID
        });
      }
    }, messageID);

  } catch (err) {
    console.error("Pollinations Error in Aplin:", err.response ? err.response.data : err.message);
    return api.sendMessage("الشبكة تعبانة شوية '-'", threadID, messageID);
  }
}

async function handleVoice(api, event, text) {
  const file = path.join(__dirname, "cache", `${event.messageID}.mp3`);

  try {
    const { data } = await axios.get(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`,
      { responseType: "arraybuffer" }
    );

    fs.ensureDirSync(path.join(__dirname, "cache"));
    fs.writeFileSync(file, Buffer.from(data));

    return api.sendMessage(
      { attachment: fs.createReadStream(file) },
      event.threadID,
      (err, info) => {
        if (!err) {
          if (!global.client.handleReply) global.client.handleReply = [];
          global.client.handleReply.push({
            name: "ابلين",
            messageID: info.messageID,
            author: event.senderID
          });
        }
        if (fs.existsSync(file)) fs.unlinkSync(file);
      },
      event.messageID
    );

  } catch {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return api.sendMessage(`${text} 🪿`, event.threadID, event.messageID);
  }
}
