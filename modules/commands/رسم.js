const axios = require("axios");
const fs = require("fs-extra");
const FormData = require("form-data");

module.exports = {
  config: {
    name: "رسم",
    version: "1.0.0",
    author: "SINKO",
    countDown: 10,
    category: "ai"
  },

  onStart: async function ({ api, event }) {
    const { messageReply, threadID, messageID } = event;
    if (!messageReply || !messageReply.attachments[0]) return api.sendMessage("عليك الرد على صورة لتحويلها لفن الأنمي ؛-؛", threadID, messageID);

    const pathImg = __dirname + `/cache/art_${Date.now()}.jpg`;
    try {
      const imgRes = await axios.get(messageReply.attachments[0].url, { responseType: "stream" });
      const form = new FormData();
      form.append("image", imgRes.data);

      const apiRes = await axios.post("https://art-api-97wn.onrender.com/artify?style=anime", form, {
        headers: form.getHeaders(),
        responseType: "arraybuffer"
      });

      fs.writeFileSync(pathImg, apiRes.data);
      return api.sendMessage({ body: "تفضل الفن الخاص بك أيها المبدع ؛-؛", attachment: fs.createReadStream(pathImg) }, threadID, () => fs.unlinkSync(pathImg), messageID);
    } catch (e) {
      return api.sendMessage("حدث خطأ في معالجة الصورة بالذكاء الاصطناعي ؛-؛", threadID);
    }
  }
};
