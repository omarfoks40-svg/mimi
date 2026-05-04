const axios = require('axios');

module.exports = {
  config: {
    name: "شعار",
    aliases: ["logo", "broadcast-dev"],
    version: "2.5",
    author: "SINKO + Fixed",
    countDown: 10,
    role: 2, // للمطورين فقط
    category: "المـطور",
    guide: "{pn} <الرسالة>"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, attachments, messageReply, senderID } = event;

    // 🔒 التحقق من هوية المطور
    const ADMINS = ["61588108307572"]; // الآيدي حقك هنا
    if (!ADMINS.includes(senderID)) {
      return api.sendMessage(
        "🚫 | معليش يا زول، الأمر دا خاص بالمطور 'سينكو' بس. ؛-؛",
        threadID,
        messageID
      );
    }

    if (!args[0]) {
      return api.sendMessage(
        "⚠️ | يا مطور، وين الرسالة الداير ترسلها؟",
        threadID,
        messageID
      );
    }

    const allAttachments = [...attachments, ...(messageReply?.attachments || [])];
    const attachmentStreams = [];

    // تحميل المرفقات (صور + فيديو)
    for (let atch of allAttachments) {
      try {
        const res = await axios.get(atch.url, {
          responseType: "stream",
          timeout: 20000
        });
        attachmentStreams.push(res.data);
      } catch (err) {
        console.log("فشل تحميل مرفق:", err.message);
      }
    }

    const allThreads = await api.getThreadList(500, null, ["INBOX"]);
    const groupThreads = allThreads.filter(t => t.isGroup && t.threadID !== threadID);

    api.sendMessage(
      `⏳ | جاري إرسال الشعار إلى ${groupThreads.length} مجموعة...`,
      threadID,
      messageID
    );

    let success = 0;
    let fail = 0;

    const msg = `📢 | شـعـار مـن الـمـطـور\n────────────────\n${args.join(" ")}\n────────────────\n⚠️ إشعار تلقائي`;

    for (const group of groupThreads) {
      try {
        await api.sendMessage(
          {
            body: msg,
            attachment: attachmentStreams.length ? attachmentStreams : undefined
          },
          group.threadID
        );
        success++;
        await new Promise(r => setTimeout(r, 600)); // تأخير بسيط للحماية من الحظر
      } catch (err) {
        fail++;
        console.log("فشل الإرسال:", group.threadID, err.message);
      }
    }

    return api.sendMessage(
      `✅ | تم انتهاء الإرسال بنجاح:\n\n✔️ نجاح: ${success}\n❌ فشل: ${fail}`,
      threadID,
      messageID
    );
  }
};
