const fs = require('fs');
const path = require('path');
const axios = require('axios');
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
        version: '8.7.0',
        author: 'سينكو',
        countDown: 5,
        prefix: true,
        category: 'المجموعة'
    },

    onStart: async ({ api, event, args }) => {
        const config = readDB(configPath);
        const { threadID, messageID, senderID } = event;
        const input = args[0];

        // --- إعدادات الوقت ---
        const timeNow = moment.tz("Africa/Khartoum");
        const dateStr = timeNow.format("DD MMMM YYYY");
        const dayStr = timeNow.locale('ar').format("dddd");
        const timeStr = timeNow.format("hh:mm A");
        const clockStr = timeNow.format("HH:mm:ss");

        // --- جلب الأوامر ---
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

        // --- عرض تفاصيل أمر محدد ---
        if (input) {
            const cmd = commands[input.toLowerCase()];
            if (!cmd) return api.sendMessage(`❌ لم يتم العثور على الأمر "${input}"`, threadID, messageID);

            let detailMsg = `> ˼🌌˹↜ تـفـاصـيـل الأمـر ↶\n`;
            detailMsg += `╮──────────────⟢ـ\n`;
            detailMsg += `┆˼🧭˹┊ الـإســم ↜｢ ${cmd.name} ｣\n`;
            detailMsg += `┆˼⚕️˹┊ الـوصـف ↜｢ ${cmd.description} ｣\n`;
            detailMsg += `┆˼🌁˹┊ الـمؤلـف ↜｢ ${cmd.author} ｣\n`;
            detailMsg += `┆˼🕕˹┊ الـإصـدار ↜｢ ${cmd.version} ｣\n`;
            if (cmd.guide) {
                detailMsg += `┆˼📖˹┊ الـطـريـقـة ↜｢ ${cmd.name} ${args[0]} ｣\n`;
            }
            detailMsg += `╯──────────────⟢ـ`;
            return api.sendMessage(detailMsg, threadID, messageID);
        }

        // --- توزيع الفئات ---
        const categories = {};
        const categoryMap = {
            'group': 'المجموعة', 'image': 'الصور', 'media': 'الوسائط',
            'admin': 'الإدارة', 'fun': 'الترفيه', 'random': 'عشوائي',
            'music': 'الموسيقى', 'video': 'الفيديو', 'ai': 'الذكاء الاصطناعي',
            'tools': 'الأدوات', 'utility': 'الخدمات السريعة', 'owner': 'المطور'
        };

        for (const cmd of uniqueCommands) {
            let category = cmd.category || 'الترفيه';
            category = categoryMap[category.toLowerCase()] || category;
            if (!categories[category]) categories[category] = [];
            categories[category].push(cmd.name);
        }

        const orderedCats = ['المجموعة', 'الصور', 'الوسائط', 'الذكاء الاصطناعي', 'الترفيه', 'المطور', 'الأدوات'];

        // --- بناء رسالة القائمة ---
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

            msg += `​❆˹┊ ⟬ قـسم ${category} ⟭\n`;
            for (let i = 0; i < cmds.length; i += 3) {
                const row = cmds.slice(i, i + 3).map(c => `◍ ${c}`).join(" ");
                msg += `​❆˹┊ ${row}\n`;
            }
            msg += `​❆˹┊ ⸻⸻⸻⸻⸻\n`;
        }
        
        msg += `╯──────────────⟢ـ\n`;
        msg += `┊˼📖˹┊ الإجمالي ↜ ${uniqueCommands.length} أمر\n`;
        msg += `┊˼🪸˹┊ SINKO | ✅`;

        // --- جلب صورة عشوائية من الفئات المحددة (غمزة، سعيد، بكاء) ---
        try {
            const helpCategories = ["wink", "happy", "cry"];
            const randomCategory = helpCategories[Math.floor(Math.random() * helpCategories.length)];
            
            const res = await axios.get(`https://api.waifu.pics/sfw/${randomCategory}`);
            const imgStream = (await axios.get(res.data.url, { responseType: 'stream' })).data;

            return api.sendMessage({
                body: msg,
                attachment: imgStream
            }, threadID, messageID);
        } catch (err) {
            // في حال فشل الـ API، نستخدم الصورة الافتراضية القديمة
            try {
                const fallbackImg = (await axios.get('https://i.ibb.co/BmHbQfF/1776302441193.png', { responseType: 'stream' })).data;
                return api.sendMessage({ body: msg, attachment: fallbackImg }, threadID, messageID);
            } catch (e) {
                return api.sendMessage(msg, threadID, messageID);
            }
        }
    }
};
