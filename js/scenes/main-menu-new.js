// 主菜单场景
const DeviceAdapter = require('../utils/device');
const AudioManager = require('../utils/audio');
const GameCircleConfig = require('../config/game-circle-config');

// 兼容微信小游戏的圆角矩形绘制函数
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

class MainMenuScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio; // 使用全局唯一音频实例
    
    // UI元素
    this.buttons = [];

    this.title = null;
    
    // 预加载背景图
    this._backgroundImg = null;
    
    this.isTouching = false; // 全局触摸状态
    this.init();
  }

  init() {
    if (typeof wx !== 'undefined' && wx.createImage && !this._backgroundImg) {
      this._backgroundImg = wx.createImage();
      this._backgroundImg.src = 'images/menu-background.png';
    }
    // 每次进入主页都播放主界面音乐
    this.audio.playMusic('main');
    const centerX = this.device.screenWidth / 2;
    const centerY = this.device.screenHeight / 2;
    
    // 创建标题
    this.title = {
      x: centerX,
      y: this.device.adaptSize(250), // 距顶部250px，居中
      text: '切割投喂大作战',
      fontSize: this.device.adaptFontSize(26),
      color:'#FFFFFF'
    };
    
    // 创建按钮
    const buttonWidth = this.device.adaptSize(200);
    const buttonHeight = this.device.adaptSize(50);
    const buttonSpacing = this.device.adaptSize(20);
    
    // 计算网格布局参数
    const gridColumns = 2;  // 2列
    const gridRows = 3;     // 3行
    const totalButtonWidth = buttonWidth * gridColumns + buttonSpacing * (gridColumns - 1);
    const totalButtonHeight = buttonHeight * gridRows + buttonSpacing * (gridRows - 1);
    
    // 计算网格起始位置（确保整体居中）
    const gridStartX = centerX - totalButtonWidth / 2;
    const gridStartY = centerY - totalButtonHeight / 2;
    
    // 定义所有按钮配置
    const buttonConfigs = [
      { text: '开始游戏', color: '#4A90E2', bgColor: '#4A90E2', textColor: '#FFFFFF', action: () => this.startGame() },
      { text: '选择关卡', color: '#4A90E2', bgColor: '#FFFFFF', textColor: '#4A90E2', action: () => this.selectLevel() },
      { text: '游戏设置', color: '#4A90E2', bgColor: '#FFFFFF', textColor: '#4A90E2', action: () => this.openSettings() },
      { text: '帮助说明', color: '#4A90E2', bgColor: '#FFFFFF', textColor: '#4A90E2', action: () => this.showHelp() },
      { text: '游戏分享', color: '#4A90E2', bgColor: '#FFFFFF', textColor: '#4A90E2', action: () => this.shareGame() }
    ];
    
    // 如果游戏圈功能启用，添加游戏圈按钮配置
    if (GameCircleConfig.isEnabled() && GameCircleConfig.features.showButton) {
      const buttonStyle = GameCircleConfig.getButtonStyle();
      buttonConfigs.push({
        text: buttonStyle.text,
        color: buttonStyle.color,
        bgColor: buttonStyle.bgColor,
        textColor: buttonStyle.textColor,
        action: () => this.openGameCircle()
      });
    }
    
    // 创建按钮数组
    this.buttons = [];
    
    // 使用网格布局创建按钮
    buttonConfigs.forEach((config, index) => {
      const row = Math.floor(index / gridColumns);      // 行索引
      const col = index % gridColumns;                  // 列索引
      
      const button = {
        x: gridStartX + col * (buttonWidth + buttonSpacing),
        y: gridStartY + row * (buttonHeight + buttonSpacing),
        width: buttonWidth,
        height: buttonHeight,
        text: config.text,
        color: config.color,
        bgColor: config.bgColor,
        textColor: config.textColor,
        action: config.action
      };
      
      this.buttons.push(button);
    });
  }

  update() {
    // 主菜单场景不需要复杂的更新逻辑
  }

  render(ctx) {
    // 绘制背景
    this.drawBackground(ctx);
    
    // 绘制标题
    this.drawTitle(ctx);
    
    // 绘制按钮
    this.drawButtons(ctx);
  }

  drawBackground(ctx) {
    // 尝试绘制背景图
    if (this._backgroundImg && this._backgroundImg.complete && this._backgroundImg.naturalWidth > 0) {
      // 背景图已加载完成，绘制背景图
      const img = this._backgroundImg;
      const screenWidth = this.device.screenWidth;
      const screenHeight = this.device.screenHeight;
      
      // 计算背景图的缩放和位置，确保覆盖整个屏幕
      const imgAspectRatio = img.naturalWidth / img.naturalHeight;
      const screenAspectRatio = screenWidth / screenHeight;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgAspectRatio > screenAspectRatio) {
        // 图片更宽，以高度为准
        drawHeight = screenHeight;
        drawWidth = screenHeight * imgAspectRatio;
        drawX = (screenWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        // 图片更高，以宽度为准
        drawWidth = screenWidth;
        drawHeight = screenWidth / imgAspectRatio;
        drawX = 0;
        drawY = (screenHeight - drawHeight) / 2;
      }
      
      // 绘制背景图
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    } else {
      // 背景图未加载或加载失败，使用渐变背景作为兜底
      const gradient = ctx.createLinearGradient(0, 0, 0, this.device.screenHeight);
      gradient.addColorStop(0, '#F5F7FA');
      gradient.addColorStop(1, '#E8ECF1');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.device.screenWidth, this.device.screenHeight);
    }
  }

  drawTitle(ctx) {
    if (!this.title) return;
    ctx.fillStyle = this.title.color;
    ctx.font = `bold ${this.title.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title.text, this.title.x, this.title.y);
  }

  drawButtons(ctx) {
    this.buttons.forEach((button) => {
      ctx.save();
      ctx.globalAlpha = 1; // 所有按钮全亮
      // 绘制按钮背景
      ctx.fillStyle = button.bgColor;
      drawRoundRect(ctx, button.x, button.y, button.width, button.height, 12);
      ctx.fill();
      // 绘制按钮边框
      ctx.strokeStyle = button.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // 绘制按钮文字
      ctx.fillStyle = button.textColor;
      ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        button.text,
        button.x + button.width / 2,
        button.y + button.height / 2
      );
      ctx.restore();
    });
  }

  handleTouch(x, y) {
    // 只在点击到按钮时触发action
    this.buttons.forEach(button => {
      if (this.isPointInButton(x, y, button)) {
        this.audio.playButtonSound();
        button.action();
      }
    });
  }

  handleTouchEnd() {
    // 不再处理全局高亮
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  startGame() {
    // 获取当前关卡或从第1关开始
    const currentLevel = this.game.storage.getCurrentLevel();
    this.game.switchScene('game', { level: currentLevel });
  }

  selectLevel() {
    this.game.switchScene('levelSelect');
  }

  openSettings() {
    this.game.switchScene('settings');
  }

  showHelp() {
    this.game.switchScene('help');
  }

  shareGame() {
    // 调用游戏的分享方法
    if (this.game && this.game.shareGame) {
      this.game.shareGame();
    } else {
      // 兜底方案：直接调用微信分享
      wx.shareAppMessage({
        title: '切割投喂大作战 - 挑战你的思维能力！',
        imageUrl: 'images/menu-background.png'
      });
    }
  }

  openGameCircle() {
    // 获取游戏圈首页链接
    const gameCircleLink = GameCircleConfig.getHomePageLink();
    
    // 使用wx.createPageManager打开游戏圈
    wx.createPageManager({
      openlink: gameCircleLink,
      success: (res) => {
        console.log('游戏圈打开成功');
        // 可以添加成功提示
        if (this.game && this.game.showToast) {
          this.game.showToast('游戏圈打开成功');
        }
      },
      fail: (err) => {
        console.error('游戏圈打开失败:', err);
        // 添加失败提示
        if (this.game && this.game.showToast) {
          this.game.showToast('游戏圈打开失败，请稍后重试');
        }
      }
    });
  }

  destroy() {
    if (this.audio && typeof this.audio.stopMusic === 'function') {
      this.audio.stopMusic();
    }
    // 离开主菜单时停止主界面音乐
    this.audio.stopMusic();
    this.buttons = [];

    this.title = null;
  }
}

module.exports = MainMenuScene;
