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
        version: "1.0.0",
        author: "Kenji",
        countDown: 3,
        role: 1,
        description: "إعدادات حماية المجموعة",
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
③ [${show.antiChangeGroupName}] حماية اسم المجموعة
④ [${show.antiChangeGroupImage}] حماية صورة المجموعة
⑤ [${show.antiChangeNickname}] حماية الكنيات
⑥ [${show.notifyChange}] إشعارات الأحداث
╰━━━━━━━━━━━━━━━━━╯
↫ رد بالأرقام لتغيير الإعداد
↫ مثال: 1 3 5 (يمكن اختيار أكثر من رقم)`,
            threadID, messageID
        );

        if (msg && msg.messageID) {
            global.client.handleReply.push({
                name: "اعدادات",
                messageID: msg.messageID,
                author: event.senderID,
                step: "choose",
            });
        }
    },

    onReply: async function ({ api, event, handleReply }) {
        const { threadID, messageID, senderID, body } = event;

        if (handleReply.author && handleReply.author !== senderID) return;

        if (handleReply.step === "choose") {
            const nums = body.trim().split(/\s+/)
                .map(Number)
                .filter(n => n >= 1 && n <= 6);

            if (!nums.length) {
                return api.sendMessage(
`●─────── ⌬ ───────●
┇ ⦿ اختيار غير صالح
┇ أرسل أرقام من 1 إلى 6
┇ مثال: 1 أو 1 3 5
●─────── ⌬ ───────●`,
                    threadID, messageID
                );
            }

            const threadData = Threads.get(threadID) || {};
            const current = threadData.settings?.antiSettings || {};
            const newSettings = {};
            for (const k of KEYS) newSettings[k] = !!current[k];
            for (const n of nums) newSettings[KEYS[n - 1]] = !newSettings[KEYS[n - 1]];

            // التحقق من صلاحيات البوت كمشرف
            const threadInfo = await api.getThreadInfo(threadID).catch(() => null);
            const botID = api.getCurrentUserID();
            let botNotAdmin = false;

            if (threadInfo) {
                const adminIDs = (threadInfo.adminIDs || []).map(a => a?.id || a);
                if (!adminIDs.includes(botID)) {
                    botNotAdmin = true;
                    newSettings.antiOut = false;
                    newSettings.antiSpam = false;
                }
            }

            const show = getShow(newSettings);

            const warningLine = botNotAdmin
                ? `┇ ⚠️ البوت ليس مشرفاً - تم تعطيل ① و ②\n┇\n`
                : "";

            const msg = await api.sendMessage(
`╭━〔 ⚙️ تأكيد الإعدادات 〕━╮
① [${show.antiSpam}] مكافحة السبام
② [${show.antiOut}] منع الخروج
③ [${show.antiChangeGroupName}] حماية الاسم
④ [${show.antiChangeGroupImage}] حماية الصورة
⑤ [${show.antiChangeNickname}] حماية الكنيات
⑥ [${show.notifyChange}] إشعارات
╰━━━━━━━━━━━━━━━━╯
${warningLine}↫ رد بـ "تأكيد" للحفظ
↫ رد بـ "الغاء" للإلغاء`,
                threadID, messageID
            );

            if (msg && msg.messageID) {
                global.client.handleReply.push({
                    name: "اعدادات",
                    messageID: msg.messageID,
                    author: senderID,
                    step: "confirm",
                    newSettings,
                });
            }

        } else if (handleReply.step === "confirm") {
            const text = body.trim();

            if (["تأكيد", "نعم", "ok", "yes", "✅"].includes(text.toLowerCase())) {
                const threadData = Threads.get(threadID) || {};
                const currentSettings = threadData.settings || {};
                currentSettings.antiSettings = handleReply.newSettings;
                Threads.set(threadID, { settings: currentSettings });

                const show = getShow(handleReply.newSettings);

                return api.sendMessage(
`●─────── ⌬ ───────●
┇ ⦿ ⟬ تـم الحفظ بنجاح ✅ ⟭
┇
┇ ① [${show.antiSpam}] مكافحة السبام
┇ ② [${show.antiOut}] منع الخروج
┇ ③ [${show.antiChangeGroupName}] حماية الاسم
┇ ④ [${show.antiChangeGroupImage}] حماية الصورة
┇ ⑤ [${show.antiChangeNickname}] حماية الكنيات
┇ ⑥ [${show.notifyChange}] إشعارات
●─────── ⌬ ───────●`,
                    threadID, messageID
                );
            } else {
                return api.sendMessage(
`●─────── ⌬ ───────●
┇ ⦿ تم إلغاء التغييرات ❌
●─────── ⌬ ───────●`,
                    threadID, messageID
                );
            }
        }
    }
};
