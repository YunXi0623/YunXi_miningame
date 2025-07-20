// 关卡数据配置
class LevelData {
  static getLevelData(levelNum) {
    const levelData = {
      1: this.getLevel1Data(),
      2: this.getLevel2Data(),
      3: this.getLevel3Data(),
      4: this.getLevel4Data(),
      5: this.getLevel5Data(),
      6: this.getLevel6Data(),
      7: this.getLevel7Data(),
      8: this.getLevel8Data(),
      9: this.getLevel9Data()
    };
    
    return levelData[levelNum];
  }

  // 第1关 - 基础切割操作，通过率95%
  static getLevel1Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'apple', color1: '#E94F4F', color2: '#FFF' } // 关1 苹果
        }
      ],
      ropes: [
        {
          startX: 200,
          startY: 20,
          endX: 200,
          endY: 180,
          maxLength: 160,
          attachedObjectIndex: 0
        }
      ],
      obstacles: generateObstacles(1),
      hint: '等待合适的时机切断绳子，让苹果掉入目标区域'
    };
  }

  // 第2关 - 简单物理谜题，通过率85%
  static getLevel2Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 150,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'peach', color1: '#E94F4F', color2: '#FFF' } // 关2 桃子
        }
      ],
      ropes: [
        {
          startX: 150,
          startY: 20,
          endX: 150,
          endY: 180,
          maxLength: 160,
          attachedObjectIndex: 0
        },
        {
          startX: 20, // 更靠左，使水平效果更明显
          startY: 140, // 调整起点Y坐标，使绳子更水平
          endX: 150,
          endY: 180,
          maxLength: 160, // 进一步增加最大长度，使下垂效果更明显
          attachedObjectIndex: 0,
          color: '#8B4513', // 明确指定颜色，确保一致性
          isSpecialRope: true // 标记为特殊绳子，需要特殊处理
        }
      ],
      obstacles: generateObstacles(2),
      hint: '尝试切断不同的绳子，让桃子掉入目标区域'
    };
  }

  // 第3关 - 基础切割操作，通过率75%
  static getLevel3Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'watermelon', color1: '#E94F4F', color2: '#FFF' } // 关3 西瓜
        }
      ],
      ropes: [
        {
          startX: 200,
          startY: 20,
          endX: 200,
          endY: 180,
          maxLength: 160,
          attachedObjectIndex: 0
        },
        {
          startX: 350, // 更靠右，使水平效果更明显
          startY: 120, // 与物体高度更接近，使绳子更水平
          endX: 200,
          endY: 180,
          maxLength: 160, // 减小最大长度，增加稳定性
          attachedObjectIndex: 0,
          isSpecialRope: true, // 标记为特殊绳子，需要特殊处理
          color: '#8B4513' // 明确指定颜色，确保一致性
        }
      ],
      obstacles: generateObstacles(3),
      hint: '尝试切断不同的绳子，让西瓜掉入目标区域'
    };
  }

  // 第4关 - 多重切割，需要思考切割顺序，通过率65%
  static getLevel4Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'orange', color: '#FFD700' } // 关4 橙子
        }
      ],
      ropes: [
        {
          startX: 200,
          startY: 20,
          endX: 200,
          endY: 180,
          maxLength: 160,
          attachedObjectIndex: 0
        },
        {
          startX: 100, // 调整为更明显的水平位置
          startY: 150,
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          isSpecialRope: true, // 标记为特殊绳子，需要特殊处理
          color: '#8B4513' // 明确指定颜色，确保一致性
        },
        {
          startX: 300, // 调整为更明显的水平位置
          startY: 150,
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          isSpecialRope: true, // 标记为特殊绳子，需要特殊处理
          color: '#8B4513' // 明确指定颜色，确保一致性
        }
      ],
      obstacles: generateObstacles(4),
      hint: '尝试按正确的顺序切断绳子，让橙子掉入目标区域'
    };
  }

  // 第5关 - 多重切割，通过率55%
  static getLevel5Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'pear', color1: '#FF6B6B', color2: '#FFF' } // 关5 雪梨
        }
      ],
      ropes: [
        {
          startX: 200,
          startY: 20,
          endX: 200,
          endY: 180,
          maxLength: 160,
          attachedObjectIndex: 0
        },
        {
          startX: 100,
          startY: 120, // 调整高度，使下垂效果更明显
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          isSpecialRope: true, // 标记为特殊绳子，增加稳定性
          color: '#8B4513' // 明确指定颜色，确保一致性
        },
        {
          startX: 300,
          startY: 120, // 调整高度，使下垂效果更明显
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          isSpecialRope: true, // 标记为特殊绳子，增加稳定性
          color: '#8B4513' // 明确指定颜色，确保一致性
        }
      ],
      obstacles: generateObstacles(5),
      hint: '尝试按正确的顺序切断绳子，避开障碍物'
    };
  }

  // 第6关 - 多重切割，挑战性提升，通过率45%
  static getLevel6Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'mango', color1: '#FF7F50', color2: '#FFF' } // 关6 芒果
        }
      ],
      ropes: [
        {
          startX: 200,
          startY: 20,
          endX: 200,
          endY: 180,
          maxLength: 160,
          attachedObjectIndex: 0
        },
        {
          startX: 100,
          startY: 120,
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          color: '#8B4513', // 明确指定颜色，确保一致性
          isSpecialRope: true // 标记为特殊绳子
        },
        {
          startX: 300,
          startY: 120,
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          color: '#8B4513', // 明确指定颜色，确保一致性
          isSpecialRope: true // 标记为特殊绳子
        },
        {
          startX: 250, // 更偏右
          startY: 120,
          endX: 230, // 终点也偏右下
          endY: 220,
          maxLength: 130,
          attachedObjectIndex: 0
        }
      ],
      obstacles: generateObstacles(6),
      hint: '尝试按正确的顺序切断绳子，让芒果掉入目标区域'
    };
  }

  // 第7关 - 复杂解谜，包含障碍物和机关，通过率35%
  static getLevel7Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'lemon', color: '#FF69B4' } // 关7 柠檬
        }
      ],
      ropes: [
        {
          startX: 200,
          startY: 20,
          endX: 200,
          endY: 180,
          maxLength: 160,
          attachedObjectIndex: 0
        },
        {
          startX: 100,
          startY: 120,
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          color: '#8B4513', // 明确指定颜色，确保一致性
          isSpecialRope: true // 标记为特殊绳子，增加稳定性
        },
        {
          startX: 300,
          startY: 120,
          endX: 200,
          endY: 180,
          maxLength: 110, // 减小长度，增加稳定性
          attachedObjectIndex: 0,
          color: '#8B4513', // 明确指定颜色，确保一致性
          isSpecialRope: true // 标记为特殊绳子，增加稳定性
        },
        {
          startX: 80, // 更偏左
          startY: 200,
          endX: 120, // 终点偏左下
          endY: 220,
          maxLength: 130,
          attachedObjectIndex: 0
        },
        {
          startX: 320, // 更偏右
          startY: 200,
          endX: 280, // 终点偏右下
          endY: 220,
          maxLength: 130,
          attachedObjectIndex: 0
        }
      ],
      obstacles: generateObstacles(7),
      hint: '尝试按正确的顺序切断绳子，避开障碍物'
    };
  }

  // 第8关 - 复杂解谜，高难度挑战，通过率25%
  static getLevel8Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'hami', color: '#00C2B1' } // 关8 哈密瓜
        }
      ],
      ropes: [
        // 第8关 6根绳子
        { startX: 200, startY: 20, endX: 200, endY: 180, maxLength: 160, attachedObjectIndex: 0 },
        { startX: 100, startY: 120, endX: 200, endY: 180, maxLength: 110, attachedObjectIndex: 0, color: '#8B4513', isSpecialRope: true },
        { startX: 300, startY: 120, endX: 200, endY: 180, maxLength: 110, attachedObjectIndex: 0, color: '#8B4513', isSpecialRope: true },
        { startX: 80, startY: 200, endX: 200, endY: 180, maxLength: 140, attachedObjectIndex: 0 },
        { startX: 320, startY: 200, endX: 200, endY: 180, maxLength: 140, attachedObjectIndex: 0 },
        { startX: 200, startY: 300, endX: 200, endY: 180, maxLength: 130, attachedObjectIndex: 0 }
      ],
      obstacles: generateObstacles(8),
      hint: '尝试按正确的顺序切断绳子，避开障碍物'
    };
  }

  // 第9关 - 终极挑战，通过率15%
  static getLevel9Data() {
    return {
      targetArea: {
        x: 300,
        y: 500,
        width: 80,
        height: 80
      },
      objects: [
        {
          x: 200,
          y: 180,
          radius: 25,
          color: '#FF6B6B',
          type: 'target',
          affectedByGravity: false,
          fruitStyle: { type: 'grape', color1: '#9B59B6', color2: '#FFF' } // 关9 葡萄
        }
      ],
      ropes: [
        // 第9关 6根绳子
        { startX: 200, startY: 20, endX: 200, endY: 180, maxLength: 160, attachedObjectIndex: 0 },
        { startX: 120, startY: 110, endX: 200, endY: 180, maxLength: 110, attachedObjectIndex: 0, color: '#8B4513', isSpecialRope: true },
        { startX: 280, startY: 110, endX: 200, endY: 180, maxLength: 110, attachedObjectIndex: 0, color: '#8B4513', isSpecialRope: true },
        { startX: 60, startY: 170, endX: 200, endY: 180, maxLength: 140, attachedObjectIndex: 0 },
        { startX: 340, startY: 170, endX: 200, endY: 180, maxLength: 140, attachedObjectIndex: 0 },
        { startX: 200, startY: 310, endX: 200, endY: 180, maxLength: 135, attachedObjectIndex: 0 }
      ],
      obstacles: generateObstacles(9, 10), // 增加障碍物数量
      hint: '这是最终葡萄挑战，需要精确的切割顺序和时机'
    };
  }
}

