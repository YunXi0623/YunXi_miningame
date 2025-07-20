// 自动检测并优化所有关卡绳子与障碍物重叠问题
// 用法：node auto-optimize-ropes.js
const fs = require('fs');
const path = require('path');
const originalFile = path.join(__dirname, 'level-data.js');
const backupFile = path.join(__dirname, 'level-data.backup.js');
const optimizedFile = path.join(__dirname, 'level-data.optimized.js');

// 读取原始level-data.js源码
let code = fs.readFileSync(originalFile, 'utf-8');

// 备份原始文件
if (!fs.existsSync(backupFile)) {
  fs.writeFileSync(backupFile, code, 'utf-8');
}

// 动态加载LevelData
const Module = module.constructor;
const m = new Module();
m._compile(code + '\nmodule.exports = LevelData;', 'level-data.js');
const LevelData = m.exports;

// 检查线段与矩形是否重叠
function lineRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh, margin = 0) {
  // 扩大障碍物边界margin像素
  rx -= margin; ry -= margin; rw += margin * 2; rh += margin * 2;
  // 四条边
  return (
    lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) || // top
    lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh) || // left
    lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) || // right
    lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) || // bottom
    (x1 > rx && x1 < rx + rw && y1 > ry && y1 < ry + rh) || // start点在障碍物内
    (x2 > rx && x2 < rx + rw && y2 > ry && y2 < ry + rh) // end点在障碍物内
  );
}
// 线段与线段相交
function lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// 检查并优化所有关卡
const optimizedLevels = {};
const margin = 10; // 绳子与障碍物最小间距
for (let level = 1; level <= 9; level++) {
  const data = LevelData.getLevelData(level);
  const { ropes, obstacles } = data;
  if (!ropes || !obstacles || ropes.length === 0 || obstacles.length === 0) {
    optimizedLevels[level] = data;
    continue;
  }
  const newRopes = ropes.map(rope => {
    let { startX, startY, endX, endY, maxLength } = rope;
    let changed = false;
    // 检查与所有障碍物的重叠
    for (const obs of obstacles) {
      if (!obs.x || !obs.y || !obs.width || !obs.height) continue;
      // 检查绳子线段与障碍物是否重叠
      if (lineRectIntersect(startX, startY, endX, endY, obs.x, obs.y, obs.width, obs.height, margin)) {
        // 优先微调startX/startY，尝试向外平移margin像素
        const dx = endX - startX, dy = endY - startY;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len > 0) {
          // 计算单位向量
          const ux = dx / len, uy = dy / len;
          // 尝试start点向反方向平移margin
          let newStartX = startX - ux * margin, newStartY = startY - uy * margin;
          if (!lineRectIntersect(newStartX, newStartY, endX, endY, obs.x, obs.y, obs.width, obs.height, margin)) {
            startX = newStartX; startY = newStartY; changed = true; continue;
          }
          // 尝试end点向外平移margin
          let newEndX = endX + ux * margin, newEndY = endY + uy * margin;
          if (!lineRectIntersect(startX, startY, newEndX, newEndY, obs.x, obs.y, obs.width, obs.height, margin)) {
            endX = newEndX; endY = newEndY; changed = true; continue;
          }
        }
        // 实在不行，缩短maxLength
        if (maxLength > margin * 2) {
          maxLength = maxLength - margin * 2;
          changed = true;
        }
      }
    }
    if (changed) {
      return { ...rope, startX, startY, endX, endY, maxLength };
    }
    return rope;
  });
  optimizedLevels[level] = { ...data, ropes: newRopes };
}

// 生成优化后的level-data.optimized.js
let output = code.replace(/class LevelData[\s\S]*?module\.exports = LevelData;/, 'module.exports = ' + JSON.stringify(optimizedLevels, null, 2) + ';');
fs.writeFileSync(optimizedFile, output, 'utf-8'); 