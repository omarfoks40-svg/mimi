const { log } = require('../../logger/logger');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// مصفوفة الخلفيات الستة الأصلية المتناسقة هندسياً
const backgroundImages = [
    "https://i.imgur.com/XVRFwns.jpeg",
    "https://i.imgur.com/DXXvgjb.png",
    "https://i.imgur.com/LwoDuzZ.jpeg",
    "https://i.imgur.com/mtSrSYh.jpeg",
    "https://i.imgur.com/IVvEBc4.jpeg",
    "https://i.imgur.com/uJcd1bf.jpeg"
];

const backgroundCache = new Map();

module.exports = {
  config: {
    name: 'welcome',
    version: '4.7.5',
    author: 'SINKO',
    eventType: ['log:subscribe']
  },

  onStart: async ({ event, api }) => {
    try {
      if (event.logMessageType !== 'log:subscribe') return;

      const { threadID, logMessageData, author } = event;
      const botID = api.getCurrentUserID();

      if (author == botID) return;
      if (!logMessageData?.addedParticipants) return;

      const newUsers = logMessageData.addedParticipants
        .map(p => p.userFbId)
        .filter(id => id !== botID);

      if (!newUsers.length) return;

      await sendGroupWelcome(api, threadID, newUsers, author);

    } catch (error) {
      log('error', `Welcome event error: ${error.message}`);
    }
  }
};

// ============= الدالة الأساسية لمعالجة وإرسال الترحيب الخاص بك =============
async function sendGroupWelcome(api, threadID, userIDs, authorID) {
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const mentions = [];
    
    // إعداد الوقت والتاريخ بتوقيت الخرطوم
    const time = new Date().toLocaleTimeString('ar-EG', { timeZone: 'Africa/Khartoum', hour12: true, hour: '2-digit', minute: '2-digit' });
    const dayName = new Date().toLocaleDateString('ar-EG', { timeZone: 'Africa/Khartoum', weekday: 'long' });

    // جلب معلومات المضيف
    const authorInfo = await api.getUserInfo(authorID);
    const adderName = authorInfo?.[authorID]?.name || "المسؤول";
    const adderTag = `@${adderName}`;
    mentions.push({ tag: adderTag, id: authorID });

    // --- [ التصميم الفخم الملموم ] ---
    let bodyText = `> ˼⭐˹ ترحيب APLIN ↶\n`;
    bodyText += `• ───────────── •\n`;
    bodyText += `⌈👤⌋ الـمـضـيـف ↜ ${adderTag}\n`;
    bodyText += `⌈📅⌋ الـتـوقـيـت ↜ ${dayName} | ${time}\n`;
    bodyText += `• ───────────── •\n`;
    
    let count = 1;
    let singleUserName = "";
    
    for (const id of userIDs) {
      const userInfo = await api.getUserInfo(id);
      const name = userInfo?.[id]?.name || "عضو جديد";
      const tag = `@${name}`;
      
      if (userIDs.length === 1) singleUserName = name; 
      
      bodyText += `  ⌯ ${count} ⋞ ${tag} ⋟\n`;
      mentions.push({ tag, id });
      count++;
    }

    bodyText += `• ───────────── •\n`;
    bodyText += `⌈📊⌋ الـعـدد الآن ↜ [ ${threadInfo.participantIDs.length} ]\n`;
    bodyText += `• ───────────── •`;

    // --- [ تفعيل رسم الكرت في حال كان العضو المضاف شخصاً واحداً ] ---
    if (userIDs.length === 1) {
      const targetUserID = userIDs[0];
      
      // بناء روابـط الأفتارات بالاعتماد على الـ API الخاص بـ بنية بوتك
      const groupImage = threadInfo.imageSrc || 'https://i.imgur.com/7Qk8k6c.png';
      const userAvatar = `https://graph.facebook.com/${targetUserID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const adderAvatar = `https://graph.facebook.com/${authorID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const threadName = threadInfo.threadName || "المجموعة";

      // استدعاء دالة الرسم الهندسي
      const imageBuffer = await createWelcomeCard(
        groupImage,
        userAvatar,
        adderAvatar,
        singleUserName,
        threadInfo.participantIDs.length,
        threadName,
        adderName
      );

      // حفظ الصورة مؤقتاً في الكاش لضمان استقرار السيرفر ومنع الصور المزدوجة السوداء
      const tempDir = path.join(__dirname, 'cache');
      await fs.ensureDir(tempDir);
      const tempPath = path.join(tempDir, `welcome_${Date.now()}.png`);
      fs.writeFileSync(tempPath, imageBuffer);

      // إرسال النص مع كرت الصورة في طلب واحد ثابت
      return api.sendMessage({
        body: bodyText,
        mentions,
        attachment: fs.createReadStream(tempPath)
      }, threadID, (err) => {
        if (err) log('error', `Send message error: ${err.message}`);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      });

    } else {
      // إرسال نصي مباشر في حال إضافة أكثر من شخص حمايةً للسيرفر من الضغط
      return api.sendMessage({ body: bodyText, mentions }, threadID);
    }

  } catch (error) {
    log('error', `sendGroupWelcome error: ${error.message}`);
  }
}

