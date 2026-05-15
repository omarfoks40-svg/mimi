const axios = require('axios');
const { Users } = require('../../database/database');

if (!global.playerData)   global.playerData   = {};
if (!global.pvpSessions)  global.pvpSessions  = {};
if (!global.soloSessions) global.soloSessions = {};

// ════════════════════════════════════════════════════════════════
//                        بيانات المناطق والأعداء
// ════════════════════════════════════════════════════════════════
const regions = [
  {
    name: "غابة كونوها المظلمة 🌲",
    desc: "غابة مليئة بالمخلوقات الخطرة",
    enemies: [
      { name: "ذئب الغابة",      emoji: "🐺", hp: 80,  atk: [8,18],   def: 2,  exp: 20, gold: [30,60]   },
      { name: "عقرب الرمال",     emoji: "🦂", hp: 95,  atk: [10,22],  def: 3,  exp: 25, gold: [40,70]   },
      { name: "أفعى كونوها",     emoji: "🐍", hp: 110, atk: [12,25],  def: 4,  exp: 30, gold: [50,90]   }
    ],
    boss: { name: "ملك الغابة — أوروتشيمارو الشبح", emoji: "👁️‍🗨️", hp: 300, atk: [20,40], def: 10, exp: 150, gold: [200,400], chakraAtk: 55 }
  },
  {
    name: "صحراء الرمال الحمراء 🏜️",
    desc: "صحراء لاهبة يسكنها عمالقة الرمل",
    enemies: [
      { name: "عقرب عملاق",      emoji: "🦂", hp: 130, atk: [18,32],  def: 6,  exp: 40, gold: [70,120]  },
      { name: "تنين الرمال",     emoji: "🐉", hp: 160, atk: [22,38],  def: 8,  exp: 55, gold: [90,160]  },
      { name: "مارد الصحراء",    emoji: "🧞", hp: 190, atk: [25,42],  def: 10, exp: 70, gold: [110,200] }
    ],
    boss: { name: "حاكم الرمال — غاارا الشيطان", emoji: "🏔️", hp: 500, atk: [35,60], def: 18, exp: 280, gold: [400,700], chakraAtk: 80 }
  },
  {
    name: "قلعة الضباب الأبيض 🌫️",
    desc: "قلعة غارقة في الضباب والأسرار",
    enemies: [
      { name: "فارس الضباب",     emoji: "⚔️", hp: 200, atk: [28,48],  def: 12, exp: 80,  gold: [140,240]  },
      { name: "مصاص دماء الليل", emoji: "🧛", hp: 240, atk: [32,55],  def: 15, exp: 100, gold: [180,300]  },
      { name: "ساحر الأوهام",    emoji: "🧙", hp: 270, atk: [35,58],  def: 18, exp: 120, gold: [220,380]  }
    ],
    boss: { name: "سيد الضباب — زابوزا موموتشي", emoji: "🗡️", hp: 750, atk: [50,80], def: 25, exp: 450, gold: [600,1000], chakraAtk: 110 }
  },
  {
    name: "بركان الشيطان النائم 🌋",
    desc: "أرض مشتعلة يسكنها أشرار الأكاتسوكي",
    enemies: [
      { name: "عفريت النار",     emoji: "🔥", hp: 320, atk: [40,70],  def: 20, exp: 150, gold: [280,480]  },
      { name: "ديدارا الانتحاري",emoji: "💣", hp: 380, atk: [48,82],  def: 22, exp: 180, gold: [340,580]  },
      { name: "ساسوري الدمية",   emoji: "🎭", hp: 420, atk: [52,88],  def: 25, exp: 210, gold: [400,680]  }
    ],
    boss: { name: "زعيم الأكاتسوكي — بين ناغاتو", emoji: "🌀", hp: 1100, atk: [70,110], def: 35, exp: 750, gold: [1000,1800], chakraAtk: 150 }
  },
  {
    name: "قصر اللانهاية — عالم كاغويا ✨",
    desc: "البُعد النهائي لأم الشياطين كاغويا",
    enemies: [
      { name: "ظل أوبيتو",       emoji: "🎭", hp: 500,  atk: [60,100],  def: 30, exp: 280, gold: [600,1000]  },
      { name: "إيتاتشي المحارب", emoji: "🦅", hp: 580,  atk: [70,115],  def: 35, exp: 330, gold: [750,1200]  },
      { name: "مادارا المُحيى",  emoji: "👺", hp: 680,  atk: [80,130],  def: 40, exp: 400, gold: [900,1500]  }
    ],
    boss: { name: "أم الشياطين — كاغويا أوتسوتسوكي", emoji: "🌕", hp: 2000, atk: [100,160], def: 55, exp: 2000, gold: [3000,6000], chakraAtk: 220 }
  }
];

