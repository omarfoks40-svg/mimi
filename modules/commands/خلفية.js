const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const PIXABAY_KEY = "39178311-acadeb32d7e369897e41dba06";
const MAX_IMAGES = 10;

module.exports = {
  config: {
    name: "خلفية",
    version: "1.0.0",
    author: "CYBER BOT / SINKO",
    countDown: 10,
    prefix: true,
    category: "media",
    description: "🖼️ بحث عن صور وخلفيات عبر Pixabay",
    aliases: ["wallpaper", "خلفية", "خلفيات"],
    guide: { ar: "{pn} [الكلمة]" }
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const query = args.join(" ").trim();

    if (!query) {
      return api.sendMessage(
        "╭─⟪ 🖼️ ورق الجدران ⟫─╮\n┇ أكتب الكلمة المراد البحث عنها\n┇ مثال: ورق_الجدران طبيعة\n╰────────────────╯",
        threadID, messageID
      );
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const res = await axios.get("https://pixabay.com/api/", {
        params: {
          key: PIXABAY_KEY,
          q: query,
          image_type: "photo",
          per_page: 50,
          safesearch: "true"
        },
        timeout: 15000
      });

      const hits = (res.data?.hits || []).filter(w => {
        const ext = path.extname(w.largeImageURL || "").toLowerCase();
        return ext === ".jpg" || ext === ".png" || ext === ".jpeg";
      });

      if (hits.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(`ما لقيت نتائج لـ「${query}」 🖼️`, threadID, messageID);
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const selected = hits.slice(0, MAX_IMAGES);
      const streams = [];
      const savedPaths = [];

      for (let i = 0; i < selected.length; i++) {
        try {
          const imgUrl = selected[i].largeImageURL;
          const ext = path.extname(imgUrl).split("?")[0] || ".jpg";
          const filePath = path.join(cacheDir, `wall_${Date.now()}_${i}${ext}`);
          const imgRes = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 10000 });
          fs.writeFileSync(filePath, Buffer.from(imgRes.data));
          savedPaths.push(filePath);
          streams.push(fs.createReadStream(filePath));
        } catch (e) {}
      }

      if (streams.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("فشل تحميل الصور، جرب تاني 🖼️", threadID, messageID);
      }

      api.setMessageReaction("✅", messageID, () => {}, true);
      api.sendMessage({
        body: `╭─⟪ 🖼️ نتائج「${query}」⟫─╮\n┇ ✨ ${streams.length} صورة من Pixabay\n╰────────────────╯`,
        attachment: streams
      }, threadID, () => {
        for (const f of savedPaths) { try { fs.unlinkSync(f); } catch (e) {} }
      }, messageID);

    } catch (e) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("الشبكة واجهت مشكلة، جرب تاني 🖼️", threadID, messageID);
    }
  }
};
