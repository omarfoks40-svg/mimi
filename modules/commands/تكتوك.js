const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

module.exports = {
  config: {
    name: "تكتوك",
    aliases: ["بحث", "فيديو"],
    version: "5.0.0",
    author: "Sinko",
    countDown: 10,
    role: 0,
    category: "media"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) return api.sendMessage("> ˼⚠️˹↜ أكـتب شـي للـبحث يـا مـلك. ↶", threadID, messageID);

    api.setMessageReaction("⚙️", messageID, () => {}, true);

    try {
      // البحث باستخدام TikWM مع Headers لضمان القبول
      const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const videoData = res.data.data.videos[0];
      if (!videoData) throw new Error("No results found");

      // التعديل المهم هنا: التأكد من أن الرابط يبدأ بـ https بشكل صحيح
      let videoUrl = videoData.play;
      if (!videoUrl.startsWith('http')) {
          videoUrl = `https://www.tikwm.com${videoUrl}`;
      }

      const cachePath = path.join(__dirname, 'cache', `eplin_${crypto.randomBytes(3).toString('hex')}.mp4`);
      await fs.ensureDir(path.join(__dirname, 'cache'));

      const response = await axios({
        url: videoUrl,
        method: 'GET',
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      api.sendMessage({
        body: `> ˼✅˹↜ تـم الـعـثـور بـنجاح ↶\n╮──────────────⟢ـ\n┆˼📝˹┊ الـبـحـث ↜｢ ${query} ｣\n╯──────────────⟢ـ\n> ˼⌬˹ مـشاهدة مـمتعة مـع إبـلـين ⚖️`,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => fs.removeSync(cachePath), messageID);

      api.setMessageReaction("✔️", messageID, () => {}, true);

    } catch (e) {
      console.error(e);
      api.sendMessage("> ˼❌˹↜ حـدث خـطأ فـي الـعنوان أو الـسيرفر مـضغوط. ↶", threadID, messageID);
      api.setMessageReaction("💔", messageID, () => {}, true);
    }
  }
};
