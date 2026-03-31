const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('[APLIN-MELLO] sharp not available');
}

// ═══════════════════════════════════════════════════════════════════
//  📚 الإعدادات والترويسات
// ═══════════════════════════════════════════════════════════════════

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-A235F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.154 Mobile Safari/537.36',
  'Accept': 'application/json',
  'device-uuid': crypto.randomBytes(8).toString('hex'),
  'app-version': '2.0.9',
  'x-requested-with': 'com.wael.mangamello'
};

// ─── دوال المساعدة التقنية ───────────────────────────────────────────────

async function getLatestUpdates(page = 1, perPage = 5) {
  const url = `https://api.mangamello.com/v1/mangas?page=${page}&per_page=${perPage}&sort_by=last_update&dir=desc&relations=genres`;
  const { data } = await axios.get(url, { headers: BASE_HEADERS, timeout: 15000 });
  return data.data || [];
}

async function searchManga(query, page = 1, perPage = 5) {
  const url = `https://api.mangamello.com/v1/mangas/search?per_page=${perPage}&page=${page}&relations=genres,type,ageRate&sort_by=last_update&dir=desc&title=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers: BASE_HEADERS, timeout: 15000 });
  return data.data || [];
}

async function getMangaDetails(mangaId) {
  const url = `https://api.mangamello.com/v1/mangas/${mangaId}?relations=genres,chapters&rate=false`;
  const response = await axios.get(url, { headers: BASE_HEADERS, timeout: 15000 });
  return response.data.data || response.data;
}

async function downloadFile(url, filePath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: BASE_HEADERS
  });
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

function getAplinTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
  return now.toLocaleDateString('ar-EG', options).split('،');
}

// ═══════════════════════════════════════════════════════════════════
//  📦 الكوماند الرئيسي (Aplin Style)
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  config: {
    name: "انميات",
    version: "2.1.0",
    author: "Sinko",
    countDown: 10,
    role: 0,
    category: "الوسئط",
    prefix: true
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const timeData = getAplinTime();

    try {
      if (!args[0]) {
        api.setMessageReaction("⏰", messageID, () => {}, true);
        const mangas = await getLatestUpdates(1, 6);
        
        let msg = `> ˼📚˹↜ آخـر الـتـحديثـات ↶\n`;
        msg += `╮──────────────⟢ـ\n`;
        mangas.forEach((m, i) => {
          msg += `┆˼${i + 1}˹┊ ${m.title}\n`;
        });
        msg += `╯──────────────⟢ـ\n`;
        msg += `> ˼🌌˹↜ اكتب الرقم للتفاصيل ↶`;

        const sent = await api.sendMessage(msg, threadID, messageID);
        global.GoatBot.onReply.set(sent.messageID, {
          commandName: "انميات",
          author: senderID,
          type: "list",
          mangas
        });
        return;
      }

      // البحث
      const query = args.join(" ");
      api.setMessageReaction("⏳", messageID, () => {}, true);
      const results = await searchManga(query);

      if (results.length === 0) return api.sendMessage("❌ لم يتم العثور على نتائج.", threadID, messageID);

      let msg = `> ˼🔎˹↜ نـتـائـج الـبـحـث ↶\n`;
      msg += `╮──────────────⟢ـ\n`;
      results.forEach((m, i) => {
        msg += `┆˼${i + 1}˹┊ ${m.title}\n`;
      });
      msg += `╯──────────────⟢ـ\n`;
      msg += `> ˼🌌˹↜ اختر الرقم المطلوب ↶`;

      const sent = await api.sendMessage(msg, threadID, messageID);
      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "انميات",
        author: senderID,
        type: "list",
        mangas: results
      });

    } catch (e) {
      api.sendMessage(`❌ خطأ: ${e.message}`, threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, body, senderID } = event;
    if (senderID != Reply.author) return;

    try {
      // اختيار مانجا من القائمة
      if (Reply.type === "list") {
        const index = parseInt(body) - 1;
        if (isNaN(index) || !Reply.mangas[index]) return;

        api.setMessageReaction("⏳", messageID, () => {}, true);
        const data = await getMangaDetails(Reply.mangas[index].id);
        const timeData = getAplinTime();

        let msg = `> ˼📖˹↜ تـفـاصـيـل الـمـانـجـا ↶\n`;
        msg += `╮──────────────⟢ـ\n`;
        msg += `┆˼🧭˹┊ الـعنوان ↜｢ ${data.title} ｣\n`;
        msg += `┆˼⚕️˹┊ الـفصول ↜｢ ${data.chapters?.length || 0} ｣\n`;
        msg += `┆˼🌁˹┊ الـتقييم ↜｢ ${data.rate || '8.5'} ｣\n`;
        msg += `┆˼🕕˹┊ الـحالة ↜｢ ${data.status || 'مستمر'} ｣\n`;
        msg += `╯──────────────⟢ـ\n`;
        msg += `> ˼📚˹↜ رد برقم الفصل للقراءة ↶`;

        const sent = await api.sendMessage(msg, threadID, messageID);
        global.GoatBot.onReply.set(sent.messageID, {
          commandName: "ميلو",
          author: senderID,
          type: "chapters",
          mangaId: data.id,
          chapters: data.chapters
        });
      }

      // اختيار فصل
      if (Reply.type === "chapters") {
        const chNum = parseFloat(body);
        const chapter = Reply.chapters.find(c => parseFloat(c.number || c.chapter_number) === chNum);

        if (!chapter) return api.sendMessage("❌ الفصل غير موجود.", threadID, messageID);

        api.setMessageReaction("📥", messageID, () => {}, true);
        const url = `https://api.mangamello.com/v1/mangas/${Reply.mangaId}/chapters/${chapter.id}?relations=chapterImages`;
        const res = await axios.get(url, { headers: BASE_HEADERS });
        const images = res.data.data?.chapterImages || [];

        if (images.length === 0) return api.sendMessage("❌ لا توجد صور متاحة لهذا الفصل.", threadID, messageID);

        api.sendMessage(`⏳ جاري تحميل ${images.length} صورة...`, threadID);

        // إرسال الصور في مجموعات (Batch)
        for (let i = 0; i < images.length; i += 10) {
          const batch = images.slice(i, i + 10);
          const streams = [];
          
          for (const img of batch) {
            const p = path.join(__dirname, 'cache', `${crypto.randomBytes(4).toString('hex')}.jpg`);
            await downloadFile(img.image || img.url, p);
            streams.push(fs.createReadStream(p).on('end', () => fs.unlinkSync(p)));
          }

          await api.sendMessage({
            body: `📖 الفصل ${chNum} - الجزء ${Math.floor(i/10) + 1}`,
            attachment: streams
          }, threadID);
        }
        api.setMessageReaction("✅", messageID, () => {}, true);
      }

    } catch (e) {
      api.sendMessage(`❌ حدث خطأ أثناء المعالجة.`, threadID, messageID);
    }
  }
};
