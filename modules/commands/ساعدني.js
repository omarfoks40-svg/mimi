const axios = require("axios");

// رابط API التعرف على صور الأنمي (Trace.moe)
const ANIME_TRACE_API = "https://api.trace.moe/search?cutBorders&url=";

module.exports = {
  config: {
    name: "ساعدني",
    version: "5.0.0", // إصدار مطور وشامل
    author: "سينكو",
    countDown: 5,
    role: 0,
    category: "ذكاء اصطناعي",
    description: "مساعد ذكي شامل يجاوب على الأسئلة بالعربية، ويتعرف على صور الأنمي (عن طريق الرد على الصورة).",
    aliases: ["ai", "جمناي", "gpt", "منو"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;
    let prompt = args.join(" ");

    // 1. التحقق لو المستخدم رد على صورة (للتعرف على الأنمي)
    if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
      const attachment = messageReply.attachments[0];
      if (attachment.type === "photo") {
        return handleAnimeImageSearch(api, threadID, messageID, attachment.url);
      }
    }

    // 2. التحقق لو المستخدم كتب سؤال نصي عادي
    if (!prompt) {
      return api.sendMessage("يا غالي اكتب سؤالك عشان أقدر أجاوبك، أو رد على صورة أنمي بكلمة 'ساعدني' عشان أعرفك عليها.", threadID, messageID);
    }

    // 3. معالجة السؤال النصي بالعربية المجبورة
    try {
      api.setMessageReaction("🤔", messageID, () => {}, true);
      
      const response = await askAI(prompt);
      
      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(response, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        }
      }, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("معليش يا زول، السيرفر فيه ضغط شوية. جرب تسألني تاني.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;

    if (handleReply.author !== senderID) return;

    try {
      api.setMessageReaction("🤔", messageID, () => {}, true);
      
      const response = await askAI(body);
      
      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(response, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID
          });
        }
      }, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("حصل خطأ بسيط، جرب تسأل مرة تانية.", threadID, messageID);
    }
  }
};

// --- الدوال المساعدة ---

// دالة الذكاء الاصطناعي (مجبورة على العربية الفصحى الشاملة)
async function askAI(question) {
  // تعليمات صارمة للـ API عشان يجاوب بالعربي بس ويكون شامل
  const systemInstruction = "أنت مساعد ذكي ومثقف جداً وشامل المعرفة. قواعدك الثابتة: 1. تجيب باللغة العربية الفصحى فقط وبشكل مفصل ومفيد دائماً مهما كان السؤال. 2. لا تستخدم الإنجليزية أبداً في الإجابة إلا للمصطلحات العلمية الضرورية جداً وبجوارها الترجمة العربية. 3. أجب بذكاء خارق كأنك خبير في المجال المذكور.";
  
  try {
    const url = `https://chatgpt.apinepdev.workers.dev/?question=${encodeURIComponent(systemInstruction + "\n\nالسؤال: " + question)}`;
    const res = await axios.get(url, { timeout: 45000 });
    
    let answer = res.data.answer || res.data.response || "لم أجد إجابة دقيقة حالياً.";
    return answer;
  } catch (error) {
    throw new Error("Error");
  }
}

// دالة البحث عن صورة الأنمي وترجمتها
async function handleAnimeImageSearch(api, threadID, messageID, imageUrl) {
  api.setMessageReaction("🔍", messageID, () => {}, true);
  
  try {
    // 1. جلب بيانات الأنمي من Trace.moe
    const traceRes = await axios.get(`${ANIME_TRACE_API}${encodeURIComponent(imageUrl)}`);
    
    if (!traceRes.data || !traceRes.data.result || traceRes.data.result.length === 0) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("معليش، ما قدرت أتعرف على الأنمي ده من الصورة.", threadID, messageID);
    }

    const topResult = traceRes.data.result[0];
    const animeTitleEN = topResult.filename; // غالباً اسم الملف بيكون فيه اسم الأنمي والشخصية
    const similarity = (topResult.similarity * 100).toFixed(2);

    // 2. استخدام الذكاء الاصطناعي لترجمة وتحليل اسم الأنمي والشخصية للعربية
    const translationPrompt = `ترجم اسم ملف الأنمي هذا إلى العربية بدقة (اسم الأنمي واسم الشخصية إن وجدا): "${animeTitleEN}". إذا كان الاسم يحتوي على رموز أو أرقام لا داعي لها، قم بتنظيفها.`;
    const arabicInfo = await askAI(translationPrompt);

    api.setMessageReaction("✅", messageID, () => {}, true);

    const finalMsg = `[ معلومات الأنمي - ذكاء سينكو ]\n\n🔎 النتيجة: ${arabicInfo}\n🎯 نسبة التشابه: ${similarity}%\n\n(ملاحظة: تم تحليل الاسم وترجمته بواسطة الذكاء الاصطناعي بناءً على محتوى الصورة)`;

    return api.sendMessage(finalMsg, threadID, messageID);

  } catch (error) {
    console.error(error);
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("حدث خطأ أثناء البحث عن الصورة.", threadID, messageID);
  }
}
