// 暂停场景
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

class PauseScene {
  constructor(game, params = {}) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio; // 使用全局唯一音频实例
    this.snapshot = params.snapshot || null; // 保存快照
    
    // 暂停数据
    this.currentLevel = 1;
    this.gameTime = 0;
    
    // UI元素
    this.modal = null;
    this.title = null;
    this.buttons = [];
    this.resumeButton = null;
    
    this.init(params);
  }

  init(params = {}) {
    this.currentLevel = params.level || 1;
    let time = (params.time !== undefined ? params.time : params.elapsedTime) || 0;
    if (time > 1000) time = Math.round(time / 1000);
    this.gameTime = time;
    if (params.snapshot) this.snapshot = params.snapshot;
    this.createUI();
  }

  createUI() {
    const centerX = this.device.screenWidth / 2;
    const centerY = this.device.screenHeight / 2;
    
    // 创建模态框
    this.modal = {
      x: centerX - this.device.adaptSize(150),
      y: centerY - this.device.adaptSize(180),
      width: this.device.adaptSize(300),
      height: this.device.adaptSize(360),
      color: '#FFFFFF',
      borderColor: '#4A90E2'
    };
    
    // 创建标题
    this.title = {
      x: centerX,
      y: centerY - this.device.adaptSize(120),
      text: '游戏暂停',
      fontSize: this.device.adaptFontSize(20),
      color: '#4A90E2'
    };
    
    // 创建按钮
    const buttonWidth = this.device.adaptSize(200);
    const buttonHeight = this.device.adaptSize(45);
    const buttonSpacing = this.device.adaptSize(15);
    const startY = centerY - this.device.adaptSize(60);
    
    this.buttons = [
      {
        x: centerX - buttonWidth / 2,
        y: startY,
        width: buttonWidth,
        height: buttonHeight,
        text: '继续游戏',
        color: '#4A90E2',
        bgColor: '#4A90E2',
        textColor: '#FFFFFF',
        action: () => this.resumeGame()
      },
      {
        x: centerX - buttonWidth / 2,
        y: startY + buttonHeight + buttonSpacing,
        width: buttonWidth,
        height: buttonHeight,
        text: '重新开始',
        color: '#4A90E2',
        bgColor: '#FFFFFF',
        textColor: '#4A90E2',
        action: () => this.restartGame()
      },
      {
        x: centerX - buttonWidth / 2,
        y: startY + (buttonHeight + buttonSpacing) * 2,
        width: buttonWidth,
        height: buttonHeight,
        text: '返回主菜单',
        color: '#FF6B6B',
        bgColor: '#FFFFFF',
        textColor: '#FF6B6B',
        action: () => this.goToMainMenu()
      }
    ];
    
    // 创建关闭按钮
    const closeButtonSize = this.device.adaptSize(40);
    this.closeButton = {
      x: this.modal.x + this.modal.width - closeButtonSize - this.device.adaptSize(10),
      y: this.modal.y + this.device.adaptSize(10),
      width: closeButtonSize,
      height: closeButtonSize,
      text: '×',
      color: '#00C0FF',
      bgColor: '#F0F0F0',
      textColor: '#00C0FF',
      action: () => this.resumeGame()
    };
  }

  update() {
    // 暂停场景不需要复杂的更新逻辑
  }

  render(ctx) {
    // 1. 绘制统一的渐变背景
    this.drawUnifiedBackground(ctx);
    
    // 2. 绘制暂停弹窗UI
    this.drawModal(ctx);
    this.drawTitle(ctx);
    this.drawGameInfo(ctx);
    this.drawButtons(ctx);
    this.drawCloseButton(ctx);
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

  drawTitle(ctx) {
    ctx.fillStyle = this.title.color;
    ctx.font = `bold ${this.title.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title.text, this.title.x, this.title.y);
  }

  drawGameInfo(ctx) {
    const centerX = this.device.screenWidth / 2;
    const infoY = this.title.y + this.device.adaptSize(40);
    // 绘制关卡信息
    ctx.fillStyle = '#4A90E2';
    ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`关卡 ${this.currentLevel}`, centerX, infoY);
    // 绘制游戏时间（时分秒格式）
    let t = this.gameTime;
    const h = Math.floor(t / 3600);
    t = t % 3600;
    const m = Math.floor(t / 60);
    const s = t % 60;
    let timeStr = '';
    if (h > 0) timeStr += h + '小时';
    if (m > 0 || h > 0) timeStr += m + '分';
    timeStr += s + '秒';
    ctx.fillStyle = '#666666';
    ctx.font = `${this.device.adaptFontSize(14)}px Arial`;
    ctx.fillText(`游戏时间: ${timeStr}`, centerX, infoY + this.device.adaptSize(25));
  }

  drawButtons(ctx) {
    const centerX = this.device.screenWidth / 2;
    const buttonHeight = this.device.adaptSize(44);
    const btnSpacing = this.device.adaptSize(20);
    const btnY1 = this.modal.y + this.device.adaptSize(120) + buttonHeight / 2;
    const buttonWidth = this.device.adaptSize(180);
    // 继续游戏按钮
    ctx.fillStyle = '#4A90E2';
    drawRoundRect(ctx, centerX - buttonWidth / 2, btnY1, buttonWidth, buttonHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('继续游戏', centerX, btnY1 + buttonHeight / 2);
    // 重新开始按钮
    const btnY2 = btnY1 + buttonHeight + btnSpacing;
    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, centerX - buttonWidth / 2, btnY2, buttonWidth, buttonHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4A90E2';
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.fillText('重新开始', centerX, btnY2 + buttonHeight / 2);
    // 返回主菜单按钮
    const btnY3 = btnY2 + buttonHeight + btnSpacing;
    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, centerX - buttonWidth / 2, btnY3, buttonWidth, buttonHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FF6B6B';
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.fillText('返回主菜单', centerX, btnY3 + buttonHeight / 2);
  }

  drawCloseButton(ctx) {
    // 绘制关闭按钮背景
    ctx.fillStyle = this.closeButton.bgColor;
    ctx.beginPath();
    ctx.arc(
      this.closeButton.x + this.closeButton.width / 2,
      this.closeButton.y + this.closeButton.height / 2,
      this.closeButton.width / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // 绘制关闭按钮边框
    ctx.strokeStyle = this.closeButton.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制关闭按钮文字
    ctx.fillStyle = this.closeButton.textColor;
    ctx.font = `bold ${this.device.adaptFontSize(20)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.closeButton.text,
      this.closeButton.x + this.closeButton.width / 2,
      this.closeButton.y + this.closeButton.height / 2
    );
  }

  handleTouch(x, y) {
    // 检查关闭按钮
    if (this.isPointInCircle(x, y, this.closeButton)) {
      this.audio.playButtonSound();
      this.closeButton.action();
      return;
    }
    // 按钮区域参数
    const centerX = this.device.screenWidth / 2;
    const buttonWidth = this.device.adaptSize(180);
    const buttonHeight = this.device.adaptSize(44);
    const btnSpacing = this.device.adaptSize(20);
    const btnY1 = this.modal.y + this.device.adaptSize(120) + buttonHeight / 2;
    const btnY2 = btnY1 + buttonHeight + btnSpacing;
    const btnY3 = btnY2 + buttonHeight + btnSpacing;
    // 继续游戏
    if (x >= centerX - buttonWidth / 2 && x <= centerX + buttonWidth / 2 && y >= btnY1 && y <= btnY1 + buttonHeight) {
      this.audio.playButtonSound();
      this.resumeGame();
      return;
    }
    // 重新开始
    if (x >= centerX - buttonWidth / 2 && x <= centerX + buttonWidth / 2 && y >= btnY2 && y <= btnY2 + buttonHeight) {
      this.audio.playButtonSound();
      this.restartGame();
      return;
    }
    // 返回主菜单
    if (x >= centerX - buttonWidth / 2 && x <= centerX + buttonWidth / 2 && y >= btnY3 && y <= btnY3 + buttonHeight) {
      this.audio.playButtonSound();
      this.goToMainMenu();
      return;
    }
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  isPointInCircle(x, y, circle) {
    const centerX = circle.x + circle.width / 2;
    const centerY = circle.y + circle.height / 2;
    const radius = circle.width / 2;
    
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    return distance <= radius;
  }

  resumeGame() {
    // 只传递快照参数，由 GameScene.init 统一处理
    if (this.snapshot) {
      this.game.switchScene('game', { resumeFromSnapshot: true, snapshot: this.snapshot });
      return;
    }
    // 兼容无快照时的老逻辑
    this.game.switchScene('game', { 
      level: this.currentLevel,
      resumeTime: this.gameTime
    });
  }

  restartGame() {
    // 重新开始当前关卡
    this.game.switchScene('game', { level: this.currentLevel });
  }

  goToMainMenu() {
    // 显示确认对话框
    this.game.showModal('提示', '确定要返回主菜单吗？当前游戏进度将丢失。').then(confirm => {
      if (confirm) {
        this.game.switchScene('mainMenu');
      }
    });
  }

  destroy() {
    if (this.audio && typeof this.audio.stopMusic === 'function') {
      this.audio.stopMusic();
    }
    this.modal = null;
    this.title = null;
    this.buttons = [];
    this.closeButton = null;
  }
}

module.exports = PauseScene; 