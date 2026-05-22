if (!global.xoGames)   global.xoGames   = {};
if (!global.xoLobbies) global.xoLobbies = {};

const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
const WIN_PATTERNS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function drawBoard(board) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    s += board[i] || NUMS[i];
    if ((i + 1) % 3 === 0) s += '\n';
  }
  return s.trim();
}

function checkWin(board, sym) {
  return WIN_PATTERNS.some(([a, b, c]) => board[a] === sym && board[b] === sym && board[c] === sym);
}

function botMove(board) {
  const try_ = (sym) => {
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = sym;
        if (checkWin(board, sym)) { board[i] = null; return i; }
        board[i] = null;
      }
    }
    return -1;
  };
  let m = try_('⭕'); if (m >= 0) return m;
  m = try_('❌');     if (m >= 0) return m;
  if (!board[4]) return 4;
  for (const c of [0, 2, 6, 8]) if (!board[c]) return c;
  return board.findIndex(c => !c);
}

function boardMsg(game) {
  const bd = drawBoard(game.board);
  const turnName = game.mode === 'bot'
    ? game.p1.name
    : (game.turn === game.p1.id ? game.p1.name : game.p2.name);
  const vs = game.mode === 'bot'
    ? `┇ 😼 ضد ابلين`
    : `┇ ❌ ${game.p1.name} vs ⭕ ${game.p2.name}`;

  return (
    `╭─⟪ 🎮 إكس-أو ⟫─╮\n` +
    `${vs}\n┇\n` +
    `${bd}\n┇\n` +
    `┇ 🎯 دور: ${turnName} — رد بـ 1-9\n` +
    `╰─────────────────────╯`
  );
}

function endMsg(board, text) {
  return (
    `╭─⟪ 🎮 انتهت اللعبة! ⟫─╮\n┇\n` +
    `${drawBoard(board)}\n┇\n┇ ${text}\n` +
    `╰─────────────────────╯`
  );
}

function addReply(gameKey, msgID) {
  global.client.handleReply = (global.client.handleReply || []).filter(r => r.gameKey !== gameKey);
  global.client.handleReply.push({ name: 'اكس_او', messageID: msgID, gameKey });
}

function removeReply(gameKey) {
  global.client.handleReply = (global.client.handleReply || []).filter(r => r.gameKey !== gameKey);
}

async function launchGame(api, threadID, p1ID, p2ID, mode, replyToMsgID) {
  let p1Name = 'لاعب 1', p2Name = mode === 'bot' ? '😼 ابلين' : 'لاعب 2';
  try {
    const info = await api.getUserInfo([p1ID, ...(mode !== 'bot' ? [p2ID] : [])]);
    p1Name = info[p1ID]?.name || p1Name;
    if (mode !== 'bot') p2Name = info[p2ID]?.name || p2Name;
  } catch (_) {}

  const gameKey = mode === 'bot' ? `bot_${p1ID}` : `pvp_${threadID}`;

  global.xoGames[gameKey] = {
    board: Array(9).fill(null),
    p1: { id: p1ID, name: p1Name },
    p2: { id: p2ID || 'BOT', name: p2Name },
    turn: p1ID,
    count: 0,
    mode,
    ended: false
  };

  const game = global.xoGames[gameKey];

  api.sendMessage(boardMsg(game), threadID, (err, info) => {
    if (!err && info) addReply(gameKey, info.messageID);
  }, replyToMsgID || undefined);
}

