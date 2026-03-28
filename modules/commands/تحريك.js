const axios = require("axios");
const FormData = require('form-data');
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "تحريك",
    version: "1.0.0",
    author: "SINKO",
    countDown: 15,
    role: 0,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, type } = event;
    const prompt = args.join(" ");

    if (type !== "message_reply" || !messageReply.attachments[0] || messageReply.attachments[0].type !== "photo") {
      return api.sendMessage("خطأ: يرجى الرد على صورة لتحريكها.", threadID, messageID);
    }
    if (!prompt) return api.sendMessage("خطأ: يرجى كتابة وصف للتحريك.", threadID, messageID);

    const cacheDir = path.join(__dirname, 'cache');
    const videoPath = path.join(cacheDir, `move_${Date.now()}.mp4`);

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      const imgUrl = messageReply.attachments[0].url;
      const pack = Math.random().toString(36).substring(2, 15);

      await axios.post("https://api.getglam.app/rewards/claim/hdnu30r7auc4kve", null, {
        headers: { "User-Agent": "Glam/1.58.4 Android/32", "glam-user-id": pack, "user_id": pack }
      });

      const form = new FormData();
      const stream = (await axios.get(imgUrl, { responseType: "stream" })).data;
      form.append("package_id", pack);
      form.append("media_file", stream);
      form.append("media_type", "image");
      form.append("template_id", "community_img2vid");
      form.append("frames", JSON.stringify([{ prompt, custom_prompt: prompt, community_api_id: "34d2me5m9s7p8xw", start: 0, end: 0, timings_units: "frames", media_type: "image", style_id: "chained_falai_img2video", rate_modifiers: { duration: "5s" } }]));

      const uploadRes = await axios.post("https://android.getglam.app/v2/magic_video", form, {
        headers: { ...form.getHeaders(), "User-Agent": "Glam/1.58.4 Android/32", "glam-user-id": pack }
      });

      const taskID = uploadRes.data.event_id;
      let videoUrl = "";
      while (true) {
        const statusRes = await axios.get("https://android.getglam.app/v2/magic_video", {
          params: { package_id: pack, event_id: taskID },
          headers: { "User-Agent": "Glam/1.58.4 Android/32" }
        });
        if (statusRes.data.status === "READY") {
          videoUrl = statusRes.data.video_url || statusRes.data.url;
          break;
        }
        if (statusRes.data.status === "FAILED") throw new Error("فشل");
        await new Promise(res => setTimeout(res, 3000));
      }

      await fs.ensureDir(cacheDir);
      const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      await fs.writeFile(videoPath, Buffer.from(videoRes.data));

      await api.sendMessage({ body: "تم التحريك بنجاح:", attachment: fs.createReadStream(videoPath) }, threadID, messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (e) {
      api.sendMessage("حدث خطأ في محرك التحريك.", threadID, messageID);
    } finally {
      setTimeout(() => { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); }, 7000);
    }
  }
};
