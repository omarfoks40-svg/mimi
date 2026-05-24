const { Threads } = require('../../database/database');

module.exports = {
  config: {
    name: 'بادئة',
    version: '1.2',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    groupAdminOnly: true, // تفعيل الخاصية في الإعدادات
    description: 'يضبط بادئة المجموعة ويغير كنية البوت تلقائياً للمشرفين فقط.',
    category: 'group',
    guide: {
      ar: '{pn} [البادئة_الجديدة] أو اتركها فارغة للعمل بدون بادئة'
    },
  },

  onStart: async ({ api, event, args }) => {
    try {
      const { threadID, messageID, senderID, isGroup } = event;
      
      // التحقق أولاً إذا كان الأمر مستخدم داخل مجموعة
      if (!isGroup) {
        return api.sendMessage("❌ هذا الأمر يمكن استخدامه داخل المجموعات فقط.", threadID, messageID);
      }

      // جلب معلومات المجموعة للتحقق من المشرفين
      const threadInfo = await api.getThreadInfo(threadID);
      const adminIDs = threadInfo.adminIDs.map(admin => admin.id);

      // التحقق إذا كان المرسل هو أحد المشرفين
      if (!adminIDs.includes(senderID)) {
        return api.sendMessage(
          "●───── ✾ ⌬ ✾ ─────●\n" +
          "✾ ┇ ❌ عذراً! هذا الأمر متاح لمشرفي المجموعة فقط 🙅‍♂️\n" +
          "●───── ✾ ⌬ ✾ ─────●", 
          threadID, messageID
        );
      }

      const botID = api.getCurrentUserID();
      let newPrefix = args[0] || '';

      const threadData = Threads.get(threadID);
      if (!threadData) {
        return api.sendMessage(
          "●───── ✾ ⌬ ✾ ─────●\n" +
          "✾ ┇ ❌ بـيـانـات الـمـجـمـوعة غـيـر مـوجـودة\n" +
          "●───── ✾ ⌬ ✾ ─────●", 
          threadID, messageID
        );
      }

      // تحديث البادئة في قاعدة البيانات
      threadData.settings.prefix = newPrefix;
      Threads.set(threadID, threadData);

      // --- تغيير كنية البوت بالورود ---
      const botName = "𝙰𝙱𝙸𝙻𝙴𝙽 𝙸𝙻  ✎"; 
      const newNickname = newPrefix === '' ? `✔️ ┇ ${botName}` : `✔️ ┇  ❨${newPrefix}❩  ${botName}`;
      
      try {
        await api.changeNickname(newNickname, threadID, botID);
      } catch (e) {
        console.log("فشل تغيير الكنية بسبب نقص صلاحيات البوت كمشرف");
      }

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
