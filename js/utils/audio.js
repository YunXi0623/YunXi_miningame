// 音频管理工具类
class AudioManager {
  constructor(game) {
    this.sounds = {};
    this.music = {};
    this.settings = {
      sound: true,
      vibration: true,
      bgMusic: true // 默认开启背景音乐
    };
    this.currentMusic = null;
    this.init();
    // 同步本地存储设置，保证和设置页面一致
    if (game && game.storage && typeof game.storage.getSettings === 'function') {
      const savedSettings = game.storage.getSettings();
      this.settings = { ...this.settings, ...savedSettings };
    }
  }

  // 初始化音频
  init() {
    this.loadSounds();
  }

  // 加载音效和音乐
  loadSounds() {
    // 切割音效
    this.sounds.cut = wx.createInnerAudioContext();
    this.sounds.cut.src = 'audio/cut.mp3';
    this.sounds.cut.onError((e) => { console.error('切割音效播放失败', e); });
    this.sounds.cut.onCanplay(() => { this.sounds.cut.canPlay = true; });

    // 碰撞音效
    this.sounds.collision = wx.createInnerAudioContext();
    this.sounds.collision.src = 'audio/collision.mp3';
    this.sounds.collision.onError((e) => { console.error('碰撞音效播放失败', e); });
    this.sounds.collision.onCanplay(() => { this.sounds.collision.canPlay = true; });

    // 按钮音效
    this.sounds.button = wx.createInnerAudioContext();
    this.sounds.button.src = 'audio/button.mp3';
    this.sounds.button.onError((e) => { console.error('按钮音效播放失败', e); });
    this.sounds.button.onCanplay(() => { this.sounds.button.canPlay = true; });

    // 成功音效
    this.sounds.success = wx.createInnerAudioContext();
    this.sounds.success.src = 'audio/success.mp3';
    this.sounds.success.onError((e) => { console.error('成功音效播放失败', e); });
    this.sounds.success.onCanplay(() => { this.sounds.success.canPlay = true; });

    // 失败音效
    this.sounds.fail = wx.createInnerAudioContext();
    this.sounds.fail.src = 'audio/fail.mp3';
    this.sounds.fail.onError((e) => { console.error('失败音效播放失败', e); });
    this.sounds.fail.onCanplay(() => { this.sounds.fail.canPlay = true; });

    // 主界面音乐
    this.music.main = wx.createInnerAudioContext();
    this.music.main.src = 'audio/game_main_interface.mp3';
    this.music.main.loop = true;
    this.music.main.onError((e) => { console.error('主界面音乐播放失败', e); });
    this.music.main.onCanplay(() => { this.music.main.canPlay = true; });

    // 闯关中音乐
    this.music.game = wx.createInnerAudioContext();
    this.music.game.src = 'audio/game_bgm.mp3';
    this.music.game.loop = true;
    this.music.game.onError((e) => { console.error('闯关音乐播放失败', e); });
    this.music.game.onCanplay(() => { this.music.game.canPlay = true; });
  }

  // 播放音效
  playSound(soundName) {
    if (!this.settings.sound) return;
    const sound = this.sounds[soundName];
    if (sound && sound.canPlay) {
      sound.stop();
      sound.play();
    } else {
      console.warn('[AudioManager] 未找到音效或音效未 ready:', soundName);
    }
  }

  playCutSound() {
    this.playSound('cut');
    if (this.settings.vibration) this.vibrate();
  }
  playCollisionSound() {
    this.playSound('collision');
  }
  playButtonSound() {
    this.playSound('button');
  }
  playSuccessSound() {
    this.playSound('success');
  }
  playFailSound() {
    this.playSound('fail');
  }

  // 背景音乐控制
  playMusic(type) {
    // 已移除日志
    if (!this.settings.bgMusic) {
      Object.keys(this.music).forEach(key => {
        if (this.music[key]) this.music[key].pause();
      });
      return;
    }
    // 如果当前音乐类型一致且未暂停，则不重播，保持进度
    if (
      this.currentMusic === type &&
      this.music[type] &&
      typeof this.music[type].paused !== 'undefined' &&
      !this.music[type].paused
    ) {
      return;
    }
    // 停止所有music，避免微信音频对象未释放导致错乱
    Object.keys(this.music).forEach(key => {
      if (this.music[key]) this.music[key].stop();
    });
    if (this.music[type] && this.music[type].canPlay) {
      const playPromise = this.music[type].play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // 播放异常处理
          console.warn(`[AudioManager] 音乐播放失败: ${type}`, error);
        });
      }
      this.currentMusic = type;
    } else {
      console.warn('[AudioManager] 未找到音乐类型或音乐未 ready:', type);
    }
  }
  stopMusic() {
    if (this.currentMusic && this.music[this.currentMusic]) {
      this.music[this.currentMusic].stop();
      this.currentMusic = null;
    }
  }
  pauseMusic() {
    if (this.currentMusic && this.music[this.currentMusic]) {
      this.music[this.currentMusic].pause();
    }
  }
  resumeMusic() {
    if (this.settings.bgMusic && this.currentMusic && this.music[this.currentMusic]) {
      this.music[this.currentMusic].play();
    }
  }

  // 更新设置
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    if (!this.settings.bgMusic) {
      this.stopMusic();
    } else if (this.currentMusic && this.music[this.currentMusic]) {
      this.music[this.currentMusic].play();
    }
  }

  // 震动反馈
  vibrate() {
    if (wx.vibrateShort) {
      wx.vibrateShort();
    }
  }
  vibrateLong() {
    if (wx.vibrateLong) {
      wx.vibrateLong();
    }
  }

  // 销毁音频
  destroy() {
    Object.values(this.sounds).forEach(sound => {
      if (sound) sound.destroy();
    });
    Object.values(this.music).forEach(music => {
      if (music) music.destroy();
    });
    this.currentMusic = null;
  }
}

module.exports = AudioManager; 