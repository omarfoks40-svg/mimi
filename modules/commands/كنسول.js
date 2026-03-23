const Table = require('cli-table3');
const chalk = require('chalk');

module.exports = {
  config: {
    name: 'كنسول',
    version: '1.5.0',
    author: 'Arjhil Dacayanan',
    countDown: 0,
    role: 2, // للمطور فقط
    category: 'owner',
    description: 'يعرض الرسائل الواردة في الكونسل بشكل منظم.'
  },

  // الكود بيشتغل تلقائياً مع كل رسالة (events)
  handleEvent: async function ({ event, Threads, Users }) {
    if (event.type !== "message" && event.type !== "message_reply") return;

    const { threadID, senderID, body } = event;

    try {
      // جلب اسم المجموعة واسم المستخدم
      const threadData = await Threads.getData(threadID) || {};
      const userData = await Users.getData(senderID) || {};
      
      const threadName = threadData.threadInfo?.threadName || 'مجموعة غير معروفة';
      const nameUser = userData.name || 'مستخدم غير معروف';

      // مصفوفة ألوان فخمة
      const colors = ["#FF9900", "#FFFF33", "#33FFFF", "#FF99FF", "#FF3366", "#7ED957", "#00CCFF"];
      const randomColor = () => colors[Math.floor(Math.random() * colors.length)];

      // إنشاء الجدول بتنسيق هندسي
      const table = new Table({
        chars: {
          'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
          'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
          'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
          'right': '║', 'right-mid': '╢', 'middle': '│'
        },
        style: { head: [], border: [] }
      });

      // تنظيف النص عشان ما يخرب الجدول
      const cleanBody = body ? (body.length > 40 ? body.slice(0, 37) + "..." : body) : "وسائط (صورة/فيديو)";

      table.push(
        [{ colSpan: 1, content: chalk.hex(randomColor())(`المجموعة: ${threadName} (${threadID})`) }],
        [{ colSpan: 1, content: chalk.hex(randomColor())(`المرسل: ${nameUser} (${senderID})`) }],
        [{ colSpan: 1, content: chalk.hex("#FFFFFF")(`الرسالة: ${cleanBody}`) }]
      );

      console.log(table.toString());

    } catch (error) {
      // صامت عشان ما يزعجك في الكونسل لو حصل خطأ بسيط
    }
  },

  onStart: async function() {
    // الأمر ده بيشتغل كـ Event تلقائي، ما محتاج تنفيذ يدوي
  }
};
