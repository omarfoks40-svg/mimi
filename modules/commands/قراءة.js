const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "قراءة",
    aliases: ["انمي", "عنوان", "ما_هذا"],
    version: "1.6.2",
    author: " & SINKO",
    countDown: 5,
    prefix: false,
    category: "media"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply } = event;
    const send = (msg) => api.sendMessage(msg, threadID, messageID);

    try {
      let imageUrl = (type === "message_reply" && messageReply.attachments[0]?.type === "photo") ? messageReply.attachments[0].url : (event.attachments[0]?.type === "photo" ? event.attachments[0].url : "");

      if (!imageUrl && args[0]) imageUrl = args[0];

      if (!imageUrl) return send("\n❏ يرجى الرد على صورة\n");

      api.setMessageReaction("🔍", messageID, () => {}, true);
      send("\n❏ جاري البحث عن عنوان الأنمي من الصورة... ⏳\n");

      // 1. جلب بيانات الصورة
      const resImg = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      
      // 2. البحث في Trace.moe
      const traceRes = await axios.post("https://api.trace.moe/search?anilistInfo", resImg.data, {
        headers: { "Content-Type": "image/jpeg" },
        params: { cutBorders: true }
      });

      const result = traceRes.data.result?.[0];
      if (!result) return send("🚫 | للأسف ما لقيت نتيجة للصورة دي، تأكد إنها من لقطة أنمي حقيقية ؛-؛");

      const anilistId = result.anilist?.id;
      let info = {
        romaji: "غير معروف",
        english: "غير معروف",
        native: "غير معروف",
        season: "غير معروف",
        year: "",
        genres: "غير معروف",
        cover: null
      };

      // 3. جلب تفاصيل الأنمي من AniList
      if (anilistId) {
        const query = `query ($id: Int) { Media(id: $id, type: ANIME) { title { romaji english native } season seasonYear genres coverImage { extraLarge } } }`;
        const aniRes = await axios.post("https://graphql.anilist.co", { query, variables: { id: anilistId } });
        const anime = aniRes.data.data.Media;

        const seasons = { "WINTER": "شتاء", "SPRING": "ربيع", "SUMMER": "صيف", "FALL": "خريف" };
        const genresMap = { "Comedy": "كوميديا", "Romance": "رومانسية", "Action": "أكشن", "Drama": "دراما", "Fantasy": "فانتازيا", "Sci-Fi": "خيال علمي", "Horror": "رعب", "Mystery": "غموض", "Adventure": "مغامرات" };

        info.romaji = anime.title.romaji || info.romaji;
        info.english = anime.title.english || info.english;
        info.native = anime.title.native || info.native;
        info.season = anime.season ? seasons[anime.season.toUpperCase()] || anime.season : info.season;
        info.year = anime.seasonYear || "";
        info.genres = anime.genres.map(g => genresMap[g] || g).join(" - ");
        info.cover = anime.coverImage.extraLarge;
      }

      const time = result.from ? Math.floor(result.from / 60) + ":" + (Math.floor(result.from % 60)).toString().padStart(2, '0') : "غير معروف";
      
      const replyMessage = `> ˼🎬˹↜ تـم الـتعرف بـنجاح ↶\n\n` +
        `❐ الاسم (Romaji): \n「 ${info.romaji} 」\n` +
        `❐ الاسم (EN): \n「 ${info.english} 」\n` +
        `❐ الاسم (الياباني): \n「 ${info.native} 」\n` +
        `❐ الموسم: 「 ${info.season} ${info.year} 」\n` +
        `❐ التصنيفات: 「 ${info.genres} 」\n` +
        `❐ الحلقة: 「 ${result.episode || "1"} 」\n` +
        `❐ الدقيقة: 「 ${time} 」\n\n` +
        `- المساعد العملاق موانا ؛-؛`;

      if (info.cover) {
        const imgPath = path.join(__dirname, 'cache', `poster_${anilistId}.jpg`);
        await fs.ensureDir(path.join(__dirname, 'cache'));
        const posterRes = await axios.get(info.cover, { responseType: "stream" });
        const writer = fs.createWriteStream(imgPath);
        posterRes.data.pipe(writer);

        writer.on("finish", async () => {
          await api.sendMessage({ body: replyMessage, attachment: fs.createReadStream(imgPath) }, threadID, () => fs.unlinkSync(imgPath), messageID);
          api.setMessageReaction("✔️", messageID, () => {}, true);
        });
      } else {
        send(replyMessage);
      }

    } catch (err) {
      console.error(err);
      send("❌ | حصل خطأ في البحث، جرب تاني يا ملك ؛-؛");
    }
  }
};
