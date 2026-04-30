const fs = require('fs-extra');

const DEVELOPER_ID = '61588108307572'; // إيديك كمطور

module.exports = {
  config: {
    name: 'معالجة',
    version: '1.3',
    author: 'Hridoy / Modified',
    countDown: 5,
    prefix: true,
    adminOnly: true,
    description: 'تشغيل أو إيقاف وضع المشرف مع تغيير كنية البوت.',
    category: 'owner',
    guide: {
      ar: '{pn} معالجة [تشغيل | ايقاف]',
    },
  },

  onStart: async ({ api, event, args }) => {
    try {
      // حماية: السماح للمطور فقط
      if (event.senderID !== DEVELOPER_ID) {
        return api.sendMessage('❎ دن.', event.threadID);
      }

      // التحقق من المدخلات
      if (!args.length) {
        return api.sendMessage(
          `الحالة الحالية: ${global.client.config.adminOnlyMode ? 'مفعل ✅' : 'مطفأ ❌'}`,
          event.threadID
        );
      }

      const state = args[0];
      const botID = api.getCurrentUserID(); // جلب إيدي البوت تلقائياً

      if (state === 'تشغيل') {
        global.client.config.adminOnlyMode = true;
        
        // تغيير كنية البوت عند التشغيل
        api.changeNickname("𝙰𝙱𝙸𝙻𝙴𝙽 𝙸𝙻  ╿ ❎", event.threadID, botID);
        
        api.sendMessage("تم ✔️", event.threadID);
      } 
      else if (state === 'ايقاف') {
        global.client.config.adminOnlyMode = false;
        
        // تغيير كنية البوت عند الإيقاف
        api.changeNickname("𝙰𝙱𝙸𝙻𝙴𝙽 𝙸𝙻  ╿ ✔️", event.threadID, botID);
        
        api.sendMessage("تم إيقاف وضع المشرف (البوت متاح للجميع) ╿ ⭕", event.threadID);
      } 
      else {
        return api.sendMessage('الرجاء استخدام: معالجة تشغيل أو معالجة ايقاف', event.threadID);
      }

      // حفظ الإعدادات في ملف config.json
      fs.writeJsonSync('./config.json', global.client.config, { spaces: 2 });

    } catch (error) {
      console.error("Error in adminonly command:", error);
      api.sendMessage('حدث خطأ أثناء تنفيذ الأمر.', event.threadID);
    }
  },
};
