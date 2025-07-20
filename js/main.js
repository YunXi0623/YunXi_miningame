// 游戏主入口文件
const global = require('./libs/weapp-adapter');
const DeviceAdapter = require('./utils/device');
const StorageManager = require('./utils/storage');
const AudioManager = require('./utils/audio');
const LoadingScene = require('./scenes/loading-scene');
const MainMenuScene = require('./scenes/main-menu');
const LevelSelectScene = require('./scenes/level-select');
const GameScene = require('./scenes/game-scene');
const ReviveScene = require('./scenes/revive-scene');
const ResultScene = require('./scenes/result-scene');
const SettingsScene = require('./scenes/settings-scene');
const PauseScene = require('./scenes/pause-scene');
const HelpScene = require('./scenes/help-scene');

class SmartCutGame {
  constructor() {
    this.canvas = global.canvas;
    this.ctx = global.context;
    this.device = new DeviceAdapter();
    this.storage = new StorageManager();
    this.audio = new AudioManager(this);
    // 首次进入游戏时自动播放主页背景音乐（如果开关为开）
    if (this.audio.settings.bgMusic) {
      this.audio.playMusic('main');
    }
    
    // 游戏状态
    this.currentScene = null;
    this.scenes = {};
    this.isRunning = false;
    this.lastTime = 0;
    
    // 触摸事件
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouching = false;
    
    this.init();
  }

  init() {
    // 初始化场景
    this.initScenes();
    
    // 绑定事件
    this.bindEvents();
    
    // 启动游戏循环
    this.start();
  }

  initScenes() {
    // 注册场景
    this.scenes = {
      loading: new LoadingScene(this),
      mainMenu: new MainMenuScene(this),
      levelSelect: new LevelSelectScene(this),
      game: new GameScene(this),
      revive: new ReviveScene(this),
      result: new ResultScene(this),
      settings: new SettingsScene(this),
      pause: new PauseScene(this),
      help: new HelpScene(this)
    };
    
    // 设置初始场景为加载场景
    this.switchScene('loading');
  }

  bindEvents() {
    // 触摸开始事件
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.modalPending) return; // 阻断事件
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.isTouching = true;

      // 只有modalReady时才分发给modalScene
      if (this.modalReady && this.currentScene && this.currentScene.resolve && this.currentScene.handleTouch) {
        this.currentScene.handleTouch(this.touchStartX, this.touchStartY);
        return;
      }
      if (this.currentScene && this.currentScene.handleTouch) {
        this.currentScene.handleTouch(this.touchStartX, this.touchStartY);
      }
    });

    // 触摸移动事件
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.isTouching) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      // 弹窗不处理move
      if (this.currentScene && this.currentScene.resolve) return;
      if (this.currentScene && this.currentScene.handleTouchMove) {
        this.currentScene.handleTouchMove(touch.clientX, touch.clientY, deltaX, deltaY);
      }
    });

    // 触摸结束事件
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isTouching = false;
      // 弹窗不处理end
      if (this.currentScene && this.currentScene.resolve) return;
      if (this.currentScene && this.currentScene.handleTouchEnd) {
        this.currentScene.handleTouchEnd();
      }
    });

    // 窗口大小变化事件
    wx.onWindowResize(() => {
      this.handleResize();
    });
  }

  start() {
    this.isRunning = true;
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
  }

  gameLoop() {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // 更新当前场景
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(deltaTime);
    }

    // 渲染当前场景
    this.render();

    // 继续游戏循环
    requestAnimationFrame(() => this.gameLoop());
  }

  render() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 渲染当前场景
    if (this.currentScene && this.currentScene.render) {
      this.currentScene.render(this.ctx);
    }
  }

  switchScene(sceneName, params = {}) {
    // 销毁当前场景
    if (this.currentScene && this.currentScene.destroy) {
      this.currentScene.destroy();
    }
    // 切换到新场景
    const newScene = this.scenes[sceneName];
    if (newScene) {
      this.currentScene = newScene;
      // 初始化场景参数
      if (this.currentScene.init && params) {
        this.currentScene.init(params);
      }
      // 清理控制台日志，防止旧场景日志残留
      // if (typeof console.clear === 'function') {
      //   console.clear();
      // }
    } else {
      console.error(`Scene ${sceneName} not found`);
    }
  }

  handleResize() {
    // 重新获取设备信息
    this.device = new DeviceAdapter();
    
    // 更新canvas尺寸
    this.canvas.width = this.device.screenWidth * this.device.pixelRatio;
    this.canvas.height = this.device.screenHeight * this.device.pixelRatio;
    this.ctx.scale(this.device.pixelRatio, this.device.pixelRatio);
    
    // 通知当前场景
    if (this.currentScene && this.currentScene.handleResize) {
      this.currentScene.handleResize();
    }
  }

  // 获取设备信息
  getDeviceInfo() {
    return this.device.getDeviceInfo();
  }

  // 获取存储管理器
  getStorage() {
    return this.storage;
  }

  // 获取音频管理器
  getAudio() {
    return this.audio;
  }

  // 显示提示信息
  showToast(title, icon = 'none', duration = 2000) {
    wx.showToast({
      title: title,
      icon: icon,
      duration: duration
    });
  }

  // 显示确认对话框
  showModal(title, content, showCancel = true) {
    return new Promise((resolve) => {
      wx.showModal({
        title: title,
        content: content,
        showCancel: showCancel,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  }

  // 分享游戏
  shareGame() {
    wx.shareAppMessage({
      title: '智慧切割 - 挑战你的解谜能力！',
      imageUrl: 'images/share.jpg'
    });
  }

  // 退出游戏
  exitGame() {
    this.stop();
    wx.exitMiniProgram();
  }
}

// 启动游戏
const game = new SmartCutGame();

// 导出游戏实例
module.exports = game; 