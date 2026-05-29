const { Threads } = require('../../database/database');

module.exports = {
  config: {
    name: "antiGuard",
    eventType: ["log:subscribe", "log:unsubscribe", "log:thread-name", "log:thread-icon", "log:user-nickname"],
    version: "3.0.0",
    author: "محمد (SINKO) / Gemini",
    description: "حماية احترافية - دمج نظام الألقاب الذكي مع قاعدة البيانات"
  },

  onStart: async ({ api, event }) => {
    try {
      const { threadID, logMessageType, logMessageData, author } = event;
      const botID = api.getCurrentUserID();
      
      // لا تفعل شيئاً إذا كان البوت هو من قام بالتغيير
      if (author == botID) return;

      // جلب بيانات المجموعة من قاعدة البيانات
      let threadData = (await Threads.get(threadID)) || {};
      const settings = threadData.settings || {};
      const anti = settings.antiSettings || settings.anti || {}; // دعم المسميين

      // --- [ 1. نظام حماية الألقاب المطور - حسب الاتفاق ] ---
      if (logMessageType === "log:user-nickname") {
        const pID = logMessageData.participantID || logMessageData.participant_id;

        if (anti.antiChangeNickname === true || anti.antiNickname === true) {
          // جلب الكنية القديمة من كاش قاعدة البيانات
          const oldNick = (threadData.nicknameCache && threadData.nicknameCache[pID]) ? threadData.nicknameCache[pID] : "";
          
          if (!oldNick || oldNick === "") {
            // الحالة: لو أصلاً ما عنده لقب (القديم فاضي) -> نمسح الجديد
            await api.changeNickname("", threadID, pID);
            return api.sendMessage("إنت أصلاً ما عندك لقب، ممنوع تفتري وتعمل واحد! 🧹😼", threadID);
          } else {
            // الحالة: لو عنده لقب قديم -> نرجعه
            await api.changeNickname(oldNick, threadID, pID);
            return api.sendMessage(`لقبك المحفوظ هو "${oldNick}"، بتاريخك مالك معاهو؟ 🐍`, threadID);
          }
        } else {
          // إذا الحماية معطلة، نحدث "الكاش" باللقب الجديد عشان يكون مرجع للستقبل
          if (!threadData.nicknameCache) threadData.nicknameCache = {};
          threadData.nicknameCache[pID] = logMessageData.nickname || "";
          await Threads.set(threadID, threadData);
        }
      }

      // --- [ 2. حماية اسم المجموعة ] ---
      if (logMessageType === "log:thread-name" && (anti.antiChangeGroupName === true || anti.antiName === true)) {
        // نستخدم الاسم القديم الممرر من الحدث أو المخزن في القاعدة
        const oldName = logMessageData.oldName || threadData.name || "المجموعة";
        await api.setTitle(oldName, threadID);
        return api.sendMessage(`اسي مالك مع الاسم دا؟ رجعتو لـ: "${oldName}" 🗿`, threadID);
      }

      // --- [ 3. منع الخروج (Anti-Out) ] ---
      if (logMessageType === "log:unsubscribe" && (anti.antiOut === true)) {
        const leftID = logMessageData.leftParticipantFbId;
        if (leftID !== botID) {
          await api.addUserToGroup(leftID, threadID, (err) => {
            if (!err) api.sendMessage("قال أنا بخليك تخرج بكرامة.. بل بس هنا 🗿🔨", threadID);
          });
        }
      }

      // --- [ 4. حماية صورة المجموعة ] ---
      if (logMessageType === "log:thread-icon" && (anti.antiChangeGroupImage === true || anti.antiIcon === true)) {
         return api.sendMessage("🛡️ تغيير صورة المجموعة ممنوع يا وهم.", threadID);
      }

    } catch (err) {
      console.error("AntiGuard Error:", err);
    }
  }
};
