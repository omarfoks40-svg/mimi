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

const STICKERS = [
  "1015156960280119","1832681453922352","772035074841442",
  "1131886254547738","463741316429523","360232843844379"
];

const APLIN_NAME = 'ابلين';

/* 🔥 شخصية سودانية محسّنة */
const SYSTEM_INSTRUCTION_TEXT = `
أنتِ ${APLIN_NAME}، بنت سودانية عمرها 18 سنة.

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

function getKey() {
  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
  keyIndex++;
  return key;
}

module.exports = {
  config: {
    name: "",
    version: "26.5.0",
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

    /* 🔒 اسم المستخدم الحقيقي فقط */
    let userName = ".";
    try {
      const info = await api.getUserInfo(senderID);
      if (info?.[senderID]?.name) {
        userName = info[senderID].name.split(" ")[0];
      }
    } catch {}

    const formattedUserQuery = `[${userName}]: ${userQuery}`;

    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION_TEXT },
          ...conversationMemory[threadID].slice(-8),
          { role: "user", content: formattedUserQuery }
        ],
        temperature: 0.85
      },
      {
        headers: {
          Authorization: `Bearer ${getKey()}`
        }
      }
    );

    let reply = res.data.choices[0].message.content.trim();

    /* 🔥 منع ظهور اسم البوت أو اختراعات */
    reply = reply
      .replace(/ابلين:|إبلين:/gi, "")
      .replace(/\[.*?\]:/g, "")
      .trim();

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

    // تعديل الربولي لضمان استمرارية المحادثة
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
        fs.unlinkSync(file);
      },
      event.messageID
    );

  } catch {
    return api.sendMessage(`${text} 🪿`, event.threadID, event.messageID);
  }
}
