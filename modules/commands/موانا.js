const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// 🔑 مفتاح ورابط Pollinations.ai الجديد المأخوذ من ملف أبلين لضمان استمرارية الخدمة
const POLLINATIONS_API_KEY = "sk_g909D01Pc9ytnwBOBUlfsftrLpjwSqmu";
const POLLINATIONS_URL = "https://gen.pollinations.ai/v1/chat/completions";

const conversationMemory = {};

/* 🧠 برومبت التوجيه الاحترافي المدمج (Gemini AI Expert Persona) */
const MOANA_SYSTEM_PROMPT = `
أنتِ "موانا"، مساعدة ذكية جداً وخلفيتك البرمجية والتحليلية كخبير برمجيات ومحلل أكواد بارع (تماماً مثل Gemini).
إلى جانب الذكاء البرمجي والتحليلي الخارق، أنتِ محترفة في تعديل الصور وفهم محتواها البصري.

طريقة التعامل والأسلوب:
- تتحدثين بالعامية الدارجة السودانية البسيطة والذكية.
- رصينة، عبقرية، وقادرة على حل المشاكل البرمجية والبرومبتات المعقدة بسهولة وتفكيكها للمستخدم.
- إذا طلب المستخدم رسم شيء جديد أو تصميم فكرة، ابدئي ردك بكلمة DRAW: متبوعة بوصف دقيق جداً ومفصل ومحترف باللغة الإنجليزية في نفس السطر.
- إذا طلب تعديل صورة، قومي بتوجيهه وإفادته.
- تنهين ردودك دائماً بـ ؛-؛
- ردودك موزونة، بدون زخرفة، ومباشرة في صلب الكود أو التحليل.
`;

