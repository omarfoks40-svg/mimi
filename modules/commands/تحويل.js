const axios = require("axios");
const FormData = require('form-data');

module.exports = {
  config: {
    name: "تحويل",
    version: "1.0.0",
    author: "سينكو",
    countDown: 10,
    role: 0,
    category: "ذكاء اصطناعي",
    description: "تحويل الصورة لفيديو حسب وصفك.",
    aliases: ["animate"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;
    const prompt = args.join(" ");

    if (!messageReply || messageReply.attachments?.[0]?.type !== "photo") return api.sendMessage("✧ يرجى الرد على صورة لتحويلها.", threadID, messageID);
    if (!prompt) return api.sendMessage("✧ اكتب الوصف، مثال: تحويل اجعلها ترقص", threadID, messageID);

    api.setMessageReaction("⏳", messageID, () => {}, true);
    
    try {
      const pack = Math.random().toString(16).substring(2, 18);
      const imgStream = (await axios.get(messageReply.attachments[0].url, { responseType: "stream" })).data;

      const form = new FormData();
      form.append("package_id", pack);
      form.append("media_file", imgStream);
      form.append("template_id", "community_img2vid");
      form.append("frames", JSON.stringify([{ prompt: prompt, style_id: "chained_falai_img2video", rate_modifiers: { duration: "5s" } }]));

      const post = await axios.post("https://android.getglam.app/v2/magic_video", form, { headers: { ...form.getHeaders(), "glam-user-id": pack } });

      let videoUrl = "";
      while (true) {
        const check = await axios.get("https://android.getglam.app/v2/magic_video", { params: { package_id: pack, event_id: post.data.event_id }, headers: { "glam-user-id": pack } });
        if (check.data.status === "READY") { videoUrl = check.data.video_url; break; }
        await new Promise(r => setTimeout(r, 2000));
      }

      api.sendMessage({ body: "✨ تـم الـتـحـويـل بـنـجـاح", attachment: await global.utils.getStreamFromURL(videoUrl) }, threadID, messageID);
    } catch (e) { api.sendMessage("❌ الـ API مشغول حالياً.", threadID, messageID); }
  }
};
