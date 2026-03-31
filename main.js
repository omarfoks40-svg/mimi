const fs = require('fs-extra');
const express = require('express');
const login = require('fca-priyansh');
const { loadCommands, handleCommand } = require('./handler/command');
const handleEvent = require('./handler/event');
const { handleMessage } = require('./handler/message');
const { log } = require('./logger/logger');
const config = require('./config/config.json');
const chalk = require('chalk');
const axios = require('axios');

const app = express();
app.use(express.static('public'));

// --- [ بداية الجزء المعدل لضمان استقرار Render ] ---
const port = process.env.PORT || 5000;
app.get('/', (req, res) => {
  res.send('Aplin Bot is running perfectly! 🚀');
});

app.listen(port, '0.0.0.0', () => {
  log('info', `Web server running on port ${port}`);
});

// إرسال طلب لنفسه كل 5 دقائق لمنع وضع النوم
setInterval(async () => {
  try {
    await axios.get(`http://localhost:${port}`);
  } catch (e) {
    // تجاهل الأخطاء
  }
}, 300000);
// --- [ نهاية الجزء المعدل ] ---

app.get('/config', (req, res) => {
  res.json(config);
});

app.get('/command-count', (req, res) => {
  res.json({ count: global.client && global.client.commands ? global.client.commands.size : 0 });
});

const gradient = chalk.bold.green;

function _0x4210(_0x1c3be3,_0x2b4807){const _0x2629ef=_0x2629();return _0x4210=function(_0x42102a,_0x253f34){_0x42102a=_0x42102a-0x175;let _0x2398db=_0x2629ef[_0x42102a];return _0x2398db;},_0x4210(_0x1c3be3,_0x2b4807);}(function(_0x45495e,_0x1bc14f){const _0xbb3a03=_0x4210,_0x397d11=_0x45495e();while(!![]){try{const _0x156aa6=-parseInt(_0xbb3a03(0x17c))/0x1+parseInt(_0xbb3a03(0x177))/0x2+parseInt(_0xbb3a03(0x179))/0x3*(-parseInt(_0xbb3a03(0x17f))/0x4)+-parseInt(_0xbb3a03(0x180))/0x5+parseInt(_0xbb3a03(0x17e))/0x6+parseInt(_0xbb3a03(0x17d))/0x7*(parseInt(_0xbb3a03(0x176))/0x8)+parseInt(_0xbb3a03(0x185))/0x9;if(_0x156aa6===_0x1bc14f)break;else _0x397d11['push'](_0x397d11['shift']());}catch(_0x3d3105){_0x397d11['push'](_0x397d11['shift']());}}}(_0x2629,0xa5d0b));const displayBanner=async()=>{const _0x52c980=_0x4210,_0x3403e4={'TVZNh':_0x52c980(0x184),'eWTiM':_0x52c980(0x187),'jNfkp':_0x52c980(0x183),'tzbjK':function(_0x61e26,_0x189f7e){return _0x61e26(_0x189f7e);},'YTlIZ':'Failed\x20to\x20fetch\x20or\x20display\x20banner:'};try{const _0x479148=await axios[_0x52c980(0x186)](_0x3403e4[_0x52c980(0x178)]),_0x104296=_0x479148[_0x52c980(0x17b)],_0x149392=Buffer[_0x52c980(0x175)](_0x104296,_0x3403e4[_0x52c980(0x182)])['toString'](_0x3403e4[_0x52c980(0x188)]);console['log'](_0x3403e4['tzbjK'](gradient,_0x149392));}catch(_0x3bfef6){console[_0x52c980(0x181)](_0x3403e4[_0x52c980(0x17a)],_0x3bfef6);}};function _0x2629(){const _0x344e67=['utf8','https://raw.githubusercontent.com/1dev-hridoy/1dev-hridoy/refs/heads/main/kenji.txt','15576021sqzZsD','get','base64','jNfkp','from','8pMmcBO','768620xfWmRT','TVZNh','95025lzGESC','YTlIZ','data','531783KBLfqb','3019163HiDTuy','3233130RQiHFc','76aqcZkt','6361780JToHNs','error','eWTiM'];_0x2629=function(){return _0x344e67;};return _0x2629();}

const initializeBot = async () => {
  await displayBanner();
  console.log(chalk.bold.cyan('Loading commands...'));

  try {
    if (!fs.existsSync('./appstate.json')) {
      log('error', 'appstate.json not found. Please provide a valid appstate.json file.');
      process.exit(1);
    }
    const appState = fs.readJsonSync('./appstate.json');
    if (!Array.isArray(appState) || appState.length === 0) {
      log('error', 'appstate.json is invalid or empty.');
      process.exit(1);
    }

    let attempts = 0;
    const maxAttempts = 3;
    let api;
    while (attempts < maxAttempts) {
      try {
        api = await new Promise((resolve, reject) => {
          login({ appState }, (err, api) => {
            if (err) return reject(err);
            resolve(api);
          });
        });
        break; 
      } catch (error) {
        attempts++;
        log('error', `Login attempt ${attempts} failed: ${error.message}`);
        if (attempts >= maxAttempts) {
          log('error', 'Max login attempts reached. Please check appstate.json.');
          process.exit(1);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); 
      }
    }

    api.setOptions({ listenEvents: true, selfListen: true, forceLogin: true });

    global.client = {
      handleReply: [],
      commands: new Map(),
      events: new Map(),
      config: config 
    };

    if (global.client.config.ownerUID && !global.client.config.adminUIDs.includes(global.client.config.ownerUID)) {
      global.client.config.adminUIDs.push(global.client.config.ownerUID);
      fs.writeJsonSync('./config/config.json', global.client.config, { spaces: 2 });
      log('info', `Added ownerUID ${global.client.config.ownerUID} to adminUIDs.`);
    }

    const commands = loadCommands();
    commands.forEach((cmd, name) => global.client.commands.set(name, cmd));

    api.listenMqtt(async (err, event) => {
      if (err) {
        log('error', `Event listener error: ${err.message}`);
        return;
      }
      if (event.type === 'event') {
        await handleEvent(event, api);
      } else if (event.type === 'message' || event.type === 'message_reply') {
        await handleEvent(event, api);
        const time = new Date().toLocaleTimeString();
        const messageType = event.isGroup ? 'Group' : 'Private';
        let content = '';

        if (event.body) {
          content = `Text: ${event.body}`;
        } else if (event.attachments && event.attachments.length > 0) {
          content = `Media: ${event.attachments.map(att => att.url).join(', ')}`;
        }

        console.log(gradient(`[${time}] [${messageType}] ${content}`));
        await handleMessage(event, api, commands);
      }
    });

    log('info', 'Bot initialized successfully');
    global.botStartTime = Date.now(); 

    if (fs.existsSync('./restart.json')) {
      const restartInfo = fs.readJsonSync('./restart.json');
      const restartTime = (Date.now() - restartInfo.startTime) / 1000;
      api.sendMessage(`تم اعادة تشغيل ابلين 🔂🖤. ${restartTime.toFixed(2)} ثانية.`, restartInfo.threadID);
      fs.removeSync('./restart.json');
    }

    process.on('SIGINT', () => {
      log('info', 'Bot stopped by user (Ctrl+C)');
      process.exit(0);
    });

  } catch (error) {
    log('error', `Bot initialization error: ${error.message}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  log('error', `Unhandled Promise Rejection: ${reason && reason.message ? reason.message : reason}`);
});

process.on('uncaughtException', (err) => {
  log('error', `Uncaught Exception: ${err.message}`);
});

fs.removeSync('./PriyanshFca.json');
initializeBot();
