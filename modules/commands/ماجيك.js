const axios = require('axios');
const crypto = require("crypto");
const fs = require('fs-extra');
const path = require('path');

// دالة الانتظار
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
        const encryptedBuffer = Buffer.from(Edata, "base64");
        const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
        return JSON.parse(decrypted.toString("utf8"));
    }

    GenerateID() {
        const chars = 'abcdef0123456789';
        let id = '';
        for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
        return id;
    }

    async Requester(endpoint, param, token = this.Token) {
        const data = {
            data: this.Encrypt({
                param: param,
                header: { token: token || "", "d-id": this.d_id, version: "3.1.0", "app-code": "magic" }
            })
        };
        const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
            headers: { "User-Agent": "okhttp/4.12.0", "Content-Type": "application/json; charset=UTF-8" }
        });
        return this.Decrypt(response.data.data);
    }

    async Generate(Prompt, Model, Ratio, Negative, NUM) {
        await this.Requester('/app/login', { platform: 3, d_id: this.d_id, lang: 'en', d_name: 'SM-A546E', sys_version: '12' }, '');
        const loginRes = await this.Requester('/app/login', { platform: 3, d_id: this.d_id, lang: 'en' }, '');
        this.Token = loginRes.data.token;
        
        await this.Requester('/app/user/info', {});
        await this.Requester('/app/user/sign/task/get', {});

        const param = {
            positive_prompt: Prompt,
            negative_prompt: Negative || '',
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
        
        await this.Requester('/app/task/price/quick/get', {});
        
        let isDone = false;
        let attempts = 0;
        while (!isDone && attempts < 20) { // حد أقصى للمحاولات عشان ما يعلق للأبد
            const status = await this.Requester('/app/task/waiting/list/get', { page: 1, size: 100 });
            if (!status.data || !status.data[0] || status.data[0].progress.overall_percentage === "100.00") isDone = true;
            else {
                await Sleep(3000);
                attempts++;
            }
        }

        await Sleep(2000);
        const final = await this.Requester('/app/task/image/list/get', { task_id: TaskID });
        return final.data[0];
    }
}

const models = [{
    id: 27,
    name: "Flux1.1 Pro",
    default: { cfg: 3.5, steps: 25, sampler_name: "euler", scheduler_name: "simple" }
}];

module.exports = {
    config: {
        name: "ماجيك",
        aliases: ["magic"],
        version: "3.5.0", // تحديث النسخة
        author: "Sinko",
        countDown: 15,
        role: 0,
        category: "ai"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) return api.sendMessage("✾ ┇ يرجى كتابة وصف الصورة.", threadID, messageID);

        // تحديد مسار الكاش بشكل آمن
        const cacheDir = path.join(__dirname, 'cache');
        const fileName = `magic_${Date.now()}.jpg`;
        const cachePath = path.join(cacheDir, fileName);

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);

            const magicAi = new MagicAi(null, models);
            const result = await magicAi.Generate(prompt, 27, 0, "", 0);

            if (!result || !result.url) throw new Error("السيرفر مشغول حالياً، جرب لاحقاً.");

            await fs.ensureDir(cacheDir);

            const response = await axios.get(result.url, { responseType: 'arraybuffer' });
            await fs.writeFile(cachePath, Buffer.from(response.data));

            // إرسال الصورة للفيسبوك
            await api.sendMessage({
                body: "✅ ┇ تم التوليد بنجاح بواسطة 𝙰𝚙𝚕𝚒𝚗 𝙱𝚘𝚝",
                attachment: fs.createReadStream(cachePath)
            }, threadID, messageID);

            api.setMessageReaction("✅", messageID, () => {}, true);

        } catch (e) {
            console.error("Error in MagicAI command:", e);
            api.sendMessage(`❌ ┇ فشل التوليد: ${e.message}`, threadID, messageID);
            api.setMessageReaction("❌", messageID, () => {}, true);
        } finally {
            // "المكنسة الذكية" - بتمسح الملف بعد 7 ثواني لضمان الرفع التام
            setTimeout(() => {
                if (fs.existsSync(cachePath)) {
                    fs.unlink(cachePath, (err) => {
                        if (err) console.error(`[Cleaner] فشل حذف: ${fileName}`, err);
                        else console.log(`[Cleaner] تم تنظيف الكاش: ${fileName} 🧹`);
                    });
                }
            }, 7000);
        }
    }
};
