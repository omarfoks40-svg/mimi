const axios = require("axios");

const API_BASE = "https://azadx69x.is-a.dev";

async function fetchAI(query, retries = 2) {
  try {
    return await axios.get(
      `${API_BASE}/api/deepseek?query=${encodeURIComponent(query)}`,
      { timeout: 60000 }
    );
  } catch (err) {
    if (retries > 0) return fetchAI(query, retries - 1);
    throw err;
  }
}

function buildMessage(query, answer) {
  return `> ˼🤖˹↜ ذكـاء DEEPSEEK ↶
╮──────────────⟢ـ
┆˼🧠˹┊ الـسـؤال ↶
┆ « ${query} »
┆˼💬˹┊ الـرد ↶
${answer}
╯──────────────⟢ـ
┊˼🪸˹┊ SINKO | ✅`;
}

module.exports = {
  config: {
    name: "الاصطناعي",
    aliases: ["ديبي"],
    version: "1.0.0",
    author: "SINKO",
    countDown: 3,
    category: "ai"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, type, messageReply } = event;
    let query = args.join(" ").trim();

    if (!query && type === "message_reply" && messageReply) {
      query = messageReply.body || "";
    }

    if (!query) {
      return api.sendMessage("╮──────────────⟢ـ\n┆˼⚠️˹┊ يـرجـى كـتـابـة سـؤال يـا مـلـك\n╯──────────────⟢ـ", threadID, messageID);
    }

    api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      const res = await fetchAI(query);
      const answer = res.data?.response || res.data?.answer || res.data?.message || "⚠️ الـذكـاء لا يـسـتـجـيـب حـالـيـاً ؛-؛";
      const text = buildMessage(query, answer);
      
      return api.sendMessage(text, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: "ديبسيك",
            messageID: info.messageID,
            author: senderID
          });
        }
      }, messageID);

    } catch (err) {
      return api.sendMessage(`╮──────────────⟢ـ\n┆˼❌˹┊ خـطأ فـي الـنـظـام\n╯──────────────⟢ـ`, threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    if (handleReply.author && senderID !== handleReply.author) return;

    const query = (body || "").trim();
    if (!query) return;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const res = await fetchAI(query);
      const answer = res.data?.response || res.data?.answer || res.data?.message || "⚠️ الـذكـاء لا يـسـتـجـيـب حـالـيـاً ؛-؛";
      const text = buildMessage(query, answer);

      return api.sendMessage(text, threadID, (err, info) => {
        if (!err) {
          global.client.handleReply.push({
            name: "ديبسيك",
            messageID: info.messageID,
            author: senderID
          });
        }
      }, messageID);

    } catch (err) {
      return api.sendMessage(`╮──────────────⟢ـ\n┆˼❌˹┊ خـطأ فـي الـرد\n╯──────────────⟢ـ`, threadID, messageID);
    }
  }
};
