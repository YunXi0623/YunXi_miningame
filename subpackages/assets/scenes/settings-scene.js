// 设置场景
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

class SettingsScene {
  constructor(game) {
    this.game = game;
    this.device = new DeviceAdapter();
    this.audio = game.audio; // 使用全局唯一音频实例
    
    // 设置项
    this.settings = {
      sound: true,
      vibration: true,
      bgMusic: false
    };
    this._originalSettings = null; // 新增：记录进入设置页时的原始设置
    
    // UI元素
    this.title = null;
    this.backButton = null;
    this.settingItems = [];
    this.saveButton = null;
    
    this.init();
    // 进入设置界面时停止背景音乐
    this.audio.stopMusic();
  }

  init() {
    // 加载当前设置
    this.settings = this.game.storage.getSettings();
    // 记录原始设置（深拷贝）
    this._originalSettings = JSON.parse(JSON.stringify(this.settings));
    // 创建UI
    this.createUI();
  }

  createUI() {
    const centerX = this.device.screenWidth / 2;
    const topY = this.device.adaptSize(100);
    
    // 创建标题
    this.title = {
      x: centerX,
      y: topY,
      text: '游戏设置',
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
    
    // 创建设置项
    const itemHeight = this.device.adaptSize(60);
    const itemSpacing = this.device.adaptSize(20);
    const startY = topY + this.device.adaptSize(80);
    
    this.settingItems = [
      {
        x: this.device.adaptSize(30),
        y: startY,
        width: this.device.screenWidth - this.device.adaptSize(60),
        height: itemHeight,
        title: '音效',
        description: '切割、碰撞等音效',
        value: this.settings.sound,
        action: () => this.toggleSetting('sound')
      },
      {
        x: this.device.adaptSize(30),
        y: startY + itemHeight + itemSpacing,
        width: this.device.screenWidth - this.device.adaptSize(60),
        height: itemHeight,
        title: '震动',
        description: '切割时的触觉反馈',
        value: this.settings.vibration,
        action: () => this.toggleSetting('vibration')
      },
      {
        x: this.device.adaptSize(30),
        y: startY + (itemHeight + itemSpacing) * 2,
        width: this.device.screenWidth - this.device.adaptSize(60),
        height: itemHeight,
        title: '背景音乐',
        description: '游戏背景音乐',
        value: this.settings.bgMusic,
        action: () => this.toggleSetting('bgMusic')
      }
    ];
    
    // 创建保存按钮
    const saveButtonWidth = this.device.adaptSize(200);
    const saveButtonHeight = this.device.adaptSize(50);
    this.saveButton = {
      x: centerX - saveButtonWidth / 2,
      y: startY + (itemHeight + itemSpacing) * 3 + this.device.adaptSize(40),
      width: saveButtonWidth,
      height: saveButtonHeight,
      text: '保存设置',
      color: '#4A90E2',
      bgColor: '#4A90E2',
      textColor: '#FFFFFF',
      action: () => this.saveSettings()
    };
  }

  update() {
    // 设置场景不需要复杂的更新逻辑
  }

  render(ctx) {
    // 绘制背景
    this.drawBackground(ctx);
    
    // 绘制标题
    this.drawTitle(ctx);
    
    // 绘制返回按钮
    this.drawBackButton(ctx);
    
    // 绘制设置项
    this.drawSettingItems(ctx);
    
    // 绘制保存按钮
    this.drawSaveButton(ctx);
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

  drawSettingItems(ctx) {
    this.settingItems.forEach(item => {
      // 绘制设置项背景
      ctx.fillStyle = '#FFFFFF';
      drawRoundRect(ctx, item.x, item.y, item.width, item.height, 12);
      ctx.fill();
      
      // 绘制边框
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 绘制标题
      ctx.fillStyle = '#4A90E2';
      ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        item.title,
        item.x + this.device.adaptSize(20),
        item.y + item.height / 2 - this.device.adaptSize(10)
      );
      
      // 绘制描述
      ctx.fillStyle = '#666666';
      ctx.font = `${this.device.adaptFontSize(12)}px Arial`;
      ctx.fillText(
        item.description,
        item.x + this.device.adaptSize(20),
        item.y + item.height / 2 + this.device.adaptSize(10)
      );
      
      // 绘制开关
      this.drawToggle(ctx, item);
    });
  }

  drawToggle(ctx, item) {
    const toggleWidth = this.device.adaptSize(50);
    const toggleHeight = this.device.adaptSize(30);
    const toggleX = item.x + item.width - this.device.adaptSize(70);
    const toggleY = item.y + item.height / 2 - toggleHeight / 2;
    
    // 绘制开关背景
    ctx.fillStyle = item.value ? '#4A90E2' : '#CCCCCC';
    drawRoundRect(ctx, toggleX, toggleY, toggleWidth, toggleHeight, toggleHeight / 2);
    ctx.fill();
    
    // 绘制开关滑块
    const sliderSize = toggleHeight - this.device.adaptSize(4);
    const sliderX = item.value ? 
      toggleX + toggleWidth - sliderSize - this.device.adaptSize(2) : 
      toggleX + this.device.adaptSize(2);
    const sliderY = toggleY + this.device.adaptSize(2);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      sliderX + sliderSize / 2,
      sliderY + sliderSize / 2,
      sliderSize / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  drawSaveButton(ctx) {
    // 绘制按钮背景
    ctx.fillStyle = this.saveButton.bgColor;
    drawRoundRect(
      ctx,
      this.saveButton.x,
      this.saveButton.y,
      this.saveButton.width,
      this.saveButton.height,
      12
    );
    ctx.fill();
    
    // 绘制按钮边框
    ctx.strokeStyle = this.saveButton.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制按钮文字
    ctx.fillStyle = this.saveButton.textColor;
    ctx.font = `bold ${this.device.adaptFontSize(16)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.saveButton.text,
      this.saveButton.x + this.saveButton.width / 2,
      this.saveButton.y + this.saveButton.height / 2
    );
  }

  handleTouch(x, y) {
    // 检查返回按钮
    if (this.isPointInButton(x, y, this.backButton)) {
      this.audio.playButtonSound();
      this.backButton.action();
      return true;
    }
    
    // 检查保存按钮
    if (this.isPointInButton(x, y, this.saveButton)) {
      this.audio.playButtonSound();
      this.saveButton.action();
      return true;
    }
    
    // 检查设置项（包括开关按钮）
    for (let i = 0; i < this.settingItems.length; i++) {
      const item = this.settingItems[i];
      if (this.isPointInButton(x, y, item)) {
        this.audio.playButtonSound();
        item.action();
        return true;
      }
    }
    
    // 没有触摸到任何按钮
    return false;
  }

  isPointInButton(x, y, button) {
    return x >= button.x && 
           x <= button.x + button.width && 
           y >= button.y && 
           y <= button.y + button.height;
  }

  toggleSetting(settingName) {
    this.settings[settingName] = !this.settings[settingName];
    
    // 更新设置项显示
    this.settingItems.forEach(item => {
      if (item.title === this.getSettingTitle(settingName)) {
        item.value = this.settings[settingName];
      }
    });
    
    // 不再实时更新音频设置，仅更新UI
    // 测试震动（仅在开启时）
    if (settingName === 'vibration' && this.settings.vibration) {
      this.audio.vibrate();
    }
  }

  getSettingTitle(settingName) {
    const titles = {
      sound: '音效',
      vibration: '震动',
      bgMusic: '背景音乐'
    };
    return titles[settingName];
  }

  saveSettings() {
    // 保存设置到本地存储
    this.game.storage.updateSettings(this.settings);
    
    // 更新音频管理器设置
    this.audio.updateSettings(this.settings);
    
    // 更新原始设置为最新
    this._originalSettings = JSON.parse(JSON.stringify(this.settings));
    
    // 显示保存成功提示
    this.game.showToast('设置已保存');
    
    // 返回主菜单
    setTimeout(() => {
      this.goBack();
    }, 1000);
  }

  goBack() {
    // 如果未保存，恢复原始设置
    this.audio.updateSettings(this._originalSettings);
    
    // 同时恢复UI显示，确保界面与实际设置一致
    this.settings = JSON.parse(JSON.stringify(this._originalSettings));
    this.settingItems.forEach(item => {
      if (item.title === '音效') {
        item.value = this.settings.sound;
      } else if (item.title === '震动') {
        item.value = this.settings.vibration;
      } else if (item.title === '背景音乐') {
        item.value = this.settings.bgMusic;
      }
    });
    
    // 重要：将恢复的原始设置重新保存到存储，确保下次进入时显示正确
    this.game.storage.updateSettings(this._originalSettings);
    
    // 返回主菜单或关卡选择时恢复主界面音乐
    this.audio.playMusic('main');
    this.game.switchScene('mainMenu');
  }

  destroy() {
    this.title = null;
    this.backButton = null;
    this.settingItems = [];
    this.saveButton = null;
  }
}

module.exports = SettingsScene; 