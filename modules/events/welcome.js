const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require("axios");
const { log } = require('../../logger/logger');

// كاش للخلفيات لتقليل استهلاك الإنترنت وسرعة الاستجابة
const backgroundCache = new Map();
const backgroundImages = [
    "https://i.imgur.com/XVRFwns.jpeg",
    "https://i.imgur.com/DXXvgjb.png",
    "https://i.imgur.com/LwoDuzZ.jpeg",
    "https://i.imgur.com/mtSrSYh.jpeg",
    "https://i.imgur.com/IVvEBc4.jpeg",
    "https://i.imgur.com/uJcd1bf.jpeg"
];

// دالة تحميل الخلفية مع الكاش
async function loadBackgroundImage(url) {
    if (backgroundCache.has(url)) return backgroundCache.get(url);
    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        const img = await loadImage(Buffer.from(response.data));
        backgroundCache.set(url, img);
        return img;
    } catch (error) {
        log('error', `[WELCOME] Failed to load background: ${error.message}`);
        return null;
    }
}

// دالة رسم الصور الشخصية بشكل دائري واحترافي
async function drawProfileImage(ctx, id, x, y, size, borderColor) {
    const radius = size / 2;
    const imageUrl = `https://graph.facebook.com/${id}/picture?type=large`;
    try {
        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0" }
        });
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
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - radius, y - radius, size, size);
        ctx.restore();
        return true;
    } catch (error) {
        // في حال فشل جلب الصورة يضع دائرة افتراضية مع حرف U
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#374151';
        ctx.fill();
        ctx.fillStyle = borderColor;
        ctx.font = `bold ${radius * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('U', x, y);
        return false;
    }
}

// دالة توليد الصورة (تدعم عضو واحد أو عضوين)
async function createWelcomeCard(threadInfo, userIDs, authorID, adderName) {
    const width = 1200;
    const height = 700;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const selectedBackground = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    const background = await loadBackgroundImage(selectedBackground);

    if (background) {
        ctx.drawImage(background, 0, 0, width, height);
    } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, width, height);

    const threadName = threadInfo.threadName || "المجموعة";
    const memberCount = threadInfo.participantIDs.length;

    // إعداد التدرج اللوني لكلمة WELCOME
    const welcomeGradient = ctx.createLinearGradient(width/2 - 180, 450, width/2 + 180, 450);
    welcomeGradient.addColorStop(0, "#3b82f6");
    welcomeGradient.addColorStop(0.5, "#10b981");
    welcomeGradient.addColorStop(1, "#ec4899");

    if (userIDs.length === 1) {
        // --- تصميم لعضو واحد فقط ---
        const singleUserID = userIDs[0];
        
        await Promise.all([
            drawProfileImage(ctx, threadInfo.threadID, width / 2, 200, 200, "#ffffff"), // صورة الجروب افتراضياً
            drawProfileImage(ctx, singleUserID, 120, height - 100, 150, "#10b981"),    // صورة العضو الجديد
            drawProfileImage(ctx, authorID, width - 120, 100, 150, "#3b82f6")          // صورة المضيف
        ]);

        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(threadName, width / 2, 350);

        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = welcomeGradient;
        ctx.fillText("WELCOME", width / 2, 450);

        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(`Member #${memberCount}`, width / 2, 600);

        ctx.textAlign = "right";
        ctx.fillStyle = "#3b82f6";
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`Added by: ${adderName}`, width - 220, 105);

    } else if (userIDs.length === 2) {
        // --- تصميم لعضوين اثنين ---
        await Promise.all([
            drawProfileImage(ctx, authorID, width / 2, 200, 200, "#3b82f6"),      // المضيف بالمنتصف فوق
            drawProfileImage(ctx, userIDs[0], 200, height - 150, 160, "#10b981"), // العضو الأول أسفل يسار
            drawProfileImage(ctx, userIDs[1], width - 200, height - 150, 160, "#ec4899") // العضو الثاني أسفل يمين
        ]);

        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(threadName, width / 2, 350);

        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = welcomeGradient;
        ctx.fillText("WELCOME", width / 2, 450);

        ctx.font = 'bold 26px Arial';
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(`Members #${memberCount - 1} & #${memberCount}`, width / 2, 530);

        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = "#3b82f6";
        ctx.fillText(`Added by: ${adderName}`, width / 2, 100);
    }

    // الحقوق أسفل الصورة
    ctx.textAlign = "right";
    ctx.font = '18px Arial';
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("© Welcome System", width - 10, height - 10);

    return canvas.toBuffer();
}

