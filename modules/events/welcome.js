const { log } = require('../../logger/logger');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// استبدال الروابط الميتة بروابط توليد ذكاء اصطناعي فخمة ومستقرة من Pollinations AI تعطي خلفيات أنمي هندسية دافئة دائماً
const backgroundImages = [
    "https://image.pollinations.ai/prompt/cyberpunk%20anime%20gaming%20room%20background%20dark%20neon%20no%20text%20high%20resolution?width=1200&height=700&nologo=true",
    "https://image.pollinations.ai/prompt/abstract%20geometric%20dark%20blue%20and%20purple%20luxury%20background%20no%20text?width=1200&height=700&nologo=true",
    "https://image.pollinations.ai/prompt/anime%20sky%20stars%20and%20galaxy%20aesthetic%20dark%20background%20no%20text?width=1200&height=700&nologo=true"
];

module.exports = {
  config: {
    name: 'welcome',
    version: '5.5.0',
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

async function sendGroupWelcome(api, threadID, userIDs, authorID) {
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const mentions = [];
    
    const time = new Date().toLocaleTimeString('ar-EG', { timeZone: 'Africa/Khartoum', hour12: true, hour: '2-digit', minute: '2-digit' });
    const dayName = new Date().toLocaleDateString('ar-EG', { timeZone: 'Africa/Khartoum', weekday: 'long' });

    const authorInfo = await api.getUserInfo(authorID);
    const adderName = authorInfo?.[authorID]?.name || "المسؤول";
    const adderTag = `@${adderName}`;
    mentions.push({ tag: adderTag, id: authorID });

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

    if (userIDs.length === 1) {
      const targetUserID = userIDs[0];
      
      // استخدام رابط تحويل مباشر لفيسبوك يتخطى حظر جافا سكريبت ويجلب البروفايل الحقيقي بنسبة 100%
      const groupImage = threadInfo.imageSrc || 'https://i.imgur.com/7Qk8k6c.png';
      const userAvatar = `https://graph.facebook.com/${targetUserID}/picture?width=300&height=300`;
      const adderAvatar = `https://graph.facebook.com/${authorID}/picture?width=300&height=300`;
      const threadName = threadInfo.threadName || "المجموعة";

      const imageBuffer = await createWelcomeCard(
        groupImage,
        userAvatar,
        adderAvatar,
        singleUserName,
        threadInfo.participantIDs.length,
        threadName,
        adderName
      );

      const tempDir = path.join(__dirname, 'cache');
      await fs.ensureDir(tempDir);
      const tempPath = path.join(tempDir, `welcome_${Date.now()}.png`);
      await fs.writeFile(tempPath, imageBuffer);

      await api.sendMessage({
        body: bodyText,
        mentions,
        attachment: fs.createReadStream(tempPath)
      }, threadID, () => {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      });

    } else {
      await api.sendMessage({ body: bodyText, mentions }, threadID);
    }

  } catch (error) {
    log('error', `sendGroupWelcome error: ${error.message}`);
  }
}

// تعديل الدالة لطلب الصور بدون حظر بروتوكول وحمايتها بالكامل
async function loadImgSecure(url) {
    try {
        const response = await axios.get(url, { 
            responseType: "arraybuffer", 
            headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*"
            },
            timeout: 8000
        });
        return await loadImage(Buffer.from(response.data));
    } catch (error) {
        // إذا فشل رابط المجموعة أو أي رابط مخصص، نمرر صورة بديلة فوراً لمنع السواد
        try {
            const fallback = await axios.get("https://i.imgur.com/7Qk8k6c.png", { responseType: "arraybuffer" });
            return await loadImage(Buffer.from(fallback.data));
        } catch(e) {
            return null;
        }
    }
}

async function drawProfileImage(ctx, imageUrl, x, y, size, borderColor) {
    const radius = size / 2;
    const img = await loadImgSecure(imageUrl);

    if (!img) {
        // رسم دائرة لونية فخمة لإنقاذ الكرت بدلاً من تركه مفرغاً باللون الأبيض المزعج
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();
        return false;
    }

    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x - radius, y - radius, size, size);
    ctx.restore();
    return true;
}

async function createWelcomeCard(gcImg, userImg, adderImg, userName, userNumber, threadName, adderName) {
    const width = 1200;
    const height = 700;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const selectedBackground = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    const background = await loadImgSecure(selectedBackground);

    if (background) {
        ctx.drawImage(background, 0, 0, width, height);
    } else {
        // تلوين الخلفية بتدرج غامق فاخر (Dark Elegant Gradient) في حال انقطاع الإنترنت كلياً عن جلب الصور
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)"; 
    ctx.fillRect(0, 0, width, height);
    
    await Promise.all([
        drawProfileImage(ctx, gcImg, width / 2, 200, 200, "#ffffff"),
        drawProfileImage(ctx, userImg, 120, height - 100, 150, "#10b981"),
        drawProfileImage(ctx, adderImg, width - 120, 100, 150, "#3b82f6")
    ]);

    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(threadName, width / 2, 350);

    const welcomeGradient = ctx.createLinearGradient(width/2 - 180, 0, width/2 + 180, 0);
    welcomeGradient.addColorStop(0, "#3b82f6");
    welcomeGradient.addColorStop(0.5, "#10b981");
    welcomeGradient.addColorStop(1, "#ec4899");

    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = welcomeGradient;
    ctx.fillText("WELCOME", width / 2, 450);

    ctx.font = 'bold 44px Arial';
    ctx.fillStyle = "#10b981";
    ctx.fillText(userName, width / 2, 515);

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`Member #${userNumber}`, width / 2, 585);
    
    ctx.textAlign = "left";
    ctx.fillStyle = "#10b981";
    ctx.font = 'bold 26px Arial';
    ctx.fillText(userName, 220, height - 95);

    ctx.textAlign = "right";
    ctx.fillStyle = "#3b82f6";
    ctx.font = 'bold 22px Arial';
    ctx.fillText(`Added by: ${adderName}`, width - 220, 105);

    return canvas.toBuffer();
}
