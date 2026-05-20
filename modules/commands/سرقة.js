const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');
const bankDBPath = path.join(__dirname, '..', '..', 'database', 'bank.json');

function readDB(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { return {}; }
}

function writeDB(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

module.exports = {
    config: {
        name: 'سرقة',
        aliases: ['steal', 'نشل'],
        version: '1.0',
        author: 'سينكو',
        countDown: 300,
        prefix: true,
        category: 'tools',
        description: 'اسرق رصيداً من شخص آخر (رد على رسالته).',
        guide: { ar: '{pn} (رد على رسالة الشخص)' }
    },

    onStart: async ({ api, event }) => {
        const { senderID, threadID, messageID, messageReply } = event;

        if (!messageReply) {
            return api.sendMessage(
                '●─────── ⌬ ───────●\n┇ ⚠️ رد على رسالة الشخص اللي تبي تسرقه\n●─────── ⌬ ───────●',
                threadID, messageID
            );
        }

        const targetID = messageReply.senderID;

        if (targetID === senderID) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ 🤡 تسرق نفسك؟ يا خسارة..\n●─────── ⌬ ───────●', threadID, messageID);
        }

        const userDB = readDB(userDBPath);

        if (!userDB[senderID]) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ ❌ ما عندك حساب، اكتب عمل أول\n●─────── ⌬ ───────●', threadID, messageID);
        }

        if (!userDB[targetID] || (userDB[targetID].balance || 0) < 50) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ 💸 المسكين ما عنده شي تسرقه 😂\n●─────── ⌬ ───────●', threadID, messageID);
        }

        const successRate = Math.random();
        const targetBalance = userDB[targetID].balance || 0;
        const maxSteal = Math.min(Math.floor(targetBalance * 0.3), 500);
        const stolenAmount = Math.floor(Math.random() * maxSteal) + 50;

        const successMsgs = [
            'تسللت كالقط وسرقت كيسه 🐱',
            'حركة احترافية! والله ماستر ثيف 🎩',
            'اختفيت في الظلام وخرجت بالمال 🌚',
            'كأنك فاركر في جراند ثيفت 🚗'
        ];
        const failMsgs = [
            'اتمسكت باليد الحمراء! دفعت غرامة 🚨',
            'نبح الكلب وهربت بدون ما تاخذ شي 🐕',
            'الحارس شافك وطردك من المكان 👮',
            'عثرت وسقطت ورجعت خالي اليدين 😅'
        ];

        if (successRate > 0.45) {
            userDB[senderID].balance = (userDB[senderID].balance || 0) + stolenAmount;
            userDB[targetID].balance -= stolenAmount;
            writeDB(userDBPath, userDB);

            const msg = successMsgs[Math.floor(Math.random() * successMsgs.length)];
            return api.sendMessage(
                `●─────── ⌬ ───────●\n┇ ✅ نجحت السرقة!\n┇ ${msg}\n┇\n┇ 💰 سرقت: ${stolenAmount} رصيد\n┇ 💳 رصيدك الآن: ${userDB[senderID].balance}\n●─────── ⌬ ───────●`,
                threadID, messageID
            );
        } else {
            const fine = Math.floor(stolenAmount * 0.5);
            userDB[senderID].balance = Math.max(0, (userDB[senderID].balance || 0) - fine);
            writeDB(userDBPath, userDB);

            const msg = failMsgs[Math.floor(Math.random() * failMsgs.length)];
            return api.sendMessage(
                `●─────── ⌬ ───────●\n┇ ❌ فشلت السرقة!\n┇ ${msg}\n┇\n┇ 💸 الغرامة: ${fine} رصيد\n┇ 💳 رصيدك الآن: ${userDB[senderID].balance}\n●─────── ⌬ ───────●`,
                threadID, messageID
            );
        }
    }
};
