const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const seasonMap = { "WINTER": "شتاء", "SPRING": "ربيع", "SUMMER": "صيف", "FALL": "خريف" };
const statusMap = { "FINISHED": "مكتمل", "RELEASING": "قيد العرض", "NOT_YET_RELEASED": "لم يتم عرضه بعد", "CANCELLED": "ملغي", "HIATUS": "متوقف مؤقتاً" };

async function translate(text) {
  if (!text || text === "N/A") return "غير متوفر";
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`);
    return res.data?.[0]?.[0]?.[0] || text;
  } catch { return text; }
}

module.exports = {
  config: {
    name: "اخبريني",
    version: "1.0.0",
    author: "SINKO",
    countDown: 10,
    role: 0,
    category: "بحث"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, type } = event;
    let imageUrl = (type === "message_reply" && messageReply.attachments?.[0]?.url) || (event.attachments?.[0]?.url);

    if (!imageUrl) return api.sendMessage("خطأ: يرجى الرد على صورة أنمي أولاً.", threadID, messageID);

    const cacheDir = path.join(__dirname, 'cache');
    const cachePath = path.join(cacheDir, `ani_${Date.now()}.jpg`);

    try {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const traceRes = await axios.post("https://api.trace.moe/search?anilistInfo", imageRes.data, { 
        headers: { "Content-Type": "image/jpeg" }, 
        params: { cutBorders: true } 
      });

      const result = traceRes.data.result?.[0];
      if (!result) return api.sendMessage("عذراً، لم يتم العثور على نتائج.", threadID, messageID);

      const aniId = result.anilist?.id;
      const query = `query ($id: Int) { Media(id: $id, type: ANIME) { description season seasonYear episodes status averageScore coverImage { extraLarge } } }`;
      const aniRes = await axios.post("https://graphql.anilist.co", { query, variables: { id: aniId } });
      const anime = aniRes.data.data.Media;

      const desc = await translate(anime.description?.replace(/<[^>]*>/g, '').substring(0, 300) + "...");
      const season = anime.season ? `${seasonMap[anime.season] || anime.season} ${anime.seasonYear}` : "غير معروف";

      let msg = `نتيجة البحث:\n\n` +
                `اسم الأنمي: ${result.anilist.title.romaji}\n` +
                `الاسم الأصلي: ${result.anilist.title.native}\n\n` +
                `القصة:\n${desc}\n\n` +
                `معلومات:\n` +
                `- الموسم: ${season}\n` +
                `- الحلقات: ${anime.episodes || "؟"} | ${statusMap[anime.status] || anime.status}\n` +
                `- التقييم: ${anime.averageScore || "؟"}/100\n\n` +
                `- لقطة من حلقة رقم: ${result.episode || "1"}`;

      await fs.ensureDir(cacheDir);
      const imgRes = await axios.get(anime.coverImage.extraLarge, { responseType: 'arraybuffer' });
      await fs.writeFile(cachePath, Buffer.from(imgRes.data));

      await api.sendMessage({ body: msg, attachment: fs.createReadStream(cachePath) }, threadID, messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (error) {
      api.sendMessage("حدث خطأ في معالجة الصورة.", threadID, messageID);
    } finally {
      setTimeout(() => { if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath); }, 7000);
    }
  }
};
