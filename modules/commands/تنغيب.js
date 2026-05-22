const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');

function readDB(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : {}; } catch(e){return{};} }
function writeDB(p,d) { fs.writeFileSync(p, JSON.stringify(d,null,4)); }

const MINERALS = [
  { name: 'حجارة عادية',  emoji: '🪨', value: 50,   chance: 40 },
  { name: 'فضة خام',       emoji: '🥈', value: 150,  chance: 30 },
  { name: 'ذهب خالص',      emoji: '🥇', value: 350,  chance: 15 },
  { name: 'ياقوت أحمر',   emoji: '♦️', value: 700,  chance: 8  },
  { name: 'زمرد نادر',     emoji: '💚', value: 1200, chance: 5  },
  { name: 'الماس برّاق',   emoji: '💎', value: 2500, chance: 2  },
];

function pickMineral() {
  const roll = Math.random() * 100;
  let cum = 0;
  for (const m of MINERALS) {
    cum += m.chance;
    if (roll < cum) return m;
  }
  return MINERALS[0];
}

const COOLDOWN_MS = 2 * 60 * 60 * 1000;

const MINE_MSGS = [
  'شقيت الأرض بالمعول وطلعت',
  'حفرت عميق في الجبل ولقيت',
  'ضربت الصخرة وانكسرت على',
  'بعد ساعتين من التعدين، طلع معك',
  'حظك اليوم جيّد! لقيت',
];

module.exports = {
  config: {
    name: 'تنغيب',
    aliases: ['mine', 'حفر', 'تنقيب'],
    version: '1.0',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    category: 'tools',
    description: '⛏️ تعدين المعادن النفيسة كل ساعتين',
    guide: { ar: '{pn}' }
  },

  onStart: async ({ api, event }) => {
    const { senderID, threadID, messageID } = event;
    const userDB = readDB(userDBPath);

    if (!userDB[senderID]) {
      return api.sendMessage(
        '●─────── ⌬ ───────●\n┇ ❌ ما عندك حساب، استخدم: عمل\n●─────── ⌬ ───────●',
        threadID, messageID
      );
    }

    const user = userDB[senderID];
    const now  = Date.now();
    const last = user.lastMine || 0;
    const diff = now - last;

    if (diff < COOLDOWN_MS) {
      const rem = COOLDOWN_MS - diff;
      const hh  = Math.floor(rem / 3600000);
      const mm  = Math.floor((rem % 3600000) / 60000);
      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ ⛏️ المنجم يحتاج وقت للتهوية!\n┇ عُد بعد: ${hh}س ${mm}د\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    const mineral = pickMineral();
    const bonus   = mineral.name === 'الماس برّاق' ? Math.floor(Math.random() * 500) : 0;
    const total   = mineral.value + bonus;

    user.balance  = (user.balance || 0) + total;
    user.lastMine = now;
    user.totalMined = (user.totalMined || 0) + 1;
    writeDB(userDBPath, userDB);

    const mineMsg = MINE_MSGS[Math.floor(Math.random() * MINE_MSGS.length)];

    const msg =
`●─────── ⌬ ───────●
┇ ⛏️ جلسة التعدين
┇
┇ ${mineMsg}
┇ ${mineral.emoji} ${mineral.name}
┇
┇ 💰 القيمة: ${mineral.value} رصيد${bonus > 0 ? `\n┇ 🎉 مكافأة الماس: +${bonus}` : ''}
┇ 📦 الإجمالي: +${total} رصيد
┇ 💳 رصيدك الآن: ${user.balance.toLocaleString()}
┇
┇ ⏰ المنجم التالي بعد ساعتين
●─────── ⌬ ───────●`;

    return api.sendMessage(msg, threadID, messageID);
  }
};
