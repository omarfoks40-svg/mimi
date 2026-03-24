const { Threads } = require('../../database/database');

module.exports = {
  config: {
    name: 'prefix', 
    version: '1.2',
    author: 'Edited by Abu Obaida',
    countDown: 5,
    prefix: false,
    description: 'عرض وتعديل بادئة المجموعة',
    category: 'الخدمات',
  },

  onStart: async ({ api, event, args }) => {
    try {
      const { threadID, messageID } = event;
      const threadData = Threads.get(threadID) || {};
      threadData.settings = threadData.settings || {};

      const groupPrefix = threadData.settings.prefix ||'🆓';
      const systemPrefix = global.client.config.prefix || '/';

      if (args[0] === 'set') {
        if (!event.isGroup) return api.sendMessage('', threadID);
        if (!args[1]) return api.sendMessage('', threadID);

        threadData.settings.prefix = args[1];
        Threads.set(threadID, threadData);

        return api.sendMessage(`تم تغيير بادئة المجموعة إلى: [ ${args[1]} ]`, threadID);
      }

      let message = `🪩 بادئة النظام: 『 ${systemPrefix} 』\n`;
      message += `🔁 بادئة المجموعة: 『 ${groupPrefix} 』`;

      api.sendMessage(message, threadID, messageID);

    } catch (err) {
      console.error(err);
      api.sendMessage('حدث خطأ داخلي.', event.threadID);
    }
  }
};
