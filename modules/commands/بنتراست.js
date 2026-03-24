const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: 'بنتراست ',
    aliases: ['بنترست'],
    version: '1.0.2',
    author: '𝙸𝙷𝙰𝙱',
    countDown: 0,
    prefix: true,
    groupAdminOnly: false,
    description: 'أبحث عن الصور في بنترست',
    category: 'media',
    guide: {
      en: '{pn} <الكلمة المراد البحث عنها> -<عدد الصور>'
    },
  },

  onStart: async ({ api, event, args }) => {
    try {
      const input = args.join(" ");
      if (!input) {
        return api.sendMessage(
          `🔍| يرجى إدخال كلمة البحث وعدد الصور بالشكل التالي: ${module.exports.config.guide.en}`,
          event.threadID
        );
      }

      const keySearch = input.includes('-') ? input.substr(0, input.indexOf('-')).trim() : input;
      const numberSearch = parseInt(input.split('-').pop().trim()) || 4;

      // جلب الصور من API بنترست
      const res = await axios.get(`https://pinterest-ashen.vercel.app/api?search=${encodeURIComponent(keySearch)}`);
      const data = res.data.data || [];
      if (data.length === 0) {
        return api.sendMessage(`⚠️ لم يتم العثور على صور لكلمة "${keySearch}"`, event.threadID);
      }

      const imgData = [];
      for (let i = 0; i < Math.min(numberSearch, data.length); i++) {
        const imgResponse = await axios.get(data[i], { responseType: 'arraybuffer' });
        const imgPath = path.join(__dirname, 'tmp', `${i + 1}.jpg`);
        await fs.outputFile(imgPath, imgResponse.data);
        imgData.push(fs.createReadStream(imgPath));
        await new Promise(r => setTimeout(r, 200)); // تأخير بسيط بين تحميل كل صورة
      }

      await api.sendMessage(
        { attachment: imgData, body: `🎏| إليك أفضل ${imgData.length} نتائج الصور لـ "${keySearch}":` },
        event.threadID
      );

      await fs.remove(path.join(__dirname, 'tmp'));

    } catch (error) {
      console.error('Error in صور command:', error);
      api.sendMessage(
        `حدث خطأ أثناء البحث، تأكد من صيغة البحث: مثال #صور قطة - 10`,
        event.threadID
      );
    }
  },
};
