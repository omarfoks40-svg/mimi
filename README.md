<img src="https://i.ibb.co/9kJnP9F6/1776644012884.png" alt="banner">
<h1 align="center"><img src="https://i.ibb.co/9kJnP9F6/1776644012884.png" width="30px">ابلين - بوت شات ماسنجر</h1>

<p align="center">
  <a href="https://github.com/1dev-hridoy/Kenji-Cloud"><img src="https://img.shields.io/github/stars/1dev-hridoy/Kenji-Cloud?color=green" /></a>
  <a href="https://github.com/1dev-hridoy/Kenji-Cloud/issues"><img src="https://img.shields.io/github/issues/1dev-hridoy/Kenji-Cloud?color=red" /></a>
  <a href="https://github.com/1dev-hridoy/Kenji-Cloud"><img src="https://img.shields.io/github/license/1dev-hridoy/Kenji-Cloud?color=blue" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v/latest?color=purple" /></a>
  <a href="https://github.com/1dev-hridoy/Kenji-Cloud/actions"><img src="https://img.shields.io/badge/build-passing-yellowgreen" /></a>
</p>

بوت قوي للـ **Facebook Messenger** مع أوامر لتحميل الوسائط، متابعة زمن التشغيل، والمزيد. مصمم ليكون سهل الاستخدام وقابل للتخصيص.

## نظرة عامة

**ابلين** هو بوت مفتوح المصدر لتعزيز مجموعات ماسنجر بمزايا مثل تحميل الفيديوهات (فيسبوك، إنستغرام، تيك توك، يوتيوب)، متابعة زمن التشغيل، ورسائل وداع مخصصة. خفيف الوزن، قابل للتوسيع، ومثالي لإدارة المجتمعات.

## التقنيات المستخدمة

![Tech Stack](https://skillicons.dev/icons?i=nodejs,js,html,css,axios,express,mongodb,git)

- **Node.js**: بيئة تشغيل البوت  
- **JavaScript**: لغة البرمجة الأساسية  
- **HTML/CSS**: لواجهة الويب  
- **Axios**: لطلبات HTTP إلى APIs  
- **Express**: إطار عمل السيرفر  
- **MongoDB**: لتخزين البيانات  
- **Git**: للتحكم بالإصدارات  

## التثبيت

### المتطلبات المسبقة

- Node.js (الإصدار 18 أو أعلى)  
- npm (مرفق مع Node.js)  
- Git  
- حساب فيسبوك لتصدير app state  
- اتصال بالإنترنت  

### خطوات التثبيت

1. **استنساخ المستودع**  

```bash
git clone https://github.com/1dev-hridoy/Kenji-Cloud.git
cd Kenji-Cloud
```

2. **تثبيت التبعيات**  

```bash
npm install
```

3. **إعداد ملف البيئة**  

- عدل ملف `config/config.json` ليصبح كالتالي:

```json
{
  "botName": "ابلين",
  "prefix": "!",
  "botpicture": "https://i.ibb.co/Xxmdjjfm/Flux-Dev-cinematic-keyframe13-anime-keyframe12-Animestyle-port-2.jpg",
  "ownerName": "61586897962846",
  "ownerUID": "61586897962846",
  "adminUIDs": [
    "61586897962846"
  ]
}
```

- استخدم امتداد **c3c utility** لتصدير حالة التطبيق **app state** وحفظها باسم `appstate.json`.  

4. **إنشاء المجلدات اللازمة**  

```bash
mkdir config logger/logs database database/backup temp modules/commands/nayan
```

5. **تشغيل البوت**  

```bash
node .
```

- أدخل المصادقة الثنائية إذا طلبت  
- للوصول إلى لوحة التحكم: `http://localhost:3000`  

6. **تجربة الأوامر**  

- مثال: `!dl https://www.facebook.com/share/v/1J2zkAmJke/`  
- مثال: `!uptime`  

## عينات الأوامر

### إنشاء أمر عادي

في `modules/commands/`، أنشئ ملف مثل `hello.js`:

```javascript
module.exports = {
  config: {
    name: 'hello',
    version: '1.0',
    author: '61586897962846',
    countDown: 5,
    prefix: true,
    adminOnly: false,
    aliases: ['hlw', 'hi'],
    description: 'يرد على رسالة hello',
    category: 'مجموعة المحادثة',
    guide: {
      ar: '{pn}hello'
    }
  },

module.exports.run = async ({ api, event }) => {
    api.sendMessage("مرحباً! 👋", event.threadID);
};
```

- استخدم `!hello` لتشغيله  

### أمر مخصص للمشرفين فقط

```javascript
module.exports = {
  config: {
    name: 'admincmd',
    version: '1.0',
    author: '61586897962846',
    countDown: 5,
    prefix: true,
    adminOnly: true,
    aliases: ['adm'],
    description: 'أمر خاص بالمشرفين',
    category: 'إدارة',
    guide: {
      ar: '{pn}admincmd'
    }
  },

module.exports.run = async ({ api, event }) => {
    api.sendMessage("هذا أمر للمشرفين فقط!", event.threadID);
};
```

- لا يستطيع استخدامه إلا المشرفين  

### أمر بدون بادئة

```javascript
module.exports = {
  config: {
    name: 'noprefix',
    version: '1.0',
    author: '61586897962846',
    countDown: 5,
    prefix: false,
    adminOnly: false,
    aliases: [],
    description: 'أمر بدون بادئة',
    category: 'مجموعة المحادثة',
    guide: {
      ar: 'اكتب noprefix لتشغيل الأمر'
    }
  },

module.exports.run = async ({ api, event }) => {
    if (event.body.toLowerCase() === "noprefix") {
        api.sendMessage("تم تنفيذ الأمر بدون بادئة! 😄", event.threadID);
    }
};
```

- ببساطة اكتب `noprefix`  

### أمر لمشرفي المجموعة فقط

```javascript
module.exports.config = {
    name: "groupadmin",
    version: "1.0",
    author: "61586897962846",
    countDown: 5,
    prefix: true,
    groupAdminOnly: true,
    description: "أمر خاص بمشرفي المجموعة.",
    category: "إدارة"
};

module.exports.run = async ({ api, event }) => {
    api.sendMessage("هذا الأمر يظهر لمشرفي المجموعة فقط!", event.threadID);
};
```

- يشغل بـ `!groupadmin`  

## الدعم والتواصل

- **المطور**: 61586897962846  
  - **فيسبوك**: [اضغط هنا](https://www.facebook.com/profile.php?id=61586897962846)  
- **البريد الإلكتروني**: [bgmohammedhridoy@gmail.com](mailto:bgmohammedhridoy@gmail.com)  
- **Messenger**: [للتواصل](https://m.me/j/AbZ7V4ubIwFomn8x/)  
- **تيليجرام**: [انضم هنا](https://t.me/nexalo)  
- **ديسكورد**: [انضم للسيرفر](https://discord.gg/acZaWzBegW)  

## المساهمة

يمكنك عمل **Fork** للمستودع، وإجراء التعديلات، وإرسال **Pull Request**. جميع المساهمات مرحب بها!  

## الرخصة

MIT License
