const axios = require('axios');
const fs = require('fs-extra');
const appState = require('../../appstate.json');

const cookie = appState.map(item => `${item.key}=${item.value}`).join(';');
const headers = {
  'Host': 'mbasic.facebook.com',
  'user-agent': 'Mozilla/5.0 (Linux; Android 11; M2101K7BG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-encoding': 'gzip, deflate',
  'accept-language': 'ar,en;q=0.9',
  'Cookie': cookie
};

function getGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const MENU_TEXT = (botID, admins) =>
`> ˼⚙️˹↜ لـوحـة تـحـكـم إبـلـيـن ↶
╮──────────────⟢ـ
┆˼01˹┊ تـعـديـل الـبـايـو 
┆˼02˹┊ تـعـديـل الـلـقـب 
┆˼03˹┊ الـرسـائـل الـمـعـلّـقـة 
┆˼04˹┊ الـرسـائـل غـيـر الـمـقـروءة 
┆˼05˹┊ رسـائـل الـسـبـام 
┆˼06˹┊ تـغـيـيـر صـورة الـبـوت 
┆˼07˹┊ درع الـصـورة (on/off) 
┆˼08˹┊ حـظـر مـسـتـخـدمـيـن 
┆˼09˹┊ رفـع الـحـظـر 
┆˼10˹┊ إنـشـاء مـنـشـور 
┆˼11˹┊ حـذف مـنـشـور 
┆˼12˹┊ تـعـلـيـق (شـخـصـي) 
┆˼13˹┊ تـعـلـيـق (مـجـمـوعـة) 
┆˼14˹┊ الـتـفـاعـل مـع مـنـشـور 
┆˼15˹┊ إضـافـة أصـدقـاء 
┆˼16˹┊ قـبـول الـطـلـبـات 
┆˼17˹┊ رفـض الـطـلـبـات 
┆˼18˹┊ حـذف أصـدقـاء 
┆˼19˹┊ إرسـال رسـالـة ID 
┆˼20˹┊ تـسـجـيـل الـخـروج 
╯──────────────⟢ـ
> ˼🤖˹↜ مـعـلـومـات الـبـوت ↶
╮──────────────⟢ـ
┆˼🧭˹┊ الـإيـدي ↜｢ ${botID} ｣
┆˼👑˹┊ الـأدمن ↜｢ ${admins[0] || 'SINKO'} ｣
╯──────────────⟢ـ
┊˼📖˹┊ رُد بـالـرقـم الـمـطـلـوب
┊˼🪸˹┊ SINKO | ✅`;