module.exports = {
  config: {
    name: 'welcome',
    version: '5.0',
    author: 'Edit & Azadx69x',
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

      // جلب معلومات المجموعة والمضيف الأساسية
      const threadInfo = await api.getThreadInfo(threadID);
      const authorInfo = await api.getUserInfo(author);
      const adderName = authorInfo?.[author] ?? authorInfo?.[author]?.name ?? "المسؤول";

      // تشكيل نص الترحيب الفخم الخاص بك
      const mentions = [];
      const time = new Date().toLocaleTimeString('ar-EG', { timeZone: 'Africa/Khartoum', hour12: true, hour: '2-digit', minute: '2-digit' });
      const dayName = new Date().toLocaleDateString('ar-EG', { timeZone: 'Africa/Khartoum', weekday: 'long' });

      const adderTag = `@${adderName}`;
      mentions.push({ tag: adderTag, id: author });

      let bodyText = `> ˼⭐˹ ترحيب APLIN ↶\n`;
      bodyText += `• ───────────── •\n`;
      bodyText += `⌈👤⌋ الـمـضـيـف ↜ ${adderTag}\n`;
      bodyText += `⌈📅⌋ الـتـوقـيـت ↜ ${dayName} | ${time}\n`;
      bodyText += `• ───────────── •\n`;
      
      let count = 1;
      for (const id of newUsers) {
        const userInfo = await api.getUserInfo(id);
        const name = userInfo?.[id]?.name || "عضو جديد";
        const tag = `@${name}`;
        
        bodyText += `  ⌯ ${count} ⋞ ${tag} ⋟\n`;
        mentions.push({ tag, id });
        count++;
      }

      bodyText += `• ───────────── •\n`;
      bodyText += `⌈📊⌋ الـعـدد الآن ↜ [ ${threadInfo.participantIDs.length} ]\n`;
      bodyText += `• ───────────── •`;

      // --- تطبيق الشرط الذكي بناء على عدد الأعضاء ---
      if (newUsers.length <= 2) {
          try {
              // إذا كان عضواً واحداً أو عضوين، نقوم بتوليد الصورة وإرسالها مع النص
              const imageBuffer = await createWelcomeCard(threadInfo, newUsers, author, adderName);
              
              const tempDir = path.join(__dirname, 'cache');
              await fs.ensureDir(tempDir);
              const tempPath = path.join(tempDir, `welcome_${Date.now()}.png`);
              fs.writeFileSync(tempPath, imageBuffer);

              await api.sendMessage({
                  body: bodyText,
                  mentions,
                  attachment: fs.createReadStream(tempPath)
              }, threadID);

              // حذف الصورة المؤقتة بعد 15 ثانية لتوفير مساحة الاستضافة
              setTimeout(() => fs.existsSync(tempPath) && fs.unlinkSync(tempPath), 15000);
          } catch (imgError) {
              log('error', `Failed to generate image, sending text only: ${imgError.message}`);
              await api.sendMessage({ body: bodyText, mentions }, threadID);
          }
      } else {
          // إذا كانوا 3 أعضاء أو أكثر يرسل النص الفخم فقط بدون صور كما طلبت
          await api.sendMessage({ body: bodyText, mentions }, threadID);
      }

    } catch (error) {
      log('error', `Welcome event error: ${error.message}`);
    }
  }
};