// ════════════════════════════════════════════════════════════════
//                           بيانات الأسلحة
// ════════════════════════════════════════════════════════════════
const weaponsData = {
  "كوناي":                    { price: 100,   power: 10,  chakraCost: 20, special: "رمية مزدوجة",     specialDmg: [25,45],   image: "https://i.ibb.co/mrTLgJhL/image-1761345668581.jpg" },
  "شوريكين عملاق":            { price: 300,   power: 25,  chakraCost: 25, special: "عاصفة النجوم",    specialDmg: [50,85],   image: "https://i.ibb.co/LzYyLsZr/image-1761345459765.jpg" },
  "سيف الكوساناجي":           { price: 800,   power: 50,  chakraCost: 30, special: "شعلة الأفعى",     specialDmg: [90,140],  image: "https://i.ibb.co/wnFfnNw/image-1761345035295.jpg"  },
  "سيف ساميهادا":             { price: 1500,  power: 80,  chakraCost: 35, special: "امتصاص الشاكرا",  specialDmg: [130,200], image: "https://i.ibb.co/rJfDtgp/image-1761344112961.jpg"  },
  "مروحة مادارا":             { price: 5000,  power: 150, chakraCost: 45, special: "إعصار الدمار",    specialDmg: [220,340], image: "https://i.ibb.co/S467hDkX/image-1761344020005.jpg" },
  "سيف التوتسوكا":            { price: 12000, power: 300, chakraCost: 60, special: "إبرة الخلود",     specialDmg: [400,600], image: "https://i.ibb.co/4ZtjqThX/image-1761344296080.jpg" },
  "سلاح حكيم المسارات الستة": { price: 30000, power: 600, chakraCost: 80, special: "قوة الإله",       specialDmg: [800,1200],image: "https://i.ibb.co/27YSv3P9/image-1761344848203.jpg" }
};

// ════════════════════════════════════════════════════════════════
//                           بيانات الألقاب
// ════════════════════════════════════════════════════════════════
const titlesData = {
  "نينجا مبتدئ":   { price: 0,     minLevel: 1  },
  "جينين":         { price: 500,   minLevel: 5  },
  "تشونين":        { price: 1500,  minLevel: 10 },
  "جونين":         { price: 4000,  minLevel: 15 },
  "أنبو":          { price: 8000,  minLevel: 20 },
  "سانين أسطوري":  { price: 15000, minLevel: 30 },
  "كاجي":          { price: 30000, minLevel: 40 },
  "حكيم المسارات": { price: 60000, minLevel: 50 }
};

// ════════════════════════════════════════════════════════════════
//                         بيانات الإنجازات
// ════════════════════════════════════════════════════════════════
const achievements = [
  { id: "first_blood",  name: "أول دم 🩸",       desc: "اقتل عدوك الأول",          check: p => p.totalKills >= 1     },
  { id: "ten_kills",    name: "محارب 🗡️",         desc: "اقتل 10 أعداء",            check: p => p.totalKills >= 10    },
  { id: "boss_slayer",  name: "قاتل الزعماء 💀", desc: "اهزم زعيماً",              check: p => p.bossKills >= 1      },
  { id: "pvp_winner",   name: "بطل الحلبة 🏆",   desc: "انتصر في مبارزة",          check: p => p.pvpWins >= 1        },
  { id: "region_1",     name: "فاتح الغابة 🌲",  desc: "أكمل منطقة الغابة",        check: p => p.regionsCleared >= 1 },
  { id: "region_5",     name: "فاتح الأبعاد ✨",  desc: "أكمل جميع المناطق الخمس", check: p => p.regionsCleared >= 5 },
  { id: "rich",         name: "نينجا ثري 💰",    desc: "اجمع 10000 طن",            check: p => p.totalEarned >= 10000}
];

// ════════════════════════════════════════════════════════════════
//                        دوال مساعدة
// ════════════════════════════════════════════════════════════════
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function hpBar(current, max, len = 12) {
  const filled = Math.max(0, Math.round((current / max) * len));
  return `[${'█'.repeat(filled)}${'░'.repeat(len - filled)}]`;
}

function chakraBar(current, max, len = 10) {
  const filled = Math.max(0, Math.round((current / max) * len));
  return `[${'◈'.repeat(filled)}${'◇'.repeat(len - filled)}]`;
}

function initPlayer(id, name) {
  if (!global.playerData[id]) {
    global.playerData[id] = {
      name:           name || "نينجا",
      weapon:         "كوناي",
      title:          "نينجا مبتدئ",
      hp:             100, maxHp: 100,
      chakra:         80,  maxChakra: 80,
      level:          1,   exp: 0, maxExp: 100,
      totalKills:     0,   bossKills: 0,
      pvpWins:        0,   pvpLosses: 0,
      regionsCleared: 0,
      totalEarned:    0,
      achievements:   [],
      region:         0,
      potions:        3
    };
  }
  return global.playerData[id];
}

function grantExp(player, amount) {
  player.exp += amount;
  let leveled = false;
  while (player.exp >= player.maxExp) {
    player.exp    -= player.maxExp;
    player.level  += 1;
    player.maxExp  = Math.floor(player.maxExp * 1.4);
    player.maxHp  += 15;
    player.maxChakra += 10;
    player.hp      = player.maxHp;
    player.chakra  = player.maxChakra;
    leveled        = true;
  }
  return leveled;
}

function checkAchievements(player) {
  const newOnes = [];
  for (const ach of achievements) {
    if (!player.achievements.includes(ach.id) && ach.check(player)) {
      player.achievements.push(ach.id);
      newOnes.push(ach.name);
    }
  }
  return newOnes;
}

async function getStream(url) {
  try {
    const r = await axios.get(url, { responseType: "stream", timeout: 10000 });
    return r.data;
  } catch { return null; }
}

