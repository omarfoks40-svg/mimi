const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'dream'],
    version: '7.0.0',
    author: 'SINKO',
    description: 'تعديل الصور بالذكاء الاصطناعي (متاح للجميع + ضد الحظر)',
    countDown: 10, // مهلة بسيطة بين الاستخدامات لمنع السبام
    prefix: true,
    category: 'ai',
    adminOnly: false // تم التعديل ليكون متاحاً للكل ✅
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const prompt = args.join(" ");

    // تفاعل أولي عشان المستخدم يعرف إن البوت استلم الطلب
    api.setMessageReaction("⏳", messageID, () => {}, true);

    if (!prompt) {
      return api.sendMessage('❌ يرجى كتابة وصف للتعديل (مثلاً: عدلي تحويل لأنمي).', threadID, messageID);
    }

    let imageUrl;
    if (event.type === "message_reply") {
      const attachment = event.messageReply.attachments[0];
      if (attachment && (attachment.type === "photo" || attachment.type === "image")) {
        imageUrl = attachment.url;
      }
    }

    if (!imageUrl) {
      return api.sendMessage('❌ يرجى الرد على صورة لتعديلها.', threadID, messageID);
    }

    const cacheDir = path.join(__dirname, "cache");
    // اسم ملف عشوائي تماماً لتغيير البصمة الرقمية للصورة
    const filePath = path.join(cacheDir, `pub_sd_${crypto.randomBytes(6).toString('hex')}.png`);

    try {
      await fs.ensureDir(cacheDir);

      // --- نظام التمويه العميق لخدع خوارزميات فيسبوك ---
      const antiBanToken = crypto.randomBytes(8).toString('hex');
      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}&v=${antiBanToken}`;

      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 150000, // مهلة 150 ثانية لحماية البوت من الفصل
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.google.com/',
          'Accept': 'image/*'
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        // حماية إضافية لو الـ Stream علّق
        setTimeout(() => reject(new Error('STREAM_TIMEOUT')), 160000);
      });

      // إرسال النتيجة بنص نظيف (بدون زخارف تلفت انتباه الفيس)
      return api.sendMessage({
        body: `✅ تم التنفيذ بنجاح\n📝 الوصف: ${prompt}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (error) {
      console.error('SD Error:', error.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      
      let msg = "❌ فشل في معالجة الصورة، السيرفر مشغول حالياً.";
      if (error.code === 'ECONNABORTED' || error.message === 'STREAM_TIMEOUT') {
        msg = "⚠️ السيرفر بطيء جداً بسبب ضغط المستخدمين، جرب مرة ثانية بعد قليل.";
      }
      
      return api.sendMessage(msg, threadID, messageID);
    }
  },
};
