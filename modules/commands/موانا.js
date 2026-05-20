const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const POLLINATIONS_API_KEY = "sk_g909D01Pc9ytnwBOBUlfsftrLpjwSqmu";
const POLLINATIONS_CHAT_URL = "https://gen.pollinations.ai/v1/chat/completions";
const ELEVENLABS_API_KEY = "sk_05a820cb00258310fe72ceffeb99464d44bdd66d962dcd74";
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

const KICK_WORDS    = ["اطردي", "اطرد", "طردي", "اخرجي", "اخرج", "طردو", "اطردو", "اخرجو", "اطرديه", "اطرده"];
const PROFILE_WORDS = ["برفايل", "بروفايل", "معلومات", "معلوماتو", "معلوماته", "profile"];
const SONG_WORDS    = ["اغنية", "اغنيه", "أغنية", "أغنيه", "شيلة", "شيله", "موسيقى", "موسيقي", "اجيبي اغنية", "جيبي اغنية", "سمعيني اغنية"];
const VIDEO_WORDS   = ["فيديو", "فيديوه", "فيديوهات", "كليب", "مقطع", "جيبي فيديو", "اجيبي فيديو"];

function detectIntent(text) {
  const t = text.toLowerCase().trim();
  if (KICK_WORDS.some(w => t.includes(w)))    return 'kick';
  if (PROFILE_WORDS.some(w => t.includes(w))) return 'profile';
  if (SONG_WORDS.some(w => t.includes(w)))    return 'song';
  if (VIDEO_WORDS.some(w => t.includes(w)))   return 'video';
  return null;
}

function extractSubject(text, keywords) {
  let result = text;
  for (const kw of [...keywords].sort((a, b) => b.length - a.length)) {
    result = result.replace(new RegExp(kw, 'gi'), '').trim();
  }
  return result.replace(/^[،,\s]+|[،,\s]+$/g, '').trim();
}

async function findMemberByName(api, threadID, searchName) {
  if (!searchName) return null;
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const memberIDs = threadInfo.participantIDs || [];
    if (!memberIDs.length) return null;

    const chunks = [];
    for (let i = 0; i < memberIDs.length; i += 50) chunks.push(memberIDs.slice(i, i + 50));

    const allInfos = {};
    for (const chunk of chunks) {
      try { const infos = await api.getUserInfo(chunk); Object.assign(allInfos, infos); } catch (e) {}
    }

    const q = searchName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const [id, info] of Object.entries(allInfos)) {
      const fullName = (info.name || '').toLowerCase();
      const nameParts = fullName.split(' ');
      const qParts = q.split(' ');
      let score = 0;

      if (fullName === q) score = 100;
      else if (fullName.includes(q) || q.includes(fullName)) score = 80;
      else {
        const matched = qParts.filter(qp => qp.length > 1 && nameParts.some(np => np.includes(qp) || qp.includes(np)));
        score = matched.length > 0 ? (matched.length / Math.max(nameParts.length, qParts.length)) * 60 : 0;
      }

      if (score > bestScore) { bestScore = score; bestMatch = { id, info }; }
    }

    return bestScore >= 30 ? bestMatch : null;
  } catch (e) { return null; }
}

