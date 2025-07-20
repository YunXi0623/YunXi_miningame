// 加载场景
const DeviceAdapter = require('../utils/device');

class LoadingScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    
    // 加载状态
    this.progress = 0;
    this.totalResources = 0;
    this.loadedResources = 0;
    this.isLoading = true;
    this.currentStepName = '准备加载...';
    
    // 背景图
    this.backgroundImg = null;
    this.loadBackground();
    
    // 进度条样式
    this.progressBar = {
      x: this.device.screenWidth * 0.1,
      y: this.device.screenHeight * 0.7,
      width: this.device.screenWidth * 0.8,
      height: this.device.adaptSize(20),
      bgColor: 'rgba(255, 255, 255, 0.3)',
      fillColor: '#4A90E2',
      borderColor: '#FFFFFF'
    };
    
    // 文字样式
    this.textStyle = {
      color: '#FFFFFF',
      fontSize: this.device.adaptFontSize(18),
      fontFamily: 'Arial'
    };
    
    // 开始加载资源
    this.startLoading();
  }

  loadBackground() {
    if (typeof wx !== 'undefined' && wx.createImage) {
      this.backgroundImg = wx.createImage();
      this.backgroundImg.src = 'images/loading-background.png';
      
      // 添加加载完成事件监听
      this.backgroundImg.onload = () => {
      };
      
      this.backgroundImg.onerror = () => {
      };
    }
  }

  startLoading() {
    // 模拟资源加载进度
    this.simulateLoading();
  }

  simulateLoading() {
    const loadingSteps = [
      { name: '加载背景资源', duration: 600 },
      { name: '加载音频资源', duration: 1000 },
      { name: '加载游戏数据', duration: 800 },
      { name: '初始化场景', duration: 500 },
      { name: '完成加载', duration: 300 }
    ];

    let currentStep = 0;
    let stepProgress = 0;
    const totalSteps = loadingSteps.length;

    const updateProgress = () => {
      if (currentStep >= totalSteps) {
        this.completeLoading();
        return;
      }

      const step = loadingSteps[currentStep];
      stepProgress += 16; // 约60fps

      if (stepProgress >= step.duration) {
        currentStep++;
        stepProgress = 0;
      }

      // 更新当前步骤名称
      this.currentStepName = step.name;

      // 计算总体进度，使用缓动函数让进度更自然
      const stepWeight = 1 / totalSteps;
      const currentStepProgress = stepProgress / step.duration;
      const easedProgress = this.easeInOut(currentStepProgress);
      this.progress = (currentStep * stepWeight) + (easedProgress * stepWeight);
      this.loadedResources = Math.floor(this.progress * 100);

      if (this.isLoading) {
        requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
  }

  // 缓动函数，让进度条动画更自然
  easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  completeLoading() {
    this.progress = 1;
    this.loadedResources = 100;
    this.isLoading = false;
    
    // 延迟切换到主菜单，让用户看到100%完成
    setTimeout(() => {
      this.game.switchScene('mainMenu');
    }, 500);
  }

  update(deltaTime) {
    // 加载场景不需要复杂的更新逻辑
  }

  render(ctx) {
    // 绘制背景
    this.drawBackground(ctx);
    
    // 绘制加载文字
    this.drawLoadingText(ctx);
    
    // 绘制进度条
    this.drawProgressBar(ctx);
    
    // 绘制百分比
    this.drawPercentage(ctx);
  }

  drawBackground(ctx) {
    // 尝试绘制背景图
    if (this.backgroundImg && this.backgroundImg.complete && this.backgroundImg.naturalWidth > 0) {
      // 背景图已加载完成，绘制背景图
      const img = this.backgroundImg;
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
      gradient.addColorStop(0, '#4A90E2');
      gradient.addColorStop(1, '#357ABD');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.device.screenWidth, this.device.screenHeight);
    }
  }

  drawLoadingText(ctx) {
    ctx.fillStyle = this.textStyle.color;
    ctx.font = `bold ${this.textStyle.fontSize}px ${this.textStyle.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = this.device.screenWidth / 2;
    const centerY = this.device.screenHeight * 0.5;
    
    // 绘制主标题
    ctx.fillText('游戏加载中...', centerX, centerY - 20);
    
    // 绘制当前步骤
    ctx.font = `${this.textStyle.fontSize - 4}px ${this.textStyle.fontFamily}`;
    ctx.fillText(this.currentStepName, centerX, centerY + 20);
  }

  drawProgressBar(ctx) {
    const bar = this.progressBar;
    
    // 绘制背景
    ctx.fillStyle = bar.bgColor;
    ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
    
    // 绘制边框
    ctx.strokeStyle = bar.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(bar.x, bar.y, bar.width, bar.height);
    
    // 绘制进度填充
    const fillWidth = bar.width * this.progress;
    ctx.fillStyle = bar.fillColor;
    ctx.fillRect(bar.x, bar.y, fillWidth, bar.height);
  }

  drawPercentage(ctx) {
    ctx.fillStyle = this.textStyle.color;
    ctx.font = `${this.textStyle.fontSize}px ${this.textStyle.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerX = this.device.screenWidth / 2;
    const y = this.progressBar.y + this.progressBar.height + this.device.adaptSize(30);
    
    ctx.fillText(`${this.loadedResources}%`, centerX, y);
  }

  handleTouch(x, y) {
    // 加载场景不处理触摸事件
  }

  handleTouchMove(x, y, deltaX, deltaY) {
    // 加载场景不处理触摸移动
  }

  handleTouchEnd() {
    // 加载场景不处理触摸结束
  }

  handleResize() {
    // 重新计算进度条位置
    this.progressBar.x = this.device.screenWidth * 0.1;
    this.progressBar.y = this.device.screenHeight * 0.7;
    this.progressBar.width = this.device.screenWidth * 0.8;
    this.progressBar.height = this.device.adaptSize(20);
    
    // 更新文字大小
    this.textStyle.fontSize = this.device.adaptFontSize(18);
  }

  destroy() {
    this.isLoading = false;
  }
}

module.exports = LoadingScene; 