const { Threads } = require('../../database/database');

module.exports = {
  config: {
    name: 'بادئة',
    version: '1.2',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    groupAdminOnly: true,
    description: 'يضبط بادئة المجموعة ويغير كنية البوت تلقائياً.',
    category: 'group',
    guide: {
      ar: '{pn} [البادئة_الجديدة] أو اتركها فارغة للعمل بدون بادئة'
    },
  },

  onStart: async ({ api, event, args }) => {
    try {
      const { threadID, messageID } = event;
      const botID = api.getCurrentUserID();
      let newPrefix = args[0] || '';

      const threadData = Threads.get(threadID);
      if (!threadData) {
        return api.sendMessage(
          "●───── ✾ ⌬ ✾ ─────●\n" +
          "✾ ┇ ❌ بـيـانـات الـمـجـمـوعة\n" +
          "●───── ✾ ⌬ ✾ ─────●", 
          threadID, messageID
        );
      }

      // تحديث البادئة في قاعدة البيانات
      threadData.settings.prefix = newPrefix;
      Threads.set(threadID, threadData);

      // --- الميزة الجديدة: تغيير كنية البوت بالورود ---
      const botName = "𝙰𝙱𝙸𝙻𝙴𝙽 𝙸𝙻  ✎"; 
      const newNickname = newPrefix === '' ? `✔️ ┇ ${botName}` : `✔️ ┇  ❨${newPrefix}❩  ${botName}`;
      
      await api.changeNickname(newNickname, threadID, botID);

      let msg = `●─────── ✾ ⌬ ✾ ─────●\n`;
      msg += `✾ ┇ ⦿ ⟬ تـحـديـث الـبـادئـة ✅ ⟭\n✾ ┇\n`;

      if (newPrefix === '') {
        msg += `✾ ┇  الـحـالـة: تـم التـصـفـيـر\n`;
        msg += `✾ ┇  الـوصـف:  بـدون بـادئـة\n`;
      } else {
        msg += `✾ ┇  الـحـالـة: تـم الـضـبـط\n`;
        msg += `✾ ┇  الـبـادئـة: 『 ${newPrefix} 』\n`;
      }
      
      msg += `✾ ┇  الـكـنـيـة: تم   \n`;
      msg += `✾ ┇  الـنـتـيـجـة: نـجـاح \n✾ ┇\n`;
      msg += `●─────── ✾ ⌬ ✾ ──────●`;

      return api.sendMessage(msg, threadID, messageID);

    } catch (error) {
      console.error("خطأ في أمر تعيين البادئة:", error);
      api.sendMessage(
        "●───── ✾ ⌬ ✾ ─────●\n" +
        "✾ ┇ ❌ حـدث خـطأ فـي الـنـظـام أو نـقـص صـلاحـيـات\n" +
        "●───── ✾ ⌬ ✾ ─────●", 
        event.threadID
      );
    }
  },
};
