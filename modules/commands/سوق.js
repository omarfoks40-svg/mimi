const fs = require('fs');
const path = require('path');

const userDBPath   = path.join(__dirname, '..', '..', 'database', 'users.json');
const investDBPath = path.join(__dirname, '..', '..', 'database', 'invest.json');

function readDB(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : {}; } catch(e){return{};} }
function writeDB(p,d) { fs.writeFileSync(p, JSON.stringify(d,null,4)); }

const RETURN_HOURS = 8;
const RETURN_MS    = RETURN_HOURS * 60 * 60 * 1000;
const MIN_INVEST   = 200;

const MARKETS = [
  { name: 'الأسهم التقنية',  emoji: '💻', min: 1.2, max: 1.5,  risk: 'متوسط' },
  { name: 'العملات الرقمية', emoji: '🪙', min: 0.7, max: 2.5,  risk: 'عالي' },
  { name: 'الذهب والمعادن',  emoji: '🥇', min: 1.1, max: 1.35, risk: 'منخفض' },
  { name: 'سوق العقارات',    emoji: '🏠', min: 1.15, max: 1.4, risk: 'منخفض' },
  { name: 'الطاقة المتجددة', emoji: '⚡', min: 0.9, max: 1.8,  risk: 'متوسط' },
];

module.exports = {
  config: {
    name: 'سوق',
    aliases: ['invest', 'استثمر', 'سوق'],
    version: '1.0',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    category: 'tools',
    description: '📈 استثمر رصيدك واحصل على عوائد بعد 8 ساعات',
    guide: { ar: '{pn} <المبلغ>   — لبدء الاستثمار\n{pn} حصاد       — لجمع عوائد استثمارك\n{pn} حالة        — لعرض استثمارك الحالي' }
  },

  onStart: async ({ api, event, args }) => {
    const { senderID, threadID, messageID } = event;
    const userDB   = readDB(userDBPath);
    const investDB = readDB(investDBPath);
    const sub      = args[0];

    if (!userDB[senderID]) {
      return api.sendMessage(
        '●─────── ⌬ ───────●\n┇ ❌ ما عندك حساب، استخدم: عمل\n●─────── ⌬ ───────●',
        threadID, messageID
      );
    }

    // ── حالة الاستثمار ──
    if (sub === 'حالة' || sub === 'status') {
      const inv = investDB[senderID];
      if (!inv) {
        return api.sendMessage(
          '●─────── ⌬ ───────●\n┇ 📊 ما عندك استثمار نشط\n┇ ابدأ: استثمار <المبلغ>\n●─────── ⌬ ───────●',
          threadID, messageID
        );
      }
      const elapsed  = Date.now() - inv.startTime;
      const ready    = elapsed >= RETURN_MS;
      const rem      = Math.max(0, RETURN_MS - elapsed);
      const hh = Math.floor(rem / 3600000);
      const mm = Math.floor((rem % 3600000) / 60000);

      const market = MARKETS[inv.marketIdx];
      const msg =
`●─────── ⌬ ───────●
┇ 📈 استثمارك الحالي
┇
┇ ${market.emoji} السوق: ${market.name}
┇ 💰 المستثمر: ${inv.amount.toLocaleString()}
┇ 📊 المتوقع: ${inv.expectedReturn.toLocaleString()} رصيد
┇ ⚠️ المخاطرة: ${market.risk}
┇${ready ? '\n┇ ✅ جاهز للحصاد! اكتب: استثمار حصاد' : `\n┇ ⏰ يتبقى: ${hh}س ${mm}د`}
●─────── ⌬ ───────●`;
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── حصاد الاستثمار ──
    if (sub === 'حصاد' || sub === 'collect' || sub === 'harvest') {
      const inv = investDB[senderID];
      if (!inv) {
        return api.sendMessage(
          '●─────── ⌬ ───────●\n┇ ❌ ما عندك استثمار نشط\n●─────── ⌬ ───────●',
          threadID, messageID
        );
      }

      const elapsed = Date.now() - inv.startTime;
      if (elapsed < RETURN_MS) {
        const rem = RETURN_MS - elapsed;
        const hh  = Math.floor(rem / 3600000);
        const mm  = Math.floor((rem % 3600000) / 60000);
        return api.sendMessage(
          `●─────── ⌬ ───────●\n┇ ⏳ الاستثمار ما اكتمل بعد!\n┇ يتبقى: ${hh}س ${mm}د\n●─────── ⌬ ───────●`,
          threadID, messageID
        );
      }

      const market   = MARKETS[inv.marketIdx];
      const mult     = market.min + Math.random() * (market.max - market.min);
      const returned = Math.floor(inv.amount * mult);
      const profit   = returned - inv.amount;
      const isProfit = profit >= 0;

      userDB[senderID].balance = (userDB[senderID].balance || 0) + returned;
      delete investDB[senderID];
      writeDB(userDBPath, userDB);
      writeDB(investDBPath, investDB);

      const msg =
`●─────── ⌬ ───────●
┇ ${isProfit ? '📈 الاستثمار نجح!' : '📉 خسارة في السوق!'}
┇
┇ ${market.emoji} ${market.name}
┇ 💵 المستثمر: ${inv.amount.toLocaleString()}
┇ 💰 العائد: ${returned.toLocaleString()}
┇ ${isProfit ? `✅ الربح: +${profit.toLocaleString()}` : `❌ الخسارة: ${profit.toLocaleString()}`}
┇
┇ 💳 رصيدك الآن: ${userDB[senderID].balance.toLocaleString()}
●─────── ⌬ ───────●`;
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── استثمار جديد ──
    if (investDB[senderID]) {
      return api.sendMessage(
        '●─────── ⌬ ───────●\n┇ 📊 عندك استثمار نشط بالفعل\n┇ اكتب: استثمار حالة\n●─────── ⌬ ───────●',
        threadID, messageID
      );
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < MIN_INVEST) {
      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ ⚠️ أدخل مبلغاً صحيحاً (الحد الأدنى ${MIN_INVEST})\n┇ مثال: استثمار 500\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    const balance = userDB[senderID].balance || 0;
    if (balance < amount) {
      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ ❌ رصيدك (${balance}) أقل من المبلغ\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    const marketIdx = Math.floor(Math.random() * MARKETS.length);
    const market    = MARKETS[marketIdx];
    const avgReturn = Math.floor(amount * ((market.min + market.max) / 2));

    userDB[senderID].balance -= amount;
    investDB[senderID] = {
      amount,
      marketIdx,
      startTime: Date.now(),
      expectedReturn: avgReturn
    };
    writeDB(userDBPath, userDB);
    writeDB(investDBPath, investDB);

    const msg =
`●─────── ⌬ ───────●
┇ 📈 تم تأكيد الاستثمار!
┇
┇ ${market.emoji} السوق: ${market.name}
┇ ⚠️ المخاطرة: ${market.risk}
┇ 💵 المبلغ: ${amount.toLocaleString()}
┇ 📊 المتوقع (تقريباً): ${avgReturn.toLocaleString()}
┇
┇ ⏰ الحصاد بعد ${RETURN_HOURS} ساعات
┇ 💳 رصيدك الآن: ${userDB[senderID].balance.toLocaleString()}
●─────── ⌬ ───────●`;
    return api.sendMessage(msg, threadID, messageID);
  }
};
