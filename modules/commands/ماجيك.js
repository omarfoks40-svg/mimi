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

    Seed() { return Math.floor(Math.random() * 1e15); }

    Encrypt(OData) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
        cipher.setAutoPadding(true);
        const encryptedBuffer = Buffer.concat([cipher.update(JSON.stringify(OData), "utf8"), cipher.final()]);
        return encryptedBuffer.toString("base64");
    }

    Decrypt(Edata) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
        decipher.setAutoPadding(true);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(Edata, "base64")), decipher.final()]);
        return JSON.parse(decrypted.toString("utf8"));
    }

    GenerateID() {
        return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    }

    async Requester(endpoint, param, token = this.Token) {
        try {
            const data = {
                data: this.Encrypt({
                    param: param,
                    header: { token: token || "", "d-id": this.d_id, version: "3.1.0", "app-code": "magic" }
                })
            };
            const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
                headers: { "User-Agent": "okhttp/4.12.0", "Content-Type": "application/json; charset=UTF-8" },
                timeout: 15000
            });
            return this.Decrypt(response.data.data);
        } catch (e) { throw new Error("فشل الاتصال بسيرفر التوليد"); }
    }

    async Generate(Prompt, Model, Ratio, NUM) {
        await this.Requester('/app/login', { platform: 3, d_id: this.d_id, lang: 'en', d_name: 'SM-A546E', sys_version: '12' }, '');
        const loginRes = await this.Requester('/app/login', { platform: 3, d_id: this.d_id, lang: 'en' }, '');
        this.Token = loginRes.data.token;

        const param = {
            positive_prompt: Prompt,
            negative_prompt: '',
            model_id: parseInt(Model) || 27,
            styles: [{ name: "None", weight: "1" }],
            quality_mode: 0,
            proportion: parseInt(Ratio) || 0,
            batch_size: 1,
            public: true,
            cfg: parseFloat(this.models[NUM].default.cfg),
            steps: parseInt(this.models[NUM].default.steps),
            random_seed: this.Seed(),
            sampler_name: this.models[NUM].default.sampler_name,
            scheduler: this.models[NUM].default.scheduler_name,
            speed_type: 0,
        };
        
        const startRes = await this.Requester('/app/task/text_to_image/post', param);
        const TaskID = startRes.data.task.id;
        
        let attempts = 0;
        while (attempts < 15) {
            const status = await this.Requester('/app/task/waiting/list/get', { page: 1, size: 100 });
            if (status.data && status.data[0] && status.data[0].progress.overall_percentage === "100.00") break;
            await Sleep(4000); // زيادة وقت الانتظار لحماية البوت من الفصل
            attempts++;
        }

        await Sleep(2000);
        const final = await this.Requester('/app/task/image/list/get', { task_id: TaskID });
        if (!final.data || !final.data[0]) throw new Error("لم يتم العثور على الصورة");
        return final.data[0];
    }
}

const models = [{ id: 27, name: "Flux1.1 Pro", default: { cfg: 3.5, steps: 25, sampler_name: "euler", scheduler_name: "simple" } }];

module.exports = {
    config: {
        name: "ماجيك",
        version: "4.0.0",
        author: "Sinko",
        countDown: 20, // زيادة الكول داون لمنع حظر الفيس
        role: 0,
        category: "ai"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");
        if (!prompt) return api.sendMessage("يرجى كتابة وصف الصورة.", threadID, messageID);

        const cachePath = path.join(__dirname, 'cache', `magic_${Date.now()}.jpg`);

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);
            const magicAi = new MagicAi(null, models);
            const result = await magicAi.Generate(prompt, 27, 0, 0);

            await fs.ensureDir(path.join(__dirname, 'cache'));
            const response = await axios.get(result.url, { responseType: 'arraybuffer' });
            await fs.writeFile(cachePath, Buffer.from(response.data));

            await api.sendMessage({
                body: "تم التوليد بنجاح بواسطة Aplin Bot ✅",
                attachment: fs.createReadStream(cachePath)
            }, threadID, () => {
                // المكنسة الفورية: مسح الملف فور الإرسال
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            }, messageID);

            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            api.sendMessage(`فشل التوليد: ${e.message}`, threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
            if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
        }
    }
};
