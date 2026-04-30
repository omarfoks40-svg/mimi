const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: 'بنتراست',
    aliases: ['بنترست', 'صورة'],
    version: '2.8.0',
    author: 'SINKO',
    countDown: 5,
    prefix: true,
    category: 'media',
    description: '10 صور بنترست - مع إصلاح التفاعل'
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍| أكتب اسم الصورة يا ملك! ؛-؛", threadID, messageID);

    const keySearch = query.includes('-') ? query.substr(0, query.indexOf('-')).trim() : query;
    return module.exports.sendImages(api, event, keySearch, 10, 0);
  },

  sendImages: async function (api, event, keySearch, limit, offset) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, 'tmp', `${Date.now()}`);

    try {
      const res = await axios.get(`https://pinterest-ashen.vercel.app/api?search=${encodeURIComponent(keySearch)}`);
      const data = res.data.data || [];
      if (data.length === 0) return api.sendMessage("⚠️ ما لقيت صور للأسف ؛-؛", threadID, messageID);

      const imagesToDownload = data.slice(offset, offset + limit);
      if (imagesToDownload.length === 0) return api.sendMessage("⚠️ دي أخر صور لقيتها ؛-؛", threadID, messageID);

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

      const bodyMsg = `●─────── ⌬ ───────●\n┇ ⦿ ⟬ بـنـتـراسـت ⟭\n┇\n┇ الـبـحث: ${keySearch}\n┇ الـعدد: ${imgData.length}\n┇\n┇ 💡 تفاعل بـ ❤️ أو رد بـ "مزيد" ؛-؛\n●─────── ⌬ ───────●`;

      return api.sendMessage({ body: bodyMsg, attachment: imgData }, threadID, (err, info) => {
        // حذف الكاش بعد الإرسال
        setTimeout(() => fs.remove(cacheDir), 5000); 

        if (!err && global.client) {
            const dataObj = {
                name: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
                keySearch: keySearch,
                offset: offset + limit
            };
            global.client.handleReply.push(dataObj);
            global.client.handleReaction.push(dataObj);
        }
      }, messageID);

    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ السيرفر واقع حالياً، جرب شوية كدا ؛-؛", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { body, threadID, messageID, senderID } = event;
    if (handleReply.author != senderID) return;

    if (body.toLowerCase().includes("مزيد")) {
      return module.exports.sendImages(api, event, handleReply.keySearch, 10, handleReply.offset);
    }
  },

  onReaction: async function ({ api, event, handleReaction }) {
    const { reaction, userID, threadID, messageID } = event;
    if (userID != handleReaction.author) return;

    // ميزة التفاعل: يقبل القلب الأحمر أو القلب المتوهج
    if (reaction === "❤" || reaction === "❤️" || reaction === "🦧") {
      api.unsendMessage(handleReaction.messageID); // حذف القديمة عشان الزحمة
      return module.exports.sendImages(api, event, handleReaction.keySearch, 10, handleReaction.offset);
    }
  }
};
