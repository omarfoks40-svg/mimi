const axios = require("axios");
const FormData = require('form-data');

module.exports = {
  config: {
    name: "تحويل",
    version: "1.1.0",
    author: "سينكو",
    countDown: 15,
    role: 0,
    category: "ذكاء اصطناعي",
    description: "تحويل الصورة لفيديو عبر Glam AI.",
    aliases: ["animate"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;
    const prompt = args.join(" ");

    if (!messageReply || messageReply.attachments?.[0]?.type !== "photo") {
        return api.sendMessage("✧ يرجى الرد على صورة لتحويلها يا زول.", threadID, messageID);
    }
    if (!prompt) return api.sendMessage("✧ اكتب الوصف، مثلاً: تحويل اجعلها أنمي", threadID, messageID);

    api.setMessageReaction("⏳", messageID, () => {}, true);
    api.sendMessage("", threadID, messageID);
    
    try {
      // 1. توليد ID جديد وخداع السيرفر بالهدية
      const pack = Math.random().toString(16).substring(2, 18);
      const UA = "Glam/1.58.4 Android/32 (Samsung SM-A156E)";
      
      await axios.post("https://api.getglam.app/rewards/claim/hdnu30r7auc4kve", null, { 
        headers: { 
          "User-Agent": UA, 
          "glam-user-id": pack,
          "user_id": pack 
        } 
      });

      // تأخير بسيط 3 ثواني عشان السيرفر يثبت الكوينز في الحساب الوهمي
      await new Promise(r => setTimeout(r, 3000));

      const imgStream = (await axios.get(messageReply.attachments[0].url, { responseType: "stream" })).data;

      // 2. رفع الصورة وطلب الفيديو
      const form = new FormData();
      form.append("package_id", pack);
      form.append("media_file", imgStream);
      form.append("media_type", "image");
      form.append("template_id", "community_img2vid");
      form.append("frames", JSON.stringify([{ 
        prompt: prompt, 
        style_id: "chained_falai_img2video", 
        rate_modifiers: { duration: "5s" } 
      }]));

      const post = await axios.post("https://android.getglam.app/v2/magic_video", form, { 
        headers: { 
          ...form.getHeaders(), 
          "User-Agent": UA,
          "glam-user-id": pack,
          "glam-experiment-id": "android_is_free" // إضافة هيدر التجربة المجانية
        } 
      });

      if (!post.data.event_id) throw new Error("No Event ID");

      // 3. حلقة فحص الحالة
      let videoUrl = "";
      let attempts = 0;
      while (attempts < 30) { // فحص لمدة دقيقة تقريباً
        const check = await axios.get("https://android.getglam.app/v2/magic_video", { 
          params: { package_id: pack, event_id: post.data.event_id }, 
          headers: { "User-Agent": UA, "glam-user-id": pack } 
        });

        if (check.data.status === "READY") { 
          videoUrl = check.data.video_url || check.data.event_result_url; 
          break; 
        }
        
        if (check.data.status === "FAILED") {
          return api.sendMessage("❌ السيرفر رفض الطلب، جرب وصف تاني أو صورة أوضح.", threadID, messageID);
        }

        await new Promise(r => setTimeout(r, 3000));
        attempts++;
      }

      if (!videoUrl) return api.sendMessage("⏳ المعالجة أخدت وقت طويل، جرب كمان شوية.", threadID, messageID);

      api.sendMessage({ 
        body: "✨ تـم الـتـحـويـل بـنـجـاح يـا مـلـك", 
        attachment: await global.utils.getStreamFromURL(videoUrl) 
      }, threadID, messageID);

    } catch (e) {
      console.error(e);
      api.sendMessage("❌ الـ API مـضـغـوط حـالـيـاً أو مـحـظـور.. جـرب بـعـد دقـيـقـة.", threadID, messageID);
    }
  }
};