function getWeaponPower(weapon) {
  return weaponsData[weapon]?.power || 10;
}

function buildSoloCard(player, region, enemy, round, totalRounds) {
  const pHpBar = hpBar(player.hp, player.maxHp);
  const pCkBar = chakraBar(player.chakra, player.maxChakra);
  const eHpBar = hpBar(enemy.hp, enemy.maxHp || enemy.hp);
  const weapon = weaponsData[player.weapon] || {};
  return (
    `╔══════════════════════════╗\n` +
    `   ⚔️  مـعـركـة نـيـنـجـا  ⚔️\n` +
    `╚══════════════════════════╝\n` +
    `🗺️ المنطقة: ${region.name}\n` +
    `🔁 الجولة: ${round}/${totalRounds}\n` +
    `──────────────────────────\n` +
    `👤 ${player.name} — ${player.title}\n` +
    `❤️  ${pHpBar} ${player.hp}/${player.maxHp}\n` +
    `💠 ${pCkBar} ${player.chakra}/${player.maxChakra}\n` +
    `🗡️ السلاح: ${player.weapon}\n` +
    `🧪 جرعات: ${player.potions}\n` +
    `──────────────────────────\n` +
    `${enemy.emoji} ${enemy.name}\n` +
    `❤️  ${eHpBar} ${enemy.currentHp}/${enemy.hp}\n` +
    `──────────────────────────\n` +
    `✿ تفاعل:\n` +
    `⚔️ هجوم  |  🛡️ دفاع  |  💫 خاص\n` +
    `🧪 جرعة  |  🏃 هروب\n` +
    `╰────────────────────────╯`
  );
}

function buildPvpCard(s) {
  const p1Bar = hpBar(s.hp1, s.maxHp1);
  const p2Bar = hpBar(s.hp2, s.maxHp2);
  const ck1   = chakraBar(s.chakra1, s.maxChakra1);
  const ck2   = chakraBar(s.chakra2, s.maxChakra2);
  const turn  = s.turn === 1 ? `⚡ دور ${s.name1}` : `⚡ دور ${s.name2}`;
  return (
    `╔══════════════════════════╗\n` +
    `   🏆  مـبـارزة الـنـيـنـجـا  🏆\n` +
    `╚══════════════════════════╝\n` +
    `👤 ${s.name1} (${s.title1})\n` +
    `❤️  ${p1Bar} ${s.hp1}/${s.maxHp1}\n` +
    `💠 ${ck1} ${s.chakra1}/${s.maxChakra1}\n` +
    `🗡️ ${s.weapon1}\n` +
    `──────────────────────────\n` +
    `       ⚡ VS ⚡\n` +
    `──────────────────────────\n` +
    `👤 ${s.name2} (${s.title2})\n` +
    `❤️  ${p2Bar} ${s.hp2}/${s.maxHp2}\n` +
    `💠 ${ck2} ${s.chakra2}/${s.maxChakra2}\n` +
    `🗡️ ${s.weapon2}\n` +
    `══════════════════════════\n` +
    `${turn}\n` +
    `✿ تفاعل:\n` +
    `⚔️ هجوم  |  🛡️ دفاع  |  💫 خاص\n` +
    `╰────────────────────────╯`
  );
}

