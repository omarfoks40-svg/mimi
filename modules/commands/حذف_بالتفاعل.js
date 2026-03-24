module.exports = {
  config: {
    name: "حذف",
    version: "2.5.0",
    author: "Cenko",
    countDown: 0,
    role: 0,
    category: "system"
  },

  handleEvent: async function ({ api, event }) {
    // ركز هنا: بنتحقق من نوع الحدث إذا كان تفاعل
    if (event && event.type === "message_reaction") {
      const { reaction, messageID } = event;

      // لو التفاعل ✨
      if (reaction === "✨") {
        try {
          return api.unsendMessage(messageID);
        } catch (e) {
          // لو في مشكلة في الصلاحيات أو الرسالة قديمة
          console.log("⌬ فشل الحذف ♢");
        }
      }
    }
  },

  onStart: async function ({ api, event }) {
    // دي رسالة تأكيد ليك إنت عشان تعرف إنو الكود "ركب" صح
    api.sendMessage("●───── ⌬ ─────●\n┇ ⦿ نـظـام الـحـذف الـسـريـع 💎\n┇ ⦿ تـفـاعـل بـ ✨ لـلـحـذف\n●───── ⌬ ─────●", event.threadID);
  }
};
