// 微信小游戏分享配置
// 这个文件专门用于配置分享功能

// 微信小游戏分享回调函数 - 发送给朋友
function onShareAppMessage() {
  console.log('onShareAppMessage 被调用');
  return {
    title: '我要挑战10个！',
    imageUrl: 'images/GameSharingImage.jpg',
    query: 'from=share'
  };
}

// 微信小游戏分享回调函数 - 分享到朋友圈
function onShareTimeline() {
  console.log('onShareTimeline 被调用');
  return {
    title: '我要挑战10个！',
    imageUrl: 'images/GameSharingImage.jpg',
    query: 'from=timeline'
  };
}

// 方法1：将函数暴露到全局作用域
if (typeof global !== 'undefined') {
  global.onShareAppMessage = onShareAppMessage;
  global.onShareTimeline = onShareTimeline;
}

if (typeof window !== 'undefined') {
  window.onShareAppMessage = onShareAppMessage;
  window.onShareTimeline = onShareTimeline;
}

// 方法2：直接定义全局函数（不通过任何对象）
if (typeof globalThis !== 'undefined') {
  globalThis.onShareAppMessage = onShareAppMessage;
  globalThis.onShareTimeline = onShareTimeline;
}

// 方法3：使用 wx API 注册分享回调
if (typeof wx !== 'undefined') {
  // 注册分享给朋友的回调
  wx.onShareAppMessage && wx.onShareAppMessage(onShareAppMessage);
  // 注册分享到朋友圈的回调
  wx.onShareTimeline && wx.onShareTimeline(onShareTimeline);
}

module.exports = {
  onShareAppMessage,
  onShareTimeline
};
