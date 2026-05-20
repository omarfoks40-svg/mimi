const fs = require('fs');
const path = require('path');

const userDBPath = path.join(__dirname, '..', '..', 'database', 'users.json');
const tasksDBPath = path.join(__dirname, '..', '..', 'database', 'tasks.json');

function readDB(filePath) {
    try {
        if (!fs.existsSync(filePath)) return {};
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { return {}; }
}

function writeDB(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

const DAILY_TASKS = [
    { id: 'chat10',   desc: 'أرسل 10 رسائل في المجموعة',      target: 10,  reward: 200,  type: 'message' },
    { id: 'chat25',   desc: 'أرسل 25 رسالة في المجموعة',       target: 25,  reward: 400,  type: 'message' },
    { id: 'cmd5',     desc: 'استخدم 5 أوامر مختلفة',           target: 5,   reward: 300,  type: 'command' },
    { id: 'work3',    desc: 'اشتغل 3 مرات بأمر عمل',           target: 3,   reward: 250,  type: 'work' },
];

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

module.exports = {
    config: {
        name: 'مهام',
        aliases: ['tasks', 'مهمة', 'missions'],
        version: '1.0',
        author: 'سينكو',
        countDown: 5,
        prefix: true,
        category: 'tools',
        description: 'مهام يومية لكسب رصيد إضافي.',
        guide: { ar: '{pn} — لعرض المهام\n{pn} انجز — للمطالبة بمكافأة مهمة مكتملة' }
    },

    onStart: async ({ api, event, args }) => {
        const { senderID, threadID, messageID } = event;

        const userDB = readDB(userDBPath);
        const tasksDB = readDB(tasksDBPath);
        const today = getTodayKey();

        if (!tasksDB[senderID]) tasksDB[senderID] = {};
        if (!tasksDB[senderID][today]) tasksDB[senderID][today] = {};

        const userTasks = tasksDB[senderID][today];
        const subCmd = args[0];

        if (subCmd === 'انجز' || subCmd === 'claim') {
            let claimed = 0;
            let totalReward = 0;

            for (const task of DAILY_TASKS) {
                const progress = userTasks[task.id] || 0;
                if (progress >= task.target && !userTasks[`${task.id}_claimed`]) {
                    userTasks[`${task.id}_claimed`] = true;
                    totalReward += task.reward;
                    claimed++;
                }
            }

            if (claimed === 0) {
                writeDB(tasksDBPath, tasksDB);
                return api.sendMessage(
                    '●─────── ⌬ ───────●\n┇ ⚠️ ما في مهام مكتملة جاهزة للمطالبة\n●─────── ⌬ ───────●',
                    threadID, messageID
                );
            }

            if (!userDB[senderID]) userDB[senderID] = { balance: 0 };
            userDB[senderID].balance = (userDB[senderID].balance || 0) + totalReward;

            writeDB(tasksDBPath, tasksDB);
            writeDB(userDBPath, userDB);

            return api.sendMessage(
                `●─────── ⌬ ───────●\n┇ ✅ تم استلام مكافأة ${claimed} مهمة!\n┇ 💰 المكافأة: ${totalReward} رصيد\n┇ 💳 رصيدك الآن: ${userDB[senderID].balance}\n●─────── ⌬ ───────●`,
                threadID, messageID
            );
        }

        let msg = `●─────── ⌬ ───────●\n┇ ⦿ ⟬ مهامك اليومية ⟭\n┇\n`;
        for (const task of DAILY_TASKS) {
            const progress = userTasks[task.id] || 0;
            const done = progress >= task.target;
            const claimed = userTasks[`${task.id}_claimed`] || false;
            const icon = claimed ? '✅' : done ? '🎁' : '⏳';
            const bar = buildBar(progress, task.target);
            msg += `┇ ${icon} ${task.desc}\n┇    ${bar} ${Math.min(progress, task.target)}/${task.target}\n┇    🏆 مكافأة: ${task.reward} رصيد\n┇\n`;
        }
        msg += `┇ اكتب "مهام انجز" لاستلام مكافأة مهمة مكتملة\n●─────── ⌬ ───────●`;

        writeDB(tasksDBPath, tasksDB);
        return api.sendMessage(msg, threadID, messageID);
    },

    trackProgress: function (senderID, type, amount = 1) {
        try {
            const tasksDB = readDB(tasksDBPath);
            const today = getTodayKey();
            if (!tasksDB[senderID]) tasksDB[senderID] = {};
            if (!tasksDB[senderID][today]) tasksDB[senderID][today] = {};

            for (const task of DAILY_TASKS) {
                if (task.type === type) {
                    const current = tasksDB[senderID][today][task.id] || 0;
                    if (current < task.target) {
                        tasksDB[senderID][today][task.id] = current + amount;
                    }
                }
            }
            writeDB(tasksDBPath, tasksDB);
        } catch (e) {}
    }
};

function buildBar(current, target) {
    const filled = Math.min(Math.round((current / target) * 8), 8);
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
}
