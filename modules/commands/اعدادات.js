const { Threads } = require('../../database/database');

const KEYS = [
    "antiSpam",
    "antiOut",
    "antiChangeGroupName",
    "antiChangeGroupImage",
    "antiChangeNickname",
    "notifyChange",
];

function getShow(settings) {
    const show = {};
    for (const k of KEYS) show[k] = settings[k] ? "✅" : "❌";
    return show;
}

module.exports = {
    config: {
        name: "اعدادات",
        version: "2.7.0",
        author: "SINKO",
        countDown: 3,
        role: 1, 
        description: "إعدادات حماية المجموعة - أرقام ملكية وزخرفة APLIN",
        category: "group",
        aliases: ["setting", "حماية"],
        guide: { ar: "{pn}" }
    },

    onStart: async function ({ api, event }) {
        const { threadID, messageID } = event;

        const threadData = Threads.get(threadID) || {};
        const settings = threadData.settings?.antiSettings || {};
        const show = getShow(settings);

        const msg = await api.sendMessage(
`> ˼🛡️˹↜ إعدادات الحماية ↶
╮──────────────⟢ـ
​❆˹┊ ① [${show.antiSpam}] مكافحة السبام
​❆˹┊ ② [${show.antiOut}] منع الخروج
​❆˹┊ ③ [${show.antiChangeGroupName}] حماية الاسم
​❆˹┊ ④ [${show.antiChangeGroupImage}] حماية الصورة
​❆˹┊ ⑤ [${show.antiChangeNickname}] حماية الكنيات
​❆˹┊ ⑥ [${show.notifyChange}] الإشعارات
╯──────────────⟢ـ
↫ رد بالأرقام لتغيير الإعداد فوراً ؛-؛`,
            threadID, messageID
        );

        if (msg) {
            if (!global.client.handleReply) global.client.handleReply = [];
            global.client.handleReply.push({
                name: this.config.name,
                messageID: msg.messageID,
                author: event.senderID,
                step: "choose",
            });
        }
    },

    onReply: async function ({ api, event, handleReply }) {
        const { threadID, messageID, senderID, body } = event;
        if (String(handleReply.author) !== String(senderID)) return;

        if (handleReply.step === "choose") {
            const nums = body.trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 6);
            if (!nums.length) return api.sendMessage("⚠️ أرسل أرقام صحيحة من 1 لـ 6 يا ملك ؛-؛", threadID, messageID);

            try {
                const threadData = Threads.get(threadID) || {};
                const currentSettings = threadData.settings || {};
                const antiSettings = currentSettings.antiSettings || {};
                
                const newSettings = {};
                for (const k of KEYS) newSettings[k] = !!antiSettings[k];
                for (const n of nums) newSettings[KEYS[n - 1]] = !newSettings[KEYS[n - 1]];

                currentSettings.antiSettings = newSettings;
                Threads.set(threadID, { settings: currentSettings });

                // فحص الأدمن المطور
                const botID = String(api.getCurrentUserID());
                const threadInfo = await api.getThreadInfo(threadID).catch(() => ({}));
                const adminIDs = (threadInfo.adminIDs || []).map(admin => String(admin.id || admin));
                const isBotAdmin = adminIDs.includes(botID);

                let warning = isBotAdmin ? "" : "⚠️ تنبيه: البوت ليس مشرفاً حالياً!\n";
                const show = getShow(newSettings);

                return api.sendMessage(
`> ˼✅˹↜ تم تحديث الإعدادات ↶
╮──────────────⟢ـ
​❆˹┊ ① [${show.antiSpam}] مكافحة السبام
​❆˹┊ ② [${show.antiOut}] منع الخروج
​❆˹┊ ③ [${show.antiChangeGroupName}] حماية الاسم
​❆˹┊ ④ [${show.antiChangeGroupImage}] حماية الصورة
​❆˹┊ ⑤ [${show.antiChangeNickname}] حماية الكنيات
​❆˹┊ ⑥ [${show.notifyChange}] الإشعارات
╯──────────────⟢ـ
${warning}✅ تم حفظ التعديلات بنجاح ؛-؛`,
                    threadID, messageID
                );
            } catch (e) {
                return api.sendMessage("❌ فشل الحفظ في قاعدة البيانات ؛-؛", threadID, messageID);
            }
        }
    }
};
