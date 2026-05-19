const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// مفتاح ورابط Pollinations.ai الخاص بك
const POLLINATIONS_API_KEY = "sk_g909D01Pc9ytnwBOBUlfsftrLpjwSqmu";
const POLLINATIONS_CHAT_URL = "https://gen.pollinations.ai/v1/chat/completions";

// بيانات ElevenLabs الخاصة بك (تم استخدام صوت Rachel المجاني المستقر لتفادي خطأ 402)
const ELEVENLABS_API_KEY = "sk_05a820cb00258310fe72ceffeb99464d44bdd66d962dcd74";
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

module.exports = {
  config: {
    name: "موانا",
    version: "56.0.0",
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

    // 2. إذا في صورة، تحليلها لمعرفة تفاصيلها
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

    // 3. منطق تعديل الصور
    const editKeywords = ["عدلي", "سوي", "هاك", "تعديل", "صممي"];
    if (imageUrl && editKeywords.some(word => query.includes(word))) {
      return handleImageEdit(api, event, query, imageUrl);
    }

    api.setMessageReaction("🧠", messageID, () => {}, true);

    try {
      // بناء السياق والمُدخلات للذكاء الاصطناعي
      let finalInput = query;
      if (analysisResult) {
        finalInput = `[المعلومات المستخرجة من الصورة: ${analysisResult}]\nسؤال المستخدم: ${query || "الصورة دي فيها شنو؟"}`;
      }

      if (!finalInput) return api.sendMessage("أيوة يا حبوب، داير شنو؟ ؛-؛", threadID, messageID);

      // سياق موانا بالدارجي السوداني وتوجيهات الرسم والصوت الذكي
      const systemContext = `أنتِ "موانا"، ذكاء اصطناعي مساعد ذكي جداً وسريع تعملين بمفتاح Pollinations. ردي بالدارجي السوداني المبسط وبدون أي زخرفة زائدة. 
- إذا طلب المستخدم رسم شيء جديد أو صورة جديدة، ابدئي ردك بـ DRAW: متبوعاً بالوصف الدقيق للإنجليزي فقط.
- إذا طلب المستخدم سماع صوتك، أو قول شيء صوتياً، أو إرسال فويس (مثل: قولي، فويس، صوت، سمعيني، انطقي)، ابدئي ردك بـ AUDIO: متبوعاً بالنص المراد تحويله لصوت باللغة العربية الفصحى الواضحة ليظهر الصوت بشكل احترافي.
- نهائي كل رد نصي عادي بـ ؛-؛`;

      // الاتصال بـ Pollinations API باستخدام المفتاح الخاص بك
      const response = await axios.post(POLLINATIONS_CHAT_URL, {
        model: "openai",
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: finalInput }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${POLLINATIONS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data?.choices?.[0]?.message?.content || "";

      // [التحقق من أمر الصوت التلقائي المدمج]
      if (aiResponse.includes("AUDIO:")) {
        const textToSpeak = aiResponse.split("AUDIO:")[1].trim();
        return handleAudioGeneration(api, event, textToSpeak);
      }

      // [التحقق من أمر الرسم التلقائي المدمج]
      if (aiResponse.includes("DRAW:") && !analysisResult) {
        const enDescription = aiResponse.split("DRAW:")[1].trim();
        return handleDrawing(api, event, query || "رسمة", enDescription);
      }

      // إرسال الرد النصي العادي
      api.sendMessage(aiResponse, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply = global.client.handleReply || [];
          global.client.handleReply.push({ name: "موانا", messageID: info.messageID, author: senderID });
        }
      }, messageID);

    } catch (error) {
      console.error("Error in Moana API:", error.response ? error.response.data : error.message);
      api.sendMessage("الشبكة تعبانة شوية أو المفتاح واجه مشكلة، جرب تاني ؛-؛", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    return this.onStart({ api, event, args: [event.body] });
  }
};

// دالة توليد الصور المحدثة باستخدام نظام Pollinations الرسمي
async function handleDrawing(api, event, originalQuery, enDescription) {
  const { threadID, messageID } = event;
  const imgPath = path.join(__dirname, 'cache', `art_${Date.now()}.png`);
  api.setMessageReaction("🎨", messageID, () => {}, true);
  try {
    const imgRes = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(enDescription)}`, { responseType: "arraybuffer" });
    fs.outputFileSync(imgPath, Buffer.from(imgRes.data));
    api.sendMessage({
      body: `رسمت ليك طلبك: ${originalQuery} ؛-؛`,
      attachment: fs.createReadStream(imgPath)
    }, threadID, () => fs.unlinkSync(imgPath), messageID);
  } catch (e) { 
    api.sendMessage("الرسم فشل، جرب تاني يا غالي ؛-؛", threadID, messageID); 
  }
}

// دالة تعديل الصور
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
  } catch (e) { 
    api.sendMessage("ما قدرت أعدل الصورة ؛-؛", threadID, messageID); 
  }
}

// دالة توليد الصوت الاحترافية المدمجة تلقائياً (ElevenLabs)
async function handleAudioGeneration(api, event, text) {
  const { threadID, messageID } = event;
  const voicePath = path.join(__dirname, "cache", `moana_voice_${Date.now()}.mp3`);
  api.setMessageReaction("🔊", messageID, () => {}, true);

  try {
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        'accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      },
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(voicePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    await api.sendMessage({
      body: "اسمعني فويس: ؛-؛",
      attachment: fs.createReadStream(voicePath)
    }, threadID, () => {
      if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
    }, messageID);

  } catch (error) {
    console.error("ElevenLabs Error in Moana:", error.message);
    api.sendMessage("فشلت في نطق الكلام، تأكد من رصيد ElevenLabs. ؛-؛", threadID, messageID);
    if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath);
  }
}
