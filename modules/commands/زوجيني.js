const jimp = require("jimp");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "زوجيني",
    version: "1.0.0",
    author: "Anonymous",
    countDown: 5,
    role: 0,
    category: "fun",
    description: "إرسال صورة زفاف بين عروسين من اختيارك."
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID, mentions } = event;
    const mentionKeys = Object.keys(mentions);

    if (mentionKeys.length == 0) {
      return api.sendMessage(`✧══════•❁◈❁•══════✧\n✺ ┇ ⚠️ | المرجو عمل منشن للشخص اللذي تريد الزواج به\n✧══════•❁◈❁•══════✧`, threadID, messageID);
    }

    let one, two;
    if (mentionKeys.length == 1) {
      one = senderID;
      two = mentionKeys[0];
    } else {
      one = mentionKeys[0];
      two = mentionKeys[1];
    }

    try {
      api.setMessageReaction("Wait", messageID, () => {}, true);
      const ptth = await makeMarriageImage(one, two);
      
      return api.sendMessage({
        body: `✧══════•❁◈❁•══════✧\n✺ ┇ ⏣ ⟬ تـهـانـيـنـا لـلـعـروسـيـن ⟭\n✺ ┇\n✺ ┇ 💍 ألـف مـبـروك الـزواج الـسـعـيـد\n✧══════•❁◈❁•══════✧`,
        attachment: fs.createReadStream(ptth)
      }, threadID, () => fs.unlinkSync(ptth), messageID);

    } catch (error) {
      console.error(error);
      return api.sendMessage("حدث خطأ أثناء معالجة الصورة يا زول.", threadID, messageID);
    }
  }
};

async function makeMarriageImage(one, two) {
  // جلب الصور باستخدام التوكين الصحيح
  const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
  const url1 = `https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=${token}`;
  const url2 = `https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=${token}`;

  const avone = await jimp.read(await getCircleAvatar(url1));
  const avtwo = await jimp.read(await getCircleAvatar(url2));
  const baseImg = await jimp.read("https://i.postimg.cc/26f9zkTc/marry.png");

  // معالجة وتركيب الصور
  baseImg.resize(432, 280)
         .composite(avone.resize(60, 60), 189, 15)
         .composite(avtwo.resize(60, 60), 122, 25);

  const outputPath = path.join(__dirname, "cache", `marry_${one}_${two}.png`);
  if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));
  
  await baseImg.writeAsync(outputPath);
  return outputPath;
}

async function getCircleAvatar(url) {
  const img = await jimp.read(url);
  img.circle();
  return await img.getBufferAsync(jimp.MIME_PNG);
}
