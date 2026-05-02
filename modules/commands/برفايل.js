const axios = require("axios");

const baseApiUrl = async () => {
  try {
    const base = await axios.get(`https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json`);
    return base.data.api;
  } catch (e) { return null; }
};

module.exports = {
  config: {
    name: "برفايل",
    version: "1.2",
    author: "Dipto / Sinko Edit",
    countDown: 10,
    category: "fun"
  },

  onStart: async function ({ event, Users, api, args }) {
    const { threadID, messageID, senderID, mentions, messageReply, type } = event;
    let uid = type === "message_reply" ? messageReply.senderID : Object.keys(mentions)[0] || args[0] || senderID;

    try {
      let babyTeach = 0;
      const apiUrl = await baseApiUrl();
      if (apiUrl) {
        try {
          const response = await axios.get(`${apiUrl}/baby?list=all`);
          const dataa = response.data || { teacher: { teacherList: [] } };
          if (dataa?.teacher?.teacherList?.length) {
            babyTeach = dataa.teacher.teacherList.find((t) => t[uid])?.[uid] || 0;
          }
        } catch (apiErr) { babyTeach = 0; }
      }

      const userInfo = await api.getUserInfo(uid);
      const user = userInfo[uid];
      const avatarUrl = `https://graph.facebook.com/${uid}/picture?height=1500&width=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      let genderText = user.gender == 1 ? "𝙶𝚒𝚛𝚕🙋🏻‍♀️" : user.gender == 2 ? "Boy🙋🏻‍♂️" : "𝙶𝚊𝚢🤷🏻‍♂️";

      const userStats = await Users.get(uid);
      const money = userStats.money || 0;
      
      const allUsersRaw = await Users.getAll();
      const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : Object.values(allUsersRaw);
      
      const rank = allUsers.slice().sort((a, b) => (b.exp || 0) - (a.exp || 0)).findIndex(u => u.userID === uid) + 1;
      const moneyRank = allUsers.slice().sort((a, b) => (b.money || 0) - (a.money || 0)).findIndex(u => u.userID === uid) + 1;

      const userInformation = `
╭─[ 𝐔𝐒𝐄𝐑 𝐈𝐍𝐅𝐎 ]
├‣ 𝙽𝚊𝚖𝚎: ${user.name}
├‣ 𝙽𝚒𝚌𝚔𝙽𝚊𝚖𝚎: ${user.alternateName || "𝙽𝚘𝚗𝚎"}
├‣ 𝚄𝙸𝙳: ${uid}
├‣ 𝙲𝚕𝚊𝚜𝚜: ${user.type ? user.type.toUpperCase() : "𝚄𝚂𝙴𝚁"}
├‣ 𝚄𝚜𝚎𝚛𝚗𝚊𝚖𝚎: ${user.vanity || "𝙽𝚘𝚗𝚎"}
├‣ 𝙶𝚎𝚗𝚍𝚎𝚛: ${genderText}
├‣ 𝙱𝚒𝚛𝚝𝚑𝚍𝚊𝚢: ${user.isBirthday !== false ? user.isBirthday : "𝙿𝚛𝚒𝚟𝚊𝚝𝚎"}
├‣ 𝙵𝚛𝚒𝚎𝚗𝚍 𝚠𝚒𝚝𝚑 𝚋𝚘𝚝: ${user.isFriend ? "𝚈𝚎𝚜✅" : "𝙽𝚘❎"}
╰‣ 𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝚄𝚁𝙻: fb.com/${uid}

╭─[ 𝐔𝐒𝐄𝐑 𝐒𝐓𝐀𝐓𝐒 ]
├‣ 𝙼𝚘𝚗𝚎𝚢: $${formatMoney(money)}
├‣ 𝚁𝚊𝚗𝚔: #${rank}/${allUsers.length}
├‣ 𝙼𝚘𝚗𝚎𝚢 𝚁𝚊𝚗𝚔: #${moneyRank}/${allUsers.length}
╰‣ 𝙱𝚊𝚋𝚢 𝚝𝚎𝚊𝚌𝚑: ${babyTeach || 0} ؛-؛`;

      const avatarStream = (await axios.get(avatarUrl, { responseType: "stream" })).data;
      
      return api.sendMessage({
        body: userInformation,
        attachment: avatarStream,
        mentions: [{ tag: user.name, id: uid }]
      }, threadID, messageID);

    } catch (e) {
      return api.sendMessage(`حدث خطأ: ${e.message}`, threadID, messageID);
    }
  }
};

function formatMoney(num) {
  const units = ["", "K", "M", "B", "T", "Q"];
  let unit = 0;
  while (num >= 1000 && ++unit < units.length) num /= 1000;
  return num.toFixed(1).replace(/\.0$/, "") + units[unit];
}
