const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "نانو",
        version: "3.0.0",
        author: "سينكو",
        countDown: 10,
        description: "يرسم الصور بالذكاء الاصطناعي مع دعم اللغة العربية (ترجمة تلقائية).",
        category: "ai",
        prefix: true,
        guide: { ar: "{pn} <وصف الصورة بالعربي أو الإنجليزي>" }
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, senderID: userId } = event;
        let query = args.join(" ").trim();

        if (!query) {
            return api.sendMessage("⏣ ◍ يا سنيور.. أكتب وصف للصورة (عادي أكتب بالعربي)! 🙄", threadID, messageID);
        }

        api.setMessageReaction("⚙️", messageID, () => {}, true);
        const waitMsg = await api.sendMessage("", threadID);

        try {
            // --- مرحلة الترجمة التلقائية ---
            // نستخدم مترجم جوجل المجاني لتحويل الوصف للإنجليزية لضمان أفضل جودة للرسم
            const translationRes = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(query)}`);
            const translatedQuery = translationRes.data[0][0][0];
            
            // --- مرحلة الرسم ---
            const cachePath = path.join(__dirname, 'cache');
            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
            const imgPath = path.join(cachePath, `takhayul_${userId}_${Date.now()}.png`);

            const response = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(translatedQuery)}`, {
                responseType: "arraybuffer",
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            fs.writeFileSync(imgPath, Buffer.from(response.data, 'utf-8'));

            api.unsendMessage(waitMsg.messageID);
            
            return api.sendMessage({
                body: `⏣────── ✾ ⌬ ✾ ──────⏣\n` +
                      `✾ ┇ ✅ تـم الـرسـم بـنـجـاح!\n` +
                      `✾ ┇ ◍ الـطلب: ${query}\n` +
                      `✾ ┇ ◍ الـترجمة: ${translatedQuery}\n` +
                      `⏣────── ✾ ⌬ ✾ ──────⏣\n\n` +
                      `تفضل يا سنيور، الرسمة جاهزة 💖`,
                attachment: fs.createReadStream(imgPath)
            }, threadID, (err) => {
                if (!err) api.setMessageReaction("✔️", messageID, () => {}, true);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }, messageID);

        } catch (error) {
            console.error(error);
            api.unsendMessage(waitMsg.messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage(`⏣ ❌ حصل خطأ في الترجمة أو الرسم.. جرب تاني يا وهم 😒`, threadID, messageID);
        }
    }
};
