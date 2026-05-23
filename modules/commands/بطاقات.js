const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');
function readDB(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : {}; } catch(e){return{};} }
function writeDB(p,d) { fs.writeFileSync(p, JSON.stringify(d,null,4)); }

const SUITS  = ['♠️','♥️','♦️','♣️'];
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const NUMS   = { A:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13 };

function drawCard() {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const val  = VALUES[Math.floor(Math.random() * VALUES.length)];
  return { suit, val, num: NUMS[val] };
}

if (!global.cardGames) global.cardGames = {};

module.exports = {
  config: {
    name: 'بطاقات',
    aliases: ['cards', 'هاي_لو', 'ورق'],
    version: '1.0',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    category: 'tools',
    description: '🃏 لعبة البطاقات — خمّن إذا البطاقة التالية أعلى أم أقل!',
    guide: { ar: '{pn} <رهان> — لبدأ جولة\n{pn} أعلى|أقل — للتخمين' }
  },

  onStart: async ({ api, event, args }) => {
    const { senderID, threadID, messageID } = event;
    const userDB = readDB(userDBPath);
    const user   = userDB[senderID];

    const sub = args[0];

    // ── تخمين أعلى/أقل ──
    if (sub === 'أعلى' || sub === 'أقل' || sub === 'higher' || sub === 'lower') {
      const game = global.cardGames[senderID];
      if (!game) {
        return api.sendMessage('🃏 ما عندك جولة نشطة! ابدأ بـ: بطاقات <رهان>', threadID, messageID);
      }

      const nextCard = drawCard();
      const isHigher = nextCard.num > game.card.num;
      const guessHigher = sub === 'أعلى' || sub === 'higher';
      const correct = guessHigher === isHigher;

      if (correct) {
        game.streak = (game.streak || 0) + 1;
        const multiplier = Math.min(game.streak, 5);
        const winAmt = game.bet * multiplier;
        if (user) {
          user.balance = (user.balance || 0) + winAmt;
          writeDB(userDBPath, userDB);
        }
        game.card = nextCard;

        return api.sendMessage(
          `╭─⟪ ✅ صح! ⟫─╮\n┇\n┇ البطاقة كانت: ${nextCard.suit}${nextCard.val}\n┇ 🔥 سلسلة: ${game.streak}x\n┇ 💰 ربحت: +${winAmt} (x${multiplier})\n┇ 💳 رصيدك: ${user?.balance?.toLocaleString()}\n┇\n┇ البطاقة الحالية: ${nextCard.suit}${nextCard.val}\n┇ هل التالية أعلى أم أقل?\n╰─────────────────────╯`,
          threadID, messageID
        );
      } else {
        const loseAmt = game.bet;
        if (user) {
          user.balance = Math.max(0, (user.balance || 0) - loseAmt);
          writeDB(userDBPath, userDB);
        }
        delete global.cardGames[senderID];

        return api.sendMessage(
          `╭─⟪ ❌ غلط! ⟫─╮\n┇\n┇ البطاقة كانت: ${nextCard.suit}${nextCard.val}\n┇ 💀 خسرت: -${loseAmt}\n┇ 💳 رصيدك: ${user?.balance?.toLocaleString()}\n┇ سلسلتك: ${game.streak || 0}x\n╰─────────────────────╯`,
          threadID, messageID
        );
      }
    }

    // ── بدء جولة ──
    const bet = parseInt(sub);
    if (isNaN(bet) || bet < 50) {
      return api.sendMessage(
        '●─────── ⌬ ───────●\n┇ 🃏 لعبة البطاقات!\n┇\n┇ بدء: بطاقات 200\n┇ ثم: بطاقات أعلى\n┇ أو: بطاقات أقل\n┇\n┇ السلسلة تضاعف المكافأة!\n●─────── ⌬ ───────●',
        threadID, messageID
      );
    }

    if (!user || (user.balance || 0) < bet) {
      return api.sendMessage(`❌ رصيدك ما يكفي للرهان ${bet}`, threadID, messageID);
    }

    const firstCard = drawCard();
    global.cardGames[senderID] = { card: firstCard, bet, streak: 0 };

    setTimeout(() => { delete global.cardGames[senderID]; }, 2 * 60 * 1000);

    return api.sendMessage(
      `╭─⟪ 🃏 لعبة البطاقات ⟫─╮\n┇\n┇ بطاقتك الحالية:\n┇ ━━ ${firstCard.suit} ${firstCard.val} ━━\n┇\n┇ الرهان: ${bet} رصيد\n┇ 💡 السلسلة تضاعف المكافأة!\n┇\n┇ التالية أعلى أم أقل؟\n┇ 🔼 بطاقات أعلى\n┇ 🔽 بطاقات أقل\n╰─────────────────────╯`,
      threadID, messageID
    );
  }
};
