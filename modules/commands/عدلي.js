const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['بندلين', 'بنتي'],
    version: '4.5.0',
    author: 'SINKO',
    description: 'تعديل الصور بالذكاء الاصطناعي مع رسالة انتظار وزخرفة',
    countDown: 8,
    prefix: true,
    category: 'ai',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const prompt = args.join(" ");

    if (!prompt) {
      return api.sendMessage('❌ يرجى كتابة وصف للتعديل يا ملك.', threadID, messageID);
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

    // التفاعل الأولي بالانتظار
    api.setMessageReaction("⌛", messageID, (err) => {}, true);

    // رسالة الانتظار لحماية البوت من الموت في راندر
    const waitMsg = `> ˼🌌˹↜  Aplin  ↶\nجاري تعديل `;
    
    api.sendMessage(waitMsg, threadID, async (err, info) => {
      const cachePath = path.join(__dirname, "cache", `sd_${crypto.randomBytes(4).toString('hex')}.png`);

      try {
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

        // جلب الوقت والتاريخ عند الاكتمال
        const timeNow = moment.tz("Africa/Khartoum");
        const dateStr = timeNow.format("DD MMMM YYYY");
        const dayStr = timeNow.locale('ar').format("dddd");
        const timeStr = timeNow.format("hh:mm A");

        // الرسالة المزخرفة النهائية
        const successBody = `> ˼⏰˹↜ الـتـوقـيـت ↶
╮──────────────⟢ـ
┆˼🧭˹┊ ↜｢ ${dateStr} ｣
┆˼⚕️˹┊ الوصف ↜｢ ${prompt} ｣
┆˼🌁˹┊ الـيـوم ↜｢ ${dayStr} ｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
╯──────────────⟢ـ
> ˼🌌˹↜  aplin ↶`;

        await api.sendMessage({
          body: successBody,
          attachment: fs.createReadStream(cachePath)
        }, threadID, () => {
          if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
          api.setMessageReaction("✅", messageID, () => {}, true);
          // حذف رسالة "جاري التعديل" بعد النجاح
          if (info) api.unsendMessage(info.messageID);
        }, messageID);

      } catch (error) {
        console.error('SD Error:', error.message);
        if (fs.existsSync(cachePath)) fs.removeSync(cachePath);
        api.sendMessage('⚠️ السيرفر مضغوط أو الصورة كبيرة، جرب تاني يا ملك.', threadID, messageID);
        api.setMessageReaction("❌", messageID, () => {}, true);
        if (info) api.unsendMessage(info.messageID);
      }
    }, messageID);
  },
};
