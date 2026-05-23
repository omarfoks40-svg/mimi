const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');
function readDB(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : {}; } catch(e){return{};} }
function writeDB(p,d) { fs.writeFileSync(p, JSON.stringify(d,null,4)); }

// مصفوفة الجوائز الحقيقية
const SEGMENTS = [
  { label: '💀 جمجمة الخسارة الكاملة',  mult: 0,    chance: 10, icon: '💀' },
  { label: '🪨 حجارة الخسارة الخفيفة -25%',  mult: 0.75, chance: 15, icon: '🪨' },
  { label: '🃏 بطاقات التعادل لا شيء',        mult: 1,    chance: 15, icon: '🃏' },
  { label: '💵 قروش الأرباح الخفيفة +25%',   mult: 1.25, chance: 20, icon: '💵' },
  { label: '💰 قروش الأرباح العالية +50%',   mult: 1.5,  chance: 15, icon: '💰' },
  { label: '🪙 عملات الأرباح النارية +75%',   mult: 1.75, chance: 10, icon: '🪙' },
  { label: '👑 بطاقة الملك ضعف المبلغ x2!', mult: 2,    chance: 8,  icon: '👑' },
  { label: '💎 سبائك ذهب الجاك بوت x3!!', mult: 3,    chance: 4,  icon: '💎' },
  { label: '👑 ذهب الميجا الأسطوري x5!!!',   mult: 5,    chance: 3,  icon: '👑' },
];

// إطارات الدوران: السهم (👇 أو 👈 أو 👉) بيلف ويشير لاتجاه مختلف في الدائرة الملكية
const ANIMATION_FRAMES = [
  `🪙  💵  💎\n🪙  👇  💎\n💰  👑  🃏`,
  `🪙  💵  💎\n🪙  👉  💎\n💰  👑  🃏`,
  `🪙  💵  💎\n🪙  👇  💎\n💰  👑  🃏`,
  `🪙  💵  💎\n👈  ⚙️  💎\n💰  👑  🃏`,
  `🪙  💵  💎\n🪙  👆  💎\n💰  👑  🃏`,
  `🪙  💵  💎\n🪙  👈  💎\n💰  👑  🃏`,
  `🪙  💵  💎\n🪙  👆  💎\n💰  👑  🃏`,
  `🪙  💵  💎\n🪙  👉  💎\n💰  👑  🃏`
];

function spin() {
  const roll = Math.random() * 100;
  let cum = 0;
  for (const s of SEGMENTS) { cum += s.chance; if (roll < cum) return s; }
  return SEGMENTS[2];
}

const MS_COOLDOWN = 30 * 60 * 1000;

module.exports = {
  config: {
    name: 'عجلة',
    aliases: ['wheel', 'spin', 'دوامة'],
    version: '3.0',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    category: 'tools',
    description: '🎡 عجلة الحظ الدائرية بالسهم المتحرك والموجات!',
    guide: { ar: '{pn} <المبلغ>' }
  },

  onStart: async ({ api, event, args }) => {
    const { senderID, threadID, messageID } = event;

    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet < 100) {
      return api.sendMessage(
        '🎡 عجلة الحظ الدائرية!\n\nالاستخدام: عجلة <مبلغ>\nمثال: عجلة 500\nالحد الأدنى للرهان: 100 قروش',
        threadID, messageID
      );
    }

    const userDB = readDB(userDBPath);
    const user   = userDB[senderID];

    if (!user) return api.sendMessage('❌ ليس لديك حساب في اللعبة، استخدم أمر: عمل', threadID, messageID);

    const balance = user.balance || 0;
    if (balance < bet) {
      return api.sendMessage(`❌ رصيدك الحالي (${balance}) لا يكفي لتغطية هذا الرهان`, threadID, messageID);
    }

    const now  = Date.now();
    const last = user.lastSpin || 0;
    if (now - last < MS_COOLDOWN) {
      const rem = MS_COOLDOWN - (now - last);
      const mm  = Math.floor(rem / 60000);
      const ss  = Math.floor((rem % 60000) / 1000);
      return api.sendMessage(
        `⏰ العجلة تحتاج لفترة تبريد!\nعد مجدداً بعد: ${mm} دقيقة و ${ss} ثانية`,
        threadID, messageID
      );
    }

    // 1️⃣ إرسال الشكل الدائري المبدئي للعجلة وبداية حركة السهم
    const msg = await api.sendMessage(
      `🪙  💵  💎\n🪙  ⏳  💎\n💰  👑  🃏\n\n🎰 جاري تدوير السهم وسط الذهب والقروش...`,
      threadID
    );

    // 2️⃣ حلقة التعديل الحركية (السهم بيلف جوة الدائرة)
    let animationTicks = 0;
    while (animationTicks < 8) {
      await new Promise(r => setTimeout(r, 500)); // سرعة لفت السهم
      const frame = ANIMATION_FRAMES[animationTicks % ANIMATION_FRAMES.length];
      
      await api.editMessage(
        `${frame}\n\n🌀 السهم يدور ويبحث عن جائزتك الملكية...`,
        msg.messageID
      );
      animationTicks++;
    }

    // 3️⃣ حساب النتيجة الحقيقية بعد انتهاء الدوران
    const segment = spin();
    const returned = Math.floor(bet * segment.mult);
    const diff     = returned - bet;

    user.balance  = balance - bet + returned;
    user.lastSpin = now;
    writeDB(userDBPath, userDB);

    const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? `±0` : `${diff}`;
    const arrow   = diff > 0 ? '📈 أرباح ممتازة' : diff < 0 ? '📉 خسارة مفجعة' : '➡️ تعادل صافي';

    // 4️⃣ الإطار النهائي: وضع السهم يشير للأسفل وتثبيت الجائزة التي وقع عليها
    const finalReport = 
`🪙  💵  💎
🪙  👇  💎
💰  👑  🃏

🎡 استقرت العجلة تماماً!

🎯 النتيجة النهائية:
${segment.icon} ${segment.label} ${segment.icon}

💵 مبلغ الرهان:  ${bet.toLocaleString()} قروش
💰 العائد الفعلي:  ${returned.toLocaleString()}
${segment.icon} حالة الحساب: ${arrow} (${diffStr})

💳 رصيدك الإجمالي الحالي: ${user.balance.toLocaleString()} ذهب وقروش`;

    api.setMessageReaction(diff >= 0 ? '🎉' : '💀', messageID, () => {}, true);
    return api.editMessage(finalReport, msg.messageID);
  }
};
