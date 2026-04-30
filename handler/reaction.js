const { log } = require('../logger/logger');

async function handleReaction(event, api) {
  if (!event || event.type !== 'message_reaction') return;

  const reaction = event.reaction;
  const userID = event.userID;
  const messageID = event.messageID;
  const threadID = event.threadID;
  const senderID = event.senderID;

  let botID = null;
  try { botID = api.getCurrentUserID(); } catch (e) {}

  const config = (global.client && global.client.config) || {};
  const ownerUID = config.ownerUID;
  const adminUIDs = Array.isArray(config.adminUIDs) ? config.adminUIDs : [];
  const isAdmin = userID === ownerUID || adminUIDs.includes(userID);

  if (reaction === '✨' && botID && senderID === botID) {
    if (isAdmin) {
      api.unsendMessage(messageID, (err) => {
        if (err) log('error', `فشل حذف الرسالة: ${err.message || err}`);
      });
      return;
    }
  }

  if (!global.client.handleReaction || global.client.handleReaction.length === 0) return;

  const handler = global.client.handleReaction.find(h => h.messageID === messageID);
  if (!handler) return;

  const cmd = global.client.commands.get(handler.name);
  if (!cmd || typeof cmd.onReaction !== 'function') return;

  try {
    await cmd.onReaction({
      event,
      api,
      handler,
      threadID,
      messageID,
      userID,
      reaction,
      Reaction: global.client.handleReaction
    });
  } catch (err) {
    log('error', `خطأ في تفاعل الأمر ${handler.name}: ${err.message || err}`);
  }
}

module.exports = handleReaction;
