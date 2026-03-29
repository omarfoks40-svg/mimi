const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fsExtra = require('fs-extra');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
const commandsPath = path.join(__dirname, '..', 'commands');

// رابط الصورة المتحركة اللي أرسلتها
const gifLink = "https://i.ibb.co/zH0fkTzf/received-1823631211640464.webp";

function readDB(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function downloadMedia(url) {
    // التعديل هنا: استخدام امتداد webp لضمان عمل الحركة
    const tempPath = path.join(__dirname, `menu_anim_${Date.now()}.webp`);
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
        version: '5.6',
        author: 'سينكو',
        countDown: 5,
        prefix: true,
        category: 'المجموعة'
    },

    onStart: async ({ api, event, args }) => {
        const config = readDB(configPath);
        const input = args[0];

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commands = {};

        for (const file of commandFiles) {
            try {
                delete require.cache[require.resolve(path.join(commandsPath, file))];
                const command = require(path.join(commandsPath, file));
                if (command.config) {
                    commands[command.config.name.toLowerCase()] = command.config;
                    if (command.config.aliases) {
                        for (const alias of command.config.aliases) {
                            commands[alias.toLowerCase()] = command.config;
                        }
                    }
                }
            } catch (error) {}
        }

        const uniqueCommands = Object.values(commands).filter((cmd, index, self) =>
            self.findIndex(c => c.name === cmd.name) === index
        );

        if (input) {
            const cmd = commands[input.toLowerCase()];
            if (!cmd) return api.sendMessage(`❌ لم يتم العثور على الأمر "${input}"`, event.threadID);

            let detailMessage = `⏣────── ✾ ⌬ ✾ ──────⏣\n`;
            detailMessage += `✾ ┇ ⏣ ⟬ الإســم ⟭ : ${cmd.name}\n`;
            detailMessage += `✾ ┇ ◍ الـوصـف : ${cmd.description}\n`;
            detailMessage += `✾ ┇ ◍ الـمؤلـف : ${cmd.author}\n`;
            detailMessage += `✾ ┇ ◍ الـإصـدار : ${cmd.version}\n`;
            if (cmd.guide?.ar) {
                detailMessage += `✾ ┇\n✾ ┇ ◍ طريقة الاستخدام :\n✾ ┇ ⬩ ${cmd.guide.ar.replace(/{pn}/g, config.prefix + cmd.name)}\n`;
            }
            detailMessage += `⏣────── ✾ ⌬ ✾ ──────⏣`;
            return api.sendMessage(detailMessage, event.threadID);
        }

        const categories = {};
        const categoryMap = { 'group': 'المجموعة', 'image': 'الصور', 'ai': 'الذكاء الاصطناعي' };

        for (const cmd of uniqueCommands) {
            let category = cmd.category || 'الترفيه';
            category = categoryMap[category] || category;
            if (!categories[category]) categories[category] = [];
            categories[category].push(cmd.name);
        }

        const orderedCats = ['المجموعة', 'الصور', 'الوسائط', 'الذكاء الاصطناعي', 'الترفيه', 'اللعب', 'عشوائي', 'المطور', 'الأدوات'];

        // --- رجعت الزخرفة الأصلية بالظبط ---
        let finalMessage = `⏣────── ✾ ⌬ ✾ ──────⏣\n✾ ┇\n`;

        for (const category of orderedCats) {
            const cmds = categories[category];
            if (!cmds || cmds.length === 0) continue;

            finalMessage += `✾ ┇ ⏣ ⟬ قـسـم ${category.toUpperCase()} ⟭\n`;
            for (let j = 0; j < cmds.length; j += 3) {
                const row = cmds.slice(j, j + 3).map(c => `◍ ${c}`).join(" ");
                finalMessage += `✾ ┇ ${row}\n`;
            }
            finalMessage += `✾ ┇ ⸻⸻⸻⸻⸻\n✾ ┇\n`;
        }

        finalMessage += `⏣────── ✾ ⌬ ✾ ──────⏣\n`;
        finalMessage += ` ⠇عـدد الأوامـر: ${uniqueCommands.length}\n`;
        finalMessage += ` ⠇الـمـطـوࢪ: سينكو 𓆩☆𓆪`;

        try {
            // تحميل الصورة المتحركة
            const mediaPath = await downloadMedia(gifLink);
            return api.sendMessage({
                body: finalMessage.trim(),
                attachment: fs.createReadStream(mediaPath)
            }, event.threadID, () => {
                // مسح الملف فوراً بعد الإرسال
                if(fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
            }, event.messageID);
        } catch (err) {
            return api.sendMessage(finalMessage.trim(), event.threadID);
        }
    }
};
