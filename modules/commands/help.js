const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fsExtra = require('fs-extra');
const moment = require("moment-timezone");

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
const commandsPath = path.join(__dirname, '..', 'commands');

function readDB(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

module.exports = {
    config: {
        name: 'اوامر',
        aliases: ['menu', 'help', 'الأوامر'],
        version: '6.5.0',
        author: 'سينكو',
        countDown: 5,
        prefix: true,
        description: 'عرض قائمة الأوامر بالزخرفة الملكية والفاصلة القديمة.',
        category: 'المجموعة'
    },

    onStart: async ({ api, event, args }) => {
        const config = readDB(configPath);
        const { threadID, messageID } = event;
        const input = args[0];

        // جلب الوقت والتاريخ الحالي بتوقيت السودان
        const timeNow = moment.tz("Africa/Khartoum");
        const dateStr = timeNow.format("DD MMMM YYYY");
        const dayStr = timeNow.locale('ar').format("dddd");
        const timeStr = timeNow.format("hh:mm A");
        const clockStr = timeNow.format("HH:mm:ss");

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commands = {};

        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if (command.config) {
                    commands[command.config.name.toLowerCase()] = command.config;
                }
            } catch (e) {}
        }

        const uniqueCommands = Object.values(commands).filter((cmd, index, self) =>
            self.findIndex(c => c.name === cmd.name) === index
        );

        // تفاصيل أمر محدد
        if (input) {
            const cmd = commands[input.toLowerCase()];
            if (!cmd) return api.sendMessage(`❌ لم يتم العثور على الأمر "${input}"`, threadID, messageID);

            let detailMsg = `> ˼🌌˹↜ تـفـاصـيـل الأمـر ↶\n`;
            detailMsg += `╮──────────────⟢ـ\n`;
            detailMsg += `┆˼🧭˹┊ الـإســم ↜｢ ${cmd.name} ｣\n`;
            detailMsg += `┆˼⚕️˹┊ الـوصـف ↜｢ ${cmd.description} ｣\n`;
            detailMsg += `┆˼🌁˹┊ الـمؤلـف ↜｢ ${cmd.author} ｣\n`;
            detailMsg += `┆˼🕕˹┊ الـإصـدار ↜｢ ${cmd.version} ｣\n`;
            if (cmd.guide?.ar) {
                detailMsg += `┆˼📖˹┊ الـطـريـقـة ↜｢ ${cmd.guide.ar.replace(/{pn}/g, config.prefix + cmd.name)} ｣\n`;
            }
            detailMsg += `╯──────────────⟢ـ`;
            return api.sendMessage(detailMsg, threadID, messageID);
        }

        // بناء القائمة الرئيسية
        const categories = {};
        for (const cmd of uniqueCommands) {
            let cat = cmd.category || 'الترفيه';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd.name);
        }

        let msg = `> ˼⏰˹↜ الـتـوقـيـت ↶\n`;
        msg += `╮──────────────⟢ـ\n`;
        msg += `┆˼🧭˹┊ ↜｢ ${dateStr} ｣\n`;
        msg += `┆˼⚕️˹┊ النـشـاط ↜｢ ${clockStr} ｣\n`;
        msg += `┆˼🌁˹┊ الـيـوم ↜｢ ${dayStr} ｣\n`;
        msg += `┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣\n`;
        msg += `╯──────────────⟢ـ\n`;
        msg += `> ˼🌌˹↜ أّوٌأّمًـر APLIN ↶\n`;
        msg += `╮──────────────⟢ـ\n`;

        for (const cat in categories) {
            msg += `✾˹┊ ⟬ قـسم ${cat} ⟭\n`;
            const cmds = categories[cat];
            for (let i = 0; i < cmds.length; i += 3) {
                // تبديل النقطة بالفاصلة ◍ كما طلبت
                const row = cmds.slice(i, i + 3).map(c => `◍ ${c}`).join(" ");
                msg += `✾˹┊ ${row}\n`;
            }
            msg += `✾˹┊\n`;
        }
        
        msg += `╯──────────────⟢ـ\n`;
        msg += `┊˼📖˹┊ الإجمالي ↜ ${uniqueCommands.length} أمر\n`;
        msg += `┊˼🔮˹┊ مساعدة [الأمر] ↜ لتفاصيله\n`;
        msg += `┊˼🪸˹┊ SINKO`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
