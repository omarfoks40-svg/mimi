const axios = require("axios");

module.exports = {
  config: {
    name: "جبتي",
    version: "1.0.0",
    author: "SINKO", // أبو عبيدة علي ⌬
    countDown: 20,
    role: 0,
    category: "ai",
    prefix: false,
    description: "الدردشة مع ذكاء GPT-4 الاحترافي",
    aliases: ["gpt4", "gpt"]
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");

    if (!query) {
      return api.sendMessage("> ˼⚠️˹↜ يـرجـى إدخـال سـؤالك لـبدء الـدردشـة. ↶\nمثال: جي_بي_تي كيف أصنع بوت؟", threadID, messageID);
    }

    api.setMessageReaction("⚡", messageID, () => {}, true);
    const waitMsg = await api.sendMessage("> ˼🔍˹↜ جـاري الاتـصال بـخوادم GPT-4... ↶", threadID);

    try {
      // استخدام الرابط اللي أنت وفرته مع تمرير ID المستخدم والسؤال
      const response = await axios.get(`https://gpt4.siam-apiproject.repl.co/api?uid=${senderID}&query=${encodeURIComponent(query)}`);
      const answer = response.data.lastAnswer;

      if (answer) {
        api.unsendMessage(waitMsg.messageID);

        let msg = `> ˼⌬˹↜ راد ذكـاء GPT-4 الـمطور ↶\n╮──────────────⟢ـ\n`;
        msg += `┆ ${answer}\n`;
        msg += `╯──────────────⟢ـ\n> 💡 تـم الـرد بـواسطة كـاجـامـي.`;

        api.sendMessage(msg, threadID, messageID);
      } else {
        api.unsendMessage(waitMsg.messageID);
        api.sendMessage("> ˼❌˹↜ لـم أتمكن من الـحصول عـلى رد مـن الـخادم. ↶", threadID, messageID);
      }
    } catch (error) {
      api.unsendMessage(waitMsg.messageID);
      console.error("Error:", error);
      api.sendMessage("> ˼⚠️˹↜ حـدث خـطأ فـي الـوصول لـلذكاء الاصـطناعي. ↶", threadID, messageID);
    }
  }
};
