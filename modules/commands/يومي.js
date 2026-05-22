const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');

function readDB(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : {}; } catch(e){return{};} }
function writeDB(p,d) { fs.writeFileSync(p, JSON.stringify(d,null,4)); }

const STREAK_REWARDS = [300, 450, 600, 800, 1000, 1250, 1500];
const STREAK_EMOJIS  = ['🌱','🌿','🍀','⭐','🌟','💫','🏆'];

module.exports = {
  config: {
    name: 'يومي',
    aliases: ['daily', 'يوم', 'مكافأة_يومية'],
    version: '1.0',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    category: 'tools',
    description: 'استلم مكافأتك اليومية — تزداد كل يوم متتالي!',
    guide: { ar: '{pn}' }
  },

  onStart: async ({ api, event }) => {
    const { senderID, threadID, messageID } = event;
    const userDB = readDB(userDBPath);

    if (!userDB[senderID]) {
      return api.sendMessage(
        '●─────── ⌬ ───────●\n┇ ❌ ما عندك حساب بعد\n┇ استخدم: عمل — لتسجيل أول راتب\n●─────── ⌬ ───────●',
        threadID, messageID
      );
    }

    const user = userDB[senderID];
    const now  = Date.now();
    const last = user.lastDaily || 0;
    const diff = now - last;

    const MS_24H = 24 * 60 * 60 * 1000;
    const MS_48H = 48 * 60 * 60 * 1000;

    if (diff < MS_24H) {
      const remaining = MS_24H - diff;
      const hh = Math.floor(remaining / 3600000);
      const mm = Math.floor((remaining % 3600000) / 60000);
      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ ⏳ استلمت مكافأتك اليوم بالفعل!\n┇ العودة بعد: ${hh} ساعة و ${mm} دقيقة\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    if (diff > MS_48H) user.dailyStreak = 0;

    const streak   = Math.min((user.dailyStreak || 0) + 1, 7);
    const reward   = STREAK_REWARDS[streak - 1];
    const emoji    = STREAK_EMOJIS[streak - 1];
    const isMax    = streak === 7;

    user.balance    = (user.balance || 0) + reward;
    user.lastDaily  = now;
    user.dailyStreak = streak;
    writeDB(userDBPath, userDB);

    const streakBar = '▓'.repeat(streak) + '░'.repeat(7 - streak);

    const msg =
`●─────── ⌬ ───────●
┇ 🎁 مكافأتك اليومية!
┇
┇ ${emoji} سلسلة الأيام: يوم ${streak}
┇ [${streakBar}]
┇
┇ 💰 المكافأة: +${reward} رصيد
┇ 💳 رصيدك الآن: ${user.balance.toLocaleString()}
┇${isMax ? '\n┇ 🏆 وصلت للحد الأقصى! تابع لتحافظ عليه' : '\n┇ 💡 عُد غداً لزيادة المكافأة!'}
●─────── ⌬ ───────●`;

    return api.sendMessage(msg, threadID, messageID);
  }
};
