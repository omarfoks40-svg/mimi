const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

// مفاتيح Groq عشان الذكاء يشرح القصة بالتفصيل
const GROQ_KEYS = [
  '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',
  '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',
  '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'
];

module.exports = {
  config: {
    name: "مانجا",
    aliases: ["manga", "مانغا", "انمي"],
    version: "8.0.0",
    author: "Sinko",
    countDown: 10,
    role: 0,
    category: "media",
    guide: "{pn} [اسم المانجا/الأنمي]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");

    api.setMessageReaction("⏳", messageID, () => {}, true);

    // لو ما كتب اسم، نجيب اقتراح عشوائي
    if (!query) return this.getManga(api, event, null, senderID);

    return this.getManga(api, event, query, senderID);
  },

  getManga: async function (api, event, query, senderID) {
    const { threadID, messageID } = event;
    try {
      let graphqlQuery;
      if (query) {
        graphqlQuery = {
          query: `query ($search: String) { Media(search: $search) { id title { romaji native } type episodes chapters status averageScore coverImage { extraLarge } bannerImage characters(perPage: 8) { nodes { image { large } } } } }`,
          variables: { search: query }
        };
      } else {
        // اقتراح عشوائي
        const page = Math.floor(Math.random() * 100) + 1;
        graphqlQuery = {
          query: `query ($page: Int) { Page(page: $page, perPage: 1) { media(sort: POPULARITY_DESC) { id title { romaji native } type episodes chapters status averageScore coverImage { extraLarge } bannerImage characters(perPage: 8) { nodes { image { large } } } } } }`,
          variables: { page }
        };
      }

      const { data } = await axios.post("https://graphql.anilist.co", graphqlQuery);
      const media = query ? data.data.Media : data.data.Page.media[0];

      if (!media) return api.sendMessage("ما لقيت شي ؛-؛", threadID, messageID);

      // تجميع الـ 10 صور
      const imageUrls = [media.coverImage.extraLarge, media.bannerImage, ...media.characters.nodes.map(c => c.image.large)].filter(Boolean).slice(0, 10);
      const attachments = [];
      for (const url of imageUrls) {
        try { const res = await axios.get(url, { responseType: "stream" }); attachments.push(res.data); } catch (e) {}
      }

      // --- استخدام الذكاء الاصطناعي للشرح بالتفصيل الممل ---
      const aiStory = await this.askAI(`اشرح لي قصة ${media.type === 'MANGA' ? 'مانجا' : 'أنمي'} ${media.title.romaji} بالتفصيل الممل جداً وباللغة العربية العامية السودانية الرزينة، وركز على الشخصيات والأحداث الأساسية ؛-؛`);

      const body = `✅ تم العثور على الـ ${media.type === 'MANGA' ? 'مانجا' : 'أنمي'}:\n\n` +
                   `📝 الاسم: ${media.title.romaji}\n` +
                   `⭐ التقييم: ${media.averageScore || "N/A"}/100\n` +
                   `🔢 ${media.type === 'MANGA' ? 'الفصول: ' + (media.chapters || '؟') : 'الحلقات: ' + (media.episodes || '؟')}\n\n` +
                   `📖 الشرح التفصيلي (بواسطة إبلين):\n${aiStory}\n\n` +
                   `🍿 فيديو | 🙂 أجزاء | 🦧 اقتراح آخر ؛-؛`;

      const callback = (err, info) => {
        if (!err) {
          if (!global.client.handleReaction) global.client.handleReaction = [];
          global.client.handleReaction.push({
            name: this.config.name,
            messageID: info.messageID,
            author: senderID,
            query: media.title.romaji,
            mangaID: media.id
          });
        }
      };

      return api.sendMessage({ body, attachment: attachments }, threadID, callback, messageID);
    } catch (e) { return api.sendMessage("الشبكة كعبة، جرب تاني ؛-؛", threadID, messageID); }
  },

  askAI: async function (prompt) {
    try {
      const key = GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      }, { headers: { "Authorization": `Bearer ${key}` } });
      return res.data.choices[0].message.content.trim();
    } catch (e) { return "فشل الذكاء في الشرح، بس الأنمي ده رهيب شديد ؛-؛"; }
  },

  onReaction: async function ({ api, event, reaction, handler }) {
    const { threadID, messageID, userID } = event;
    if (userID !== handler.author) return;

    // الميزة الجديدة: ❤️ لاقتراح أنمي عشوائي آخر
    if (reaction === "🦧") {
      api.unsendMessage(handler.messageID); // مسح القديم عشان الزحمة
      return this.getManga(api, event, null, userID);
    }

    if (reaction === "🍿") {
      api.setMessageReaction("🎬", messageID, () => {}, true);
      try {
        const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(handler.query + " anime edit")}`);
        const videoUrl = res.data.data.videos[0].play;
        const finalUrl = videoUrl.startsWith('http') ? videoUrl : `https://www.tikwm.com${videoUrl}`;
        const cachePath = path.join(process.cwd(), 'cache', `${crypto.randomBytes(3).toString('hex')}.mp4`);
        const response = await axios({ url: finalUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(cachePath);
        response.data.pipe(writer);
        writer.on('finish', () => {
          api.sendMessage({ body: `🎬 فيديو لـ: ${handler.query} ؛-؛`, attachment: fs.createReadStream(cachePath) }, threadID, () => fs.removeSync(cachePath), messageID);
        });
      } catch (e) { api.sendMessage("فشل جلب الفيديو ؛-؛", threadID); }
    }

    if (reaction === "🙂") {
      try {
        const res = await axios.post("https://graphql.anilist.co", {
          query: `query ($id: Int) { Media(id: $id) { relations { nodes { title { romaji } type status } } } }`,
          variables: { id: handler.mangaID }
        });
        const relations = res.data.data.Media.relations.nodes.map(r => `• ${r.title.romaji} (${r.type})`).join("\n");
        api.sendMessage(`🧐 الأجزاء المرتبطة:\n\n${relations}\n\n؛-؛`, threadID, messageID);
      } catch (e) { api.sendMessage("ما لقيت أجزاء تانية ؛-؛", threadID); }
    }
  }
};
