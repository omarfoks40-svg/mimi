const axios = require("axios");

module.exports = {
  config: {
    name: "رابط",
    version: "1.0.0",
    author: "Thiệu Trung Kiên",
    countDown: 10,
    description: "رفع الصور إلى موقع Imgur والحصول على رابط مباشر",
    category: "tools",
    prefix: true,
    guide: { ar: "{pn} [قم بالرد على صورة أو مجموعة صور]" }
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, messageReply, type } = event;
    const clientId = "fc9369e9aea767c"; // معرف Imgur الخاص بك

    const client = axios.create({
      baseURL: "https://api.imgur.com/3/",
      headers: {
        Authorization: `Client-ID ${clientId}`,
      },
    });

    const uploadImage = async (url) => {
      const res = await client.post("image", {
        image: url,
      });
      return res.data.data.link;
    };

    if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("⚠️ يرجى الرد على الصورة أو الصور التي تريد رفعها.", threadID, messageID);
    }

    const links = [];
    let failCount = 0;

    for (const attachment of messageReply.attachments) {
      try {
        if (attachment.type === "photo" || attachment.type === "animated_image") {
          const res = await uploadImage(attachment.url);
          links.push(res);
        }
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    if (links.length === 0) {
      return api.sendMessage("❌ فشل رفع الصور. تأكد من أن الملفات مدعومة.", threadID, messageID);
    }

    let msg = `✅ تم الرفع بنجاح!\n\n`;
    msg += `🔹 عدد الصور الناجحة: ${links.length}\n`;
    if (failCount > 0) msg += `🔸 عدد الصور الفاشلة: ${failCount}\n`;
    msg += `\n🔗 الروابط:\n${links.join("\n")}`;

    return api.sendMessage(msg, threadID, messageID);
  },
};
