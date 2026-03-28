const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['sd', 'dream'],
    version: '2.2.1',
    author: 'RI F AT',
    description: 'توليد صور باستخدام الذكاء الاصطناعي (للمطور فقط)',
    countDown: 5,
    prefix: true,
    category: 'ai',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID } = event;
    const developerID = "61586897962846"; // أيدي حسابك

    // التحقق مما إذا كان المستخدم هو المطور
    if (senderID !== developerID) {
      // التفاعل بالرمز 🚯 فقط دون إرسال رسالة
      return api.setMessageReaction("🚯", messageID, (err) => {}, true);
    }

    const prompt = args.join(" ");

    // التفاعل الأولي بالرموز للمطور فقط
    api.setMessageReaction("⚙️", messageID, (err) => {}, true);

    // رسالة الانتظار للمطور
    const waitingMsg = await api.sendMessage(
      '◄ جاري معالجة وتوليد الصورة... ►',
      threadID,
      messageID
    );
    const processingID = waitingMsg.messageID;

    // التحقق من وجود وصف
    if (!prompt) {
      return api.editMessage('●─────── ❌ يرجى كتابة وصف ───────●', processingID);
    }

    let imageUrl;
    if (event.type === "message_reply") {
      const attachment = event.messageReply.attachments[0];
      if (attachment && (attachment.type === "photo" || attachment.type === "image")) {
        imageUrl = attachment.url;
      }
    }

    if (!imageUrl) {
      return api.editMessage('●─────── ❌ يرجى الرد على صورة ───────●', processingID);
    }

    const cachePath = path.join(__dirname, "cache", `sd_${Date.now()}.png`);

    try {
      const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt)}&imageUrl=${encodeURIComponent(imageUrl)}`;

      const response = await axios({
        method: 'get',
        url: apiUrl,
        responseType: 'stream',
        timeout: 120000
      });

      if (!fs.existsSync(path.join(__dirname, "cache"))) {
        fs.mkdirSync(path.join(__dirname, "cache"));
      }

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const messageBody = 
`╭━─━─━─≪ ஜ▲ஜ ≫─━─━─━╮
      ✨ نـتـيـجـة الـتـولـيـد ✨

  •——◤ 📝 الـوصـف : ${prompt} ◥——•
──────────────────
  •——◤ ✅ تـم الـتـنـفـيذ بـنـجـاح ◥——•
      
╰━─━─━─≪ ஜ▼ஜ ≫─━─━─━╯`;

      await api.sendMessage({
        body: messageBody,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        api.unsendMessage(processingID);
      }, messageID);

      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (error) {
      console.error('SD Error:', error);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.editMessage('●─────── ❌ فشل في توليد الصورة ───────●', processingID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  },
};
