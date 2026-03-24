module.exports = {
  config: {
    name: "حذف",
    version: "1.0.5",
    author: "Cenko",
    countDown: 0,
    role: 0,
    category: "system"
  },

  handleReaction: async function ({ api, event, Users }) {
    const { reaction, messageID, userID } = event;

    // التحقق من الإيموجي
    if (reaction === "✨") {
      // إرسال سجل للكونسول للتأكد أن البوت استلم التفاعل
      console.log(`${userID}`);

      return api.unsendMessage(messageID, (err) => {
        if (err) {
            console.error("❌ فشل الحذف: قد لا يملك البوت صلاحية أو الرسالة قديمة جداً.");
        } else {
            console.log("✅ تم حذف الرسالة بنجاح.");
        }
      });
    }
  }
};