// ══════════════════════════════════════════
//  طرد عضو
// ══════════════════════════════════════════
async function handleKick(api, event, query) {
  const { threadID, messageID, senderID, mentions, messageReply } = event;

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(a => a.id === senderID);
    const config = global.client?.config || {};
    const isOwner = senderID === config.ownerUID || (config.adminUIDs || []).includes(senderID);

    if (!isAdmin && !isOwner) {
      return api.sendMessage("موانا: ما أقدر أطرد، أنت مش ادمن في المجموعة ؛-؛", threadID, messageID);
    }

    let targetID = null;
    let targetName = null;

    if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
      targetName = mentions[targetID]?.replace(/@/g, '') || null;
    } else if (messageReply) {
      targetID = messageReply.senderID;
    } else {
      const subject = extractSubject(query, KICK_WORDS);
      if (!subject) return api.sendMessage("موانا: مين اطرد؟ قولي الاسم أو منشنو أو رد على رسالته ؛-؛", threadID, messageID);
      api.setMessageReaction("🔍", messageID, () => {}, true);
      const match = await findMemberByName(api, threadID, subject);
      if (!match) return api.sendMessage(`موانا: ما لقيت شخص اسمه「${subject}」في المجموعة ؛-؛`, threadID, messageID);
      targetID = match.id;
      targetName = match.info.name;
    }

    if (targetID === senderID) return api.sendMessage("موانا: تطرد نفسك؟ 😂 ؛-؛", threadID, messageID);

    const botID = api.getCurrentUserID?.();
    if (targetID === botID) return api.sendMessage("موانا: ما أطرد نفسي يا وهم ؛-؛", threadID, messageID);

    if (!targetName) {
      try { const info = await api.getUserInfo(targetID); targetName = info[targetID]?.name || targetID; } catch (e) { targetName = targetID; }
    }

    api.removeUserFromGroup(targetID, threadID, (err) => {
      if (err) return api.sendMessage(`موانا: فشلت في طرد ${targetName}، تأكد إني ادمن في المجموعة ؛-؛`, threadID, messageID);
      api.sendMessage(`موانا: ✅ تم طرد ${targetName} من المجموعة ؛-؛`, threadID, messageID);
    });

  } catch (e) {
    api.sendMessage("موانا: حصل خطأ أثناء الطرد ؛-؛", threadID, messageID);
  }
}