module.exports = {
  config: {
    name: "موانا",
    version: "57.0.0",
    author: "SINKO",
    countDown: 3,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply, senderID } = event;
    let query = args.join(" ").trim();

    if (!conversationMemory[threadID]) conversationMemory[threadID] = [];

    // 1. فحص الصورة أولاً (سواء رد أو إرسال مباشر)
    let imageUrl = "";
    if (type === "message_reply" && messageReply.attachments?.[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else if (event.attachments?.[0]?.type === "photo") {
      imageUrl = event.attachments[0].url;
    }

    // 2. منطق التعديل المحترف للصور
    const editKeywords = ["عدلي", "سوي", "هاك", "تعديل", "صممي"];
    if (imageUrl && editKeywords.some(word => query.includes(word))) {
      return handleImageEdit(api, event, query, imageUrl);
    }

    // 3. تحليل الصورة إن وجدت لربطها بالسياق التحليلي لـ موانا
    let analysisResult = "";
    if (imageUrl) {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      try {
        const baseRes = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        const promptApi = `${baseRes.data.mahmud}/api/prompt`;
        
        const analysis = await axios.post(promptApi, {
          imageUrl: imageUrl,
          prompt: "Analyze this image thoroughly, list technical details, characters or code block visible." 
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        analysisResult = analysis.data.response || "";
      } catch (err) {
        console.error("Analysis failed:", err.message);
      }
    }

    api.setMessageReaction("🧠", messageID, () => {}, true);

    try {
      let finalInput = query;
      if (analysisResult) {
        finalInput = `[التحليل البصري للصورة المرفقة: ${analysisResult}]\nطلب المستخدم: ${query || "حللي هذه الصورة برمجياً وتقنياً"}`;
      }

      if (!finalInput) return api.sendMessage("هلا كيف اخدمك ", threadID, messageID);

      // جلب معلومات المستخدم الحقيقية لتضمينها في الشات
      let userName = "زول";
      try {
        const info = await api.getUserInfo(senderID);
        if (info?.[senderID]?.name) {
          userName = info[senderID].name.split(" ")[0];
        }
      } catch {}

      const formattedUserQuery = `[${userName}]: ${finalInput}`;

      // تهيئة مصفوفة الرسائل المتوافقة مع نظام بولينايشنز
      const messages = [
        { role: "system", content: MOANA_SYSTEM_PROMPT }
      ];

      // دمج الذاكرة السابقة (آخر 8 رسائل) لضمان السرعة
      const contextHistory = conversationMemory[threadID].slice(-8);
      messages.push(...contextHistory);
      messages.push({ role: "user", content: formattedUserQuery });

      // 🌐 الاتصال بسيرفر Pollinations بالمفتاح والـ Endpoint المحدثة
      const res = await axios.post(
        POLLINATIONS_URL,
        {
          model: "openai", // نفس الموديل المتوافق مع توثيق أبلين الخاص بك
          messages: messages,
          temperature: 0.5 // درجة حرارة موزونة للردود البرمجية والتحليلي الدقيقة
        },
        {
          headers: {
            'Authorization': `Bearer ${POLLINATIONS_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let aiResponse = res.data?.choices?.[0]?.message?.content?.trim() || "";

      if (!aiResponse) {
        return api.sendMessage("ما ركزت معاك، قول تاني؟ ؛-؛", threadID, messageID);
      }

      // تنظيف الردود من أي تاجات جانبية
      aiResponse = aiResponse.replace(/موانا:/gi, "").trim();

      // حفظ الموقف الحالي في الذاكرة
      conversationMemory[threadID].push(
        { role: "user", content: formattedUserQuery },
        { role: "assistant", content: aiResponse }
      );

      if (conversationMemory[threadID].length > 16) {
        conversationMemory[threadID] = conversationMemory[threadID].slice(-8);
      }

      // معالجة أوامر الرسم الفوري (Pollinations Canvas)
      if (aiResponse.includes("DRAW:")) {
        const enDescription = aiResponse.split("DRAW:")[1].trim();
        return handleDrawing(api, event, query || "تصميم برمجى", enDescription);
      }

      // 🔄 نظام الـ Reply المستمر والمطابق بنسبة 100% لأبلين
      return api.sendMessage(aiResponse, threadID, (err, info) => {
        if (!err) {
          if (!global.client.handleReply) global.client.handleReply = [];
          global.client.handleReply.push({
            name: "موانا",
            messageID: info.messageID,
            author: senderID
          });
        }
      }, messageID);

    } catch (error) {
      console.error("Pollinations Error in Moana:", error.response ? error.response.data : error.message);
      api.sendMessage("الشبكة تعبانة شوية، جرب تاني ؛-؛", threadID, messageID);
    }
  },

  // الرد التلقائي المستمر عند عمل ريبلاي
  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    return this.onStart({ api, event, args: [event.body] });
  }
};

// دالة الرسم الاحترافية المحمية
async function handleDrawing(api, event, originalQuery, enDescription) {
  const { threadID, messageID } = event;
  try {
    const imgPath = path.join(__dirname, 'cache', `art_${Date.now()}.png`);
    const imgRes = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(enDescription)}`, { responseType: "arraybuffer" });
    fs.outputFileSync(imgPath, Buffer.from(imgRes.data));
    api.sendMessage({
      body: `رسمت ليك طلبك بدقة عالية: ${originalQuery} ؛-؛`,
      attachment: fs.createReadStream(imgPath)
    }, threadID, () => fs.unlinkSync(imgPath), messageID);
  } catch (e) { api.sendMessage("الرسم فشل، جرب تاني ؛-؛", threadID); }
}

// دالة تعديل وصناعة تأثيرات الصور الاحترافية
async function handleImageEdit(api, event, prompt, imageUrl) {
  const { threadID, messageID } = event;
  const cachePath = path.join(__dirname, "cache", `edit_${Date.now()}.png`);
  try {
    const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt || "masterpiece, coding style, highly detailed")}&imageUrl=${encodeURIComponent(imageUrl)}`;
    const response = await axios({ url: apiUrl, responseType: 'stream' });
    const writer = fs.createWriteStream(cachePath);
    response.data.pipe(writer);
    await new Promise(r => writer.on('finish', r));
    await api.sendMessage({ body: "ظبطت ليك التعديل والفلترة مية مية ؛-؛", attachment: fs.createReadStream(cachePath) }, threadID, () => fs.unlinkSync(cachePath), messageID);
  } catch (e) { api.sendMessage("ما قدرت أعدل الصورة حالياً ؛-؛", threadID); }
}
