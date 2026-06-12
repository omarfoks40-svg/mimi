const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const moment = require("moment-timezone");

const baseApi = "https://azadx69x-all-apis-top.vercel.app/api/mj";

// دالة الترجمة التلقائية لضمان دقة خرافية لتوليد الصور
const translateText = async (text) => {
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`, { timeout: 5000 });
    return res.data[0][0][0];
  } catch (error) {
    return text; // إذا فشلت الترجمة يرسل النص العربي كملاذ أخير
  }
};

module.exports = {
  config: {
    name: "ميدجيرني",
    aliases: ["تخيل", "mj", "midjourney"],
    version: "1.0.0",
    author: "Azad & SINKO",
    countDown: 8,
    prefix: true,
    category: "ai",
    description: "توليد صور احترافية بالذكاء الاصطناعي مع ترجمة وزخرفة ملكية",
    adminOnly: false
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const promptAr = args.join(" ");

    if (!promptAr) 
      return api.sendMessage("❌ يرجى كتابة وصف للصورة التي تريد توليدها يا ملك.", threadID, messageID);

    // تفاعل أولى بالانتظار
    api.setMessageReaction("⌛", messageID, () => {}, true);

    // رسالة انتظار لحماية البوت من الموت في راندر
    const waitMsg = `> ˼🌌˹↜  Aplin Imagine  ↶\nجاري توليد خيالك والترجمة...`;
    
    api.sendMessage(waitMsg, threadID, async (err, info) => {
      const cacheDir = path.join(__dirname, "cache");
      fs.ensureDirSync(cacheDir);

      try {
        // 1. ترجمة النص تلقائياً إلى الإنجليزية خلف الكواليس لضمان جودة الصور
        const promptEn = await translateText(promptAr);
        
        const apiUrl = `${baseApi}?prompt=${encodeURIComponent(promptEn)}`;
        const response = await axios.get(apiUrl, { timeout: 90000 });
        const result = response.data;

        if (!result.success || !result.data?.images?.length)
          throw new Error("السيرفر لم يقم بإرسال صور.");
        
        // 2. تحميل كافة الصور المستلمة (سواء كانت صورة واحدة أو مجموعة صور)
        const attachments = [];
        for (let i = 0; i < result.data.images.length; i++) {
          const imageUrl = result.data.images[i];
          const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 45000 });

          const imgPath = path.join(cacheDir, `mj_${crypto.randomBytes(4).toString('hex')}_${i}.png`);
          fs.writeFileSync(imgPath, imageResponse.data);
          attachments.push(fs.createReadStream(imgPath));
        }

        // جلب الوقت والتاريخ لتزيين الرسالة
        const timeNow = moment.tz("Africa/Khartoum");
        const dateStr = timeNow.format("DD MMMM YYYY");
        const dayStr = timeNow.locale('ar').format("dddd");
        const timeStr = timeNow.format("hh:mm A");
        
        // الرسالة المزخرفة النهائية
        const successBody = `> ˼⏰˹↜ الـتـوقـيـت ↶
╮──────────────⟢ـ
┆˼🧭˹┊ ↜｢ ${dateStr} ｣
┆˼🎨˹┊ الـتـخـيـل ↜｢ ${promptAr} ｣
┆˼🌁˹┊ الــيـوم ↜｢ ${dayStr} ｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
╯──────────────⟢ـ
> ˼🌌˹↜  aplin ↶`;
        
        await api.sendMessage(
          { body: successBody, attachment: attachments },
          threadID,
          (err) => {
            // تنظيف الكاش وحذف الصور فوراً بعد الإرسال لحماية الرام والهارد
            attachments.forEach(att => {
              try { if (fs.existsSync(att.path)) fs.unlinkSync(att.path); } catch {}
            });

            if (err) {
              api.setMessageReaction("❌", messageID, () => {}, true);
              if (info) api.unsendMessage(info.messageID);
              return;
            }
            
            api.setMessageReaction("✅", messageID, () => {}, true);
            if (info) api.unsendMessage(info.messageID); // حذف كلمة جاري التوليد
          },
          messageID
        );

      } catch (err) {
        console.error('MJ Error:', err.message);
        api.setMessageReaction("❌", messageID, () => {}, true);
        api.sendMessage("⚠️ السيرفر مضغوط حالياً أو الوصف يحتوي على كلمات محظورة، جرب تاني يا ملك.", threadID, messageID);
        if (info) api.unsendMessage(info.messageID);
      }
    }, messageID);
  }
};
