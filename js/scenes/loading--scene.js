const DeviceAdapter = require('../utils/device');

class LoadingScene {
  constructor(game) {
    this.game = game;
    this.isLoading = false;
    this.currentStepName = '加载完成';
    
    // 延迟切换到主菜单，让用户看到100%完成
    setTimeout(() => {
      this.game.switchScene('mainMenu');
    }, 500);
  }

  update() {
    // 更新加载进度
    // 这里可以添加实际的加载逻辑，例如加载资源、解析数据等
    // 例如：this.game.loadResource('assets/images/loading.png');
  }

  render() {
    // 渲染加载界面
    // 例如：this.game.drawText('加载中...', 100, 100);
  }
}

module.exports = LoadingScene; 