/**
 * ad-manager.js
 * 微信激励视频广告管理器 (单例模式)
 * 职责：
 * 1. 初始化并全局维护唯一的广告实例
 * 2. 绑定所有广告事件监听（onLoad, onError, onClose），且只绑定一次
 * 3. 提供一个简单的 show() 接口给游戏场景调用
 * 4. 通过回调函数将广告的结果（成功/失败）通知给游戏场景
 */

// ------------------- 模块内部变量 -------------------

// 广告实例 (全局唯一)
let rewardedVideoAd = null;

// 广告单元ID
let adUnitId = 'adunit-e98136806a1dc6bc';

// 状态锁：防止在广告加载或播放期间重复调用
let isAdBusy = false;

// 临时的回调函数，用于存储本次调用的成功和失败处理逻辑
let adCallbacks = {
  onSuccess: null,
  onFail: null,
};

// 防止重复触发回调的标记
let hasTriggeredCallback = false;

// ------------------- 模块暴露的接口 -------------------

const AdManager = {

  /**
   * 初始化广告管理器
   * @param {string} unitId - 你的广告单元ID，可选，默认使用预设ID
   */
  init(unitId) {
    // 防止重复初始化
    if (rewardedVideoAd) {
      console.warn('AdManager 已初始化，请勿重复调用 init()');
      return;
    }

    if (unitId) {
      adUnitId = unitId;
    }
    
    console.log('广告管理器开始初始化...');

    rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: adUnitId });

    // --- 在初始化时，一次性绑定所有永久有效的事件监听 ---

    // 监听广告加载成功
    rewardedVideoAd.onLoad(() => {
      console.log('[AdManager] 广告加载成功');
      // 注意：这里不应该自动显示广告，广告显示应该由用户主动触发
      // 广告加载成功只是表示广告实例准备就绪
    });

    // 监听广告错误
    rewardedVideoAd.onError(err => {
      console.error('[AdManager] 广告组件出错', err);
      wx.showToast({ title: '广告服务异常', icon: 'none' });
      this._triggerFailCallback('广告组件出错');
    });

    // 监听广告关闭事件（最核心的逻辑）
    rewardedVideoAd.onClose(res => {
      console.log('[AdManager] 广告关闭事件触发', res);
      
      // 防止重复触发回调
      if (hasTriggeredCallback) {
        console.log('[AdManager] 回调已触发，忽略重复的关闭事件');
        return;
      }

      // 根据流程图：无论用户是否看完，只要关闭了，就代表本次广告流程结束
      // 判断 res.isEnded 来确定是成功还是失败
      if (res && res.isEnded) {
        // 场景一：用户完整观看了视频
        console.log('[AdManager] 视频观看完成，触发成功回调');
        this._triggerSuccessCallback();
      } else {
        // 场景二：用户中途关闭了视频
        console.log('[AdManager] 视频中途退出，触发失败回调');
        this._triggerFailCallback('用户中途关闭广告');
      }
    });

    console.log('广告管理器初始化完成');
  },

  /**
   * 内部方法：触发成功回调
   */
  _triggerSuccessCallback() {
    if (adCallbacks.onSuccess && !hasTriggeredCallback) {
      hasTriggeredCallback = true;
      console.log('[AdManager] 执行成功回调');
      adCallbacks.onSuccess();
      this._resetState();
    }
  },

  /**
   * 内部方法：触发失败回调
   */
  _triggerFailCallback(reason) {
    if (adCallbacks.onFail && !hasTriggeredCallback) {
      hasTriggeredCallback = true;
      console.log('[AdManager] 执行失败回调，原因:', reason);
      adCallbacks.onFail();
      this._resetState();
    }
  },

  /**
   * 内部方法：重置状态
   */
  _resetState() {
    console.log('[AdManager] 重置广告状态');
    isAdBusy = false;
    hasTriggeredCallback = false;
    adCallbacks = { onSuccess: null, onFail: null };
  },

  /**
   * 向游戏场景提供的主要接口：显示激励视频广告
   * @param {object} callbacks
   * @param {function} callbacks.onSuccess - 广告观看成功的回调
   * @param {function} callbacks.onFail - 广告观看失败或中途退出的回调
   */
  show(callbacks) {
    console.log('[AdManager] show方法被调用，开始广告流程');
    
    if (isAdBusy) {
      console.warn('[AdManager] 广告正在处理中，本次调用被忽略');
      return;
    }

    if (!rewardedVideoAd) {
      console.error('[AdManager] 广告实例未初始化，请先调用 init()');
      return;
    }

    // 上锁，防止重复调用
    isAdBusy = true;
    hasTriggeredCallback = false;

    // 存储本次的回调
    adCallbacks = callbacks;

    console.log('[AdManager] 开始拉取广告...');
    
    // 先尝试直接显示广告（如果已经加载完成）
    rewardedVideoAd.show().then(() => {
      console.log('[AdManager] 广告直接显示成功');
      // 广告显示成功，等待用户观看完成
    }).catch((err) => {
      console.log('[AdManager] 广告未加载完成，开始加载:', err);
      
      // 如果显示失败，说明需要先加载广告
      rewardedVideoAd.load().then(() => {
        console.log('[AdManager] 广告加载成功，现在尝试显示');
        // 加载成功后再次尝试显示
        rewardedVideoAd.show().catch((showErr) => {
          console.error('[AdManager] 广告加载后显示失败:', showErr);
          this._triggerFailCallback('广告显示失败');
        });
      }).catch((loadErr) => {
        console.error('[AdManager] 广告加载失败:', loadErr);
        this._triggerFailCallback('广告加载失败');
      });
    });
  },

  /**
   * 检查广告是否可用
   * @returns {boolean} 广告是否可用
   */
  isAvailable() {
    return !isAdBusy && rewardedVideoAd !== null;
  },

  /**
   * 强制重置广告状态（用于修复状态卡死问题）
   */
  forceReset() {
    console.log('[AdManager] 强制重置广告状态');
    this._resetState();
  },

  /**
   * 获取当前广告状态（调试用）
   * @returns {object} 广告状态信息
   */
  getStatus() {
    return {
      isAdBusy,
      hasTriggeredCallback,
      hasCallbacks: !!(adCallbacks.onSuccess || adCallbacks.onFail),
      adInstance: !!rewardedVideoAd
    };
  },

  /**
   * (可选) 在游戏退出或场景销毁时调用，释放资源
   */
  destroy() {
    if (rewardedVideoAd) {
      rewardedVideoAd.destroy();
      rewardedVideoAd = null;
    }
    this._resetState();
  }
};

// 导出模块
module.exports = AdManager;
