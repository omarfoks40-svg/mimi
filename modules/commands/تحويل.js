const axios = require('axios');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: "تحويل",
    aliases: ["tomp3"],
    version: "1.0.1",
    author: "Sinko",
    role: 0,
    category: "ai"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, type, messageReply } = event;
    if (type != "message_reply" || !messageReply.attachments[0] || messageReply.attachments[0].type != "video") 
      return api.sendMessage("❌ يرجى الرد على مقطع فيديو لتحويله لصوت!", threadID, messageID);

    try {
      api.setMessageReaction("🎵", messageID, () => {}, true);
      const audioUrl = messageReply.attachments[0].url;
      const path = __dirname + `/cache/${Date.now()}.mp3`;
      
      const response = await axios.get(audioUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(path, Buffer.from(response.data, "binary"));

      return api.sendMessage({ body: "🎵 تم تحويل الفيديو لصوت بنجاح:", attachment: fs.createReadStream(path) }, threadID, () => fs.unlinkSync(path), messageID);
    } catch (e) {
      return api.sendMessage("⚠️ حدث خطأ أثناء التحويل.", threadID, messageID);
    }
  }
};
