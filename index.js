const { spawn } = require('child_process');
const express = require('express'); // مكتبة الـ Uptime
const { log } = require('./logger/logger');

const app = express();
const port = process.env.PORT || 3000;

// --- نظام البقاء حياً (Uptime) ---
app.get('/', (req, res) => {
  res.send('<h3>𝙰𝚙𝚕𝚒𝚗 𝙱𝚘𝚝 𝙾𝚏 𝚃𝚒𝚖𝚎 𝚒𝚜 𝙰𝚕𝚒𝚟𝚎! 🚀</h3>');
});

app.listen(port, () => {
  log('info', `Uptime server is active on port ${port}`);
});

let botProcess;
const RESTART_DELAY = 5000; 

function startBot() {
  if (botProcess) {
    log('info', 'Stopping existing bot process...');
    botProcess.kill(); 
  }

  log('info', 'Starting main.js process...');
  
  // هنا التعديل المهم: الـ index بيشغل الـ main
  botProcess = spawn('node', ['main.js'], { 
    cwd: __dirname, 
    stdio: 'inherit' 
  });

  botProcess.on('close', (code) => {
    log('warn', `Bot (main.js) exited with code ${code}.`);
    log('info', `Restarting in ${RESTART_DELAY / 1000} seconds...`);
    
    // إعادة تشغيل لانهائية - عشان البوت ما يوقف نهائياً
    setTimeout(startBot, RESTART_DELAY);
  });

  botProcess.on('error', (err) => {
    log('error', `Failed to start main.js: ${err.message}`);
    setTimeout(startBot, RESTART_DELAY);
  });
}

startBot();

// حماية من الأخطاء العشوائية اللي بتقفل السيرفر
process.on('unhandledRejection', (err) => {
    log('error', `Critical Error: ${err.message}`);
});
