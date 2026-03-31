const axios = require('axios');
const crypto = require("crypto");
const fs = require('fs-extra');
const path = require('path');

function Sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class MagicAi {
    constructor(d_id, models) {
        this.d_id = d_id || this.GenerateID();
        this.Token = null;
        this.baseUrl = 'https://api.magicaiimage.top';
        this.models = models;
    }

    GenerateID() { return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10); }

    Encrypt(OData) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
        const encryptedBuffer = Buffer.concat([cipher.update(JSON.stringify(OData), "utf8"), cipher.final()]);
        return encryptedBuffer.toString("base64");
    }

    Decrypt(Edata) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(Edata, "base64")), decipher.final()]);
        return JSON.parse(decrypted.toString("utf8"));
    }

    async Requester(endpoint, param, token = this.Token) {
        try {
            const data = { data: this.Encrypt({ param, header: { token: token || "", "d-id": this.d_id, version: "3.1.0", "app-code": "magic" } }) };
            const res = await axios.post(`${this.baseUrl}${endpoint}`, data, { headers: { "User-Agent": "okhttp/4.12.0" }, timeout: 20000 });
            return this.Decrypt(res.data.data);
        } catch (e) { throw new Error("سيرفر الماجيك تعبان"); }
    }

    async Generate(Prompt, Model, NUM) {
        const login = await this.Requester('/app/login', { platform: 3, d_id: this.d_id, lang: 'en' }, '');
        this.Token = login.data.token;
        const startRes = await this.Requester('/app/task/text_to_image/post', {
            positive_prompt: Prompt, model_id: parseInt(Model) || 27, styles: [{ name: "None", weight: "1" }],
            quality_mode: 0, proportion: 0, batch_size: 1, public: true,
            cfg: parseFloat(this.models[NUM].default.cfg), steps: parseInt(this.models[NUM].default.steps),
            random_seed: Math.floor(Math.random() * 1e15), sampler_name: this.models[NUM].default.sampler_name,
            scheduler: this.models[NUM].default.scheduler_name, speed_type: 0,
        });

        const TaskID = startRes.data.task.id;
        for (let i = 0; i < 12; i++) { // زيادة بسيطة للمحاولات لضمان الجودة
            await Sleep(5000); 
            const status = await this.Requester('/app/task/waiting/list/get', { page: 1, size: 100 });
            if (status.data?.[0]?.progress?.overall_percentage === "100.00") break;
        }
        const final = await this.Requester('/app/task/image/list/get', { task_id: TaskID });
        return final.data[0];
    }
}

const models = [{ id: 27, name: "Flux1.1 Pro", default: { cfg: 3.5, steps: 25, sampler_name: "euler", scheduler_name: "simple" } }];

module.exports = {
    config: { name: "نانو", aliases: ["تخيلي"], version: "11.0.0", author: "Sinko", countDown: 20, prefix: false, category: "ai" },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");
        if (!prompt) return api.sendMessage("أكتب وصف الصورة ", threadID, messageID);

        // 1. التفاعل الفوري (Reaction)
        api.setMessageReaction("⌛", messageID, () => {}, true);

        // 2. إرسال رسالة "جاري التوليد" لكسر الـ Timeout بتاع راندر
        api.sendMessage("⏳ جاري التوليد", threadID, async (err, info) => {
            const cachePath = path.join(__dirname, 'cache', `nano_${Date.now()}.jpg`);

            try {
                // 3. الترجمة والعمل في الخلفية
                const trans = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(prompt)}`);
                const magicPrompt = trans.data[0][0][0] + ", high quality, ultra detail, masterpiece";

                const magicAi = new MagicAi(null, models);
                const result = await magicAi.Generate(magicPrompt, 27, 0);

                const imgRes = await axios.get(result.url, { responseType: 'arraybuffer' });
                await fs.outputFile(cachePath, Buffer.from(imgRes.data));

                // 4. إرسال النتيجة النهائية
                await api.sendMessage({ 
                    body: `✅ تم التوليد بنجاح\n📝 وصفك: ${prompt}`, 
                    attachment: fs.createReadStream(cachePath) 
                }, threadID, () => {
                    fs.removeSync(cachePath); // مسح فوري للملف
                }, messageID);

                api.setMessageReaction("✅", messageID, () => {}, true);

            } catch (e) {
                console.error(e);
                api.sendMessage("⚠️ السيرفر مضغوط حالياً، جرب تاني يا ملك.", threadID, messageID);
                if (fs.existsSync(cachePath)) fs.removeSync(cachePath);
                api.setMessageReaction("❌", messageID, () => {}, true);
            }
        }, messageID);
    }
};
