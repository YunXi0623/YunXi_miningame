// 数据存储工具类
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
    try {
      const data = wx.getStorageSync(this.storageKey);
      if (!data) {
        this.saveData(this.defaultData);
      }
    } catch (error) {
      console.error('Storage init error:', error);
      this.saveData(this.defaultData);
    }
  }

  // 获取数据
  getData() {
    try {
      const data = wx.getStorageSync(this.storageKey);
      return data || this.defaultData;
    } catch (error) {
      console.error('Get storage data error:', error);
      return this.defaultData;
    }
  }

  // 保存数据
  saveData(data) {
    try {
      wx.setStorageSync(this.storageKey, data);
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