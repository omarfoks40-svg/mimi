const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'dream'],
    version: '2.6.0',
    author: 'SINKO',
    description: 'تعديل صور بنظام التمويه الرقمي (بدون زخرفة)',
    countDown: 10,
    prefix: true,
    category: 'ai',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const developerID = "61588108307572"; 

    // التحقق من المطور
    if (senderID !== developerID) {
      return api.setMessageReaction("🚯", messageID, (err) => {}, true);
    }

    const prompt = args.join(" ");
    api.setMessageReaction("⏳", messageID, (err) => {}, true);

    if (!prompt) {
      return api.sendMessage('❌ يرجى كتابة وصف للصورة.', threadID, messageID);
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

    const cachePath = path.join(__dirname, "cache", `edit_${crypto.randomBytes(4).toString('hex')}.png`);

    try {
      // 1. ميزة التمويه: إضافة كود عشوائي للرابط لمنع الحظر
      const antiBanKey = crypto.randomBytes(8).toString('hex');
      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}&v=${antiBanKey}`;

      // 2. ميزة الوكيل المتغير: تغيير هوية الجهاز في كل طلب
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
      ];

      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 180000,
        headers: { 
          'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
          'Accept': 'image/*'
        }
      });

      if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // إرسال النتيجة بنص بسيط ونظيف
      const messageBody = `✅ تم التنفيذ بنجاح\n📝 الوصف: ${prompt}`;

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
      api.sendMessage('❌ فشل في معالجة الصورة، حاول مرة أخرى.', threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  },
};
