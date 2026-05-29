const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { Threads } = require("../../database/database");

// ══════════════════════════════════════════════
//  مفاتيح الإعدادات
// ══════════════════════════════════════════════
const KEYS = [
    "antiSpam",
    "antiOut",
    "antiChangeGroupName",
    "antiChangeGroupImage",
    "antiChangeNickname",
    "notifyChange",
    "antiAdminProtect",
];

function getShow(settings) {
    const show = {};
    for (const k of KEYS) show[k] = settings[k] ? "✅" : "❌";
    return show;
}

// ══════════════════════════════════════════════
//  مكافحة السبام — تتبع معدل الرسائل
// ══════════════════════════════════════════════
if (!global._spamTracker) global._spamTracker = {};   // { "threadID_userID": [timestamps] }
if (!global._spamWarned)  global._spamWarned  = {};   // { "threadID_userID": warnCount }

const SPAM_LIMIT    = 5;     // عدد الرسائل المسموحة
const SPAM_WINDOW   = 5000;  // نافذة الزمن بالمللي ثانية
const SPAM_KICK_AT  = 2;     // عدد التحذيرات قبل الطرد

// ══════════════════════════════════════════════
//  مساعد تحميل الصور
// ══════════════════════════════════════════════
const CACHE_DIR = path.join(__dirname, "cache");

async function downloadImage(url, filename) {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const filePath = path.join(CACHE_DIR, filename);
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
    });
    const ext = (response.headers["content-type"] || "image/jpeg").split("/")[1]?.split(";")[0] || "jpg";
    const finalPath = filePath.replace(/\.[^.]+$/, `.${ext}`);
    fs.writeFileSync(finalPath, Buffer.from(response.data));
    return finalPath;
}

function safeDelete(filePath) {
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
}

// ══════════════════════════════════════════════
//  لوحة الإعدادات
// ══════════════════════════════════════════════
function buildSettingsPanel(settings, extra = "") {
    const s = getShow(settings);
    return (
        `> ˼🛡️˹↜ إعدادات الحماية والإدارة ↶\n` +
        `╮──────────────⟢ـ\n` +
        `​❆˹┊ 🔒 الـحـمـايـة:\n` +
        `​❆˹┊ ① [${s.antiSpam}] مكافحة السبام\n` +
        `​❆˹┊ ② [${s.antiOut}] منع الخروج\n` +
        `​❆˹┊ ③ [${s.antiChangeGroupName}] حماية الاسم\n` +
        `​❆˹┊ ④ [${s.antiChangeGroupImage}] حماية الصورة\n` +
        `​❆˹┊ ⑤ [${s.antiChangeNickname}] حماية الكنيات\n` +
        `​❆˹┊ ⑥ [${s.notifyChange}] الإشعارات\n` +
        `​❆˹┊ ⑦ [${s.antiAdminProtect}] حماية الأدمنية\n` +
        `╯──────────────⟢ـ\n` +
        `​❆˹┊ 🔧 الـإدارة:\n` +
        `​❆˹┊ اعدادات رمز [رمز]     — تغيير رمز المجموعة\n` +
        `​❆˹┊ اعدادات اسم [اسم]     — تغيير اسم المجموعة\n` +
        `​❆˹┊ اعدادات صورة          — تغيير صورة المجموعة\n` +
        `​❆˹┊ اعدادات جلب           — جلب صورة المجموعة\n` +
        `​❆˹┊ اعدادات معلومات       — تفاصيل المجموعة\n` +
        `​❆˹┊ اعدادات موافقة تشغيل  — تشغيل وضع الموافقة\n` +
        `​❆˹┊ اعدادات موافقة ايقاف  — إيقاف وضع الموافقة\n` +
        `╯──────────────⟢ـ\n` +
        `↫ رد بالأرقام (1-7) لتبديل إعداد الحماية ؛-؛` +
        (extra ? `\n${extra}` : "")
    );
}

