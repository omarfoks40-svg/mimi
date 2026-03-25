const { spawn } = require('child_process');
const express = require('express');
const path = require('path');
const { log } = require('./logger/logger');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. نظام البقاء حياً (Uptime System) ---
// ده بيخلي الاستضافة تفتكر إن فيه نشاط دائم وما تقفل السيرفر
app.get('/', (req, res) => {
  res.send('<h3>𝙰𝚙𝚕𝚒𝚗 𝙱𝚘𝚝 𝙾𝚏 𝚃𝚒𝚖𝚎 𝚒𝚜 𝙰𝚕𝚒𝚟𝚎! 🚀</h3>');
});

app.listen(port, () => {
  log('info', `Uptime server is running on port ${port}`);
});

// --- 2. نظام تشغيل وإدارة البوت ---
let botProcess;
const RESTART_DELAY = 5000; // 5 ثواني قبل إعادة التشغيل

function startBot() {
  if (botProcess) {
    log('info', 'Stopping existing bot process...');
    botProcess.kill(); 
  }

  log('info', 'Starting Aplin Bot...');

  // ملاحظة: تأكد أن ملفك الأساسي اسمه main.js داخل مجلد aplin
  // إذا كان اسمه index.js غير 'main.js' لـ 'index.js'
  botProcess = spawn('node', ['main.js'], { 
    cwd: __dirname, // التأكد من التشغيل في المجلد الحالي
    stdio: 'inherit' 
  });

  botProcess.on('close', (code) => {
    log('warn', `Bot process exited with code ${code}.`);
    log('info', `Restarting Aplin Bot in ${RESTART_DELAY / 1000} seconds...`);
    
    // إعادة تشغيل لانهائية - لا يستسلم أبداً
    setTimeout(startBot, RESTART_DELAY);
  });

  botProcess.on('error', (err) => {
    log('error', `Failed to start bot process: ${err.message}`);
    setTimeout(startBot, RESTART_DELAY);
  });
}

// تشغيل البوت لأول مرة
startBot();

// --- 3. حماية السيرفر من الانهيار الكامل ---
process.on('unhandledRejection', (reason, promise) => {
  log('error', `Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (err) => {
  log('error', `Uncaught Exception: ${err.message}`);
});

process.on('SIGINT', () => {
  log('info', 'Stopping bot and exiting...');
  if (botProcess) botProcess.kill();
  process.exit(0);
});
