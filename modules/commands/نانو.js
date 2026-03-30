const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

module.exports = {
  config: {
    name: "نانو",
    aliases: ["تخيل", "nano", "نانانو"],
    version: "2.5.0",
    author: "SINKO",
    description: "توليد صور احترافية بوصف عربي (نظام ماجيك)",
    countDown: 10,
    prefix: false,
    category: "ai",
    adminOnly: false
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const userPrompt = args.join(" ").trim();

    if (!userPrompt) {
      return api.sendMessage("❌ اكتب لي وصف بالعربي يا ملك (مثلاً: نانو فارس سوداني في الخرطوم)", threadID, messageID);
    }

    api.setMessageReaction("⏲️", messageID, () => {}, true);

    const cachePath = path.join(__dirname, "cache", `nano_magic_${crypto.randomBytes(4).toString('hex')}.png`);

    try {
      // 1. مرحلة "الماجيك": تحويل الوصف العربي لوصف إنجليزي دقيق ومحسن
      const translationUrl = `https://api.sandipbgt.com/sandipapi?query=${encodeURIComponent("Translate this image description to a very detailed English prompt for AI image generation: " + userPrompt)}`;
      const transRes = await axios.get(translationUrl);
      const magicPrompt = transRes.data.answer || transRes.data.message || userPrompt;

      // 2. مرحلة التوليد: إرسال الوصف المحسن لسيرفر الصور
      const seed = Math.floor(Math.random() * 10000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(magicPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'stream',
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // إرسال النتيجة (نص نظيف وبدون زخرفة كما طلبت)
      return api.sendMessage({
        body: `✅ تم التوليد  \n\n📝 وصفك: ${userPrompt}\n✨ الوصف المحسن: ${magicPrompt.substring(0, 100)}...`,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } catch (error) {
      console.error('Nano Magic Error:', error.message);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("⚠️ حصلت مشكلة في تحويل الوصف أو التوليد، جرب تاني.", threadID, messageID);
    }
  }
};
