const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "صور",
    version: "2.1.0",
    author: "HUSSEIN YACOUBI",
    countDown: 10,
    role: 0,
    category: "الوسئط",
    description: "ابحث عن صور أنمي وفئات مختلفة.",
    aliases: ["بين", "بنت"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    // الفئات المتاحة
    const waifuCategories = {
      "انمي": ["waifu", "neko", "shinobu", "megumin"],
      "anime": ["waifu", "neko", "shinobu", "megumin"],
      "waifu": ["waifu"],
      "neko": ["neko"],
      "سلاح": ["kill", "shoot"],
      "حضن": ["cuddle"],
      "بكاء": ["cry"],
      "بوس": ["kiss"],
      "غمزة": ["wink"],
      "هزة": ["wave"],
      "سعيد": ["happy"],
      "رقص": ["dance"],
    };

    if (args.length === 0) {
      return api.sendMessage(`✧══════•❁◈❁•══════✧\n✺ ┇ ⚠️ | من فضلك أدخل كلمة بحث.\n✺ ┇ 💡 | مثال: صور انمي\n✺ ┇ 📝 | الكلمات: انمي، حضن، بوس، بكاء، رقص\n✧══════•❁◈❁•══════✧`, threadID, messageID);
    }

    const keySearch = args.join(" ").toLowerCase();
    api.setMessageReaction("⏱️", messageID, () => {}, true);

    try {
      let category = "waifu"; // افتراضي
      for (const [key, cats] of Object.entries(waifuCategories)) {
        if (keySearch.includes(key)) {
          category = cats[Math.floor(Math.random() * cats.length)];
          break;
        }
      }

      const count = 4; // عدد الصور
      const imgData = [];
      const cacheDir = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      for (let i = 0; i < count; i++) {
        try {
          const res = await axios.get(`https://api.waifu.pics/sfw/${category}`);
          const imgUrl = res.data.url;
          if (!imgUrl) continue;

          const imgPath = path.join(cacheDir, `img_${Date.now()}_${i}.jpg`);
          const imageResponse = await axios.get(imgUrl, { responseType: 'arraybuffer' });
          fs.writeFileSync(imgPath, Buffer.from(imageResponse.data));
          imgData.push(fs.createReadStream(imgPath));
        } catch (e) {
          continue;
        }
      }

      if (imgData.length === 0) {
        return api.sendMessage(`✧══════•❁◈❁•══════✧\n✺ ┇ ❌ | لم يتم العثور على صور حالياً.\n✧══════•❁◈❁•══════✧`, threadID, messageID);
      }

      const msg = `✧══════•❁◈❁•══════✧\n✺ ┇\n✺ ┇ ⏣ ⟬ نـتـائـج الـبـحـث ⟭\n✺ ┇\n✺ ┇ 🔍 الـطـلـب: ${keySearch}\n✺ ┇ 🖼️ الـعـدد: ${imgData.length}\n✺ ┇\n✧══════•❁◈❁•══════✧`;

      return api.sendMessage({
        body: msg,
        attachment: imgData
      }, threadID, (err) => {
        // حذف الصور من الكاش بعد الإرسال لتوفير المساحة
        imgData.forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } catch (error) {
      console.error(error);
      api.sendMessage('✧══════•❁◈❁•══════✧\n✺ ┇ 🚧 | حدث خطأ في جلب الصور يا زول.\n✧══════•❁◈❁•══════✧', threadID, messageID);
    }
  }
};
