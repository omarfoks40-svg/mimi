const axios = require("axios");

module.exports = {
  config: {
    name: 'فيري',
    aliases: ['ffquiz', 'quiz'],
    version: '1.0.0',
    author: 'Eblis',
    description: 'بدء مسابقة أسئلة فري فاير بالزخرفة الملكية',
    countDown: 5,
    prefix: true,
    category: 'fun'
  },

  onStart: async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    try {
      if (!global.client.onReply) global.client.onReply = new Map();
      
      const response = await axios.get("https://azadx69x-all-apis-top.vercel.app/api/ffquiz");
      const q = response.data.quiz;
      
      const quizMsg = `> ˼🔥˹↜ مـسـابـقـة فـري فـايـر ↶
╮──────────────⟢ـ
┆˼❓˹┊ الـسـؤال ↜｢ ${q.question} ｣
╯──────────────⟢ـ
> ˼✨˹↜ الـخـيـارات الـمـتـاحـة ↶
╮──────────────⟢ـ
┆˼🅰️˹┊ Option A ↜｢ ${q.options[0]} ｣
┆˼🅱️˹┊ Option B ↜｢ ${q.options[1]} ｣
╯──────────────⟢ـ
> ˼⏰˹┊ الـرد ↜ قم بالرد بالحرف الصحيح (A أو B)`;

      const msg = await api.sendMessage(quizMsg, threadID, messageID);
      
      global.client.onReply.set(msg.messageID, {
        commandName: "مسابقة",
        author: senderID,
        correctAnswer: q.answer.toUpperCase()
      });
    } catch (error) {
      api.sendMessage("⚠️ السيرفر مشغول، أعد المحاولة لاحقاً.", threadID, messageID);
    }
  },

  onReply: async ({ api, event, Reply, usersData }) => {
    if (!Reply) return;
    const { threadID, messageID, senderID, body } = event;
    const { correctAnswer, author } = Reply;
    if (senderID !== author) return;

    const userReply = body.trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(userReply)) {
      return api.sendMessage("❌ الرجاء كتابة الرمز الصحيح فقط A أو B !", threadID, messageID);
    }

    const userData = await usersData.get(author);
    try { await api.unsendMessage(event.messageReply.messageID); } catch {}

    if (userReply === correctAnswer) {
      await usersData.set(author, { money: (userData.money || 0) + 500, exp: (userData.exp || 0) + 120 });
      const successMsg = `> ˼✅˹↜ إجـابـة صـحـيـحـة ↶
╮──────────────⟢ـ
┆˼💰˹┊ الـجـائزة ↜｢ +500 كوينز ｣
┆˼⚡˹┊ الـخـبرة ↜｢ +120 EXP ｣
╯──────────────⟢ـ`;
      return api.sendMessage(successMsg, threadID, messageID);
    } else {
      const failMsg = `> ˼❌˹↜ إجـابـة خـاطـئـة ↶
╮──────────────⟢ـ
┆˼📌˹┊ الـصـحيحة كـانت ↜｢ ${correctAnswer} ｣
╯──────────────⟢ـ`;
      return api.sendMessage(failMsg, threadID, messageID);
    }
  }
};
