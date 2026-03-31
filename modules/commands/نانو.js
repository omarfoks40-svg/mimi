const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require("crypto");

module.exports = {
    config: {
        name: "نانو",
        aliases: ["تخيل"],
        version: "10.0.0",
        author: "Sinko",
        countDown: 10,
        prefix: false,
        category: "ai"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) return api.sendMessage(" وصف الصورة؟ ", threadID, messageID);

        // 1. رد فوري عشان راندر ما يقتل البوت (Break the Timeout)
        api.sendMessage("⏳ جاري التوليد.. انتظر ثواني.", threadID, async (err, info) => {
            const cachePath = path.join(__dirname, 'cache', `nano_${Date.now()}.jpg`);
            
            try {
                // 2. ترجمة سريعة (Google API مستقر جداً)
                const trans = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(prompt)}`);
                const enPrompt = trans.data[0][0][0];

                // 3. استخدام سيرفر Pollinations (Flux) لأنه أسرع بـ 10 أضعاف من الماجيك
                // الماجيك بياخد دقيقة، ده بياخد 5 ثواني بس!
                const seed = Math.floor(Math.random() * 1e12);
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enPrompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

                const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 60000 });
                
                await fs.ensureDir(path.join(__dirname, 'cache'));
                await fs.writeFile(cachePath, Buffer.from(imgRes.data));

                // 4. إرسال الصورة ومسح الرسالة القديمة أو التفاعل
                await api.sendMessage({
                    body: `✅ تم التوليد بنجاح\n📝 وصفك: ${prompt}`,
                    attachment: fs.createReadStream(cachePath)
                }, threadID, () => {
                    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
                }, messageID);

                api.setMessageReaction("✅", messageID, () => {}, true);

            } catch (e) {
                console.error(e);
                api.sendMessage("⚠️ السيرفر مضغوط حالياً، جرب تاني.", threadID, messageID);
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            }
        }, messageID);
    }
};
