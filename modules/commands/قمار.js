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
        if (a === '💎') return { mult: 10, msg: '💎 الجاكبوت! ثلاث ماسات!' };
        if (a === '⭐') return { mult: 5, msg: '⭐ ثلاث نجوم رابحة!' };
        return { mult: 3, msg: '🎉 ثلاثة متشابهة!' };
    }
    if (a === b || b === c || a === c) return { mult: 1.5, msg: '✨ اثنان متشابهان' };
    return { mult: 0, msg: '💀 ما طالعتها' };
}

module.exports = {
    config: {
        name: 'قمار',
        aliases: ['slots', 'سلوتس', 'ماكينة'],
        version: '1.0',
        author: 'سينكو',
        countDown: 15,
        prefix: true,
        category: 'tools',
        description: 'لعب ماكينة السلوتس بالمحفظة.',
        guide: { ar: '{pn} <المبلغ>' }
    },

    onStart: async ({ api, event, args }) => {
        const { senderID, threadID, messageID } = event;

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 50) {
            return api.sendMessage(
                '●─────── ⌬ ───────●\n┇ ⚠️ الحد الأدنى 50 رصيد\n┇ مثال: قمار 100\n●─────── ⌬ ───────●',
                threadID, messageID
            );
        }

        const userDB = readDB(userDBPath);

        if (!userDB[senderID] || (userDB[senderID].balance || 0) < amount) {
            return api.sendMessage(
                '●─────── ⌬ ───────●\n┇ ❌ رصيدك ما يكفي\n●─────── ⌬ ───────●',
                threadID, messageID
            );
        }

        const reels = spin();
        const { mult, msg: resultMsg } = calcMultiplier(reels);
        const winAmount = Math.floor(amount * mult);
        const net = winAmount - amount;

        userDB[senderID].balance = (userDB[senderID].balance || 0) + net;
        writeDB(userDBPath, userDB);

        const slotLine = `[ ${reels.join(' | ')} ]`;
        let outcome;
        if (net > 0) outcome = `✅ ربحت ${net} رصيد!`;
        else if (net === 0) outcome = `🤝 تعادل، استرددت رصيدك`;
        else outcome = `❌ خسرت ${Math.abs(net)} رصيد`;

        return api.sendMessage(
            `●─────── ⌬ ───────●\n┇ 🎰 ماكينة الحظ\n┇\n┇ ${slotLine}\n┇\n┇ ${resultMsg}\n┇ ${outcome}\n┇\n┇ 💳 رصيدك الآن: ${userDB[senderID].balance}\n●─────── ⌬ ───────●`,
            threadID, messageID
        );
    }
};
