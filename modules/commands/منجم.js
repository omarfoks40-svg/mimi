const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');
function readDB(p) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : {}; } catch(e){return{};} }
function writeDB(p,d) { fs.writeFileSync(p, JSON.stringify(d,null,4)); }

const LOOTS = [
    { name: "🪨 حجر عادي", reward: 10, chance: 50 },
    { name: "🪙 عملة نحاسية", reward: 50, chance: 25 },
    { name: "💵 رزمة كاش", reward: 150, chance: 15 },
    { name: "💎 سبيكة ذهب أسطورية", reward: 500, chance: 8 },
    { name: "👑 تاج الملك الأثري", reward: 1500, chance: 2 }
];

module.exports = {
    config: {
        name: "منجم",
        aliases: ["mine", "منجم", "حفر"],
        version: "1.0",
        author: "سينكو",
        countDown: 15,
        prefix: true,
        category: "tools",
        description: "⛏️ اذهب للمناجم واحفر حياً لاستخراج الثروات.",
        guide: { ar: "{pn}" }
    },

    onStart: async ({ api, event }) => {
        const { senderID, threadID, messageID } = event;

        const userDB = readDB(userDBPath);
        const user = userDB[senderID];
        if (!user) return api.sendMessage("❌ ما عندك حساب، استخدم: عمل", threadID, messageID);

        const msg = await api.sendMessage(`💥 🧱 🧱\n⛏️ جاري ضرب الصخور والبحث في أعماق الأرض...`, threadID);

        // أنيميشن تكسير الصخور والتعدين
        const frames = [
            `💥 🧱 🧱\n⛏️ بوم! جاري التكسير...`,
            `✨ ⛏️ 🧱\nشغّال حفر وبحث عن الذهب...`,
            `💨 🧱 💥\nقربنا نصل لطبقة المعادن...`
        ];

        for (let i = 0; i < frames.length; i++) {
            await new Promise(r => setTimeout(r, 1200));
            await api.editMessage(frames[i], msg.messageID);
        }

        // تحديد الجائزة بناء على النسب
        const roll = Math.random() * 100;
        let cum = 0;
        let finalLoot = LOOTS[0];
        
        for (const loot of LOOTS) {
            cum += loot.chance;
            if (roll < cum) {
                finalLoot = loot;
                break;
            }
        }

        user.balance = (user.balance || 0) + finalLoot.reward;
        writeDB(userDBPath, userDB);

        await new Promise(r => setTimeout(r, 1000));

        const report = 
            `●─────── ⌬ ───────●\n` +
            `┇ ⛏️ انـتـهـت عـمـلـيـة الـتـعـديـن!\n` +
            `┇\n` +
            `┇  الـمـعـدن الـمـسـتـخرج: ${finalLoot.name}\n` +
            `┇  الأربـاح: +${finalLoot.reward} قروش\n` +
            `┇\n` +
            `┇  رصـيـدك الإجـمـالـي: ${user.balance.toLocaleString()} ذهب\n` +
            `●─────── ⌬ ───────●`;

        api.setMessageReaction('⛏️', messageID, () => {}, true);
        return api.editMessage(report, msg.messageID);
    }
};
