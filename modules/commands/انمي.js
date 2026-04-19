const axios = require('axios');

module.exports = {
  config: {
    name: 'انمي',
    version: '2.5',
    author: 'SINKO',
    countDown: 5,
    hasPermssion: 0,
    category: 'media',
    description: 'البحث عن الأنمي مع ترجمة القصة واقتراح أعمال مشابهة',
    guide: { ar: '{pn} [اسم الانمي]' }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    
    if (!query) return api.sendMessage("\n\n\n\n✾ أكتب اسم الأنمي للبحث ", threadID, messageID);

    try {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      
      const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
      const data = res.data.data[0];

      if (!data) return api.sendMessage("⏣ ❌ | يا ملك، لم يتم العثور على هذا الأنمي!", threadID, messageID);

      // --- منطق الترجمة الخاص بك ---
      let arStory = "لا يوجد وصف حالياً.";
      if (data.synopsis) {
        try {
          const transRes = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(data.synopsis)}`);
          arStory = "";
          transRes.data[0].forEach(item => { if (item[0]) arStory += item[0]; });
        } catch (err) {
          arStory = data.synopsis; 
        }
      }

      const msg = 
`⏣────── ✾ ⌬ ✾ ──────⏣
✾ ┇
✾ ┇ ⏣ ⟬ مـعـلـومـات الأنـمـي ⟭
✾ ┇ ◍ الإسـم: ${data.title_english || data.title}
✾ ┇ ◍ الـتقييم: ⭐ ${data.score || 'N/A'}
✾ ┇ ◍ الـحلقات: 📺 ${data.episodes || '؟'}
✾ ┇ ◍ الـحالة: ${data.status}
✾ ┇ ◍ الـموسم: ${data.season || 'غير معروف'}
✾ ┇ ⸻⸻⸻⸻⸻
✾ ┇ ◍ الـقصة: 
✾ ┇ ${arStory.split('\n').join('\n✾ ┇ ')}
✾ ┇
✾ ┇ ⸻⸻⸻⸻⸻
✾ ┇ 💡 رد بـكلمة (المزيد) 
⏣────── ✾ ⌬ ✾ ──────⏣`;

      const img = (await axios.get(data.images.jpg.large_image_url, { responseType: "stream" })).data;
      api.setMessageReaction("✔️", messageID, () => {}, true);

      return api.sendMessage({ body: msg, attachment: img }, threadID, (err, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          animeID: data.mal_id,
          animeTitle: data.title
        });
      }, messageID);

    } catch (e) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("⏣ ❌ حدث خطأ في البحث أو الترجمة", threadID, messageID);
    }
  },

  handleReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, body } = event;
    if (event.senderID !== handleReply.author) return;

    if (body.toLowerCase() === "المزيد" || body === "مشابه") {
      try {
        const res = await axios.get(`https://api.jikan.moe/v4/anime/${handleReply.animeID}/recommendations`);
        const recommendations = res.data.data.slice(0, 5);

        if (recommendations.length === 0) return api.sendMessage("⏣ 😔 لم أجد اقتراحات مشابهة حالياً.", threadID, messageID);

        let recMsg = `⏣────── ✾ ⌬ ✾ ──────⏣\n✾ ┇ ⟬ أنـمـيات مـشابهـة ⟭\n✾ ┇\n`;
        recommendations.forEach((item, index) => { 
            recMsg += `✾ ┇ ${index + 1}. ${item.entry.title}\n`; 
        });
        recMsg += `✾ ┇\n⏣────── ✾ ⌬ ✾ ──────⏣`;

        return api.sendMessage(recMsg, threadID, messageID);
      } catch (err) {
        api.sendMessage("⏣ ❌ فشل جلب الاقتراحات.", threadID, messageID);
      }
    }
  }
};