function generateObstacles(level, maxObstacles = 8) {
  if (level === 1) return [];
  const count = Math.min(level - 1, maxObstacles);
  const obstacles = [];
  
  // 定义不同类型的障碍物
  const obstacleTypes = [
    { type: 'rectangle', color: '#FF6B6B' },   // 普通矩形障碍物
    { type: 'circle', color: '#4A90E2' },      // 圆形障碍物
    { type: 'triangle', color: '#50E3C2' },    // 三角形障碍物
    { type: 'star', color: '#FFD700' },        // 星形障碍物
    { type: 'hexagon', color: '#9B59B6' },     // 六边形障碍物
    { type: 'cloud', color: '#3498DB' },       // 云朵形障碍物
    { type: 'candy', color: '#E74C3C' },       // 糖果形障碍物
    { type: 'gift', color: '#2ECC71' }         // 礼物盒障碍物
  ];
  
  for (let i = 0; i < count; i++) {
    // 随机选择一种障碍物类型
    const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    obstacles.push({
      x: 120 + (i % 4) * 60 + Math.random() * 20, // 横向分布
      y: 320 + Math.floor(i / 4) * 60 + Math.random() * 20, // 纵向分布
      width: 60 + Math.random() * 30,
      height: 15 + Math.random() * 10,
      color: randomType.color,
      obstacleType: randomType.type // 添加障碍物类型属性
    });
  }
  return obstacles;
}

module.exports = LevelData; 