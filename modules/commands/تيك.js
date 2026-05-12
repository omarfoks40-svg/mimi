const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "تيك",
    version: "1.0.6",
    author: "SINKO",
    countDown: 5,
    prefix: false,
    category: "الوسائط"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");
    
    if (!query) return api.sendMessage("╮──────────────⟢ـ\n┆˼⚠️˹┊ يـرجـى كـتـابـة كـلـمـة بـحـث\n╯──────────────⟢ـ", threadID, messageID);

    api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      const res = await axios.get(`https://azadx69x-tiktok-api.vercel.app/tiktok/search?query=${encodeURIComponent(query)}`);
      const data = res.data.list || [];
      
      if (data.length === 0) {
        return api.sendMessage("╮──────────────⟢ـ\n┆˼❌˹┊ لـم يـتـم الـعـثـور عـلـى نـتـائـج\n╯──────────────⟢ـ", threadID, messageID);
      }

      await sendPage(api, event, data, 1, query);

    } catch (err) {
      api.sendMessage("╮──────────────⟢ـ\n┆˼❌˹┊ حـدث خـطأ فـي الـسـيـرفـر\n╯──────────────⟢ـ", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, body, senderID } = event;
    if (senderID !== handleReply.author) return;

    const input = body.trim().toLowerCase();

    // إصلاح منطق التنقل بين الصفحات
    if (input === "التالي" || input === "next") {
      const nextPage = handleReply.page + 1;
      const maxPage = Math.ceil(handleReply.results.length / 12);
      if (nextPage > maxPage) return api.sendMessage("╮──────────────⟢ـ\n┆˼🔚˹┊ لا تـوجـد صـفـحـات أخـرى\n╯──────────────⟢ـ", threadID, messageID);
      
      api.unsendMessage(handleReply.messageID);
      return sendPage(api, event, handleReply.results, nextPage, handleReply.query);
    }

    const choice = parseInt(input);
    if (isNaN(choice) || choice < 1 || choice > 12) return;

    const index = (handleReply.page - 1) * 12 + (choice - 1);
    const selected = handleReply.results[index];
    if (!selected) return;

    api.unsendMessage(handleReply.messageID);
    api.setMessageReaction("📥", messageID, () => {}, true);

    // تأكد من وجود مجلد الكاش
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(cacheDir, `tt_${senderID}_${Date.now()}.mp4`);
    
    try {
      const videoUrl = selected.noWatermark || selected.play || selected.video;
      const videoRes = await axios.get(videoUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(filePath);
      videoRes.data.pipe(writer);

      writer.on('finish', () => {
        api.sendMessage({
          body: `> ˼✅˹↜ تـم الـقـنـص بـنـجـاح\n╮──────────────⟢ـ\n┆˼📝˹┊ الـعـنـوان ↶\n┆ « ${selected.title || "بدون عنوان"} »\n╯──────────────⟢ـ\n┊˼🪸˹┊ SINKO | ✅`,
          attachment: fs.createReadStream(filePath)
        }, threadID, () => fs.unlinkSync(filePath), messageID);
      });

    } catch (err) {
      api.sendMessage("╮──────────────⟢ـ\n┆˼❌˹┊ فـشـل تـحـمـيـل الـفـيـديـو\n╯──────────────⟢ـ", threadID, messageID);
    }
  }
};

async function sendPage(api, event, allResults, page, query) {
  const { threadID, messageID, senderID } = event;
  const start = (page - 1) * 12;
  const pageResults = allResults.slice(start, start + 12);

  let msg = `> ˼🎬˹↜ نـتـائـج تـكـتـوك ↶\n╮──────────────⟢ـ\n`;
  msg += `┆˼🔍˹┊ الـبـحـث ↜｢ ${query} ｣\n`;
  msg += `┆˼📄˹┊ الـصـفـحـة ↜｢ ${page} ｣\n`;
  msg += `╯──────────────⟢ـ\n`;

  pageResults.forEach((v, i) => {
    msg += `​  ❆˹${i + 1}˼┊ ${v.title?.slice(0, 35) || "فيديو تكتوك"}...\n`;
  });

  msg += `╮──────────────⟢ـ\n`;
  msg += `┆˼💡˹┊ رد بـرقـم الـفـيـديـو لـلـتـحـمـيـل\n`;
  msg += `┆˼➡️˹┊ أرسـل "التالي" لـلـمـزيـد\n`;
  msg += `╯──────────────⟢ـ\n`;
  msg += `┊˼🪸˹┊ SINKO | ✅`;

  return api.sendMessage(msg, threadID, (err, info) => {
    if (!err) {
      global.client.handleReply.push({
        name: "تكتوك",
        messageID: info.messageID,
        author: senderID,
        results: allResults,
        query,
        page
      });
    }
  }, messageID);
}