// ══════════════════════════════════════════
//  بروفايل عضو
// ══════════════════════════════════════════
async function handleProfile(api, event, query) {
  const { threadID, messageID, senderID, mentions, messageReply } = event;

  let uid = null;

  if (mentions && Object.keys(mentions).length > 0) {
    uid = Object.keys(mentions)[0];
  } else if (messageReply) {
    uid = messageReply.senderID;
  } else {
    const subject = extractSubject(query, PROFILE_WORDS);
    if (subject) {
      api.setMessageReaction("🔍", messageID, () => {}, true);
      const match = await findMemberByName(api, threadID, subject);
      uid = match ? match.id : null;
    }
    if (!uid) uid = senderID;
  }

  api.setMessageReaction("⏳", messageID, () => {}, true);

  try {
    const userInfo = await api.getUserInfo(uid);
    const user = userInfo[uid];
    const avatarUrl = `https://graph.facebook.com/${uid}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const genderText = user.gender == 1 ? "أنثى 🙋‍♀️" : user.gender == 2 ? "ذكر 🙋‍♂️" : "غير محدد";

    const msg =
`●─────── ⌬ ───────●
┇ ⦿ ⟬ بروفايل المستخدم ⟭
┇
┇ 👤 الاسم: ${user.name}
┇ 🆔 الإيدي: ${uid}
┇ ♀♂ الجنس: ${genderText}
┇ 🔗 الرابط: fb.com/${uid}
┇ 🤝 صديق للبوت: ${user.isFriend ? "نعم ✅" : "لا ❎"}
┇
●─────── ⌬ ───────●
موانا ؛-؛`;

    const avatarStream = (await axios.get(avatarUrl, { responseType: "stream" })).data;
    api.setMessageReaction("✅", messageID, () => {}, true);
    return api.sendMessage({ body: msg, attachment: avatarStream }, threadID, messageID);
  } catch (e) {
    return api.sendMessage("موانا: ما قدرت أجيب البروفايل، ربما الحساب خاص ؛-؛", threadID, messageID);
  }
}

// ══════════════════════════════════════════
//  تحميل أغنية
// ══════════════════════════════════════════
async function handleSong(api, event, query) {
  const { threadID, messageID } = event;
  const subject = extractSubject(query, SONG_WORDS);
  if (!subject) return api.sendMessage("موانا: أكتب اسم الأغنية ؛-؛", threadID, messageID);

  const loadMsg = await api.sendMessage(`موانا: جاري البحث عن 「${subject}」 🎵 ؛-؛`, threadID, messageID);

  try {
    const getApi = await axios.get('https://raw.githubusercontent.com/cyber-ullash/cyber-ullash/refs/heads/main/UllashApi.json');
    const baseUrl = getApi.data.api;

    const searchRes = await axios.get(`${baseUrl}/ytFullSearch?songName=${encodeURIComponent(subject)}`);
    const results = searchRes.data;
    if (!results || results.length === 0) {
      api.unsendMessage(loadMsg.messageID);
      return api.sendMessage("موانا: ما لقيت الأغنية دي ؛-؛", threadID, messageID);
    }

    const first = results[0];
    const downloadRes = await axios.get(`${baseUrl}/ytDl3?link=${first.id}&format=mp3`);
    const filePath = path.join(__dirname, 'cache', `moana_song_${Date.now()}.mp3`);

    const audioData = await axios({ method: 'get', url: downloadRes.data.downloadLink, responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, Buffer.from(audioData.data));

    api.unsendMessage(loadMsg.messageID);
    return api.sendMessage({
      body: `موانا: تفضل الأغنية 🎵\n┇ ${first.title}\n┇ ⏱ ${first.time || '؟'} ؛-؛`,
      attachment: fs.createReadStream(filePath)
    }, threadID, () => { try { fs.unlinkSync(filePath); } catch (e) {} }, messageID);

  } catch (e) {
    console.error(e);
    try { api.unsendMessage(loadMsg.messageID); } catch (_) {}
    return api.sendMessage("موانا: السيرفر واجه مشكلة، جرب تاني ؛-؛", threadID, messageID);
  }
}

// ══════════════════════════════════════════
//  تحميل فيديو
// ══════════════════════════════════════════
async function handleVideo(api, event, query) {
  const { threadID, messageID } = event;
  const subject = extractSubject(query, VIDEO_WORDS);
  if (!subject) return api.sendMessage("موانا: أكتب اسم الفيديو ؛-؛", threadID, messageID);

  const loadMsg = await api.sendMessage(`موانا: جاري البحث عن 「${subject}」 🎬 ؛-؛`, threadID, messageID);

  try {
    const res = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(subject)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const videoData = res.data?.data?.videos?.[0];
    if (!videoData) {
      try { api.unsendMessage(loadMsg.messageID); } catch (_) {}
      return api.sendMessage("موانا: ما لقيت فيديو لهذا البحث ؛-؛", threadID, messageID);
    }

    let videoUrl = videoData.play;
    if (!videoUrl.startsWith('http')) videoUrl = `https://www.tikwm.com${videoUrl}`;

    const cachePath = path.join(__dirname, 'cache', `moana_vid_${crypto.randomBytes(3).toString('hex')}.mp4`);
    await fs.ensureDir(path.join(__dirname, 'cache'));

    const videoRes = await axios({ url: videoUrl, method: 'GET', responseType: 'stream' });
    const writer = fs.createWriteStream(cachePath);
    videoRes.data.pipe(writer);
    await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

    try { api.unsendMessage(loadMsg.messageID); } catch (_) {}
    return api.sendMessage({
      body: `موانا: تفضل الفيديو 🎬\n┇ ${(videoData.title || subject).slice(0, 60)} ؛-؛`,
      attachment: fs.createReadStream(cachePath)
    }, threadID, () => { try { fs.unlinkSync(cachePath); } catch (e) {} }, messageID);

  } catch (e) {
    console.error(e);
    try { api.unsendMessage(loadMsg.messageID); } catch (_) {}
    return api.sendMessage("موانا: فشل تحميل الفيديو، جرب تاني ؛-؛", threadID, messageID);
  }
}

