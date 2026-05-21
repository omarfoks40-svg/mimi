const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const axios = require("axios");

// مصفوفة الخلفيات الستة الأصلية من كود صديقك بالملي
const backgroundImages = [
    "https://i.imgur.com/XVRFwns.jpeg",
    "https://i.imgur.com/DXXvgjb.png",
    "https://i.imgur.com/LwoDuzZ.jpeg",
    "https://i.imgur.com/mtSrSYh.jpeg",
    "https://i.imgur.com/IVvEBc4.jpeg",
    "https://i.imgur.com/uJcd1bf.jpeg"
];

const backgroundCache = new Map();

// دالة تحميل الخلفيات وتحويلها لبافر مستقر عبر Axios
async function loadBackgroundImage(url) {
    if (backgroundCache.has(url)) return backgroundCache.get(url);
    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        const img = await loadImage(Buffer.from(response.data));
        backgroundCache.set(url, img);
        return img;
    } catch (error) {
        console.error("[WELCOME] Failed to load background:", url, error.message);
        return null;
    }
}

// دالة قص البروفايلات دائرية مع تفعيل الظلال الهندسية الفخمة الخطية
async function drawProfileImage(ctx, imageUrl, x, y, size, borderColor) {
    const radius = size / 2;
    try {
        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
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

// دالة بناء وتنسيق الكرت الكانفاس فوق التصاميم الستة الأصلية
async function createWelcomeCard(gcImg, userImg, adderImg, userName, userNumber, threadName, adderName) {
    const width = 1200;
    const height = 700;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // اختيار خلفية عشوائية من مصفوفة الخلفيات الستة الأصلية
    const selectedBackground = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    const background = await loadBackgroundImage(selectedBackground);

    if (background) {
        ctx.drawImage(background, 0, 0, width, height);
    } else {
        ctx.fillStyle = "#0a0a0c";
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, width, height);
    
    // إسقاط ورسم البروفايلات الثلاثية المتناسقة بالظلال
    await Promise.all([
        drawProfileImage(ctx, gcImg, width / 2, 200, 200, "#ffffff"),
        drawProfileImage(ctx, userImg, 120, height - 100, 150, "#10b981"),
        drawProfileImage(ctx, adderImg, width - 120, 100, 150, "#3b82f6")
    ]);

    // معالجة ونحت النصوص والخطوط الهندسية فوق الكرت
    ctx.font = 'bold 36px "Segoe UI", Arial';
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(threadName, width / 2, 350);

    const welcomeGradient = ctx.createLinearGradient(width/2 - 180, 360, width/2 + 180, 360);
    welcomeGradient.addColorStop(0, "#3b82f6");
    welcomeGradient.addColorStop(0.5, "#10b981");
    welcomeGradient.addColorStop(1, "#ec4899");

    ctx.font = 'bold 72px "Segoe UI", Arial';
    ctx.fillStyle = welcomeGradient;
    ctx.fillText("WELCOME", width / 2, 450);

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 150, 420);
    ctx.lineTo(width / 2 + 150, 420);
    ctx.stroke();

    ctx.font = 'bold 48px "Segoe UI", Arial';
    ctx.fillStyle = "#10b981";
    ctx.fillText(userName, width / 2, 510);

    ctx.font = 'bold 28px "Segoe UI", Arial';
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`Member #${userNumber}`, width / 2, 585);
    
    ctx.textAlign = "left";
    ctx.fillStyle = "#10b981";
    ctx.font = 'bold 26px "Segoe UI", Arial';
    ctx.fillText(userName, 220, height - 95);

    ctx.textAlign = "right";
    ctx.fillStyle = "#3b82f6";
    ctx.font = 'bold 22px "Segoe UI", Arial';
    ctx.fillText(`Added by: ${adderName}`, width - 220, 105);

    ctx.font = '18px "Segoe UI"';
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("©made by SINKO", width - 10, height - 10);

    return canvas.toBuffer();
}

module.exports = {
    config: {
        name: "welcome",
        version: "6.0.0",
        author: "SINKO",
        category: "events"
    },

    onStart: async ({ threadsData, event, message, usersData }) => {
        if (event.logMessageType !== "log:subscribe") return;

        try {
            const threadID = event.threadID;
            const addedUser = event.logMessageData.addedParticipants[0];
            const addedUserId = addedUser.userFbId;
            const adderId = event.author;

            // جلب البيانات المتوازي فائق السرعة من محقنات السيرفر
            const [threadInfo, userAvatar, adderAvatar, adderName] = await Promise.all([
                threadsData.get(threadID),
                usersData.getAvatarUrl(addedUserId),
                usersData.getAvatarUrl(adderId),
                usersData.getName(adderId)
            ]);

            const userName = addedUser.fullName;
            const groupImage = threadInfo.imageSrc || 'https://i.imgur.com/7Qk8k6c.png';
            const threadName = threadInfo.threadName || "Group";
            const memberCount = threadInfo.members?.length || 1;

            // إعداد الوقت والتاريخ بتوقيت الخرطوم للنص المرافق
            const time = new Date().toLocaleTimeString('ar-EG', { timeZone: 'Africa/Khartoum', hour12: true, hour: '2-digit', minute: '2-digit' });
            const dayName = new Date().toLocaleDateString('ar-EG', { timeZone: 'Africa/Khartoum', weekday: 'long' });

            // صياغة نص الترحيب الفخم الخاص بك كلياً
            let bodyText = `> ˼⭐˹ ترحيب APLIN ↶\n`;
            bodyText += `• ───────────── •\n`;
            bodyText += `⌈👤⌋ الـمـضـيـف ↜ @${adderName}\n`;
            bodyText += `⌈📅⌋ الـتـوقـيـت ↜ ${dayName} | ${time}\n`;
            bodyText += `• ───────────── •\n`;
            bodyText += `  ⌯ 1 ⋞ @${userName} ⋟\n`;
            bodyText += `• ───────────── •\n`;
            bodyText += `⌈📊⌋ الـعـدد الآن ↜ [ ${memberCount} ]\n`;
            bodyText += `• ───────────── •`;

            // توليد كرت الترحيب البافر المدمج
            const imageBuffer = await createWelcomeCard(
                groupImage,
                userAvatar,
                adderAvatar,
                userName,
                memberCount,
                threadName,
                adderName
            );

            const tempDir = path.join(__dirname, '..', '..', 'temp');
            await fs.ensureDir(tempDir);
            const tempPath = path.join(tempDir, `welcome_${Date.now()}.png`);

            // كتابة الملف بشكل متزامن ثابت لحل مشكلة الصورتين سوا نهائياً
            fs.writeFileSync(tempPath, imageBuffer);

            // الرد بالرسالة الفخمة المدمجة بالكامل
            await message.reply({
                body: bodyText,
                mentions: [
                    { tag: `@${adderName}`, id: adderId },
                    { tag: `@${userName}`, id: addedUserId }
                ],
                attachment: fs.createReadStream(tempPath)
            });

            setTimeout(() => fs.existsSync(tempPath) && fs.unlinkSync(tempPath), 10000);

        } catch (error) {
            console.error("[Welcome error]:", error);
            const addedUser = event.logMessageData.addedParticipants[0];
            await message.send({
                body: `🌸 𝐖𝐞l𝐜𝐨𝐦е ${addedUser.fullName}! 🌸\n━━━━━━━━━━━━━━━━━━\n🌷 𝐓𝐨 𝐨𝐮𝐫 𝐠𝐫𝐨𝐮𝐩 𝐟𝐚𝐦𝐢𝐥𝐲!`
            });
        }
    }
};
