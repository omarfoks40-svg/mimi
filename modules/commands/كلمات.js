const axios = require('axios');

const WORD_API = 'https://azadx69x-all-apis-top.vercel.app/api/word';
const REWARD   = 200;
const TIMEOUT_SEC = 40;

module.exports = {
  config: {
    name: 'كلمات',
    aliases: ['word', 'حرف', 'wordgame'],
    version: '1.0',
    author: 'Azadx69x / سينكو',
    countDown: 10,
    prefix: true,
    category: 'tools',
    description: '🔤 لعبة فك الحروف — رتّب الحروف لتشكّل الكلمة الصحيحة!',
    guide: { ar: '{pn} — ابدأ لعبة جديدة ثم رد بالكلمة الصحيحة' }
  },

  onStart: async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;

    try {
      const res  = await axios.get(WORD_API, { timeout: 8000 });
      const word = res.data?.word;
      if (!word?.question || !word?.answer) throw new Error('No word data');

      const msg =
`╭─⟪ 🔤 لعبة الكلمات ⟫─╮
┇
┇ الحروف المبعثرة:
┇ 「 ${word.question} 」
┇
┇ 🎁 الجائزة: ${REWARD} رصيد
┇ ⏰ عندك ${TIMEOUT_SEC} ثانية
┇
╰ رد بالكلمة الصحيحة ╯`;

      api.sendMessage(msg, threadID, (err, info) => {
        if (err) return;
        global.client.handleReply = global.client.handleReply || [];
        global.client.handleReply.push({
          name: 'كلمات',
          messageID: info.messageID,
          author: senderID,
          answer: word.answer.toLowerCase().trim(),
          answered: false
        });

        setTimeout(() => {
          const idx = (global.client.handleReply || []).findIndex(r => r.messageID === info.messageID && !r.answered);
          if (idx !== -1) {
            global.client.handleReply.splice(idx, 1);
            api.sendMessage(
              `⏰ انتهى الوقت! الكلمة كانت: 「${word.answer}」`,
              threadID,
              info.messageID
            );
          }
        }, TIMEOUT_SEC * 1000);
      }, messageID);

    } catch (e) {
      api.sendMessage('❌ فشل في جلب الكلمة، جرب تاني!', threadID, messageID);
    }
  },

  onReply: async ({ api, event, handleReply }) => {
    const { senderID, threadID, messageID, body } = event;

    if (handleReply.author !== senderID) {
      return api.sendMessage('🐸 هذه اللعبة مو حقتك!', threadID, messageID);
    }

    const userReply = (body || '').trim().toLowerCase();
    const correct   = handleReply.answer;

    handleReply.answered = true;
    global.client.handleReply = (global.client.handleReply || []).filter(r => r.messageID !== handleReply.messageID);

    if (userReply === correct) {
      const userDBPath = require('path').join(__dirname, '..', '..', 'database', 'users.json');
      try {
        const db = require('fs').existsSync(userDBPath) ? JSON.parse(require('fs').readFileSync(userDBPath, 'utf8')) : {};
        if (db[senderID]) {
          db[senderID].balance = (db[senderID].balance || 0) + REWARD;
          require('fs').writeFileSync(userDBPath, JSON.stringify(db, null, 4));
        }
      } catch (e) {}

      return api.sendMessage(
        `╭─⟪ ✅ إجابة صحيحة! ⟫─╮\n┇\n┇ الكلمة: 「${correct}」\n┇ 🎁 ربحت: +${REWARD} رصيد\n┇\n╰─────────────────────╯`,
        threadID, messageID
      );
    } else {
      return api.sendMessage(
        `╭─⟪ ❌ إجابة خاطئة! ⟫─╮\n┇\n┇ إجابتك: 「${userReply}」\n┇ الصحيح: 「${correct}」\n┇\n╰─────────────────────╯`,
        threadID, messageID
      );
    }
  }
};
