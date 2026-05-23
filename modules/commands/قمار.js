const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');

function readDB(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { return {}; }
}

function writeDB(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

const SLOTS = ['🍒', '🍋', '🍇', '⭐', '💎', '🎰'];

function spin() {
    return [
        SLOTS[Math.floor(Math.random() * SLOTS.length)],
        SLOTS[Math.floor(Math.random() * SLOTS.length)],
        SLOTS[Math.floor(Math.random() * SLOTS.length)]
    ];
}

function calcMultiplier(reels) {
    const [a, b, c] = reels;
    if (a === b && b === c) {
        if (a === '💎') return { mult: 10, msg: '💎 الجاكبوت! 3 ماسات!' };
        if (a === '⭐') return { mult: 5, msg: '⭐ 3 نجوم رابحة!' };
        return { mult: 3, msg: '🎉 3 متشابهة!' };
    }
    if (a === b || b === c || a === c) return { mult: 1.5, msg: '✨ 2 متشابهان' };
    return { mult: 0, msg: '💀 ما طالعتها' };
}

module.exports = {
    config: {
        name: 'قمار',
        aliases: ['slots', 'سلوتس', 'ماكينة'],
        version: '5.0',
        author: 'سينكو',
        countDown: 15,
        prefix: true,
        category: 'tools',
        description: '🎰 ماكينة سلوتس مضغوطة ومثالية لشاشة الماسنجر بدون تشويه.',
        guide: { ar: '{pn} <المبلغ>' }
    },

    onStart: async ({ api, event, args }) => {
        const { senderID, threadID, messageID } = event;

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 50) {
            return api.sendMessage(
                `....................\n` +
                `. 🎰 SLOTS MACHINE .\n` +
                `....................\n` +
                `. ⚠️ الحد الأدنى 50 .\n` +
                `....................`,
                threadID, messageID
            );
        }

        const userDB = readDB(userDBPath);

        if (!userDB[senderID] || (userDB[senderID].balance || 0) < amount) {
            return api.sendMessage(
                `....................\n` +
                `. 🎰 SLOTS MACHINE .\n` +
                `....................\n` +
                `. ❌ رصيدك ما يكفي .\n` +
                `....................`,
                threadID, messageID
            );
        }

        // 1️⃣ الماكينة المضغوطة المبدئية
        const msg = await api.sendMessage(
            `....................\n` +
            `. 🎰 CASINO SLOT  .\n` +
            `....................\n` +
            `. [ ⏳ | ⏳ | ⏳ ] .\n` +
            `....................\n` +
            `. 🕹️ جاري التدوير... .\n` +
            `....................`,
            threadID
        );

        // 2️⃣ حلقة الأنيميشن المضغوطة (3 لفات سريعة ومستقرة)
        for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 1200));
            const fakeReels = spin();
            await api.editMessage(
                `....................\n` +
                `. 🎰 SPINNING...   .\n` +
                `....................\n` +
                `. [ ${fakeReels[0]} | ${fakeReels[1]} | ${fakeReels[2]} ] .\n` +
                `....................\n` +
                `. 🔄 تتقلب حياً...  .\n` +
                `....................`,
                msg.messageID
            );
        }

        // 3️⃣ حساب النتيجة وتحديث قاعدة البيانات
        const reels = spin();
        const { mult, msg: resultMsg } = calcMultiplier(reels);
        const winAmount = Math.floor(amount * mult);
        const net = winAmount - amount;

        userDB[senderID].balance = (userDB[senderID].balance || 0) + net;
        writeDB(userDBPath, userDB);

        let outcome;
        let headerTitle = ". 🎉 WINNER WIN 🎉 .";

        if (net > 0) {
            outcome = `✅ ربحت ${net} رصيد!`;
        } else if (net === 0) {
            outcome = `🤝 تعادل واسترددت`;
            headerTitle = ". 🟨 DRAW SLOT 🟨 .";
        } else {
            outcome = `❌ خسرت ${Math.abs(net)} رصيد`;
            headerTitle = ". 💀 BUSTED SLOT 💀 .";
        }

        await new Promise(r => setTimeout(r, 1000));

        // 4️⃣ التعديل النهائي الثابت - الحجم المناسب تماماً للفقاعة الزرقاء
        const finalReport = 
            `....................\n` +
            `${headerTitle}\n` +
            `....................\n` +
            `. [ ${reels[0]} | ${reels[1]} | ${reels[2]} ] .\n` +
            `....................\n` +
            `. ${net >= 0 ? '💰 JACKPOT!! 💰' : '💀 LOST IT!! 💀'} .\n` +
            `....................\n\n` +
            `🎰 النتيجة: ${resultMsg}\n` +
            `📊 المصير: ${outcome}\n` +
            `💳 رصيدك الآن: ${userDB[senderID].balance.toLocaleString()}`;

        api.setMessageReaction(net > 0 ? '🎉' : net === 0 ? '🤝' : '💀', messageID, () => {}, true);
        return api.editMessage(finalReport, msg.messageID);
    }
};
