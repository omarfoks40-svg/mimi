const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');
const bankDBPath = path.join(__dirname, '..', '..', 'database', 'bank.json');

function readDB(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        console.error(`خطأ في قراءة قاعدة البيانات في ${filePath}:`, error);
        return {};
    }
}

function writeDB(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error(`خطأ في كتابة قاعدة البيانات في ${filePath}:`, error);
    }
}

module.exports = {
    config: {
        name: 'ايداع', // الاسم بالعربي ومختصر
        version: '1.0',
        author: 'Hridoy',
        countDown: 5,
        prefix: true,
        groupAdminOnly: false,
        description: 'تحويل الأموال من رصيدك إلى حسابك البنكي.',
        category: 'tools',
        guide: {
            ar: '{pn} <المبلغ>'
        },
    },
    onStart: async ({ api, event, args }) => {
        const { senderID } = event;
        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0) {
            return api.sendMessage('يرجى إدخال مبلغ صالح للإيداع.', event.threadID);
        }

        const userDB = readDB(userDBPath);
        const bankDB = readDB(bankDBPath);

        if (!userDB[senderID]) {
            return api.sendMessage("ليس لديك حساب مستخدم.", event.threadID);
        }

        if (!bankDB[senderID]) {
            return api.sendMessage("ليس لديك حساب بنكي. استخدم `bank create` لإنشاء واحد.", event.threadID);
        }

        if (userDB[senderID].balance < amount) {
            return api.sendMessage("رصيدك غير كافي لإيداع هذا المبلغ.", event.threadID);
        }

        userDB[senderID].balance -= amount;
        bankDB[senderID].bankBalance += amount;

        writeDB(userDBPath, userDB);
        writeDB(bankDBPath, bankDB);

        return api.sendMessage(`تم إيداع ${amount} بنجاح. رصيدك في البنك الآن ${bankDB[senderID].bankBalance}.`, event.threadID);
    },
};
