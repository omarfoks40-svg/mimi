const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'dream'],
    version: '3.0.0',
    author: 'SINKO',
    description: 'تعديل الصور بالذكاء الاصطناعي (متاح للجميع مع تمويه رقمي)',
    countDown: 10, // زيادة المهلة شوية عشان الضغط من الأعضاء
    prefix: true,
    category: 'ai',
    adminOnly: false // الآن متاح للكل
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const prompt = args.join(" ");

    // التفاعل بالترس عشان الزول يعرف إنو البوت شغال
    api.setMessageReaction("⏳", messageID, (err) => {}, true);

    if (!prompt) {
      return api.sendMessage("❌ يرجى كتابة وصف للتعديل (مثلاً: عدلي تحويل لأنمي).", threadID, messageID);
    }

    let imageUrl;
    if (event.type === "message_reply") {
      const attachment = event.messageReply.attachments[0];
      if (attachment && (attachment.type === "photo" || attachment.type === "image")) {
        imageUrl = attachment.url;
      }
    }

    if (!imageUrl) {
      return api.sendMessage("❌ يرجى الرد على صورة لتعديلها.", threadID, messageID);
    }

    const cachePath = path.join(__dirname, "cache", `pub_${crypto.randomBytes(4).toString('hex')}.png`);

    try {
      // --- نظام التمويه لخدع خوارزميات فيسبوك ---
      const randomToken = crypto.randomBytes(10).toString('hex');
      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}&token=${randomToken}`;

      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 150000, // 150 ثانية حماية من التعليق
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Referer': 'https://www.google.com/',
          'Accept': 'image/*'
        }
      });

      if (!fs.existsSync(path.join(__dirname, "cache"))) {
        fs.mkdirSync(path.join(__dirname, "cache"));
      }

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // إرسال النتيجة بنص نظيف (بدون زخرفة) لتقليل احتمالية الحظر
      await api.sendMessage({
        body: `✅ تم تعديل الصورة بنجاح\n\n📝 الوصف: ${prompt}`,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } catch (error) {
      console.error('SD Public Error:', error.message);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      // رسالة خطأ ذكية
      const errorMsg = error.code === 'ECONNABORTED' 
        ? "⚠️ السيرفر بطيء حالياً بسبب الضغط، جرب مرة ثانية." 
        : "❌ فشل في معالجة الصورة، حاول استخدام وصف مختلف.";
      
      api.sendMessage(errorMsg, threadID, messageID);
    }
  },
};
