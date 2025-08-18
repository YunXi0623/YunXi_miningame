// 结算场景
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

class ResultScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio;

    
    // 结算数据
    this.level = 1;
    this.time = 0;
    this.success = true;
    this.stars = 3;
    this.bestTime = null;
    this.isNewRecord = false;
    
    // UI元素
    this.modal = null;
    this.resultIcon = null;
    this.buttons = [];
    this.starRating = [];
    
    this.init();
  }

  init(params = {}) {
    this.level = params.level || 1;
    this.time = params.time || 0;
    this.success = params.success || true;
    
    // 获取最佳成绩
    this.bestTime = this.game.storage.getBestScore(this.level);
    this.isNewRecord = this.bestTime === null || this.time < this.bestTime;
    
    // 计算星级
    this.calculateStars();
    
    // 检查是否所有关卡完成
    this.isAllLevelsCompleted = this.checkAllLevelsCompleted();
    
    // 创建UI
    this.createUI();
    

  }

  // 检查是否所有关卡完成
  checkAllLevelsCompleted() {
    for (let i = 1; i <= 9; i++) {
      if (!this.game.storage.isLevelCompleted(i)) {
        return false;
      }
    }
    return true;
  }

  calculateStars() {
    // 根据用时计算星级（1-5星）
    const timeInSeconds = this.time;
    
    if (timeInSeconds <= 30) {
      this.stars = 5;
    } else if (timeInSeconds <= 60) {
      this.stars = 4;
    } else if (timeInSeconds <= 120) {
      this.stars = 3;
    } else if (timeInSeconds <= 180) {
      this.stars = 2;
    } else {
      this.stars = 1;
    }
  }

  createUI() {
    const centerX = this.device.screenWidth / 2;
    const centerY = this.device.screenHeight / 2;
    const buttonHeight = this.device.adaptSize(44);
    // 创建模态框
    this.modal = {
      x: centerX - this.device.adaptSize(150),
      y: centerY - this.device.adaptSize(200),
      width: this.device.adaptSize(300),
      height: this.device.adaptSize(400) + buttonHeight / 2 + (this.isAllLevelsCompleted ? this.device.adaptSize(40) : 0),
      color: '#FFFFFF',
      borderColor: '#4A90E2'
    };
    
    // 创建结果图标
    this.resultIcon = {
      x: centerX,
      y: centerY - this.device.adaptSize(120),
      size: this.device.adaptSize(80),
      color: '#4A90E2'
    };
    
    // 创建星级评价
    this.starRating = [];
    const starSize = this.device.adaptSize(30);
    const starSpacing = this.device.adaptSize(10);
    const totalWidth = starSize * 5 + starSpacing * 4;
    const startX = centerX - totalWidth / 2;
    for (let i = 0; i < 5; i++) {
      this.starRating.push({
        x: startX + i * (starSize + starSpacing),
        y: centerY - this.device.adaptSize(20),
        size: starSize,
        filled: i < this.stars,
        color: '#FFD700'
      });
    }
  }

  update() {
    // 结算场景不需要复杂的更新逻辑
  }

  render(ctx) {
    // 绘制统一的渐变背景
    this.drawUnifiedBackground(ctx);
    
    // 绘制模态框
    this.drawModal(ctx);
    
    // 绘制顶部标题
    this.drawTopTitle(ctx);
    
    // 绘制结果图标
    this.drawResultIcon(ctx);
    
    // 绘制主标题
    this.drawTitle(ctx);
    
    // 绘制用时
    this.drawTime(ctx);
    
    // 绘制星级评价
    this.drawStarRating(ctx);
    
    // 绘制最佳成绩
    this.drawBestTime(ctx);
    
    // 绘制按钮
    this.drawButtons(ctx);
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

  drawTopTitle(ctx) {
    const centerX = this.device.screenWidth / 2;
    const topY = this.modal.y + this.device.adaptSize(30);
    ctx.fillStyle = '#4A90E2';
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('结算界面', centerX, topY);
  }

  drawResultIcon(ctx) {
    // 绘制结果图标背景
    ctx.fillStyle = this.resultIcon.color;
    ctx.beginPath();
    ctx.arc(
      this.resultIcon.x,
      this.resultIcon.y,
      this.resultIcon.size / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // 绘制图标符号
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${this.device.adaptFontSize(32)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉', this.resultIcon.x, this.resultIcon.y);
  }

  drawTitle(ctx) {
    const centerX = this.device.screenWidth / 2;
    const titleY = this.resultIcon.y + this.device.adaptSize(60);
    ctx.fillStyle = '#4A90E2';
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let titleText = '关卡完成！';
    if (this.level === 9) {
      titleText = '终极挑战完成！';
    }
    if (this.isAllLevelsCompleted) {
      titleText = '恭喜通关！';
    }
    
    ctx.fillText(titleText, centerX, titleY);
  }

  drawTime(ctx) {
    const centerX = this.device.screenWidth / 2;
    const timeY = this.resultIcon.y + this.device.adaptSize(100);
    ctx.fillStyle = '#4A90E2';
    ctx.font = `bold ${this.device.adaptFontSize(22)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`用时: ${this.time}秒`, centerX, timeY);
  }

  drawStarRating(ctx) {
    const centerX = this.device.screenWidth / 2;
    const starY = this.resultIcon.y + this.device.adaptSize(140);
    const starSize = this.device.adaptSize(32);
    const starSpacing = this.device.adaptSize(10);
    const totalWidth = starSize * 5 + starSpacing * 4;
    const startX = centerX - totalWidth / 2;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < this.stars ? '#FFD700' : '#CCCCCC';
      ctx.beginPath();
      this.drawStar(
        ctx,
        startX + i * (starSize + starSpacing) + starSize / 2,
        starY,
        starSize / 2
      );
      ctx.fill();
    }
  }

  drawBestTime(ctx) {
    const centerX = this.device.screenWidth / 2;
    const bestY = this.resultIcon.y + this.device.adaptSize(180);
    ctx.fillStyle = '#666666';
    ctx.font = `${this.device.adaptFontSize(14)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (this.bestTime !== null) {
      ctx.fillText(`最佳: ${this.bestTime}秒`, centerX, bestY);
    }
    if (this.isNewRecord) {
      ctx.fillStyle = '#FF6B6B';
      ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
      ctx.fillText('新纪录！', centerX, bestY + this.device.adaptSize(22));
    }
    
    // 显示通关统计
    if (this.isAllLevelsCompleted) {
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
      ctx.fillText('🎉 所有关卡已完成！', centerX, bestY + this.device.adaptSize(44));
    }
  }

  drawButtons(ctx) {
    const centerX = this.device.screenWidth / 2;
    // 根据是否显示通关统计调整按钮位置
    let btnY1 = this.resultIcon.y + this.device.adaptSize(220);
    if (this.isAllLevelsCompleted) {
      btnY1 = this.resultIcon.y + this.device.adaptSize(260); // 增加40px间距
    }
    const btnY2 = btnY1 + this.device.adaptSize(60);
    const buttonWidth = this.device.adaptSize(180);
    const buttonHeight = this.device.adaptSize(44);
    
    // 根据关卡和完成情况设置按钮文案
    let nextButtonText = '下一关';
    if (this.level === 9) {
      nextButtonText = '返回主菜单';
    }
    if (this.isAllLevelsCompleted) {
      nextButtonText = '返回主菜单';
    }
    
    // 同步 this.buttons 数组，确保点击区域和显示一致
    this.buttons = [
      {
        x: centerX - buttonWidth / 2,
        y: btnY1,
        width: buttonWidth,
        height: buttonHeight,
        text: nextButtonText,
        color: '#4A90E2',
        bgColor: '#4A90E2',
        textColor: '#FFFFFF',
        action: () => {
          if (nextButtonText === '返回主菜单') {
            this.game.switchScene('mainMenu');
          } else {
            this.nextLevel();
          }
        }
      },
      {
        x: centerX - buttonWidth / 2,
        y: btnY2,
        width: buttonWidth,
        height: buttonHeight,
        text: '重新挑战',
        color: '#4A90E2',
        bgColor: '#FFFFFF',
        textColor: '#4A90E2',
        action: () => this.retryLevel()
      }
    ];
    // 下一关按钮
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
    ctx.fillText(nextButtonText, centerX, btnY1 + buttonHeight / 2);
    // 重新挑战按钮
    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, centerX - buttonWidth / 2, btnY2, buttonWidth, buttonHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4A90E2';
    ctx.font = `bold ${this.device.adaptFontSize(18)}px Arial`;
    ctx.fillText('重新挑战', centerX, btnY2 + buttonHeight / 2);
  }

  handleTouch(x, y) {
    // 检查按钮
    this.buttons.forEach(button => {
      if (this.isPointInButton(x, y, button)) {
        this.audio.playButtonSound();
        button.action();
      }
    });
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  nextLevel() {
    const nextLevel = this.level + 1;
    if (nextLevel <= 9) {
      // 检查下一关是否解锁
      if (this.game.storage.isLevelUnlocked(nextLevel)) {
        this.game.switchScene('game', { level: nextLevel });
      } else {
        this.game.showToast('请先完成当前关卡');
      }
    } else {
      // 所有关卡完成，返回主菜单
      if (this.isAllLevelsCompleted) {
        this.game.showToast('🎉 恭喜通关！所有关卡已完成！');
      }
      this.game.switchScene('mainMenu');
    }
  }

  retryLevel() {
    this.game.switchScene('game', { level: this.level });
  }

  destroy() {
    if (this.audio && typeof this.audio.stopMusic === 'function') {
      this.audio.stopMusic();
    }
    this.modal = null;
    this.resultIcon = null;
    this.buttons = [];
    this.starRating = [];
  }

  // 绘制五角星
  drawStar(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      const angle2 = angle + Math.PI / 5;
      const x2 = cx + Math.cos(angle2) * (r * 0.5);
      const y2 = cy + Math.sin(angle2) * (r * 0.5);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.restore();
  }
}

module.exports = ResultScene; 