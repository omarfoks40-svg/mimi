const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

// مفاتيح GROQ حقتك (الـ 15 مفتاح)
const GROQ_KEYS = [
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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',
  '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'
];

// تعديل اللغة إلى الفصحى وتثبيت شخصية إبلين
const SYSTEM_PROMPT = `أنتِ "إبلين"، خبيرة متمكنة في عالم الأنمي والمانجا.
تحدثي باللغة العربية الفصحى الرصينة فقط. أسلوبكِ روائي، مشوق، ومفصل.
يجب أن تنتهي جميع ردودكِ بـ (؛-؛). أنتِ الآن تقدمين شرحاً أدبياً للمستخدم.`;

let keyIndex = 0;

module.exports = {
  config: {
    name: "مانجا",
    aliases: ["انمي", "ابلين_مانجا"],
    version: "21.0.0",
    author: "SINKO",
    countDown: 2,
    category: "media"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ").trim();
    api.setMessageReaction("🔍", messageID, () => {}, true);
    return this.getManga(api, event, query || null, senderID);
  },

  getManga: async function (api, event, query, senderID) {
    const { threadID, messageID } = event;
    try {
      let graphqlQuery;
      if (query) {
        graphqlQuery = {
          // رفع عدد الشخصيات المطلوبة لضمان وجود صور كافية
          query: `query ($search: String) { Media(search: $search) { id title { romaji native } type episodes chapters averageScore coverImage { extraLarge } bannerImage characters(perPage: 10) { nodes { image { large } } } } }`,
          variables: { search: query }
        };
      } else {
        const page = Math.floor(Math.random() * 100) + 1;
        graphqlQuery = {
          query: `query ($page: Int) { Page(page: $page, perPage: 1) { media(sort: POPULARITY_DESC) { id title { romaji native } type episodes chapters averageScore coverImage { extraLarge } bannerImage characters(perPage: 10) { nodes { image { large } } } } } }`,
          variables: { page }
        };
      }

      const { data } = await axios.post("https://graphql.anilist.co", graphqlQuery);
      const media = query ? data.data.Media : data.data.Page.media[0];
      if (!media) return api.sendMessage("عذراً، لم أجد ما تبحث عنه ؛-؛", threadID, messageID);

      // تجميع 10 صور بدلاً من 5
      const imageUrls = [media.coverImage.extraLarge, media.bannerImage, ...media.characters.nodes.map(c => c.image.large)].filter(Boolean).slice(0, 10);
      const attachments = [];
      for (const url of imageUrls) {
        try { const res = await axios.get(url, { responseType: "stream" }); attachments.push(res.data); } catch (e) {}
      }

      // طلب الشرح بالفصحى من إبلين
      const aiStory = await this.askEplin(`اكتبي لي قصة ${media.title.romaji} بأسلوب أدبي رفيع وباللغة العربية الفصحى ؛-؛`);

      const body = `╭───〔 𓆩 ⌬ ${media.title.romaji} 𓆪 〕───╮\n` +
                   `┃ ⭐ التقييم: ${media.averageScore || "N/A"}/100\n` +
                   `┃ 📝 النوع: ${media.type}\n\n` +
                   `┃ 📖 إبلين تسرد لك القصة:\n${aiStory}\n` +
                   `╰──────────────────╯\n` +
                   `🍿 فيديو | 🙂 أجزاء | 🦧 اقتراح آخر ؛-؛`;

      return api.sendMessage({ body, attachment: attachments }, threadID, (err, info) => {
        if (!err) {
          const handleObj = { name: this.config.name, messageID: info.messageID, author: senderID, query: media.title.romaji, mangaID: media.id };
          if (!global.client.handleReaction) global.client.handleReaction = [];
          if (!global.client.handleReply) global.client.handleReply = [];
          global.client.handleReaction.push(handleObj);
          global.client.handleReply.push(handleObj);
        }
      }, messageID);
    } catch (e) { return api.sendMessage("تعذر الاتصال بالخادم حالياً، يرجى المحاولة لاحقاً ؛-؛", threadID, messageID); }
  },

  onReply: async function ({ api, event, handleReply }) {
    if (event.senderID !== handleReply.author) return;
    const { body, threadID, messageID } = event;
    const types = { "1": " action", "2": " romance", "3": " funny", "4": " sad" };

    if (types[body]) {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      try {
        const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(handleReply.query + types[body] + " anime edit")}`);
        const videoUrl = res.data.data.videos[0].play;
        const cachePath = path.resolve(__dirname, 'cache', `${Date.now()}.mp4`);
        const response = await axios({ url: videoUrl, method: 'GET', responseType: 'stream' });
        response.data.pipe(fs.createWriteStream(cachePath)).on('finish', () => {
          api.sendMessage({ body: `✅ طلبك جاهز أيها الراقي ؛-؛`, attachment: fs.createReadStream(cachePath) }, threadID, () => fs.unlinkSync(cachePath), messageID);
        });
      } catch (e) { api.sendMessage("حدث خطأ أثناء تحميل المقطع ؛-؛", threadID); }
      return;
    }

    const replyText = await this.askEplin(`المستخدم رداً على ${handleReply.query} قال: ${body}. أجيبي بالفصحى ؛-؛`);
    const currentMode = global.ابلين_mode?.[threadID] || "text_only";

    if (currentMode === "voice_only") {
      return this.handleVoice(api, event, replyText);
    } else {
      return api.sendMessage(replyText, threadID, (err, info) => {
        if (!err) global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, query: handleReply.query });
      }, messageID);
    }
  },

  onReaction: async function ({ api, event, reaction, handler }) {
    if (event.userID !== handler.author) return;
    const { threadID, messageID } = event;

    if (reaction === "🍿") {
      api.setMessageReaction("🎬", messageID, () => {}, true);
      try {
        const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(handler.query + " anime edit")}`);
        const videos = res.data.data.videos.slice(0, 10); // زيادة عدد المعاينات لتناسب الـ 10 صور
        const attachments = [];
        for (const v of videos) {
          const img = await axios.get(v.cover, { responseType: "stream" });
          attachments.push(img.data);
        }
        const msg = `🎬 معاينات تيك توك لـ ${handler.query}:\n\n1 ↜ قتال وحماس ⚔️\n2 ↜ رومانسية ❤️\n3 ↜ كوميديا 😂\n4 ↜ دراما 💔\n\nأرسل الرقم للتحميل ؛-؛`;
        return api.sendMessage({ body: msg, attachment: attachments }, threadID, (err, info) => {
          global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.userID, query: handler.query });
        }, messageID);
      } catch (e) { api.sendMessage("تعذر جلب البيانات حالياً ؛-؛", threadID); }
    }
    
    if (reaction === "🦧") {
      api.unsendMessage(handler.messageID);
      return this.getManga(api, event, null, event.userID);
    }
  },

  askEplin: async function (prompt) {
    try {
      const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
      keyIndex++;
      const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
        max_tokens: 800, // زيادة التوكنز لضمان شرح طويل بالفصحى
        temperature: 0.6
      }, { headers: { "Authorization": `Bearer ${key}` } });
      let text = res.data.choices[0].message.content.trim();
      return text.endsWith("؛-؛") ? text : text + " ؛-؛";
    } catch (e) { return "عذراً، الخادم لا يستجيب حالياً ؛-؛"; }
  },

  handleVoice: async function (api, event, text) {
    const pathAudio = path.resolve(__dirname, 'cache', `${event.messageID}.mp3`);
    try {
      const { data } = await axios.get(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`, { responseType: "arraybuffer" });
      fs.writeFileSync(pathAudio, Buffer.from(data, "utf-8"));
      return api.sendMessage({ attachment: fs.createReadStream(pathAudio) }, event.threadID, () => fs.unlinkSync(pathAudio), event.messageID);
    } catch (e) { return api.sendMessage(text, event.threadID, event.messageID); }
  }
};
