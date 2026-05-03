module.exports = {
  config: {
    name: "اكس_او",
    version: "1.0.0",
    author: "kaguya project x SINKO",
    countDown: 5,
    role: "member",
    description: "لعبة اكس او باستخدام الرد",
    category: "fun",
    prefix: true
  },

  onStart: async function ({ event, api, args }) {
    const { threadID, messageID, senderID, mentions } = event;

    if (!global.game) global.game = {};

    if (args[0] == "إغلاق") {
      if (!global.game[threadID] || global.game[threadID].on == false) {
        return api.sendMessage("لا توجد مباراة قيد التشغيل حالياً.", threadID, messageID);
      }
      global.game[threadID].on = false;
      return api.sendMessage("تم إغلاق اللعبة بنجاح.", threadID, messageID);
    }

    const mention = Object.keys(mentions);
    if (mention.length == 0) return api.sendMessage("يرجى عمل منشن لشخص لتحديه، أو كتابة (اكس_او إغلاق).", threadID, messageID);

    if (!global.game[threadID] || global.game[threadID].on === false) {
      const p1Info = await api.getUserInfo(mention[0]);
      const p2Info = await api.getUserInfo(senderID);

      global.game[threadID] = {
        on: true,
        board: "🔲🔲🔲\n🔲🔲🔲\n🔲🔲🔲",
        boardData: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        turn: mention[0],
        player1: { id: mention[0], name: p1Info[mention[0]].name },
        player2: { id: senderID, name: p2Info[senderID].name },
        symbol: "❌",
        count: 0
      };

      return api.sendMessage(`تبدأ اللعبة!\nاللاعب الأول: ${global.game[threadID].player1.name}\n\n${global.game[threadID].board}\n\nرد برقم الخانة (1-9) للعب.`, threadID, (err, info) => {
        global.client.handleReply.push({
          name: this.config.name,
          messageID: info.messageID,
          author: senderID // أي شخص من اللاعبين يقدر يرد
        });
      }, messageID);
    } else {
      return api.sendMessage("هناك لعبة جارية بالفعل في هذه المجموعة.", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;
    const game = global.game[threadID];

    if (!game || !game.on || !/^[1-9]$/.test(body)) return;

    if (senderID !== game.turn) {
      return api.sendMessage("ليس دورك يا شفت، انتظر الخصم! ؛-؛", threadID, messageID);
    }

    const cell = parseInt(body) - 1;
    if (game.boardData[cell] === "❌" || game.boardData[cell] === "⭕") {
      return api.sendMessage("هذه الخانة محجوزة، اختر غيرها.", threadID, messageID);
    }

    // تحديث اللوحة
    game.boardData[cell] = game.symbol;
    game.count++;
    
    // رسم اللوحة من جديد
    let newBoard = "";
    for (let i = 0; i < 9; i++) {
      let s = game.boardData[i];
      newBoard += (s !== "❌" && s !== "⭕") ? "🔲" : s;
      if ((i + 1) % 3 === 0) newBoard += "\n";
    }
    game.board = newBoard;

    // فحص الفوز
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // أفقي
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // رأسي
      [0, 4, 8], [2, 4, 6]             // قطري
    ];

    let winner = null;
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (game.boardData[a] === game.symbol && game.boardData[b] === game.symbol && game.boardData[c] === game.symbol) {
        winner = senderID === game.player1.id ? game.player1.name : game.player2.name;
        break;
      }
    }

    if (winner) {
      game.on = false;
      return api.sendMessage(`${game.board}\nتهانينا ${winner}! لقد فزت في المباراة! 🔥`, threadID, messageID);
    }

    if (game.count === 9) {
      game.on = false;
      return api.sendMessage(`${game.board}\nانتهت المباراة بالتعادل! ؛-؛`, threadID, messageID);
    }

    // تبديل الدور
    game.turn = senderID === game.player1.id ? game.player2.id : game.player1.id;
    game.symbol = game.symbol === "❌" ? "⭕" : "❌";

    api.unsendMessage(handleReply.messageID);
    return api.sendMessage(`${game.board}\nدور: ${senderID === game.player1.id ? game.player2.name : game.player1.name}`, threadID, (err, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID
      });
    }, messageID);
  }
};
