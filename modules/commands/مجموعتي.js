const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const request = require('request');

module.exports = {
  config: {
    name: "مجموعتي",
    version: "1.0.0",
    author: "SINKO",
    countDown: 5,
    role: "member",
    description: "عرض معلومات المجموعة بزخرفة ملكية",
    category: "group",
    prefix: true
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID } = event;
    const cachePath = path.join(__dirname, 'cache', `group_${threadID}.png`);

    try {
      let threadInfo = await api.getThreadInfo(threadID);
      const { participantIDs, adminIDs, messageCount, emoji, threadName, approvalMode, imageSrc } = threadInfo;

      let maleCount = 0;
      let femaleCount = 0;
      let adminsList = '';

      // حساب عدد الذكور والإناث
      for (let z in threadInfo.userInfo) {
        let gender = threadInfo.userInfo[z].gender;
        if (gender == "MALE") maleCount++;
        else if (gender == "FEMALE") femaleCount++;
      }

      // جلب أسماء المسؤولين
      for (let admin of adminIDs) {
        const info = await api.getUserInfo(admin.id);
        adminsList += `  🦋 ↜ ${info[admin.id].name}\n`;
      }

      const approvalStatus = approvalMode ? '❌ مـعـطـلـة' : '✅ مـفـعـلـة';

      const msgBody = `╭───〔 𓆩 📄 مـعـلـومـات الـمـجـمـوعـة 𓆪 〕───╮\n` +
                      `┃\n` +
                      `┃ ꕥ الاسـم: ${threadName || 'لا يوجد'}\n` +
                      `┃ ꕥ الآيـدي: ${threadID}\n` +
                      `┃ ꕥ الإيـمـوجـي: ${emoji || 'لا يوجد'}\n` +
                      `┃ ꕥ الـموافـقـة: ${approvalStatus}\n` +
                      `┃\n` +
                      `┣──〔 👥 الأعـضـاء 〕──┨\n` +
                      `┃\n` +
                      `┃ ꕥ الـعـدد الكـلـي: ${participantIDs.length}\n` +
                      `┃ ꕥ الـذكـور: ${femaleCount} 👨\n` + // التبديل حصل في كودك الأصلي فعدلته ليك
                      `┃ ꕥ الإنـاث: ${maleCount} 👩\n` +
                      `┃ ꕥ الـرسـائـل: ${messageCount}\n` +
                      `┃\n` +
                      `┣──〔 👮 الـمـسـؤولـيـن 〕──┨\n` +
                      `┃\n` +
                      `${adminsList}` +
                      `┃\n` +
                      `╰──────────────────╯\n` +
                      `؛-؛`;

      // التعامل مع صورة المجموعة
      if (imageSrc) {
        const callback = () => api.sendMessage({
          body: msgBody,
          attachment: fs.createReadStream(cachePath)
        }, threadID, () => {
          if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        }, messageID);

        return request(encodeURI(imageSrc))
          .pipe(fs.createWriteStream(cachePath))
          .on('close', callback);
      } else {
        return api.sendMessage(msgBody, threadID, messageID);
      }

    } catch (error) {
      console.error(error);
      api.sendMessage("❌ | يا ملك، الشبكة كعبة وما قدرت أجيب بيانات المجموعة.", threadID, messageID);
    }
  }
};