// ════════════════════════════════════════════════════════════════
//                         تصدير الأمر
// ════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name:      "سلاحي",
    aliases:   ["متجر", "قتال", "النخبة"],
    version:   "5.0.0",
    author:    "SINKO",
    countDown: 5,
    role:      0,
    category:  "fun",
    guide:     { ar: "سلاحي | سلاحي متجر | سلاحي شراء [اسم] | سلاحي النخبة | سلاحي انجازات" }
  },

  // ──────────────────────────────────────────────────────────────
  //                          onStart
  // ──────────────────────────────────────────────────────────────
  onStart: async function ({ api, event, args, Users: U }) {
    const { threadID, messageID, senderID } = event;
    const DB    = U || Users;
    const ud    = DB.get(senderID) || {};
    const money = ud.balance || 0;
    const pName = ud.name || "نينجا";
    const player = initPlayer(senderID, pName);
    const cmd   = (args[0] || "").toLowerCase();

    // ── لوحة النخبة ──
    if (cmd === "النخبة") {
      const top = Object.entries(global.playerData)
        .sort(([,a],[,b]) => b.level - a.level).slice(0, 10);
      let msg = `╔══════════════════════════╗\n   🌌 نـخـبـة الـشـيـنـوبـي 🌌\n╚══════════════════════════╝\n`;
      top.forEach(([,p], i) => {
        const m = i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`;
        msg += `${m} ${p.name} | ${p.title} | لـفل ${p.level}\n`;
      });
      msg += `╰────────────────────────╯\n┊ APLIN SYSTEM | ✅`;
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── الإنجازات ──
    if (cmd === "انجازات") {
      let msg = `╔══════════════════════════╗\n   🏅 إنـجـازاتـك 🏅\n╚══════════════════════════╝\n`;
      for (const ach of achievements) {
        const done = player.achievements.includes(ach.id);
        msg += `${done ? '✅' : '⬜'} ${ach.name} — ${ach.desc}\n`;
      }
      msg += `╰────────────────────────╯`;
      return api.sendMessage(msg, threadID, messageID);
    }

    // ── المتجر ──
    if (cmd === "متجر") {
      let s = `╔══════════════════════════╗\n   🛒 مـتـجـر كـونـوهـا 🛒\n╚══════════════════════════╝\n`;
      s += `⚔️ [ الأسلحة ]\n`;
      for (const [n,v] of Object.entries(weaponsData)) {
        s += `❆ ${n}\n  سعر: ${v.price} טּ | قوة: ${v.power} | خاص: ${v.special}\n`;
      }
      s += `──────────────────────────\n🏷️ [ الألقاب ]\n`;
      for (const [n,v] of Object.entries(titlesData)) {
        s += `❆ ${n} — ${v.price} טּ (لـفل ${v.minLevel}+)\n`;
      }
      s += `──────────────────────────\n🧪 [ الجرعات ]\n❆ جرعة شفاء — 150 טּ (×1)\n╰────────────────────────╯\nأرسل: سلاحي شراء [الإسم]`;
      return api.sendMessage(s, threadID, messageID);
    }

    // ── الشراء ──
    if (cmd === "شراء") {
      const item = args.slice(1).join(" ");
      if (item === "جرعة شفاء") {
        if (money < 150) return api.sendMessage("❌ تحتاج 150 טּ لشراء جرعة!", threadID, messageID);
        player.potions++;
        DB.set(senderID, { balance: money - 150 });
        return api.sendMessage(`🧪 اشتريت جرعة شفاء!\nجرعاتك الآن: ${player.potions}\n💰 الرصيد: ${money-150} טּ`, threadID, messageID);
      }
      if (weaponsData[item]) {
        if (money < weaponsData[item].price) return api.sendMessage("❌ رصيدك ما يكفي!", threadID, messageID);
        player.weapon = item;
        DB.set(senderID, { balance: money - weaponsData[item].price });
        return api.sendMessage(`⚔️ حصلت على ${item}!\n💰 الرصيد: ${money-weaponsData[item].price} טּ`, threadID, messageID);
      }
      if (titlesData[item]) {
        if (money < titlesData[item].price) return api.sendMessage("❌ رصيدك ما يكفي!", threadID, messageID);
        if (player.level < titlesData[item].minLevel) return api.sendMessage(`❌ تحتاج لـفل ${titlesData[item].minLevel} للحصول على هذا اللقب!`, threadID, messageID);
        player.title = item;
        DB.set(senderID, { balance: money - titlesData[item].price });
        return api.sendMessage(`🏷️ رتبتك الآن: ${item}\n💰 الرصيد: ${money-titlesData[item].price} טּ`, threadID, messageID);
      }
      return api.sendMessage("⚠️ هذا الغرض غير موجود في المتجر.", threadID, messageID);
    }

    // ── بطاقة اللاعب الرئيسية ──
    const imgUrl = weaponsData[player.weapon]?.image || "https://i.ibb.co/mrTLgJhL/image-1761345668581.jpg";
    const regName = regions[player.region]?.name || "منتهي من كل المناطق ✨";
    const statusMsg =
      `╔══════════════════════════╗\n` +
      `   🗡️ لـفـافـة الـشـيـنـوبـي 🗡️\n` +
      `╚══════════════════════════╝\n` +
      `👤 النينجا  ｢ ${pName} ｣\n` +
      `🏷️ الرتبة   ｢ ${player.title} ｣\n` +
      `🗡️ السلاح   ｢ ${player.weapon} ｣\n` +
      `💰 الرصيد   ｢ ${money} טּ｣\n` +
      `❤️ الصحة    ｢ ${player.hp}/${player.maxHp} ｣\n` +
      `💠 الشاكرا  ｢ ${player.chakra}/${player.maxChakra} ｣\n` +
      `🔋 المستوى  ｢ ${player.level} ｣\n` +
      `⚡ الخبرة   ｢ ${player.exp}/${player.maxExp} ｣\n` +
      `🧪 الجرعات  ｢ ${player.potions} ｣\n` +
      `🗺️ المنطقة  ｢ ${regName} ｣\n` +
      `🏆 PvP      ｢ ${player.pvpWins}فوز / ${player.pvpLosses}خسارة｣\n` +
      `╰────────────────────────╯\n` +
      `✿ تفاعل على الرسالة لتبدأ:\n` +
      `🦧 مغامرة منفردة\n` +
      `❤️ مبارزة مع لاعب آخر\n` +
      `┊ APLIN SYSTEM | ✅`;

    const imgStream = await getStream(imgUrl);
    const msgObj = imgStream ? { body: statusMsg, attachment: imgStream } : { body: statusMsg };

    api.sendMessage(msgObj, threadID, (err, info) => {
      if (!err && info) {
        global.client.handleReaction = global.client.handleReaction || [];
        global.client.handleReaction.push({
          name:      this.config.name,
          messageID: info.messageID,
          author:    senderID,
          type:      "main_card"
        });
      }
    }, messageID);
  },

  // ──────────────────────────────────────────────────────────────
  //                          onReaction
  // ──────────────────────────────────────────────────────────────
  onReaction: async function ({ api, handler, threadID, messageID, userID, reaction, Reaction }) {
    if (userID !== handler.author) return;

    const player = global.playerData[userID];
    if (!player) return;

    // ══ البطاقة الرئيسية ══
    if (handler.type === "main_card") {
      if (reaction === "🦧") {
        return this._startSolo({ api, threadID, userID, player, Reaction });
      }
      if (reaction === "❤") {
        Reaction.splice(Reaction.findIndex(h => h.messageID === messageID), 1);
        return api.sendMessage(
          `╔══════════════════════════╗\n   ⚡ إعـداد الـمـبـارزة ⚡\n╚══════════════════════════╝\n` +
          `يا ${player.name}، اذكر خصمك عن طريق الرد على هذه الرسالة بمنشنه!\n` +
          `مثال: @اسم_الشخص\n` +
          `╰────────────────────────╯`,
          threadID,
          (err, info) => {
            if (!err && info) {
              global.client.handleReply = global.client.handleReply || [];
              global.client.handleReply.push({
                name:      this.config.name,
                messageID: info.messageID,
                author:    userID,
                type:      "pvp_invite"
              });
            }
          }
        );
      }
      return;
    }

    // ══ جولة منفردة جارية ══
    if (handler.type === "solo_battle") {
      return this._handleSoloAction({ api, handler, threadID, messageID, userID, reaction, Reaction, player });
    }

    // ══ مبارزة PvP جارية ══
    if (handler.type === "pvp_battle") {
      return this._handlePvpAction({ api, handler, threadID, messageID, userID, reaction, Reaction, player });
    }
  },

  // ──────────────────────────────────────────────────────────────
  //              بدء المغامرة المنفردة
  // ──────────────────────────────────────────────────────────────
  _startSolo: async function ({ api, threadID, userID, player, Reaction }) {
    if (player.region >= regions.length) {
      return api.sendMessage(
        `✨ لقد أكملت جميع المناطق الخمس يا بطل!\nأنت أحد الأساطير الآن.\nاستخدم سلاحي النخبة لترى ترتيبك.`, threadID);
    }
    if (player.hp <= 0) {
      return api.sendMessage(
        `❌ صحتك صفر! لا يمكنك البدء بالقتال.\nاشترِ جرعة بـ: سلاحي شراء جرعة شفاء`, threadID);
    }

    const region = regions[player.region];
    const session = {
      region:    player.region,
      round:     0,
      isBoss:    false,
      totalRounds: region.enemies.length + 1,
      log:       []
    };
    global.soloSessions[userID] = session;

    await this._nextEnemy({ api, threadID, userID, player, Reaction });
  },

  // ──────────────────────────────────────────────────────────────
  //              تحميل العدو التالي
  // ──────────────────────────────────────────────────────────────
  _nextEnemy: async function ({ api, threadID, userID, player, Reaction }) {
    const session = global.soloSessions[userID];
    const region  = regions[session.region];
    session.round++;

    let enemy;
    if (session.round > region.enemies.length) {
      session.isBoss = true;
      const b = region.boss;
      enemy = { ...b, currentHp: b.hp, maxHp: b.hp };
    } else {
      const e = region.enemies[session.round - 1];
      enemy = { ...e, currentHp: e.hp, maxHp: e.hp };
    }
    session.enemy   = enemy;
    session.defending = false;

    const roundLabel = session.isBoss ? `🔥 الزعيم!` : `${session.round}/${region.enemies.length + 1}`;
    const card = buildSoloCard(player, region, enemy, roundLabel, session.totalRounds);

    api.sendMessage(card, threadID, (err, info) => {
      if (!err && info) {
        Reaction = Reaction || global.client.handleReaction;
        Reaction.push({
          name:      "سلاحي",
          messageID: info.messageID,
          author:    userID,
          type:      "solo_battle"
        });
      }
    });
  },

  // ──────────────────────────────────────────────────────────────
  //              معالجة حركات القتال المنفرد
  // ──────────────────────────────────────────────────────────────
  _handleSoloAction: async function ({ api, handler, threadID, messageID, userID, reaction, Reaction, player }) {
    const session = global.soloSessions[userID];
    if (!session || !session.enemy) return;

    const enemy   = session.enemy;
    const region  = regions[session.region];
    const wpnData = weaponsData[player.weapon] || { power: 10, chakraCost: 20, special: "ضربة", specialDmg: [20,40] };
    let log = "";

    // حذف الـ handler القديم
    const idx = Reaction.findIndex(h => h.messageID === messageID);
    if (idx !== -1) Reaction.splice(idx, 1);

    if (reaction === "⚔️") {
      // هجوم عادي
      const baseDmg = rng(wpnData.power * 0.5, wpnData.power * 1.5);
      const finalDmg = Math.max(1, baseDmg - (enemy.def || 0) + rng(0, player.level));
      enemy.currentHp = Math.max(0, enemy.currentHp - finalDmg);
      log += `⚔️ ضربت ${enemy.name} بـ ${finalDmg} ضرر!\n`;

    } else if (reaction === "🛡️") {
      // دفاع
      session.defending = true;
      log += `🛡️ اتخذت موقف الدفاع — الضرر القادم مُخفَّض!\n`;

    } else if (reaction === "💫") {
      // هجوم خاص
      if (player.chakra < wpnData.chakraCost) {
        log += `❌ شاكراك لا تكفي للهجوم الخاص! (تحتاج ${wpnData.chakraCost})\n`;
      } else {
        player.chakra -= wpnData.chakraCost;
        const specDmg = rng(wpnData.specialDmg[0], wpnData.specialDmg[1]);
        enemy.currentHp = Math.max(0, enemy.currentHp - specDmg);
        log += `💫 استخدمت ${wpnData.special}!\n🌀 ضرر: ${specDmg}!\n`;
      }

    } else if (reaction === "🧪") {
      // جرعة
      if (player.potions <= 0) {
        log += `❌ لا يوجد جرعات!\n`;
      } else {
        const heal = rng(30, 60);
        player.potions--;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        log += `🧪 استخدمت جرعة شفاء!\n❤️ استرددت ${heal} نقطة صحة!\n`;
      }

    } else if (reaction === "🏃") {
      // هروب
      delete global.soloSessions[userID];
      const penaltyExp = Math.floor(player.exp * 0.1);
      player.exp = Math.max(0, player.exp - penaltyExp);
      return api.sendMessage(
        `🏃 هربت من المعركة!\n` +
        `💸 خسرت ${penaltyExp} خبرة كعقوبة الهروب.\n` +
        `❤️ الصحة: ${player.hp}/${player.maxHp}`, threadID);
    } else {
      return;
    }

    // ── ردّ العدو (إذا ما مات) ──
    if (enemy.currentHp > 0 && reaction !== "🏃" && reaction !== "🧪") {
      const eDmg = rng(enemy.atk[0], enemy.atk[1]);
      const reduced = session.defending ? Math.floor(eDmg * 0.4) : eDmg;
      player.hp = Math.max(0, player.hp - reduced);
      player.chakra = Math.min(player.maxChakra, player.chakra + 8);
      log += `${enemy.emoji} ${enemy.name} ضربك بـ ${reduced} ضرر${session.defending ? ' (مُخفَّض)' : ''}!\n`;
      session.defending = false;

      // استخدام العدو لهجوم الشاكرا عشوائياً
      if (session.isBoss && Math.random() < 0.25) {
        const cAtk = enemy.chakraAtk || 40;
        player.hp = Math.max(0, player.hp - cAtk);
        log += `🌀 الزعيم استخدم هجوم الشاكرا! ضرر إضافي: ${cAtk}!\n`;
      }
    }
    session.defending = false;

    // ── هل مات اللاعب؟ ──
    if (player.hp <= 0) {
      delete global.soloSessions[userID];
      return api.sendMessage(
        `${log}\n╔══════════════════════════╗\n   💔 سـقـطـت فـي الـمـعـركـة!\n╚══════════════════════════╝\n` +
        `${enemy.emoji} انتصر عليك ${enemy.name}!\n` +
        `❤️ الصحة: 0/${player.maxHp}\n` +
        `اشترِ جرعة للعودة: سلاحي شراء جرعة شفاء\n` +
        `╰────────────────────────╯`, threadID);
    }

    // ── هل مات العدو؟ ──
    if (enemy.currentHp <= 0) {
      const goldEarned = rng(enemy.gold[0], enemy.gold[1]);
      const expEarned  = enemy.exp;
      const ud = Users.get(userID) || {};
      const newBal = (ud.balance || 0) + goldEarned;
      Users.set(userID, { balance: newBal });
      player.totalEarned += goldEarned;
      player.totalKills++;
      if (session.isBoss) player.bossKills++;

      const leveled = grantExp(player, expEarned);
      const achMsg  = checkAchievements(player);

      let victoryMsg =
        `${log}\n╔══════════════════════════╗\n   ✅ نـصـر! ✅\n╚══════════════════════════╝\n` +
        `${enemy.emoji} قضيت على ${enemy.name}!\n` +
        `💰 مكافأة: +${goldEarned} טּ (رصيدك: ${newBal})\n` +
        `⚡ خبرة: +${expEarned}\n` +
        `❤️ الصحة: ${player.hp}/${player.maxHp}\n` +
        `💠 الشاكرا: ${player.chakra}/${player.maxChakra}\n`;

      if (leveled) victoryMsg += `🔋 ارتقيت للمستوى ${player.level}! صحتك وشاكراك تجددت!\n`;
      if (achMsg.length > 0) victoryMsg += `🏅 إنجاز جديد: ${achMsg.join(', ')}\n`;

      // هل كان زعيماً؟
      if (session.isBoss) {
        player.region++;
        delete global.soloSessions[userID];
        if (player.region >= regions.length) {
          player.regionsCleared = regions.length;
          checkAchievements(player);
          return api.sendMessage(
            `${victoryMsg}` +
            `╔══════════════════════════╗\n   🌟 أكملت جميع المناطق! 🌟\n╚══════════════════════════╝\n` +
            `أنت الآن من أسطورة الشينوبي!\nاستخدم سلاحي النخبة لترى ترتيبك.\n` +
            `╰────────────────────────╯`, threadID);
        }
        player.regionsCleared = player.region;
        const nextReg = regions[player.region];
        victoryMsg +=
          `╔══════════════════════════╗\n   🗺️ منطقة جديدة مفتوحة! 🗺️\n╚══════════════════════════╝\n` +
          `التالية: ${nextReg.name}\n${nextReg.desc}\n` +
          `أرسل سلاحي لبدء المغامرة في المنطقة الجديدة.\n╰────────────────────────╯`;
        return api.sendMessage(victoryMsg, threadID);
      }

      victoryMsg += `╰────────────────────────╯\nيتوجه الخصم التالي...`;
      await api.sendMessage(victoryMsg, threadID);

      // العدو التالي
      return this._nextEnemy({ api, threadID, userID, player, Reaction: global.client.handleReaction });
    }

    // ── العدو لا يزال حياً ── إعادة بطاقة المعركة
    const roundLabel = session.isBoss ? `🔥 الزعيم!` : `${session.round}/${session.totalRounds}`;
    const newCard = `${log}\n` + buildSoloCard(player, region, enemy, roundLabel, session.totalRounds);
    api.sendMessage(newCard, threadID, (err, info) => {
      if (!err && info) {
        global.client.handleReaction.push({
          name:      "سلاحي",
          messageID: info.messageID,
          author:    userID,
          type:      "solo_battle"
        });
      }
    });
  },

  // ──────────────────────────────────────────────────────────────
  //              بدء المبارزة PvP (من onReply)
  // ──────────────────────────────────────────────────────────────
  onReply: async function ({ api, event, handleReply: Reply, Users: U }) {
    if (!Reply || Reply.type !== "pvp_invite") return;
    if (event.senderID !== Reply.author) return;

    const DB = U || Users;
    const { threadID, senderID, mentions } = event;

    const mentionedIDs = mentions ? Object.keys(mentions) : [];
    if (mentionedIDs.length === 0) {
      return api.sendMessage("❌ لم تذكر أي شخص! أرسل سلاحي مرة أخرى وتفاعل بـ ❤️ ثم اذكر خصمك.", threadID, event.messageID);
    }

    const opponentID = mentionedIDs[0];
    if (opponentID === senderID) {
      return api.sendMessage("❌ لا يمكنك مبارزة نفسك!", threadID, event.messageID);
    }

    const p1 = global.playerData[senderID];
    const p2 = global.playerData[opponentID];

    if (!p1) return api.sendMessage("❌ أنت غير مسجل! أرسل سلاحي أولاً.", threadID, event.messageID);
    if (!p2) return api.sendMessage("❌ خصمك غير مسجل في اللعبة! يجب أن يرسل سلاحي أولاً ليسجل.", threadID, event.messageID);

    if (p1.hp <= 0) return api.sendMessage("❌ صحتك صفر! اشترِ جرعة أولاً.", threadID, event.messageID);
    if (p2.hp <= 0) {
      const p2Name = p2.name || "الخصم";
      return api.sendMessage(`❌ ${p2Name} صحته صفر! لا يمكن مبارزته الآن.`, threadID, event.messageID);
    }

    const ud1 = DB.get(senderID)   || {};
    const ud2 = DB.get(opponentID) || {};

    const session = {
      player1: senderID,
      player2: opponentID,
      name1:   p1.name || "اللاعب 1",
      name2:   p2.name || "اللاعب 2",
      title1:  p1.title,
      title2:  p2.title,
      weapon1: p1.weapon,
      weapon2: p2.weapon,
      hp1:     p1.hp,  maxHp1: p1.maxHp,
      hp2:     p2.hp,  maxHp2: p2.maxHp,
      chakra1: p1.chakra, maxChakra1: p1.maxChakra,
      chakra2: p2.chakra, maxChakra2: p2.maxChakra,
      power1:  getWeaponPower(p1.weapon),
      power2:  getWeaponPower(p2.weapon),
      def1:    false,
      def2:    false,
      turn:    1,
      round:   1
    };

    const betText =
      `╔══════════════════════════╗\n   ⚡ مـبـارزة رسـمـيـة! ⚡\n╚══════════════════════════╝\n` +
      `👤 ${session.name1} يتحدى ${session.name2}!\n` +
      `🗡️ ${session.name1}: ${p1.weapon} (قوة ${session.power1})\n` +
      `🗡️ ${session.name2}: ${p2.weapon} (قوة ${session.power2})\n` +
      `══════════════════════════\nتبدأ المبارزة الآن...\n╰────────────────────────╯`;

    await api.sendMessage(betText, threadID);

    const card = buildPvpCard(session);
    api.sendMessage(card, threadID, (err, info) => {
      if (!err && info) {
        global.pvpSessions[info.messageID] = session;
        global.client.handleReaction = global.client.handleReaction || [];
        // كلا اللاعبين يستطيعان التفاعل لكن يُحكم الدور
        global.client.handleReaction.push({
          name:      "سلاحي",
          messageID: info.messageID,
          author:    senderID,
          type:      "pvp_battle",
          sessionMID: info.messageID
        });
        global.client.handleReaction.push({
          name:      "سلاحي",
          messageID: info.messageID,
          author:    opponentID,
          type:      "pvp_battle",
          sessionMID: info.messageID
        });
      }
    });
  },

  // ──────────────────────────────────────────────────────────────
  //              معالجة حركات PvP
  // ──────────────────────────────────────────────────────────────
  _handlePvpAction: async function ({ api, handler, threadID, messageID, userID, reaction, Reaction }) {
    const session = global.pvpSessions[handler.sessionMID];
    if (!session) return;

    const isP1 = userID === session.player1;
    const isP2 = userID === session.player2;
    if (!isP1 && !isP2) return;

    // تحقق من الدور
    const myTurn = (session.turn === 1 && isP1) || (session.turn === 2 && isP2);
    if (!myTurn) {
      return api.sendMessage(`⏳ انتظر دورك!`, threadID);
    }

    const attName = isP1 ? session.name1  : session.name2;
    const defName = isP1 ? session.name2  : session.name1;
    const attPwr  = isP1 ? session.power1 : session.power2;
    const attWpn  = isP1 ? session.weapon1 : session.weapon2;
    const wpnData = weaponsData[attWpn] || { power: 10, chakraCost: 20, special: "ضربة", specialDmg: [20,40] };
    let log = "";
    let dmgDone = 0;

    if (reaction === "⚔️") {
      const raw = rng(attPwr * 0.6, attPwr * 1.4);
      const defending = isP1 ? session.def2 : session.def1;
      dmgDone = defending ? Math.floor(raw * 0.5) : raw;
      if (isP1) { session.hp2 = Math.max(0, session.hp2 - dmgDone); session.def2 = false; }
      else       { session.hp1 = Math.max(0, session.hp1 - dmgDone); session.def1 = false; }
      log += `⚔️ ${attName} ضرب ${defName} بـ ${dmgDone}${defending ? ' (مُخفَّض)' : ''}!\n`;

    } else if (reaction === "🛡️") {
      if (isP1) session.def1 = true; else session.def2 = true;
      log += `🛡️ ${attName} يدافع — الضرر القادم مُخفَّض!\n`;

    } else if (reaction === "💫") {
      const myChakra = isP1 ? session.chakra1 : session.chakra2;
      if (myChakra < wpnData.chakraCost) {
        return api.sendMessage(`❌ شاكراك لا تكفي! (تحتاج ${wpnData.chakraCost})`, threadID);
      }
      const specDmg = rng(wpnData.specialDmg[0], wpnData.specialDmg[1]);
      const defending = isP1 ? session.def2 : session.def1;
      dmgDone = defending ? Math.floor(specDmg * 0.5) : specDmg;
      if (isP1) {
        session.chakra1 -= wpnData.chakraCost;
        session.hp2 = Math.max(0, session.hp2 - dmgDone);
        session.def2 = false;
      } else {
        session.chakra2 -= wpnData.chakraCost;
        session.hp1 = Math.max(0, session.hp1 - dmgDone);
        session.def1 = false;
      }
      log += `💫 ${attName} استخدم ${wpnData.special}!\n🌀 ضرر: ${dmgDone}${defending ? ' (مُخفَّض)' : ''}!\n`;

    } else {
      return;
    }

    session.round++;
    // حذف handlers القديمة للمعركة
    const toRemove = Reaction.filter(h => h.sessionMID === handler.sessionMID && h.messageID === messageID);
    toRemove.forEach(h => { const i = Reaction.indexOf(h); if (i !== -1) Reaction.splice(i, 1); });

    const winnerID  = session.hp2 <= 0 ? session.player1 : (session.hp1 <= 0 ? session.player2 : null);
    const loserID   = winnerID === session.player1 ? session.player2 : (winnerID === session.player2 ? session.player1 : null);
    const winnerNm  = winnerID === session.player1 ? session.name1 : session.name2;
    const loserNm   = winnerID === session.player1 ? session.name2 : session.name1;

    if (winnerID) {
      const prize = rng(200, 500) + session.round * 10;
      const udW   = Users.get(winnerID) || {};
      const udL   = Users.get(loserID)  || {};
      const loserBal = Math.max(0, (udL.balance || 0) - 100);
      Users.set(winnerID, { balance: (udW.balance || 0) + prize });
      Users.set(loserID,  { balance: loserBal });

      const wp = global.playerData[winnerID];
      const lp = global.playerData[loserID];
      if (wp) { wp.pvpWins++;   grantExp(wp, 100); checkAchievements(wp); }
      if (lp) { lp.pvpLosses++; }

      delete global.pvpSessions[handler.sessionMID];
      return api.sendMessage(
        `${log}\n╔══════════════════════════╗\n   🏆 انـتـهـت الـمـبـارزة! 🏆\n╚══════════════════════════╝\n` +
        `🏅 الفائز: ${winnerNm}!\n` +
        `💔 الخاسر: ${loserNm}\n` +
        `══════════════════════════\n` +
        `💰 ${winnerNm} ربح: +${prize} טּ\n` +
        `💸 ${loserNm} خسر: -100 טּ\n` +
        `⚡ ${winnerNm} ربح 100 خبرة!\n` +
        `╰────────────────────────╯`, threadID);
    }

    // استمرار المعركة
    session.turn = session.turn === 1 ? 2 : 1;
    const newCard = `${log}\n` + buildPvpCard(session);
    api.sendMessage(newCard, threadID, (err, info) => {
      if (!err && info) {
        global.pvpSessions[info.messageID] = session;
        delete global.pvpSessions[messageID];
        global.client.handleReaction.push({
          name: "سلاحي", messageID: info.messageID, author: session.player1, type: "pvp_battle", sessionMID: info.messageID
        });
        global.client.handleReaction.push({
          name: "سلاحي", messageID: info.messageID, author: session.player2, type: "pvp_battle", sessionMID: info.messageID
        });
      }
    });
  }
};
