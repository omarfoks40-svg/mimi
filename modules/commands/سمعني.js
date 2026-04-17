const axios = require("axios");
const ytdl = require("ytdl-core");
const fs = require("fs-extra");

module.exports = {
    config: {
        name: "سمعني",
        version: "1.0.1",
        author: "Thiệu Trung Kiên",
        countDown: 10,
        description: "البحث عن الأغاني والموسيقى من يوتيوب وتشغيلها مع تفاعلات",
        category: "media",
        prefix: true,
        guide: { ar: "{pn} [اسم الأغنية أو رابط يوتيوب]" }
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, senderID } = event;
        const KeywordsOrLink = args.join(" ");

        const isYouTubeLink = (url) => /^(https?:\/\/)?(www\.)?(youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);

        if (!KeywordsOrLink) {
            return api.sendMessage("⚠️ يرجى إدخال اسم الأغنية أو رابط يوتيوب!", threadID, messageID);
        }

        // تفاعل الترس عند بدء العملية
        api.setMessageReaction("⚙️", messageID, (err) => {}, true);

        if (isYouTubeLink(KeywordsOrLink)) {
            return await downloadMusic(api, event, KeywordsOrLink);
        } else {
            try {
                const res = await axios.get(encodeURI(`https://ditmemaykkkk.com/api/youtube/search?query=${KeywordsOrLink}`));
                const results = res.data.results || [];

                if (results.length === 0) {
                    api.setMessageReaction("❌", messageID, (err) => {}, true);
                    return api.sendMessage(`❌ لم يتم العثور على نتائج لـ: ${KeywordsOrLink}`, threadID, messageID);
                }

                let message = "✨ نتائج البحث (رد برقم الأغنية):\n\n";
                let attachments = [];
                let musicData = [];
                let cachePaths = [];

                for (let i = 0; i < results.length && i < 6; i++) {
                    const music = results[i].video;
                    const path = __dirname + `/cache/thumb_${senderID}_${i}.jpg`;
                    
                    const imgRes = await axios.get(music.thumbnail_src, { responseType: "arraybuffer" });
                    fs.writeFileSync(path, Buffer.from(imgRes.data));
                    
                    message += `${i + 1}. ${music.title}\n⏱️ المدة: ${music.duration}\n\n`;
                    attachments.push(fs.createReadStream(path));
                    musicData.push(results[i]);
                    cachePaths.push(path);
                }

                // تفاعل الصح عند عرض النتائج بنجاح
                api.setMessageReaction("✔️", messageID, (err) => {}, true);

                return api.sendMessage({
                    body: message,
                    attachment: attachments
                }, threadID, (err, info) => {
                    cachePaths.forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });

                    if (!err) {
                        global.client.handleReply.push({
                            name: "سمعني",
                            messageID: info.messageID,
                            author: senderID,
                            musicData: musicData,
                            type: "choose"
                        });
                    }
                }, messageID);

            } catch (error) {
                console.error(error);
                api.setMessageReaction("❌", messageID, (err) => {}, true);
                return api.sendMessage("❌ حدث خطأ أثناء البحث عن الأغنية.", threadID, messageID);
            }
        }
    },

    onReply: async function ({ api, event, handleReply }) {
        const { body, threadID, messageID, senderID } = event;
        if (handleReply.author !== senderID) return;

        if (handleReply.type === "choose") {
            const index = parseInt(body) - 1;
            if (isNaN(index) || index < 0 || index >= handleReply.musicData.length) {
                return api.sendMessage("🚫 اختيار غير صالح، اختر رقم من القائمة.", threadID, messageID);
            }

            const selected = handleReply.musicData[index].video;
            api.unsendMessage(handleReply.messageID);
            
            // تفاعل الترس عند بدء تحميل الأغنية المختارة
            api.setMessageReaction("⚙️", messageID, (err) => {}, true);
            return await downloadMusic(api, event, selected.url, selected.title);
        }
    }
};

async function downloadMusic(api, event, url, title = "") {
    const path = __dirname + `/cache/sing_${Date.now()}.mp3`;
    const { threadID, messageID } = event;

    try {
        const stream = ytdl(url, { quality: "lowestaudio" });
        const file = fs.createWriteStream(path);

        stream.pipe(file);

        file.on("finish", () => {
            // تفاعل الصح عند إرسال الأغنية بنجاح
            api.setMessageReaction("✔️", messageID, (err) => {}, true);
            
            api.sendMessage({
                body: `🎵 تم التحميل: ${title}`,
                attachment: fs.createReadStream(path)
            }, threadID, () => {
                if (fs.existsSync(path)) fs.unlinkSync(path);
            }, messageID);
        });

    } catch (error) {
        console.error(error);
        api.setMessageReaction("❌", messageID, (err) => {}, true);
        if (fs.existsSync(path)) fs.unlinkSync(path);
        return api.sendMessage("❌ فشل تحميل الملف الصوتي.", threadID, messageID);
    }
}
