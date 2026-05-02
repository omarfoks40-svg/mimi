const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const jimp = require("jimp");

module.exports = {
  config: {
    name: "سجن",
    version: "2.0.0",
    author: "SINKO",
    countDown: 5,
    category: "fun"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID, mentions } = event;
    const mention = Object.keys(mentions);
    if (mention.length == 0) return api.sendMessage("عليك تحديد الشخص الذي تريد اعتقاله أولاً ؛-؛", threadID, messageID);
    
    const one = senderID, two = mention[0];
    const pathImg = path.join(__dirname, 'cache', `prison_${one}_${two}.png`);
    
    try {
      const baseImage = await jimp.read("https://i.imgur.com/ep1gG3r.png");
      const avatarOne = await jimp.read(`https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      const avatarTwo = await jimp.read(`https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);

      avatarOne.circle();
      avatarTwo.circle();

      baseImage.resize(500, 500)
        .composite(avatarOne.resize(100, 100), 375, 9)
        .composite(avatarTwo.resize(100, 100), 160, 92);

      const buffer = await baseImage.getBufferAsync(jimp.MIME_PNG);
      fs.writeFileSync(pathImg, buffer);

      return api.sendMessage({
        body: "لقد تم القبض عليك متلبساً! لا مفر اليوم ؛-؛",
        attachment: fs.createReadStream(pathImg)
      }, threadID, () => fs.unlinkSync(pathImg), messageID);
    } catch (e) {
      return api.sendMessage("تعذر إتمام عملية الاعتقال، يبدو أن السجين هرب ؛-؛", threadID, messageID);
    }
  }
};
