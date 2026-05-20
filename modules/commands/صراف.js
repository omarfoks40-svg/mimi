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
        name: 'صراف',
        aliases: ['سحب', 'withdraw'],
        version: '1.0',
        author: 'سينكو',
        countDown: 10,
        prefix: true,
        category: 'tools'',
        description: 'سحب رصيد من البنك إلى محفظتك.',
        guide: { ar: '{pn} <المبلغ> أو {pn} كل' }
    },

    onStart: async ({ api, event, args }) => {
        const { senderID, threadID, messageID } = event;

        const bankDB = readDB(bankDBPath);
        const userDB = readDB(userDBPath);

        if (!bankDB[senderID]) {
            return api.sendMessage(
                '●─────── ⌬ ───────●\n┇ ❌ ما عندك حساب بنكي\n┇ استخدم: بنك انشاء\n●─────── ⌬ ───────●',
                threadID, messageID
            );
        }

        if (!userDB[senderID]) {
            return api.sendMessage(
                '●─────── ⌬ ───────●\n┇ ❌ ما عندك محفظة، اكتب عمل أول\n●─────── ⌬ ───────●',
                threadID, messageID
            );
        }

        const bankBalance = bankDB[senderID].bankBalance || 0;

        if (bankBalance <= 0) {
            return api.sendMessage(
                '●─────── ⌬ ───────●\n┇ 💸 رصيد البنك صفر، ما في شي تسحبه\n●─────── ⌬ ───────●',
                threadID, messageID
            );
        }

        let amount;
        if (args[0] === 'كل' || args[0] === 'all') {
            amount = bankBalance;
        } else {
            amount = parseInt(args[0]);
            if (isNaN(amount) || amount <= 0) {
                return api.sendMessage(
                    `●─────── ⌬ ───────●\n┇ ⚠️ أدخل مبلغاً صحيحاً\n┇ رصيد البنك: ${bankBalance}\n┇ مثال: صراف 500\n┇ أو: صراف كل\n●─────── ⌬ ───────●`,
                    threadID, messageID
                );
            }
        }

        if (amount > bankBalance) {
            return api.sendMessage(
                `●─────── ⌬ ───────●\n┇ ❌ رصيد البنك ما يكفي\n┇ 💳 رصيد البنك: ${bankBalance}\n●─────── ⌬ ───────●`,
                threadID, messageID
            );
        }

        const fee = amount >= 1000 ? Math.floor(amount * 0.02) : 0;
        const net = amount - fee;

        bankDB[senderID].bankBalance -= amount;
        userDB[senderID].balance = (userDB[senderID].balance || 0) + net;

        writeDB(bankDBPath, bankDB);
        writeDB(userDBPath, userDB);

        let msg = `●─────── ⌬ ───────●\n┇ ✅ تم السحب بنجاح\n┇\n┇ 💵 المسحوب: ${amount}\n`;
        if (fee > 0) msg += `┇ 🏦 رسوم البنك (2%): ${fee}\n┇ 💰 الصافي: ${net}\n`;
        msg += `┇\n┇ 💳 محفظتك الآن: ${userDB[senderID].balance}\n┇ 🏦 رصيد البنك: ${bankDB[senderID].bankBalance}\n●─────── ⌬ ───────●`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
