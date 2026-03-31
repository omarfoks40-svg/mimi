const os = require('os');
const { performance } = require('perf_hooks');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');

module.exports = {
  config: {
    name: 'ابتايم',
    aliases: ['uptime', 'up', 'stats'],
    version: '3.1.0',
    author: 'SINKO',
    description: 'عرض حالة النظام مع التعديل التلقائي (للمطور)',
    countDown: 5,
    prefix: true,
    category: 'utility',
    adminOnly: true 
  },

  onStart: async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;
    
    let config;
    try {
      config = fs.readJsonSync(configPath);
    } catch (e) {
      config = {};
    }
    const adminList = config.adminUIDs || [];

    if (!adminList.includes(senderID)) {
      return api.sendMessage("⚠️ هذا الأمر مخصص لـ سـيـنـكـو فقط.", threadID, messageID);
    }

    api.setMessageReaction("❄️", messageID, (err) => {}, true);

    // إرسال رسالة الانتظار أولاً (الميزة اللي رجعناها)
    const waitingMsg = await api.sendMessage(
      '> ˼⌛˹↜ جـاري جـلـب الـبـيـانـات ↶\nـ\n❊\n',
      threadID
    );
    const processingID = waitingMsg.messageID;

    try {
      const uptimeSeconds = process.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);

      const timeNow = moment.tz("Africa/Khartoum");
      const fullDate = timeNow.format("DD / MM / YYYY");
      const dayName = timeNow.locale('ar').format("dddd");
      const timeStr = timeNow.format("hh:mm:ss A");

      const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const ping = Math.floor(performance.now() % 1000);
      
      let threadCount = 'غير متوفر';
      try {
        const threadList = await api.getThreadList(100, null, ["INBOX"]);
        threadCount = threadList.length;
      } catch (e) {}

      const message = `> ˼⏰˹↜ حـالـة الـنـظـام ↶
╮──────────────⟢ـ
┆˼🧭˹┊ الـتـاريـخ ↜｢ ${fullDate} ｣
┆˼⚕️˹┊ الـيـوم ↜｢ ${dayName} ｣
┆˼🕕˹┊ الـوقـت ↜｢ ${timeStr} ｣
┆˼🚀˹┊ الـبـنـغ ↜｢ ${ping}ms ｣
╯──────────────⟢ـ
> ˼🌌˹↜ إحـصـائـيـات ابلين ↶
╮──────────────⟢ـ
┆˼⏳˹┊ الـتـشـغـيل ↜｢ ${days}يوم و ${hours}س و ${minutes}د ｣
┆˼👥˹┊ الـمـجـموعات ↜｢ ${threadCount} ｣
┆˼🧠˹┊ الـرام الـمستخدم ↜｢ ${ramUsage}MB ｣
┆˼📂˹┊ إجـمـالي الـرام ↜｢ ${totalRam}GB ｣
╯──────────────⟢ـ
> ˼🖥️˹↜ مـعـلـومـات الـسـيـرفـر ↶
╮──────────────⟢ـ
┆˼❄️˹┊ الـنـظـام ↜｢ ${os.type()} ｣
┆˼𖣔˹┊ الـمـعـالـج ↜｢ ${os.cpus()[0].model.split(' ')[0]} ｣
┆˼✅˹┊ الـحـالـة ↜｢ مـتـصل بنجاح ｣
╯──────────────⟢ـ
> ˼👤˹↜ الـمـطـوࢪ : SINKO ↶`;

      // التعديل النهائي للرسالة (Edit Message)
      setTimeout(() => {
        api.editMessage(message, processingID, () => {
          api.setMessageReaction("✅", messageID, () => {}, true);
        });
      }, 1000);

    } catch (error) {
      console.error('Uptime error:', error);
      api.editMessage('❌ فشل استخراج بيانات راندر يا ملك.', processingID);
    }
  },
};
