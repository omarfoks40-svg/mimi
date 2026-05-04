const axios = require('axios');
const { Users } = require('../../database/database');

if (!global.arenaData) global.arenaData = {};

const fighters = [
  { name: "ناروتو أوزوماكي",   emoji: "🦊", style: "راسينغان",      hp: 120, atk: [30, 60], def: 10, reward: [150, 300] },
  { name: "ساسكي أوتشيها",     emoji: "⚡", style: "تشيدوري",      hp: 110, atk: [35, 65], def: 8,  reward: [170, 340] },
  { name: "روك لي",            emoji: "🥊", style: "فتح البوابات",  hp: 100, atk: [40, 70], def: 5,  reward: [200, 400] },
  { name: "نيجي حيوغا",        emoji: "👁", style: "باي كواي",     hp: 105, atk: [32, 58], def: 12, reward: [160, 320] },
  { name: "شيكامارو ناراً",    emoji: "🧠", style: "تحليل الظل",   hp: 90,  atk: [25, 50], def: 15, reward: [130, 260] },
  { name: "غاارا من الرمال",   emoji: "🏜️", style: "درع الرمال",   hp: 130, atk: [38, 68], def: 20, reward: [220, 440] },
  { name: "إيتاتشي أوتشيها",   emoji: "🌀", style: "أماتيراسو",    hp: 115, atk: [45, 80], def: 7,  reward: [280, 560] },
  { name: "مينيتو ناميكازي",   emoji: "⚡", style: "فلاش الأصفر",  hp: 125, atk: [50, 85], def: 10, reward: [300, 600] },
  { name: "جيرايا السانين",    emoji: "🐸", style: "ريئنسيكي",     hp: 140, atk: [42, 72], def: 12, reward: [250, 500] },
  { name: "تسونادي السانين",   emoji: "💪", style: "قوة الشفاء",   hp: 150, atk: [35, 60], def: 18, reward: [200, 400] }
];

const armorData = {
  "قميص نينجا":    { price: 200,   defense: 5,   image: "https://i.ibb.co/mrTLgJhL/image-1761345668581.jpg" },
  "درع كونوها":    { price: 600,   defense: 15,  image: "https://i.ibb.co/LzYyLsZr/image-1761345459765.jpg" },
  "درع الأكاتسوكي":{ price: 1800,  defense: 30,  image: "https://i.ibb.co/wnFfnNw/image-1761345035295.jpg"  },
  "درع الأنبو":    { price: 4000,  defense: 50,  image: "https://i.ibb.co/rJfDtgp/image-1761344112961.jpg"  },
  "درع الحكيم":    { price: 10000, defense: 100, image: "https://i.ibb.co/S467hDkX/image-1761344020005.jpg" }
};

const belts = {
  "حزام أبيض":   { price: 0 },
  "حزام أصفر":   { price: 300 },
  "حزام أخضر":   { price: 800 },
  "حزام أزرق":   { price: 2000 },
  "حزام أحمر":   { price: 5000 },
  "حزام أسود":   { price: 12000 },
  "حزام أسود ×2":{ price: 25000 },
  "حزام بلاتيني":{ price: 50000 }
};

function initArena(id) {
  if (!global.arenaData[id]) {
    global.arenaData[id] = { armor: "لا شيء", belt: "حزام أبيض", hp: 100, maxHp: 100, wins: 0, losses: 0, level: 1, exp: 0, maxExp: 100 };
  }
  return global.arenaData[id];
}

async function getStream(url) {
  try {
    const r = await axios.get(url, { responseType: "stream", timeout: 10000 });
    return r.data;
  } catch { return null; }
}

