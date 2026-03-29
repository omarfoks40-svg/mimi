const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'بنبن'],
    version: '3.0.0',
    author: 'SINKO',
    description: 'توليد صور بنظام التمويه ضد الحظر',
    countDown: 10, // زيادة الكول داون مهمة جداً للحماية
    prefix: true,
    category: 'ai',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const developerID = "61588108307572"; 

    if (senderID !== developerID) {
      return api.setMessageReaction("🚯", messageID, (err) => {}, true);
    }

    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage('❌ يرجى كتابة وصف للصورة.', threadID, messageID);

    let imageUrl;
    if (event.type === "message_reply") {
      const attachment = event.messageReply.attachments[0];
      if (attachment && (attachment.type === "photo" || attachment.type === "image")) {
        imageUrl = attachment.url;
      }
    }

    if (!imageUrl) return api.sendMessage('❌ يرجى الرد على صورة لتعديلها.', threadID, messageID);

    // 1. التفاعل العشوائي للتمويه
    api.setMessageReaction("⏳", messageID, () => {}, true);

    const cachePath = path.join(__dirname, "cache", `sd_${crypto.randomBytes(4).toString('hex')}.png`);
    if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

    try {
      // 2. محاكاة "بشرية": انتظار بسيط قبل الطلب
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}`;

      // 3. استخدام User-Agent متغير لكل طلب لخدع الفيس
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
      ];

      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 120000,
        headers: { 'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)] }
      });

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const messageBody = `✨ نـتـيـجـة الـتـولـيـد ✨\n\n📝 الـوصـف : ${prompt}\n\n✅ تـم الـتـنـفـيذ بـنـجـاح`;

      // 4. إرسال الصورة مع "تأخير الرفع" لإيهام الفيس إنك مستخدم حقيقي
      setTimeout(async () => {
        await api.sendMessage({
          body: messageBody,
          attachment: fs.createReadStream(cachePath)
        }, threadID, () => {
          if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
          api.setMessageReaction("✅", messageID, () => {}, true);
        }, messageID);
      }, 2000);

    } catch (error) {
      console.error('SD Error:', error);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.sendMessage('❌ فشل في معالجة الصورة.', threadID, messageID);
    }
  },
};
