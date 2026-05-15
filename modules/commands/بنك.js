const fs = require('fs');
const path = require('path');

const bankDBPath = path.join(__dirname, '..', '..', 'database', 'bank.json');

function readBankDB() {
    try {
        const data = fs.readFileSync(bankDBPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        return {};
    }
}

function writeBankDB(data) {
    try {
        fs.writeFileSync(bankDBPath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error('❌ خطأ في الحفظ:', error);
    }
}

module.exports = {
    config: {
        name: 'بنك',
        version: '2.5',
        author: 'سينكو',
        countDown: 5,
        prefix: true,
        description: 'نظام اقتصادي متكامل بزخرفة المسار الطولي.',
        category: 'fun',
        guide: {
            ar: '●───── ⌬ ─────●\n' +
                '┇ ⦿ ⟬ الأوامـر الـمـتـاحـة ⟭\n' +
                '┇\n' +
                '┇ ⬩ {pn} انشاء ⠐ لفتح حسابك\n' +
                '┇ ⬩ {pn} راتب ⠐ الحصول على الراتب\n' +
                '┇ ⬩ {pn} رهان <المبلغ> ⠐ للمقامرة\n' +
                '┇ ⬩ {pn} استثمار <المبلغ> ⠐ تشغيل الأموال\n' +
                '┇ ⬩ {pn} تحويل <المبلغ> ⠐ بالرد على الشخص\n' +
                '┇ ⬩ {pn} الأعلى ⠐ قائمة الأثرياء\n' +
                '●───── ⌬ ─────●'
        },
    },

    onStart: async ({ api, event, args }) => {
        const { senderID, threadID, messageReply } = event;
        const bankDB = readBankDB();
        const subcommand = args[0] ? args[0].toLowerCase() : null;

        // --- إنشاء حساب ---
        if (subcommand === 'انشاء') {
            if (bankDB[senderID]) return api.sendMessage('●───── ⌬ ─────●\n┇ ⚠️ لـديـك حـساب فـي الـبنك بـالفعل.\n●───── ⌬ ─────●', threadID);
            bankDB[senderID] = { bankBalance: 500, loan: false, loanAmount: 0, lastDaily: 0, userID: senderID };
            writeBankDB(bankDB);
            return api.sendMessage('●───── ⌬ ─────●\n┇ ✅ تـم افـتـتاح حـسابك بـنجاح\n┇ 💰 تـم مـنحك 500 كـهـدية.\n●───── ⌬ ─────●', threadID);
        }

        if (!bankDB[senderID]) return api.sendMessage('●───── ⌬ ─────●\n┇ ⚠️ يرجى إنشاء حساب أولاً:\n┇ ⦿ ⟬ بنك انشاء ⟭\n●───── ⌬ ─────●', threadID);

        // --- نظام الراتب اليومي ---
        if (subcommand === 'راتب') {
            const cooldown = 24 * 60 * 60 * 1000;
            if (Date.now() - bankDB[senderID].lastDaily < cooldown) return api.sendMessage('●───── ⌬ ─────●\n┇ ⚠️ لـقـد استلمت راتبك، عـد غـداً.\n●───── ⌬ ─────●', threadID);
            
            const reward = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
            bankDB[senderID].bankBalance += reward;
            bankDB[senderID].lastDaily = Date.now();
            writeBankDB(bankDB);
            return api.sendMessage(`●───── ⌬ ─────●\n┇ ✅ تـم استـلام الـراتب\n┇ 💰 الـمبـلغ: ${reward} 𓋹\n●───── ⌬ ─────●`, threadID);
        }

        // --- نظام الرهان ---
        if (subcommand === 'رهان') {
            const bet = parseInt(args[1]);
            if (isNaN(bet) || bet <= 0) return api.sendMessage('⚠️ أدخل مبلغاً صحيحاً.', threadID);
            if (bet > bankDB[senderID].bankBalance) return api.sendMessage('⚠️ رصيدك لا يكفي.', threadID);

            const win = Math.random() > 0.5;
            let betMsg = `●───── ⌬ ─────●\n┇ ⦿ ⟬ نـتـيـجـة الـرهـان ⟭\n┇\n`;
            if (win) {
                bankDB[senderID].bankBalance += bet;
                betMsg += `┇ 🏆 الـنـتـيـجـة: لـقد فـزت!\n┇ 💰 الـربـح: +${bet}\n`;
            } else {
                bankDB[senderID].bankBalance -= bet;
                betMsg += `┇ 💀 الـنـتـيـجـة: لـأسـف خسـرت\n┇ 💸 الـخسـارة: -${bet}\n`;
            }
            betMsg += `┇ 💳 رصـيـدك الآن: ${bankDB[senderID].bankBalance}\n●───── ⌬ ─────●`;
            writeBankDB(bankDB);
            return api.sendMessage(betMsg, threadID);
        }

        // --- نظام التحويل ---
        if (subcommand === 'تحويل') {
            if (!messageReply) return api.sendMessage('⚠️ رد على رسالة الشخص للتحويل.', threadID);
            const targetID = messageReply.senderID;
            const amount = parseInt(args[1]);

            if (isNaN(amount) || amount <= 0) return api.sendMessage('⚠️ أدخل مبلغاً صحيحاً.', threadID);
            if (amount > bankDB[senderID].bankBalance) return api.sendMessage('⚠️ رصيدك غير كافٍ.', threadID);
            if (!bankDB[targetID]) return api.sendMessage('⚠️ الطرف الآخر ليس لديه حساب.', threadID);

            bankDB[senderID].bankBalance -= amount;
            bankDB[targetID].bankBalance += amount;
            writeBankDB(bankDB);
            return api.sendMessage(`●───── ⌬ ─────●\n┇ ✅ تـم الـتـحويـل بـنـجـاح\n┇ 💸 الـمبلغ: ${amount}\n●───── ⌬ ─────●`, threadID);
        }

        // --- نظام الاستثمار ---
        if (subcommand === 'استثمار') {
            const investAmount = parseInt(args[1]);
            if (isNaN(investAmount) || investAmount < 100) return api.sendMessage('⚠️ أقل مبلغ للاستثمار هو 100.', threadID);
            if (investAmount > bankDB[senderID].bankBalance) return api.sendMessage('⚠️ رصيدك لا يكفي.', threadID);

            const profitRate = (Math.random() * (1.5 - 0.5) + 0.5).toFixed(2);
            const result = Math.floor(investAmount * profitRate);
            
            bankDB[senderID].bankBalance = (bankDB[senderID].bankBalance - investAmount) + result;
            writeBankDB(bankDB);

            let investMsg = `●───── ⌬ ─────●\n┇ ⦿ ⟬ تـقـريـر الاسـتـثـمـار ⟭\n┇\n`;
            investMsg += `┇ 𓋰 الـنـسـبـة: ${Math.floor(profitRate * 100)}%\n`;
            investMsg += `┇ 𓋰 الـنـتـيـجـة: ${result} 𓋹\n`;
            investMsg += `┇ 𓋰 رصـيـدك الآن: ${bankDB[senderID].bankBalance}\n●───── ⌬ ─────●`;
            return api.sendMessage(investMsg, threadID);
        }

        // --- الحالة الافتراضية: عرض الرصيد ---
        if (!subcommand) {
            const userData = bankDB[senderID];
            let statusMessage = `●───── ⌬ ─────●\n┇ ⦿ ⟬ الـمـركـز الـمـالـي ⟭\n┇\n`;
            statusMessage += `┇ 𓋰 الـرصـيـد: ${userData.bankBalance} 𓋹\n`;
            statusMessage += `┇ 𓋰 الـديـون: ${userData.loanAmount || 0}\n┇\n`;
            statusMessage += `●───── ⌬ ─────●\n ⠇الـمـطـوࢪ: سينكو`;
            return api.sendMessage(statusMessage, threadID);
        }

        // --- الأعلى رصيداً ---
        if (subcommand === 'الأعلى' || subcommand === 'الاعلى') {
            const sorted = Object.values(bankDB).sort((a, b) => b.bankBalance - a.bankBalance).slice(0, 10);
            let topMsg = `●───── ⌬ ─────●\n┇ ⦿ ⟬ قـائـمـة الأثـريـاء ⟭\n┇\n`;
            sorted.forEach((user, i) => {
                topMsg += `┇ ⟬ ${i + 1} ⟭ ❪ ${user.bankBalance} 𓋹 ❫\n`;
            });
            topMsg += `┇\n●───── ⌬ ─────●`;
            return api.sendMessage(topMsg, threadID);
        }
    }
};
