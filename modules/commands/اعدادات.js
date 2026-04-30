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
        version: "1.5.0",
        author: "Kenji & Sinko",
        countDown: 3,
        role: 1,
        description: "إعدادات حماية المجموعة بالتفاعل",
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
`╭━〔 🛡 إعدادات المجموعة 🛡 〕━╮
① [${show.antiSpam}] مكافحة السبام
② [${show.antiOut}] منع الخروج
③ [${show.antiChangeGroupName}] حماية الاسم
④ [${show.antiChangeGroupImage}] حماية الصورة
⑤ [${show.antiChangeNickname}] حماية الكنيات
⑥ [${show.notifyChange}] الإشعارات
╰━━━━━━━━━━━━━━━━━╯
↫ رد بالأرقام لتغيير الإعداد (مثلاً: 1 3) ؛-؛`,
            threadID, messageID
        );

        if (msg) {
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
        if (handleReply.author !== senderID) return;

        if (handleReply.step === "choose") {
            const nums = body.trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 6);
            if (!nums.length) return api.sendMessage("⚠️ أرسل أرقام صحيحة من 1 لـ 6 يا ملك ؛-؛", threadID, messageID);

            const threadData = Threads.get(threadID) || {};
            const current = threadData.settings?.antiSettings || {};
            const newSettings = {};
            for (const k of KEYS) newSettings[k] = !!current[k];
            for (const n of nums) newSettings[KEYS[n - 1]] = !newSettings[KEYS[n - 1]];

            // --- الفحص المصلح لصلاحيات البوت ---
            const threadInfo = await api.getThreadInfo(threadID).catch(() => ({}));
            const botID = api.getCurrentUserID();
            const adminIDs = (threadInfo.adminIDs || []).map(a => (a.id || a).toString());
            const isBotAdmin = adminIDs.includes(botID.toString());

            let warning = "";
            if (!isBotAdmin) {
                warning = "⚠️ تنبيه: البوت ليس مشرفاً! تم تعطيل خيارات الحماية التلقائية ؛-؛\n\n";
                newSettings.antiOut = false;
                newSettings.antiSpam = false;
            }

            const show = getShow(newSettings);
            const msg = await api.sendMessage(
`╭━〔 ⚙️ تأكيد الإعدادات 〕━╮
① [${show.antiSpam}] مكافحة السبام
② [${show.antiOut}] منع الخروج
③ [${show.antiChangeGroupName}] حماية الاسم
④ [${show.antiChangeGroupImage}] حماية الصورة
⑤ [${show.antiChangeNickname}] حماية الكنيات
⑥ [${show.notifyChange}] الإشعارات
╰━━━━━━━━━━━━━━━━╯
${warning}↫ تفاعل بـ 👍 (لايك) على هذه الرسالة للحفظ ؛-؛`,
                threadID, messageID
            );

            if (msg) {
                global.client.handleReaction.push({
                    name: this.config.name,
                    messageID: msg.messageID,
                    author: senderID,
                    newSettings
                });
            }
        }
    },

    onReaction: async function ({ api, event, handleReaction }) {
        const { threadID, messageID, userID, reaction } = event;
        if (userID !== handleReaction.author) return;

        // التحقق من تفاعل التأكيد (لايك أو قلب أو صح)
        if (["👍", "❤️", "✅"].includes(reaction)) {
            const threadData = Threads.get(threadID) || {};
            const currentSettings = threadData.settings || {};
            currentSettings.antiSettings = handleReaction.newSettings;
            
            Threads.set(threadID, { settings: currentSettings });

            api.unsendMessage(handleReaction.messageID); // حذف رسالة التأكيد
            return api.sendMessage("✅ تم حفظ الإعدادات بنجاح.. المجموعة الآن في أمان ؛-؛", threadID);
        }
    }
};
