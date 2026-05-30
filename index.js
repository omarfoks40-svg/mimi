const express = require('express');
const login = require('fca-horizon'); // النسخة المستخدمة لديك للاتصال
const fs = require('fs-extra');
const path = require('path');
const { log } = require('./logger/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تخزين قائمة الحسابات المفعلة وجلساتها بالذاكرة
const activeBots = new Map();

// 📂 محاكاة قراءة مجلد الأوامر (تأكد من مطابقة المسار لمجلد الأوامر الحقيقي لديك)
const commandsPath = path.join(__dirname, 'commands');
let availableCommands = [];

if (fs.existsSync(commandsPath)) {
    availableCommands = fs.readdirSync(commandsPath)
                          .filter(file => file.endsWith('.js'))
                          .map(file => file.replace('.js', ''));
} else {
    // قائمة أوامر افتراضية كـ Fallback في حال عدم توفر المجلد حالياً
    availableCommands = ['تحريك', 'اعدادات', 'قمار', 'سوق', 'معلومات', ' help'];
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

        // تشغيل الجلسة المستقلة للحساب الحالي عبر الـ fca
        login({ appState: parsedState }, (err, api) => {
            if (err) {
                log('error', `FCA Login Failed for ${botName}: ${err.message}`);
                return res.status(500).json({ success: false, error: "كود الحساب غير صالح أو منتهي الصلاحية!" });
            }

            api.setOptions({ listenEvents: true, selfListen: false, online: true });
            log('info', `🟢 البوت [${botName}] انطلق بنجاح في حساب مستقل.`);

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

                // 🌟 التحقق الذكي: هل هذا الأمر اختاره العضو في لوحة التحكم حقتك؟
                if (allowedCommands && allowedCommands.length > 0) {
                    if (!allowedCommands.includes(commandName)) {
                        // إذا العضو ما فعل هذا الأمر في نسخته، يتجاهله البوت تماماً
                        return;
                    }
                }

                // تشغيل منطق الأمر المستدعى (مثال استدعاء ملفات مجلد commands)
                try {
                    const cmdFile = path.join(commandsPath, `${commandName}.js`);
                    if (fs.existsSync(cmdFile)) {
                        const command = require(cmdFile);
                        if (command && command.onStart) {
                            await command.onStart({ api, event, args });
                        }
                    }
                } catch (cmdErr) {
                    log('error', `Error executing [${commandName}] on bot [${botName}]: ${cmdErr.message}`);
                }
            });
        });

        return res.json({ success: true });

    } catch (e) {
        return res.status(400).json({ success: false, error: "صيغة الـ appState غير صحيحة، يرجى تمرير كود JSON سليم." });
    }
});

// تشغيل السيرفر الأساسي للوحة
app.listen(PORT, () => {
    log('info', `🌐 Aplin AI Server is running on port ${PORT}`);
});

process.on('SIGINT', () => {
    log('info', 'Stopping server and killing sessions...');
    process.exit(0);
});
