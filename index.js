const { spawn } = require('child_process');
const { log } = require('./logger/logger');

let botProcess;
let restartCount = 0;
const MAX_RESTARTS = 5; 
const RESTART_DELAY = 5000;

function startBot() {
  if (botProcess) {
    log('info', 'Stopping existing bot process...');
    botProcess.kill(); 
  }

  log('info', 'Starting bot...');
  botProcess = spawn('node', ['main.js'], { stdio: 'inherit' });

  botProcess.on('close', (code) => {
    log('info', `Bot process exited with code ${code}`);
    if (code === 2) { 
      log('info', 'Bot is restarting...');
      setTimeout(startBot, RESTART_DELAY);
    } else if (code !== 0 && restartCount < MAX_RESTARTS) { 
      restartCount++;
      log('warn', `Restarting bot in ${RESTART_DELAY / 1000} seconds... (Attempt ${restartCount}/${MAX_RESTARTS})`);
      setTimeout(startBot, RESTART_DELAY);
    } else if (restartCount >= MAX_RESTARTS) {
      log('error', `Bot stopped after ${MAX_RESTARTS} restarts. Please check for errors.`);
    } else {
      log('info', 'Bot exited normally.');
    }
  });

  botProcess.on('error', (err) => {
    log('error', `Failed to start bot process: ${err.message}`);
  });
}


startBot();

process.on('SIGINT', () => {
  log('info', 'Ctrl+C detected. Stopping bot...');
  if (botProcess) {
    botProcess.kill();
  }
  process.exit(0);
});
