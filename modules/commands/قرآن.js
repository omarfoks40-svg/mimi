const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const audioLinks = [
  "https://audio.jukehost.co.uk/Rv4gPOzornuPEGv5XIJWNm56CWG3fnSp",
  "https://audio.jukehost.co.uk/e5st7AgyjXleDzPUwBvRt70GNaKpQwNV",
  "https://audio.jukehost.co.uk/ngWtCumV4MTVPBLyk14O9ev2ZxT0sEzr",
  "https://audio.jukehost.co.uk/jnnKiNtQLdsRiorMbHGgm0dLWy64YYx4",
  "https://audio.jukehost.co.uk/eCdZZh7PUHqi6mCI0l3LAoznfKkX4yeb",
  "https://audio.jukehost.co.uk/6t60PWxEa6WaT9QLRFrg0UTwtLYTFHkU",
  "https://audio.jukehost.co.uk/gldIjl98nL1HNgSyztqjEvA5vhaUttb3",
  "https://audio.jukehost.co.uk/Gdrk7gCl7CpDXZ41GaPAxJtguDUElfCU",
  "https://audio.jukehost.co.uk/KWa6s4YLClDCv20tsdQFtMqB3UXMO4tJ",
  "https://audio.jukehost.co.uk/nct5hsU0xjHNTUZDEvDTaoH8QhD0AMFa",
  "https://audio.jukehost.co.uk/QWYnnIcJ3OEz3FcB5sGKesNEtpm3ye61",
  "https://audio.jukehost.co.uk/BNyXe9xeXm7eXcRkzQkki408Nia0qcGF",
  "https://audio.jukehost.co.uk/wNZcxyQFHUGfh86GpwbY3r6SHvCkdwfO",
  "https://audio.jukehost.co.uk/A38nNEQAeCbTuIYIToBI9poggCVyIv2G",
  "https://audio.jukehost.co.uk/oQ7YX2iWNaCLrPvFIIvWyD3ZvC0gEGIg",
  "https://audio.jukehost.co.uk/bLqmHpnLswF9xKUglJALaeOD8EhNywEe",
  "https://audio.jukehost.co.uk/qvMhsEB4Vc3RIyfdwbgGTn0q5ij6OO8f",
  "https://audio.jukehost.co.uk/hZ8YNEzUMWxQpWuNg5Es68aYlN9bvkYf",
  "https://audio.jukehost.co.uk/qbE2d68bPVWZ48qSJp1ieCBFhSDgauXz",
  "https://audio.jukehost.co.uk/bbhiehfZzMyx7msYQxsVoUznHXUskjNF",
  "https://audio.jukehost.co.uk/M1g2130L7Pe2Tx7eoCzG8MpxqdxT2L78",
  "https://audio.jukehost.co.uk/ucToAA7bEPaHoZIlckOnHmBZmNUTpZCh",
  "https://audio.jukehost.co.uk/KIqlgdinCb9J6uZzOP7hLGsjYlxi7hg8",
  "https://audio.jukehost.co.uk/Pif1PGNAqBWgClf67N2r4zD5Llij2SrV"
];

module.exports = {
  config: {
    name: "قرآن",
    version: "1.0.0",
    author: "سينكو 𓆩☆𓆪",
    countDown: 5,
    role: 0,
    category: "الوسئط",
    prefix: true
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID } = event;

    // تفاعل البدء ⏳
    api.setMessageReaction("⚙️", messageID, () => {}, true);

    try {
      const randomAudio = audioLinks[Math.floor(Math.random() * audioLinks.length)];
      const tempPath = path.resolve(__dirname, 'cache', `quran_${messageID}.mp3`);

      // تحميل المقطع العشوائي
      const res = await axios({
        method: "GET",
        url: randomAudio,
        responseType: "arraybuffer"
      });

      // التأكد من وجود مجلد الكاش
      fs.ensureDirSync(path.join(__dirname, 'cache'));
      fs.writeFileSync(tempPath, Buffer.from(res.data, "binary"));

      // تفاعل النجاح ✔️
      api.setMessageReaction("✔️", messageID, () => {}, true);

      return api.sendMessage({
        body: `✧══════•❁◈❁•══════✧\n✺ ┇\n✺ ┇ ⏣ ⟬ الـقـرآن الـكـريـم ⟭\n✺ ┇\n✺ ┇ ﴿ وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ ﴾\n✺ ┇\n✧══════•❁◈❁•══════✧`,
        attachment: fs.createReadStream(tempPath)
      }, threadID, () => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }, messageID);

    } catch (error) {
      console.error(error);
      api.setMessageReaction("❎", messageID, () => {}, true);
      return api.sendMessage("❌ حدث خطأ في إرسال المقطع القرآني.", threadID, messageID);
    }
  }
};
