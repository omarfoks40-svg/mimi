const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require('crypto');

module.exports = {
  config: {
    name: "تلقائي",
    version: "4.0.0",
    author: "SINKO",
    countDown: 0,
    role: 0,
    category: "system"
  },

  handleEvent: async function ({ api, event }) {
    const { body, threadID, messageID, type, senderID } = event;
    
    // تجاهل رسائل البوت والرسائل الفارغة
    if (!body || senderID === api.getCurrentUserID()) return;
    if (type !== "message" && type !== "message_reply") return;

    // فحص وجود رابط مدعوم
    const urlMatch = body.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return;

    const url = urlMatch[0];
    const supported = ["facebook.com", "fb.watch", "tiktok.com", "instagram.com", "youtu.be", "youtube.com", "twitter.com", "x.com"];
    
    if (!supported.some(p => url.includes(p))) return;

    const cacheDir = path.join(__dirname, 'cache');
    const filePath = path.join(cacheDir, `auto_${crypto.randomBytes(4).toString('hex')}.mp4`);

    try {
      // تفاعل "انتظار"
      api.setMessageReaction("⚙️", messageID, () => {}, true);

      // استخدام الـ API الشامل والسريع (Noobs API)
      const apiEndpoint = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiEndpoint, { timeout: 30000 });

      if (!data.result) {
         return api.setMessageReaction("❌", messageID, () => {}, true);
      }

      await fs.ensureDir(cacheDir);

      // تحميل الفيديو كـ Stream (أسرع وأخف على راندر)
      const videoRes = await axios({
        url: data.result,
        method: 'GET',
        responseType: 'stream',
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const writer = fs.createWriteStream(filePath);
      videoRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      // حماية البوت من الملفات الضخمة (Messenger Limit ~85MB)
      if (stats.size > 80 * 1024 * 1024) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(`⚠️ الحجم كبير جداً: ${fileSizeMB} MB`, threadID, messageID);
      }

      const msg = {
        body: `✅\n\n▸ العنوان: ${data.title || "فيديو"}\n▸ الحجم: ${fileSizeMB} MB`,
        attachment: fs.createReadStream(filePath)
      };

      return api.sendMessage(msg, threadID, () => {
        api.setMessageReaction("✔️", messageID, () => {}, true);
        // "المكنسة الفورية" لمسح الملف بعد الإرسال
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (error) {
      console.error("Auto DL Error:", error.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  },

  onStart: async function ({ api, event }) {
    return api.sendMessage("نظام التحميل التلقائي (النسخة المستقرة) شغال الآن! 🚀", event.threadID);
  }
};
