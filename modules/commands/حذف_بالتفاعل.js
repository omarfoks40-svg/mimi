module.exports = {
  config: {
    name: "حذف_تلقائي",
    version: "2.0.0",
    author: "Cenko",
    countDown: 0,
    role: 0,
    category: "system"
  },

  handleEvent: async function ({ api, event }) {
    // مراقبة أحداث التفاعل (reaction)
    if (event.type === "message_reaction") {
      const { reaction, messageID, userID } = event;

      // إذا كان التفاعل هو ✨
      if (reaction === "✨") {
        return api.unsendMessage(messageID, (err) => {
          if (err) {
            console.log("⚠️ فشل الحذف: قد تكون الرسالة قديمة أو البوت ليس أدمن");
          }
        });
      }
    }
  },

  onStart: async function ({ api, event }) {
    // فقط للتأكد أن الكود تم تحميله
    console.log("✅ نظام الحذف عبر ✨ شغال الآن!");
  }
};
