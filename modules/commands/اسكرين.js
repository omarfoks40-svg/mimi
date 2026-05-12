const axios = require("axios");

module.exports = {
  config: {
    name: "الأدوات"
  تت"ت",
    aliases: ["لقطة", "ss"],
    version: "1.0.0",
    author: "SINKO",
    countDown: 5,
    prefix: false,
    category: "tools"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const urlInput = args[0];

    if (!urlInput) {
      return api.sendMessage(
        "> ˼⚠️˹↜ تـنـبـيـه الـمـلـك\n" +
        "╮──────────────⟢ـ\n" +
        "┆ يـرجـى وضـع رابـط الـمـوقـع بـعـد الأمـر\n" +
        "╯──────────────⟢ـ", 
        threadID, messageID
      );
    }

    api.setMessageReaction("📸", messageID, () => {}, true);

    const apiUrl = `https://azadx69x.is-a.dev/api/screenshot?url=${encodeURIComponent(urlInput)}`;

    try {
      const res = await axios.get(apiUrl, {
        responseType: "stream"
      });

      return api.sendMessage({
        body: 
          "> ˼📸˹↜ لـقـطـة الـشـاشـة ↶\n" +
          "╮──────────────⟢ـ\n" +
          "┆˼🌐˹┊ الـرابط ↶\n" +
          `┆ « ${urlInput} »\n` +
          "╯──────────────⟢ـ\n" +
          "┊˼🪸˹┊ SINKO | ✅",
        attachment: res.data
      }, threadID, messageID);

    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "╮──────────────⟢ـ\n" +
        "┆˼❌˹┊ فـشـل تـصـويـر الـمـوقـع\n" +
        "╯──────────────⟢ـ", 
        threadID, messageID
      );
    }
  }
};