// ══════════════════════════════════════════
//  الذكاء الاصطناعي (الوضع الافتراضي)
// ══════════════════════════════════════════
async function handleAI(api, event, query, imageUrl, senderID) {
  const { threadID, messageID } = event;

  const editKeywords = ["عدلي", "سوي", "هاك", "تعديل", "صممي"];
  if (imageUrl && editKeywords.some(w => query.includes(w))) return handleImageEdit(api, event, query, imageUrl);

  api.setMessageReaction(imageUrl ? "🔍" : "🧠", messageID, () => {}, true);

  const systemContext = `أنتِ "موانا"، ذكاء اصطناعي مساعد ذكي جداً وسريع تعملين بمفتاح Pollinations. ردي بالدارجي السوداني المبسط وبدون أي زخرفة زائدة.
- إذا طلب المستخدم رسم شيء جديد أو صورة جديدة (بدون صورة مرفقة)، ابدئي ردك بـ DRAW: متبوعاً بالوصف الدقيق بالإنجليزي فقط.
- إذا طلب المستخدم سماع صوتك أو قول شيء صوتياً (مثل: قولي، فويس، صوت، سمعيني، انطقي)، ابدئي ردك بـ AUDIO: متبوعاً بالنص المراد تحويله لصوت.
- نهائي كل رد نصي عادي بـ ؛-؛`;

  let userContent;
  if (imageUrl) {
    userContent = [
      { type: "image_url", image_url: { url: imageUrl } },
      { type: "text", text: query || "الصورة دي فيها شنو؟" }
    ];
  } else {
    if (!query) return api.sendMessage("أيوة يا حبوب، داير شنو؟ ؛-؛", threadID, messageID);
    userContent = query;
  }

  try {
    const response = await axios.post(POLLINATIONS_CHAT_URL, {
      model: "openai",
      messages: [{ role: "system", content: systemContext }, { role: "user", content: userContent }]
    }, { headers: { 'Authorization': `Bearer ${POLLINATIONS_API_KEY}`, 'Content-Type': 'application/json' } });

    const aiResponse = response.data?.choices?.[0]?.message?.content || "";

    if (aiResponse.includes("AUDIO:")) return handleAudioGeneration(api, event, aiResponse.split("AUDIO:")[1].trim());
    if (aiResponse.includes("DRAW:") && !imageUrl) return handleDrawing(api, event, query, aiResponse.split("DRAW:")[1].trim());

    api.setMessageReaction("✅", messageID, () => {}, true);
    api.sendMessage(aiResponse, threadID, (err, info) => {
      if (!err) {
        global.client.handleReply = global.client.handleReply || [];
        global.client.handleReply.push({ name: "موانا", messageID: info.messageID, author: senderID });
      }
    }, messageID);
  } catch (error) {
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage("الشبكة تعبانة شوية أو المفتاح واجه مشكلة، جرب تاني ؛-؛", threadID, messageID);
  }
}