module.exports = {
  config: {
    name: 'confng',
    aliases: ['control', 'botset'],
    version: '2.5.5',
    author: 'SINKO',
    countDown: 5,
    role: 1,
    category: 'admin'
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;
    const botID = api.getCurrentUserID();
    const admins = global.client.config.adminUIDs || [];

    api.sendMessage(MENU_TEXT(botID, admins), threadID, (err, info) => {
      if (!err && info) {
        global.client.handleReply = global.client.handleReply || [];
        global.client.handleReply.push({ name: 'تحكم', messageID: info.messageID, author: senderID, type: 'menu' });
        global.client.handleReaction = global.client.handleReaction || [];
        global.client.handleReaction.push({ name: 'تحكم', messageID: info.messageID, author: senderID, type: 'quick_logout' });
      }
    }, messageID);
  },

  onReaction: async function ({ api, handler, threadID, userID, reaction, Reaction }) {
    if (userID !== handler.author) return;
    if (handler.type === 'confirm_logout') {
      if (reaction === '✅') {
        api.unsendMessage(handler.messageID);
        return api.logout((err) => {
          if (err) api.sendMessage('『 ❌ 』فشل تسجيل الخروج.', threadID);
          else api.sendMessage('『 👋 』تم تسجيل الخروج بنجاح.', threadID);
        });
      }
      if (reaction === '❌') {
        api.unsendMessage(handler.messageID);
        return api.sendMessage('『 ↩️ 』تم إلغاء العملية.', threadID);
      }
    }
    if (handler.type === 'quick_logout' && reaction === '🚪') {
      api.sendMessage(`> ˼⚠️˹↜ تـأكـيـد الـخـروج ↶\n╮──────────────⟢ـ\n┆ هل أنت متأكد من تسجيل خروج البوت؟\n┆ تفاعل بـ ✅ للتأكيد أو ❌ للإلغاء\n╯──────────────⟢ـ`, threadID, (err, info) => {
        if (!err && info) Reaction.push({ name: 'تحكم', messageID: info.messageID, author: userID, type: 'confirm_logout' });
      });
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID } = event;
    const { type, author } = handleReply;
    if (author !== senderID) return;

    const botID = api.getCurrentUserID();
    const body = (event.body || '').trim();
    const args = body.split(/\s+/);
    const reply = (msg, callback) => api.sendMessage(msg, threadID, callback, messageID);
    const pushReply = (info, nextType, extra = {}) => {
      global.client.handleReply.push({ name: 'تحكم', messageID: info.messageID, author: senderID, type: nextType, ...extra });
    };

    if (type === 'menu') {
      const n = args[0];
      if (['1','01'].includes(n)) reply('『 ✏️ 』أرسل البايو الجديد، أو "حذف":', (err, info) => pushReply(info, 'changeBio'));
      else if (['2','02'].includes(n)) reply('『 ✏️ 』أرسل اللقب الجديد، أو "حذف":', (err, info) => pushReply(info, 'changeNickname'));
      else if (['3','03'].includes(n)) {
        const list = await api.getThreadList(500, null, ['PENDING']).catch(() => []);
        reply(`> ˼📬˹↜ الـرسـائـل الـمـعـلّـقـة ↶\n╮──────────────⟢ـ\n${list.length ? list.map(t => `┆ ${t.name} | ${t.threadID}`).join('\n') : 'لا توجد رسائل.'}\n╯──────────────⟢ـ`);
      }
      else if (['4','04'].includes(n)) {
        const list = await api.getThreadList(500, null, ['unread']).catch(() => []);
        reply(`> ˼📭˹↜ غـيـر الـمـقـروءة ↶\n╮──────────────⟢ـ\n${list.length ? list.map(t => `┆ ${t.name} | ${t.threadID}`).join('\n') : 'لا توجد رسائل.'}\n╯──────────────⟢ـ`);
      }
      else if (['5','05'].includes(n)) {
        const list = await api.getThreadList(500, null, ['OTHER']).catch(() => []);
        reply(`> ˼🚫˹↜ رسـائـل الـسـبـام ↶\n╮──────────────⟢ـ\n${list.length ? list.map(t => `┆ ${t.name} | ${t.threadID}`).join('\n') : 'لا توجد رسائل.'}\n╯──────────────⟢ـ`);
      }
      else if (['6','06'].includes(n)) reply('『 🖼️ 』أرسل رابط صورة أو ارفع صورة:', (err, info) => pushReply(info, 'changeAvatar'));
      else if (['7','07'].includes(n)) {
        const shield = args[1]?.toLowerCase() === 'on';
        const form = { av: botID, variables: JSON.stringify({ '0': { is_shielded: shield, actor_id: botID, client_mutation_id: '1' } }), doc_id: '100017985245260' };
        api.httpPost('https://www.facebook.com/api/graphql/', form, (err) => reply(err ? '『 ❌ 』فشل الدرع.' : `『 🛡️ 』الدرع: ${shield ? '✅ مُفعّل' : '❌ مُعطّل'}`));
      }
      else if (['8','08'].includes(n)) reply('『 🚫 』أرسل IDs للحظر:', (err, info) => pushReply(info, 'blockUser'));
      else if (['9','09'].includes(n)) reply('『 ✅ 』أرسل IDs لفك الحظر:', (err, info) => pushReply(info, 'unblockUser'));
      else if (['10'].includes(n)) reply('『 📝 』أرسل محتوى المنشور:', (err, info) => pushReply(info, 'createPost'));
      else if (['11'].includes(n)) reply('『 🗑️ 』أرسل IDs المنشورات للحذف:', (err, info) => pushReply(info, 'deletePost'));
      else if (['12','13'].includes(n)) reply(`『 💬 』أرسل ID المنشور (${n === '13' ? 'مجموعة' : 'شخصي'}):`, (err, info) => pushReply(info, 'choiceIdCommentPost', { isGroup: n === '13' }));
      else if (['14'].includes(n)) reply('『 😍 』أرسل IDs المنشورات للتفاعل:', (err, info) => pushReply(info, 'choiceIdReactionPost'));
      else if (['15'].includes(n)) reply('『 ➕ 』أرسل IDs لطلبات الصداقة:', (err, info) => pushReply(info, 'addFriends'));
      else if (['16'].includes(n)) reply('『 ✅ 』أرسل IDs لقبول الطلبات:', (err, info) => pushReply(info, 'acceptFriendRequest'));
      else if (['17'].includes(n)) reply('『 ❌ 』أرسل IDs لرفض الطلبات:', (err, info) => pushReply(info, 'deleteFriendRequest'));
      else if (['18'].includes(n)) reply('『 🗑️ 』أرسل IDs لحذف الأصدقاء:', (err, info) => pushReply(info, 'unFriends'));
      else if (['19'].includes(n)) reply('『 📨 』أرسل IDs لإرسال رسالة:', (err, info) => pushReply(info, 'choiceIdSendMessage'));
      else if (['20'].includes(n)) {
        reply(`> ˼⚠️˹↜ تـأكـيـد الـخـروج ↶\n╮──────────────⟢ـ\n┆ هل أنت متأكد؟ ✅ للتأكيد | ❌ للإلغاء\n╯──────────────⟢ـ`, (err, info) => {
          global.client.handleReaction.push({ name: 'تحكم', messageID: info.messageID, author: senderID, type: 'confirm_logout' });
        });
      }
    }

    else if (type === 'changeBio') {
      const bio = body === 'حذف' ? '' : body;
      api.changeBio(bio, false, (err) => reply(err ? '『 ❌ 』فشل.' : '『 ✅ 』تم تحديث البايو.'));
    }

    else if (type === 'changeNickname') {
      const nickname = body === 'حذف' ? '' : body;
      try {
        let res = (await axios.get(`https://mbasic.facebook.com/${botID}/about`, { headers, params: { nocollections: '1' } })).data;
        const name_id = res.includes('nicknames/?entid=') ? res.split('nicknames/?entid=')[1].split('&amp;')[0] : null;
        const vars = { input: { name_text: nickname, name_type: 'NICKNAME', show_as_display_name: true, actor_id: botID, client_mutation_id: '1', name_id }, doc_id: '100017985245260' };
        api.httpPost('https://www.facebook.com/api/graphql/', { av: botID, variables: JSON.stringify(vars.input), doc_id: vars.doc_id }, (err) => reply(err ? '『 ❌ 』فشل.' : '『 ✅ 』تم تحديث اللقب.'));
      } catch (e) { reply('『 ❌ 』خطأ في الوصول للبيانات.'); }
    }

    else if (type === 'changeAvatar') {
      const imgUrl = event.attachments?.[0]?.url || (body.startsWith('http') ? body : null);
      if (!imgUrl) return reply('『 ⚠️ 』يجب إرسال صورة أو رابط!');
      try {
        const stream = (await axios.get(imgUrl, { responseType: 'stream' })).data;
        api.httpPostFormData(`https://www.facebook.com/profile/picture/upload/?profile_id=${botID}&photo_source=57&av=${botID}`, { file: stream }, (err, res) => {
          if (err) return reply('『 ❌ 』فشل الرفع.');
          const id = JSON.parse(res.split('for (;;);')[1]).payload.fbid;
          api.httpPost('https://www.facebook.com/api/graphql/', { av: botID, doc_id: '100037743553265', variables: JSON.stringify({ input: { existing_photo_id: id, profile_id: botID, actor_id: botID } }) }, () => reply('『 ✅ 』تم تغيير الصورة بنجاح.'));
        });
      } catch (e) { reply('『 ❌ 』حدث خطأ.'); }
    }

    else if (type === 'blockUser') {
      const uids = body.split(/\s+/);
      for (const uid of uids) await api.changeBlockedStatus(uid, true).catch(() => {});
      reply(`『 ✅ 』تم حظر ${uids.length} مستخدم.`);
    }

    else if (type === 'unblockUser') {
      const uids = body.split(/\s+/);
      for (const uid of uids) await api.changeBlockedStatus(uid, false).catch(() => {});
      reply(`『 ✅ 』تم فك حظر ${uids.length} مستخدم.`);
    }

    else if (type === 'createPost') {
      const form = { av: botID, doc_id: '100017985245260', variables: JSON.stringify({ input: { message: { text: body }, actor_id: botID, client_mutation_id: '1' } }) };
      api.httpPost('https://www.facebook.com/api/graphql/', form, (err) => reply(err ? '『 ❌ 』فشل النشر.' : '『 ✅ 』تم نشر المنشور بنجاح.'));
    }

    else if (type === 'choiceIdCommentPost') reply('『 💬 』أرسل نص التعليق الآن:', (err, info) => pushReply(info, 'commentPost', { ids: body.split(/\s+/), isGroup: handleReply.isGroup }));
    else if (type === 'commentPost') {
      for (const id of handleReply.ids) {
        const vars = { input: { message: { text: body }, feedback_id: Buffer.from(`feedback:${id}`).toString('base64'), actor_id: botID } };
        api.httpPost('https://www.facebook.com/api/graphql/', { av: botID, doc_id: '4744517358977326', variables: JSON.stringify(vars.input) });
      }
      reply('『 ✅ 』تم إرسال التعليقات.');
    }

    else if (type === 'choiceIdReactionPost') reply('『 😍 』أرسل التفاعل (like, love, haha, wow, sad, angry):', (err, info) => pushReply(info, 'reactionPost', { ids: body.split(/\s+/) }));
    else if (type === 'reactionPost') {
      for (const id of handleReply.ids) await api.setPostReaction(id, body.toLowerCase()).catch(() => {});
      reply('『 ✅ 』تم التفاعل مع المنشورات.');
    }

    else if (['addFriends','acceptFriendRequest','deleteFriendRequest','unFriends'].includes(type)) {
      const docs = { addFriends: '5090693304332268', acceptFriendRequest: '3147613905362928', deleteFriendRequest: '4108254489275063', unFriends: '4281078165250156' };
      const uids = body.split(/\s+/);
      for (const uid of uids) {
        const inputKey = type === 'addFriends' ? 'friend_requestee_ids' : type === 'unFriends' ? 'unfriended_user_id' : 'friend_requester_id';
        const vars = { input: { [inputKey]: type === 'addFriends' ? [uid] : uid, actor_id: botID } };
        api.httpPost('https://www.facebook.com/api/graphql/', { av: botID, doc_id: docs[type], variables: JSON.stringify(vars.input) });
      }
      reply('『 ✅ 』تمت معالجة الطلبات.');
    }

    else if (type === 'choiceIdSendMessage') reply('『 📨 』أرسل نص الرسالة المراد إرسالها:', (err, info) => pushReply(info, 'sendMessage', { ids: body.split(/\s+/) }));
    else if (type === 'sendMessage') {
      for (const uid of handleReply.ids) await api.sendMessage(body, uid).catch(() => {});
      reply(`『 ✅ 』تم الإرسال لـ ${handleReply.ids.length} مستخدم.`);
    }
  }
};
