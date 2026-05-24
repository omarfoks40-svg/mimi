const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');

function readDB(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        console.error(`خطأ في قراءة قاعدة البيانات ${filePath}:`, error);
        return {};
    }
}

module.exports = {
    config: {
        name: 'رصيد',
        version: '1.0',
        author: 'Hridoy',
        aliases: ['bal', 'فلوس'],
        countDown: 5,
        prefix: true,
        groupAdminOnly: false,
        description: 'عرض رصيدك أو رصيد شخص آخر.',
        category: 'tools',
        guide: {
            ar: '   {pn}\n   {pn} [@منشن | uid]'
        },
    },
    onStart: async ({ api, event, args }) => {
        const { senderID, mentions } = event;
        let targetID;

        if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } else if (args.length > 0) {
            targetID = args[0];
        } else {
            targetID = senderID;
        }

        const userDB = readDB(userDBPath);

        if (!userDB[targetID]) {
            if (targetID === senderID) {
                return api.sendMessage(
                    '❌ اعمل حساب اول يا فقير.',
                    event.threadID
                );
            } else {
                return api.sendMessage(
                    '❌ هذا المستخدم ما عنده حساب.',
                    event.threadID
                );
            }
        }

        const balance = userDB[targetID].balance || 0;
        const name = userDB[targetID].name;

        let message;
        if (targetID === senderID) {
            message = `💳 ︙ رصيدك الحالي هو\n💰 ︙ ${balance.toLocaleString()} رصيد\n━━━━━━━━━━━━━`;
        } else {
            message = `💳 ︙ رصيد المستخدم [ ${name} ]\n💰 ︙ ${balance.toLocaleString()} رصيد\n━━━━━━━━━━━━━`;
        }

        return api.sendMessage(message, event.threadID);
    },
};