// ══════════════════════════════════════════════
//  الأمر الرئيسي
// ══════════════════════════════════════════════
module.exports = {
    config: {
        name: "اعدادات",
        version: "3.0.0",
        author: "SINKO & GrandpaEJ",
        countDown: 3,
        role: 1,
        description: "إعدادات حماية وإدارة المجموعة — نظام مدمج",
        category: "group",
        aliases: ["setting", "حماية", "ادارة", "manage"],
        guide: { ar: "{pn} أو {pn} [رمز/اسم/صورة/جلب/معلومات/موافقة]" }
    },

    // ─── handleEvent: مكافحة السبام الفعلية ───
    handleEvent: async function ({ api, event }) {
        if (event.type !== "message" && event.type !== "message_reply") return;
        const { threadID, senderID } = event;
        if (!threadID || !senderID) return;

        const threadData = Threads.get(threadID) || {};
        const anti = (threadData.settings || {}).antiSettings || {};
        if (!anti.antiSpam) return;

        const botID = String(api.getCurrentUserID());
        if (String(senderID) === botID) return;

        // فحص إذا كان أدمن → لا يُطبق عليه السبام
        try {
            const info = await api.getThreadInfo(threadID);
            const isGroupAdmin = info.adminIDs.some(a => String(a.id) === String(senderID));
            if (isGroupAdmin) return;
        } catch (_) {}

        const key = `${threadID}_${senderID}`;
        const now = Date.now();

        if (!global._spamTracker[key]) global._spamTracker[key] = [];
        global._spamTracker[key] = global._spamTracker[key].filter(t => now - t < SPAM_WINDOW);
        global._spamTracker[key].push(now);

        if (global._spamTracker[key].length >= SPAM_LIMIT) {
            global._spamTracker[key] = [];
            global._spamWarned[key] = (global._spamWarned[key] || 0) + 1;

            // محاولة حذف الرسالة
            try { await api.unsendMessage(event.messageID); } catch (_) {}

            if (global._spamWarned[key] >= SPAM_KICK_AT) {
                global._spamWarned[key] = 0;
                try {
                    await api.removeUserFromGroup(senderID, threadID);
                    return api.sendMessage(
                        `🚫 تم طرد العضو بسبب الإرسال المتكرر (سبام).\n⚡ ${SPAM_LIMIT} رسائل في ${SPAM_WINDOW / 1000} ثواني = طرد فوري.`,
                        threadID
                    );
                } catch (_) {
                    return api.sendMessage(`⛔ تحذير أخير! سيتم الطرد في المرة القادمة إذا استمر السبام.`, threadID);
                }
            } else {
                return api.sendMessage(
                    `⚠️ تحذير ${global._spamWarned[key]}/${SPAM_KICK_AT}: إرسالك سريع جداً!\n` +
                    `${SPAM_KICK_AT - global._spamWarned[key] === 0 ? "التحذير الأخير!" : `تبقى ${SPAM_KICK_AT - global._spamWarned[key]} تحذير/ات قبل الطرد.`}`,
                    threadID
                );
            }
        }
    },

    // ─── الأمر الأساسي ───
    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, messageReply, senderID } = event;

        try {
            // التحقق من صلاحية أدمن المجموعة
            const threadInfo = await api.getThreadInfo(threadID);
            const isGroupAdmin = threadInfo.adminIDs.some(e => String(e.id) === String(senderID));

            // التحقق من أدمن البوت (المطور)
            const botAdmins = (global.client?.config?.adminUIDs || []).map(String);
            const isBotAdmin = botAdmins.includes(String(senderID));

            if (!isGroupAdmin && !isBotAdmin) {
                return api.sendMessage(
                    "⚠️ يجب أن تكون مسؤولاً في المجموعة لاستخدام هذا الأمر.",
                    threadID, messageID
                );
            }

            // ─── عرض لوحة الإعدادات (بدون أوامر فرعية) ───
            if (args.length === 0) {
                const threadData = Threads.get(threadID) || {};
                const settings = (threadData.settings || {}).antiSettings || {};
                const msg = await api.sendMessage(buildSettingsPanel(settings), threadID, messageID);

                if (msg) {
                    if (!global.client.handleReply) global.client.handleReply = [];
                    global.client.handleReply.push({
                        name: this.config.name,
                        messageID: msg.messageID,
                        author: senderID,
                        step: "choose",
                    });
                }
                return;
            }

            // ─── الأوامر الفرعية ───
            const sub = args[0].trim();
            const params = args.slice(1).join(" ").trim();

            switch (sub) {

                // ── تغيير رمز المجموعة ──
                case "رمز": {
                    if (!params)
                        return api.sendMessage("⚠️ مثال: اعدادات رمز 🔥", threadID, messageID);
                    await api.changeThreadEmoji(params, threadID);
                    return api.sendMessage(`✅ تم تغيير رمز المجموعة إلى ${params}`, threadID, messageID);
                }

                // ── تغيير اسم المجموعة ──
                case "اسم": {
                    if (!params)
                        return api.sendMessage("⚠️ مثال: اعدادات اسم اسم جديد", threadID, messageID);
                    await api.setTitle(params, threadID);
                    return api.sendMessage(`✅ تم تغيير اسم المجموعة إلى: ${params}`, threadID, messageID);
                }

                // ── تغيير صورة المجموعة ──
                case "صورة": {
                    let imgUrl = null;

                    // محاولة جلب الصورة من الرد أو المرفق المباشر
                    if (messageReply?.attachments?.length > 0) {
                        const att = messageReply.attachments[0];
                        imgUrl = att.url || att.previewUrl || att.largePreviewUrl || null;
                    } else if (event.attachments?.length > 0) {
                        const att = event.attachments[0];
                        imgUrl = att.url || att.previewUrl || att.largePreviewUrl || null;
                    }

                    if (!imgUrl)
                        return api.sendMessage(
                            "⚠️ رُدَّ على صورة واكتب: اعدادات صورة",
                            threadID, messageID
                        );

                    let filePath = null;
                    try {
                        filePath = await downloadImage(imgUrl, `grp_${threadID}_${Date.now()}`);
                        await api.changeGroupImage(fs.createReadStream(filePath), threadID);
                        return api.sendMessage("✅ تم تغيير صورة المجموعة بنجاح.", threadID, messageID);
                    } catch (err) {
                        return api.sendMessage(`❌ فشل تغيير الصورة: ${err.message}`, threadID, messageID);
                    } finally {
                        safeDelete(filePath);
                    }
                }

                // ── جلب صورة المجموعة الحالية ──
                case "جلب": {
                    const imgSrc = threadInfo.imageSrc || threadInfo.image;
                    if (!imgSrc)
                        return api.sendMessage("⚠️ هذه المجموعة لا تملك صورة خاصة.", threadID, messageID);

                    let filePath = null;
                    try {
                        filePath = await downloadImage(imgSrc, `getpic_${threadID}_${Date.now()}`);
                        await api.sendMessage(
                            { body: "🖼️ صورة المجموعة الحالية:", attachment: fs.createReadStream(filePath) },
                            threadID, messageID
                        );
                    } catch (err) {
                        return api.sendMessage(`❌ فشل جلب الصورة: ${err.message}`, threadID, messageID);
                    } finally {
                        safeDelete(filePath);
                    }
                    return;
                }

                // ── معلومات المجموعة ──
                case "معلومات": {
                    const botID  = String(api.getCurrentUserID());
                    const isBotGrpAdmin = threadInfo.adminIDs.some(a => String(a.id) === botID);
                    const adminList = threadInfo.adminIDs
                        .map(a => `• ${threadInfo.nicknames?.[a.id] || "عضو فيسبوك"} (${a.id})`)
                        .join("\n");

                    return api.sendMessage(
                        `> ˼📊˹↜ تفاصيل المجموعة ↶\n` +
                        `╮──────────────⟢ـ\n` +
                        `​❆˹┊ الاسم: ${threadInfo.threadName || "غير محدد"}\n` +
                        `​❆˹┊ المعرف: ${threadInfo.threadID}\n` +
                        `​❆˹┊ الأعضاء: ${threadInfo.participantIDs.length}\n` +
                        `​❆˹┊ المسؤولين: ${threadInfo.adminIDs.length}\n` +
                        `​❆˹┊ الرمز: ${threadInfo.emoji || "الافتراضي"}\n` +
                        `​❆˹┊ البوت أدمن: ${isBotGrpAdmin ? "✅" : "❌"}\n` +
                        `╯──────────────⟢ـ\n` +
                        `👑 المسؤولون:\n${adminList}`,
                        threadID, messageID
                    );
                }

                // ── وضع الموافقة على الأعضاء ──
                case "موافقة": {
                    const state = params.toLowerCase().trim();
                    if (state !== "تشغيل" && state !== "ايقاف")
                        return api.sendMessage(
                            "⚠️ مثال:\n• اعدادات موافقة تشغيل\n• اعدادات موافقة ايقاف",
                            threadID, messageID
                        );

                    const enable = state === "تشغيل";
                    try {
                        // fca-priyansh: changeGroupApprovalMode أو setGroupApprovalMode
                        if (typeof api.changeGroupApprovalMode === "function") {
                            await api.changeGroupApprovalMode(threadID, enable);
                        } else if (typeof api.setGroupApprovalMode === "function") {
                            await api.setGroupApprovalMode(threadID, enable);
                        } else {
                            // محاولة بديلة عبر changeArchivedStatus
                            throw new Error("دالة الموافقة غير متوفرة في هذا الإصدار من المكتبة");
                        }
                        return api.sendMessage(
                            `✅ تم ${enable ? "تشغيل" : "إيقاف"} وضع الموافقة على الأعضاء الجدد.`,
                            threadID, messageID
                        );
                    } catch (err) {
                        return api.sendMessage(
                            `❌ فشل تغيير وضع الموافقة.\n` +
                            `تأكد أن البوت مسؤول في المجموعة.\n` +
                            `(${err.message})`,
                            threadID, messageID
                        );
                    }
                }

                default: {
                    const threadData = Threads.get(threadID) || {};
                    const settings = (threadData.settings || {}).antiSettings || {};
                    const msg = await api.sendMessage(buildSettingsPanel(settings, "⚠️ أمر غير معروف — إليك القائمة الكاملة:"), threadID, messageID);
                    if (msg) {
                        if (!global.client.handleReply) global.client.handleReply = [];
                        global.client.handleReply.push({
                            name: this.config.name,
                            messageID: msg.messageID,
                            author: senderID,
                            step: "choose",
                        });
                    }
                    return;
                }
            }

        } catch (error) {
            return api.sendMessage(`❌ حدث خطأ: ${error.message}`, threadID, messageID);
        }
    },

    // ─── الرد على لوحة الإعدادات ───
    onReply: async function ({ api, event, handleReply }) {
        const { threadID, messageID, senderID, body } = event;
        if (String(handleReply.author) !== String(senderID)) return;

        if (handleReply.step === "choose") {
            const nums = body.trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 7);
            if (!nums.length)
                return api.sendMessage("⚠️ أرسل أرقام صحيحة من 1 لـ 7 ؛-؛", threadID, messageID);

            try {
                const threadData = Threads.get(threadID) || {};
                const currentSettings = threadData.settings || {};
                const antiSettings = currentSettings.antiSettings || {};

                const newSettings = {};
                for (const k of KEYS) newSettings[k] = !!antiSettings[k];
                for (const n of nums) newSettings[KEYS[n - 1]] = !newSettings[KEYS[n - 1]];

                currentSettings.antiSettings = newSettings;
                Threads.set(threadID, { settings: currentSettings });

                // فحص البوت أدمن
                const botID = String(api.getCurrentUserID());
                const threadInfo = await api.getThreadInfo(threadID).catch(() => ({}));
                const adminIDs = (threadInfo.adminIDs || []).map(a => String(a.id || a));
                const isBotAdmin = adminIDs.includes(botID);
                const warning = isBotAdmin ? "" : "\n⚠️ تنبيه: البوت ليس مشرفاً — بعض ميزات الحماية لن تعمل!";

                return api.sendMessage(
                    buildSettingsPanel(newSettings, `✅ تم حفظ التعديلات بنجاح.${warning}`),
                    threadID, messageID
                );
            } catch (e) {
                return api.sendMessage("❌ فشل الحفظ في قاعدة البيانات ؛-؛", threadID, messageID);
            }
        }
    }
};
