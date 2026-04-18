const axios = require('axios');

module.exports = {
  config: {
    name: "صفعة",
    aliases: ["slap"],
    version: "1.0.5",
    author: "Sinko",
    role: 0,
    category: "fun"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, mentions, type, messageReply, senderID } = event;
    
    let targetID;
    let targetName = "";

    // التحقق من طريقة استهداف العضو (رد أو منشن)
    if (type == "message_reply") {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else {
      return api.sendMessage("❌ يرجى المنشن أو الرد على رسالة الشخص لصفعه!", threadID, messageID);
    }

    try {
      // تفاعل اليد قبل الإرسال
      api.setMessageReaction("👋", messageID, () => {}, true);

      const res = await axios.get("https://api.waifu.pics/sfw/slap");
      const imgStream = (await axios.get(res.data.url, { responseType: "stream" })).data;
      
      const msg = {
        body: "👋 خذ هذه الصفعة القوية!",
        attachment: imgStream
      };

      return api.sendMessage(msg, threadID, messageID);
    } catch (e) {
      console.error(e);
      return api.sendMessage("👋 طااااخ! (تعذر تحميل الصورة لكن الصفعة وصلت)", threadID, messageID);
    }
  }
};
