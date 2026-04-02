const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ═══════════════════════════════════════════════════════════════════
// 📚 MangaMello API - النسخة المطورة (اسم الأمر: مانجا)
// ═══════════════════════════════════════════════════════════════════

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Origin': 'https://mangamello.com',
  'Referer': 'https://mangamello.com/',
  'device-uuid': 'f8cd7184b2037056',
  'app-version': '2.0.9',
  'x-requested-with': 'com.wael.mangamello'
};

module.exports = {
  config: {
    name: 'مانجا',
    aliases: ['ميلو', 'mello', 'manga'],
    version: '2.1.1',
    author: 'SINKO',
    description: 'بحث وقراءة المانجا من MangaMello',
    countDown: 10,
    prefix: true,
    category: 'entertainment'
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    if (!query) {
      api.setMessageReaction("📚", messageID, () => {}, true);
      const waitMsg = await api.sendMessage(`> ˼⏳˹↜ جـاري جـلب آخـر الـتـحديثات... ↶`, threadID);

      try {
        const res = await axios.get(`https://api.mangamello.com/v1/mangas?page=1&per_page=5&sort_by=last_update&dir=desc`, { headers: BASE_HEADERS, timeout: 10000 });
        const mangas = res.data.data || [];
        
        let msg = `> ˼📖˹↜ آخـر تـحـديثات الـمانـجا ↶\n╮──────────────⟢ـ\n`;
        mangas.forEach((m, i) => msg += `┆${i + 1}. ${m.title}\n`);
        msg += `╯──────────────⟢ـ\n> 💡 رد برقم المانجا للتفاصيل`;

        api.sendMessage(msg, threadID, (err, info) => {
          global.client.handleReply.push({
            name: 'مانجا',
            messageID: info.messageID,
            author: senderID,
            type: 'list',
            mangas: mangas
          });
          api.unsendMessage(waitMsg.messageID);
        }, messageID);
      } catch (e) {
        api.unsendMessage(waitMsg.messageID);
        api.sendMessage(`⚠️ عذراً، السيرفر رفض الطلب. حاول مجدداً لاحقاً.\n(Error: ${e.message})`, threadID, messageID);
      }
      return;
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);
    try {
      const res = await axios.get(`https://api.mangamello.com/v1/mangas/search?title=${encodeURIComponent(query)}&per_page=5`, { headers: BASE_HEADERS, timeout: 10000 });
      const results = res.data.data || [];

      if (results.length === 0) return api.sendMessage("❌ لم يتم العثور على نتائج.", threadID, messageID);

      let msg = `> ˼⏳˹↜ نـتـائـج الـبـحث: ${query} ↶\n╮──────────────⟢ـ\n`;
      results.forEach((m, i) => msg += `┆${i + 1}. ${m.title}\n`);
      msg += `╯──────────────⟢ـ\n> 📝 رد برقم المانجا`;

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
      api.sendMessage(`⚠️ حدث خطأ أثناء البحث: ${e.message}`, threadID, messageID);
    }
  },

  onReply: async ({ api, event, handleReply }) => {
    const { threadID, messageID, body, senderID } = event;
    if (handleReply.author !== senderID) return;

    if (handleReply.type === 'list') {
      const choice = parseInt(body);
      if (isNaN(choice) || choice < 1 || choice > handleReply.mangas.length) return;

      const manga = handleReply.mangas[choice - 1];
      api.unsendMessage(handleReply.messageID);

      try {
        const res = await axios.get(`https://api.mangamello.com/v1/mangas/${manga.id}?relations=chapters`, { headers: BASE_HEADERS });
        const details = res.data.data || res.data;
        const chapters = details.chapters || [];

        let msg = `> ˼📑˹↜ ${details.title} ↶\n╮──────────────⟢ـ\n`;
        msg += `┆👁️ الـمشاهدات: ${details.views || 0}\n`;
        msg += `┆📚 عـدد الـفصول: ${chapters.length}\n`;
        msg += `╯──────────────⟢ـ\n> 📖 رد برقم الفصل للقراءة`;

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
        api.sendMessage("⚠️ تعذر جلب الفصول.", threadID, messageID);
      }
    }

    if (handleReply.type === 'chapters') {
      const chNum = parseInt(body);
      const chapter = handleReply.chapters.find(c => parseFloat(c.number || c.chapter_number) === chNum);
      if (!chapter) return api.sendMessage("⚠️ الفصل غير موجود.", threadID, messageID);

      api.unsendMessage(handleReply.messageID);
      const waitMsg = await api.sendMessage(`> ˼📥˹↜ جـاري تـحميل الـفصل ${chNum}... ↶`, threadID);

      try {
        const res = await axios.get(`https://api.mangamello.com/v1/mangas/${handleReply.mangaId}/chapters/${chapter.id}?relations=chapterImages`, { headers: BASE_HEADERS });
        const images = res.data.data.chapterImages || [];
        
        if (images.length === 0) return api.sendMessage("❌ لا توجد صور في هذا الفصل.", threadID, messageID);

        const streams = [];
        const cacheDir = path.join(__dirname, "cache");

        for (let i = 0; i < Math.min(images.length, 9); i++) {
          const imgUrl = images[i].image || images[i].url;
          const imgPath = path.join(cacheDir, `manga_${Date.now()}_${i}.jpg`);
          const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', headers: { 'Referer': 'https://mangamello.com/' } });
          fs.writeFileSync(imgPath, imgRes.data);
          streams.push(fs.createReadStream(imgPath));
        }

        api.sendMessage({
          body: `> ˼✅˹↜ تـم تـحميل أول 9 صـور\n> 📖 مـانـجا: ${handleReply.mangaTitle}`,
          attachment: streams
        }, threadID, () => {
          api.unsendMessage(waitMsg.messageID);
          streams.forEach(s => { if (fs.existsSync(s.path)) fs.unlinkSync(s.path); });
        });
      } catch (e) {
        api.sendMessage("⚠️ فشل تحميل الصور.", threadID, messageID);
      }
    }
  }
};
