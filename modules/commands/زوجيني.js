const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const LOVE_MSGS = [
  'قلبان في روح واحدة 💘',
  'مكتوبين على بعض منذ الأزل 🌙',
  'الحب الحقيقي يجمعهم 💫',
  'سعادة لا تنتهي معاً 🌹',
  'شمس وقمر ❤️‍🔥',
  'نصفان يكملان بعضهما 🫶',
  'حكايتهم أجمل من أفلام 🎬',
];

const COMPAT_MSGS = {
  high:   ['توافق مثالي! ❤️‍🔥', 'الحب كامل بينهم! 💍', 'جوزهم بعض بسرعة! 💒'],
  medium: ['بينهم كيمياء حلوة! 💫', 'مستقبل واعد! 🌟', 'يستحقون فرصة! 💝'],
  low:    ['كل ضدين يتجاذبان! 🌀', 'التحديات تقوي العلاقة! 💪', 'الحب يتغلب على كل شيء! 🌈'],
};

function getLovePercent(id1, id2) {
  const combined = (BigInt(id1) + BigInt(id2)).toString();
  let hash = 0;
  for (const ch of combined) hash = (hash * 31 + ch.charCodeAt(0)) % 10000;
  return (hash % 41) + 60;
}

function getHeartBar(percent) {
  const filled = Math.round(percent / 10);
  return '❤️'.repeat(filled) + '🤍'.repeat(10 - filled);
}

module.exports = {
  config: {
    name: 'زوجيني',
    aliases: ['couple', 'زوجيني_بطاقة', 'بطاقة_حب', 'pair'],
    version: '1.0',
    author: 'سينكو',
    countDown: 10,
    prefix: true,
    category: 'fun',
    description: '💑 بطاقة الزوجين — تظقيم صورتين في بطاقة واحدة جميلة',
    guide: { ar: '{pn} @شخص — لتظقيمك مع شخص معين\n{pn}       — تظقيم عشوائي مع شخص من المجموعة' }
  },

  onStart: async ({ api, event, args }) => {
    const { senderID, threadID, messageID, mentions, messageReply } = event;

    api.setMessageReaction('💘', messageID, () => {}, true);

    let id2 = null;

    if (Object.keys(mentions).length > 0) {
      id2 = Object.keys(mentions)[0];
    } else if (messageReply) {
      id2 = messageReply.senderID;
    } else {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const members = (threadInfo.participantIDs || []).filter(id => id !== senderID);
        if (members.length === 0) {
          return api.sendMessage('ما في أحد ثاني في المجموعة! 😅', threadID, messageID);
        }
        id2 = members[Math.floor(Math.random() * members.length)];
      } catch (e) {
        return api.sendMessage('فشل في جلب أعضاء المجموعة 😕', threadID, messageID);
      }
    }

    if (id2 === senderID) {
      return api.sendMessage('ما تقدر تعمل بطاقة مع نفسك! 😄', threadID, messageID);
    }

    try {
      const [info1, info2] = await Promise.all([
        api.getUserInfo(senderID),
        api.getUserInfo(id2)
      ]);

      const name1 = info1[senderID]?.name || 'شخص 1';
      const name2 = info2[id2]?.name || 'شخص 2';

      const avatarUrl1 = `https://graph.facebook.com/${senderID}/picture?height=512&width=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const avatarUrl2 = `https://graph.facebook.com/${id2}/picture?height=512&width=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const cacheDir = path.join(__dirname, 'cache');
      await fs.ensureDir(cacheDir);

      const ts   = Date.now();
      const path1 = path.join(cacheDir, `pf1_${ts}.jpg`);
      const path2 = path.join(cacheDir, `pf2_${ts}.jpg`);

      const [img1, img2] = await Promise.all([
        axios.get(avatarUrl1, { responseType: 'arraybuffer', timeout: 10000 }),
        axios.get(avatarUrl2, { responseType: 'arraybuffer', timeout: 10000 }),
      ]);

      fs.writeFileSync(path1, Buffer.from(img1.data));
      fs.writeFileSync(path2, Buffer.from(img2.data));

      const lovePercent = getLovePercent(senderID, id2);
      const heartBar    = getHeartBar(lovePercent);
      const loveMsg     = LOVE_MSGS[Math.floor(Math.random() * LOVE_MSGS.length)];
      const compatKey   = lovePercent >= 85 ? 'high' : lovePercent >= 70 ? 'medium' : 'low';
      const compatMsg   = COMPAT_MSGS[compatKey][Math.floor(Math.random() * COMPAT_MSGS[compatKey].length)];

      const card =
`╔══════════════════════════╗
║     💑 بطاقة الزوجين 💑   ║
╠══════════════════════════╣
║                          ║
║  💙 ${name1.slice(0,10).padEnd(10)}    💜 ${name2.slice(0,10)} ║
║                          ║
╠══════════════════════════╣
║                          ║
║  💘 نسبة التوافق: ${lovePercent}%   ║
║  ${heartBar} ║
║                          ║
║  ✨ ${compatMsg.slice(0,22).padEnd(22)} ║
║                          ║
╠══════════════════════════╣
║  ${loveMsg.slice(0,24).padEnd(24)} ║
╚══════════════════════════╝`;

      await api.sendMessage(
        { body: card, attachment: [fs.createReadStream(path1), fs.createReadStream(path2)] },
        threadID,
        () => {
          try { fs.unlinkSync(path1); } catch (e) {}
          try { fs.unlinkSync(path2); } catch (e) {}
        },
        messageID
      );

      api.setMessageReaction('💞', messageID, () => {}, true);

    } catch (e) {
      console.error('pf error:', e.message);
      api.setMessageReaction('❌', messageID, () => {}, true);
      api.sendMessage('فشل في إنشاء البطاقة، جرب تاني 😅', threadID, messageID);
    }
  }
};
