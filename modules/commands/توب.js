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
        version: '2.2',
        author: 'سينكو',
        countDown: 10,
        prefix: true,
        category: 'tools',
        description: 'قائمة أثرى اللاعبين تظهر وتتحدث بسلاسة وبدون تعليق.',
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
            return api.sendMessage('●─────── ⌬ ───────●\n┇ ❌ ما في بيانات بعد\n●─────── ⌬ ───────●', threadID, messageID);
        }

        const msg = await api.sendMessage(
            `●─────── ⌬ ───────●\n` +
            `┇ 💰 جاري جرد حسابات الخزائن...\n` +
            `┇ [ ⏳ جاري الفرز والتصنيف ]\n` +
            `●─────── ⌬ ───────●`,
            threadID
        );

        const medals = ['🥇', '🥈', '🥉'];
        let currentList = '';

        // تعديل الوقت لـ 1500 ملي ثانية عشان الفيس ما يحظر التعديل المتتالي
        for (let i = 0; i < sorted.length; i++) {
            await new Promise(r => setTimeout(r, 1500));

            const [id, data] = sorted[i];
            const medal = medals[i] || `${i + 1}.`;
            const isMe = id === senderID ? ' ← أنت' : '';

            currentList += `┇ ${medal} ${data.name}${isMe}\n┇    💰 الإجمالي: ${data.total.toLocaleString()}\n┇\n`;

            // نحدث الرسالة كل مرتين أو لو وصلنا للنهاية لتخفيف العبء ومنع التعليق
            if (i % 2 === 1 || i === sorted.length - 1) {
                await api.editMessage(
                    `●─────── ⌬ ───────●\n` +
                    `┇ 🏆 أثرى اللاعبين (جاري التحديث...)\n` +
                    `┇\n` +
                    `${currentList}` +
                    (i === sorted.length - 1 ? '' : `┇ ⏳ جاري سحب الحساب التالي...\n●─────── ⌬ ───────●`),
                    msg.messageID
                );
            }
        }

        const allSorted = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);
        const myRank = allSorted.findIndex(([id]) => id === senderID);
        
        let footer = '';
        if (myRank >= 0) {
            footer = `┇ 📊 رتبتك: #${myRank + 1}\n`;
        }

        await new Promise(r => setTimeout(r, 1000));

        const finalReport = 
            `●─────── ⌬ ───────●\n` +
            `┇ ⦿ ⟬ أثرى اللاعبين ⟭\n` +
            `┇\n` +
            `${currentList}` +
            `${footer}` +
            `●─────── ⌬ ───────●`;

        return api.editMessage(finalReport, msg.messageID);
    }
};
