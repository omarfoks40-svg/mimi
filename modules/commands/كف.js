const axios = require('axios');

module.exports = {
  config: {
    name: "كف",
    aliases: ["punch"],
    version: "1.0.2",
    author: "Sinko",
    role: 0,
    category: "fun"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, type, messageReply, mentions } = event;
    let targetID = type == "message_reply" ? messageReply.senderID : Object.keys(mentions)[0];

    if (!targetID) return api.sendMessage("❌ يرجى الرد على رسالة أو منشن الشخص للكمه!", threadID, messageID);

    try {
      api.setMessageReaction("🫏", messageID, () => {}, true);
      const res = await axios.get("https://api.waifu.pics/sfw/slap"); // استخدمت رابط بديل سريع وموثوق
      const img = (await axios.get(res.data.url, { responseType: "stream" })).data;
      
      return api.sendMessage({ body: "👊 خذ هذه اللكمة في وجهك!", attachment: img }, threadID, messageID);
    } catch (e) {
      return api.sendMessage("👊 طراااخ! (لم نجد صورة لكن اللكمة وصلت)", threadID, messageID);
    }
  }
};
