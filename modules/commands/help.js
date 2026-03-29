const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fsExtra = require('fs-extra');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
const commandsPath = path.join(__dirname, '..', 'commands');

// روابط الصور المتحركة (ممكن تضيف أكتر هنا)
const gifLinks = [
    "https://i.ibb.co/zH0fkTzf/received-1823631211640464.webp"
];

function readDB(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function downloadMedia(url) {
    const tempPath = path.join(__dirname, `menu_${Date.now()}.webp`);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer'
    });
    fsExtra.writeFileSync(tempPath, response.data);
    return tempPath;
}

module.exports = {
    config: {
        name: 'اوامر',
        version: '6.0',
        author: 'سينكو',
        countDown: 5,
        role: 0,
        category: 'المجموعة'
    },

    onStart: async ({ api, event, args }) => {
        const config = readDB(configPath);
        const input = args[0];
        const { threadID, messageID, senderID } = event;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commands = {};

        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if (command.config) {
                    commands[command.config.name.toLowerCase()] = command.config;
                    if (command.config.aliases) {
                        command.config.aliases.forEach(alias => commands[alias.toLowerCase()] = command.config);
                    }
                }
            } catch (e) {}
        }

        const uniqueCommands = Object.values(commands).filter((cmd, index, self) => 
            self.findIndex(c => c.name === cmd.name) === index
        );

        // --- تفاصيل أمر محدد ---
        if (input) {
            const cmd = commands[input.toLowerCase()];
            if (!cmd) return api.sendMessage(`❌ لم يتم العثور على الأمر "${input}"`, threadID, messageID);

            let detail = `⏣────── ⌬ ──────⏣\n`;
            detail += `⌬ الإســم: ${cmd.name}\n`;
            detail += `⌬ الـوصـف: ${cmd.description || "لا يوجد"}\n`;
            detail += `⌬ الـمؤلـف: ${cmd.author}\n`;
            if (cmd.guide?.ar) {
                detail += `⌬ طريقة الاستخدام:\n${cmd.guide.ar.replace(/{pn}/g, (config.prefix || "") + cmd.name)}\n`;
            }
            detail += `⏣────── ⌬ ──────⏣`;
            return api.sendMessage(detail, threadID, messageID);
        }

        // --- بناء القائمة الكاملة ---
        const categories = {};
        for (const cmd of uniqueCommands) {
            let cat = cmd.category || 'عام';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd.name);
        }

        let menuMsg = `⏣────── ✾ ⌬ ✾ ──────⏣\n\n`;
        for (const [category, cmds] of Object.entries(categories)) {
            menuMsg += `⌬ ⟬ قـسـم ${category.toUpperCase()} ⟭\n`;
            for (let i = 0; i < cmds.length; i += 3) {
                const row = cmds.slice(i, i + 3).map(c => `◍ ${c}`).join(" ");
                menuMsg += `✾ ${row}\n`;
            }
            menuMsg += `⸻⸻⸻⸻⸻\n\n`;
        }

        menuMsg += `⏣────── ✾ ⌬ ✾ ──────⏣\n`;
        menuMsg += `⌬ عـدد الأوامـر: ${uniqueCommands.length}\n`;
        menuMsg += `⌬ الـمـطـوࢪ: سينكو 𓆩☆𓆪`;

        try {
            // اختيار صورة عشوائية من القائمة
            const randomGif = gifLinks[Math.floor(Math.random() * gifLinks.length)];
            const mediaPath = await downloadMedia(randomGif);

            return api.sendMessage({
                body: menuMsg,
                attachment: fs.createReadStream(mediaPath)
            }, threadID, () => {
                if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath); // المكنسة الفورية
            }, messageID);
        } catch (err) {
            return api.sendMessage(menuMsg, threadID, messageID);
        }
    }
};
