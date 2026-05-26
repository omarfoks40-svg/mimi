const axios = require('axios');
const fs = require('fs');
const path = require('path');

// دالة الترجمة التلقائية المستقرة عبر خوادم جوجل السحابية
async function translateToEnglish(text) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url);
        return res.data[0].map(item => item[0]).join('');
    } catch (e) {
        return text; // خطة بديلة: إرسال النص الأصلي في حال فشل الترجمة
    }
}

module.exports = {
    config: {
        name: 'تحريك',
        aliases: ['تخيل_فيديو', 'video', 'veo', 'صنع_فيديو'],
        version: '3.0',
        author: 'سينكو',
        countDown: 15,
        prefix: true,
        category: 'ذكاء اصطناعي',
        description: '🎬 تحريك وتوليد فيديوهات احترافية بنظام حماية ذكي ضد الفشل وضغط السيرفرات.',
        guide: { ar: '{pn} <الوصف بالعربي> أو رد على صورة واكتب {pn}' }
    },

    onStart: async ({ api, event, args }) => {
        const { threadID, messageID, type, messageReply } = event;

        let userPrompt = args.join(" ");
        let imageUrl = null;

        // سحب رابط الصورة من الماسنجر في حال الرد
        if (type === "message_reply" && messageReply.attachments && messageReply.attachments.length > 0) {
            const attachment = messageReply.attachments[0];
            if (attachment.type === "photo") {
                imageUrl = attachment.url;
            }
        }

        if (!userPrompt && !imageUrl) {
            return api.sendMessage(
                `....................\n` +
                `. 🎬 AI ANIMATOR   .\n` +
                `....................\n` +
                `. ⚠️ اكتب وصفاً بالعربي .\n` +
                `. أو رد على صورة لتحريكها .\n` +
                `....................`,
                threadID, messageID
            );
        }

        // إرسال شاشة المعالجة التنقيطية الموزونة والخاصة بالماسنجر
        const msg = await api.sendMessage(
            `....................\n` +
            `. 🎬 AI ANIMATOR   .\n` +
            `....................\n` +
            `. [ ⏳ 20% ]        .\n` +
            `. 🔍 جاري معالجة النص .\n` +
            `. والترجمة الذكية... .\n` +
            `....................`,
            threadID
        );

        try {
            // 1️⃣ الترجمة الفورية خلف الكواليس
            let finalPromptEn = "cinematic camera movement, high quality, 4k, smooth animation";
            if (userPrompt) {
                finalPromptEn = await translateToEnglish(userPrompt);
            }

            await api.editMessage(
                `....................\n` +
                `. 🎬 AI ANIMATOR   .\n` +
                `....................\n` +
                `. [ ⚙️ 60% ]        .\n` +
                `. 📡 جاري رندرة الفيديو .\n` +
                `. عبر خوادم الذكاء... .\n` +
                `....................`,
                msg.messageID
            );

            // 2️⃣ مصفوفة الموديلات المتاحة للتحريك (لتجنب ضغط السيرفر الخارجي)
            // الخطة A: veo (جوجل) | الخطة B: wan (علي بابا) | الخطة C: ltxvideo
            const modelsToTry = ['veo', 'wan', 'ltxvideo'];
            let response = null;
            let successModel = '';

            // تشفير دقيق ومأمن للنص ورابط الصورة لمنع كسر الروابط
            const encodedPrompt = encodeURIComponent(finalPromptEn);
            const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : '';

            // حلقة ذكية تجرب الموديلات واحد ورا التاني لو الأول فشل
            for (const model of modelsToTry) {
                try {
                    let apiUrl = `https://gen.pollinations.ai/video/${encodedPrompt}?model=${model}&duration=4`;
                    if (imageUrl) {
                        apiUrl += `&image=${encodedImage}`;
                    }

                    // محاولة سحب الفيديو من الموديل الحالي مع مهلة انتظار 45 ثانية
                    response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 45000 });
                    
                    if (response && response.data) {
                        successModel = model;
                        break; // خرجنا من الحلقة طالما التوليد نجح!
                    }
                } catch (modelError) {
                    console.log(`⚠️ الموديل [${model}] مشغول حالياً، جاري التبديل للموديل البديل...`);
                    continue; // الموديل الحالي فشل، طيران للموديل البعده تلقائياً
                }
            }

            // إذا مرت الحلقة على كل الموديلات وفشلت كلها بسبب سقوط السيرفر الخارجي بالكامل
            if (!response || !response.data) {
                throw new Error("All AI models are currently offline or overloaded.");
            }

            // 3️⃣ حفظ مقطع الفيديو في مجلد الكاش المؤقت
            const cacheDir = path.join(__dirname, 'cache');
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir);
            }

            const videoPath = path.join(cacheDir, `ai_video_${Date.now()}.mp4`);
            fs.writeFileSync(videoPath, Buffer.from(response.data, 'binary'));

            // 4️⃣ التعديل النهائي قبل الرفع للروم
            await api.editMessage(
                `....................\n` +
                `. ✅ SUCCESS 100%  .\n` +
                `....................\n` +
                `. 📤 جاري رفع المقطع .\n` +
                `. داخل الروم الآن... .\n` +
                `....................`,
                msg.messageID
            );

            // إرسال الفيديو النهائي وحذفه فوراً للحفاظ على مساحة جهازك
            return api.sendMessage({
                body: `🎬 تم التوليد والتحريك بنجاح!\n\n📝 طلبك: ${userPrompt || "تحريك صورة ثابتة"}\n⚙️ الموديل النشط: ${successModel.toUpperCase()}`,
                attachment: fs.createReadStream(videoPath)
            }, threadID, () => {
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            }, messageID);

        } catch (error) {
            console.error("AI Video Critical Error:", error);
            // إعلام الجروب بالفشل النهائي في حال سقوط الشبكة الخارجية بالكامل
            return api.editMessage(
                `....................\n` +
                `. ❌ AI ERROR      .\n` +
                `....................\n` +
                `. السيرفر الخارجي مضغوط .\n` +
                `. يرجى المحاولة لاحقاً .\n` +
                `....................`,
                msg.messageID
            );
        }
    }
};
