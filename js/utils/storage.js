// 数据存储工具类
const SparkMD5 = require('../libs/spark-md5');
const CryptoJS = require('../libs/crypto-js-aes');

function aesEncrypt(str, key) {
  return CryptoJS.AES.encrypt(str, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString();
}
function aesDecrypt(cipher, key) {
  return CryptoJS.AES.decrypt(cipher, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8);
}

// 简单Base64加密/解密，兼容小游戏环境
function encode(str) {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  // polyfill
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let encoded = '', c1, c2, c3, i = 0;
  str = unescape(encodeURIComponent(str));
  while (i < str.length) {
    c1 = str.charCodeAt(i++) & 0xff;
    if (i == str.length) {
      encoded += chars.charAt(c1 >> 2);
      encoded += chars.charAt((c1 & 0x3) << 4);
      encoded += '==';
      break;
    }
    c2 = str.charCodeAt(i++);
    if (i == str.length) {
      encoded += chars.charAt(c1 >> 2);
      encoded += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
      encoded += chars.charAt((c2 & 0xF) << 2);
      encoded += '=';
      break;
    }
    c3 = str.charCodeAt(i++);
    encoded += chars.charAt(c1 >> 2);
    encoded += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
    encoded += chars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
    encoded += chars.charAt(c3 & 0x3F);
  }
  return encoded;
}
function decode(str) {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(str)));
  }
  // polyfill
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '', c1, c2, c3, c4, i = 0;
  str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  while (i < str.length) {
    c1 = chars.indexOf(str.charAt(i++));
    c2 = chars.indexOf(str.charAt(i++));
    c3 = chars.indexOf(str.charAt(i++));
    c4 = chars.indexOf(str.charAt(i++));
    output += String.fromCharCode((c1 << 2) | (c2 >> 4));
    if (c3 !== 64 && c3 !== -1) {
      output += String.fromCharCode(((c2 & 15) << 4) | (c3 >> 2));
    }
    if (c4 !== 64 && c4 !== -1) {
      output += String.fromCharCode(((c3 & 3) << 6) | c4);
    }
  }
  return decodeURIComponent(escape(output.replace(/\0+$/, '')));
}

const SALT = 'yunxi_mini_game_salt_2024'; // 固定盐值

class StorageManager {
  constructor() {
    this.storageKey = 'smart_cut_game_data';
    this.defaultData = {
      unlockedLevels: [1], // 已解锁关卡
      completedLevels: [], // 已通关关卡
      bestScores: {}, // 每关最佳成绩
      settings: { // 游戏设置
        sound: true,
        vibration: true,
        bgMusic: true
      },
      reviveCount: 0, // 复活次数统计
      currentLevel: 1 // 当前关卡
    };
    this.init();
  }

  // 初始化数据
  init() {
    const data = this.getData();
    if (!data) {
      this.saveData(this.defaultData);
    }
  }

  // 获取数据
  getData() {
    try {
      const obj = wx.getStorageSync(this.storageKey);
      if (!obj || !obj.data || !obj.hash) return this.defaultData;
      let aesCipher, jsonStr;
      try {
        aesCipher = decode(obj.data);
        jsonStr = aesDecrypt(aesCipher, SALT);
      } catch (e) {
        // 检测到 Malformed UTF-8 data，自动清理本地存储
        if (e && e.message && e.message.indexOf('Malformed UTF-8 data') !== -1) {
          wx.removeStorageSync(this.storageKey);
        }
        this.saveData(this.defaultData);
        return this.defaultData;
      }
      let hash;
      try {
        hash = SparkMD5.hash(jsonStr + SALT);
      } catch (e) {
        this.saveData(this.defaultData);
        return this.defaultData;
      }
      if (hash !== obj.hash) {
        this.saveData(this.defaultData);
        return this.defaultData;
      }
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        this.saveData(this.defaultData);
        return this.defaultData;
      }
    } catch (error) {
      console.error('Get storage data error:', error);
      return this.defaultData;
    }
  }

  // 保存数据
  saveData(data) {
    try {
      const jsonStr = JSON.stringify(data);
      // 多重加密：AES加密 -> Base64编码
      const aesCipher = aesEncrypt(jsonStr, SALT);
      const encrypted = encode(aesCipher);
      const hash = SparkMD5.hash(jsonStr + SALT);
      wx.setStorageSync(this.storageKey, { data: encrypted, hash });
      return true;
    } catch (error) {
      console.error('Save storage data error:', error);
      return false;
    }
  }

  // 解锁关卡
  unlockLevel(level) {
    const data = this.getData();
    if (!data.unlockedLevels.includes(level)) {
      data.unlockedLevels.push(level);
      data.unlockedLevels.sort((a, b) => a - b);
      this.saveData(data);
    }
  }

  // 检查关卡是否解锁
  isLevelUnlocked(level) {
    const data = this.getData();
    return data.unlockedLevels.includes(level);
  }

  // 保存最佳成绩
  saveBestScore(level, score) {
    const data = this.getData();
    if (!data.bestScores[level] || score < data.bestScores[level]) {
      data.bestScores[level] = score;
      this.saveData(data);
      return true;
    }
    return false;
  }

  // 获取最佳成绩
  getBestScore(level) {
    const data = this.getData();
    return data.bestScores[level] || null;
  }

  // 更新设置
  updateSettings(settings) {
    const data = this.getData();
    data.settings = { ...data.settings, ...settings };
    this.saveData(data);
  }

  // 获取设置
  getSettings() {
    const data = this.getData();
    // 兼容老用户：如果bgMusic字段不存在，补为true
    if (typeof data.settings.bgMusic === 'undefined') {
      data.settings.bgMusic = true;
      this.saveData(data);
    }
    return data.settings;
  }

  // 增加复活次数
  addReviveCount() {
    const data = this.getData();
    data.reviveCount++;
    this.saveData(data);
  }

  // 获取复活次数
  getReviveCount() {
    const data = this.getData();
    return data.reviveCount;
  }

  // 设置当前关卡
  setCurrentLevel(level) {
    const data = this.getData();
    data.currentLevel = level;
    this.saveData(data);
  }

  // 获取当前关卡
  getCurrentLevel() {
    const data = this.getData();
    return data.currentLevel;
  }

  // 标记关卡为已通关
  setLevelCompleted(level) {
    const data = this.getData();
    if (!Array.isArray(data.completedLevels)) {
      data.completedLevels = [];
    }
    if (!data.completedLevels.includes(level)) {
      data.completedLevels.push(level);
      data.completedLevels.sort((a, b) => a - b);
      this.saveData(data);
    }
  }

  // 检查关卡是否已通关
  isLevelCompleted(level) {
    const data = this.getData();
    if (!Array.isArray(data.completedLevels)) {
      data.completedLevels = [];
      this.saveData(data);
    }
    return data.completedLevels.includes(level);
  }

  // 获取所有已通关关卡
  getCompletedLevels() {
    const data = this.getData();
    if (!Array.isArray(data.completedLevels)) {
      data.completedLevels = [];
      this.saveData(data);
    }
    return data.completedLevels;
  }

  // 重置所有数据
  resetAllData() {
    this.saveData(this.defaultData);
  }

  // 清除存储
  clearStorage() {
    try {
      wx.removeStorageSync(this.storageKey);
      return true;
    } catch (error) {
      console.error('Clear storage error:', error);
      return false;
    }
  }
}

module.exports = StorageManager; 