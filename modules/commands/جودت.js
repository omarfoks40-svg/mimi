const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "جودت",
    version: "1.1.0",
    author: "SINKO",
    countDown: 10,
    role: 0,
    category: "ai",
    prefix: true
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;
    const imageUrl = messageReply?.attachments?.[0]?.url || args.join(" ").trim();

    if (!imageUrl) {
      return api.sendMessage("❌ ارسل صورة ريبلاي أو رابط يا ملك.", threadID, messageID);
    }

    // تفاعل البدء ⚙️
    api.setMessageReaction("⚙️", messageID, () => {}, true);

    const tempPath = path.resolve(__dirname, 'cache', `upscale_${Date.now()}.png`);

    try {
      const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const upscaled = await upscaleImage(Buffer.from(data));

      fs.ensureDirSync(path.join(__dirname, 'cache'));
      fs.writeFileSync(tempPath, upscaled);

      // تفاعل النجاح ✔️
      api.setMessageReaction("✔️", messageID, () => {}, true);

      return api.sendMessage({
        body: "تـم تـحـسـيـن الـصـورة ⚡",
        attachment: fs.createReadStream(tempPath)
      }, threadID, () => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }, messageID);

    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ حدث خطأ في المعالجة.", threadID, messageID);
    }
  }
};

async function upscaleImage(imageData) {
    const taskId = '35mgpvmkm2r8ytqchyj0y1rxgpp74f78hAccdrc2019n4rc8d2zxs7nbh69z3pb6g97bc0007rwlbcj3hfn11gzmf83h1gjnfdj0cd738ykfAgr6r479pz09n30fzpg0tc33vkvq6zhj11fbk5mjsrqAq90kn0hxmyAmys3yf0dcz5flrqxq';
    
    const { data: html } = await axios.get("https://www.iloveimg.com/upscale-image");
    const token = html.match(/"toolText":"Upscale","token":"([^"]+)"/)[1];
    const authorization = `Bearer ${token}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'authorization': authorization,
        'Origin': 'https://www.iloveimg.com',
    };

    const uploadData = new FormData();
    uploadData.append('name', 'image.jpg');
    uploadData.append('chunk', '0');
    uploadData.append('chunks', '1');
    uploadData.append('task', taskId);
    uploadData.append('file', imageData, { filename: 'image.jpg' });

    const upRes = await axios.post('https://api12g.iloveimg.com/v1/upload', uploadData, {
        headers: { ...headers, ...uploadData.getHeaders() }
    });

    const upscaleData = new FormData();
    upscaleData.append('task', taskId);
    upscaleData.append('server_filename', upRes.data.server_filename);
    upscaleData.append('scale', '4');

    const finalRes = await axios.post('https://api12g.iloveimg.com/v1/upscale', upscaleData, {
        headers: { ...headers, ...upscaleData.getHeaders() },
        responseType: 'arraybuffer'
    });

    return Buffer.from(finalRes.data);
}
