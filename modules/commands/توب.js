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

module.exports = {
    config: {
        name: 'توب',
        aliases: ['rich', 'أثرياء', 'ليدربورد'],
        version: '1.0',
        author: 'سينكو',
        countDown: 10,
        prefix: true,
        category: 'tools',
        description: 'قائمة أثرى اللاعبين (محفظة + بنك).',
        guide: { ar: '{pn}' }
    },

    onStart: async ({ api, event }) => {
        const { senderID, threadID, messageID } = event;

        const userDB = readDB(userDBPath);
        const bankDB = readDB(bankDBPath);

        const totals = {};

        for (const [id, user] of Object.entries(userDB)) {
            const wallet = user.balance || 0;
            const bank = (bankDB[id] && bankDB[id].bankBalance) || 0;
            totals[id] = {
                name: user.name || 'مجهول',
                total: wallet + bank,
                wallet,
                bank
            };
        }

        const sorted = Object.entries(totals)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10);

        if (sorted.length === 0) {
            return api.sendMessage('●─────── ⌬ ───────●\n┇ ما في بيانات بعد\n●─────── ⌬ ───────●', threadID, messageID);
        }

        const medals = ['🥇', '🥈', '🥉'];
        let msg = `●─────── ⌬ ───────●\n┇ ⦿ ⟬ أثرى اللاعبين ⟭\n┇\n`;

        sorted.forEach(([id, data], i) => {
            const medal = medals[i] || `${i + 1}.`;
            const isMe = id === senderID ? ' ← أنت' : '';
            msg += `┇ ${medal} ${data.name}${isMe}\n┇    💰 الإجمالي: ${data.total.toLocaleString()}\n┇\n`;
        });

        const myRank = sorted.findIndex(([id]) => id === senderID);
        if (myRank >= 0) {
            msg += `┇ 📊 رتبتك: #${myRank + 1}\n`;
        }
        msg += `●─────── ⌬ ───────●`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
