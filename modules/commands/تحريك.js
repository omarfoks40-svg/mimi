const axios = require("axios");
const FormData = require('form-data');

module.exports.config = {
    name: "تحريك",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "SINKO", // حقوقك يا ملك
    description: "تحويل الصورة لفيديو متحرك (محرك Glam المسروق 🎭)",
    commandCategory: "ai",
    usages: "[رد على صورة + وصف]",
    cooldowns: 15
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, messageReply, type } = event;
    const prompt = args.join(" ");
    
    // الزخرفة الهندسية اللي بتحبها 🕸️
    const head = "⌬ ────── ⟨ SYSTEM ⟩ ────── ⌬\n";
    const foot = "\n⌬ ──────────────────── ⌬";

    if (type !== "message_reply" || !messageReply.attachments[0] || messageReply.attachments[0].type !== "photo") {
        return api.sendMessage(`${head}❌ رد على "صورة" يا ملك عشان أحركها!${foot}`, threadID, messageID);
    }

    if (!prompt) return api.sendMessage(`${head}⚠️ اكتب وصف للتحريك (مثلاً: anime style)${foot}`, threadID, messageID);

    try {
        api.setMessageReaction("🧭", messageID, () => {}, true);
        const imgUrl = messageReply.attachments[0].url;

        // ─── الدالات المسروقة من ملف Glam (دمجناها هنا) ───
        
        // 1. توليد ID عشوائي
        const generateRandomId = (length = 16) => {
            const chars = "abcdef0123456789";
            let id = "";
            for (let i = 0; i < length; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
            return id;
        };

        const pack = generateRandomId();

        // 2. تفعيل الجلسة (Claim Reward)
        await axios.post("https://api.getglam.app/rewards/claim/hdnu30r7auc4kve", null, {
            headers: {
                "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)",
                "glam-user-id": pack,
                "user_id": pack,
                "glam-local-date": new Date().toISOString(),
            }
        });

        // 3. رفع الصورة وبدء المهمة
        const form = new FormData();
        const stream = (await axios.get(imgUrl, { responseType: "stream" })).data;
        
        form.append("package_id", pack);
        form.append("media_file", stream);
        form.append("media_type", "image");
        form.append("template_id", "community_img2vid");
        form.append("template_category", "20_coins_dur");
        form.append("frames", JSON.stringify([{
            prompt,
            custom_prompt: prompt,
            community_api_id: "34d2me5m9s7p8xw",
            additional_data: { prompt, custom_prompt: prompt, community_api_id: "34d2me5m9s7p8xw" },
            start: 0, end: 0, timings_units: "frames", media_type: "image",
            style_id: "chained_falai_img2video",
            rate_modifiers: { duration: "5s" },
            additional_styles: [], person_info: {}
        }]));

        const uploadRes = await axios.post("https://android.getglam.app/v2/magic_video", form, {
            headers: {
                ...form.getHeaders(),
                "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)",
                "glam-user-id": pack,
                "user_id": pack,
            }
        });

        const taskID = uploadRes.data.event_id;

        // 4. متابعة الحالة حتى يجهز الفيديو
        let videoUrl = "";
        while (true) {
            const statusRes = await axios.get("https://android.getglam.app/v2/magic_video", {
                params: { package_id: pack, event_id: taskID },
                headers: { "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)" }
            });

            if (statusRes.data.status === "READY") {
                videoUrl = statusRes.data.video_url || statusRes.data.url;
                break;
            }
            if (statusRes.data.status === "FAILED") throw new Error("فشل السيرفر");
            await new Promise(res => setTimeout(res, 2000)); // انتظر ثانيتين قبل الفحص القادم
        }

        // 5. إرسال النتيجة
        if (videoUrl) {
            return api.sendMessage({
                body: `${head}✨ تم التحريك بنجاح ا !${foot}`,
                attachment: await global.utils.getStreamFromURL(videoUrl)
            }, threadID, messageID);
        }

    } catch (e) {
        console.error(e);
        return api.sendMessage(`${head}❌ حصل خطأ في المحرك، السيرفر ممكن يكون مضغوط.${foot}`, threadID, messageID);
    }
};
