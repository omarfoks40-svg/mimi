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

module.exports = {
    config: {
        name: 'هدية',
        aliases: ['gift', 'اهدي', 'تحويل_محفظة'],
        version: '1.0',
        author: 'سينكو',
        countDown: 10,
        prefix: true,
        category: 'tools',
        description: 'أهدِ رصيداً من محفظتك لشخص آخر (رد على رسالته).',
        guide: { ar: '{pn} <المبلغ> (رد على رسالة الشخص)' }
    },

    onStart: async ({ api, event, args }) => {
        const { senderID, threadID, messageID, messageReply } = event;

        if (!messageReply) {
            return api.sendMessage(
                '●─────── ⌬ ───────●\n┇ ⚠️ رد على رسالة الشخص اللي تبي تهديه\n●─────── ⌬ ───────●',
                threadID, messageID
            );
        }

        const targetID = messageReply.senderID;

        if (targetID === senderID) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ 🤡 تهدي نفسك؟ ما أفهم..\n●─────── ⌬ ───────●', threadID, messageID);
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ ⚠️ أدخل مبلغاً صحيحاً\n┇ مثال: هدية 200\n●─────── ⌬ ───────●', threadID, messageID);
        }

        const userDB = readDB(userDBPath);

        if (!userDB[senderID] || (userDB[senderID].balance || 0) < amount) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ ❌ رصيدك ما يكفي للهدية\n●─────── ⌬ ───────●', threadID, messageID);
        }

        if (!userDB[targetID]) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ ❌ الشخص ما عنده حساب بعد\n●─────── ⌬ ───────●', threadID, messageID);
        }

        userDB[senderID].balance -= amount;
        userDB[targetID].balance = (userDB[targetID].balance || 0) + amount;
        writeDB(userDBPath, userDB);

        const targetName = userDB[targetID].name || 'مجهول';
        const senderName = userDB[senderID].name || 'مجهول';

        return api.sendMessage(
            `●─────── ⌬ ───────●\n┇ 🎁 تم إرسال الهدية!\n┇\n┇ 👤 من: ${senderName}\n┇ 👤 إلى: ${targetName}\n┇ 💰 المبلغ: ${amount} رصيد\n┇\n┇ 💳 رصيدك الآن: ${userDB[senderID].balance}\n●─────── ⌬ ───────●`,
            threadID, messageID
        );
    }
};
