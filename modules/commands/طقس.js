const axios = require("axios");

module.exports = {
  config: {
    name: "طقس",
    version: "1.0.0",
    author: "SINKO",
    countDown: 5,
    category: "الوسئط"
  },

  onStart: async function ({ api, event, args }) {
    const city = args.join(" ");
    if (!city) return api.sendMessage("يرجى تحديد المدينة أولاً ؛-؛", event.threadID);

    try {
      const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURI(city)}&appid=b7f1db5959a1f5b2a079912b03f0cd96&units=metric&lang=ar`);
      const data = res.data;

      const weatherMsg = `🌡 الـمديـنة: ${data.name}\n` +
                         `☁️ الـسماء: ${data.weather[0].description}\n` +
                         `🌡 الـحرارة: ${data.main.temp}°C\n` +
                         `💦 الـرطوبة: ${data.main.humidity}%\n` +
                         `💨 الـرياح: ${data.wind.speed} كم/ساعة ؛-؛`;

      return api.sendMessage(weatherMsg, event.threadID, event.messageID);
    } catch (e) {
      return api.sendMessage("تعذر العثور على هذه المدينة في خرائطي ؛-؛", event.threadID);
    }
  }
};
