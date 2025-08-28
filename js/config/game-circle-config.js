// 游戏圈配置文件
const GameCircleConfig = {
  // 游戏圈首页链接
  homePage: '-SSEykJvFV3pORt5kTNpSwYJfccWYWjNNtN1ENfh6p81eooCieibztt7WcZsyj5FDlGyw6zZ2O5fTCdJ4zM-sLvUA9nbA-oNUP_yLJfOwdutKEfz1wEmzvA83JDOPc37bRIsvMPvA51US3af5TUR6dJqC274sauTnwmxNfb9wzH6LLgC6zAASz-Q0U16bHmxIjAcg7aqi58pz8SohJT6CtqjvtxlJlNGOCtmnoflBOgcQOuE3NTtv9gIUFDm0CXTSXVUqOJ9kmskWo146j8d9nUf9QkDR-u715MtuWI_gk0yeiSbKnPCtUcYRz2ZvtBiwU8lPAsjoCVC048bmsQwZQ',
  
  // 游戏圈功能配置
  features: {
    // 是否启用游戏圈功能
    enabled: true,
    
    // 是否显示游戏圈按钮
    showButton: true,
    
    // 按钮样式配置
    buttonStyle: {
      color: '#FF6B6B',
      bgColor: '#FF6B6B',
      textColor: '#FFFFFF',
      text: '游戏圈'
    }
  },
  
  // 获取游戏圈首页链接
  getHomePageLink() {
    return this.homePage;
  },
  
  // 检查游戏圈功能是否启用
  isEnabled() {
    return this.features.enabled;
  },
  
  // 获取按钮样式配置
  getButtonStyle() {
    return this.features.buttonStyle;
  }
};

module.exports = GameCircleConfig;
