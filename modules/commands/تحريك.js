const axios = require('axios');
const fs = require('fs');
const path = require('path');

// دالة الترجمة التلقائية المدمجة السريعة عبر خوادم جوجل المستقرة
async function translateToEnglish(text) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url);
        return res.data[0].map(item => item[0]).join('');
    } catch (e) {
        return text; // في حال حدوث خطأ نادر، نرسل النص كما هو كخطة بديلة
    }
}

module.exports = {
    config: {
        name: 'تحريك',
        aliases: ['تخيل_فيديو', 'video', 'veo', 'صنع_فيديو'],
        version: '2.0',
        author: 'سينكو',
        countDown: 20, // وقت تبريد مريح لمنع السبام أثناء المعالجة
        prefix: true,
        category: 'ai',
        description: '🎬 توليد وتحريك فيديوهات احترافية من النصوص العربية (تترجم تلقائياً) أو الرد على الصور.',
        guide: { ar: '{pn} <وصف الفيديو بالعربي> أو رد على صورة واكتب {pn} <طبيعة الحركة>' }
    },

    onStart: async ({ api, event, args }) => {
        const { threadID, messageID, type, messageReply } = event;

        let userPrompt = args.join(" ");
        let imageUrl = null;

        // التحقق مما إذا كان المستخدم يود تحريك صورة عبر الرد (Reply)
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

        // 1️⃣ إرسال رسالة التجهيز والتعديل الحي المضغوطة الموزونة للماسنجر
        const msg = await api.sendMessage(
            `....................\n` +
            `. 🎬 AI ANIMATOR   .\n` +
            `....................\n` +
            `. [ ⏳ 15% ]        .\n` +
            `. 🔍 جاري قراءة النص .\n` +
            `. والترجمة الفورية... .\n` +
            `....................`,
            threadID
        );

        try {
            // تنفيذ الترجمة التلقائية إلى الإنجليزية خلف الكواليس
            let finalPromptEn = "cinematic camera movement, slow motion, high quality";
            if (userPrompt) {
                finalPromptEn = await translateToEnglish(userPrompt);
            }

            // تحديث حالة المعالجة حياً لإعلام الأعضاء بالترجمة والبدء
            await api.editMessage(
                `....................\n` +
                `. 🎬 AI ANIMATOR   .\n` +
                `....................\n` +
                `. [ ⚙️ 50% ]        .\n` +
                `. 🧠 تم التمرير لـ Veo .\n` +
                `. جاري رندرة اللقطات .\n` +
                `....................`,
                msg.messageID
            );

            // 2️⃣ بناء رابط الطلب لـ API الفيديوهات باستخدام النص المترجم
            let apiUrl = `https://gen.pollinations.ai/video/${encodeURIComponent(finalPromptEn)}?model=veo&duration=4`;

            // إذا كانت هناك صورة، نمررها في الرابط أيضاً ليتم تحريكها بناء على الترجمة
            if (imageUrl) {
                apiUrl += `&image=${encodeURIComponent(imageUrl)}`;
            }

            // لفة أنيميشن حركية أخيرة قبل السحب المباشر
            await new Promise(r => setTimeout(r, 1500));
            await api.editMessage(
                `....................\n` +
                `. 🎬 AI ANIMATOR   .\n` +
                `....................\n` +
                `. [ ⚡ 85% ]        .\n` +
                `. 🎞️ جاري سحب المقطع .\n` +
                `. وتحميل اللقطات... .\n` +
                `....................`,
                msg.messageID
            );

            // 3️⃣ سحب الفيديو كـ Buffer من سيرفرات الذكاء الاصطناعي
            const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
            
            // تحديد مسار مؤقت نظيف داخل مجلد الكاش
            const videoPath = path.join(__dirname, 'cache', `ai_video_${Date.now()}.mp4`);
            
            if (!fs.existsSync(path.join(__dirname, 'cache'))) {
                fs.mkdirSync(path.join(__dirname, 'cache'));
            }

            fs.writeFileSync(videoPath, Buffer.from(response.data, 'binary'));

            // 4️⃣ التعديل النهائي الناجح قبل إرسال المقطع في الروم
            await api.editMessage(
                `....................\n` +
                `. ✅ SUCCESS 100%  .\n` +
                `....................\n` +
                `. 📤 جاري رفع المقطع .\n` +
                `. داخل الروم الآن... .\n` +
                `....................`,
                msg.messageID
            );

            // إرسال مقطع الفيديو النهائي وتثبيته في الشات كمرفق مع عرض الترجمة للأعضاء
            return api.sendMessage({
                body: `🎬 تم توليد مقطعك السينمائي بنجاح!\n\n📝 طلبك: ${userPrompt || "تحريك صورة"}\n🌐 الترجمة الذكية: ${finalPromptEn}\n⚙️ الموديل: Google Veo`,
                attachment: fs.createReadStream(videoPath)
            }, threadID, () => {
                // مسح ملف الفيديو المؤقت تلقائياً لتوفير مساحة الذاكرة في السيرفر
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            }, messageID);

        } catch (error) {
            console.error("AI Video Error:", error);
            
            // إخطار الروم بالفشل في حال حدوث ضغط على السيرفر الخارجي للرندرة
            return api.editMessage(
                `....................\n` +
                `. ❌ AI ERROR      .\n` +
                `....................\n` +
                `. فشل خادم التوليد  .\n` +
                `. يرجى المحاولة لاحقاً .\n` +
                `....................`,
                msg.messageID
            );
        }
    }
};
