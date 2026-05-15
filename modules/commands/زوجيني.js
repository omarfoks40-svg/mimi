const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "زوجيني",
    aliases: ["شريك", "gf", "bf", "crush"],
    author: "SINKO",
    version: "1.0.7",
    role: 0,
    category: "tools",
    description: "إيجاد الشريك المثالي وتصميم بطاقة رومانسية"
  },

  onStart: async function ({ api, event, usersData }) {
    const { threadID, messageID, senderID } = event;

    try {
      // جلب بيانات المرسل
      const senderData = await usersData.get(senderID);
      let senderName = senderData.name || "أنت";

      // جلب معلومات المجموعة والأعضاء
      const threadInfo = await api.getThreadInfo(threadID);
      const users = threadInfo.userInfo;

      // تحديد الجنس والبحث عن شريك (نفس منطقك الأصلي)
      const myData = users.find(u => u.id === senderID);
      let myGender = myData?.gender?.toUpperCase() || (Math.random() > 0.5 ? "MALE" : "FEMALE");

      let matchCandidates = users.filter(u => u.id !== senderID);
      if (myGender === "MALE") {
        matchCandidates = matchCandidates.filter(u => u.gender === "FEMALE");
      } else if (myGender === "FEMALE") {
        matchCandidates = matchCandidates.filter(u => u.gender === "MALE");
      }

      if (!matchCandidates.length) matchCandidates = users.filter(u => u.id !== senderID);

      const selectedMatch = matchCandidates[Math.floor(Math.random() * matchCandidates.length)];
      let matchName = selectedMatch.name;

      api.setMessageReaction("💖", messageID, () => {}, true);

      // إعداد الكانفاس بأبعادك الفخمة
      const width = 1200, height = 750;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // رسم الخلفية المتدرجة (Gradient)
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#0a0f1e");
      gradient.addColorStop(0.3, "#1a2639");
      gradient.addColorStop(0.7, "#2a3b4f");
      gradient.addColorStop(1, "#1e2a3a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // إضافة النجوم والزخارف الهندسية
      this.drawDecor(ctx, width, height);

      // تحميل الصور من سيرفرات فيسبوك
      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const senderAvatar = await loadImage(`https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=${token}`);
      const partnerAvatar = await loadImage(`https://graph.facebook.com/${selectedMatch.id}/picture?width=720&height=720&access_token=${token}`);

      // رسم الصور داخل دوائر فاخرة
      this.drawAvatar(ctx, senderAvatar, 150, 180, 240);
      this.drawAvatar(ctx, partnerAvatar, width - 390, 180, 240);

      // رسم لوحات الأسماء والقلب
      this.drawPlate(ctx, senderName, 120, 460, 300, 65);
      this.drawPlate(ctx, matchName, width - 420, 460, 300, 65);
      this.drawHeart(ctx, width / 2, 330, 90);

      // النسبة العشوائية والنصوص
      const lovePercent = Math.floor(Math.random() * 31) + 70;
      ctx.font = 'bold 35px "Arial"';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`♡ ${lovePercent}% MATCH ♡`, width / 2 - 160, 570);

      // حفظ الصورة وإرسالها
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
      const outputPath = path.join(cacheDir, `match_${senderID}.png`);
      
      fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

      let msg = `> ˼💖˹↜ تـطـابـق الأرواح ↶\n`;
      msg += `╮──────────────⟢ـ\n`;
      msg += `┆˼👤˹┊ الـمـرسـل ↜｢ ${senderName} ｣\n`;
      msg += `┆˼🎁˹┊ الـشـريـك ↜｢ ${matchName} ｣\n`;
      msg += `┆˼📈˹┊ الـنـسـبـة ↜｢ ${lovePercent}% ｣\n`;
      msg += `╯──────────────⟢ـ\n`;
      msg += `┊˼🪸˹┊ SINKO | ✅`;

      return api.sendMessage({ body: msg, attachment: fs.createReadStream(outputPath) }, threadID, () => fs.unlinkSync(outputPath), messageID);

    } catch (error) {
      console.error(error);
      api.sendMessage("╮──────────────⟢ـ\n┆˼❌˹┊ حـدث خـطأ فـي تـصـميم الـبطاقة\n╯──────────────⟢ـ", threadID, messageID);
    }
  },

  drawDecor: function (ctx, width, height) {
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  },

  drawAvatar: function (ctx, img, x, y, size) {
    ctx.save();
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  },

  drawPlate: function (ctx, name, x, y, w, h) {
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.strokeStyle = '#ffd700';
    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 25px "Arial"';
    ctx.fillText(name.slice(0, 15), x + 20, y + 42);
  },

  drawHeart: function (ctx, centerX, centerY, size) {
    ctx.save();
    ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size * 0.5);
    ctx.bezierCurveTo(centerX - size * 0.6, centerY - size * 0.9, centerX - size * 1.2, centerY + size * 0.2, centerX, centerY + size * 0.9);
    ctx.bezierCurveTo(centerX + size * 1.2, centerY + size * 0.2, centerX + size * 0.6, centerY - size * 0.9, centerX, centerY - size * 0.5);
    ctx.fillStyle = '#ff4757';
    ctx.fill();
    ctx.restore();
  }
};
