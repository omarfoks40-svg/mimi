const axios = require("axios");
const FormData = require('form-data');
const jimp = require("jimp");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "تحرش",
    version: "1.0.0",
    author: "سينكو",
    countDown: 15,
    role: 0,
    category: "ترفيه",
    description: "صناعة فيديو قبلة بالذكاء الاصطناعي.",
    aliases: ["بوسة", "kiss"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply, mentions } = event;
    const targetID = Object.keys(mentions).length > 0 ? Object.keys(mentions)[0] : (messageReply?.senderID);

    if (!targetID) return api.sendMessage("◉ ───  تـنـبـيـه  ─── ◉\n\n✧ يرجى الرد على الشخص أو منشنته لبدء العملية.\n\n◉ ───────────────── ◉", threadID, messageID);

    api.setMessageReaction("⏳", messageID, () => {}, true);
    api.sendMessage("", threadID, messageID);

    try {
      const userAv = `https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const targetAv = `https://graph.facebook.com/${targetID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      // دمج الصور
      const [img1, img2] = await Promise.all([jimp.read(userAv), jimp.read(targetAv)]);
      const canvas = new jimp(1440, 720, 0xffffffff);
      canvas.composite(img2.resize(720, 720), 0, 0).composite(img1.resize(720, 720), 720, 0);
      
      const cachePath = path.join(__dirname, "cache", `kiss_${Date.now()}.png`);
      await canvas.writeAsync(cachePath);

      // طلب الـ API
      const pack = Math.random().toString(16).substring(2, 18);
      await axios.post("https://api.getglam.app/rewards/claim/hdnu30r7auc4kve", null, { headers: { "User-Agent": "Glam/1.58.4", "glam-user-id": pack } });

      const form = new FormData();
      form.append("package_id", pack);
      form.append("media_file", fs.createReadStream(cachePath));
      form.append("template_id", "community_img2vid");
      form.append("frames", JSON.stringify([{ prompt: "make them kiss passionately", style_id: "chained_falai_img2video", rate_modifiers: { duration: "5s" } }]));

      const post = await axios.post("https://android.getglam.app/v2/magic_video", form, { headers: { ...form.getHeaders(), "glam-user-id": pack } });
      
      let videoUrl = "";
      while (true) {
        const check = await axios.get("https://android.getglam.app/v2/magic_video", { params: { package_id: pack, event_id: post.data.event_id }, headers: { "glam-user-id": pack } });
        if (check.data.status === "READY") { videoUrl = check.data.video_url || check.data.event_result_url; break; }
        await new Promise(r => setTimeout(r, 2500));
      }

      api.sendMessage({ body: "✅ تـم صـنـع الـفـيـديـو بـنـجـاح 🔥", attachment: await global.utils.getStreamFromURL(videoUrl) }, threadID, () => fs.unlinkSync(cachePath), messageID);
    } catch (e) { api.sendMessage("❌ عذراً، حدث خطأ في الـ API.", threadID, messageID); }
  }
};
