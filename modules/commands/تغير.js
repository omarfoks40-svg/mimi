const axios = require("axios");

module.exports = {
	config: {
		name: "تغير",
		aliases: ["تغيير_الصورة", "setavatar", "avt"],
		version: "1.3",
		author: "SINKO", 
		countDown: 5,
		role: 2, // للمطور/المالك فقط
		description: {
			ar: "تـغـيـيـر بـروفـايـل الـبـوت الـرسمي"
		},
		category: "owner",
		guide: {
			ar: "{pn} [رابط الصورة] | أو قم بالرد على صورة مكتوباً عليها {pn}"
				+ "\n╮──────────────⟢ـ\n"
				+ "┆ 💡 شـرح الإسـتـخدام:\n"
				+ "┆ 1- رد على صورة بـ {pn}\n"
				+ "┆ 2- أرسل {pn} مع رابط مباشر\n"
				+ "┆ 3- {pn} [رابط] [الوصف] [الوقت بالثواني]\n"
				+ "╯──────────────⟢ـ"
		}
	},

	langs: {
		ar: {
			cannotGetImage: "> ˼❌˹↜ حـدث خـطأ في جـلب الـصورة مـن الـرابط. ↶",
			invalidImageFormat: "> ˼⚠️˹↜ الـمـلف الـمـرسل لـيس صـورة صـالحة. ↶",
			changedAvatar: "> ˼✅˹↜ تـم تـغييـر بـروفايـل aplin بـنجـاح. ↶\n"
		}
	},

	onStart: async function ({ message, event, api, args, getLang }) {
		// تحديد رابط الصورة من الأرجومنت أو الرد أو المرفقات
		const imageURL = (args[0] || "").startsWith("http") ? args.shift() : event.attachments[0]?.url || event.messageReply?.attachments[0]?.url;
		const expirationAfter = !isNaN(args[args.length - 1]) ? args.pop() : null;
		const caption = args.join(" ");

		if (!imageURL) return message.SyntaxError();

		let response;
		try {
			response = await axios.get(imageURL, {
				responseType: "stream"
			});
		} catch (err) {
			return message.reply(getLang("cannotGetImage"));
		}

		if (!response.headers["content-type"].includes("image")) {
			return message.reply(getLang("invalidImageFormat"));
		}

		response.data.path = "avatar.jpg";

		api.changeAvatar(response.data, caption, expirationAfter ? expirationAfter * 1000 : null, (err) => {
			if (err) return message.reply(`> ˼❌˹↜ حـدث خـطأ: ${err.message}`);
			return message.reply(getLang("changedAvatar"));
		});
	}
};
