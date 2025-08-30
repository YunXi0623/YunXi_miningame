// 复活场景
const DeviceAdapter = require('../utils/device');
const AudioManager = require('../utils/audio');
const AdManager = require('../utils/ad-manager');

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

class ReviveScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio;
    
    // 游戏状态
    this.currentLevel = 1;
    
    // UI元素
    this.modal = null;
    this.reviveButton = null;
    this.closeButton = null;
    
    // 触摸状态管理
    this.isProcessingTouch = false;
    
    // 注意：不再自动调用this.init();
  }

  init(params = {}) {
    this.currentLevel = params.level || 1;
    
    // 创建UI
    this.createUI();
    
    // 确保广告管理器已初始化（如果还没初始化的话）
    if (!AdManager.isAvailable()) {
      AdManager.init();
    }
    
    // 显示复活弹窗
    this.showRevivePopup();
  }

  createUI() {
    // 创建复活弹窗
    this.modal = {
      x: this.device.screenWidth * 0.1,
      y: this.device.screenHeight * 0.2,
      width: this.device.screenWidth * 0.8,
      height: this.device.screenHeight * 0.6,
      visible: true
    };

    // 创建复活按钮
    this.reviveButton = {
      x: this.device.screenWidth * 0.2,
      y: this.device.screenHeight * 0.45,
      width: this.device.screenWidth * 0.6,
      height: this.device.adaptSize(60),
      text: '立即观看广告',
      bgColor: '#FF6B6B',
      color: '#FF6B6B',
      textColor: '#FFFFFF',
      visible: true
    };

    // 创建关闭按钮
    this.closeButton = {
      x: this.device.screenWidth * 0.2,
      y: this.device.screenHeight * 0.55,
      width: this.device.screenWidth * 0.6,
      height: this.device.adaptSize(50),
      text: '放弃复活',
      bgColor: '#6C757D',
      color: '#6C757D',
      textColor: '#FFFFFF',
      visible: true
    };
  }

  showRevivePopup() {
    // 弹窗默认就是显示的，这里可以添加一些动画效果
  }

  hideRevivePopup() {
    // 隐藏弹窗，准备返回游戏
  }

  // 处理触摸事件
  handleTouch(x, y) {
    // 防止重复处理触摸事件
    if (this.isProcessingTouch) {
      return false;
    }
    
    // 检查复活按钮点击
    if (this.isPointInButton(x, y, this.reviveButton) && this.reviveButton.visible) {
      this.isProcessingTouch = true;
      this.onReviveButtonClick();
      // 延迟重置触摸状态，防止快速重复点击
      setTimeout(() => {
        this.isProcessingTouch = false;
      }, 1000);
      return true;
    }

    // 检查关闭按钮点击
    if (this.isPointInButton(x, y, this.closeButton) && this.closeButton.visible) {
      this.isProcessingTouch = true;
      this.onCloseButtonClick();
      // 延迟重置触摸状态
      setTimeout(() => {
        this.isProcessingTouch = false;
      }, 1000);
      return true;
    }

    return false;
  }

  // 复活按钮点击事件
  onReviveButtonClick() {
    // 直接尝试播放广告
    this.tryPlayAd();
  }

  // 尝试播放广告（新增方法）
  tryPlayAd() {
    // 先强制重置广告状态，防止状态卡死
    if (AdManager.forceReset) {
      AdManager.forceReset();
    }
    
    // 显示加载提示
    wx.showToast({ title: '正在加载广告...', icon: 'loading', duration: 2000 });

    // 调用广告管理器，并传入成功和失败的回调函数
    AdManager.show({
      onSuccess: () => {
        // 这是广告观看成功后要执行的逻辑
        this.hideRevivePopup();
        this.grantRevive();
      },
      onFail: () => {
        // 这是广告中途退出或加载失败后要执行的逻辑
        wx.showToast({ 
          title: '需要观看完整视频才能复活哦', 
          icon: 'none',
          duration: 3000  // 设置toast显示3秒后消失
        });
      }
    });
  }

  // 关闭按钮点击事件
  onCloseButtonClick() {
    this.hideRevivePopup();
    
    // 重置关卡进度（只在用户放弃复活时）
    this.resetGameProgress();
    
    this.endGame();
  }

  // 重置游戏关卡进度（新增方法）
  resetGameProgress() {
    try {
      // 调用存储管理器重置关卡进度
      if (this.game && this.game.storage && typeof this.game.storage.resetLevelProgress === 'function') {
        this.game.storage.resetLevelProgress();
      } else {
        console.warn('[ReviveScene] 存储管理器不可用，无法重置关卡进度');
      }
    } catch (error) {
      console.error('[ReviveScene] 重置关卡进度时发生错误:', error);
      // 即使重置失败，也不影响游戏流程，继续执行
    }
  }

  // 执行复活逻辑
  grantRevive() {
    // 返回游戏场景，并传递复活信息
    this.game.switchScene('game', {
      level: this.currentLevel,
      action: 'revive',
      timestamp: Date.now()
    });
  }

  // 游戏正式结束
  endGame() {
    // 返回游戏主页，而不是结算页面
    this.game.switchScene('mainMenu', {
      action: 'gameOver',
      level: this.currentLevel
    });
  }

  // 检查点是否在按钮内
  isPointInButton(x, y, button) {
    const inButton = x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
    
    return inButton;
  }

  // 绘制场景
  draw(ctx) {
    // 绘制深蓝色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.device.screenWidth, this.device.screenHeight);

    // 绘制弹窗背景
    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, this.modal.x, this.modal.y, this.modal.width, this.modal.height, 20);
    ctx.fill();

    // 绘制弹窗边框
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 3;
    drawRoundRect(ctx, this.modal.x, this.modal.y, this.modal.width, this.modal.height, 20);
    ctx.stroke();

    // 绘制标题
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${this.device.adaptFontSize(24)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏失败', this.modal.x + this.modal.width / 2, this.modal.y + this.device.adaptSize(80));

    // 绘制提示文案
    ctx.fillStyle = '#666666';
    ctx.font = `${this.device.adaptFontSize(16)}px Arial`;
    ctx.fillText('观看广告即可免费复活', this.modal.x + this.modal.width / 2, this.modal.y + this.device.adaptSize(120));

    // 绘制按钮
    this.drawButton(ctx, this.reviveButton);
    this.drawButton(ctx, this.closeButton);
  }

  // 添加render方法，兼容主游戏的渲染循环
  render(ctx) {
    this.draw(ctx);
  }

  // 绘制按钮
  drawButton(ctx, button) {
    if (!button.visible) return;

    // 绘制按钮背景
    ctx.fillStyle = button.bgColor;
    drawRoundRect(ctx, button.x, button.y, button.width, button.height, 12);
    ctx.fill();

    // 绘制按钮边框
    ctx.strokeStyle = button.color;
    ctx.lineWidth = 2;
    drawRoundRect(ctx, button.x, button.y, button.width, button.height, 12);
    ctx.stroke();

    // 绘制按钮文字
    ctx.fillStyle = button.textColor;
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
  }

  // 销毁场景
  destroy() {
    // 清理资源
    this.modal = null;
    this.reviveButton = null;
    this.closeButton = null;
    this.isProcessingTouch = false;
  }
}

module.exports = ReviveScene; 