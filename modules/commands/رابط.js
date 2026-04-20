const axios = require("axios");

module.exports = {
  config: {
    name: "رابط",
    aliases: ["جلب", "تحقق"],
    version: "2.2.0",
    author: "SINKO",
    countDown: 5,
    description: "رفع الصور لـ Imgur وإرسال الروابط بدون زخرفة",
    category: "tools",
    prefix: true
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, type } = event;
    const clientId = "fc9369e9aea767c"; 

    if (type === "message_reply" && messageReply.attachments && messageReply.attachments.length > 0) {
      
      api.setMessageReaction("⚙️", messageID, () => {}, true);

      const client = axios.create({
        baseURL: "https://api.imgur.com/3/",
        headers: { Authorization: `Client-ID ${clientId}` }
      });

      const links = [];
      for (const attachment of messageReply.attachments) {
        try {
          if (attachment.type === "photo" || attachment.type === "animated_image") {
            const res = await client.post("image", { image: attachment.url });
            links.push(res.data.data.link);
          }
        } catch (err) { console.error(err); }
      }

      if (links.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("❌ فشل الرفع.", threadID, messageID);
      }

      api.setMessageReaction("✔️", messageID, () => {}, true);

      // إرسال الروابط فقط بدون أي زخرفة
      let msg = links.join("\n");

      return api.sendMessage(msg, threadID, (err, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          author: event.senderID,
          messageID: info.messageID,
          links: links,
          type: "verify"
        });
      }, messageID);
    }

    if (args[0] && args[0].startsWith("http")) {
        return module.exports.verifyImage(api, event, args[0]);
    }

    return api.sendMessage("⚠️ رد على صورة لرفعها.", threadID, messageID);
  },

  onReply: async function ({ api, event, handleReply }) {
    const { body, threadID, messageID, senderID } = event;
    if (handleReply.author != senderID) return;

    if (handleReply.type === "verify" && (body === "تحقق" || body === "جلب")) {
      api.unsendMessage(handleReply.messageID);
      api.setMessageReaction("⚙️", messageID, () => {}, true);
      
      for (const link of handleReply.links) {
        await module.exports.verifyImage(api, event, link);
      }

      api.setMessageReaction("✔️", messageID, () => {}, true);
    }
  },

  verifyImage: async function (api, event, url) {
    try {
      const res = await axios.get(url, {
        responseType: "stream",
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      return api.sendMessage({
        body: `رابط المعاينة: ${url}`,
        attachment: res.data
      }, event.threadID, event.messageID);
    } catch (e) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  }
};
