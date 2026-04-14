const { log } = require('../../logger/logger');

// تخزين الأعضاء الذين تم الترحيب بهم لكل قروب
const welcomedUsers = new Set();

module.exports = {
  config: {
    name: 'welcome',
    version: '4.5',
    author: 'Edit',
    eventType: ['log:subscribe']
  },

  onStart: async ({ event, api }) => {
    try {
      if (event.logMessageType !== 'log:subscribe') return;

      const { threadID, logMessageData, author } = event;
      const botID = api.getCurrentUserID();

      if (author == botID) return;
      if (!logMessageData?.addedParticipants) return;

      const newUsers = logMessageData.addedParticipants
        .map(p => p.userFbId)
        .filter(id => id !== botID);

      if (!newUsers.length) return;

      await sendGroupWelcome(api, threadID, newUsers, author);

    } catch (error) {
      log('error', `Welcome event error: ${error.message}`);
    }
  }
};

async function sendGroupWelcome(api, threadID, userIDs, authorID) {
  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const mentions = [];
    
    // إعداد الوقت والتاريخ تلقائياً
    const time = new Date().toLocaleTimeString('ar-EG', { timeZone: 'Africa/Khartoum', hour12: true, hour: '2-digit', minute: '2-digit' });
    const dayName = new Date().toLocaleDateString('ar-EG', { timeZone: 'Africa/Khartoum', weekday: 'long' });

    // جلب معلومات الشخص الذي أضاف الأعضاء
    const authorInfo = await api.getUserInfo(authorID);
    const adderName = authorInfo?.[authorID]?.name || "المسؤول";
    const adderTag = `@${adderName}`;
    mentions.push({ tag: adderTag, id: authorID });

    // --- [ الزخرفة الفخمة المطلوبة ] ---
    let bodyText = `> ˼⏰˹↜ الـتـرحـيـب الـمـلـكـي ↶\n`;
    bodyText += `╮──────────────⟢ـ\n`;
    bodyText += `┆˼👤˹┊ المضيف ↜ ${adderTag}\n`;
    bodyText += `┆˼🧭˹┊ الـيـوم ↜｢ ${dayName} ｣\n`;
    bodyText += `┆˼🕕˹┊ الـوقت ↜｢ ${time} ｣\n`;
    bodyText += `╯──────────────⟢ـ\n`;
    bodyText += `> ˼🌌˹↜ أعـضـاء جـدد ↶\n`;
    bodyText += `╮──────────────⟢ـ\n`;

    let count = 1;
    for (const id of userIDs) {
      const userInfo = await api.getUserInfo(id);
      const name = userInfo?.[id]?.name || "عضو جديد";
      const tag = `@${name}`;
      
      bodyText += `​❆˹┊ ${count} ↜ ${tag}\n`;
      mentions.push({ tag, id });
      count++;
    }

    bodyText += `​❆˹┊ ⸻⸻⸻⸻⸻\n`;
    bodyText += `┆˼📊˹┊ الإجمالي ↜ ｢ ${threadInfo.participantIDs.length} ｣\n`;
    bodyText += `╯──────────────⟢ـ\n`;

    await api.sendMessage({ body: bodyText, mentions }, threadID);

  } catch (error) {
    log('error', `sendGroupWelcome error: ${error.message}`);
  }
}
