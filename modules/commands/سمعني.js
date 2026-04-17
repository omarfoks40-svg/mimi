const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: 'اغنية',
        version: '2.5',
        author: 'سينكو',
        countDown: 5,
        prefix: true,
        category: 'media',
        description: 'تحميل أغاني من يوتيوب مع عرض الصور والزخرفة.',
        guide: {
            ar: '{pn} <اسم الأغنية>'
        }
    },

    onStart: async ({ api, event, args }) => {
        const { threadID, messageID, senderID: userId } = event;
        const query = args.join(' ').trim();

        if (!query) {
            return api.sendMessage('⏣ ◍ أكتب اسم الأغنية التي تبحث عنها يا سنيور 🙄', threadID, messageID);
        }

        const infoMsg = await api.sendMessage('✾ ┇ جاري البحث... أصبر شوية 🥱', threadID, messageID);
        const processingID = infoMsg.messageID;

        try {
            const getApi = await axios.get(`https://raw.githubusercontent.com/cyber-ullash/cyber-ullash/refs/heads/main/UllashApi.json`);
            const baseUrl = getApi.data.api;

            // البحث عن الأغاني
            const searchRes = await axios.get(`${baseUrl}/ytFullSearch?songName=${encodeURIComponent(query)}`);
            const results = searchRes.data.slice(0, 6);

            if (results.length === 0) {
                return api.editMessage('⏣ ❌ ما لقيت شي.. غايتو ذوقك ده غريب 😒', processingID);
            }

            let msg = `⏣────── ✾ ⌬ ✾ ──────⏣\n \n  ⏣ ⟬ نـتـائـج الـبـحـث ⟭\n`;
            
            const cachePath = path.join(__dirname, 'cache');
            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

            let attachments = [];
            let cacheFiles = [];

            for (let i = 0; i < results.length; i++) {
                msg += `  ${i + 1}. ${results[i].title}\n✾ ┇ ⏱️ الـزمن: ${results[i].time}\n✾ ┇ ⸻⸻⸻⸻⸻\n`;
                
                // تحميل الصور المصغرة
                const imgPath = path.join(cachePath, `thumb_${userId}_${i}.jpg`);
                try {
                    const imgRes = await axios.get(results[i].thumbnail, { responseType: 'arraybuffer' });
                    fs.writeFileSync(imgPath, Buffer.from(imgRes.data));
                    attachments.push(fs.createReadStream(imgPath));
                    cacheFiles.push(imgPath);
                } catch (e) { console.error("خطأ في الصورة"); }
            }

            msg += `\n   رد بـرقم الأغنية لـلـتـحـميل 📥\n⏣────── ✾ ⌬ ✾ ──────⏣`;

            // حذف رسالة "جاري البحث" وإرسال النتائج الجديدة مع الصور
            api.unsendMessage(processingID);
            
            api.sendMessage({
                body: msg,
                attachment: attachments
            }, threadID, (err, info) => {
                // مسح صور الكاش بعد الإرسال
                cacheFiles.forEach(f => { if(fs.existsSync(f)) fs.unlinkSync(f); });

                if (!err && global.client && global.client.handleReply) {
                    global.client.handleReply.push({
                        name: 'اغنية',
                        messageID: info.messageID,
                        author: userId,
                        result: results,
                        baseUrl: baseUrl
                    });
                }
            }, messageID);

        } catch (error) {
            console.error(error);
            api.editMessage(`⏣ ❌ السيرفر تعبان شوية.. جرب تاني يا وهم 😒`, processingID);
        }
    },

    onReply: async ({ api, event, handleReply }) => {
        const { threadID, messageID, body, senderID } = event;
        if (handleReply.author != senderID) return;

        try {
            const choice = parseInt(body);
            if (isNaN(choice) || choice > handleReply.result.length || choice <= 0) {
                return api.sendMessage("  ركز.. اختر رقم من 1 لـ 6 فقط 🙄", threadID, messageID);
            }

            api.unsendMessage(handleReply.messageID);
            const loading = await api.sendMessage("✾ ┇ جاري التحميل... أصبر لي ثواني 📥🥱", threadID);

            const selected = handleReply.result[choice - 1];
            // رابط التحميل من الـ API حقك
            const downloadRes = await axios.get(`${handleReply.baseUrl}/ytDl3?link=${selected.id}&format=mp3`);
            
            const filePath = path.join(__dirname, 'cache', `music_${senderID}.mp3`);
            
            const response = await axios({
                method: 'get',
                url: downloadRes.data.downloadLink,
                responseType: 'arraybuffer'
            });

            fs.writeFileSync(filePath, Buffer.from(response.data));

            const finalMsg = 
`⏣────── ✾ ⌬ ✾ ──────⏣
✾ ┇ ✅ تـم الـتـحـويـل بـنـجـاح!
✾ ┇ ◍ الـعنوان: ${selected.title}
✾ ┇ ◍ الـحـالة: جـاهـز لـلإسـتـمـاع
⏣────── ✾ ⌬ ✾ ──────⏣`;

            await api.sendMessage({
                body: finalMsg,
                attachment: fs.createReadStream(filePath)
            }, threadID, () => {
                if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }, messageID);

            api.unsendMessage(loading.messageID);

        } catch (e) {
            console.error(e);
            api.sendMessage("⏣ ❌ الملف حجمه كبير أو السيرفر مضغوط 😒", threadID, messageID);
        }
    }
};
