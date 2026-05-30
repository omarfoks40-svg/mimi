const express = require('express');
const login = require('fca-priyansh'); // المكتبة الرسمية المعتمدة في سورس أبلين حقك
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تخزين قائمة الحسابات المفعلة وجلساتها بالذاكرة
const activeBots = new Map();

// 📂 قراءة مجلد الأوامر المباشر من سورس أبلين
const commandsPath = path.join(__dirname, 'scripts', 'commands');
let availableCommands = [];

if (fs.existsSync(commandsPath)) {
    availableCommands = fs.readdirSync(commandsPath)
                          .filter(file => file.endsWith('.js'))
                          .map(file => file.replace('.js', ''));
} else {
    // قائمة أوامر افتراضية في حال اختلف مسار المجلد عندك
    availableCommands = ['تحريك', 'اعدادات', 'قمار', 'سوق', 'معلومات', 'help'];
}

// 📡 1. مسار إرسال قائمة الأوامر للـ HTML
app.get('/api/available-commands', (req, res) => {
    res.json({ count: availableCommands.length, commands: availableCommands });
});

// 🚀 2. استقبال بيانات التفعيل وتشغيل حساب العضو بالأوامر المحددة
app.post('/api/launch', async (req, res) => {
    const { appStateString, botName, prefix, allowedCommands } = req.body;

    try {
        const parsedState = JSON.parse(appStateString);

        // تشغيل الجلسة المستقلة للحساب الحالي عبر الـ fca-priyansh
        login({ appState: parsedState }, (err, api) => {
            if (err) {
                console.error(`[Aplin Error] Login Failed for ${botName}: ${err.message}`);
                return res.status(500).json({ success: false, error: "كود الحساب (appState) غير صالح أو منتهي الصلاحية!" });
            }

            api.setOptions({ listenEvents: true, selfListen: false, online: true });
            console.log(`\x1b[32m🟢 [Aplin AI] تم تفعيل نسخة البوت [${botName}] بنجاح!\x1b[0m`);

            // حفظ الجلسة داخل الـ Map
            activeBots.set(botName, { api, prefix, allowedCommands });

            // الاستماع للرسائل الواردة لحساب هذا المشترك بالذات
            api.listenMqtt(async (listenErr, event) => {
                if (listenErr) return;
                if (!event.body) return;

                const message = event.body.trim();
                const currentPrefix = prefix || "!";

                if (!message.startsWith(currentPrefix)) return;

                const args = message.slice(currentPrefix.length).split(/ +/);
                const commandName = args.shift().toLowerCase();

                // 🌟 التحقق الذكي من الأوامر المحددة من اللوحة الزرقاء
                if (allowedCommands && allowedCommands.length > 0) {
                    if (!allowedCommands.includes(commandName)) {
                        return; // يتجاهل الأمر لو العضو ما منشطه في لوحته
                    }
                }

                // تشغيل ملف الأمر المتوافق مع هيكلة سورس أبلين كينجي
                try {
                    const cmdFile = path.join(commandsPath, `${commandName}.js`);
                    if (fs.existsSync(cmdFile)) {
                        const command = require(cmdFile);
                        if (command && command.run) {
                            await command.run({ api, event, args });
                        } else if (command && command.onStart) {
                            await command.onStart({ api, event, args });
                        }
                    }
                } catch (cmdErr) {
                    console.error(`[Cmd Error] Failed executing [${commandName}] on [${botName}]:`, cmdErr.message);
                }
            });
        });

        return res.json({ success: true });

    } catch (e) {
        return res.status(400).json({ success: false, error: "صيغة الـ appState غير صحيحة، تأكد من نسخ كود الـ JSON كاملاً." });
    }
});

// تشغيل السيرفر الأساسي
app.listen(PORT, () => {
    console.log(`\x1b[36m🌐 لوحة تحكم أبلين شقالة بنجاح على الميناء: ${PORT}\x1b[0m`);
});

process.on('SIGINT', () => {
    console.log('Stopping server...');
    process.exit(0);
});
