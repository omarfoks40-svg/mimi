const fs = require('fs');
const path = require('path');
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
        version: '8.6.0',
        author: 'سينكو',
        countDown: 5,
        prefix: true,
        category: 'المجموعة'
    },

    onStart: async ({ api, event, args }) => {
        const config = readDB(configPath);
        const { threadID, messageID, senderID } = event;
        const input = args[0];

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

        const categories = {};
        const categoryMap = {
            'group': 'المجموعة', 'image': 'الصور', 'media': 'الوسائط',
            'admin': 'الإدارة', 'fun': 'الترفيه', 'random': 'عشوائي',
            'music': 'الموسيقى', 'video': 'الفيديو', 'ai': 'الذكاء الاصطناعي',
            'tools': 'الأدوات', 'utility': 'الخدمات السريعة', 'owner': 'المطور',
            'level': 'المستوى', 'game': 'اللعب', 'play': 'اللعب',
        };

        for (const cmd of uniqueCommands) {
            let category = cmd.category || 'الترفيه';
            if (['اقتصاد', 'اللعب', 'game', 'play'].includes(category)) category = 'اللعب';
            if (category === 'owner' || category === 'المطور' || cmd.role === 2 || ['رستارت', 'إشعار'].includes(cmd.name)) category = 'المطور';
            
            category = categoryMap[category] || category;
            if (!categories[category]) categories[category] = [];
            categories[category].push(cmd.name);
        }

        const orderedCats = ['المجموعة', 'الصور', 'الوسائط', 'الذكاء الاصطناعي', 'الترفيه', 'اللعب', 'عشوائي', 'المطور', 'الأدوات'];

        let msg = `> ˼⏰˹↜ الـتـوقـيـت ↶\n`;
        msg += `╮──────────────⟢ـ\n`;
        msg += `┆˼🧭˹┊ ↜｢ ${dateStr} ｣\n`;
        msg += `┆˼❄️˹┊ النـشـاط ↜｢ ${clockStr} ｣\n`;
        msg += `┆˼🌁˹┊ الـيـوم ↜｢ ${dayStr} ｣\n`;
        msg += `┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣\n`;
        msg += `╯──────────────⟢ـ\n`;
        msg += `> ˼🌌˹↜ أّوٌأّمًـر APLIN ↶\n`;
        msg += `╮──────────────⟢ـ\n`;

        for (const category of orderedCats) {
            const cmds = categories[category];
            if (!cmds || cmds.length === 0) continue;

            const adminList = config.adminUIDs || [];
            if (category === "المطور" && !adminList.includes(senderID)) continue;

            msg += `​❆˹┊ ⟬ قـسم ${category.toUpperCase()} ⟭\n`;
            for (let i = 0; i < cmds.length; i += 3) {
                const row = cmds.slice(i, i + 3).map(c => `◍ ${c}`).join(" ");
                msg += `​❆˹┊ ${row}\n`;
            }
            // إضافة الخط الفاصل بين الأقسام هنا
            msg += `​❆˹┊ ⸻⸻⸻⸻⸻\n`;
            msg += `​❆˹┊\n`;
        }
        
        msg += `╯──────────────⟢ـ\n`;
        msg += `┊˼📖˹┊ الإجمالي ↜ ${uniqueCommands.length} أمر\n`;
        msg += `┊˼❄️˹┊ مساعدة [الأمر] ↜ لتفاصيله\n`;
        msg += `┊˼🪸˹┊ SINKO`;

        return api.sendMessage(msg, threadID, messageID);
    }
};
