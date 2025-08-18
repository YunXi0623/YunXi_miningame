// 游戏核心场景
const DeviceAdapter = require('../utils/device');
const AudioManager = require('../utils/audio');
const PhysicsEngine = require('../physics/physics-engine');

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

class GameScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio; // 使用全局唯一音频实例
    this.physics = new PhysicsEngine(this.device.screenHeight);
    this.LevelData = require('../data/level-data');
    
    // 游戏状态
    this.currentLevel = 1;
    this.gameState = 'playing'; // playing, paused, success, failed
    this.startTime = 0;
    this.elapsedTime = 0;
    this.totalElapsedTime = 0; // 新增累计用时
    this.lastTargetActive = true;
    this.targetAreaMove = null; // 目标区移动属性
    
    // 游戏对象
    this.objects = [];
    this.ropes = [];
    this.targetArea = null;
    this.obstacles = [];
    
    // UI元素
    this.buttons = [];
    this.levelInfo = null;
    
    // 切割相关
    this.cutLine = null;
    this.isCutting = false;
    
    // 只预加载所有关卡实际用到的水果图片，命名规则：images/水果名_levelX.png
    this._fruitImgs = {};
    if (typeof wx !== 'undefined' && wx.createImage) {
      const LevelData = require('../data/level-data');
      const usedFruitImages = new Set();
      for (let i = 1; i <= 9; i++) {
        const level = LevelData.getLevelData(i);
        if (level && Array.isArray(level.objects)) {
          level.objects.forEach(obj => {
            if (obj.fruitStyle && obj.fruitStyle.type) {
              usedFruitImages.add(`${obj.fruitStyle.type}_level${i}`);
            }
          });
        }
      }
      usedFruitImages.forEach(key => {
        const img = wx.createImage();
        img.onload = () => {
          // 图片加载成功，标记为可用
          img.loaded = true;
        };
        img.onerror = () => {
          console.warn(`水果图片 ${key}.png 加载失败，将使用兜底绘制方案`);
          img.loaded = false;
        };
        img.src = `subpackages/assets/images/${key}.png`;
        this._fruitImgs[key] = img;
      });
    }
    
    // 预加载背景图
    this._backgroundImg = null;
    this._backgroundImgLoaded = false;
    if (typeof wx !== 'undefined' && wx.createImage) {
      this._backgroundImg = wx.createImage();
      this._backgroundImg.onload = () => {
        this._backgroundImgLoaded = true;
      };
      this._backgroundImg.onerror = () => {
        console.warn('背景图片加载失败，将使用渐变背景作为兜底');
        this._backgroundImgLoaded = false;
      };
      this._backgroundImg.src = 'subpackages/assets/images/background.png';
    }
    
    // 预加载小怪物图片
    this._monsterImg = null;
    this._monsterImgLoaded = false;
    if (typeof wx !== 'undefined' && wx.createImage) {
      this._monsterImg = wx.createImage();
      this._monsterImg.onload = () => {
        this._monsterImgLoaded = true;
      };
      this._monsterImg.onerror = () => {
        console.warn('小怪物图片加载失败，将使用兜底绘制方案');
        this._monsterImgLoaded = false;
      };
      this._monsterImg.src = 'subpackages/assets/images/monster.png';
    }
    
    // 预加载手势图片
    this.gestureImage = null;
    this.gestureImageLoaded = false;
    if (typeof wx !== 'undefined' && wx.createImage) {
      this.gestureImage = wx.createImage();
      this.gestureImage.onload = () => {
        this.gestureImageLoaded = true;
        // console.log('手势图片加载成功');
      };
      this.gestureImage.onerror = () => {
        // console.warn('手势图片加载失败，将使用默认绘制方案');
        this.gestureImageLoaded = false;
      };
      this.gestureImage.src = 'subpackages/assets/images/gesture.png';
    }
    
    // 进入闯关场景时播放闯关中背景音乐
    this.audio.playMusic('game');
    
    // 手势提示相关
    this.gestureHint = {
      visible: false,
      fadeOut: false,
      alpha: 1.0,
      duration: 3000, // 显示3秒
      startTime: 0,
      animationTime: 0,
      // 动画相关属性
      fingerX: 0,
      fingerY: 0,
      fingerStartX: 0,
      fingerEndX: 0,
      ropeCutProgress: 0,
      cutPointAlpha: 1.0,
      scale: 1.0,
      pulseAlpha: 1.0,
      trailOffset: 0
    };
  }

  init(params = {}) {
    // 如果是快照恢复，且有快照，直接还原并跳过重置
    if (params && params.resumeFromSnapshot && params.snapshot) {
      this.restoreFromSnapshot(params.snapshot);
      return;
    }
    try {
      this.currentLevel = params.level || 1;
      this.gameState = 'playing';
      this.levelStartTime = Date.now();
      this.pausedElapsedTime = params.resumeTime || 0;
      this.currentElapsedTime = 0;
      // 完全重置游戏状态
      this.objects = [];
      this.ropes = [];
      this.obstacles = [];
      this.targetArea = null;
      this.cutLine = null;
      // 重置物理引擎
      this.physics.reset();
      // 创建UI
      this.createUI();
      // 加载关卡数据
      this.loadLevel(this.currentLevel);
      
      // 进入闯关场景时播放闯关中背景音乐
      this.audio.playMusic('game');
      
      // 启动手势提示
      this.startGestureHint();
    } catch (error) {
      console.error('GameScene init error:', error);
    }
  }

  createUI() {
    const systemInfo = typeof wx !== 'undefined' && wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const buttonSize = this.device.adaptSize(50);
    const buttonSpacing = this.device.adaptSize(10);
    const topY = statusBarHeight + this.device.adaptSize(20);
    
    // 创建控制按钮
    this.buttons = [
      {
        x: this.device.adaptSize(20),
        y: topY,
        width: buttonSize,
        height: buttonSize,
        text: '⏸️',
        color: '#4A90E2',
        bgColor: '#FFFFFF',
        textColor: '#4A90E2',
        action: () => this.pauseGame()
      },
      {
        x: this.device.adaptSize(20) + buttonSize + buttonSpacing,
        y: topY,
        width: buttonSize,
        height: buttonSize,
        text: '🔄',
        color: '#4A90E2',
        bgColor: '#FFFFFF',
        textColor: '#4A90E2',
        action: () => this.resetLevel()
      },
      {
        x: this.device.adaptSize(20) + (buttonSize + buttonSpacing) * 2,
        y: topY,
        width: buttonSize,
        height: buttonSize,
        text: '💡',
        color: '#4A90E2',
        bgColor: '#FFFFFF',
        textColor: '#4A90E2',
        action: () => this.showHint()
      }
    ];
    
    // 创建关卡信息
    this.levelInfo = {
      x: this.device.screenWidth - this.device.adaptSize(40),
      y: topY + buttonSize / 2,
      text: `第${this.currentLevel}关`,
      fontSize: this.device.adaptFontSize(16),
      color: '#4A90E2'
    };
  }

  loadLevel(levelNum) {
    try {
      this.currentLevel = levelNum;
      
      // 重置特殊标记
      this.cleanLevel6RopeDetection = false;
      
      // 设置物理引擎的当前关卡
      this.physics.setCurrentLevel(levelNum);
      
      // 获取关卡数据
      const levelData = this.LevelData.getLevelData(levelNum);
    if (!levelData) {
      console.error(`关卡${levelNum}数据不存在`);
      return;
    }
    
    // 获取顶部安全区高度和UI高度
    const systemInfo = typeof wx !== 'undefined' && wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    const buttonSize = this.device ? this.device.adaptSize(50) : 50;
    const uiTopPadding = statusBarHeight + this.device.adaptSize(20) + buttonSize + this.device.adaptSize(20);
    const minRopeLength = this.device ? this.device.adaptSize(100) : 100; // 最小绳长
    
    // 创建目标区域
    this.targetArea = {
      ...levelData.targetArea,
      y: levelData.targetArea.y + uiTopPadding,
      color: '#4A90E2'
    };
    
    // 目标区移动属性（左右移动）
    this.targetAreaMove = {
      baseX: this.targetArea.x,
      direction: 1,
      speed: 2, // 每帧移动像素
      range: 100 // 最大偏移量，可根据屏幕宽度调整
    };
    
    // 创建游戏对象
    this.objects = [];
    levelData.objects.forEach(objData => {
      const object = {
        x: objData.x,
        y: objData.y + uiTopPadding,
        radius: objData.radius,
        color: objData.color,
        velocity: { x: 0, y: 0 },
        affectedByGravity: objData.affectedByGravity || false,
        active: true,
        type: objData.type || 'object',
        onCollision: (other) => this.handleObjectCollision(object, other),
        fruitStyle: objData.fruitStyle // 新增，支持每关不同水果样式
      };
      this.objects.push(object);
    });
    // 保证物理引擎和渲染层用同一组对象引用
    this.physics.objects = this.objects;
    
    // 创建绳子
    this.ropes = [];
    
    // 确保关卡数据中的绳子数组存在且是数组
    if (!Array.isArray(levelData.ropes)) {
      console.error(`关卡${levelNum}的绳子数据不是数组:`, levelData.ropes);
      levelData.ropes = []; // 防止错误，设置为空数组
    }
    
    // 强制确保第4关有三根绳子
    if (levelNum === 4 && levelData.ropes.length < 3) {
      console.warn('第4关绳子数量不足3根，添加默认绳子配置');
      while (levelData.ropes.length < 3) {
        const defaultRope = {
          startX: 200 + (levelData.ropes.length - 1) * 80,
          startY: 100,
          endX: 200,
          endY: 180,
          maxLength: 100,
          attachedObjectIndex: 0
        };
        levelData.ropes.push(defaultRope);
      }
    }
    
    // 遍历每根绳子并添加
    levelData.ropes.forEach((ropeData, index) => {
      try {
        // 使用关卡数据中定义的绳子配置
        const attachedObject = ropeData.attachedObjectIndex !== undefined ? 
                              this.objects[ropeData.attachedObjectIndex] : null;
        
        if (ropeData.attachedObjectIndex !== undefined && !attachedObject) {
          console.error(`绳子${index+1}引用的物体索引${ropeData.attachedObjectIndex}不存在`);
          return; // 跳过这根绳子
        }
        // --- 自动校正绳子端点 ---
        let endX = ropeData.endX;
        let endY = ropeData.endY;
        if (attachedObject) {
          endX = attachedObject.x;
          endY = attachedObject.y;
        } else {
          endY = ropeData.endY + uiTopPadding;
        }
        const rope = {
          startX: ropeData.startX,
          startY: ropeData.startY + uiTopPadding,
          endX: endX,
          endY: endY,
          maxLength: ropeData.maxLength,
          attachedObject: attachedObject,
          active: true,
          color: ropeData.color || '#8B4513', // 默认棕色绳子
          isSpecialRope: ropeData.isSpecialRope || false // 处理特殊绳子标记
        };
        
        // 检查是否是水平绳子
        const dx = rope.endX - rope.startX;
        const dy = rope.endY - rope.startY;
        const isHorizontalRope = Math.abs(dx) > Math.abs(dy) * 1.5;
        
        // 标记所有水平绳子为特殊绳子，使其显示下垂效果
        if (isHorizontalRope) {
          rope.isSpecialRope = true;
        }
        
        this.ropes.push(rope);
        this.physics.addRope(rope);
        
        // 如果绳子连接到物体，设置物体不受重力影响
        if (rope.attachedObject) {
          rope.attachedObject.affectedByGravity = false;
        }
      } catch (error) {
        console.error(`添加绳子${index+1}时出错:`, error);
      }
    });
    
    // 创建障碍物
    this.obstacles = [];
    if (levelData.obstacles) {
      levelData.obstacles.forEach(obsData => {
        const obstacle = {
          x: obsData.x,
          y: obsData.y + uiTopPadding,
          width: obsData.width,
          height: obsData.height,
          color: obsData.color || '#FF6B6B',
          type: 'obstacle',
          // 新增移动参数，支持关卡数据自定义，否则用默认值
          baseX: obsData.x,
          speed: obsData.speed || 2,
          range: obsData.range || 60,
          direction: obsData.direction || 1,
          obstacleType: obsData.obstacleType || 'rectangle' // 新增障碍物类型
        };
        this.obstacles.push(obstacle);
      });
    }
    
    // 保存当前关卡提示
    this.currentHint = levelData.hint || '尝试切割不同的绳子';
    

    
    // 特殊处理第3关
    if (levelNum === 3) {
      // 确保第3关的物体初始状态正确
      this.objects.forEach(obj => {
        if (obj.type === 'target') {
          // 初始不受重力影响，但准备好切割后的状态
          obj.affectedByGravity = false;
        }
      });
      
      // 调用特殊处理第三关水平绳子的函数
      this.fixLevel3HorizontalRope();
    }
    
    // 特殊处理第4关
    if (levelNum === 4) {
      // 调用特殊处理第四关水平绳子的函数
      this.fixLevel4HorizontalRope();
    }
    
    // 特殊处理第5关
    if (levelNum === 5) {
      // 调用特殊处理第五关水平绳子的函数
      this.fixLevel5HorizontalRope();
    }
    
    // 特殊处理第6关
    if (levelNum === 6) {
      // 调用特殊处理第六关的函数
      this.fixLevel6();
    }
    
    // 特殊处理第9关
    if (levelNum === 9) {
      // 调用特殊处理第九关的函数
      this.fixLevel9();
    }
    
    // 通用处理其他关卡的水平绳子
    this.fixAllLevelsHorizontalRope();
    } catch (error) {
      console.error('loadLevel error:', error);
    }
  }

  update(deltaTime) {
    if (this.gameState !== 'playing') return;
    this.currentElapsedTime = Math.floor((Date.now() - this.levelStartTime) / 1000) + this.pausedElapsedTime;
    
    // 每帧强制同步所有绳子的端点，彻底消除错位
    this.ropes.forEach(rope => {
      if (rope.attachedObject) {
        rope.endX = rope.attachedObject.x;
        rope.endY = rope.attachedObject.y;
      }
    });
    
    // B方案：物体未受重力且有绳子挂着时，每帧同步到绳子末端，实现自然下垂
    this.objects.forEach(object => {
      if (!object.affectedByGravity && object.active) {
        const attachedRopes = this.ropes.filter(r => r.attachedObject === object && r.active);
        if (attachedRopes.length === 1) {
          const rope = attachedRopes[0];
          object.x = rope.endX;
          object.y = rope.endY;
        }
        // 多根绳子时可扩展为平均点或物理模拟
      }
    });
    
    // 目标区自动左右移动
    if (this.targetArea && this.targetAreaMove) {
      this.targetArea.x += this.targetAreaMove.direction * this.targetAreaMove.speed;
      if (this.targetArea.x < 0) {
        this.targetArea.x = 0;
        this.targetAreaMove.direction = 1;
      } else if (this.targetArea.x > this.device.screenWidth - this.targetArea.width) {
        this.targetArea.x = this.device.screenWidth - this.targetArea.width;
        this.targetAreaMove.direction = -1;
      }
    }
    
    // 障碍物自动左右移动
    this.obstacles.forEach(obstacle => {
      if (obstacle.speed) {
        obstacle.x += obstacle.direction * obstacle.speed;
        // 到达屏幕左右边缘后反向
        if (obstacle.x < 0) {
          obstacle.x = 0;
          obstacle.direction = 1;
        } else if (obstacle.x + obstacle.width > this.device.screenWidth) {
          obstacle.x = this.device.screenWidth - obstacle.width;
          obstacle.direction = -1;
        }
      }
    });
    
    // 更新物理引擎
    this.physics.update();
    
    // 更新切割线
    if (this.isCutting && this.cutLine) {
      this.checkRopeCut();
    }
    

    
    // 每10帧清理非活跃绳子
    if (this.frameCount === undefined) {
      this.frameCount = 0;
    }
    this.frameCount++;
    if (this.frameCount % 10 === 0) {
      this.cleanInactiveRopes();
    }
    
    // 跳过还原后前两帧的 checkGameState，避免误判
    if (this._skipCheckGameStateFrame > 0) {
      this._skipCheckGameStateFrame--;
    } else {
      // 检查游戏状态
      this.checkGameState();
    }
    
    // 更新UI
    this.updateUI();
    
    // 更新手势提示
    this.updateGestureHint(deltaTime);
  }

  render(ctx, skipClear) {
    try {
      // 只在非暂停时清空画布并绘制背景
      if (!skipClear) {
        ctx.clearRect(0, 0, this.device.screenWidth, this.device.screenHeight);
        this.drawBackground(ctx);
      }
      // 渲染当前场景内容
      this.drawGameArea(ctx);
      this.drawTargetArea(ctx);
      this.drawObstacles(ctx);
      this.drawRopes(ctx);
      this.drawObjects(ctx);
      this.drawCutLine(ctx);
      this.drawUI(ctx);
      
      // 绘制手势提示（在最上层）
      this.drawGestureHint(ctx);
    } catch (error) {
      console.error('render error:', error);
      // 如果渲染出错，至少绘制一个简单的背景
      ctx.clearRect(0, 0, this.device.screenWidth, this.device.screenHeight);
      ctx.fillStyle = '#F5F7FA';
      ctx.fillRect(0, 0, this.device.screenWidth, this.device.screenHeight);
    }
  }

  drawBackground(ctx) {
    // 尝试绘制背景图
    if (this._backgroundImg && this._backgroundImgLoaded) {
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

  drawGameArea(ctx) {
    // 游戏区域边框
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.device.screenWidth, this.device.screenHeight);
  }

  drawTargetArea(ctx) {
    if (!this.targetArea) return;
    const x = this.targetArea.x;
    const y = this.targetArea.y;
    const w = this.targetArea.width;
    const h = this.targetArea.height;
    // 以设计尺寸100x100为基准
    const designSize = 100;
    // 取目标区最小边，整体放大1.3倍
    const scale = Math.min(w, h) / designSize * 1.3;
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    // 用图片替换小怪物绘制
    if (this._monsterImg && this._monsterImgLoaded) {
      // 以图片中心为锚点，图片原始尺寸假设为100x100
      ctx.drawImage(this._monsterImg, -50, -50, 100, 100);
    } else {
      // 图片未加载时的兜底方案：绘制一个简单的小怪物
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制眼睛
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-15, -10, 8, 0, Math.PI * 2);
      ctx.arc(15, -10, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制瞳孔
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-15, -10, 4, 0, Math.PI * 2);
      ctx.arc(15, -10, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制嘴巴
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 10, 15, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawObstacles(ctx) {
    this.obstacles.forEach(obstacle => {
      ctx.fillStyle = obstacle.color;
      
      // 根据障碍物类型绘制不同形状
      switch (obstacle.obstacleType) {
        case 'circle':
          // 绘制圆形障碍物
          const radius = Math.min(obstacle.width, obstacle.height) / 2;
          ctx.beginPath();
          ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
          
        case 'triangle':
          // 绘制三角形障碍物
          ctx.beginPath();
          ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
          ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
          
        case 'star':
          // 绘制星形障碍物
          const centerX = obstacle.x + obstacle.width / 2;
          const centerY = obstacle.y + obstacle.height / 2;
          const outerRadius = Math.min(obstacle.width, obstacle.height) / 2;
          const innerRadius = outerRadius / 2.5;
          
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = Math.PI / 2 + i * (2 * Math.PI / 5);
            const x1 = centerX + Math.cos(angle) * outerRadius;
            const y1 = centerY - Math.sin(angle) * outerRadius;
            ctx.lineTo(x1, y1);
            
            const angle2 = angle + Math.PI / 5;
            const x2 = centerX + Math.cos(angle2) * innerRadius;
            const y2 = centerY - Math.sin(angle2) * innerRadius;
            ctx.lineTo(x2, y2);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
          
        case 'hexagon':
          // 绘制六边形障碍物
          const hexCenterX = obstacle.x + obstacle.width / 2;
          const hexCenterY = obstacle.y + obstacle.height / 2;
          const hexRadius = Math.min(obstacle.width, obstacle.height) / 2;
          
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            const x = hexCenterX + hexRadius * Math.cos(angle);
            const y = hexCenterY + hexRadius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
          
        case 'cloud':
          // 绘制云朵形障碍物
          const cloudX = obstacle.x + obstacle.width / 2;
          const cloudY = obstacle.y + obstacle.height / 2;
          const cloudRadius = Math.min(obstacle.width, obstacle.height) / 3;
          
          ctx.beginPath();
          ctx.arc(cloudX - cloudRadius, cloudY, cloudRadius, Math.PI, Math.PI * 2);
          ctx.arc(cloudX, cloudY - cloudRadius / 2, cloudRadius, Math.PI, Math.PI * 2);
          ctx.arc(cloudX + cloudRadius, cloudY, cloudRadius, Math.PI, Math.PI * 2);
          ctx.arc(cloudX, cloudY + cloudRadius / 2, cloudRadius * 0.8, 0, Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
          
        case 'candy':
          // 绘制糖果形障碍物
          const candyX = obstacle.x + obstacle.width / 2;
          const candyY = obstacle.y + obstacle.height / 2;
          const candyWidth = obstacle.width * 0.8;
          const candyHeight = obstacle.height;
          
          // 糖果主体
          ctx.beginPath();
          ctx.ellipse(candyX, candyY, candyWidth / 2, candyHeight / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // 糖果条纹
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(candyX - candyWidth / 2, candyY + i * candyHeight / 10);
            ctx.lineTo(candyX + candyWidth / 2, candyY + i * candyHeight / 10);
            ctx.stroke();
          }
          break;
          
        case 'gift':
          // 绘制礼物盒障碍物
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          
          // 礼物盒丝带
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          
          // 水平丝带
          ctx.beginPath();
          ctx.moveTo(obstacle.x, obstacle.y + obstacle.height / 2);
          ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height / 2);
          ctx.stroke();
          
          // 垂直丝带
          ctx.beginPath();
          ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
          ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height);
          ctx.stroke();
          
          // 礼物盒蝴蝶结
          ctx.beginPath();
          const bowSize = Math.min(obstacle.width, obstacle.height) / 4;
          ctx.arc(obstacle.x + obstacle.width / 2 - bowSize, obstacle.y + obstacle.height / 2 - bowSize, bowSize, 0, Math.PI * 2);
          ctx.arc(obstacle.x + obstacle.width / 2 + bowSize, obstacle.y + obstacle.height / 2 - bowSize, bowSize, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'rectangle':
        default:
          // 默认矩形障碍物
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
          break;
      }
    });
  }

  drawRopes(ctx) {
    // 定义一个开发模式标志，可以根据需要开启或关闭
    const DEV_MODE = false;
    
    // 只在开发模式下显示调试信息
    if (DEV_MODE) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = '12px Arial';
      ctx.fillText(`绳子数量: ${this.ropes.length}`, 10, 50);
      
      // 如果没有绳子，显示警告
      if (this.ropes.length === 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.font = '14px Arial';
        ctx.fillText(`警告: 关卡${this.currentLevel}没有绳子!`, 10, 70);
        return;
      }
    }
    
    // 清理非活跃绳子，避免重影
    this.cleanInactiveRopes();
    
    // 遍历并绘制每根绳子
    this.ropes.forEach((rope, index) => {
      // 只绘制活跃的绳子
      if (!rope.active) return;
      
      // 绳子基本属性
      const startX = rope.startX;
      const startY = rope.startY;
      const endX = rope.endX;
      const endY = rope.endY;
      const ropeColor = rope.color || '#8B4513';
      
      // 计算绳子长度和角度
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // 如果绳子长度为0，不绘制（避免重影）
      if (length < 1) return;
      
      // 绘制绳子 - 根据物体是否受重力影响决定是直线还是弯曲
      ctx.save();
      
      // 增加绳子的宽度，使其更加明显
      ctx.strokeStyle = ropeColor;
      ctx.lineWidth = 6; // 增加线宽
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      // 判断绳子方向
      const isHorizontalRope = Math.abs(dx) > Math.abs(dy) * 1.5;
      
      // 判断是否应该绘制为直线
      // 只有垂直绳子且已切断一端的情况下才使用直线绘制
      const isVerticalCut = !isHorizontalRope && 
                          (!rope.attachedObject || 
                           rope.attachedObject.type === 'target' && 
                           rope.attachedObject.affectedByGravity);
      
      // 检查是否是特殊处理的绳子
      const isSpecialRope = rope.isSpecialRope || false;
      
      // 检查是否是第2关的水平绳子
      const isLevel2HorizontalRope = this.currentLevel === 2 && isSpecialRope && isHorizontalRope;
      
      if (isVerticalCut) {
        // 直线绳子 - 垂直切断的绳子
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // 添加绳子纹理 - 短线条
        ctx.strokeStyle = '#6A4B1C'; // 稍深色的纹理
        ctx.lineWidth = 2;
        
        // 沿着直线添加短线条纹理
        const segments = 12; // 纹理线条数量
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const pointX = startX + dx * t;
          const pointY = startY + dy * t;
          
          // 计算垂直于绳子方向的向量
          const perpX = -dy / length;
          const perpY = dx / length;
          
          // 纹理线条长度
          const textureLength = 3;
          
          // 绘制纹理线条
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(pointX - perpX * textureLength, pointY - perpY * textureLength);
            ctx.lineTo(pointX + perpX * textureLength, pointY + perpY * textureLength);
            ctx.stroke();
          }
        }
      } else {
        // 弯曲绳子 - 所有其他情况
        // 根据绳子方向调整弯曲程度
        let sagAmount;
        
        if (isSpecialRope && isHorizontalRope) {
          // 特殊水平绳子使用固定的弯曲程度，避免抖动
          sagAmount = 15; // 使用固定值而不是基于长度的计算
        } else if (isLevel2HorizontalRope) {
          // 第2关的水平绳子，使用更强的下垂效果
          sagAmount = length * 0.5; // 使用更大的系数
        } else if (isHorizontalRope) {
          // 水平绳子，弯曲向下更明显
          sagAmount = length * 0.35; // 进一步增加弯曲程度，从0.3提高到0.35
          
          // 如果物体受重力影响，增加下垂效果
          if (rope.attachedObject && rope.attachedObject.affectedByGravity) {
            sagAmount = length * 0.5; // 受重力影响的物体，下垂更明显
          }
        } else {
          // 垂直绳子，弯曲较小
          sagAmount = length * 0.1;
        }
        
        // 第一关唯一一根绳子，初始化时为直线
        if (this.currentLevel === 1 && this.ropes.length === 1) {
          sagAmount = 0;
        } else {
          sagAmount = length * 0.1;
        }
        
        // 使用二次贝塞尔曲线创建弯曲效果
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // 计算控制点位置
        let ctrlX, ctrlY;
        
        if (isHorizontalRope) {
          // 水平绳子，向下弯曲
          ctrlX = midX;
          
          // 对第2关的水平绳子特殊处理，确保下垂效果明显
          if (isLevel2HorizontalRope) {
            ctrlY = midY + sagAmount * 2.0; // 第2关的水平绳子使用更大的下垂量
          } else if (this.currentLevel === 2 && Math.abs(startY - endY) < 10) {
            ctrlY = midY + sagAmount * 1.5; // 第2关的水平绳子下垂效果更明显
          } else {
            // 检查是否有物体受重力影响
            const hasGravityAffectedObject = rope.attachedObject && rope.attachedObject.affectedByGravity;
            
            if (hasGravityAffectedObject) {
              // 如果物体受重力影响，增加下垂效果
              ctrlY = midY + sagAmount * 2.0; // 大幅增加下垂效果
            } else {
              ctrlY = midY + sagAmount; // 正常下垂效果
            }
          }
        } else {
          // 垂直绳子，向重力方向轻微弯曲
          const perpX = -dy / length;
          const perpY = dx / length;
          
          ctrlX = midX + perpX * sagAmount * 0.5;
          ctrlY = midY + perpY * sagAmount * 0.5;
        }
        
        // 绘制弯曲的绳子
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.stroke();
        
        // 添加绳子纹理 - 短线条
        ctx.strokeStyle = '#6A4B1C'; // 稍深色的纹理
        ctx.lineWidth = 2;
        
        // 沿着绳子路径添加短线条纹理
        const segments = isSpecialRope ? 6 : 8; // 优化：减少段数以提升性能
        
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          
          // 二次贝塞尔曲线上的点
          const pointX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX;
          const pointY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY;
          
          // 计算该点处的切线方向
          const tangentX = 2 * (1 - t) * (ctrlX - startX) + 2 * t * (endX - ctrlX);
          const tangentY = 2 * (1 - t) * (ctrlY - startY) + 2 * t * (endY - ctrlY);
          const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
          
          // 归一化切线向量
          const normTangentX = tangentX / tangentLength;
          const normTangentY = tangentY / tangentLength;
          
          // 垂直于切线的方向
          const perpX = -normTangentY;
          const perpY = normTangentX;
          
          // 纹理线条长度
          const textureLength = 3;
          
          // 绘制纹理线条
          if (i % 2 === 0) { // 每隔一个点画一条纹理线
            ctx.beginPath();
            ctx.moveTo(pointX - perpX * textureLength, pointY - perpY * textureLength);
            ctx.lineTo(pointX + perpX * textureLength, pointY + perpY * textureLength);
            ctx.stroke();
          }
        }
      }
      
      // 绘制绳子端点，增强可见性
      ctx.fillStyle = ropeColor;
      ctx.beginPath();
      ctx.arc(startX, startY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(endX, endY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制钉子效果（起点）
      ctx.save();
      ctx.beginPath();
      ctx.arc(startX, startY, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#B0B0B0'; // 灰银色底
      ctx.shadowColor = '#888';
      ctx.shadowBlur = 2;
      ctx.fill();
      ctx.shadowBlur = 0;
      // 高光
      ctx.beginPath();
      ctx.arc(startX - 2, startY - 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      
      ctx.restore();
    });
  }
  
  // 清理非活跃绳子，避免重影
  cleanInactiveRopes() {
    // 如果是第六关且已设置清除检测标记，则不执行额外的绳子检测
    if (this.currentLevel === 6 && this.cleanLevel6RopeDetection) {
      // 只移除非活跃绳子
      this.ropes = this.ropes.filter(rope => rope.active);
      return;
    }
    
    // 移除非活跃绳子
    this.ropes = this.ropes.filter(rope => rope.active);
    
    // 检查是否是第6关
    if (this.currentLevel === 6) {
      // 检查第6关的绳子数量是否不足4根，尝试补充丢失的绳子
      if (this.ropes.length < 3) {
        // console.log(`检测到第6关绳子数量不足4根，尝试恢复丢失的绳子`);
        
        // 不再尝试恢复第四根绳子
        // console.log('第6关不再自动添加丢失的绳子');
      }
    }
  }

  drawObjects(ctx) {
    this.objects.forEach(object => {
      if (!object.active) return;
      if (object.type === 'target' && object.fruitStyle) {
        this.drawFruit(ctx, object.x, object.y, object.radius, object.fruitStyle);
      } else {
        // 默认画圆形
        ctx.beginPath();
        ctx.arc(object.x, object.y, object.radius, 0, Math.PI * 2);
        ctx.fillStyle = object.color;
        ctx.fill();
      }
    });
  }

  drawCutLine(ctx) {
    if (!this.cutLine) return;
    
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.cutLine.startX, this.cutLine.startY);
    ctx.lineTo(this.cutLine.endX, this.cutLine.endY);
    ctx.stroke();
  }

  drawUI(ctx) {
    // 绘制控制按钮
    if (this.buttons) {
      this.buttons.forEach(button => {
        ctx.fillStyle = button.bgColor;
        drawRoundRect(ctx, button.x, button.y, button.width, button.height, 12);
        ctx.fill();
        ctx.strokeStyle = button.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = button.textColor;
        ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          button.text,
          button.x + button.width / 2,
          button.y + button.height / 2
        );
      });
    }
    // 绘制关卡信息
    if (this.levelInfo) {
      // 获取关卡文案
      let levelTitle = '';
      switch (this.currentLevel) {
        case 1: levelTitle = '基础挑战'; break;
        case 2: levelTitle = '简单物理'; break;
        case 3: levelTitle = '基础切割'; break;
        case 4: levelTitle = '三重切割'; break;
        case 5: levelTitle = '多重切割'; break;
        case 6: levelTitle = '四重解密'; break;
        case 7: levelTitle = '五重解谜'; break;
        case 8: levelTitle = '复杂解谜'; break;
        case 9: levelTitle = '终极挑战'; break;
      }
      // 第一行：第X关 - 文案
      ctx.fillStyle = this.levelInfo.color;
      ctx.font = `bold ${this.levelInfo.fontSize}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`第${this.currentLevel}关 - ${levelTitle}`, this.levelInfo.x, this.levelInfo.y);
      // 第二行：XX秒，显示在"第X关"下方
      ctx.font = `bold ${this.levelInfo.fontSize}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#FF0000';
      ctx.fillText(`${this.currentElapsedTime}秒`, this.levelInfo.x, this.levelInfo.y + this.levelInfo.fontSize + 4);
    }
  }

  handleTouch(x, y) {
    // 如果手势提示可见，立即隐藏
    if (this.gestureHint.visible) {
      this.gestureHint.visible = false;
      this.gestureHint.alpha = 0;
    }
    
    // 检查UI按钮
    this.buttons.forEach(button => {
      if (this.isPointInButton(x, y, button)) {
        this.audio.playButtonSound();
        button.action();
        return;
      }
    });
    
    // 开始切割
    this.startCut(x, y);
  }

  handleTouchMove(x, y, deltaX, deltaY) {
    // 更新切割线
    if (this.isCutting) {
      this.updateCutLine(x, y);
    }
  }

  handleTouchEnd() {
    // 结束切割
    this.endCut();
  }

  startCut(x, y) {
    this.isCutting = true;
    this.cutLine = {
      startX: x,
      startY: y,
      endX: x,
      endY: y
    };
  }

  updateCutLine(x, y) {
    if (!this.cutLine) return;
    
    this.cutLine.endX = x;
    this.cutLine.endY = y;
    
    // 检测绳子切割
    this.checkRopeCut(x, y);
  }

  endCut() {
    this.isCutting = false;
    this.cutLine = null;
  }
  
  // 更新UI
  updateUI() {
    // 更新关卡信息
    if (this.levelInfo) {
      this.levelInfo.text = `第${this.currentLevel}关 ${this.currentElapsedTime}秒`;
    }
  }
  
  // 检查两条线段是否相交，并返回交点
  checkLineCut(x1, y1, x2, y2, x3, y3, x4, y4) {
    // 线段1: (x1,y1) - (x2,y2)
    // 线段2: (x3,y3) - (x4,y4)
    
    // 计算分母
    const denominator = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
    
    // 如果分母为0，则线段平行或共线
    if (denominator === 0) {
      return null;
    }
    
    // 计算参数a和b
    const a = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const b = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    
    // 如果a和b都在[0,1]范围内，则线段相交
    if (a >= 0 && a <= 1 && b >= 0 && b <= 1) {
      // 计算交点坐标
      const x = x1 + a * (x2 - x1);
      const y = y1 + a * (y2 - y1);
      
      return { x, y };
    }
    
    // 线段不相交
    return null;
  }

  checkRopeCut(x, y) {
    if (!this.cutLine || this.ropes.length === 0) return false;
    
    // 优化：创建切割线的包围盒，用于快速筛选
    const line = this.cutLine;
    const boundingBox = {
      minX: Math.min(line.startX, line.endX) - 10,
      minY: Math.min(line.startY, line.endY) - 10,
      maxX: Math.max(line.startX, line.endX) + 10,
      maxY: Math.max(line.startY, line.endY) + 10,
    };
    
    let cutMade = false;
    let verticalRopeCut = false;
    let affectedObject = null;
    
    // 遍历所有绳子
    for (let i = 0; i < this.ropes.length; i++) {
      const rope = this.ropes[i];
      if (!rope.active) continue;

      // 优化：快速包围盒检测
      const ropeBox = {
        minX: Math.min(rope.startX, rope.endX),
        minY: Math.min(rope.startY, rope.endY),
        maxX: Math.max(rope.startX, rope.endX),
        maxY: Math.max(rope.startY, rope.endY),
      };

      if (boundingBox.maxX < ropeBox.minX || boundingBox.minX > ropeBox.maxX || 
          boundingBox.maxY < ropeBox.minY || boundingBox.minY > ropeBox.maxY) {
        continue; // 如果包围盒不相交，则跳过精确检测
      }
      
      // 特殊处理第6关的第4根绳子，确保其可见且可被切割
      if (this.currentLevel === 6 && 
          Math.abs(rope.startX - 300) < 5 && 
          Math.abs(rope.endX - 300) < 5 && 
          Math.abs(rope.maxLength - 70) < 5) {
        // console.log('检测到第6关的第4根绳子');
      }
      
      // 检查切割线是否与绳子相交
      const cutPoint = this.checkLineCut(
        this.cutLine.startX, this.cutLine.startY,
        this.cutLine.endX, this.cutLine.endY,
        rope.startX, rope.startY,
        rope.endX, rope.endY
      );
      
      if (cutPoint) {
        // 判断是否是垂直绳子
        const dx = rope.endX - rope.startX;
        const dy = rope.endY - rope.startY;
        const isVerticalRope = Math.abs(dx) < Math.abs(dy) * 1.5;
        
        if (isVerticalRope) {
          verticalRopeCut = true;
          
          // 特殊处理第三关的垂直绳子切割
          if (this.currentLevel === 3 && rope.attachedObject) {
            // console.log('第3关切断垂直绳子，适度调整物体受重力影响');
            rope.attachedObject.affectedByGravity = true;
            rope.attachedObject.velocity.y += this.physics.gravity * 2; // 减小重力效果
          }
          
          // 特殊处理第四关的垂直绳子切割
          if (this.currentLevel === 4 && rope.attachedObject) {
            // console.log('第4关切断垂直绳子，适度调整物体受重力影响');
            rope.attachedObject.affectedByGravity = true;
            rope.attachedObject.velocity.y += this.physics.gravity * 2; // 适中的重力效果
          }
        } else {
          // 水平绳子被切断
        }
        
        // 切割绳子
        this.physics.cutRope(rope, cutPoint.x, cutPoint.y);
        rope.active = false; // 标记绳子为非活跃
        
        // 播放切割音效
        this.audio.playCutSound();
        
        // 记录受影响的物体
        if (rope.attachedObject) {
          affectedObject = rope.attachedObject;
          
          // 保险修复：无论是否还有其他绳子，强制受重力
          rope.attachedObject.affectedByGravity = true;
          rope.attachedObject.velocity.y += this.physics.gravity * 2;

          // 检查是否还有其他绳子连接到这个物体
          const stillAttached = this.ropes.some(r => 
            r !== rope && r.active && r.attachedObject === rope.attachedObject
          );
          if (!stillAttached) {
            // 这里保留原有逻辑作为冗余
            rope.attachedObject.affectedByGravity = true;
            rope.attachedObject.velocity.y += this.physics.gravity * 2; // 立即给予下落初速度
          }
        }
        
        cutMade = true;
        
        // 特殊处理第6关的第4根绳子被切割后的情况
        if (this.currentLevel === 6 && 
            Math.abs(rope.startX - 300) < 5 && 
            Math.abs(rope.endX - 300) < 5 && 
            Math.abs(rope.maxLength - 70) < 5) {
          // console.log('第6关的第4根绳子被切断');
        }
      }
    }
    
    // 如果切断了垂直绳子，并且物体还有其他绳子连接，强制让物体受重力影响
    if (verticalRopeCut && affectedObject) {
      // 检查是否还有水平绳子连接到这个物体
      const hasHorizontalRope = this.ropes.some(r => {
        if (!r.active || r.attachedObject !== affectedObject) return false;
        
        const dx = r.endX - r.startX;
        const dy = r.endY - r.startY;
        return Math.abs(dx) > Math.abs(dy) * 1.5; // 是水平绳子
      });
      
      if (hasHorizontalRope) {
        // 强制让物体受重力影响，即使还有水平绳子连接
        affectedObject.affectedByGravity = true;
        
        // 对所有关卡的水平绳子都应用重力效果
        // console.log(`第${this.currentLevel}关：强制物体受重力影响`);
        // 增加物体的向下速度，使下垂效果更明显
        affectedObject.velocity.y += this.physics.gravity * 3;
        
        // 特别处理第三关的水平绳子
        if (this.currentLevel === 3) {
          // console.log('第3关特殊处理：适度调整物体受重力影响');
          // 使用适中的重力效果
          affectedObject.velocity.y += this.physics.gravity * 2;
          // 添加适中的下垂位移
          affectedObject.y += 2.0;
          
          // 确保物理引擎中的绳子状态同步
          this.physics.ropes.forEach(r => {
            if (r.attachedObject === affectedObject) {
              // 更新物理引擎中的绳子状态
              r.endX = affectedObject.x;
              r.endY = affectedObject.y;
            }
          });
          
          // 使用更温和的延迟位移
          setTimeout(() => {
            if (affectedObject && affectedObject.active) {
              affectedObject.y += 3.0; // 减小额外下垂位移
              // console.log('第3关延迟添加适量下垂位移');
            }
          }, 100);
        }
        
        // 特别处理第四关的水平绳子
        else if (this.currentLevel === 4) {
          // console.log('第4关特殊处理：适度调整物体受重力影响');
          // 使用适中的重力效果
          affectedObject.velocity.y += this.physics.gravity * 2;
          // 添加适中的下垂位移
          affectedObject.y += 2.0;
          
          // 确保物理引擎中的绳子状态同步
          this.physics.ropes.forEach(r => {
            if (r.attachedObject === affectedObject) {
              // 更新物理引擎中的绳子状态
              r.endX = affectedObject.x;
              r.endY = affectedObject.y;
            }
          });
          
          // 使用适量的延迟位移
          setTimeout(() => {
            if (affectedObject && affectedObject.active) {
              affectedObject.y += 3.0; // 适量下垂位移
              // console.log('第4关延迟添加适量下垂位移');
            }
          }, 100);
        }
      }
    }
    
    // 检查是否只剩下水平绳子
    if (affectedObject) {
      // 计算连接到该物体的活跃绳子数量和类型
      let activeRopes = 0;
      let hasVerticalRope = false;
      
      this.ropes.forEach(r => {
        if (r.active && r.attachedObject === affectedObject) {
          activeRopes++;
          
          const dx = r.endX - r.startX;
          const dy = r.endY - r.startY;
          if (Math.abs(dx) < Math.abs(dy) * 1.5) {
            hasVerticalRope = true; // 有垂直绳子
          }
        }
      });
      
      // 如果有活跃绳子但没有垂直绳子，则只剩下水平绳子
      if (activeRopes > 0 && !hasVerticalRope) {
        // 强制让物体受重力影响
        affectedObject.affectedByGravity = true;
        // console.log(`第${this.currentLevel}关：只剩下水平绳子，强制物体受重力影响`);
        // 增加物体的向下速度，使下垂效果更明显
        affectedObject.velocity.y += this.physics.gravity * 3;
        
        // 特别处理第三关的水平绳子
        if (this.currentLevel === 3) {
          // console.log('第3关特殊处理：适度调整物体受重力影响');
          // 使用适中的重力效果
          affectedObject.velocity.y += this.physics.gravity * 2;
          // 添加适中的下垂位移
          affectedObject.y += 2.0;
          
          // 确保物理引擎中的绳子状态同步
          this.physics.ropes.forEach(r => {
            if (r.attachedObject === affectedObject) {
              // 更新物理引擎中的绳子状态
              r.endX = affectedObject.x;
              r.endY = affectedObject.y;
            }
          });
        }
        
        // 特别处理第四关的水平绳子
        else if (this.currentLevel === 4) {
          // console.log('第4关特殊处理：适度调整物体受重力影响');
          // 使用适中的重力效果
          affectedObject.velocity.y += this.physics.gravity * 2;
          // 添加适中的下垂位移
          affectedObject.y += 2.0;
          
          // 确保物理引擎中的绳子状态同步
          this.physics.ropes.forEach(r => {
            if (r.attachedObject === affectedObject) {
              // 更新物理引擎中的绳子状态
              r.endX = affectedObject.x;
              r.endY = affectedObject.y;
            }
          });
        }
        
        // 对于其他关卡，也应用适当的下垂效果
        else if (this.currentLevel > 6) {
          // 使用适中的重力效果
          affectedObject.velocity.y += this.physics.gravity * 2;
          // 添加适中的下垂位移
          affectedObject.y += 2.0;
          
          // 确保物理引擎中的绳子状态同步
          this.physics.ropes.forEach(r => {
            if (r.attachedObject === affectedObject) {
              // 更新物理引擎中的绳子状态
              r.endX = affectedObject.x;
              r.endY = affectedObject.y;
            }
          });
        }
      }
    }
    
    // 清理非活跃绳子，避免重影
    this.cleanInactiveRopes();
    
    // 新增：只剩一根垂直绳子时，强制受重力影响
    if (affectedObject) {
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === affectedObject);
      if (attachedRopes.length === 1) {
        const rope = attachedRopes[0];
        const dx = rope.endX - rope.startX;
        const dy = rope.endY - rope.startY;
        const isVerticalRope = Math.abs(dx) < Math.abs(dy) * 1.5;
        if (isVerticalRope) {
          affectedObject.affectedByGravity = true;
          affectedObject.velocity.y += this.physics.gravity * 2;
        }
      }
    }
    
    // 兜底：只剩一个垂直绳子时，强制 target 受重力
    const target = this.objects.find(obj => obj.type === 'target');
    if (target) {
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === target);
      if (attachedRopes.length === 1) {
        const rope = attachedRopes[0];
        const dx = rope.endX - rope.startX;
        const dy = rope.endY - rope.startY;
        const isVerticalRope = Math.abs(dx) < Math.abs(dy) * 1.5;
        if (isVerticalRope && !target.affectedByGravity) {
          target.affectedByGravity = true;
          target.velocity.y += this.physics.gravity * 2;
        }
      }
    }
    
    return cutMade;
  }

  checkGameState() {
    if (this.gameState !== 'playing') return;
    for (const object of this.objects) {
      if (object.type === 'target' && object.active) {
        // 检查是否触碰障碍物
        if (this.isObjectHitObstacle(object)) {
          this.gameFailed();
          return;
        }
        
        // 检查是否超出边界
        if (this.isObjectOutOfBounds(object)) {
          this.gameFailed();
          return;
        }
        
        // 检查是否到达底部
        if (object.y > this.device.screenHeight - 50) {
          if (this.isObjectPassingThroughMonsterCenter(object)) {
            this.gameSuccess();
          } else {
            this.gameFailed();
          }
          return;
        }
      }
    }
  }

  // 检查物体是否从小怪物正中心位置落下
  isObjectPassingThroughMonsterCenter(object) {
    if (!this.targetArea) return false;
    
    // 小怪物中心X坐标
    const monsterCenterX = this.targetArea.x + this.targetArea.width / 2;
    
    // X坐标容差（像素），可根据UI调整
    const xTolerance = 15; // 稍微放宽X坐标的容差
    
    // 检查物体的X坐标是否在怪物中心附近
    const dx = Math.abs(object.x - monsterCenterX);
    const isInCenterX = dx < xTolerance;
    

    
    return isInCenterX;
  }

  isObjectInTargetArea(object) {
    if (!this.targetArea) return false;
    // 小怪物中心
    const monsterCenterX = this.targetArea.x + this.targetArea.width / 2;
    const monsterCenterY = this.targetArea.y + this.targetArea.height / 2;
    // 距离容差（像素），可根据UI调整
    const tolerance = 8;
    const dx = object.x - monsterCenterX;
    const dy = object.y - monsterCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < tolerance;
  }

  isObjectOutOfBounds(object) {
    return object.x < -50 || 
           object.x > this.device.screenWidth + 50 ||
           object.y < -50 || 
           object.y > this.device.screenHeight + 50;
  }

  isObjectHitObstacle(object) {
    return this.obstacles.some(obstacle => {
      // 获取物体中心点到障碍物中心点的距离
      const objCenterX = object.x;
      const objCenterY = object.y;
      const obsCenterX = obstacle.x + obstacle.width / 2;
      const obsCenterY = obstacle.y + obstacle.height / 2;
      
      // 根据障碍物类型进行不同的碰撞检测
      switch (obstacle.obstacleType) {
        case 'circle': {
          // 圆形障碍物碰撞检测：两圆心距离 < 两半径之和
          const obsRadius = Math.min(obstacle.width, obstacle.height) / 2;
          const dx = objCenterX - obsCenterX;
          const dy = objCenterY - obsCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < (object.radius + obsRadius);
        }
          
        case 'triangle': {
          // 三角形障碍物碰撞检测：简化为矩形碰撞检测
          // 对于更精确的三角形碰撞可以使用点在三角形内的算法
          return this.rectCircleCollision(object, obstacle);
        }
          
        case 'star': {
          // 星形障碍物碰撞检测：简化为圆形碰撞检测
          const obsRadius = Math.min(obstacle.width, obstacle.height) / 2;
          const dx = objCenterX - obsCenterX;
          const dy = objCenterY - obsCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < (object.radius + obsRadius * 0.8); // 稍微缩小碰撞半径
        }
          
        case 'hexagon': {
          // 六边形障碍物碰撞检测：简化为圆形碰撞检测
          const obsRadius = Math.min(obstacle.width, obstacle.height) / 2;
          const dx = objCenterX - obsCenterX;
          const dy = objCenterY - obsCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < (object.radius + obsRadius);
        }
          
        case 'cloud': {
          // 云朵形障碍物碰撞检测：简化为椭圆碰撞检测
          const obsRadiusX = obstacle.width / 2;
          const obsRadiusY = obstacle.height / 2;
          const dx = objCenterX - obsCenterX;
          const dy = objCenterY - obsCenterY;
          // 椭圆碰撞检测的简化版本
          const normalizedDistance = Math.pow(dx / obsRadiusX, 2) + Math.pow(dy / obsRadiusY, 2);
          return normalizedDistance < 1 + (object.radius / Math.min(obsRadiusX, obsRadiusY));
        }
          
        case 'candy': {
          // 糖果形障碍物碰撞检测：简化为椭圆碰撞检测
          const obsRadiusX = obstacle.width * 0.8 / 2;
          const obsRadiusY = obstacle.height / 2;
          const dx = objCenterX - obsCenterX;
          const dy = objCenterY - obsCenterY;
          // 椭圆碰撞检测的简化版本
          const normalizedDistance = Math.pow(dx / obsRadiusX, 2) + Math.pow(dy / obsRadiusY, 2);
          return normalizedDistance < 1 + (object.radius / Math.min(obsRadiusX, obsRadiusY));
        }
          
        case 'gift':
        case 'rectangle':
        default:
          // 矩形障碍物碰撞检测
          return this.rectCircleCollision(object, obstacle);
      }
    });
  }
  
  // 矩形与圆形的碰撞检测
  rectCircleCollision(circle, rect) {
    // 找出矩形上离圆心最近的点
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    
    // 计算圆心到矩形最近点的距离
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
    
    // 如果距离小于圆的半径，则发生碰撞
    return distanceSquared < (circle.radius * circle.radius);
  }

  gameSuccess() {
    if (this.gameState !== 'playing') return;
    this.gameState = 'success';
    this.objects.forEach(obj => {
      if (obj.type === 'target') obj.active = false;
    });
    
    // 保存最佳成绩
    this.game.storage.saveBestScore(this.currentLevel, this.currentElapsedTime);
    // 标记当前关卡为已通关
    this.game.storage.setLevelCompleted(this.currentLevel);
    // 解锁下一关
    const nextLevel = this.currentLevel + 1;
    if (nextLevel <= 9) {
      this.game.storage.unlockLevel(nextLevel);
    }
    // 第9关完成特殊处理
    if (this.currentLevel === 9) {
      // 检查是否所有关卡完成
      let allCompleted = true;
      for (let i = 1; i <= 9; i++) {
        if (!this.game.storage.isLevelUnlocked(i)) {
          allCompleted = false;
          break;
        }
      }
      if (allCompleted) {
        this.game.showToast('🎉 恭喜通关！所有关卡已完成！');
      } else {
        this.game.showToast('🎉 终极挑战完成！');
      }
    }
    
    // 先播放成功音效，音效播放完成后再弹出结算弹窗
    this.audio.playSuccessSound();
    setTimeout(() => {
      this.audio.stopMusic();
      this.game.switchScene('result', {
        level: this.currentLevel,
        time: this.currentElapsedTime,
        success: true
      });
    }, 1000);
  }

  gameFailed() {
    if (this.gameState !== 'playing') return;
    this.gameState = 'failed';
    this.audio.playFailSound();
    setTimeout(() => {
      this.audio.stopMusic();
      this.game.switchScene('revive', {
        level: this.currentLevel
      });
    }, 1000);
  }

  pauseGame() {
    this.gameState = 'paused';
    this.pausedElapsedTime += Math.floor((Date.now() - this.levelStartTime) / 1000);
    // 传递快照给 PauseScene
    const snapshot = this.getSnapshot();
    this.game.switchScene('pause', {
      level: this.currentLevel,
      elapsedTime: this.pausedElapsedTime,
      snapshot
    });
  }

  resumeGameFromPause(totalTime) {
    this.levelStartTime = Date.now();
    this.gameState = 'playing';
  }

  resetLevel() {
    // 清除所有物体和绳子
    this.objects.forEach(obj => this.physics.removeObject(obj));
    this.ropes.forEach(rope => this.physics.removeRope(rope));
    this.objects = [];
    this.ropes = [];
    this.obstacles = [];
    this.targetArea = null;
    this.cutLine = null;
    
    // 重置物理引擎
    this.physics.reset();
    
    // 重新加载当前关卡
    this.loadLevel(this.currentLevel);
    
    // 重置游戏状态
    this.gameState = 'playing';
    this.levelStartTime = Date.now();
    this.pausedElapsedTime = 0;
    this.currentElapsedTime = 0;
    this.score = 0;
    this.isCutting = false;
    
    // 重置UI状态
    this.buttons.forEach(button => {
      if (button.id === 'pause') {
        button.visible = true;
      }
    });
    
    // 启动手势提示
    this.startGestureHint();
    
    // console.log('关卡已重置');
  }

  showHint() {
    // 显示当前关卡的提示信息
    this.game.showToast(this.currentHint);
  }

  handleObjectCollision(obj1, obj2) {
    // 处理物体碰撞
    if (obj1.type === 'target' && obj2.type === 'obstacle') {
      this.audio.playCollisionSound();
      if (this.gameState === 'playing') {
        this.gameFailed();
      }
    }
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  destroy() {
    if (this.audio && typeof this.audio.stopMusic === 'function') {
      this.audio.stopMusic();
    }
    this.objects = [];
    this.ropes = [];
    this.obstacles = [];
    this.buttons = [];
    this.targetArea = null;
    this.levelInfo = null;
    this.cutLine = null;
    // 离开闯关场景时停止闯关音乐
    this.audio.stopMusic();
  }

  // 更新UI
  updateUI() {
    // 更新关卡信息
    if (this.levelInfo) {
      this.levelInfo.text = `第${this.currentLevel}关 ${this.currentElapsedTime}秒`;
    }
  }

  // 特殊处理第三关的水平绳子
  fixLevel3HorizontalRope() {
    if (this.currentLevel !== 3) return;
    
    // console.log('特殊处理第3关的水平绳子');
    
    // 找到第三关的水平绳子
    const horizontalRopes = this.ropes.filter(rope => {
      const dx = rope.endX - rope.startX;
      const dy = rope.endY - rope.startY;
      return Math.abs(dx) > Math.abs(dy) * 1.5; // 是水平绳子
    });
    
    if (horizontalRopes.length > 0) {
      // 对每根水平绳子进行特殊处理
      horizontalRopes.forEach(rope => {
        // 标记为特殊绳子
        rope.isSpecialRope = true;
        
        // 确保绳子长度适中，增加稳定性
        rope.maxLength = Math.min(rope.maxLength, 160);
        
        // 确保物理引擎中的绳子也被更新
        this.physics.ropes.forEach(r => {
          if (r.startX === rope.startX && r.startY === rope.startY) {
            r.isSpecialRope = true;
            r.maxLength = rope.maxLength;
          }
        });
      });
      
      // 确保目标物体在切割垂直绳子后会受到重力影响
      const targetObjects = this.objects.filter(obj => obj.type === 'target');
      if (targetObjects.length > 0) {
        targetObjects.forEach(obj => {
          // 预设物体的重力状态，但不立即激活
          obj._readyForGravity = true;
          
          // 重置物体速度，减少抖动
          obj.velocity.x = 0;
          obj.velocity.y = 0;
        });
      }
    }
  }

  // 特殊处理第五关的水平绳子
  fixLevel5HorizontalRope() {
    if (this.currentLevel !== 5) return;
    
    // 找到第五关的水平绳子
    const horizontalRopes = this.ropes.filter(rope => {
      const dx = rope.endX - rope.startX;
      const dy = rope.endY - rope.startY;
      return Math.abs(dx) > Math.abs(dy) * 1.5; // 是水平绳子
    });
    
    if (horizontalRopes.length > 0) {
      // 对每根水平绳子进行特殊处理
      horizontalRopes.forEach(rope => {
        // 标记为特殊绳子
        rope.isSpecialRope = true;
        
        // 减小绳子长度，增加稳定性
        rope.maxLength = Math.min(rope.maxLength, 110);
        
        // 确保物理引擎中的绳子也被更新
        this.physics.ropes.forEach(r => {
          if (r.startX === rope.startX && r.startY === rope.startY) {
            r.isSpecialRope = true;
            r.maxLength = rope.maxLength;
          }
        });
      });
      
      // 为第五关添加额外的稳定性措施
      const targetObjects = this.objects.filter(obj => obj.type === 'target');
      if (targetObjects.length > 0) {
        targetObjects.forEach(obj => {
          // 减小初始速度，避免抖动
          obj.velocity.x = 0;
          obj.velocity.y = 0;
        });
      }
    }
  }

  // 特殊处理第六关
  fixLevel6() {
    if (this.currentLevel !== 6) return;
    
    // 确保第六关的绳子配置正确
    const targetObjects = this.objects.filter(obj => obj.type === 'target');
    if (targetObjects.length === 0) return;
    
    const targetObj = targetObjects[0];
    
    // 检查是否已经有第四根绳子
    const hasFourthRope = this.ropes.some(rope => 
      rope.startX === 300 && Math.abs(rope.startY - 50) < 10
    );
    
    // 如果没有第四根绳子，不要尝试添加
    if (!hasFourthRope) {
      // 清除可能存在的检测逻辑
      this.cleanLevel6RopeDetection = true;
    }
    
    // 确保所有绳子被正确标记
    this.ropes.forEach(rope => {
      // 标记水平绳子为特殊绳子
      const dx = rope.endX - rope.startX;
      const dy = rope.endY - rope.startY;
      if (Math.abs(dx) > Math.abs(dy) * 1.5) {
        rope.isSpecialRope = true;
      }
    });
  }

  // 特殊处理第四关的水平绳子
  fixLevel4HorizontalRope() {
    if (this.currentLevel !== 4) return;
    
    // 找到第四关的水平绳子
    const horizontalRopes = this.ropes.filter(rope => {
      const dx = rope.endX - rope.startX;
      const dy = rope.endY - rope.startY;
      return Math.abs(dx) > Math.abs(dy) * 1.5; // 是水平绳子
    });
    
    if (horizontalRopes.length > 0) {
      // 对每根水平绳子进行特殊处理
      horizontalRopes.forEach(rope => {
        // 标记为特殊绳子
        rope.isSpecialRope = true;
        // 进一步减小绳子长度，贴合实际距离，增加稳定性
        rope.maxLength = Math.min(rope.maxLength, 105);
        // 确保物理引擎中的绳子也被更新
        this.physics.ropes.forEach(r => {
          if (r.startX === rope.startX && r.startY === rope.startY) {
            r.isSpecialRope = true;
            r.maxLength = rope.maxLength;
          }
        });
      });
      // 确保目标物体在切割垂直绳子后会立即受到重力影响
      const targetObjects = this.objects.filter(obj => obj.type === 'target');
      if (targetObjects.length > 0) {
        targetObjects.forEach(obj => {
          obj.affectedByGravity = true; // 立即激活重力
          // 重置物体速度，减少抖动
          obj.velocity.x = 0;
          obj.velocity.y = 0;
          // 额外加大阻尼
          obj.velocity.x *= 0.75;
          obj.velocity.y *= 0.75;
        });
      }
    }
  }
  
  // 通用处理所有关卡的水平绳子
  fixAllLevelsHorizontalRope() {
    // 跳过已有专门处理函数的关卡
    if (this.currentLevel === 3 || this.currentLevel === 4 || 
        this.currentLevel === 5 || this.currentLevel === 6 || this.currentLevel === 9) {
      return;
    }
    
    // 找到当前关卡的水平绳子
    const horizontalRopes = this.ropes.filter(rope => {
      const dx = rope.endX - rope.startX;
      const dy = rope.endY - rope.startY;
      return Math.abs(dx) > Math.abs(dy) * 1.5; // 是水平绳子
    });
    
    if (horizontalRopes.length > 0) {
      // 对每根水平绳子进行通用处理
      horizontalRopes.forEach(rope => {
        // 标记为特殊绳子
        rope.isSpecialRope = true;
        
        // 确保绳子长度适中，增加稳定性
        rope.maxLength = Math.min(rope.maxLength, 110);
        
        // 确保物理引擎中的绳子也被更新
        this.physics.ropes.forEach(r => {
          if (r.startX === rope.startX && r.startY === rope.startY) {
            r.isSpecialRope = true;
            r.maxLength = rope.maxLength;
          }
        });
      });
      
      // 确保目标物体在切割垂直绳子后会受到重力影响
      const targetObjects = this.objects.filter(obj => obj.type === 'target');
      if (targetObjects.length > 0) {
        targetObjects.forEach(obj => {
          // 重置物体速度，减少抖动
          obj.velocity.x = 0;
          obj.velocity.y = 0;
        });
      }
    }
  }

  // 新增：第7关抑制绳子抖动
  fixLevel7RopeStability() {
    if (this.currentLevel !== 7) return;
    this.ropes.forEach(rope => {
      if (rope.active && rope.attachedObject) {
        // 提高阻尼
        rope.attachedObject.velocity.x *= 0.7;
        rope.attachedObject.velocity.y *= 0.7;
        // 限制最大速度
        const maxVelocity = 2.0;
        if (Math.abs(rope.attachedObject.velocity.x) > maxVelocity) {
          rope.attachedObject.velocity.x = Math.sign(rope.attachedObject.velocity.x) * maxVelocity;
        }
        if (Math.abs(rope.attachedObject.velocity.y) > maxVelocity) {
          rope.attachedObject.velocity.y = Math.sign(rope.attachedObject.velocity.y) * maxVelocity;
        }
      }
    });
  }

  // 新增：第9关特殊处理
  fixLevel9() {
    if (this.currentLevel !== 9) return;
    
    // 确保第9关的绳子配置正确
    const targetObjects = this.objects.filter(obj => obj.type === 'target');
    if (targetObjects.length === 0) return;
    
    const targetObj = targetObjects[0];
    
    // 标记所有水平绳子为特殊绳子
    this.ropes.forEach(rope => {
      const dx = rope.endX - rope.startX;
      const dy = rope.endY - rope.startY;
      if (Math.abs(dx) > Math.abs(dy) * 1.5) {
        rope.isSpecialRope = true;
        // 减小绳子长度，增加稳定性
        rope.maxLength = Math.min(rope.maxLength, 110);
        
        // 确保物理引擎中的绳子也被更新
        this.physics.ropes.forEach(r => {
          if (r.startX === rope.startX && r.startY === rope.startY) {
            r.isSpecialRope = true;
            r.maxLength = rope.maxLength;
          }
        });
      }
    });
    
    // 确保目标物体在切割垂直绳子后会立即受到重力影响
    targetObjects.forEach(obj => {
      obj.affectedByGravity = true; // 立即激活重力
      // 重置物体速度，减少抖动
      obj.velocity.x = 0;
      obj.velocity.y = 0;
    });
  }

  // 获取当前游戏快照（序列化所有关键状态）
  getSnapshot() {
    return {
      currentLevel: this.currentLevel,
      gameState: this.gameState,
      pausedElapsedTime: this.pausedElapsedTime + Math.floor((Date.now() - this.levelStartTime) / 1000),
      currentElapsedTime: this.currentElapsedTime,
      totalElapsedTime: this.totalElapsedTime,
      lastTargetActive: this.lastTargetActive,
      targetArea: this.targetArea ? JSON.parse(JSON.stringify(this.targetArea)) : null,
      targetAreaMove: this.targetAreaMove ? JSON.parse(JSON.stringify(this.targetAreaMove)) : null,
      objects: this.objects.map(obj => ({
        ...obj,
        velocity: { ...obj.velocity },
        onCollision: undefined // 不能序列化函数
      })),
      ropes: this.ropes.map(rope => {
        // 查找 attachedObjectIndex
        let attachedObjectIndex = undefined;
        if (rope.attachedObject) {
          attachedObjectIndex = this.objects.indexOf(rope.attachedObject);
        }
        return { ...rope, attachedObjectIndex };
      }),
      obstacles: this.obstacles.map(obs => ({ ...obs })),
      cutLine: this.cutLine ? { ...this.cutLine } : null,
      isCutting: this.isCutting,
      physics: this.physics.getSnapshot ? this.physics.getSnapshot() : null
    };
  }

  // 从快照还原游戏状态
  restoreFromSnapshot(snapshot) {
    if (!snapshot) return;
    this.currentLevel = snapshot.currentLevel;
    this.gameState = snapshot.gameState;
    this.pausedElapsedTime = snapshot.pausedElapsedTime;
    this.currentElapsedTime = snapshot.currentElapsedTime;
    this.totalElapsedTime = snapshot.totalElapsedTime;
    this.lastTargetActive = snapshot.lastTargetActive;
    this.targetArea = snapshot.targetArea ? JSON.parse(JSON.stringify(snapshot.targetArea)) : null;
    this.targetAreaMove = snapshot.targetAreaMove ? JSON.parse(JSON.stringify(snapshot.targetAreaMove)) : null;
    this.objects = snapshot.objects.map(obj => {
      const newObj = { ...obj, velocity: { ...obj.velocity } };
      // 重新绑定 onCollision
      newObj.onCollision = (other) => this.handleObjectCollision(newObj, other);
      return newObj;
    });
    // 重新绑定 ropes 的 attachedObject
    this.ropes = snapshot.ropes.map(rope => {
      const newRope = { ...rope };
      if (typeof rope.attachedObjectIndex === 'number' && this.objects[rope.attachedObjectIndex]) {
        newRope.attachedObject = this.objects[rope.attachedObjectIndex];
      } else if (rope.attachedObjectIndex === undefined && rope.attachedObject) {
        // 兼容旧快照，按 endX/endY 匹配
        newRope.attachedObject = this.objects.find(obj => obj.x === rope.endX && obj.y === rope.endY);
      } else {
        newRope.attachedObject = null;
      }
      return newRope;
    });
    this.obstacles = snapshot.obstacles.map(obs => ({ ...obs }));
    this.cutLine = snapshot.cutLine ? { ...snapshot.cutLine } : null;
    this.isCutting = snapshot.isCutting;
    // 还原物理引擎
    if (this.physics.restoreFromSnapshot && snapshot.physics) {
      this.physics.restoreFromSnapshot(snapshot.physics, this.objects, this.ropes);
    }
    // 重新绑定对象到物理引擎
    this.physics.objects = this.objects;
    this.physics.ropes = this.ropes;
    // 重新绑定 UI
    this.createUI();
    // 重新渲染
    this.gameState = 'playing';
    this.levelStartTime = Date.now();
    // 跳过还原后第一帧的 checkGameState，避免误判
    this._skipCheckGameStateFrame = 2;
    
    // 恢复背景音乐
    this.audio.playMusic('game');
  }

  // 新增：水果绘制方法
  drawFruit(ctx, x, y, r, style) {
    if (!style || !style.type) return;
    ctx.save();
    // 优先用图片渲染所有关卡水果
    const imgKey = `${style.type}_level${this.currentLevel}`;
    const img = this._fruitImgs ? this._fruitImgs[imgKey] : null;
    if (img && img.loaded) {
      // 以物体中心为锚点，图片宽高自适应物体半径
      const imgW = r * 4.2;
      const imgH = r * 2.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.drawImage(img, -imgW/2, -imgH/2, imgW, imgH);
      ctx.restore();
      ctx.restore();
      return;
    }
    // 兜底：原有绘制逻辑
    switch (style.type) {
      case 'apple':
        // 红色圆+高光+果柄+叶子
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = style.color1 || '#E94F4F';
        ctx.shadowColor = '#B71C1C';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 高光
        ctx.beginPath();
        ctx.arc(x - r/3, y - r/3, r/5, 0, Math.PI * 2);
        ctx.fillStyle = style.color2 || '#FFF';
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
        // 果柄
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y - r - r/2.5);
        ctx.strokeStyle = '#8B5C2A';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // 叶子
        ctx.beginPath();
        ctx.ellipse(x + r/4, y - r*0.95, r/5, r/9, Math.PI/6, 0, Math.PI*2);
        ctx.fillStyle = '#43A047';
        ctx.fill();
        break;
      case 'peach':
        // 第二关桃子用图片绘制
        const peachKey = `peach_level${this.currentLevel}`;
        if (this._fruitImgs[peachKey] && this._fruitImgs[peachKey].loaded) {
          const imgW = r * 2.2; // 适配桃子宽度
          const imgH = r * 2.2; // 适配桃子高度
          ctx.save();
          ctx.translate(x, y);
          ctx.drawImage(this._fruitImgs[peachKey], -imgW/2, -imgH/2, imgW, imgH);
          ctx.restore();
          break;
        }
        // 兜底：粉色圆形桃子，带叶子
        ctx.save();
        // 桃子主体
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = style.color1 || '#FFB6C1';
        ctx.shadowColor = '#FF69B4';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 桃子高光
        ctx.beginPath();
        ctx.arc(x - r/3, y - r/3, r/6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF';
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        // 桃子叶子
        ctx.beginPath();
        ctx.ellipse(x + r/4, y - r*0.95, r/5, r/9, Math.PI/6, 0, Math.PI*2);
        ctx.fillStyle = '#43A047';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FF69B4';
        ctx.stroke();
        ctx.restore();
        break;
      case 'watermelon':
        // 绿色外圆+红色内芯+黑籽
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#43A047';
        ctx.shadowColor = '#388E3C';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, r*0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FF5252';
        ctx.fill();
        // 籽
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(angle)*r*0.5, y + Math.sin(angle)*r*0.5, r*0.08, r*0.16, angle, 0, Math.PI*2);
          ctx.fillStyle = '#222';
          ctx.fill();
        }
        break;
      case 'orange':
        // 橙色圆+白色分瓣+高光
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = style.color1 || '#FFA500';
        ctx.shadowColor = '#E65100';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle)*r, y + Math.sin(angle)*r);
          ctx.stroke();
        }
        // 高光
        ctx.beginPath();
        ctx.arc(x - r/3, y - r/3, r/6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF';
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'pear':
        // 淡黄椭圆+绿色叶+果柄
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2);
        ctx.fillStyle = style.color1 || '#FFFACD';
        ctx.shadowColor = '#BDB76B';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 梨柄
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y - r - 10);
        ctx.strokeStyle = '#8B5C2A';
        ctx.lineWidth = 3;
        ctx.stroke();
        // 叶子
        ctx.beginPath();
        ctx.ellipse(x + 7, y - r - 7, 6, 3, Math.PI / 6, 0, Math.PI * 2);
        ctx.fillStyle = '#7ED957';
        ctx.fill();
        break;
      case 'mango':
        // 橙黄椭圆+绿色叶+果柄
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI/10);
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = style.color1 || '#FFD700';
        ctx.shadowColor = '#E6B800';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 芒果柄
        ctx.beginPath();
        ctx.moveTo(r*0.5, -r*0.5);
        ctx.lineTo(r*0.7, -r*0.8);
        ctx.strokeStyle = '#8B5C2A';
        ctx.lineWidth = 2;
        ctx.stroke();
        // 叶子
        ctx.beginPath();
        ctx.ellipse(r*0.7, -r*0.8, 6, 3, Math.PI / 6, 0, Math.PI * 2);
        ctx.fillStyle = '#7ED957';
        ctx.fill();
        ctx.restore();
        break;
      case 'hami':
        // 浅橙椭圆+绿色花纹
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = style.color1 || '#FFE4B5';
        ctx.shadowColor = '#FFD180';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.save();
        ctx.strokeStyle = '#7ED957';
        ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.ellipse(x, y, r * 0.9, r * 0.6, i * Math.PI / 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        break;
      case 'grape':
        // 黄绿色圆+尖刺
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = style.color1 || '#9B59B6';
        ctx.shadowColor = '#8E44AD';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 葡萄串
        ctx.strokeStyle = '#8E44AD';
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 / 12) * i;
          ctx.beginPath();
          ctx.arc(x + Math.cos(angle) * r * 0.7, y + Math.sin(angle) * r * 0.7, r * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = '#9B59B6';
          ctx.fill();
        }
        // 葡萄叶子
        ctx.beginPath();
        ctx.ellipse(x + r/4, y - r*0.95, r/5, r/9, Math.PI/6, 0, Math.PI*2);
        ctx.fillStyle = '#43A047';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      case 'lemon':
        // 黄色椭圆+高光
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI/8);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.8, r, 0, 0, Math.PI * 2);
        ctx.fillStyle = style.color || '#FFD700';
        ctx.shadowColor = '#E6B800';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        // 高光
        ctx.beginPath();
        ctx.ellipse(-r*0.2, -r*0.3, r*0.18, r*0.08, 0, 0, Math.PI*2);
        ctx.fillStyle = '#FFF';
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        break;
      default:
        // 未知类型，画默认圆形
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = style.color1 || '#FF6B6B';
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  // 启动手势提示
  startGestureHint() {
    this.gestureHint.visible = true;
    this.gestureHint.fadeOut = false;
    this.gestureHint.alpha = 1.0;
    this.gestureHint.startTime = Date.now();
    this.gestureHint.animationTime = 0;
    
    // 初始化动画位置
    const centerX = this.device.screenWidth / 2;
    const hintWidth = this.device.adaptSize(300);
    this.gestureHint.fingerStartX = centerX - hintWidth / 4;
    this.gestureHint.fingerEndX = centerX + hintWidth / 4;
    this.gestureHint.fingerX = this.gestureHint.fingerStartX;
    this.gestureHint.fingerY = this.device.screenHeight / 2;
  }

  // 更新手势提示
  updateGestureHint(deltaTime) {
    if (!this.gestureHint.visible) return;
    
    this.gestureHint.animationTime += deltaTime;
    const elapsed = Date.now() - this.gestureHint.startTime;
    
    // 计算动画进度 (0-1)
    const progress = Math.min(elapsed / 2000, 1); // 2秒完成一次循环
    
    // 手指滑动动画
    const fingerTravelDistance = this.device.adaptSize(80);
    this.gestureHint.fingerX = this.gestureHint.fingerStartX + 
                               (this.gestureHint.fingerEndX - this.gestureHint.fingerStartX) * progress;
    
    // 轨迹虚线动画
    this.gestureHint.trailOffset += deltaTime * 0.1; // 虚线移动速度
    if (this.gestureHint.trailOffset > 20) {
      this.gestureHint.trailOffset = 0;
    }
    
    // 切割点闪烁动画
    this.gestureHint.cutPointAlpha = 0.3 + 0.7 * Math.sin(this.gestureHint.animationTime * 0.01);
    
    // 整体缩放动画
    this.gestureHint.scale = 1.0 + 0.05 * Math.sin(this.gestureHint.animationTime * 0.005);
    
    // 脉冲效果
    this.gestureHint.pulseAlpha = 0.5 + 0.5 * Math.sin(this.gestureHint.animationTime * 0.008);
    
    // 绳子切割进度动画
    if (progress > 0.5) {
      this.gestureHint.ropeCutProgress = (progress - 0.5) * 2; // 后半段开始切割
    } else {
      this.gestureHint.ropeCutProgress = 0;
    }
    
    // 3秒后开始淡出
    if (elapsed > this.gestureHint.duration) {
      this.gestureHint.fadeOut = true;
      this.gestureHint.alpha -= deltaTime / 1000; // 1秒内淡出
      
      if (this.gestureHint.alpha <= 0) {
        this.gestureHint.visible = false;
        this.gestureHint.alpha = 0;
      }
    }
  }

  // 绘制手势提示
  drawGestureHint(ctx) {
    if (!this.gestureHint.visible) return;
    
    ctx.save();
    ctx.globalAlpha = this.gestureHint.alpha;
    
    // 计算手势提示位置（屏幕中央）
    const centerX = this.device.screenWidth / 2;
    const centerY = this.device.screenHeight / 2;
    const hintWidth = this.device.adaptSize(300);
    const hintHeight = this.device.adaptSize(200);
    
    // 应用缩放动画
    ctx.translate(centerX, centerY);
    ctx.scale(this.gestureHint.scale, this.gestureHint.scale);
    ctx.translate(-centerX, -centerY);
    
    // 绘制半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(
      centerX - hintWidth / 2,
      centerY - hintHeight / 2,
      hintWidth,
      hintHeight
    );
    
    // 绘制边框
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      centerX - hintWidth / 2,
      centerY - hintHeight / 2,
      hintWidth,
      hintHeight
    );
    
    // 绘制手指手势（带动画位置）
    const fingerSize = this.device.adaptSize(40);
    const fingerY = centerY;
    
    // 绘制手指手势
    this.drawFingerGesture(ctx, this.gestureHint.fingerX, fingerY, fingerSize);
    
    // 绘制滑动轨迹（带动画虚线）
    const trailLength = this.device.adaptSize(80);
    const trailX = this.gestureHint.fingerX + trailLength;
    const trailY = fingerY;
    
    // 绘制轨迹线（带动画虚线）
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.lineDashOffset = this.gestureHint.trailOffset;
    ctx.beginPath();
    // 从手势图片右侧开始绘制轨迹
    const fingerWidth = fingerSize;
    ctx.moveTo(this.gestureHint.fingerX + fingerWidth / 2, fingerY);
    ctx.lineTo(trailX, trailY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 绘制箭头（带动画闪烁）
    const arrowSize = this.device.adaptSize(15);
    ctx.globalAlpha = this.gestureHint.pulseAlpha;
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.moveTo(trailX, trailY);
    ctx.lineTo(trailX - arrowSize, trailY - arrowSize / 2);
    ctx.lineTo(trailX - arrowSize, trailY + arrowSize / 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = this.gestureHint.alpha; // 恢复透明度
    
    // 绘制绳子示意（带动画切割）
    const ropeX = centerX + hintWidth / 4;
    const ropeY = centerY - hintHeight / 4;
    const ropeLength = this.device.adaptSize(60);
    
    // 绘制绳子（上半部分）
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ropeX, ropeY);
    ctx.lineTo(ropeX, ropeY + ropeLength / 2);
    ctx.stroke();
    
    // 绘制绳子（下半部分，根据切割进度调整）
    if (this.gestureHint.ropeCutProgress < 1) {
      ctx.beginPath();
      ctx.moveTo(ropeX, ropeY + ropeLength / 2 + (ropeLength / 2) * this.gestureHint.ropeCutProgress);
      ctx.lineTo(ropeX, ropeY + ropeLength);
      ctx.stroke();
    }
    
    // 绘制切割点（带动画闪烁）
    const cutPointX = ropeX;
    const cutPointY = ropeY + ropeLength / 2;
    const cutPointSize = this.device.adaptSize(8);
    
    ctx.globalAlpha = this.gestureHint.cutPointAlpha;
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(cutPointX, cutPointY, cutPointSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = this.gestureHint.alpha; // 恢复透明度
    
    // 绘制文字提示
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('滑动切割绳子', centerX, centerY + hintHeight / 3);
    
    ctx.restore();
  }

  // 绘制手指手势（使用图片）
  drawFingerGesture(ctx, x, y, size) {
    ctx.save();
    
    // 检查手势图片是否已加载
    if (!this.gestureImage || !this.gestureImageLoaded) {
      // 如果图片未加载，使用默认绘制
      this.drawDefaultGesture(ctx, x, y, size);
      ctx.restore();
      return;
    }
    
    // 计算绘制参数
    const drawWidth = size;
    const drawHeight = size;
    const drawX = x - drawWidth / 2;
    const drawY = y - drawHeight / 2;
    
    // 添加阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // 绘制手势图片
    ctx.drawImage(this.gestureImage, drawX, drawY, drawWidth, drawHeight);
    
    // 清除阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.restore();
  }
  
  // 默认手势绘制（备用方案）
  drawDefaultGesture(ctx, x, y, size) {
    // 绘制一个简单的圆形作为备用
    ctx.fillStyle = '#FCDB63';
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  drawButtons(ctx) {
    this.buttons.forEach((button) => {
      ctx.save();
      ctx.globalAlpha = 1;
      // 绘制按钮背景
      ctx.fillStyle = button.bgColor;
      drawRoundRect(ctx, button.x, button.y, button.width, button.height, 12);
      ctx.fill();
      // 绘制按钮边框
      ctx.strokeStyle = button.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // 绘制按钮文字或icon
      ctx.fillStyle = button.textColor;
      ctx.font = `bold ${this.device.adaptFontSize(20)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 如果是暂停按钮，微调y坐标
      if (button.text === '⏸️') {
        ctx.fillText(
          button.text,
          button.x + button.width / 2,
          button.y + button.height / 2 + this.device.adaptSize(4)
        );
      } else {
        ctx.fillText(
          button.text,
          button.x + button.width / 2,
          button.y + button.height / 2
        );
      }
      ctx.restore();
    });
  }
}

module.exports = GameScene; 