module.exports = {
  config: {
    name: 'اكس_او',
    aliases: ['xo', 'تيك_تاك', 'tic'],
    version: '2.0',
    author: 'سينكو',
    countDown: 5,
    prefix: true,
    category: 'العاب',
    description: '🎮 لعبة إكس-أو ضد ابلين أو ضد شخص — تفاعل أو استخدم الأمر',
    guide: { ar: '{pn}        — لوبي التفاعل (🦧 بوت | ❤️ لاعب)\n{pn} بوت    — العب فوراً ضد البوت\n{pn} @منشن  — العب ضد شخص محدد\n{pn} إغلاق  — إغلاق اللعبة الحالية' }
  },

  onStart: async function ({ api, event, args }) {
    const { senderID, threadID, messageID, mentions } = event;
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'إغلاق' || sub === 'close') {
      const botKey = `bot_${senderID}`;
      const pvpKey = `pvp_${threadID}`;
      let closed = false;
      if (global.xoGames[botKey]) { global.xoGames[botKey].ended = true; removeReply(botKey); delete global.xoGames[botKey]; closed = true; }
      if (global.xoGames[pvpKey]) { global.xoGames[pvpKey].ended = true; removeReply(pvpKey); delete global.xoGames[pvpKey]; closed = true; }
      return api.sendMessage(closed ? '🛑 تم إغلاق اللعبة.' : '⚠️ ما في لعبة نشطة.', threadID, messageID);
    }

    if (sub === 'بوت' || sub === 'bot') {
      const existing = global.xoGames[`bot_${senderID}`];
      if (existing && !existing.ended) return api.sendMessage('⚠️ عندك لعبة بوت نشطة بالفعل!', threadID, messageID);
      return launchGame(api, threadID, senderID, null, 'bot', messageID);
    }

    const mentionedID = Object.keys(mentions)[0];
    if (mentionedID) {
      if (mentionedID === senderID) return api.sendMessage('😂 ما تقدر تلعب ضد نفسك!', threadID, messageID);
      const existing = global.xoGames[`pvp_${threadID}`];
      if (existing && !existing.ended) return api.sendMessage('⚠️ في لعبة جماعية نشطة بالفعل!', threadID, messageID);
      return launchGame(api, threadID, senderID, mentionedID, 'pvp', messageID);
    }

    const lobbyMsg =
      `╭─⟪ 🎮 لعبة إكس-أو ⟫─╮\n` +
      `┇\n` +
      `┇ 🦧 تفاعل بـ 🦧 للعب ضد ابلين\n` +
      `┇ ❤️ تفاعل بـ ❤️ لتحدي لاعب آخر\n` +
      `┇\n` +
      `┇ أو: اكس_او بوت — مباشرة\n` +
      `┇    اكس_او @منشن — ضد شخص\n` +
      `╰─────────────────────╯`;

    api.sendMessage(lobbyMsg, threadID, (err, info) => {
      if (!err && info) {
        global.client.handleReaction = global.client.handleReaction || [];
        global.client.handleReaction = global.client.handleReaction.filter(r => r.messageID !== info.messageID);
        global.client.handleReaction.push({
          name: 'اكس_او',
          messageID: info.messageID,
          starter: senderID,
          threadID
        });
      }
    }, messageID);
  },

  onReaction: async function ({ api, handler, threadID, userID, reaction }) {
    if (reaction === '🦧') {
      const gameKey = `bot_${userID}`;
      const existing = global.xoGames[gameKey];
      if (existing && !existing.ended) {
        return api.sendMessage('⚠️ عندك لعبة بوت نشطة!', threadID);
      }
      return launchGame(api, threadID, userID, null, 'bot');
    }

    if (reaction === '❤️' || reaction === '❤') {
      const msgID = handler.messageID;
      const lobby = global.xoLobbies[msgID];

      if (!lobby) {
        global.xoLobbies[msgID] = { p1: userID };
        return api.sendMessage(`⏳ ينتظر منافس...\nشخص آخر يتفاعل بـ ❤️ لقبول التحدي!`, threadID);
      }

      if (lobby.p1 === userID) {
        return api.sendMessage('⚠️ انتظر شخصاً آخر يقبل التحدي!', threadID);
      }

      const pvpKey = `pvp_${threadID}`;
      const existing = global.xoGames[pvpKey];
      if (existing && !existing.ended) {
        return api.sendMessage('⚠️ في لعبة جماعية نشطة بالفعل!', threadID);
      }

      const p1 = lobby.p1;
      delete global.xoLobbies[msgID];
      return launchGame(api, threadID, p1, userID, 'pvp');
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { senderID, threadID, messageID, body } = event;
    const { gameKey } = handleReply;
    const game = global.xoGames[gameKey];

    if (!game || game.ended) {
      removeReply(gameKey);
      return;
    }

    const input = (body || '').trim();
    const cell  = parseInt(input) - 1;
    if (isNaN(cell) || cell < 0 || cell > 8) return;

    if (game.mode === 'bot') {
      if (senderID !== game.p1.id) {
        return api.sendMessage('🙅 هذه اللعبة مو حقتك!', threadID, messageID);
      }
    } else {
      if (senderID !== game.turn) {
        const turnName = game.turn === game.p1.id ? game.p1.name : game.p2.name;
        return api.sendMessage(`⏳ مو دورك! دور ${turnName}.`, threadID, messageID);
      }
    }

    if (game.board[cell]) {
      return api.sendMessage('❌ الخانة مأخوذة! اختار خانة فارغة.', threadID, messageID);
    }

    const playerSym = (senderID === game.p1.id) ? '❌' : '⭕';
    game.board[cell] = playerSym;
    game.count++;

    if (checkWin(game.board, playerSym)) {
      const winnerName = senderID === game.p1.id ? game.p1.name : game.p2.name;
      game.ended = true;
      removeReply(gameKey);
      return api.editMessage(endMsg(game.board, `🏆 فاز ${winnerName}! مبروك! 🎉`), handleReply.messageID);
    }

    if (game.count === 9) {
      game.ended = true;
      removeReply(gameKey);
      return api.editMessage(endMsg(game.board, '🤝 تعادل! ما أحد فاز هذه المرة.'), handleReply.messageID);
    }

    if (game.mode === 'bot') {
      const botCell = botMove(game.board);
      if (botCell >= 0) {
        game.board[botCell] = '⭕';
        game.count++;
      }

      if (checkWin(game.board, '⭕')) {
        game.ended = true;
        removeReply(gameKey);
        return api.editMessage(endMsg(game.board, 'ابلين بلتك با عب 😼'), handleReply.messageID);
      }

      if (game.count === 9) {
        game.ended = true;
        removeReply(gameKey);
        return api.editMessage(endMsg(game.board, '🤝 تعادل! ما أحد فاز.'), handleReply.messageID);
      }

      return api.editMessage(boardMsg(game), handleReply.messageID);
    }

    game.turn = game.turn === game.p1.id ? game.p2.id : game.p1.id;
    return api.editMessage(boardMsg(game), handleReply.messageID);
  }
};
