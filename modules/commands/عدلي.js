const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const moment = require("moment-timezone");

// دالة لجلب الـ Base URL الخاص بالسيرفر الثالث من جيت هاب كما في الكود الأصلي
const baseApiUrl = async () => {
  try {
    const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json", { timeout: 5000 });
    return base.data.mahmud;
  } catch (e) {
    return null;
  }
};

// دالة الترجمة التلقائية لحماية جودة توليد الصور
const translateText = async (text) => {
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`, { timeout: 5000 });
    return res.data[0][0][0];
  } catch (error) {
    return text; // إذا فشلت الترجمة يرسل النص الأصلي كملاذ أخير
  }
};

module.exports = {
  config: {
    name: 'عدلي',
    aliases: ['بندلين', 'بنتي', 'تعديل'],
    version: '5.5.0',
    author: 'SINKO',
    description: 'تعديل الصور بـ 3 سيرفرات متبادلة مع معالجة ذكية للكلمات الصعبة وترجمة تلقائية وزخرفة',
    countDown: 8,
    prefix: true,
    category: 'ai',
    adminOnly: false 
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;
    const promptAr = args.join(" ");

    if (!promptAr) {
      return api.sendMessage('❌ يرجى كتابة وصف للتعديل يا ملك.', threadID, messageID);
    }

    let imageUrl;
    if (event.type === "message_reply") {
      const attachment = event.messageReply.attachments[0];
      if (attachment && (attachment.type === "photo" || attachment.type === "image")) {
        imageUrl = attachment.url;
      }
    }

    if (!imageUrl) {
      return api.sendMessage('❌ يرجى الرد على صورة لتعديلها.', threadID, messageID);
    }

    // التفاعل الأولي بالانتظار
    api.setMessageReaction("⌛", messageID, (err) => {}, true);

    // رسالة الانتظار لحماية البوت من الموت في راندر
    const waitMsg = `> ˼🌌˹↜  Aplin  ↶\nجاري تهيئة المعالجة الذكية وصياغة التعديل...`;
    
    api.sendMessage(waitMsg, threadID, async (err, info) => {
      const cachePath = path.join(__dirname, "cache", `sd_${crypto.randomBytes(4).toString('hex')}.png`);
      if (!fs.existsSync(path.join(__dirname, "cache"))) {
        fs.mkdirSync(path.join(__dirname, "cache"));
      }

      // 🧠 نظام المعالجة الذكية لتصحيح صياغة الكلمات الصعبة والمحفوفة بالمخاطر في السيرفرات
      let optimizedPromptAr = promptAr;
      
      const containsNudityOrMask = /احذفي الملابس|الملابس|نقاب|نغاب|الوجه|وجه/.test(promptAr);
      
      if (containsNudityOrMask) {
        // إعادة صياغة الطلب الصعب بأسلوب وصف إيجابي فخم لضمان إظهار الملامح والعباءة بدون لخبطة
        optimizedPromptAr = "امرأة بوجه واضح ومكشوف بالكامل، ملامح جميلة ومفصلة، ترتدي عباءة أنيقة ومحتشمة، جودة عالية جداً، إضاءة ممتازة ومثالية";
      }

      // معالجة كلمات التوضيح لضمان دقة الصورة والـ Unblur
      if (/وضحي|توضيح|وضح/.test(promptAr)) {
        optimizedPromptAr += ", unblur, highly detailed, 4k sharp focus, cleared face, hyperrealistic";
      }

      // 1. ترجمة النص المهيأ والذكي تلقائياً إلى الإنجليزية
      const promptEn = await translateText(optimizedPromptAr);

      // جلب رابط السيرفر الثالث وتجهيز السيرفرات في مصفوفة
      const hakimBaseURL = await baseApiUrl();
      
      const servers = [
        {
          name: "السيرفر الأول (Uncensored SD)",
          url: `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(promptEn + ", masterpiece, photorealistic, cinematic lighting")}&imageUrl=${encodeURIComponent(imageUrl)}&v=${crypto.randomBytes(4).toString('hex')}`,
          method: "GET",
          responseType: "stream"
        },
        {
          name: "السيرفر الثاني (Azad API)",
          url: `https://azadx69x.is-a.dev/api/editor?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(promptEn)}`,
          method: "GET",
          responseType: "stream"
        }
      ];

      // إضافة السيرفر الثالث إذا تم جلب الرابط بنجاح
      if (hakimBaseURL) {
        servers.push({
          name: "السيرفر الثالث (Hakim API)",
          url: `${hakimBaseURL}/api/edit`,
          method: "POST",
          data: { prompt: promptEn, imageUrl: imageUrl },
          responseType: "arraybuffer"
        });
      }

      let success = false;

      // 2. تكرار على السيرفرات (إنقاذ البوت في حال فشل أي سيرفر)
      for (const server of servers) {
        try {
          console.log(`[Aplin] جاري تجربة: ${server.name}`);
          
          let response;
          if (server.method === "POST") {
            response = await axios.post(server.url, server.data, {
              responseType: server.responseType,
              timeout: 90000,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
          } else {
            response = await axios({
              method: 'get',
              url: server.url,
              responseType: server.responseType,
              timeout: 90000,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
          }

          // كتابة الملف بناءً على نوع الرد (Stream أو ArrayBuffer)
          if (server.responseType === "stream") {
            const writer = fs.createWriteStream(cachePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
          } else {
            await fs.writeFile(cachePath, Buffer.from(response.data, 'binary'));
          }

          success = true;
          break; // نخرج من الحلقة التكرارية فوراً عند نجاح أي سيرفر

        } catch (error) {
          console.error(`[Aplin] فشل ${server.name}:`, error.message);
        }
      }

      // 3. إرسال النتيجة النهائية بناءً على نجاح أو فشل السيرفرات
      if (success) {
        const timeNow = moment.tz("Africa/Khartoum");
        const dateStr = timeNow.format("DD MMMM YYYY");
        const dayStr = timeNow.locale('ar').format("dddd");
        const timeStr = timeNow.format("hh:mm A");

        const successBody = `> ˼⏰˹↜ الـتـوقـيـت ↶
╮──────────────⟢ـ
┆˼🧭˹┊ ↜｢ ${dateStr} ｣
┆˼⚕️˹┊ الطلب الأصلي ↜｢ ${promptAr} ｣
┆˼🛡️˹┊ الـوضعية ↜｢ معالجة ذكية محسنة ⚡ ｣
┆˼🌁˹┊ الـيـوم ↜｢ ${dayStr} ｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
╯──────────────⟢ـ
> ˼🌌˹↜  aplin ↶`;

        await api.sendMessage({
          body: successBody,
          attachment: fs.createReadStream(cachePath)
        }, threadID, () => {
          if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
          api.setMessageReaction("✅", messageID, () => {}, true);
          if (info) api.unsendMessage(info.messageID);
        }, messageID);

      } else {
        if (fs.existsSync(cachePath)) fs.removeSync(cachePath);
        api.sendMessage('⚠️ جميع سيرفرات التعديل مضغوطة حالياً أو تم حظر الكلمات من مزود الخدمة، جرب صياغة أخرى يا ملك.', threadID, messageID);
        api.setMessageReaction("❌", messageID, () => {}, true);
        if (info) api.unsendMessage(info.messageID);
      }
    }, messageID);
  },
};
