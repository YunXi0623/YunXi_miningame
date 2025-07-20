// 复活场景
const DeviceAdapter = require('../utils/device');
const AudioManager = require('../utils/audio');

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
    this.hasPlayedReviveSound = false; // 标记音效是否已播放
    
    // 复活状态
    this.currentLevel = 1;
    this.adDuration = 15; // 广告时长（秒）
    this.countdown = this.adDuration;
    this.isAdPlaying = false;
    this.adVideo = null;
    
    // UI元素
    this.modal = null;
    this.reviveButton = null;
    this.countdownText = null;
    this.adPlaceholder = null;
    // 注意：不再自动调用this.init();
  }

  init(params = {}) {
    this.currentLevel = params.level || 1;
    this.countdown = this.adDuration;
    this.isAdPlaying = false;
    this.hasPlayedReviveSound = false; // 每次进入复活界面重置
    
    // 清理可能存在的旧广告实例
    if (this.adVideo) {
      this.adVideo.offLoad();
      this.adVideo.offError();
      this.adVideo.offClose();
      this.adVideo.destroy();
      this.adVideo = null;
    }
    
    // 创建UI
    this.createUI();
    
    // 开始播放广告
    this.startAd();
  }

  createUI() {
    const centerX = this.device.screenWidth / 2;
    const centerY = this.device.screenHeight / 2;
    
    // 创建模态框
    this.modal = {
      x: centerX - this.device.adaptSize(150),
      y: centerY - this.device.adaptSize(200),
      width: this.device.adaptSize(300),
      height: this.device.adaptSize(400),
      color: '#FFFFFF',
      borderColor: '#FF6B6B'
    };
    
    // 广告占位符
    this.adPlaceholder = {
      x: centerX - this.device.adaptSize(120),
      y: centerY - this.device.adaptSize(40), // 上移一点
      width: this.device.adaptSize(240),
      height: this.device.adaptSize(80)
    };
    
    // 倒计时文本（大号字体，广告区下方40px）
    this.countdownText = {
      x: centerX,
      y: this.adPlaceholder.y + this.adPlaceholder.height + this.device.adaptSize(40),
      fontSize: this.device.adaptFontSize(36),
      color: '#FF6B6B'
    };
    
    // 复活按钮（倒计时下方50px）
    const buttonWidth = this.device.adaptSize(200);
    const buttonHeight = this.device.adaptSize(50);
    this.reviveButton = {
      x: centerX - buttonWidth / 2,
      y: this.countdownText.y + this.device.adaptSize(50),
      width: buttonWidth,
      height: buttonHeight,
      text: '立即复活',
      color: '#FF6B6B',
      bgColor: '#FF6B6B',
      textColor: '#FFFFFF',
      action: () => this.revive()
    };
  }

  update(deltaTime) {
    if (this.isAdPlaying) {
      // 更新倒计时
      this.countdown -= deltaTime / 1000;
      
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.adComplete();
      }
    }
  }

  render(ctx) {
    // 绘制统一的渐变背景
    this.drawUnifiedBackground(ctx);
    
    // 绘制模态框
    this.drawModal(ctx);
    
    // 绘制复活图标
    this.drawReviveIcon(ctx);
    
    // 绘制标题
    this.drawTitle(ctx);
    
    // 绘制广告占位符
    this.drawAdPlaceholder(ctx);
    
    // 绘制倒计时
    this.drawCountdown(ctx);
    
    // 绘制复活按钮
    this.drawReviveButton(ctx);
  }
  
  // 新增：绘制统一的渐变背景
  drawUnifiedBackground(ctx) {
    // 创建渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, this.device.screenHeight);
    gradient.addColorStop(0, '#4A90E2');  // 游戏主色调
    gradient.addColorStop(1, '#2C5AA0');  // 深蓝色
    
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.device.screenWidth, this.device.screenHeight);
    
    // 添加半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.device.screenWidth, this.device.screenHeight);
    ctx.restore();
  }

  drawModal(ctx) {
    // 绘制模态框背景
    ctx.fillStyle = this.modal.color;
    drawRoundRect(
      ctx,
      this.modal.x,
      this.modal.y,
      this.modal.width,
      this.modal.height,
      20
    );
    ctx.fill();
    
    // 绘制边框
    ctx.strokeStyle = this.modal.borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  drawReviveIcon(ctx) {
    const centerX = this.device.screenWidth / 2;
    const iconY = this.modal.y + this.device.adaptSize(40);
    const iconSize = this.device.adaptSize(60);
    
    // 绘制闪电图标背景
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(centerX, iconY, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制闪电符号
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${this.device.adaptFontSize(24)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', centerX, iconY);
  }

  drawTitle(ctx) {
    const centerX = this.device.screenWidth / 2;
    const titleY = this.modal.y + this.device.adaptSize(120);
    
    // 绘制主标题
    ctx.fillStyle = '#FF6B6B';
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('关卡失败', centerX, titleY);
    
    // 绘制副标题
    ctx.fillStyle = '#666666';
    ctx.font = `${this.device.adaptFontSize(14)}px Arial`;
    ctx.fillText('观看广告免费复活', centerX, titleY + this.device.adaptSize(30));
  }

  drawAdPlaceholder(ctx) {
    // 绘制广告占位符背景
    const gradient = ctx.createLinearGradient(
      this.adPlaceholder.x,
      this.adPlaceholder.y,
      this.adPlaceholder.x + this.adPlaceholder.width,
      this.adPlaceholder.y + this.adPlaceholder.height
    );
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(1, '#FF6B6B');
    
    ctx.fillStyle = gradient;
    drawRoundRect(
      ctx,
      this.adPlaceholder.x,
      this.adPlaceholder.y,
      this.adPlaceholder.width,
      this.adPlaceholder.height,
      12
    );
    ctx.fill();
    
    // 绘制广告文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '广告播放中...',
      this.adPlaceholder.x + this.adPlaceholder.width / 2,
      this.adPlaceholder.y + this.adPlaceholder.height / 2
    );
  }

  drawCountdown(ctx) {
    ctx.fillStyle = this.countdownText.color;
    ctx.font = `bold ${this.countdownText.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      Math.ceil(this.countdown).toString(),
      this.countdownText.x,
      this.countdownText.y
    );
  }

  drawReviveButton(ctx) {
    // 绘制按钮背景
    ctx.fillStyle = this.reviveButton.bgColor;
    drawRoundRect(
      ctx,
      this.reviveButton.x,
      this.reviveButton.y,
      this.reviveButton.width,
      this.reviveButton.height,
      12
    );
    ctx.fill();
    
    // 绘制按钮文字
    ctx.fillStyle = this.reviveButton.textColor;
    ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.reviveButton.text,
      this.reviveButton.x + this.reviveButton.width / 2,
      this.reviveButton.y + this.reviveButton.height / 2
    );
  }

  handleTouch(x, y) {
    // 检查复活按钮
    if (this.isPointInButton(x, y, this.reviveButton)) {
      this.audio.playButtonSound();
      this.reviveButton.action();
    }
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  startAd() {
    this.isAdPlaying = true;
    this.countdown = this.adDuration;

    // 如果已有广告实例，先解绑并销毁
    if (this.adVideo) {
      this.adVideo.offLoad();
      this.adVideo.offError();
      this.adVideo.offClose();
      this.adVideo.destroy();
      this.adVideo = null;
    }

    // 创建激励视频广告
    this.adVideo = wx.createRewardedVideoAd({
      adUnitId: 'TODO_REPLACE_WITH_REAL_AD_UNIT_ID' // TODO: 替换为你的真实广告ID
    });

    // 监听广告加载完成
    this.adVideo.onLoad(() => {
      // 广告加载完成
    });

    // 监听广告错误
    this.adVideo.onError((err) => {
      this.isAdPlaying = false;
      if (this.game && this.game.showToast) {
        this.game.showToast('广告加载失败，请稍后重试');
      }
      this.adComplete();
    });

    // 监听广告关闭
    this.adVideo.onClose((res) => {
      if (res && res.isEnded) {
        // 正常播放结束，可以下发游戏奖励
        this.adComplete();
      } else {
        // 播放中途退出，不下发游戏奖励
        if (this.game && this.game.showToast) {
          this.game.showToast('完整观看广告才能复活哦');
        }
        this.adComplete();
      }
    });

    // 显示广告
    this.adVideo.show().catch(() => {
      // 失败重试
      this.adVideo.load()
        .then(() => this.adVideo.show())
        .catch(() => {
          this.isAdPlaying = false;
          if (this.game && this.game.showToast) {
            this.game.showToast('广告播放失败，请稍后重试');
          }
          this.adComplete();
        });
    });
  }

  adComplete() {
    this.isAdPlaying = false;
    this.countdown = 0;
    
    // 更新按钮状态
    this.reviveButton.text = '立即复活';
    this.reviveButton.bgColor = '#4A90E2';
    this.reviveButton.color = '#4A90E2';
  }

  revive() {
    if (this.isAdPlaying) {
      // 广告还在播放中，提示用户等待
      this.game.showToast('请等待广告播放完成');
      return;
    }
    
    // 增加复活次数统计
    this.game.storage.addReviveCount();
    
    // 移除音效播放逻辑
    this.game.switchScene('game', { level: this.currentLevel });
  }

  destroy() {
    // 销毁广告实例
    if (this.adVideo) {
      // 移除所有事件监听器
      this.adVideo.offLoad();
      this.adVideo.offError();
      this.adVideo.offClose();
      // 然后销毁实例
      this.adVideo.destroy();
      this.adVideo = null;
    }
    
    this.modal = null;
    this.reviveButton = null;
    this.countdownText = null;
    this.adPlaceholder = null;
  }
}

module.exports = ReviveScene; 