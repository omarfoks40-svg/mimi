const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: 'بنتراست',
    aliases: ['بنترست', 'صورة'],
    version: '2.7.0',
    author: 'SINKO',
    countDown: 5,
    prefix: true,
    category: 'media',
    description: '10 صور بنترست - نسخة إصلاح الاستجابة'
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍| أكتب اسم الصورة يا ملك!", threadID, messageID);

    const keySearch = query.includes('-') ? query.substr(0, query.indexOf('-')).trim() : query;
    // استدعاء الدالة مباشرة من الموديول
    return module.exports.sendImages(api, event, keySearch, 10, 0);
  },

  sendImages: async function (api, event, keySearch, limit, offset) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, 'tmp', `${Date.now()}`);

    try {
      const res = await axios.get(`https://pinterest-ashen.vercel.app/api?search=${encodeURIComponent(keySearch)}`);
      const data = res.data.data || [];
      if (data.length === 0) return api.sendMessage("⚠️ لم يتم العثور على صور.", threadID, messageID);

      const imagesToDownload = data.slice(offset, offset + limit);
      await fs.ensureDir(cacheDir);
      const imgData = [];

      for (let i = 0; i < imagesToDownload.length; i++) {
        try {
          const imgRes = await axios.get(imagesToDownload[i], { responseType: 'arraybuffer' });
          const imgPath = path.join(cacheDir, `${i}.jpg`);
          await fs.outputFile(imgPath, imgRes.data);
          imgData.push(fs.createReadStream(imgPath));
        } catch (e) { continue; }
      }

      const bodyMsg = `●─────── ⌬ ───────●\n┇ ⦿ ⟬ بـنـتـراسـت ⟭\n┇\n┇ الـبـحث: ${keySearch}\n┇ الـعدد: ${imgData.length}\n┇\n┇ 💡 رد بـ "مزيد" أو تـفـاعـل بـ ❤️\n●─────── ⌬ ───────●`;

      return api.sendMessage({ body: bodyMsg, attachment: imgData }, threadID, (err, info) => {
        fs.remove(cacheDir);
        if (global.client) {
            const dataObj = {
                name: "بنتراست", // تأكد من مطابقة الاسم هنا
                messageID: info.messageID,
                author: senderID,
                keySearch: keySearch,
                offset: offset + 10
            };
            global.client.handleReply.push(dataObj);
            global.client.handleReaction.push(dataObj);
        }
      }, messageID);

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ فشل السيرفر في جلب الصور.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { body, threadID, messageID, senderID } = event;
    if (handleReply.author != senderID) return;

    if (body.toLowerCase() === "مزيد" || body === "المزيد" || body === "مزيد") {
      // تغيير الاستدعاء من this إلى module.exports
      return module.exports.sendImages(api, event, handleReply.keySearch, 10, handleReply.offset);
    }
  },

  onReaction: async function ({ api, event, handleReaction }) {
    const { reaction, userID, threadID, messageID } = event;
    if (userID != handleReaction.author) return;
    if (reaction === "❤") {
      // تغيير الاستدعاء من this إلى module.exports
      return module.exports.sendImages(api, event, handleReaction.keySearch, 10, handleReaction.offset);
    }
  }
};
