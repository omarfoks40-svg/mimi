const axios = require('axios');

module.exports = {
  config: {
    name: 'بانكاي',
    version: '2.0',
    author: 'SINKO & Hridoy',
    countDown: 5,
    prefix: true,
    groupAdminOnly: true,
    description: 'البحث عن الأعضاء بالاسم وطردهم بالرد على الرقم مع تفاعل ساخر.',
    category: 'group',
    guide: {
      ar: '{pn} اسم العضو المراد البحث عنه | @منشن | بالرد على رسالة'
    },
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const botID = api.getCurrentUserID();

    api.setMessageReaction("🦆", messageID, (err) => {}, true);

    // 1️⃣ لو المستخدم منشن أو رد على رسالة أو كتب UID مباشر (المنطق القديم شغال طيارة)
    let targetID = null;
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } else if (event.messageReply) {
      targetID = event.messageReply.senderID;
    } else if (args[0] && !isNaN(args[0]) && args[0].length > 10) {
      targetID = args[0];
    }

    // إذا تم تحديد الهدف بالطريقة المباشرة، نفذ الطرد فوراً
    if (targetID) {
      if (targetID == botID) return api.sendMessage('قاعده في بيتكم؟ ', threadID, messageID);
      return executeKick(api, threadID, targetID, messageID);
    }

    // 2️⃣ منطق البحث المطور بالاسم (بانكاي لافي)
    const searchQuery = args.join(" ").trim().toLowerCase();
    if (!searchQuery) {
      return api.sendMessage('هات رد، منشن، أو اكتب اسم الشخص للبحث عنه.', threadID, messageID);
    }

    try {
      // جلب معلومات الجروب والأعضاء
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = threadInfo.participantIDs;
      const userInfo = await api.getUserInfo(participantIDs);

      const matchedUsers = [];

      // دالة لتنظيف النص من الزخارف لتسهيل المطابقة
      const cleanText = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      for (const id in userInfo) {
        if (userInfo.hasOwnProperty(id)) {
          const name = userInfo[id].name || "";
          const cleanedName = cleanText(name);
          const cleanedQuery = cleanText(searchQuery);

          // مطابقة بالاسم العربي أو الإنجليزي أو المزخرف
          if (cleanedName.includes(cleanedQuery)) {
            matchedUsers.push({ id, name });
          }
        }
      }

      // لو لم يتم العثور على أي شخص
      if (matchedUsers.length === 0) {
        return api.sendMessage(`❌ لم يتم العثور على عضو باسم: "${args.join(" ")}"`, threadID, messageID);
      }

      // أخذ أول 5 أشخاص فقط
      const topMatches = matchedUsers.slice(0, 5);

      let msg = `╮──────────────⟢ـ\n┆ 🔍 نـتـائـج الـبـحـث عـن: ｢ ${args.join(" ")} ｣\n╯──────────────⟢ـ\n`;
      topMatches.forEach((user, index) => {
        msg += ` ❆˹${index + 1}˼┊ ${user.name}\n`;
      });
      msg += `╮──────────────⟢ـ\n┆ 💡 رد بـرقـم الـشـخـص لـطـرده فـوراً\n╯──────────────⟢ـ`;

      return api.sendMessage(msg, threadID, (err, info) => {
        if (!err) {
          if (!global.client.handleReply) global.client.handleReply = [];
          global.client.handleReply.push({
            name: "بانكاي",
            messageID: info.messageID,
            author: senderID,
            matches: topMatches
          });
        }
      }, messageID);

    } catch (err) {
      console.error(err);
      return api.sendMessage('❌ حدث خطأ أثناء جلب أعضاء المجموعة.', threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, body, senderID } = event;
    const botID = api.getCurrentUserID();

    if (handleReply.author && senderID !== handleReply.author) return;
    if (handleReply.name !== "بانكاي") return;

    const choice = parseInt(body.trim());
    if (isNaN(choice) || choice < 1 || choice > handleReply.matches.length) return;

    const selectedUser = handleReply.matches[choice - 1];
    if (!selectedUser) return;

    if (selectedUser.id == botID) {
      return api.sendMessage('قاعده في بيتكم؟ ', threadID, messageID);
    }

    try { api.unsendMessage(handleReply.messageID); } catch (e) {}

    return executeKick(api, threadID, selectedUser.id, messageID);
  }
};

// دالة الطرد المشتركة وتحميل الميديا
async function executeKick(api, threadID, targetID, messageID) {
  try {
    const imageUrl = 'https://i.ibb.co/wZDHSMvM/received-897009799489398.jpg';
    const img = await axios.get(imageUrl, { responseType: 'stream' });

    await api.sendMessage({
      body: '🌚!\n كان رقاصة ...',
      attachment: img.data
    }, threadID);

    api.removeUserFromGroup(targetID, threadID, (err) => {
      if (err) {
        console.error(err);
        return api.sendMessage('❌ فشل الطرد، تأكد أن البوت مشرف ولديه الصلاحيات.', threadID);
      }
      api.sendMessage(`هنفتقدو 🦆.`, threadID);
    });

  } catch (err) {
    console.error(err);
    api.sendMessage('❌ حدث خطأ غير متوقع أثناء تنفيذ الطرد.', threadID, messageID);
  }
}
