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
        version: '2.1',
        author: 'سينكو',
        countDown: 10,
        prefix: true,
        category: 'tools',
        description: 'قائمة أثرى اللاعبين تظهر وتتحدث شخصاً تلو الآخر بزخرفة المسار.',
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

        // 1️⃣ إرسال الرسالة المبدئية بالزخرفة الهندسية
        const msg = await api.sendMessage(
            `●─────── ⌬ ───────●\n` +
            `┇ 💰 جاري جرد حسابات الخزائن...\n` +
            `┇ [ ⏳ جاري الفرز والتصنيف ]\n` +
            `●─────── ⌬ ───────●`,
            threadID
        );

        const medals = ['🥇', '🥈', '🥉'];
        let currentList = '';

        // 2️⃣ حلقة التكرار للتعديل شخص شخص مع الحفاظ على المسار الطولي
        for (let i = 0; i < sorted.length; i++) {
            await new Promise(r => setTimeout(r, 500));

            const [id, data] = sorted[i];
            const medal = medals[i] || `${i + 1}.`;
            const isMe = id === senderID ? ' ← أنت' : '';

            currentList += `┇ ${medal} ${data.name}${isMe}\n┇    💰 الإجمالي: ${data.total.toLocaleString()}\n┇\n`;

            // تعديل حي متتابع مع الحفاظ على بنية الخطوط
            await api.editMessage(
                `●─────── ⌬ ───────●\n` +
                `┇ 🏆 أثرى اللاعبين (جاري التحديث...)\n` +
                `┇\n` +
                `${currentList}` +
                `┇ ⏳ جاري سحب الحساب التالي...\n` +
                `●─────── ⌬ ───────●`,
                msg.messageID
            );
        }

        const allSorted = Object.entries(totals).sort((a, b) => b[1].total - a[1].total);
        const myRank = allSorted.findIndex(([id]) => id === senderID);
        
        let footer = '';
        if (myRank >= 0) {
            footer = `┇ 📊 رتبتك: #${myRank + 1}\n`;
        }

        // 3️⃣ التقرير النهائي المختوم بالزخرفة الكاملة
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
