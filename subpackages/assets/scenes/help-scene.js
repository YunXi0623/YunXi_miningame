// 帮助场景
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

// 自动换行文本绘制函数
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (let i = 0; i < text.length; i++) {
    const testLine = line + text[i];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && line.length > 0) {
      ctx.fillText(line, x, y);
      line = text[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
  }
}

class HelpScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio; // 使用全局唯一音频实例
    
    // 帮助内容
    this.helpContent = [
      {
        title: '游戏目标',
        content: '通过切割绳子，让水果掉入小怪物头上。注意避开障碍物！'
      },
      {
        title: '操作方法',
        content: '用手指在屏幕上滑动来切割绳子。切割点会显示为红色。'
      },
      {
        title: '游戏元素',
        content: '• 水果：需要掉入小怪物头上的目标\n• 绳子：连接水果的线，可以切割\n• 障碍物：会阻挡水果的移动'
      },
      {
        title: '评分系统',
        content: '根据完成时间获得1-5星评价。时间越短，星级越高！'
      },
      {
        title: '复活机制',
        content: '游戏失败时，可以点击立即复活按钮继续游戏。'
      }
    ];
    
    // UI元素
    this.title = null;
    this.backButton = null;
    this.contentContainer = null;
    this.scrollY = 0;
    this.maxScrollY = 0;
    
    this.init();
    // 进入帮助界面时停止背景音乐
    this.audio.stopMusic();
  }

  init() {
    // 创建UI
    this.createUI();
  }

  createUI() {
    const centerX = this.device.screenWidth / 2;
    const topY = this.device.adaptSize(80);
    
    // 创建标题
    this.title = {
      x: centerX,
      y: topY,
      text: '游戏帮助',
      fontSize: this.device.adaptFontSize(24),
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
    
    // 创建内容容器
    this.contentContainer = {
      x: this.device.adaptSize(20),
      y: topY + this.device.adaptSize(60),
      width: this.device.screenWidth - this.device.adaptSize(40),
      height: this.device.screenHeight - topY - this.device.adaptSize(80)
    };
    
    // 计算最大滚动距离
    this.calculateMaxScroll();
  }

  calculateMaxScroll() {
    let totalHeight = 0;
    const itemSpacing = this.device.adaptSize(30);
    const titleHeight = this.device.adaptFontSize(18);
    const contentLineHeight = this.device.adaptFontSize(14) * 1.5;
    
    this.helpContent.forEach(item => {
      totalHeight += titleHeight + this.device.adaptSize(10);
      
      // 计算内容行数
      const contentLines = this.getContentLines(item.content);
      totalHeight += contentLines * contentLineHeight;
      
      totalHeight += itemSpacing;
    });
    
    this.maxScrollY = Math.max(0, totalHeight - this.contentContainer.height);
  }

  getContentLines(content) {
    // 简单估算行数，实际应该根据字体和容器宽度计算
    const wordsPerLine = Math.floor(this.contentContainer.width / this.device.adaptFontSize(8));
    const words = content.split(' ').length;
    return Math.ceil(words / wordsPerLine) + content.split('\n').length - 1;
  }

  update() {
    // 帮助场景不需要复杂的更新逻辑
  }

  render(ctx) {
    // 绘制背景
    this.drawBackground(ctx);
    
    // 绘制标题
    this.drawTitle(ctx);
    
    // 绘制返回按钮
    this.drawBackButton(ctx);
    
    // 绘制内容
    this.drawContent(ctx);
  }

  drawBackground(ctx) {
    // 渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, this.device.screenHeight);
    gradient.addColorStop(0, '#F5F7FA');
    gradient.addColorStop(1, '#E8ECF1');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.device.screenWidth, this.device.screenHeight);
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

  drawContent(ctx) {
    // 设置裁剪区域
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      this.contentContainer.x,
      this.contentContainer.y,
      this.contentContainer.width,
      this.contentContainer.height
    );
    ctx.clip();
    
    // 绘制内容项
    let currentY = this.contentContainer.y - this.scrollY;
    const itemSpacing = this.device.adaptSize(30);
    const titleHeight = this.device.adaptFontSize(18);
    const contentLineHeight = this.device.adaptFontSize(14) * 1.5;
    
    this.helpContent.forEach(item => {
      // 检查是否在可视区域内
      if (currentY + titleHeight + this.device.adaptSize(10) > this.contentContainer.y &&
          currentY < this.contentContainer.y + this.contentContainer.height) {
        
        // 绘制标题
        ctx.fillStyle = '#4A90E2';
        ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(item.title, this.contentContainer.x, currentY);
        
        // 绘制内容
        currentY += titleHeight + this.device.adaptSize(10);
        ctx.fillStyle = '#666666';
        ctx.font = `${this.device.adaptFontSize(14)}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const lines = item.content.split('\n');
        lines.forEach(line => {
          drawWrappedText(ctx, line, this.contentContainer.x, currentY, this.contentContainer.width, contentLineHeight);
          // 计算实际行数，调整currentY
          const metrics = ctx.measureText(line);
          const lineCount = Math.ceil(metrics.width / this.contentContainer.width) || 1;
          currentY += contentLineHeight * lineCount;
        });
      } else {
        // 跳过不可见的内容
        currentY += titleHeight + this.device.adaptSize(10);
        const lines = item.content.split('\n');
        lines.forEach(line => {
          const metrics = ctx.measureText(line);
          const lineCount = Math.ceil(metrics.width / this.contentContainer.width) || 1;
          currentY += contentLineHeight * lineCount;
        });
      }
      
      currentY += itemSpacing;
    });
    
    ctx.restore();
    
    // 绘制滚动指示器
    this.drawScrollIndicator(ctx);
  }

  drawScrollIndicator(ctx) {
    if (this.maxScrollY <= 0) return;
    
    const indicatorWidth = this.device.adaptSize(6);
    const indicatorHeight = this.device.adaptSize(40);
    const indicatorX = this.device.screenWidth - this.device.adaptSize(10);
    const indicatorY = this.contentContainer.y + 
      (this.scrollY / this.maxScrollY) * 
      (this.contentContainer.height - indicatorHeight);
    
    // 绘制滚动条背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    drawRoundRect(
      ctx,
      indicatorX,
      this.contentContainer.y,
      indicatorWidth,
      this.contentContainer.height,
      indicatorWidth / 2
    );
    ctx.fill();
    
    // 绘制滚动条
    ctx.fillStyle = 'rgba(74, 144, 226, 0.8)';
    drawRoundRect(
      ctx,
      indicatorX,
      indicatorY,
      indicatorWidth,
      indicatorHeight,
      indicatorWidth / 2
    );
    ctx.fill();
  }

  handleTouch(x, y) {
    // 检查返回按钮
    if (this.isPointInButton(x, y, this.backButton)) {
      this.audio.playButtonSound();
      this.backButton.action();
      return;
    }
  }

  handleScroll(deltaY) {
    // 处理滚动
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + deltaY));
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  goBack() {
    // 返回主菜单或关卡选择时恢复主界面音乐
    this.audio.playMusic('main');
    this.game.switchScene('mainMenu');
  }

  destroy() {
    if (this.audio && typeof this.audio.stopMusic === 'function') {
      this.audio.stopMusic();
    }
    this.title = null;
    this.backButton = null;
    this.contentContainer = null;
    // this.helpContent = []; // 保留内容，避免白屏
  }
}

module.exports = HelpScene; 