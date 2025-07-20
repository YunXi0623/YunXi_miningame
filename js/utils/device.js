// 设备适配工具类
class DeviceAdapter {
  constructor() {
    this.systemInfo = wx.getSystemInfoSync();
    this.screenWidth = this.systemInfo.screenWidth;
    this.screenHeight = this.systemInfo.screenHeight;
    this.pixelRatio = this.systemInfo.pixelRatio;
    this.platform = this.systemInfo.platform;
    this.model = this.systemInfo.model;
    
    // 设计基准尺寸（以iPhone 6为基准）
    this.designWidth = 375;
    this.designHeight = 667;
    
    // 计算缩放比例
    this.scaleX = this.screenWidth / this.designWidth;
    this.scaleY = this.screenHeight / this.designHeight;
    this.scale = Math.min(this.scaleX, this.scaleY);
  }

  // 适配尺寸
  adaptSize(size) {
    return size * this.scale;
  }

  // 适配位置
  adaptPosition(x, y) {
    return {
      x: x * this.scaleX,
      y: y * this.scaleY
    };
  }

  // 适配字体大小
  adaptFontSize(fontSize) {
    return Math.max(12, fontSize * this.scale);
  }

  // 获取安全区域
  getSafeArea() {
    const safeArea = this.systemInfo.safeArea || {};
    return {
      top: safeArea.top || 0,
      bottom: safeArea.bottom || this.screenHeight,
      left: safeArea.left || 0,
      right: safeArea.right || this.screenWidth
    };
  }

  // 判断是否为刘海屏
  isNotchScreen() {
    return this.systemInfo.safeArea && 
           (this.systemInfo.safeArea.top > 20 || 
            this.systemInfo.safeArea.bottom < this.screenHeight - 20);
  }

  // 获取设备信息
  getDeviceInfo() {
    return {
      platform: this.platform,
      model: this.model,
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      pixelRatio: this.pixelRatio,
      scale: this.scale
    };
  }
}

module.exports = DeviceAdapter; 