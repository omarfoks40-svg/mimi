const axios = require('axios');
const { Users } = require('../../database/database');

if (!global.playerData) global.playerData = {};

const enemies = [
  { name: "أوتشيها مادارا",          emoji: "👺", attack: [40, 70], reward: [200, 400] },
  { name: "أوتشيها إيتاتشي",          emoji: "👁️", attack: [35, 60], reward: [180, 350] },
  { name: "بين (ناغاتو)",             emoji: "🌀", attack: [45, 75], reward: [250, 500] },
  { name: "أوتشيها أوبيتو",           emoji: "🎭", attack: [38, 65], reward: [220, 450] },
  { name: "أوروتشيمارو",              emoji: "🐍", attack: [30, 55], reward: [150, 300] },
  { name: "كيسامي",                  emoji: "🦈", attack: [32, 58], reward: [160, 320] },
  { name: "كاكوزو",                  emoji: "🧵", attack: [28, 52], reward: [140, 280] },
  { name: "ديدارا",                  emoji: "💣", attack: [30, 50], reward: [150, 300] },
  { name: "ساسوري",                  emoji: "🦂", attack: [25, 48], reward: [130, 260] },
  { name: "هيدان",                   emoji: "💀", attack: [35, 55], reward: [170, 340] },
  { name: "كاغويا أوتسوتسوكي",        emoji: "🌕", attack: [60, 90], reward: [500, 1000] },
  { name: "موموشيكي",                emoji: "👹", attack: [55, 85], reward: [450, 900] }
];

const weaponsData = {
  "كوناي":                    { price: 100,   image: "https://i.ibb.co/mrTLgJhL/image-1761345668581.jpg", power: 10 },
  "شوريكين عملاق":            { price: 300,   image: "https://i.ibb.co/LzYyLsZr/image-1761345459765.jpg", power: 25 },
  "سيف الكوساناجي":           { price: 800,   image: "https://i.ibb.co/wnFfnNw/image-1761345035295.jpg",  power: 50 },
  "سيف ساميهادا":             { price: 1500,  image: "https://i.ibb.co/rJfDtgp/image-1761344112961.jpg",  power: 80 },
  "مروحة مادارا":             { price: 5000,  image: "https://i.ibb.co/S467hDkX/image-1761344020005.jpg", power: 150 },
  "سيف التوتسوكا":            { price: 12000, image: "https://i.ibb.co/4ZtjqThX/image-1761344296080.jpg", power: 300 },
  "سلاح حكيم المسارات الستة": { price: 30000, image: "https://i.ibb.co/27YSv3P9/image-1761344848203.jpg", power: 600 }
};

const titlesData = {
  "نينجا مبتدئ":   { price: 0 },
  "جينين":         { price: 500 },
  "تشونين":        { price: 1500 },
  "جونين":         { price: 4000 },
  "أنبو":          { price: 8000 },
  "سانين أسطوري":  { price: 15000 },
  "كاجي":          { price: 30000 },
  "حكيم المسارات": { price: 60000 }
};

function initPlayer(id) {
  if (!global.playerData[id]) {
    global.playerData[id] = { weapon: "لا شيء", title: "نينجا مبتدئ", health: 100, level: 1, exp: 0, maxExp: 100 };
  }
  return global.playerData[id];
}

async function getStream(url) {
  try {
    const r = await axios.get(url, { responseType: "stream", timeout: 10000 });
    return r.data;
  } catch { return null; }
}

