const fs = require('fs');
const path = require('path');

const userDBPath    = path.join(__dirname, '..', '..', 'database', 'users.json');
const lotteryDBPath = path.join(__dirname, '..', '..', 'database', 'lottery.json');

function readDB(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : {}; } catch(e){return{};} }
function writeDB(p,d) { fs.writeFileSync(p, JSON.stringify(d,null,4)); }

const TICKET_PRICE = 100;
const MAX_TICKETS  = 10;

function todayKey() { return new Date().toISOString().split('T')[0]; }
function getRandTicket() { return Math.floor(1000 + Math.random() * 9000).toString(); }

module.exports = {
  config: {
    name: 'حظي',
    aliases: ['lottery', 'سحب', 'لوتري', 'تذكرة'],
    version: '1.0',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    category: 'tools',
    description: '🎟️ اشترِ تذاكر اليانصيب وادخل السحب اليومي!',
    guide: { ar: '{pn} شراء <العدد> — شراء تذاكر (100 رصيد/تذكرة)\n{pn} تذاكري    — عرض تذاكرك اليوم\n{pn} سحب        — إجراء السحب (أي شخص)\n{pn} الجائزة   — حجم جائزة اليوم' }
  },

  onStart: async ({ api, event, args }) => {
    const { senderID, threadID, messageID } = event;
    const userDB    = readDB(userDBPath);
    const lotteryDB = readDB(lotteryDBPath);
    const today     = todayKey();
    const sub       = args[0];

    if (!lotteryDB[today]) lotteryDB[today] = { tickets: {}, drawn: false, winner: null, prize: 0 };
    const todayData = lotteryDB[today];

    if (!userDB[senderID]) {
      return api.sendMessage(
        '●─────── ⌬ ───────●\n┇ ❌ ما عندك حساب، استخدم: عمل\n●─────── ⌬ ───────●',
        threadID, messageID
      );
    }

    // ── عرض تذاكر اليوم ──
    if (sub === 'تذاكري' || sub === 'tickets') {
      const myTickets = todayData.tickets[senderID] || [];
      if (!myTickets.length) {
        return api.sendMessage(
          '●─────── ⌬ ───────●\n┇ 🎟️ ما عندك تذاكر اليوم\n┇ شراء: يانصيب شراء 1\n●─────── ⌬ ───────●',
          threadID, messageID
        );
      }
      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ 🎟️ تذاكرك اليوم (${myTickets.length}):\n┇ ${myTickets.join('  |  ')}\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    // ── الجائزة الحالية ──
    if (sub === 'الجائزة' || sub === 'prize') {
      const totalTickets = Object.values(todayData.tickets).flat().length;
      const prize = totalTickets * TICKET_PRICE;
      const participants = Object.keys(todayData.tickets).length;
      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ 🏆 جائزة اليوم: ${prize.toLocaleString()} رصيد\n┇ 🎟️ إجمالي التذاكر: ${totalTickets}\n┇ 👥 المشاركون: ${participants}\n┇\n┇ موعد السحب بعد منتصف الليل\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    // ── إجراء السحب ──
    if (sub === 'سحب' || sub === 'draw') {
      if (todayData.drawn) {
        const winnerName = todayData.winner ? (userDB[todayData.winner]?.name || 'مجهول') : 'لا أحد';
        return api.sendMessage(
          `●─────── ⌬ ───────●\n┇ 🎉 تم السحب اليوم!\n┇ 🏆 الفائز: ${winnerName}\n┇ 💰 الجائزة: ${todayData.prize.toLocaleString()} رصيد\n●─────── ⌬ ───────●`,
          threadID, messageID
        );
      }

      const allTickets = [];
      for (const [uid, tickets] of Object.entries(todayData.tickets)) {
        for (const t of tickets) allTickets.push({ uid, ticket: t });
      }

      if (allTickets.length === 0) {
        return api.sendMessage(
          '●─────── ⌬ ───────●\n┇ 🎟️ ما في تذاكر مشتراة اليوم\n●─────── ⌬ ───────●',
          threadID, messageID
        );
      }

      const picked = allTickets[Math.floor(Math.random() * allTickets.length)];
      const prize  = allTickets.length * TICKET_PRICE;
      const winnerUID = picked.uid;
      const winnerName = userDB[winnerUID]?.name || 'مجهول';

      if (userDB[winnerUID]) userDB[winnerUID].balance = (userDB[winnerUID].balance || 0) + prize;
      todayData.drawn  = true;
      todayData.winner = winnerUID;
      todayData.prize  = prize;
      writeDB(userDBPath, userDB);
      writeDB(lotteryDBPath, lotteryDB);

      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ 🎉🎉 نتيجة السحب!\n┇\n┇ 🎟️ التذكرة الرابحة: ${picked.ticket}\n┇ 🏆 الفائز: ${winnerName}\n┇ 💰 الجائزة: ${prize.toLocaleString()} رصيد\n┇\n┇ مبروك! 🎊\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    // ── شراء تذاكر ──
    if (sub === 'شراء' || sub === 'buy') {
      const count = Math.min(parseInt(args[1]) || 1, MAX_TICKETS);
      if (isNaN(count) || count < 1) {
        return api.sendMessage(
          `●─────── ⌬ ───────●\n┇ ⚠️ أدخل عدد التذاكر (1-${MAX_TICKETS})\n●─────── ⌬ ───────●`,
          threadID, messageID
        );
      }

      const cost    = count * TICKET_PRICE;
      const balance = userDB[senderID].balance || 0;

      if (balance < cost) {
        return api.sendMessage(
          `●─────── ⌬ ───────●\n┇ ❌ رصيدك (${balance}) ما يكفي\n┇ تحتاج: ${cost} رصيد\n●─────── ⌬ ───────●`,
          threadID, messageID
        );
      }

      if (!todayData.tickets[senderID]) todayData.tickets[senderID] = [];
      const myCount = todayData.tickets[senderID].length;

      if (myCount + count > MAX_TICKETS) {
        return api.sendMessage(
          `●─────── ⌬ ───────●\n┇ ⚠️ الحد الأقصى ${MAX_TICKETS} تذاكر/يوم\n┇ عندك: ${myCount} تذاكر\n●─────── ⌬ ───────●`,
          threadID, messageID
        );
      }

      const newTickets = Array.from({ length: count }, () => getRandTicket());
      todayData.tickets[senderID].push(...newTickets);
      userDB[senderID].balance -= cost;
      writeDB(userDBPath, userDB);
      writeDB(lotteryDBPath, lotteryDB);

      return api.sendMessage(
        `●─────── ⌬ ───────●\n┇ 🎟️ اشتريت ${count} تذاكر!\n┇\n┇ ${newTickets.join('  |  ')}\n┇\n┇ 💸 الكلفة: ${cost} رصيد\n┇ 💳 رصيدك الآن: ${userDB[senderID].balance.toLocaleString()}\n┇\n┇ 🤞 حظاً موفقاً!\n●─────── ⌬ ───────●`,
        threadID, messageID
      );
    }

    // ── قائمة المساعدة ──
    return api.sendMessage(
      `●─────── ⌬ ───────●\n┇ 🎟️ يانصيب اليومي\n┇\n┇ شراء <عدد> — شراء تذاكر (${TICKET_PRICE}/تذكرة)\n┇ تذاكري      — عرض تذاكرك\n┇ الجائزة    — حجم الجائزة\n┇ سحب         — إجراء السحب\n●─────── ⌬ ───────●`,
      threadID, messageID
    );
  }
};
