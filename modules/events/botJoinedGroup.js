const axios = require('axios');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: 'botJoinedGroup',
    version: '2.6',
    author: 'Hridoy / Minimal Style',
    description: 'ترحيب انضمام البوت مع صورة وكنية احترافية.',
    eventType: ['log:subscribe'],
  },

  onStart: async ({ api, event }) => {
    try {
      const botID = api.getCurrentUserID();
      const addedParticipants = event.logMessageData?.addedParticipants || [];

      // التأكد أن البوت هو العضو الجديد
      if (!addedParticipants.some(user => user.userFbId === botID)) return;

      const botName = global.client.config.botName || ' 𝕒𝕡𝕝𝕚𝕟';
      const prefix = global.client.config.prefix || '';

      // تغيير الكنية (تعديل الزخرفة فقط للأقواس المجهرية والعمود المقطع والوردة خارجاً)
      const shortNickname = `✅┇  ${prefix}  𝙰𝚙𝚕𝚒𝚗  `;
      api.changeNickname(shortNickname, event.threadID, botID);

      // زخرفة الترحيب (تطبيق النمط الملكي الجديد: الزهور خارج الأعمدة)
      const welcomeMsg = `✾ ┇ ⸻⸻⸻⸻⸻
✾ ┇    ✧ إبـلـيـن  ✧
✾ ┇ ⸻⸻⸻⸻⸻
✾ ┇  ⊹ الـرّمـز : [ ${prefix} ]
✾ ┇  ⊹ الـدّليل : [ ${prefix}help ]
✾ ┇  ⊹ الـمـطـور : سـيـنـكـو 17Y
✾ ┇ ⸻⸻⸻⸻⸻
✾ ┇      ˗ˏˋ S I N K O   ´ˎ˗`;

      const imgPath = __dirname + "/cache/bot_join.jpg";
      const imgUrl = "https://i.ibb.co/9kJnP9F6/1776644012884.png";

      // تحميل الصورة وإرسالها (نفس الدالة الأصلية بدون تغيير)
      const response = await axios.get(imgUrl, { responseType: "arraybuffer" });
      await fs.outputFile(imgPath, Buffer.from(response.data, "utf-8"));

      api.sendMessage({
        body: welcomeMsg,
        attachment: fs.createReadStream(imgPath)
      }, event.threadID, () => {
        // حذف الصورة بعد الإرسال للحفاظ على مساحة التخزين
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      });

    } catch (err) {
      console.error('[ERROR]:', err);
    }
  },
};