// ============= دالة تحميل الخلفيات الستة من الكاش لسرعة الأداء =============
async function loadBackgroundImage(url) {
    if (backgroundCache.has(url)) return backgroundCache.get(url);
    try {
        const response = await axios.get(url, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
        const img = await loadImage(Buffer.from(response.data));
        backgroundCache.set(url, img);
        return img;
    } catch (error) {
        return null;
    }
}

// ============= دالة قص ورسم البروفايلات بظلال فخمة =============
async function drawProfileImage(ctx, imageUrl, x, y, size, borderColor) {
    const radius = size / 2;
    try {
        const response = await axios.get(imageUrl, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
        const img = await loadImage(Buffer.from(response.data));

        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = borderColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = borderColor;
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius);
        ctx.clip();
        ctx.drawImage(img, x - radius, y - radius, size, size);
        ctx.restore();
        return true;
    } catch (error) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#374151';
        ctx.fill();
        return false;
    }
}

// ============= دالة دمج العناصر وتوليد الكرت النهائي القياسي =============
async function createWelcomeCard(gcImg, userImg, adderImg, userName, userNumber, threadName, adderName) {
    const width = 1200;
    const height = 700;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // اختيار عشوائي ذكي من مصفوفة الخلفيات الستة الأصلية الخاصة بصديقك
    const selectedBackground = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    const background = await loadBackgroundImage(selectedBackground);

    if (background) {
        ctx.drawImage(background, 0, 0, width, height);
    } else {
        ctx.fillStyle = "#0a0a0c";
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; 
    ctx.fillRect(0, 0, width, height);
    
    // رسم البروفايلات الثلاثية المتناسقة بالظلال الملونة فوق الخلفية
    await Promise.all([
        drawProfileImage(ctx, gcImg, width / 2, 200, 200, "#ffffff"),
        drawProfileImage(ctx, userImg, 120, height - 100, 150, "#10b981"),
        drawProfileImage(ctx, adderImg, width - 120, 100, 150, "#3b82f6")
    ]);

    // نحت وكتابة النصوص بدقة فوق الكرت
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(threadName, width / 2, 350);

    const welcomeGradient = ctx.createLinearGradient(width/2 - 180, 360, width/2 + 180, 360);
    welcomeGradient.addColorStop(0, "#3b82f6");
    welcomeGradient.addColorStop(0.5, "#10b981");
    welcomeGradient.addColorStop(1, "#ec4899");

    ctx.font = 'bold 72px sans-serif';
    ctx.fillStyle = welcomeGradient;
    ctx.fillText("WELCOME", width / 2, 450);

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 150, 420);
    ctx.lineTo(width / 2 + 150, 420);
    ctx.stroke();

    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = "#10b981";
    ctx.fillText(userName, width / 2, 510);

    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`Member #${userNumber}`, width / 2, 585);
    
    ctx.textAlign = "left";
    ctx.fillStyle = "#10b981";
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(userName, 220, height - 95);

    ctx.textAlign = "right";
    ctx.fillStyle = "#3b82f6";
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`Added by: ${adderName}`, width - 220, 105);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("©made by SINKO", width - 10, height - 10);

    return canvas.toBuffer();
}
