// 游戏主入口文件
const global = require('./libs/weapp-adapter');
const DeviceAdapter = require('./utils/device');
const StorageManager = require('./utils/storage');
const AudioManager = require('./utils/audio');
const LoadingScene = require('./scenes/loading-scene');
const MainMenuScene = require('./scenes/main-menu');

// 分包场景名列表
const SUBPACKAGE_SCENES = [
  'levelSelect', 'game', 'revive', 'result', 'settings', 'pause', 'help'
];

class SmartCutGame {
  constructor() {
    this.canvas = global.canvas;
    this.ctx = global.context;
    this.device = new DeviceAdapter();
    this.storage = new StorageManager();
    this.audio = new AudioManager(this);
    // 游戏状态
    this.currentScene = null;
    this.scenes = {};
    this.sceneClasses = {
      loading: LoadingScene,
      mainMenu: MainMenuScene,
      // 其余场景动态 require
    };
    this.isRunning = false;
    this.lastTime = 0;
    
    // 触摸事件
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouching = false;
    
    this.init();
  }

  init() {
    this.scenes = {
      loading: new this.sceneClasses.loading(this)
    };
    this.switchScene('loading');
    this.bindEvents();
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
    wx.onTouchStart((e) => {
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
    wx.onTouchMove((e) => {
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
    wx.onTouchEnd((e) => {
      this.isTouching = false;
      if (this.currentScene && this.currentScene.handleTouchEnd) {
        this.currentScene.handleTouchEnd();
      }
    });

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

  async switchScene(sceneName, params = {}) {
    // 销毁当前场景
    if (this.currentScene && this.currentScene.destroy) {
      this.currentScene.destroy();
    }
    // 分包场景动态加载
    if (SUBPACKAGE_SCENES.includes(sceneName)) {
      // 若分包未加载，先加载分包
      if (!this._subpackageLoaded) {
        await new Promise((resolve, reject) => {
          wx.loadSubpackage({
            name: 'assets',
            success: () => {
              this._subpackageLoaded = true;
              resolve();
            },
            fail: (err) => {
              this.showModal('错误', '资源包加载失败，请检查网络后重试。').then(() => {
                this.exitGame();
              });
              reject(err);
            }
          });
        });
      }
      // 动态 require 场景
      if (!this.sceneClasses[sceneName]) {
        switch (sceneName) {
          case 'levelSelect':
            this.sceneClasses.levelSelect = require('../subpackages/assets/scenes/level-select'); break;
          case 'game':
            this.sceneClasses.game = require('../subpackages/assets/scenes/game-scene'); break;
          case 'revive':
            this.sceneClasses.revive = require('../subpackages/assets/scenes/revive-scene'); break;
          case 'result':
            this.sceneClasses.result = require('../subpackages/assets/scenes/result-scene'); break;
          case 'settings':
            this.sceneClasses.settings = require('../subpackages/assets/scenes/settings-scene'); break;
          case 'pause':
            this.sceneClasses.pause = require('../subpackages/assets/scenes/pause-scene'); break;
          case 'help':
            this.sceneClasses.help = require('../subpackages/assets/scenes/help-scene'); break;
        }
      }
      if (!this.scenes[sceneName]) {
        const SceneClass = this.sceneClasses[sceneName];
        if (SceneClass) {
          this.scenes[sceneName] = new SceneClass(this);
        } else {
          console.error(`Scene class for ${sceneName} not found`);
          return;
        }
      }
      this.currentScene = this.scenes[sceneName];
      if (this.currentScene.init && params) {
        this.currentScene.init(params);
      }
      return;
    }
    // 主包场景同步 require
    if (!this.scenes[sceneName]) {
      const SceneClass = this.sceneClasses[sceneName];
      if (SceneClass) {
        this.scenes[sceneName] = new SceneClass(this);
      } else {
        console.error(`Scene class for ${sceneName} not found`);
        return;
      }
    }
    this.currentScene = this.scenes[sceneName];
    if (this.currentScene.init && params) {
      this.currentScene.init(params);
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
      title: '切割投喂大作战 - 挑战你的思维能力！',
      imageUrl: 'subpackages/assets/images/menu-background.png'
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