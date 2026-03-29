const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'ظبطي'],
    version: '4.0.0',
    author: 'SINKO',
    description: 'تعديل الصور بالذكاء الاصطناعي (نسخة ضد الفصل)',
    countDown: 10,
    prefix: true,
    category: 'ai',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const developerID = "61588108307572"; 

    // التأكد من المطور
    if (senderID !== developerID) {
      return api.setMessageReaction("🚯", messageID, () => {}, true);
    }

    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage('⚠️ يرجى كتابة وصف للتعديل (مثلاً: بنين شعرها احمر).', threadID, messageID);

    let imageUrl;
    if (event.type === "message_reply") {
      const attachment = event.messageReply.attachments[0];
      if (attachment && (attachment.type === "photo" || attachment.type === "image")) {
        imageUrl = attachment.url;
      }
    }

    if (!imageUrl) return api.sendMessage('⚠️ يرجى الرد على صورة لتعديلها.', threadID, messageID);

    // تفاعل البدء
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    const filePath = path.join(cacheDir, `edit_${crypto.randomBytes(4).toString('hex')}.png`);

    try {
      await fs.ensureDir(cacheDir);

      // رابط السيرفر
      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}`;

      // زيادة مهلة الانتظار لـ 3 دقائق (180 ثانية) عشان السيرفر البطيء
      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 180000, 
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // إرسال النتيجة
      return api.sendMessage({
        body: `✅ تم التعديل بنجاح!\n📝 الوصف: ${prompt}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (error) {
      console.error('SD Error:', error.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      let msg = "❌ فشل في تعديل الصورة، السيرفر عليه ضغط.";
      if (error.code === 'ECONNABORTED') msg = "⚠️ السيرفر بطيء جداً وما رد في الوقت المناسب، جرب تاني.";
      
      return api.sendMessage(msg, threadID, messageID);
    }
  },
};
