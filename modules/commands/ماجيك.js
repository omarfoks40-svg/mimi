const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs-extra'); // بنستخدم fs-extra عشان أضمن في التعامل مع المجلدات
const path = require('path');

class MagicAi {
    constructor() {
        this.d_id = crypto.randomBytes(8).toString('hex');
        this.Token = null;
        this.baseUrl = 'https://api.magicaiimage.top';
    }

    // 1. دي دالة التشفير اللي بتخلي السيرفر يثق فينا
    Encrypt(OData) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
        return Buffer.concat([cipher.update(JSON.stringify(OData), "utf8"), cipher.final()]).toString("base64");
    }

    // 2. دالة فك التشفير عشان نقرأ رد السيرفر
    Decrypt(Edata) {
        const key = Buffer.from([0, 0, 0, 109, 97, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        const iv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(Edata, "base64")), decipher.final()]);
        return JSON.parse(decrypted.toString("utf8"));
    }

    // 3. المترجم اللي بيبعت الطلبات للسيرفر
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
        // تسجيل دخول سريع عشان ناخد توكن
        const login = await this.Requester('/app/login', { platform: 3, d_id: this.d_id, lang: 'en' }, '');
        this.Token = login.data.token;

        // إرسال طلب التوليد
        const task = await this.Requester('/app/task/text_to_image/post', {
            positive_prompt: Prompt, model_id: 27, quality_mode: 0, proportion: 0, batch_size: 1, 
            cfg: 3.5, steps: 25, random_seed: Math.floor(Math.random() * 1e15), 
            sampler_name: "euler", scheduler: "simple"
        });
        
        if (!task.data || !task.data.task) throw new Error("السيرفر ما استلم المهمة.");
        const taskId = task.data.task.id;
        
        // الانتظار حتى تظهر الصورة في قائمة الصور (polling)
        let result;
        for (let i = 0; i < 15; i++) { // محاولة لـ 15 مرة (كل مرة ينتظر 3 ثواني)
            await new Promise(res => setTimeout(res, 3000));
            result = await this.Requester('/app/task/image/list/get', { task_id: taskId });
            if (result.data && result.data[0] && result.data[0].url) return result.data[0].url;
        }
        throw new Error("تأخر السيرفر في المعالجة.");
    }
}

module.exports = {
    config: {
        name: "ماجيك",
        aliases: ["magic", "تخيل"],
        version: "2.0.0",
        author: "Sinko",
        countDown: 20,
        role: 0,
        category: "ذكاء اصطناعي"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");
        if (!prompt) return api.sendMessage("✾ ┇ أكتب وصف الصورة يا غالي (بالإنجليزي أفضل).", threadID, messageID);

        try {
            api.setMessageReaction("⏳", messageID, () => {}, true);
            const magic = new MagicAi();
            const imageUrl = await magic.Generate(prompt);

            const cachePath = path.join(__dirname, 'cache', `${Date.now()}.jpg`);
            await fs.ensureDir(path.join(__dirname, 'cache')); // ضمان وجود المجلد

            const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            await fs.writeFile(cachePath, Buffer.from(imgRes.data));

            await api.sendMessage({
                body: "✅ ┇ تم توليد صورتك بنجاح!",
                attachment: fs.createReadStream(cachePath)
            }, threadID, () => fs.unlinkSync(cachePath), messageID);
            
            api.setMessageReaction("🎨", messageID, () => {}, true);
        } catch (e) {
            console.error(e);
            api.sendMessage(`❌ ┇ فشل: ${e.message}`, threadID, messageID);
            api.setMessageReaction("⚠️", messageID, () => {}, true);
        }
    }
};
