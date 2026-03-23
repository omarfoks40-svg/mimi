const axios = require("axios");

module.exports = {
  config: {
    name: "ويكي",
    version: "2.0.0",
    author: "سينكو 𓆩☆𓆪",
    countDown: 5,
    role: 0,
    category: "الوسئط",
    description: "جلب معلومات سريعة وموثوقة من ويكيبيديا العربية.",
    aliases: ["wiki", "ويكي"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    if (args.length < 1) {
      return api.sendMessage(`✧══════•❁◈❁•══════✧\n✺ ┇ ⚠️ استخدم: ويكيبيديا <كلمة البحث>\n✺ ┇ مثال: ويكيبيديا السودان\n✧══════•❁◈❁•══════✧`, threadID, messageID);
    }

    const query = args.join("_"); // ويكيبيديا بتستخدم الشرطة السفلية في العناوين

    try {
      // جلب ملخص الصفحة من API ويكيبيديا الرسمي
      const response = await axios.get(`https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      const res = response.data;

      if (res.type === "disambiguation") {
        return api.sendMessage(`✧══════•❁◈❁•══════✧\n✺ ┇ ⚠️ النتيجة غير محددة، يرجى كتابة اسم أكثر دقة.\n✧══════•❁◈❁•══════✧`, threadID, messageID);
      }

      const msg = `✧══════•❁◈❁•══════✧
✺ ┇
✺ ┇ ⏣ ⟬ ويـكـيـبـيـديـا ⟭
✺ ┇
✺ ┇ ◍ الـعـنـوان: ${res.title}
✺ ┇ ◍ الـوصـف: ${res.description || "لا يوجد وصف مختصر"}
✺ ┇
✺ ┇ 📖 ${res.extract ? res.extract.slice(0, 600) + "..." : "لم يتم العثور على محتوى نصي."}
✺ ┇
✺ ┇ 🔗 الرابط: ${res.content_urls.desktop.page}
✺ ┇
✧══════•❁◈❁•══════✧`;

      // لو الصفحة فيها صورة، نرسلها كـ Attachment، لو لا نكتفي بالنص
      if (res.thumbnail && res.thumbnail.source) {
        const imgPath = __dirname + `/cache/wiki_${threadID}.png`;
        const imageRes = await axios.get(res.thumbnail.source, { responseType: 'arraybuffer' });
        const fs = require("fs-extra");
        
        if (!fs.existsSync(__dirname + '/cache')) fs.mkdirSync(__dirname + '/cache');
        fs.writeFileSync(imgPath, Buffer.from(imageRes.data));

        return api.sendMessage({
          body: msg,
          attachment: fs.createReadStream(imgPath)
        }, threadID, () => fs.unlinkSync(imgPath), messageID);
      } else {
        return api.sendMessage(msg, threadID, messageID);
      }

    } catch (error) {
      console.error(error);
      return api.sendMessage(`✧══════•❁◈❁•══════✧\n✺ ┇ ❌ لم يتم العثور على نتائج للبحث عن: "${args.join(" ")}"\n✧══════•❁◈❁•══════✧`, threadID, messageID);
    }
  }
};
