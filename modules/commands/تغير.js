const axios = require('axios');
const moment = require("moment-timezone");

module.exports = {
    config: { 
        name: "تغير", 
        aliases: ["تغيير_البروفايل"], 
        version: "1.0.0", 
        author: "Sinko", 
        countDown: 10, 
        role: 2, 
        category: "owner" 
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, messageReply, attachments } = event;
        
        // توقيت السودان زي كود نانو
        const timeNow = moment.tz("Africa/Khartoum");
        const timeStr = timeNow.format("hh:mm A");

        let imageURL = "";
        if (event.type == "message_reply") {
            imageURL = messageReply.attachments[0]?.url;
        } else if (attachments && attachments.length != 0) {
            imageURL = attachments[0].url;
        } else if (args[0] && args[0].includes("http")) {
            imageURL = args[0];
        }

        if (!imageURL) return api.sendMessage("> ˼⚠️˹↜ رد على صورة  عشان أغيرها. ↶", threadID, messageID);

        api.setMessageReaction("⌛", messageID, () => {}, true);

        const waitingBody = `> ˼🖼️˹↜ تـحديث الـمظهر ↶
╮──────────────⟢ـ
┆˼⚕️˹┊ الـحـالـة ↜｢جاري الرفع｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
╯──────────────⟢ـ
> ˼🌌˹↜  Aplin Bot ↶
جاري تغيير بروفايل إبلين`;

        api.sendMessage(waitingBody, threadID, async (err, info) => {
            try {
                const response = await axios.get(imageURL, { responseType: "stream" });
                
                api.changeAvatar(response.data, "", null, (err) => {
                    if (err) {
                        api.setMessageReaction("❌", messageID, () => {}, true);
                        return api.sendMessage(`> ˼❌˹↜ فشل التحديث: ${err.message}`, threadID, messageID);
                    }

                    const successBody = `> ˼✅˹↜ تـم الـتـنـفـيـذ ↶
╮──────────────⟢ـ
┆˼✨˹┊ الـنـتـيـجـة ↜｢ تـم الـتـغـيـيـر ｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
╯──────────────⟢ـ
> ˼⌬˹ مـظهـر إبـلـين الـجديـد جـاهز! ⚖️`;

                    api.sendMessage(successBody, threadID, messageID);
                    api.setMessageReaction("✅", messageID, () => {}, true);
                    if (info) api.unsendMessage(info.messageID); // حذف رسالة الانتظار
                });
            } catch (e) {
                api.sendMessage("⚠️ حدث خطأ في السيرفر، جرب صورة تانية.", threadID, messageID);
                api.setMessageReaction("❌", messageID, () => {}, true);
            }
        }, messageID);
    }
};
