// 示例 worker 脚本
self.onmessage = function(e) {
  // 收到主线程消息后，原样返回
  self.postMessage({ msg: 'Worker received:', data: e.data });
}; 