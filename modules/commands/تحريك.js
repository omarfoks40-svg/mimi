const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: 'تحريك',
    aliases: ['انميشن', 'animate', 'حرير'],
    version: '1.0',
    author: 'سينكو',
    countDown: 10,
    prefix: true,
    description: 'تحريك الصور الثابتة وتحويلها إلى فيديو عبر ذكاء ابلين الاصطناعي 😼',
    category: 'ai',
    guide: {
      ar: 'قم بالرد على أي صورة بـ: {pn} [وصف الحركة]\nمثال: {pn} اجعل العين تومض وشعرها يتحرك مع الرياح'
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;

    // 1. التحقق من وجود رد على صورة
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0 || messageReply.attachments[0].type !== 'photo') {
      return api.sendMessage('❌ يـا عـب، لازم ترد على صورة ثابتة عشان أقدر أحركها ليك! 😼', threadID, messageID);
    }

    const prompt = args.join(' ');
    if (!prompt) {
      return api.sendMessage('💡 يرجى كتابة وصف للحركة بعد الأمر.\nمثال: تحريك خلي الخلفية تتحرك والماء يجري', threadID, messageID);
    }

    const imageUrl = messageReply.attachments[0].url;
    const cachePath = path.join(__dirname, 'cache', `animated_${Date.now()}.mp4`);

    api.sendMessage('⏳ جـاري تـحـريـك الـصـورة بـذكـاء ابلين... خـلـيـك مـنـتـظـر 😼🍿', threadID, messageID);

    try {
      // التأكد من وجود مجلد الكاش
      await fs.ensureDir(path.join(__dirname, 'cache'));

      // استخدام الـ API المجاني والسريع المخصص للتحريك والأنميشن (Pollinations AI Video Engine)
      const response = await axios({
        method: 'get',
        url: `https://text.pollinations.ai/animate`, 
        params: {
          image: imageUrl,
          prompt: prompt,
          enhance: 'true'
        },
        responseType: 'stream'
      });

      // حفظ الفيديو المستلم في الكاش
      const writer = fs.createWriteStream(cachePath);
      response.data.pipe(writer);

      writer.on('finish', () => {
        // إرسال الفيديو الناتج للمجموعة
        api.sendMessage({
          body: '🎬 تـم تـحـريـك الـصـورة بـنـجـاح يـا زعـيـم! 😼🔥',
          attachment: fs.createReadStream(cachePath)
        }, threadID, () => {
          // مسح الملف من الكاش بعد الإرسال للحفاظ على المساحة
          fs.unlinkSync(cachePath);
        }, messageID);
      });

      writer.on('error', (err) => {
        throw err;
      });

    } catch (error) {
      console.error("خطأ في أمر تحريك الصور:", error);
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      api.sendMessage('⚠️ ابلين بـلـتـه! السيرفر مضغوط حالياً أو جودة الصورة غير مدعومة، حاول مرة ثانية لاحقاً 😼', threadID, messageID);
    }
  }
};
