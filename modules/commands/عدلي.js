const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'بنين'],
    version: '3.5.0',
    author: 'SINKO',
    description: 'توليد صور بنظام الحماية المستقرة من الفصل',
    countDown: 15, // زيادة الأمان لراندر
    prefix: true,
    category: 'ai',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const developerID = "61588108307572"; 

    if (senderID !== developerID) {
      return api.setMessageReaction("⭕", messageID, () => {}, true);
    }

    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage('⚠️ يرجى كتابة وصف للصورة.', threadID, messageID);

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
    const fileName = `sd_${crypto.randomBytes(4).toString('hex')}.png`;
    const cachePath = path.join(cacheDir, fileName);

    try {
      await fs.ensureDir(cacheDir);

      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}`;

      // طلب الصورة مع مهلة زمنية صارمة لعدم قتل البوت
      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 90000, // 90 ثانية كحد أقصى
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const messageBody = `✨ نـتـيـجـة الـتـولـيـد ✨\n\n📝 الـوصـف : ${prompt}\n\n✅ تـم الـتـنـفـيذ بـنـجـاح`;

      // إرسال النتيجة مع تنظيف الذاكرة
      return api.sendMessage({
        body: messageBody,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        api.setMessageReaction("✅", messageID, () => {}, true);
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, messageID);

    } catch (error) {
      console.error('SD Error:', error.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      
      let errorMsg = "❌ فشل في معالجة الصورة: السيرفر مشغول حالياً.";
      if (error.code === 'ECONNABORTED') errorMsg = "⚠️ انتهت مهلة الطلب، السيرفر بطيء جداً.";
      
      return api.sendMessage(errorMsg, threadID, messageID);
    }
  },
};
