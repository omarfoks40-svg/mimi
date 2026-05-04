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
        version: "2.0.0",
        author: "SINKO",
        countDown: 3,
        role: 1, // للمشرفين
        description: "إعدادات حماية المجموعة بالتفاعل والرد",
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
            // إضافة التعامل مع الرد
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
        if (handleReply.author !== senderID) return;

        if (handleReply.step === "choose") {
            const nums = body.trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 6);
            if (!nums.length) return api.sendMessage("⚠️ أرسل أرقام صحيحة من 1 لـ 6 يا ملك ؛-؛", threadID, messageID);

            const threadData = Threads.get(threadID) || {};
            const current = threadData.settings?.antiSettings || {};
            
            // تجهيز الإعدادات الجديدة بناءً على الاختيارات
            const newSettings = {};
            for (const k of KEYS) newSettings[k] = !!current[k];
            for (const n of nums) newSettings[KEYS[n - 1]] = !newSettings[KEYS[n - 1]];

            // فحص صلاحيات البوت
            const threadInfo = await api.getThreadInfo(threadID).catch(() => ({}));
            const botID = api.getCurrentUserID();
            const adminIDs = (threadInfo.adminIDs || []).map(a => (a.id || a).toString());
            const isBotAdmin = adminIDs.includes(botID.toString());

            let warning = "";
            if (!isBotAdmin) {
                warning = "⚠️ تنبيه: البوت ليس مشرفاً! قد لا تعمل بعض الحمايات ؛-؛\n\n";
            }

            const show = getShow(newSettings);
            const msg = await api.sendMessage(
`╭━〔 ⚙️ تأكيد الإعدادات الجديدة 〕━╮
① [${show.antiSpam}] مكافحة السبام
② [${show.antiOut}] منع الخروج
③ [${show.antiChangeGroupName}] حماية الاسم
④ [${show.antiChangeGroupImage}] حماية الصورة
⑤ [${show.antiChangeNickname}] حماية الكنيات
⑥ [${show.notifyChange}] الإشعارات
╰━━━━━━━━━━━━━━━━╯
${warning}↫ تفاعل بـ (👍) على هذه الرسالة لتأكيد الحفظ ؛-؛`,
                threadID, messageID
            );

            if (msg) {
                // دفع البيانات لنظام التفاعل
                if (!global.client.handleReaction) global.client.handleReaction = [];
                global.client.handleReaction.push({
                    name: this.config.name,
                    messageID: msg.messageID,
                    author: senderID,
                    newSettings: newSettings // تمرير الإعدادات المختارة للحفظ عند التفاعل
                });
            }
        }
    },

    onReaction: async function ({ api, event, handleReaction }) {
        const { threadID, userID, reaction, messageID } = event;
        
        // التحقق من أن الشخص المتفاعل هو نفسه صاحب الطلب
        if (userID !== handleReaction.author) return;

        // التحقق من نوع التفاعل (👍)
        if (reaction === "👍") {
            try {
                const threadData = Threads.get(threadID) || {};
                const currentSettings = threadData.settings || {};
                
                // تحديث الإعدادات في قاعدة البيانات
                currentSettings.antiSettings = handleReaction.newSettings;
                Threads.set(threadID, { settings: currentSettings });

                // إشعار بالنجاح وحذف رسالة التأكيد
                api.unsendMessage(handleReaction.messageID);
                return api.sendMessage("✅ تم الحفظ بنجاح! المجموعة الآن تحت حماية إبلين ؛-؛", threadID);
            } catch (e) {
                console.error(e);
                return api.sendMessage("حدث خطأ أثناء الحفظ ؛-؛", threadID);
            }
        }
    }
};
