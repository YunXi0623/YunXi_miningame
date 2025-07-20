// 关卡选择场景
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

class LevelSelectScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio; // 使用全局唯一音频实例
    
    // 预加载背景图
    this._backgroundImg = null;
    if (typeof wx !== 'undefined' && wx.createImage) {
      this._backgroundImg = wx.createImage();
      this._backgroundImg.src = 'images/level-select-background.png';
    }
    
    // UI元素
    this.levels = [];
    this.currentLevel = 1;
    this.title = null;
    this.backButton = null;
    
    this.init();

  }

  init() {
    // 每次进入选择关卡页面都播放主界面音乐
    this.audio.playMusic('main');
    const centerX = this.device.screenWidth / 2;
    const topY = this.device.adaptSize(100);
    
    // 创建标题
    this.title = {
      x: centerX,
      y: topY,
      text: '第1关 - 基础挑战',
      fontSize: this.device.adaptFontSize(20),
      color: '#4A90E2'
    };
    
    // 创建返回按钮
    const buttonSize = 45; // 调整为45
    this.backButton = {
      x: this.device.adaptSize(20),
      y: topY - buttonSize / 2, // 与title垂直居中
      width: buttonSize,
      height: buttonSize,
      text: '←', // 已无用
      color: '#4A90E2',
      bgColor: '#FFFFFF',
      textColor: '#4A90E2',
      action: () => this.goBack()
    };
    
    // 创建关卡网格
    this.createLevelGrid();
  }

  createLevelGrid() {
    const gridStartX = this.device.adaptSize(50);
    const gridStartY = this.device.adaptSize(180);
    const levelSize = this.device.adaptSize(80);
    const gridSpacing = this.device.adaptSize(20);
    const levelsPerRow = 3;
    
    this.levels = [];
    
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / levelsPerRow);
      const col = i % levelsPerRow;
      const levelNum = i + 1;
      
      const x = gridStartX + col * (levelSize + gridSpacing);
      const y = gridStartY + row * (levelSize + gridSpacing);
      
      const isUnlocked = this.game.storage.isLevelUnlocked(levelNum);
      const isCurrent = levelNum === this.currentLevel;
      
      let titleText = `第${levelNum}关`;
      if (levelNum === 9) {
        titleText = '第9关 - 终极挑战';
      }
      
      this.levels.push({
        x: x,
        y: y,
        width: levelSize,
        height: levelSize,
        level: levelNum,
        text: levelNum.toString(),
        unlocked: isUnlocked,
        current: isCurrent,
        title: titleText,
        color: isCurrent ? '#FF6B6B' : '#4A90E2',
        bgColor: isCurrent ? '#FF6B6B' : '#FFFFFF',
        textColor: isCurrent ? '#FFFFFF' : '#4A90E2',
        action: () => this.selectLevel(levelNum)
      });
    }
  }

  update() {
    // 关卡选择场景不需要复杂的更新逻辑
  }

  render(ctx) {
    // 绘制背景
    this.drawBackground(ctx);
    
    // 绘制标题
    this.drawTitle(ctx);
    
    // 绘制返回按钮
    this.drawBackButton(ctx);
    
    // 绘制关卡网格
    this.drawLevelGrid(ctx);
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
    ctx.fillStyle = this.title.color;
    ctx.font = `bold ${this.title.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title.text, this.title.x, this.title.y);
  }

  drawBackButton(ctx) {
    // 只绘制SVG箭头，无背景无边框
    ctx.save();
    // 计算缩放和偏移，使SVG箭头在按钮区域内居中且有适当边距
    const padding = this.backButton.width * 0.18;
    const w = this.backButton.width - 2 * padding;
    const h = this.backButton.height - 2 * padding;
    ctx.translate(this.backButton.x + padding, this.backButton.y + padding);
    ctx.scale(w / 1024, h / 1024);
    ctx.beginPath();
    ctx.moveTo(757.836411, 125.644768);
    ctx.bezierCurveTo(784.375011, 99.106168, 784.375011, 56.850027, 757.836411, 30.311427);
    ctx.bezierCurveTo(731.297811, 3.772827, 689.04167, 3.772827, 662.50307, 30.311427);
    ctx.lineTo(241.097629, 435.717269);
    ctx.bezierCurveTo(214.559029, 462.255869, 214.559029, 504.51201, 241.097629, 531.05061);
    ctx.lineTo(662.50327, 944.456251);
    ctx.bezierCurveTo(689.04187, 970.994851, 731.298011, 970.994851, 757.836611, 944.456251);
    ctx.bezierCurveTo(784.375211, 917.917651, 784.375211, 875.66151, 757.836611, 849.12291);
    ctx.lineTo(396.09754, 487.383839);
    ctx.lineTo(757.836411, 125.644768);
    ctx.closePath();
    ctx.fillStyle = '#1296db';
    ctx.fill();
    ctx.restore();
  }

  drawLevelGrid(ctx) {
    this.levels.forEach(level => {
      // 绘制关卡背景
      ctx.fillStyle = level.bgColor;
      drawRoundRect(ctx, level.x, level.y, level.width, level.height, 12);
      ctx.fill();
      
      // 绘制关卡边框
      ctx.strokeStyle = level.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 绘制关卡数字
      ctx.fillStyle = level.textColor;
      ctx.font = `bold ${this.device.adaptFontSize(20)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        level.text,
        level.x + level.width / 2,
        level.y + level.height / 2
      );
      
      // 如果关卡未解锁，绘制锁定图标
      if (!level.unlocked) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(level.x, level.y, level.width, level.height);
        
        ctx.fillStyle = '#999';
        ctx.font = `${this.device.adaptFontSize(16)}px Arial`;
        ctx.fillText('🔒', level.x + level.width / 2, level.y + level.height / 2);
      }
    });
  }

  handleTouch(x, y) {
    // 检查返回按钮
    if (this.isPointInButton(x, y, this.backButton)) {
      this.audio.playButtonSound();
      this.backButton.action();
      return;
    }
    
    // 检查关卡按钮
    this.levels.forEach(level => {
      if (this.isPointInButton(x, y, level)) {
        this.audio.playButtonSound();
        level.action();
      }
    });
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  selectLevel(levelNum) {
    if (!this.game.storage.isLevelUnlocked(levelNum)) {
      this.game.showToast('请先完成前置关卡');
      return;
    }
    
    // 更新当前关卡
    this.currentLevel = levelNum;
    this.game.storage.setCurrentLevel(levelNum);
    
    // 更新标题
    this.updateTitle(levelNum);
    
    // 切换到游戏场景
    this.game.switchScene('game', { level: levelNum });
  }

  updateTitle(levelNum) {
    let titleText = `第${levelNum}关`;
    if (levelNum === 9) {
      titleText = '第9关 - 葡萄挑战';
    }
    this.title.text = titleText;
  }

  goBack() {
    this.game.switchScene('mainMenu');
  }

  destroy() {
    // 离开选择关卡时停止主界面音乐
    this.audio.stopMusic();
    this.levels = [];
    this.title = null;
    this.backButton = null;
  }
}

module.exports = LevelSelectScene; 