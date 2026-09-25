module.exports = {
  config: {
    name: 'غادر',
    version: '1.2',
    author: 'XaviaTeam',
    countDown: 5,
    prefix: true,
    groupAdminOnly: true, 
    description: 'يجعل البوت يغادر المجموعة الحالية أو كل المجموعات (للمطور فقط).',
    category: 'owner',
    guide: {
      en: '{pn} [groupID/all]'
    },
  },

  onStart: async ({ api, event, args }) => {
    try {
      const developerID = '61593972777711'; // أيديك
      const senderID = event.senderID;

      // إذا لم يكن المرسل هو المطور، تفاعل بـ ❌ وتوقف
      if (senderID !== developerID) {
        return api.setMessageReaction("❌", event.messageID, (err) => {}, true);
      }

      // إذا كان المطور، تفاعل بـ ✅ واستمر في التنفيذ
      api.setMessageReaction("✅", event.messageID, (err) => {}, true);

      const botID = api.getCurrentUserID?.() || global.botID;
      const input = args[0]?.toLowerCase();
      const threadIDs = [];

      // منطق تحديد المجموعات
      if (input === 'all') {
        const threadList = (await api.getThreadList(100, null, ['INBOX'])) || [];
        const groups = threadList.filter(
          (thread) =>
            thread.threadID !== event.threadID &&
            thread.isGroup &&
            thread.isSubscribed
        );
        threadIDs.push(...groups.map((t) => t.threadID));
      } else if (args.length > 0) {
        const inputThreadIDs = args
          .map((id) => id.replace(/[^0-9]/g, ''))
          .filter((id) => id.length >= 15 && !isNaN(id));
        threadIDs.push(...inputThreadIDs);
      } else {
        threadIDs.push(event.threadID);
      }

      // الخروج من المجموعات المحددة
      for (const threadID of threadIDs) {
        await new Promise((resolve) => {
          api.removeUserFromGroup(botID, threadID, () => resolve(true));
        });
        await new Promise((r) => setTimeout(r, 500)); // تأخير بسيط لتجنب الحظر
      }

    } catch (error) {
      console.error('Error in غادر command:', error);
    }
  },
};
