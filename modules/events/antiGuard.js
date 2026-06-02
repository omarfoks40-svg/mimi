const { Threads } = require('../../database/database');
const axios = require('axios'); // بنحتاجه لتحميل الصورة القديمة وإعادتها

module.exports = {
  config: {
    name: "antiGuard",
    eventType: ["log:subscribe", "log:unsubscribe", "log:thread-name", "log:thread-icon", "log:user-nickname"],
    version: "3.5.0",
    author: "محمد (SINKO) / Gemini",
    description: "حماية احترافية متكاملة - ألقاب، أسماء، منع إضافة المطرودين، وإعادة الصورة"
  },

  onStart: async ({ api, event }) => {
    try {
      const { threadID, logMessageType, logMessageData, author } = event;
      const botID = api.getCurrentUserID();
      
      // لا تفعل شيئاً إذا كان البوت هو من قام بالتغيير
      if (author == botID) return;

      // جلب بيانات المجموعة من قاعدة البيانات
      let threadData = (await Threads.get(threadID)) || {};
      if (!threadData.settings) threadData.settings = {};
      
      const settings = threadData.settings;
      const anti = settings.antiSettings || settings.anti || {}; 

      // --- [ 1. نظام حماية الألقاب المطور ] ---
      if (logMessageType === "log:user-nickname") {
        const pID = logMessageData.participantID || logMessageData.participant_id;

        if (anti.antiChangeNickname === true || anti.antiNickname === true) {
          const oldNick = (threadData.nicknameCache && threadData.nicknameCache[pID]) ? threadData.nicknameCache[pID] : "";
          
          if (!oldNick || oldNick === "") {
            await api.changeNickname("", threadID, pID);
            return api.sendMessage("إنت أصلاً ما عندك لقب، ممنوع تفتري وتعمل واحد! 🧹😼", threadID);
          } else {
            await api.changeNickname(oldNick, threadID, pID);
            return api.sendMessage(`لقبك المحفوظ هو "${oldNick}"، بتاريخك مالك معاهو؟ 🐍`, threadID);
          }
        } else {
          if (!threadData.nicknameCache) threadData.nicknameCache = {};
          threadData.nicknameCache[pID] = logMessageData.nickname || "";
          await Threads.set(threadID, threadData);
        }
      }

      // --- [ 2. حماية اسم المجموعة ] ---
      if (logMessageType === "log:thread-name" && (anti.antiChangeGroupName === true || anti.antiName === true)) {
        const oldName = logMessageData.oldName || threadData.name || "المجموعة";
        await api.setTitle(oldName, threadID);
        return api.sendMessage(`اسي مالك مع الاسم دا؟ رجعتو لـ: "${oldName}" 🗿`, threadID);
      }

      // --- [ 3. منع الخروج (Anti-Out) - تعديل عدم إرجاع المطرود ] ---
      if (logMessageType === "log:unsubscribe" && (anti.antiOut === true)) {
        const leftID = logMessageData.leftParticipantFbId;
        
        // لو خرج بنفسه (الآيدي حق الآثور يساوي المغادر) والبوت ليس المغادر -> يرجعه
        if (leftID !== botID && author == leftID) {
          await api.addUserToGroup(leftID, threadID, (err) => {
            if (!err) api.sendMessage("قال أنا بخليك تخرج بكرامة.. بل بس هنا 🗿🔨", threadID);
          });
        }
      }

      // --- [ 4. حماية صورة المجموعة (التصليح الشامل) ] ---
      if (logMessageType === "log:thread-icon") {
        if (anti.antiChangeGroupImage === true || anti.antiIcon === true) {
          // إذا الحماية شغالة، بنحاول نرجع الصورة القديمة لو مخزنة في الـ كاش/الحدث
          const oldImageURL = logMessageData.image?.url || threadData.imageSrc; 
          
          if (oldImageURL) {
            api.sendMessage("🛡️ تغيير صورة المجموعة ممنوع يا وهم! جاري إعادة الصورة الأصلية...", threadID);
            try {
              const imageStream = (await axios.get(oldImageURL, { responseType: 'stream' })).data;
              await api.changeGroupImage(imageStream, threadID);
            } catch (imgErr) {
              console.error("Failed to restore group image:", imgErr);
            }
          } else {
            return api.sendMessage("🛡️ تغيير صورة المجموعة ممنوع، بس ما عندي كاش للصورة القديمة عشان أرجعها!", threadID);
          }
        } else {
          // لو الحماية مقفولة، نحدث رابط الصورة الجديدة في القاعدة عشان نرجع لها مستقبلاً
          threadData.imageSrc = logMessageData.image?.url || "";
          await Threads.set(threadID, threadData);
        }
      }

    } catch (err) {
      console.error("AntiGuard Error:", err);
    }
  }
};