// ══════════════════════════════════════════
//  الأمر الرئيسي
// ══════════════════════════════════════════
module.exports = {
  config: {
    name: "موانا",
    version: "57.0.0",
    author: "SINKO",
    countDown: 3,
    prefix: false,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply, senderID, mentions } = event;
    const query = args.join(" ").trim();

    let imageUrl = "";
    if (type === "message_reply" && messageReply?.attachments?.[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else if (event.attachments?.[0]?.type === "photo") {
      imageUrl = event.attachments[0].url;
    }

    const intent = detectIntent(query);

    if (intent === 'kick')    return handleKick(api, event, query);
    if (intent === 'profile') return handleProfile(api, event, query);
    if (intent === 'song')    return handleSong(api, event, query);
    if (intent === 'video')   return handleVideo(api, event, query);

    return handleAI(api, event, query, imageUrl, senderID);
  },

  onReply: async function ({ api, event, handleReply }) {
    if (handleReply.author !== event.senderID) return;
    return this.onStart({ api, event, args: [event.body] });
  }
};

// ══════════════════════════════════════════
//  دوال مساعدة
// ══════════════════════════════════════════
async function handleDrawing(api, event, originalQuery, enDescription) {
  const { threadID, messageID } = event;
  const imgPath = path.join(__dirname, 'cache', `art_${Date.now()}.png`);
  api.setMessageReaction("🎨", messageID, () => {}, true);
  try {
    const imgRes = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(enDescription)}`, { responseType: "arraybuffer" });
    fs.outputFileSync(imgPath, Buffer.from(imgRes.data));
    api.sendMessage({ body: `رسمت ليك طلبك: ${originalQuery} ؛-؛`, attachment: fs.createReadStream(imgPath) },
      threadID, () => { try { fs.unlinkSync(imgPath); } catch (e) {} }, messageID);
  } catch (e) {
    api.sendMessage("الرسم فشل، جرب تاني يا غالي ؛-؛", threadID, messageID);
  }
}

async function handleImageEdit(api, event, userPrompt, imageUrl) {
  const { threadID, messageID } = event;
  const cachePath = path.join(__dirname, "cache", `edit_${Date.now()}.png`);
  api.setMessageReaction("🎨", messageID, () => {}, true);

  try {
    // الخطوة 1: حلل الصورة الأصلية بـ Pollinations vision
    const descRes = await axios.post(POLLINATIONS_CHAT_URL, {
      model: "openai",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: "Describe this image in detail in English, focusing on style, colors, subjects, and composition. Be concise (2-3 sentences max)." }
        ]
      }]
    }, { headers: { 'Authorization': `Bearer ${POLLINATIONS_API_KEY}`, 'Content-Type': 'application/json' } });

    const imageDescription = descRes.data?.choices?.[0]?.message?.content || "a detailed scene";

    // الخطوة 2: دمج الوصف مع طلب التعديل لبناء prompt قوي
    const editPromptRes = await axios.post(POLLINATIONS_CHAT_URL, {
      model: "openai",
      messages: [{
        role: "user",
        content: `Original image description: "${imageDescription}"\nUser edit request (in Arabic): "${userPrompt}"\n\nCreate a single English image generation prompt that applies the user's requested edit to the original image. Return ONLY the prompt text, nothing else.`
      }]
    }, { headers: { 'Authorization': `Bearer ${POLLINATIONS_API_KEY}`, 'Content-Type': 'application/json' } });

    const finalPrompt = editPromptRes.data?.choices?.[0]?.message?.content?.trim() || `${imageDescription}, ${userPrompt}`;

    // الخطوة 3: ولّد الصورة المعدّلة
    const imgRes = await axios.get(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&nologo=true`,
      { responseType: "arraybuffer", timeout: 30000 }
    );

    await fs.ensureDir(path.join(__dirname, 'cache'));
    fs.writeFileSync(cachePath, Buffer.from(imgRes.data));

    api.setMessageReaction("✅", messageID, () => {}, true);
    await api.sendMessage(
      { body: "تفضل، عدّلتها ليك ؛-؛", attachment: fs.createReadStream(cachePath) },
      threadID,
      () => { try { fs.unlinkSync(cachePath); } catch (e) {} },
      messageID
    );
  } catch (e) {
    console.error("handleImageEdit error:", e.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    api.sendMessage("ما قدرت أعدل الصورة، جرب تاني ؛-؛", threadID, messageID);
    try { fs.unlinkSync(cachePath); } catch (_) {}
  }
}

async function handleAudioGeneration(api, event, text) {
  const { threadID, messageID } = event;
  const voicePath = path.join(__dirname, "cache", `moana_voice_${Date.now()}.mp3`);
  api.setMessageReaction("🔊", messageID, () => {}, true);
  try {
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: { 'accept': 'audio/mpeg', 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      data: { text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(voicePath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
    await api.sendMessage({ body: "اسمعني فويس: ؛-؛", attachment: fs.createReadStream(voicePath) },
      threadID, () => { try { fs.unlinkSync(voicePath); } catch (e) {} }, messageID);
  } catch (error) {
    api.sendMessage("فشلت في نطق الكلام ؛-؛", threadID, messageID);
    try { fs.unlinkSync(voicePath); } catch (e) {}
  }
}