module.exports = {
  config: {
    name: "قتال",
    aliases: ["متجر", "قتال", "النخبة"],
    version: "4.0.0",
    author: "SINKO",
    countDown: 5,
    role: 0,
    category: "fun",
    guide: { ar: "سلاحي | سلاحي متجر | سلاحي شراء [اسم] | سلاحي النخبة" }
  },

  onStart: async function ({ api, event, args, Users: U }) {
    const { threadID, messageID, senderID } = event;
    const DB = U || Users;
    const userData = DB.get(senderID) || {};
    const money = userData.balance || 0;
    const playerName = userData.name || "اللاعب";
    const player = initPlayer(senderID);
    const cmd = (args[0] || "").toLowerCase();

    if (cmd === "النخبة") {
      const top = Object.entries(global.playerData)
        .sort(([, a], [, b]) => b.level - a.level).slice(0, 10);
      let msg = `> ˼🌌˹↜ نـخـبـة الـشـيـنـوبـي ↶\n╮──────────────⟢ـ\n`;
      top.forEach(([, p], i) => {
        const m = i < 3 ? ['🥇','🥈','🥉'][i] : '🔸';
        msg += `┆˼${m}˹┊ ${p.title} ↜ ليفل ${p.level}\n`;
      });
      msg += `╯──────────────⟢ـ\n┊˼🪸˹┊ APLIN SYSTEM | ✅`;
      return api.sendMessage(msg, threadID, messageID);
    }

    if (cmd === "متجر") {
      let s = `> ˼🛒˹↜ مـتـجـر كـونـوهـا ↶\n╮──────────────⟢ـ\n❆˹┊ [ الأسلحة ]\n`;
      for (const [n, v] of Object.entries(weaponsData)) s += `❆˹┊ ${n} ↜ ${v.price} טּ\n`;
      s += `❆˹┊ ───────────\n❆˹┊ [ الألقاب ]\n`;
      for (const [n, v] of Object.entries(titlesData)) s += `❆˹┊ ${n} ↜ ${v.price} טּ\n`;
      s += `╯──────────────⟢ـ\nأرسل: سلاحي شراء [الإسم]\n┊˼🪸˹┊ APLIN SYSTEM | ✅`;
      return api.sendMessage(s, threadID, messageID);
    }

    if (cmd === "شراء") {
      const item = args.slice(1).join(" ");
      if (weaponsData[item]) {
        if (money < weaponsData[item].price) return api.sendMessage("❌ رصيدك ما يكفي!", threadID, messageID);
        player.weapon = item;
        DB.set(senderID, { balance: money - weaponsData[item].price });
        return api.sendMessage(`> ˼⚔️˹↜ تـم الـتـسـلـيح ↶\n\nحصلت على ${item}!\n💰 الرصيد: ${money - weaponsData[item].price} טּ`, threadID, messageID);
      }
      if (titlesData[item]) {
        if (money < titlesData[item].price) return api.sendMessage("❌ رصيدك ما يكفي!", threadID, messageID);
        player.title = item;
        DB.set(senderID, { balance: money - titlesData[item].price });
        return api.sendMessage(`> ˼🏷️˹↜ تـرقيـة جـديـدة ↶\n\nرتبتك الآن: ${item}\n💰 الرصيد: ${money - titlesData[item].price} טּ`, threadID, messageID);
      }
      return api.sendMessage("⚠️ هذا الغرض غير موجود.", threadID, messageID);
    }

    const imgUrl = weaponsData[player.weapon]?.image || "https://i.ibb.co/mrTLgJhL/image-1761345668581.jpg";
    const statusMsg =
      `> ˼🗡️˹↜ لـفـافـة الـشـيـنـوبـي ↶\n` +
      `╮──────────────⟢ـ\n` +
      `┆˼👤˹┊ الـنـيـنجـا ↜｢ ${playerName} ｣\n` +
      `┆˼🗡️˹┊ الـسـلاح  ↜｢ ${player.weapon} ｣\n` +
      `┆˼🏷˹┊ الـرتبـة  ↜｢ ${player.title} ｣\n` +
      `┆˼💰˹┊ الـرصـيـد ↜｢ ${money} טּ｣\n` +
      `┆˼❤˹┊ الـصـحـة  ↜｢ ${player.health}/100 ｣\n` +
      `┆˼🔋˹┊ الـمـستوى ↜｢ ${player.level} ｣\n` +
      `┆˼⚡˹┊ الـخبرة   ↜｢ ${player.exp}/${player.maxExp} ｣\n` +
      `╯──────────────⟢ـ\n` +
      `✿┊🕹️ تفاعل على الرسالة بـ:\n` +
      `✿┊ 👊 هجوم  |  👍 تمرين  |  ❤ شفاء\n` +
      `┊˼🪸˹┊ APLIN SYSTEM | ✅`;

    const imgStream = await getStream(imgUrl);
    const msgObj = imgStream ? { body: statusMsg, attachment: imgStream } : { body: statusMsg };

    api.sendMessage(msgObj, threadID, (err, info) => {
      if (!err && info) {
        if (!global.client.handleReaction) global.client.handleReaction = [];
        global.client.handleReaction.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID
        });
      }
    }, messageID);
  },

  onReaction: async function ({ api, handler, threadID, userID, reaction }) {
    if (userID !== handler.author) return;

    const player = initPlayer(userID);
    const userData = Users.get(userID) || {};
    let money = userData.balance || 0;

    if (reaction === "👊") {
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const bonus = weaponsData[player.weapon]?.power || 5;
      const pAtk = Math.floor(Math.random() * 50) + bonus;
      const eAtk = Math.floor(Math.random() * (enemy.attack[1] - enemy.attack[0])) + enemy.attack[0];
      if (pAtk > eAtk) {
        const rew = Math.floor(Math.random() * (enemy.reward[1] - enemy.reward[0])) + enemy.reward[0];
        player.exp += 30;
        if (player.exp >= player.maxExp) { player.level++; player.exp = 0; player.maxExp += 100; }
        Users.set(userID, { balance: money + rew });
        return api.sendMessage(
          `> ˼✅˹↜ نـصـر مـؤزر ↶\n╮──────────────⟢ـ\n` +
          `┆ هزمت ${enemy.name} ${enemy.emoji}\n` +
          `┆ 💰 مكافأة: +${rew} טּ\n` +
          `┆ ⚡ خبرة: +30\n` +
          `┆ 🔋 المستوى: ${player.level}\n` +
          `╯──────────────⟢ـ`, threadID);
      } else {
        player.health = Math.max(0, player.health - 20);
        return api.sendMessage(
          `> ˼❌˹↜ تـراجـع ↶\n╮──────────────⟢ـ\n` +
          `┆ هزمك ${enemy.name} ${enemy.emoji}\n` +
          `┆ ❤ الصحة: ${player.health}/100\n` +
          `┆ استخدم ❤ للشفاء\n` +
          `╯──────────────⟢ـ`, threadID);
      }
    }

    if (reaction === "👍") {
      if (money < 50) return api.sendMessage("❌ تحتاج 50 טּ للتمرين!", threadID);
      player.exp += 50;
      if (player.exp >= player.maxExp) { player.level++; player.exp = 0; player.maxExp += 100; }
      Users.set(userID, { balance: money - 50 });
      return api.sendMessage(
        `> ˼🔥˹↜ تـمـريـن ↶\n╮──────────────⟢ـ\n` +
        `┆ ⚡ خبرة: +50\n` +
        `┆ 🔋 المستوى: ${player.level}\n` +
        `┆ 💰 الرصيد: ${money - 50} טּ\n` +
        `╯──────────────⟢ـ`, threadID);
    }

    if (reaction === "❤") {
      if (money < 100) return api.sendMessage("❌ الشفاء يكلف 100 טּ!", threadID);
      player.health = 100;
      Users.set(userID, { balance: money - 100 });
      return api.sendMessage(
        `> ˼❤˹↜ شـفـاء ↶\n╮──────────────⟢ـ\n` +
        `┆ ❤ الصحة عادت 100%\n` +
        `┆ 💰 الرصيد: ${money - 100} טּ\n` +
        `╯──────────────⟢ـ`, threadID);
    }
  }
};
