module.exports = {
  config: {
    name: "حذف_بالتفاعل",
    version: "1.0.0",
    author: "Cenko",
    countDown: 0,
    role: 0,
    category: "system"
  },

  handleReaction: async function ({ api, event }) {
    const { reaction, messageID } = event;

    // التحقق من الإيموجي المطلوب
    if (reaction === "🦧") {
      try {
        // حذف الرسالة التي تم التفاعل عليها
        return api.unsendMessage(messageID);
      } catch (err) {
        // تسجيل الخطأ في حال لم يمتلك البوت صلاحية الحذف
        console.error("♢ خطأ في نظام الحذف التلقائي ⌬", err);
      }
    }
  },

  onStart: async function ({ api, event }) {
    // رسالة اختيارية عند تشغيل البوت
    api.sendMessage("⌬ نظام الحذف السريع عبر ✨ قيد التشغيل ♢", event.threadID);
  }
};
