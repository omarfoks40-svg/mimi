const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'dream'],
    version: '3.5.0',
    author: 'SINKO',
    description: 'تعديل الصور بالذكاء الاصطناعي (متاح للجميع وبدون زخرفة)',
    countDown: 8,
    prefix: true,
    category: 'ai',
    adminOnly: false // الآن متاح للجميع ✅
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const prompt = args.join(" ");

    // التفاعل الأولي بالرموز فقط
    api.setMessageReaction("⏰", messageID, (err) => {}, true);

    // التحقق من وجود وصف
    if (!prompt) {
      return api.sendMessage('❌ يرجى كتابة وصف للتعديل.', threadID, messageID);
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

    const cachePath = path.join(__dirname, "cache", `sd_${crypto.randomBytes(4).toString('hex')}.png`);

    try {
      // نظام التمويه الرقمي بإضافة token عشوائي للرابط
      const randomKey = crypto.randomBytes(6).toString('hex');
      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}&v=${randomKey}`;

      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 120000,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.google.com/'
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

      // إرسال النتيجة بنص نظيف ومباشر (بدون زخارف)
      const messageBody = `✅ تم التنفيذ بنجاح\n\n📝 الوصف: ${prompt}`;

      await api.sendMessage({
        body: messageBody,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } catch (error) {
      console.error('SD Error:', error.message);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.sendMessage('❌ فشل في معالجة الصورة، جرب مرة أخرى.', threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  },
};
