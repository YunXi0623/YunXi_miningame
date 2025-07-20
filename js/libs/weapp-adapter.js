// 微信小程序适配器
// 模拟浏览器环境，适配小游戏API

const { platform } = wx.getSystemInfoSync();

// Canvas适配
const canvas = wx.createCanvas();
const context = canvas.getContext('2d');

// 屏幕适配
const systemInfo = wx.getSystemInfoSync();
const screenWidth = systemInfo.screenWidth;
const screenHeight = systemInfo.screenHeight;
const pixelRatio = systemInfo.pixelRatio;

// 设置canvas尺寸
canvas.width = screenWidth * pixelRatio;
canvas.height = screenHeight * pixelRatio;
context.scale(pixelRatio, pixelRatio);

// 全局对象
const global = {
  canvas: canvas,
  context: context,
  screenWidth: screenWidth,
  screenHeight: screenHeight,
  pixelRatio: pixelRatio
};

// 导出全局对象
module.exports = global; 