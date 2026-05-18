const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const { log } = require('../logger/logger');

const usersPath = path.join(__dirname, 'users.json');
const threadsPath = path.join(__dirname, 'groups.json');

const loadData = (filePath) => {
  try {
    return fs.existsSync(filePath) ? fs.readJsonSync(filePath) : {};
  } catch (error) {
    log('error', `Load data error: ${error.message}`);
    return {};
  }
};

const saveData = (filePath, data) => {
  try {
    fs.writeJsonSync(filePath, data, { spaces: 2 });
  } catch (error) {
    log('error', `Save data error: ${error.message}`);
  }
};

const backupData = () => {
  try {
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    fs.copySync(usersPath, path.join(__dirname, `backup/users_${timestamp}.json`));
    fs.copySync(threadsPath, path.join(__dirname, `backup/groups_${timestamp}.json`));
    log('info', 'Database backup completed');
  } catch (error) {
    log('error', `Backup error: ${error.message}`);
  }
};

const Users = {
  get: (userID) => loadData(usersPath)[userID] || null,
  getAll: () => loadData(usersPath),
  set: (userID, data) => {
    const users = loadData(usersPath);
    users[userID] = { ...users[userID], ...data };
    saveData(usersPath, users);
  },
  create: (userID, name) => {
    const users = loadData(usersPath);
    if (!users[userID]) {
      users[userID] = {
        name,
        joinDate: moment().toISOString(),
        messageCount: 0,
        isAdmin: false,
        isBanned: false,
        lastActive: moment().toISOString(),
        rank: 0,
        xp: 0,
        totalxp: 0,
        balance: 0,
      };
      saveData(usersPath, users);
    }
  },
};

const Threads = {
  get: (threadID) => loadData(threadsPath)[threadID] || null,
  getAll: () => loadData(threadsPath),
  set: (threadID, data) => {
    const threads = loadData(threadsPath);
    threads[threadID] = { ...threads[threadID], ...data };
    saveData(threadsPath, threads);
  },
  create: (threadID, threadName) => {
    const threads = loadData(threadsPath);
    if (!threads[threadID]) {
      threads[threadID] = {
        threadName,
        adminIDs: [],
        memberCount: 0,
        settings: { welcomeMessage: true, prefix: '/' },
      };
      saveData(threadsPath, threads);
    }
  },
};

module.exports = { Users, Threads, backupData };
