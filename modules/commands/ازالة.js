const axios = require('axios');
const fs = require('fs-extra');

module.exports = {
    config: {
        name: "ازالة",
        version: "1.1",
        author: "سينكو 17Y",
        countDown: 10,
        description: "إزالة خلفية الصور باستخدام الذكاء الاصطناعي مع تفاعلات",
        category: "ai",
        guide: { ar: "{pn} [قم بالرد على صورة]" }
    },

    onStart: async function ({ api, event }) {
        // التحقق من وجود صورة في الرد
        if (event.type !== "message_reply" || !event.messageReply.attachments[0] || event.messageReply.attachments[0].type !== "photo") {
            return api.sendMessage("⚠️ يرجى الرد على الصورة التي تريد إزالة خلفيتها.", event.threadID);
        }

        // المفتاح الجديد الخاص بك
        const apiKey = "HFFKEPxm9Ytaxh2VUdJE2K8f"; 
        const imageUrl = event.messageReply.attachments[0].url;
        const path = __dirname + `/cache/removed_bg.png`;

        // التفاعل بالساعة لبدء العملية
        api.setMessageReaction("⚙️", event.messageID, (err) => {}, true);

        try {
            const response = await axios({
                method: 'post',
                url: 'https://api.remove.bg/v1.0/removebg',
                data: {
                    image_url: imageUrl,
                    size: 'auto'
                },
                headers: {
                    'X-Api-Key': apiKey
                },
                responseType: 'arraybuffer'
            });

            fs.writeFileSync(path, response.data);

            // التفاعل بعلامة الصح عند النجاح
            api.setMessageReaction("✔️", event.messageID, (err) => {}, true);

            await api.sendMessage({
                body: "✨ تم إزالة الخلفية بنجاح",
                attachment: fs.createReadStream(path)
            }, event.threadID);
            
            fs.unlinkSync(path);

        } catch (error) {
            console.error(error);
            // التفاعل بعلامة الخطأ في حال الفشل
            api.setMessageReaction("❌", event.messageID, (err) => {}, true);
            api.sendMessage("❌ حدث خطأ! قد يكون الرصيد انتهى أو الصورة غير صالحة.", event.threadID);
        }
    }
};
