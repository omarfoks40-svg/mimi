const axios = require('axios');

module.exports = {
  config: {
    name: "ارسلي",
    aliases: ["noti", "نشر", "بث"],
    version: "2.0",
    author: "SINKO",
    countDown: 10,
    role: 2, // للمطورين فقط
    category: "المـطور",
    guide: "{pn} <الرسالة>"
  },

  onStart: async function ({ api, event, args, threadsData }) {
    const { threadID, messageID, senderID, messageReply, attachments } = event;

    // 1. التأكد من وجود نص
    if (!args[0]) return api.sendMessage("⚠️ | يا ملك، اكتب الرسالة الداير ترسلها للمجموعات أولاً! ؛-؛", threadID, messageID);

    // 2. تجميع المرفقات (صور، فيديو، بصمة) لو وجدت في الرسالة أو الرد
    const allAttachments = [...attachments, ...(messageReply?.attachments || [])];
    const attachmentStreams = [];
    
    try {
      for (let atch of allAttachments) {
        const res = await axios.get(atch.url, { responseType: "stream" });
        attachmentStreams.push(res.data);
      }
    } catch (e) {
      console.error("خطأ في جلب المرفقات:", e);
    }

    // 3. جلب كل المجموعات التي يتواجد بها البوت
    const allThreads = await api.getThreadList(500, null, ["INBOX"]);
    const groupThreads = allThreads.filter(t => t.isGroup && t.threadID !== threadID);

    api.sendMessage(`⏳ | جارٍ بدء البث إلى ${groupThreads.length} مجموعة.. أرح! ؛-؛`, threadID, messageID);

    let successCount = 0;
    let failCount = 0;

    const notificationBody = `📢 | إشـعار مـن الـمطور \n────────────────\n${args.join(" ")}\n────────────────\n⚠️ الرد على هذه الرسالة لا يصل للمطور. ؛-؛`;

    // 4. عملية الإرسال المتتابع
    for (const group of groupThreads) {
      try {
        await api.sendMessage({
          body: notificationBody,
          attachment: attachmentStreams
        }, group.threadID);
        successCount++;
        // تأخير بسيط 300 ملي ثانية عشان نتجنب الحظر (Spam)
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        failCount++;
        console.error(`فشل الإرسال للمجموعة ${group.threadID}:`, error);
      }
    }

    // 5. النتيجة النهائية
    const finalMsg = `✅ | تـم تـنفيذ الـعملية بـنجاح:\n\n❐ تـم الإرسـال إلـى: ${successCount} مجموعة\n❐ فـشل الإرسـال إلـى: ${failCount} مجموعة\n\nتـم بـواسطة مـوانا الشفتة ؛-؛`;
    
    return api.sendMessage(finalMsg, threadID, messageID);
  }
};
