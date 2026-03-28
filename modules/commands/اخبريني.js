const axios = require('axios');
const fs =onstuire('fs-extra');
const path = require('path');

module.exports.config = {
  name: "اخبريني",
  version: "1.5.0",
  hasPermssion: 0,
  credits: "SINKO",
  description: "تحديد اسم الأنمي من صورة مع البوستر والقصة",
  commandCategory: "ai",
  usages: "[رد على صورة أنمي]",
  cooldowns: 10
};

// ─── الترجمات المدمجة جوه الأمر ───
const seasonMap = { "WINTER": "شتاء", "SPRING": "ربيع", "SUMMER": "صيف", "FALL": "خريف" };
const statusMap = { "FINISHED": "مكتمل", "RELEASING": "قيد العرض", "NOT_YET_RELEASED": "لم يتم عرضه بعد", "CANCELLED": "ملغي", "HIATUS": "متوقف مؤقتاً" };

// دالة تنظيف النص والترجمة السريعة
async function translate(text) {
  if (!text || text === "N/A") return "غير متوفر";
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`);
    return res.data?.[0]?.[0]?.[0] || text;
  } catch { return text; }
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, messageReply, type } = event;
  
  // الزخرفة الهندسية الموحدة لبوتك 🕸️
  const head = "⌬ ────── ⟨ EPLIN ⟩ ────── ⌬\n\n";
  const foot = "\n\n⌬ ──────────────────── ⌬";

  let imageUrl = (type === "message_reply" && messageReply.attachments?.[0]?.url) || (event.attachments?.[0]?.url);

  if (!imageUrl) {
    return api.sendMessage(`${head} يرجى الرد على "صورة أنمي" عشان أقدر أحللها ليك!${foot}`, threadID, messageID);
  }

  try {
    api.setMessageReaction("⏳", messageID, () => {}, true);
    api.sendMessage(`${head}${foot}`, threadID, messageID);

    // 1. البحث عبر محرك trace.moe
    const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const traceRes = await axios.post("https://api.trace.moe/search?anilistInfo", imageRes.data, { 
      headers: { "Content-Type": "image/jpeg" }, 
      params: { cutBorders: true } 
    });

    const result = traceRes.data.result?.[0];
    if (!result) return api.sendMessage(`${head}❌ للأسف ما لقيت أنمي يشبه الصورة دي.${foot}`, threadID, messageID);

    const aniId = result.anilist?.id;
    let info = {
      title: result.anilist.title.romaji,
      native: result.anilist.title.native,
      desc: "جاري التحميل...",
      season: "غير معروف",
      episodes: result.anilist.episodes || "؟",
      status: "غير معروف",
      score: "؟",
      cover: ""
    };

    // 2. جلب معلومات إضافية من AniList
    const query = `query ($id: Int) { Media(id: $id, type: ANIME) { description season seasonYear episodes status averageScore coverImage { extraLarge } } }`;
    const aniRes = await axios.post("https://graphql.anilist.co", { query, variables: { id: aniId } });
    const anime = aniRes.data.data.Media;

    info.desc = await translate(anime.description?.replace(/<[^>]*>/g, '').substring(0, 300) + "...");
    info.season = anime.season ? `${seasonMap[anime.season] || anime.season} ${anime.seasonYear}` : "غير معروف";
    info.status = statusMap[anime.status] || anime.status;
    info.score = anime.averageScore ? `${anime.averageScore}/100` : "؟";
    info.cover = anime.coverImage.extraLarge;

    // 3. بناء الرسالة النهائية
    let msg = `${head}`;
    msg += ` الـعـنـوان: 『 ${info.title} 』\n`;
    msg += ` الأصـلي: 『 ${info.native} 』\n`;
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += ` الـقـصـة ⠐\n${info.desc}\n`;
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += ` الـمـعـلومـات ⠐\n`;
    msg += `│← الـمـوسـم: ${info.season}\n`;
    msg += `│← الـحـلقـات: ${info.episodes} | ${info.status}\n`;
    msg += `│← الـتـقـيـيـم: ⭐️ ${info.score}\n\n`;
    msg += ` تـفـاصـيـل الـلـقـطـة ⠐\n`;
    msg += `│← حلقة رقم: ${result.episode || "1"}\n`;
    msg += `│← التوقيت: ${Math.floor(result.from/60)}:${(Math.floor(result.from%60)).toString().padStart(2,'0')}\n`;
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += ` تـم الـبـحث بواسطة EPLIN${foot}`;

    // 4. إرسال البوستر مع المعلومات
    const imgPath = path.join(__dirname, 'cache', `ani_${Date.now()}.jpg`);
    await fs.ensureDir(path.join(__dirname, 'cache'));
    const imgStream = (await axios.get(info.cover, { responseType: "stream" })).data;
    const writer = fs.createWriteStream(imgPath);
    imgStream.pipe(writer);

    writer.on("finish", async () => {
      await api.sendMessage({ body: msg, attachment: fs.createReadStream(imgPath) }, threadID, messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);
      setTimeout(() => fs.unlinkSync(imgPath), 5000);
    });

  } catch (error) {
    console.error(error);
    api.sendMessage(`❌ حدث خطأ أثناء البحث، حاول مرة أخرى.`, threadID);
  }
};
