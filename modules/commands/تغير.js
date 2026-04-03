const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const moment = require("moment-timezone");

module.exports = {
    config: { 
        name: "تغير", 
        aliases: ["تغير"], 
        version: "1.5.0", 
        author: "Sinko", 
        countDown: 10, 
        role: 2, 
        category: "المالك" 
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, messageReply, attachments } = event;
        const timeNow = moment.tz("Africa/Khartoum");
        const timeStr = timeNow.format("hh:mm A");

        let imageURL = "";
        if (event.type == "message_reply") {
            imageURL = messageReply.attachments[0]?.url;
        } else if (attachments && attachments.length != 0) {
            imageURL = attachments[0].url;
        }

        if (!imageURL) return api.sendMessage("> ˼⚠️˹↜ رد على صورة يا ملك عشان أغيرها. ↶", threadID, messageID);

        api.setMessageReaction("⌛", messageID, () => {}, true);

        const waitingBody = `> ˼🖼️˹↜ تـحديث الـمظهر ↶
╮──────────────⟢ـ
┆˼⚕️˹┊ الـحـالـة ↜｢جاري المعالجة｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
╯──────────────⟢ـ
> ˼🌌˹↜  Aplin Bot ↶`;

        api.sendMessage(waitingBody, threadID, async (err, info) => {
            // إنشاء مسار للملف المؤقت في مجلد cache
            const cachePath = path.join(__dirname, 'cache', `avt_${Date.now()}.jpg`);
            
            try {
                // تحميل الصورة وحفظها مؤقتاً
                const imgRes = await axios.get(imageURL, { responseType: 'arraybuffer' });
                await fs.outputFile(cachePath, Buffer.from(imgRes.data));

                // رفع الصورة للفيس بوك من الملف المحلي
                api.changeAvatar(fs.createReadStream(cachePath), "", null, (err) => {
                    if (err) {
                        api.setMessageReaction("❌", messageID, () => {}, true);
                        return api.sendMessage(`> ˼❌˹↜ فشل الرفع: تأكد من حساب البوت.`, threadID, messageID);
                    }

                    const successBody = `> ˼✅˹↜ تـم الـتـنـفـيـذ ↶
╮──────────────⟢ـ
┆˼✨˹┊ الـنـتـيـجـة ↜｢ تـم الـتـغـيـيـر ｣
╯──────────────⟢ـ
> ˼⌬˹ مـظهـر إبـلـين الـجديـد جـاهز! ⚖️`;

                    api.sendMessage(successBody, threadID, () => {
                        if (fs.existsSync(cachePath)) fs.removeSync(cachePath); // حذف الملف بعد النجاح
                    }, messageID);
                    
                    api.setMessageReaction("✅", messageID, () => {}, true);
                    if (info) api.unsendMessage(info.messageID);
                });

            } catch (e) {
                api.sendMessage("⚠️ السيرفر رفض جلب الصورة، جرب صورة من مصدر تاني.", threadID, messageID);
                if (fs.existsSync(cachePath)) fs.removeSync(cachePath);
                api.setMessageReaction("❌", messageID, () => {}, true);
            }
        }, messageID);
    }
};