module.exports = {
  config: {
    name: "ارينا",
    aliases: ["ارينا", "حلبة", "مقاتل"],
    version: "1.0.0",
    author: "SINKO",
    countDown: 5,
    role: 0,
    category: "fun",
    guide: { ar: "مصارعة | مصارعة حلبة | مصارعة شراء [اسم] | مصارعة احصاء" }
  },

  onStart: async function ({ api, event, args, Users: U }) {
    const { threadID, messageID, senderID } = event;
    const DB = U || Users;
    const userData = DB.get(senderID) || {};
    const money = userData.balance || 0;
    const playerName = userData.name || "المقاتل";
    const arena = initArena(senderID);
    const cmd = (args[0] || "").toLowerCase();

    if (cmd === "حلبة") {
      let s = `> ˼🛒˹↜ حـلـبـة الـتـسـوّق ↶\n╮──────────────⟢ـ\n❆˹┊ [ الدروع ]\n`;
      for (const [n, v] of Object.entries(armorData)) s += `❆˹┊ ${n} ↜ ${v.price} טּ (دفاع: +${v.defense})\n`;
      s += `❆˹┊ ───────────\n❆˹┊ [ الأحزمة ]\n`;
      for (const [n, v] of Object.entries(belts)) s += `❆˹┊ ${n} ↜ ${v.price} טּ\n`;
      s += `╯──────────────⟢ـ\nأرسل: مصارعة شراء [الإسم]\n┊˼🪸˹┊ APLIN SYSTEM | ✅`;
      return api.sendMessage(s, threadID, messageID);
    }

    if (cmd === "شراء") {
      const item = args.slice(1).join(" ");
      if (armorData[item]) {
        if (money < armorData[item].price) return api.sendMessage("❌ رصيدك ما يكفي!", threadID, messageID);
        arena.armor = item;
        DB.set(senderID, { balance: money - armorData[item].price });
        return api.sendMessage(`> ˼🛡️˹↜ تـم الـتـدريـع ↶\n\nلبست ${item}!\n💰 الرصيد: ${money - armorData[item].price} טּ`, threadID, messageID);
      }
      if (belts[item]) {
        if (money < belts[item].price) return api.sendMessage("❌ رصيدك ما يكفي!", threadID, messageID);
        arena.belt = item;
        DB.set(senderID, { balance: money - belts[item].price });
        return api.sendMessage(`> ˼🥋˹↜ تـرقيـة الـحـزام ↶\n\nحزامك الآن: ${item}\n💰 الرصيد: ${money - belts[item].price} טּ`, threadID, messageID);
      }
      return api.sendMessage("⚠️ هذا الغرض غير موجود في الحلبة.", threadID, messageID);
    }

    if (cmd === "احصاء") {
      return api.sendMessage(
        `> ˼📊˹↜ إحـصـاءات الـمـقـاتـل ↶\n` +
        `╮──────────────⟢ـ\n` +
        `┆˼🏆˹┊ الانتصارات ↜｢ ${arena.wins} ｣\n` +
        `┆˼💔˹┊ الهزائم   ↜｢ ${arena.losses} ｣\n` +
        `┆˼📈˹┊ النسبة   ↜｢ ${arena.wins + arena.losses > 0 ? ((arena.wins / (arena.wins + arena.losses)) * 100).toFixed(1) : 0}% ｣\n` +
        `╯──────────────⟢ـ`, threadID, messageID);
    }

    const imgUrl = armorData[arena.armor]?.image || "https://i.ibb.co/mrTLgJhL/image-1761345668581.jpg";
    const def = armorData[arena.armor]?.defense || 0;
    const statusMsg =
      `> ˼🥋˹↜ بـطـاقـة الـمـقـاتـل ↶\n` +
      `╮──────────────⟢ـ\n` +
      `┆˼👤˹┊ الـمـقـاتـل ↜｢ ${playerName} ｣\n` +
      `┆˼🛡️˹┊ الـدرع     ↜｢ ${arena.armor} ｣\n` +
      `┆˼🥋˹┊ الـحـزام   ↜｢ ${arena.belt} ｣\n` +
      `┆˼🔰˹┊ الـدفـاع   ↜｢ +${def} ｣\n` +
      `┆˼💰˹┊ الـرصـيـد  ↜｢ ${money} טּ｣\n` +
      `┆˼❤˹┊ الـصـحـة   ↜｢ ${arena.hp}/${arena.maxHp} ｣\n` +
      `┆˼🔋˹┊ الـمـستوى  ↜｢ ${arena.level} ｣\n` +
      `┆˼🏆˹┊ انتـصـارات ↜｢ ${arena.wins} ｣\n` +
      `╯──────────────⟢ـ\n` +
      `✿┊🕹️ تفاعل على الرسالة بـ:\n` +
      `✿┊ 👊 قتال  |  🏃 هروب  |  ❤ شفاء\n` +
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

    const arena = initArena(userID);
    const userData = Users.get(userID) || {};
    let money = userData.balance || 0;

    if (reaction === "👊") {
      if (arena.hp <= 0) return api.sendMessage("❌ صحتك صفر! استخدم ❤ للشفاء أولاً.", threadID);

      const fighter = fighters[Math.floor(Math.random() * fighters.length)];
      const def = armorData[arena.armor]?.defense || 0;
      const myAtk = Math.floor(Math.random() * 40) + arena.level * 5;
      const fAtk = Math.floor(Math.random() * (fighter.atk[1] - fighter.atk[0])) + fighter.atk[0];
      const dmgToMe = Math.max(0, fAtk - def);

      if (myAtk >= fAtk) {
        const rew = Math.floor(Math.random() * (fighter.reward[1] - fighter.reward[0])) + fighter.reward[0];
        arena.wins++;
        arena.exp += 40;
        if (arena.exp >= arena.maxExp) { arena.level++; arena.exp = 0; arena.maxExp += 100; arena.maxHp += 10; arena.hp = arena.maxHp; }
        Users.set(userID, { balance: money + rew });
        return api.sendMessage(
          `> ˼🏆˹↜ فـوز بـالـضـربـة الـقـاضـيـة ↶\n╮──────────────⟢ـ\n` +
          `┆ هزمت ${fighter.name} ${fighter.emoji}\n` +
          `┆ 🥋 أسلوبه: ${fighter.style}\n` +
          `┆ 💰 مكافأة: +${rew} טּ\n` +
          `┆ ⚡ خبرة: +40\n` +
          `┆ 🔋 المستوى: ${arena.level}\n` +
          `┆ 🏆 مجموع انتصارات: ${arena.wins}\n` +
          `╯──────────────⟢ـ`, threadID);
      } else {
        arena.losses++;
        arena.hp = Math.max(0, arena.hp - dmgToMe);
        return api.sendMessage(
          `> ˼💔˹↜ هـزيـمـة ↶\n╮──────────────⟢ـ\n` +
          `┆ هزمك ${fighter.name} ${fighter.emoji}\n` +
          `┆ 🥋 استخدم: ${fighter.style}\n` +
          `┆ ❤ الصحة: ${arena.hp}/${arena.maxHp}\n` +
          `┆ 🛡️ الدرع خفّف الضرر بـ ${def}\n` +
          `┆ استخدم ❤ للشفاء\n` +
          `╯──────────────⟢ـ`, threadID);
      }
    }

    if (reaction === "🏃") {
      const penalty = Math.floor(money * 0.05);
      if (penalty > 0) Users.set(userID, { balance: Math.max(0, money - penalty) });
      return api.sendMessage(
        `> ˼🏃˹↜ هـروب ↶\n╮──────────────⟢ـ\n` +
        `┆ هربت من الحلبة!\n` +
        `┆ 💸 غرامة الهروب: -${penalty} טּ\n` +
        `╯──────────────⟢ـ`, threadID);
    }

    if (reaction === "❤") {
      const healCost = 80;
      if (money < healCost) return api.sendMessage(`❌ الشفاء يكلف ${healCost} טּ!`, threadID);
      arena.hp = arena.maxHp;
      Users.set(userID, { balance: money - healCost });
      return api.sendMessage(
        `> ˼❤˹↜ شـفـاء كـامـل ↶\n╮──────────────⟢ـ\n` +
        `┆ ❤ الصحة: ${arena.maxHp}/${arena.maxHp}\n` +
        `┆ 💰 الرصيد: ${money - healCost} טּ\n` +
        `╯──────────────⟢ـ`, threadID);
    }
  }
};
