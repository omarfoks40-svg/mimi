const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_BASE = "https://azadx69x.is-a.dev";

module.exports = {
  config: {
    name: "موانا",
    version: "55.0.0",
    author: "SINKO",
    countDown: 3,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply, senderID } = event;
    let query = args.join(" ").trim();

    // 1. فحص الصورة أولاً (سواء رد أو إرسال مباشر)
    let imageUrl = "";
    if (type === "message_reply" && messageReply.attachments?.[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else if (event.attachments?.[0]?.type === "photo") {
      imageUrl = event.attachments[0].url;
    }

    // 2. إذا في صورة، لازم نحللها أولاً عشان نعرف الشخصية أو المحتوى
    let analysisResult = "";
    if (imageUrl) {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      try {
        const baseRes = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        const promptApi = `${baseRes.data.mahmud}/api/prompt`;
        
        const analysis = await axios.post(promptApi, {
          imageUrl: imageUrl,
          prompt: "Identify this character or describe the image details" 
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        analysisResult = analysis.data.response || "";
      } catch (err) {
        console.error("Analysis failed:", err.message);
      }
    }

    // 3. منطق التعديل
    const editKeywords = ["عدلي", "سوي", "هاك", "تعديل", "صممي"];
    if (imageUrl && editKeywords.some(word => query.includes(word))) {
      return handleImageEdit(api, event, query, imageUrl);
    }

    api.setMessageReaction("🧠", messageID, () => {}, true);

    try {
      // بناء السياق لـ DeepSeek
      let finalInput = query;
      if (analysisResult) {
        finalInput = `[المعلومات المستخرجة من الصورة: ${analysisResult}]\nسؤال المستخدم: ${query || "الصورة دي فيها شنو؟"}`;
      }

      if (!finalInput) return api.sendMessage("أيوة يا حبوب، داير شنو؟ ؛-؛", threadID, messageID);

      const systemContext = `أنتِ "موانا". مساعدة سودانية ذكية. ردي بالدارجي السوداني. بدون زخرفة. إذا طلب المستخدم رسم شيء جديد ابدئي بـ DRAW: وبعدها الوصف بالإنجليزي. لو بيسأل عن صورة مرفقة، جاوبي بناءً على المعلومات المتوفرة ليك وما ترسمي شيء جديد إلا بطلب واضح. نهائي الرد بـ ؛-؛`;

      const response = await axios.get(`${API_BASE}/api/deepseek`, {
        params: { query: `${systemContext}\n\n${finalInput}` }
      });

      const aiResponse = response.data?.response || response.data?.answer || "";

      // التأكد إنو الرسم ما يحصل إلا لو في طلب حقيقي
      if (aiResponse.includes("DRAW:") && !analysisResult) {
        const enDescription = aiResponse.split("DRAW:")[1].trim();
        return handleDrawing(api, event, query || "رسمة", enDescription);
      }

      api.sendMessage(aiResponse, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply = global.client.handleReply || [];
          global.client.handleReply.push({ name: "موانا", messageID: info.messageID, author: senderID });
        }
      }, messageID);

    } catch (error) {
      api.sendMessage("الشبكة تعبانة شوية، جرب تاني ؛-؛", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    return this.onStart({ api, event, args: [event.body] });
  }
};

async function handleDrawing(api, event, originalQuery, enDescription) {
  const { threadID, messageID } = event;
  try {
    const imgPath = path.join(__dirname, 'cache', `art_${Date.now()}.png`);
    const imgRes = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(enDescription)}`, { responseType: "arraybuffer" });
    fs.outputFileSync(imgPath, Buffer.from(imgRes.data));
    api.sendMessage({
      body: `رسمت ليك طلبك: ${originalQuery} ؛-؛`,
      attachment: fs.createReadStream(imgPath)
    }, threadID, () => fs.unlinkSync(imgPath), messageID);
  } catch (e) { api.sendMessage("الرسم فشل، جرب تاني ؛-؛", threadID); }
}

async function handleImageEdit(api, event, prompt, imageUrl) {
  const { threadID, messageID } = event;
  const cachePath = path.join(__dirname, "cache", `edit_${Date.now()}.png`);
  try {
    const apiUrl = `https://uncensored-sd.onrender.com/api/sd?prompt=${encodeURIComponent(prompt || "anime style")}&imageUrl=${encodeURIComponent(imageUrl)}`;
    const response = await axios({ url: apiUrl, responseType: 'stream' });
    const writer = fs.createWriteStream(cachePath);
    response.data.pipe(writer);
    await new Promise(r => writer.on('finish', r));
    await api.sendMessage({ body: "ظبطتها ليك ؛-؛", attachment: fs.createReadStream(cachePath) }, threadID, () => fs.unlinkSync(cachePath), messageID);
  } catch (e) { api.sendMessage("ما قدرت أعدل الصورة ؛-؛", threadID); }
}
