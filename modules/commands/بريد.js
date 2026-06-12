const axios = require('axios');
const API_URL = 'https://api.mail.tm';

if (!global.tempMailSessions) global.tempMailSessions = new Map();

module.exports = {
  config: {
    name: "بريد",
    aliases: ["ايميل", "tempmail"],
    version: "1.5.0",
    author: "& SINKO",
    countDown: 5,
    prefix: true,
    category: "ai",
    description: "إنشاء بريد مؤقت مع مراقبة تلقائية للرسائل وزخرفة ملكية",
    adminOnly: false
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    
    if (global.tempMailSessions.has(threadID)) {
      return api.sendMessage("⚠️ لديك جلسة بريد مؤقت نشطة بالفعل في هذه المحادثة.\nاكتب كلمة ( إيقاف ) لإلغائها وإنشاء بريد جديد.", threadID, messageID);
    }

    try {
      // جلب الدومين المتاح
      const domainsRes = await axios.get(`${API_URL}/domains`, { timeout: 5000 });
      const domain = domainsRes.data['hydra:member'][0].domain;

      // توليد بريد عشوائي وكلمة مرور
      const randomUser = `aplin_${Math.random().toString(36).substring(5, 10)}`;
      const email = `${randomUser}@${domain}`;
      const password = `AplinMail${Math.floor(1000 + Math.random() * 9000)}!`;

      // إنشاء الحساب وجلب التوكن
      await axios.post(`${API_URL}/accounts`, { address: email, password: password });
      const tokenRes = await axios.post(`${API_URL}/token`, { address: email, password: password });
      const token = tokenRes.data.token;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // رسالة النجاح المزخرفة
      const initBody = `> ˼🌌˹↜  Aplin Mail  ↶
╮──────────────⟢ـ
┆˼📧˹┊ الـبـريـد ↜｢ ${email} ｣
┆˼🔑˹┊ الـبـاسـورد ↜｢ ${password} ｣
╯──────────────⟢ـ
> ⏳ جاري مراقبة الرسائل تلقائياً...
> 🛑 لإيقاف المراقبة اكتب: ( إيقاف )`;

      api.sendMessage(initBody, threadID, messageID);

      const seenMessages = new Set();

      // بدء مراقبة الرسائل كل 5 ثوانٍ
      const intervalId = setInterval(async () => {
        try {
          const messagesRes = await axios.get(`${API_URL}/messages`, config);
          const messages = messagesRes.data['hydra:member'];

          for (const msg of messages) {
            if (!seenMessages.has(msg.id)) {
              seenMessages.add(msg.id);

              // جلب تفاصيل الرسالة كاملة
              const detailRes = await axios.get(`${API_URL}/messages/${msg.id}`, config);
              const data = detailRes.data;

              const mailBody = `> ˼📩˹↜ رسـالـة جـديـدة ↶
╮──────────────⟢ـ
┆˼👤˹┊ مـن ↜｢ ${data.from.name || ''} <${data.from.address}> ｣
┆˼📌˹┊ الـمـوضـوع ↜｢ ${data.subject || '(بدون عنوان)'} ｣
╯──────────────⟢ـ
> ˼📄˹ المحتوى:
${data.text || data.intro || '(محتوى فارغ)'}
────────────────`;

              await api.sendMessage(mailBody, threadID);
            }
          }
        } catch (err) {
          console.error(`[Aplin Mail] خطأ في المراقبة للروم ${threadID}:`, err.message);
        }
      }, 5000);

      // حفظ الجلسة
      global.tempMailSessions.set(threadID, {
        email,
        password,
        intervalId,
        seenMessages
      });

      // إيقاف تلقائي بعد 10 دقائق لحماية سيرفر راندر
      setTimeout(() => {
        stopSession(threadID, api, '⏰ انتهى وقت صلاحية البريد (10 دقائق).');
      }, 10 * 60 * 1000);

    } catch (error) {
      console.error(error);
      api.sendMessage("❌ حدث خطأ أثناء إنشاء البريد المؤقت، جرب تاني يا ملك.", threadID, messageID);
    }
  },

  // دالة الاستماع للشات لالتقاط كلمة "إيقاف"
  onChat: async function ({ api, event }) {
    const { threadID, body } = event;
    if (!body) return;

    const stopCmds = ["إيقاف", "ايقاف", "stop", "حذف"];
    if (stopCmds.includes(body.trim().toLowerCase())) {
      if (global.tempMailSessions.has(threadID)) {
        stopSession(threadID, api, '🛑 تم إيقاف جلسة البريد بناءً على طلبك.');
      }
    }
  }
};

// دالة إلغاء الجلسة ومسح الـ Interval
function stopSession(threadID, api, reason = null) {
  const session = global.tempMailSessions.get(threadID);
  if (session) {
    clearInterval(session.intervalId);
    global.tempMailSessions.delete(threadID);
    if (reason) {
      const stopBody = `> ˼🌌˹↜  Aplin Mail  ↶\n${reason}`;
      api.sendMessage(stopBody, threadID);
    }
  }
}
