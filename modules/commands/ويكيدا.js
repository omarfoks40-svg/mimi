const axios = require('axios');

const WIKI_HEADERS = { 'User-Agent': 'Aplin-Bot/1.0 (Facebook Messenger Bot)' };

async function searchWikipedia(query, lang = 'ar') {
  const apiUrl = `https://${lang}.wikipedia.org/w/api.php`;

  const searchRes = await axios.get(apiUrl, {
    params: {
      action: "opensearch",
      search: query,
      limit: 1,
      format: "json"
    },
    headers: WIKI_HEADERS,
    timeout: 10000
  });

  const titles = searchRes.data?.[1];
  if (!titles || titles.length === 0) return null;

  const title = titles[0];
  const summaryRes = await axios.get(apiUrl, {
    params: {
      action: "query",
      prop: "extracts",
      exintro: true,
      explaintext: true,
      titles: title,
      format: "json"
    },
    headers: WIKI_HEADERS,
    timeout: 10000
  });

  const pages = summaryRes.data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;

  const extract = (page.extract || "").trim();
  const pageId = page.pageid;
  const wikiLink = `https://${lang}.wikipedia.org/?curid=${pageId}`;

  return {
    title: page.title,
    extract: extract.slice(0, 1200),
    link: wikiLink,
    lang
  };
}

module.exports = {
  config: {
    name: "ويكيدا",
    version: "1.0.0",
    author: "  / SINKO",
    countDown: 5,
    prefix: true,
    category: "الوسائط ",
    description: "📖 بحث في ويكيبيديا",
    aliases: ["wiki", "ويكيبيديا", "wikipedia"],
    guide: { ar: "{pn} [الموضوع]\n{pn} en [topic] ← للإنجليزية" }
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    if (!args.length) {
      return api.sendMessage(
        "╭─⟪ 📖 ويكيبيديا ⟫─╮\n┇ أكتب الموضوع بعد الأمر\n┇ مثال: ويكي السودان\n┇ للإنجليزية: ويكي en Sudan\n╰────────────────╯",
        threadID, messageID
      );
    }

    let lang = 'ar';
    let query = args.join(" ").trim();

    if (args[0].toLowerCase() === 'en') {
      lang = 'en';
      query = args.slice(1).join(" ").trim();
    } else if (args[0].toLowerCase() === 'ar') {
      lang = 'ar';
      query = args.slice(1).join(" ").trim();
    }

    if (!query) {
      return api.sendMessage("أكتب الموضوع بعد الأمر 📖", threadID, messageID);
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const result = await searchWikipedia(query, lang);

      if (!result) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(`ما لقيت نتيجة لـ「${query}」في ويكيبيديا 📖`, threadID, messageID);
      }

      const langLabel = lang === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English';
      const msg =
`╭─⟪ 📖 ويكيبيديا - ${langLabel} ⟫─╮
┇ 📌 ${result.title}
┇
${result.extract}
┇
┇ 🔗 ${result.link}
╰────────────────╯`;

      api.setMessageReaction("✅", messageID, () => {}, true);
      api.sendMessage(msg, threadID, messageID);

    } catch (e) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      api.sendMessage("الشبكة واجهت مشكلة، جرب تاني 📖", threadID, messageID);
    }
  }
};
