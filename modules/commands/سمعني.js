const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const moment = require("moment-timezone");

// دالة لجلب رابط السيرفر الأول من جيت هاب
const getUllashBaseUrl = async () => {
  try {
    const res = await axios.get("https://raw.githubusercontent.com/cyber-ullash/cyber-ullash/refs/heads/main/UllashApi.json", { timeout: 4000 });
    return res.data.api;
  } catch (e) {
    return null;
  }
};

module.exports = {
  config: {
    name: 'اغنية',
    aliases: ['اغنيه', 'صوت', 'sing', 'song'],
    version: '3.0.0',
    author: 'SINKO & Azad',
    countDown: 5,
    prefix: true,
    category: 'media',
    description: 'تحميل أغاني بنظام السيرفرات المتبادلة لضمان عدم التوقف مع زخرفة ملكية',
    guide: { ar: '{pn} <اسم الأغنية>' }
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, senderID: userId } = event;
    const query = args.join(' ').trim();

    if (!query) {
      return api.sendMessage('> ⏣ ◍ أكتب اسم الأغنية التي تبحث عنها يا سنيور 🙄', threadID, messageID);
    }

    // تفاعل البحث
    api.setMessageReaction("🔍", messageID, () => {}, true);
    const infoMsg = await api.sendMessage('> ✾ ┇ جاري البحث عن طلبك... أصبر شوية 🥱', threadID, messageID);
    const processingID = infoMsg.messageID;

    const cachePath = path.join(__dirname, 'cache');
    fs.ensureDirSync(cachePath);

    let results = [];
    let usedServer = ""; 
    let ullashUrl = await getUllashBaseUrl();

    // 1. محاولة البحث من السيرفر الأول
    if (ullashUrl) {
      try {
        const searchRes = await axios.get(`${ullashUrl}/ytFullSearch?songName=${encodeURIComponent(query)}`, { timeout: 15000 });
        if (searchRes.data && searchRes.data.length > 0) {
          results = searchRes.data.slice(0, 6).map(item => ({
            title: item.title,
            time: item.time,
            id: item.id, // رابط أو معرف الفيديو
            thumbnail: item.thumbnail
          }));
          usedServer = "ullash";
        }
      } catch (e) {
        console.log("[Aplin Music] فشل البحث من السيرفر الأول، جاري التحويل للسيرفر الثاني...");
      }
    }

    // 2. الخطة البديلة: البحث من سيرفر Azad لو الأول فشل
    if (results.length === 0) {
      try {
        const searchRes = await axios.get(`https://azadx69x-all-apis-top.vercel.app/api/sing?song=${encodeURIComponent(query)}`, { timeout: 15000 });
        if (searchRes.data?.success && searchRes.data?.info) {
          // السيرفر الثاني يعطي نتيجة واحدة مباشرة، نضعها في مصفوفة لتتوافق مع نظام الرد
          const info = searchRes.data.info;
          results.push({
            title: info.title,
            time: info.duration || "غير معروف",
            id: query, // نستخدم نفس النص للبحث مجدداً عند التحميل
            thumbnail: info.image || info.thumbnail || "",
            directUrl: searchRes.data.audio?.url || null
          });
          usedServer = "azad";
        }
      } catch (e) {
        console.error("[Aplin Music] فشل البحث من السيرفر الثاني أيضاً:", e.message);
      }
    }

    // إذا فشلت كل سيرفرات البحث
    if (results.length === 0) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.editMessage('> ⏣ ❌ ما لقيت شي.. غايتو ذوقك ده غريب أو السيرفرات واقفة 😒', processingID);
    }

    // بناء قائمة النتائج المزخرفة (ثيم Aplin الملكي)
    let msg = `> ˼🌌˹↜  Aplin Music  ↶\n╮──────────────⟢ـ\n`;
    let attachments = [];
    let cacheFiles = [];

    for (let i = 0; i < results.length; i++) {
      msg += `  ${i + 1}. ｢ ${results[i].title} ｣\n┆⏱️ الـزمن: ${results[i].time}\n`;
      if (i < results.length - 1) msg += `┆⸻⸻⸻⸻⸻\n`;

      // تحميل بوستر الأغنية لو متوفر
      if (results[i].thumbnail) {
        const imgPath = path.join(cachePath, `thumb_${crypto.randomBytes(4).toString('hex')}_${i}.jpg`);
        try {
          const imgRes = await axios.get(results[i].thumbnail, { responseType: 'arraybuffer', timeout: 5000 });
          fs.writeFileSync(imgPath, Buffer.from(imgRes.data));
          attachments.push(fs.createReadStream(imgPath));
          cacheFiles.push(imgPath);
        } catch (e) { /* تخطي لو الصورة فيها مشكلة */ }
      }
    }

    msg += `╯──────────────⟢ـ\n> 📥 رد بـرقم الأغنية لـلـتـحـميل يا ملك`;

    // حذف رسالة الانتظار وإرسال القائمة
    api.unsendMessage(processingID);

    api.sendMessage({
      body: msg,
      attachment: attachments
    }, threadID, (err, info) => {
      // مسح صور الكاش فوراً بعد الإرسال لحماية مساحة راندر
      cacheFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });

      if (!err && global.client && global.client.handleReply) {
        global.client.handleReply.push({
          name: 'اغنية',
          messageID: info.messageID,
          author: userId,
          result: results,
          usedServer: usedServer,
          ullashUrl: ullashUrl
        });
      }
    }, messageID);
  },

  onReply: async ({ api, event, handleReply }) => {
    const { threadID, messageID, body, senderID } = event;
    if (handleReply.author != senderID) return;

    const choice = parseInt(body);
    if (isNaN(choice) || choice > handleReply.result.length || choice <= 0) {
      return api.sendMessage("> ركز يا ملك.. اختر رقم متاح في القائمة فقط 🙄", threadID, messageID);
    }

    api.unsendMessage(handleReply.messageID);
    api.setMessageReaction("📥", messageID, () => {}, true);
    const loading = await api.sendMessage("> ✾ ┇ جاري التحميل ومعالجة الصوت... أصبر لي ثواني 📥", threadID);

    const selected = handleReply.result[choice - 1];
    const filePath = path.join(__dirname, 'cache', `music_${crypto.randomBytes(4).toString('hex')}.mp3`);
    fs.ensureDirSync(path.join(__dirname, 'cache'));

    let downloadUrl = null;
    let success = false;

    // 1. نظام التحميل البديل التلقائي (المرور على السيرفرات لمنع الفشل)
    // المحاولة الأولى: السيرفر المعتمد على نتيجة البحث المبدئية
    if (handleReply.usedServer === "ullash" && handleReply.ullashUrl) {
      try {
        const dlRes = await axios.get(`${handleReply.ullashUrl}/ytDl3?link=${selected.id}&format=mp3`, { timeout: 20000 });
        if (dlRes.data?.downloadLink) {
          downloadUrl = dlRes.data.downloadLink;
        }
      } catch (e) {
        console.log("[Aplin Music] فشل سيرفر التحميل الأول، سيتم التحويل لسيرفر Azad البديل...");
      }
    } else if (handleReply.usedServer === "azad" && selected.directUrl) {
      downloadUrl = selected.directUrl;
    }

    // إذا فشل السيرفر المختار أو كنا بحاجة لتجربة سيرفر Azad كخطة بديلة للأول
    if (!downloadUrl) {
      try {
        const altRes = await axios.get(`https://azadx69x-all-apis-top.vercel.app/api/sing?song=${encodeURIComponent(selected.title)}`, { timeout: 20000 });
        if (altRes.data?.success && altRes.data?.audio?.url) {
          downloadUrl = altRes.data.audio.url;
        }
      } catch (e) {
        console.error("[Aplin Music] فشل سيرفر التحميل البديل أيضاً:", e.message);
      }
    }

    // 2. بدء تحميل ملف الـ MP3 الفعلي إذا وجدنا رابطاً صالحاً
    if (downloadUrl) {
      try {
        const response = await axios({
          method: 'get',
          url: downloadUrl,
          responseType: 'arraybuffer',
          timeout: 60000,
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        fs.writeFileSync(filePath, Buffer.from(response.data));
        success = true;
      } catch (err) {
        console.error("[Aplin Music] خطأ أثناء تحميل بايتات الملف:", err.message);
      }
    }

    // 3. النتيجة النهائية للمستخدم
    if (success) {
      const timeNow = moment.tz("Africa/Khartoum");
      const dateStr = timeNow.format("DD MMMM YYYY");
      const timeStr = timeNow.format("hh:mm A");

      const finalMsg = `> ˼🌌˹↜  Aplin Music  ↶
╮──────────────⟢ـ
┆˼✅˹┊ الـحـالة ↜｢ تم التحميل بنجاح ｣
┆˼🎵˹┊ الـعنوان ↜｢ ${selected.title} ｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
╯──────────────⟢ـ
> 🎧 جـاهـز لـلإسـتـمـاع يا ملك`;

      await api.sendMessage({
        body: finalMsg,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

      api.unsendMessage(loading.messageID);

    } else {
      // فشلت كل المحاولات والسيرفرات
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("> ⏣ ❌ الملف حجمه كبير شديد أو السيرفرات تعبانة حالياً، جرب أغنية تانية يا وهم 😒", threadID, messageID);
      api.unsendMessage(loading.messageID);
    }
  }
};
