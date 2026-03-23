const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// إعدادات الموديلات
const models = [{
    id: 27,
    name: "Flux1.1 Pro",
    default: { cfg: 3.5, steps: 25, sampler_name: "euler", scheduler_name: "simple" }
}];

class MagicAi {
    constructor(d_id, models) {
        this.d_id = d_id || this.GenerateID();
        this.Token = null;
        this.baseUrl = 'https://api.magicaiimage.top';
        this.models = models;
    }

    GenerateID() {
        return crypto.randomBytes(8).toString('hex');
    }

    Encrypt(OData) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
        return Buffer.concat([cipher.update(JSON.stringify(OData), "utf8"), cipher.final()]).toString("base64");
    }

    Decrypt(Edata) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(Edata, "base64")), decipher.final()]);
        return JSON.parse(decrypted.toString("utf8"));
    }

    async Requester(endpoint, param, token = this.Token) {
        const data = {
            data: this.Encrypt({
                param: param,
                header: { token: token || "", "d-id": this.d_id, version: "3.1.0", "app-code": "magic" }
            })
        };
        const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
            headers: { "User-Agent": "okhttp/4.12.0", "Content-Type": "application/json" }
        });
        return this.Decrypt(response.data.data);
    }

    async Generate(Prompt) {
        const login = await this.Requester('/app/login', { platform: 3, d_id: this.d_id, lang: 'en' }, '');
        this.Token = login.data.token;
        const task = await this.Requester('/app/task/text_to_image/post', {
            positive_prompt: Prompt, model_id: 27, quality_mode: 0, proportion: 0, batch_size: 1, cfg: 3.5, steps: 25, random_seed: Math.floor(Math.random() * 1e15), sampler_name: "euler", scheduler: "simple"
        });
        const taskId = task.data.task.id;
        
        // الانتظار حتى اكتمال الصورة
        let result;
        while (true) {
            result = await this.Requester('/app/task/image/list/get', { task_id: taskId });
            if (result.data && result.data[0]) break;
            await new Promise(res => setTimeout(res, 3000));
        }
        return result.data[0];
    }
}

module.exports = {
    config: {
        name: "ماجيك",
        aliases: ["magic", "تخيل"],
        version: "1.0.0",
        author: "Sinko",
        countDown: 15,
        role: 0,
        category: "ai"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");
        if (!prompt) return api.sendMessage("✾ ┇ يرجى كتابة وصف الصورة (بالإنجليزي أفضل).", threadID, messageID);

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);
            const magic = new MagicAi(null, models);
            const result = await magic.Generate(prompt);

            const cachePath = path.join(__dirname, 'cache', `${Date.now()}.jpg`);
            if (!fs.existsSync(path.join(__dirname, 'cache'))) fs.mkdirSync(path.join(__dirname, 'cache'));

            const imgRes = await axios.get(result.url, { responseType: 'arraybuffer' });
            fs.writeFileSync(cachePath, Buffer.from(imgRes.data));

            await api.sendMessage({
                body: "✅ ┇ تم توليد صورتك بواسطة Flux1.1 Pro",
                attachment: fs.createReadStream(cachePath)
            }, threadID, () => fs.unlinkSync(cachePath), messageID);
            
            api.setMessageReaction("🎨", messageID, () => {}, true);
        } catch (e) {
            console.error(e);
            api.sendMessage("❌ ┇ فشل السيرفر في توليد الصورة.", threadID, messageID);
        }
    }
};
