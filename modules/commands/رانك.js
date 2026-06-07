const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

function roundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === "number") radius = { tl: radius, tr: radius, br: radius, bl: radius };
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}

function formatNumber(num) {
    if (!num || isNaN(num)) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatMoney(num) {
    if (!num || num === 0) return "0";
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T"];
    const exp = Math.floor(Math.log(num) / Math.log(1000));
    const value = (num / Math.pow(1000, exp)).toFixed(2);
    return value.replace(/\.00$/, "") + suffixes[exp];
}

function expToLevel(exp) {
    if (!exp || exp <= 0) return 1;
    return Math.floor((Math.sqrt(8 * exp / 5 + 1) - 1) / 2) + 1;
}

function expForLevel(level) {
    if (level <= 1) return 0;
    return 5 * (level - 1) * level / 2;
}

function getLevelColor(level) {
    if (level >= 100) return { main: "#FF006E", light: "#FF4D9E" };
    if (level >= 50) return { main: "#FB5607", light: "#FF8C42" };
    if (level >= 30) return { main: "#FFBE0B", light: "#FFE66D" };
    if (level >= 10) return { main: "#8338EC", light: "#B56CFF" };
    return { main: "#3A86FF", light: "#70B8FF" };
}

function getRankColor(rank) {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    if (rank <= 10) return "#FF6B6B";
    if (rank <= 100) return "#4ECDC4";
    return "#95A5A6";
}

async function loadAvatar(uid) {
    try {
        const fbUrls = [
            `https://graph.facebook.com/${uid}/picture?width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
            `https://graph.facebook.com/${uid}/picture?width=500&height=500`,
            `https://graph.facebook.com/${uid}/picture?type=large`
        ];
        for (const url of fbUrls) {
            try {
                const response = await axios.get(url, { responseType: "arraybuffer", timeout: 5000 });
                if (response.status === 200 && response.data) return await loadImage(Buffer.from(response.data));
            } catch (err) { continue; }
        }
    } catch (err) { console.log("Avatar load failed"); }
    return null;
}

function createDefaultAvatar(name, color) {
    const canvas = createCanvas(300, 300);
    const c = canvas.getContext("2d");
    c.fillStyle = color.main;
    c.fillRect(0, 0, 300, 300);
    c.fillStyle = color.light;
    c.beginPath();
    c.arc(150, 150, 120, 0, Math.PI * 2);
    c.fill();
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    c.fillStyle = "#ffffff";
    c.font = "bold 140px Arial";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(initial, 150, 150);
    return canvas;
}

module.exports = {
  config: {
    name: 'رانك',
    aliases: ['rank', 'level'],
    version: '1.0.0',
    author: 'Eblis',
    description: 'عرض بطاقة الرتبة الخاصة بك بالزخرفة الملكية',
    countDown: 5,
    prefix: true,
    category: 'fun'
  },

  onStart: async ({ api, event, args, usersData, threadsData }) => {
    const { threadID, messageID, senderID } = event;
    
    try {
        let targetUID;
        if (Object.keys(event.mentions).length > 0) targetUID = Object.keys(event.mentions)[0];
        else if (args[0] && /^\d+$/.test(args[0])) targetUID = args[0];
        else if (event.messageReply) targetUID = event.messageReply.senderID;
        else targetUID = senderID;

        const userData = await usersData.get(targetUID);
        const allUsers = await usersData.getAll();

        let messages = 0;
        try {
            const threadData = await threadsData.get(threadID);
            if (threadData && threadData.members) {
                const memberData = threadData.members.find((m) => m.userID === targetUID);
                if (memberData) messages = parseInt(memberData.count) || parseInt(memberData.messageCount) || 0;
            }
        } catch (err) { console.log("Message count error:", err.message); }
        if (messages === 0) messages = parseInt(userData.messages) || parseInt(userData.messageCount) || 0;

        let name = userData.name || "Unknown";
        let username = "@user";
        try {
            const info = (await api.getUserInfo(targetUID))[targetUID];
            if (info) {
                name = info.name || name;
                username = info.vanity ? `@${info.vanity}` : info.alternateName || name;
            }
        } catch {}

        let gender = "Unknown";
        if (userData.gender !== undefined) {
            const g = String(userData.gender).toLowerCase();
            if (g === "female" || g === "f" || g === "1") gender = "أنثى";
            else if (g === "male" || g === "m" || g === "2") gender = "ذكر";
        }

        const exp = parseInt(userData.exp) || 0;
        const money = parseInt(userData.money) || 0;
        const level = expToLevel(exp);
        const levelColor = getLevelColor(level);

        const expSorted = allUsers.sort((a, b) => (b.exp || 0) - (a.exp || 0));
        const expRank = expSorted.findIndex((u) => String(u.userID) === String(targetUID)) + 1;

        const moneySorted = allUsers.sort((a, b) => (b.money || 0) - (a.money || 0));
        const moneyRank = moneySorted.findIndex((u) => String(u.userID) === String(targetUID)) + 1;

        const expStartCurrentLevel = expForLevel(level);
        const expStartNextLevel = expForLevel(level + 1);
        const expNeededToLevelUp = expStartNextLevel - expStartCurrentLevel;
        const expProgressInLevel = exp - expStartCurrentLevel;
        
        let progressPercent = expNeededToLevelUp > 0 ? (expProgressInLevel / expNeededToLevelUp) * 100 : 100;
        progressPercent = Math.max(0, Math.min(100, progressPercent));

        let avatar = await loadAvatar(targetUID) || createDefaultAvatar(name, levelColor);

        const width = 1200, height = 700;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#1a1a2e"); bgGrad.addColorStop(1, "#16213e");
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(255,255,255,0.03)"; roundRect(ctx, 40, 40, 1120, 620, 25); ctx.fill();
        ctx.strokeStyle = levelColor.main; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
        roundRect(ctx, 40, 40, 1120, 620, 25); ctx.stroke(); ctx.globalAlpha = 1;

        const leftX = 60, leftY = 60, leftW = 380, leftH = 580;
        ctx.fillStyle = "rgba(0,0,0,0.15)"; roundRect(ctx, leftX, leftY, leftW, leftH, 20); ctx.fill();

        const avatarX = leftX + leftW/2, avatarY = leftY + 130;
        ctx.fillStyle = levelColor.main; ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(avatarX, avatarY, 105, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;

        ctx.save(); ctx.beginPath(); ctx.arc(avatarX, avatarY, 95, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatar, avatarX - 95, avatarY - 95, 190, 190); ctx.restore();

        ctx.strokeStyle = levelColor.main; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(avatarX, avatarY, 97, 0, Math.PI * 2); ctx.stroke();

        const badgeY = avatarY + 85; ctx.fillStyle = levelColor.main; ctx.beginPath(); ctx.arc(avatarX, badgeY, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 18px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`LV.${level}`, avatarX, badgeY);

        const nameY = leftY + 260; ctx.fillStyle = "#fff"; ctx.font = "bold 26px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(name.length > 18 ? name.substring(0, 18) + "..." : name, avatarX, nameY);

        const tmpPath = path.join(__dirname, "cache");
        if (!fs.existsSync(tmpPath)) fs.mkdirSync(tmpPath, { recursive: true });
        const imagePath = path.join(tmpPath, `rank_${targetUID}.png`);
        fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

        const fullDate = moment.tz("Africa/Khartoum").format("DD / MM / YYYY");

        const messageStr = `> ˼📊˹↜ بـطـاقـة الـرّتـبـة ↶
╮──────────────⟢ـ
┆˼👤˹┊ الـاسم ↜｢ ${name} ｣
┆˼🆔˹┊ الـحساب ↜｢ ${username} ｣
┆˼⚧˹┊ الـجنس ↜｢ ${gender} ｣
╯──────────────⟢ـ
> ˼🌌˹↜ إحـصـائـيـات الـمـسـتـوى ↶
╮──────────────⟢ـ
┆˼⭐˹┊ الـمستوى ↜｢ ${level} ｣
┆˼⚡˹┊ الـخـبرة ↜｢ ${formatNumber(exp)} ｣
┆˼📈˹┊ الـترتيب ↜｢ #${expRank || '--'} ｣
╯──────────────⟢ـ
> ˼💰˹↜ الـمـال والـتـفـاعـل ↶
╮──────────────⟢ـ
┆˼💵˹┊ الـرصـيد ↜｢ $${formatMoney(money)} ｣
┆˼🏆˹┊ ثراء_الجروب ↜｢ #${moneyRank || '--'} ｣
┆˼💬˹┊ الـرسـائل ↜｢ ${formatNumber(messages)} ｣
╯──────────────⟢ـ
┆˼⏰˹┊ الـتـاريخ ↜｢ ${fullDate} ｣`;

        api.sendMessage({
            body: messageStr,
            attachment: fs.createReadStream(imagePath)
        }, threadID, () => {
            try { fs.unlinkSync(imagePath); } catch {}
        }, messageID);

    } catch (err) { 
        api.sendMessage(`❌ حدث خطأ: ${err.message}`, threadID, messageID); 
    }
  }
};
