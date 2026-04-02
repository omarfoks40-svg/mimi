const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

// إعدادات الهيدرز لـ MangaMello
const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-A235F) Chrome/110.0.5481.154 Mobile Safari/537.36',
  'Accept': 'application/json',
  'device-uuid': 'f8cd7184b2037056',
  'app-version': '2.0.9',
  'x-requested-with': 'com.wael.mangamello'
};

module.exports = {
  config: {
    name: 'مانجا',
    aliases: ['مانجا', 'mello'],
    version: '2.0.0',
    author: 'SINKO',
    description: 'بحث وقراءة المانجا من MangaMello',
    countDown: 10,
    prefix: true,
    category: 'الوسئط',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");
    const cacheDir = path.join(__dirname, "cache");

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    // الحالة 1: عرض آخر التحديثات إذا لم يتم كتابة اسم مانجا
    if (!query) {
      api.setMessageReaction("📚", messageID, () => {}, true);
      const waitMsg = await api.sendMessage(`> ˼⏳˹↜ جـاري جـلب آخـر الـتـحديثات... ↶`, threadID);

      try {
        const res = await axios.get(`https://api.mangamello.com/v1/mangas?page=1&per_page=5&sort_by=last_update&dir=desc`, { headers: BASE_HEADERS });
        const mangas = res.data.data || [];
        
        let msg = `> ˼📖˹↜ آخـر تـحـديثات الـمانـجا ↶\n╮──────────────⟢ـ\n`;
        mangas.forEach((m, i) => {
          msg += `┆${i + 1}. ${m.title}\n`;
        });
        msg += `╯──────────────⟢ـ\n> 💡 رد برقم المانجا للتفاصيل`;

        await api.sendMessage(msg, threadID, (err, info) => {
          global.client.handleReply.push({
            name: 'ميلو',
            messageID: info.messageID,
            author: senderID,
            type: 'list',
            mangas: mangas
          });
          api.unsendMessage(waitMsg.messageID);
        }, messageID);
      } catch (e) {
        api.sendMessage("⚠️ فشل جلب التحديثات، جرب لاحقاً.", threadID, messageID);
      }
      return;
    }

    // الحالة 2: البحث عن مانجا معينة
    api.setMessageReaction("⏳", messageID, () => {}, true);
    try {
      const res = await axios.get(`https://api.mangamello.com/v1/mangas/search?title=${encodeURIComponent(query)}&per_page=5`, { headers: BASE_HEADERS });
      const results = res.data.data || [];

      if (results.length === 0) return api.sendMessage("❌ لم يتم العثور على نتائج لهذا البحث.", threadID, messageID);

      let msg = `> ˼🔍˹↜ نـتـائـج الـبـحث عـن: ${query} ↶\n╮──────────────⟢ـ\n`;
      results.forEach((m, i) => {
        msg += `┆${i + 1}. ${m.title}\n`;
      });
      msg += `╯──────────────⟢ـ\n> 📝 رد برقم المانجا لعرض الفصول`;

      api.sendMessage(msg, threadID, (err, info) => {
        global.client.handleReply.push({
          name: 'مانجا',
          messageID: info.messageID,
          author: senderID,
          type: 'list',
          mangas: results
        });
      }, messageID);
    } catch (e) {
      api.sendMessage("⚠️ حدث خطأ أثناء البحث.", threadID, messageID);
    }
  },

  onReply: async ({ api, event, handleReply }) => {
    const { threadID, messageID, body, senderID } = event;
    if (handleReply.author !== senderID) return;

    // المرحلة 1: اختيار المانجا لعرض التفاصيل والفصول
    if (handleReply.type === 'list') {
      const choice = parseInt(body);
      if (isNaN(choice) || choice < 1 || choice > handleReply.mangas.length) return;

      const manga = handleReply.mangas[choice - 1];
      api.unsendMessage(handleReply.messageID);

      try {
        const res = await axios.get(`https://api.mangamello.com/v1/mangas/${manga.id}?relations=chapters`, { headers: BASE_HEADERS });
        const details = res.data.data || res.data;
        const chapters = details.chapters || [];

        let msg = `> ˼📑˹↜ تـفـاصـيـل: ${details.title} ↶\n╮──────────────⟢ـ\n`;
        msg += `┆👁️ الـمشاهدات: ${details.views || 0}\n`;
        msg += `┆📊 الـتقييم: ${details.rate || 'N/A'}\n`;
        msg += `┆📚 عـدد الـفصول: ${chapters.length}\n`;
        msg += `╯──────────────⟢ـ\n> 📖 رد برقم الفصل لبدء القراءة`;

        api.sendMessage(msg, threadID, (err, info) => {
          global.client.handleReply.push({
            name: 'مانجا',
            messageID: info.messageID,
            author: senderID,
            type: 'chapters',
            mangaId: manga.id,
            mangaTitle: details.title,
            chapters: chapters
          });
        }, messageID);
      } catch (e) {
        api.sendMessage("⚠️ تعذر جلب تفاصيل المانجا.", threadID, messageID);
      }
    }

    // المرحلة 2: اختيار الفصل وتحميل الصور
    if (handleReply.type === 'chapters') {
      const chNum = parseInt(body);
      const chapter = handleReply.chapters.find(c => parseFloat(c.number || c.chapter_number) === chNum);

      if (!chapter) return api.sendMessage("⚠️ هذا الفصل غير موجود، اختر من الفصول المتاحة.", threadID, messageID);

      api.unsendMessage(handleReply.messageID);
      const waitMsg = await api.sendMessage(`> ˼📥˹↜ جـاري تـحميل الـفصل ${chNum}... ↶`, threadID);

      try {
        const res = await axios.get(`https://api.mangamello.com/v1/mangas/${handleReply.mangaId}/chapters/${chapter.id}?relations=chapterImages`, { headers: BASE_HEADERS });
        const images = res.data.data.chapterImages || [];
        
        if (images.length === 0) return api.sendMessage("❌ هذا الفصل لا يحتوي على صور.", threadID, messageID);

        // إرسال أول 10 صور لتجنب ضغط الرام في راندر
        const streams = [];
        const cacheDir = path.join(__dirname, "cache");

        for (let i = 0; i < Math.min(images.length, 10); i++) {
          const imgUrl = images[i].image || images[i].url;
          const imgPath = path.join(cacheDir, `mello_${Date.now()}_${i}.jpg`);
          const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', headers: { 'referer': 'https://app.mangamello.com/' } });
          fs.writeFileSync(imgPath, imgRes.data);
          streams.push(fs.createReadStream(imgPath));
        }

        api.sendMessage({
          body: `> ˼✅˹↜ تـم تـحميل ${Math.min(images.length, 10)} صـورة مـن الـفصل ${chNum}\n> 📖 مـانـجا: ${handleReply.mangaTitle}`,
          attachment: streams
        }, threadID, () => {
          api.unsendMessage(waitMsg.messageID);
          // تنظيف الكاش فوراً
          streams.forEach(s => { if (fs.existsSync(s.path)) fs.unlinkSync(s.path); });
        });

      } catch (e) {
        api.sendMessage("⚠️ حدث خطأ أثناء تحميل صور الفصل.", threadID, messageID);
      }
    }
  }
};
