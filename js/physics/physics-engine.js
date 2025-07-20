// 简化版2D物理引擎
class PhysicsEngine {
  constructor(screenHeight = 600) {
    this.gravity = 0.5; // 重力加速度
    this.objects = []; // 物理对象数组
    this.ropes = []; // 绳子数组
    this.collisionGroups = {
      OBJECT: 1,
      ROPE: 2,
      OBSTACLE: 3,
      TARGET: 4
    };
    this.currentLevel = 1; // 默认为第1关
    this.screenHeight = screenHeight;
  }

  // 设置当前关卡
  setCurrentLevel(level) {
    this.currentLevel = level;
    
    // 根据关卡调整物理参数
    if (level === 3) {
      this.gravity = 0.6; // 第3关使用适中的重力，减少抖动
    } else if (level === 4) {
      this.gravity = 0.6; // 第4关使用适中的重力，减少抖动
    } else if (level === 5) {
      this.gravity = 0.5; // 第5关使用更小的重力，减少抖动
    } else if (level === 6) {
      this.gravity = 0.6; // 第6关使用适中的重力
    } else if (level === 9) {
      this.gravity = 0.6; // 第9关使用适中的重力，确保稳定性
    } else {
      this.gravity = 0.7; // 其他关卡使用稍微减小的重力，增加稳定性
    }
  }

  // 添加物理对象
  addObject(object) {
    this.objects.push(object);
  }

  // 移除物理对象
  removeObject(object) {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }

  // 添加绳子
  addRope(rope) {
    this.ropes.push(rope);
  }

  // 移除绳子
  removeRope(rope) {
    const index = this.ropes.indexOf(rope);
    if (index > -1) {
      this.ropes.splice(index, 1);
    }
  }

  // 更新物理世界
  update() {
    let freezeTarget = false;
    // --- 终极修复：第8/9关只剩2根及以上水平绳子时，完全冻结晃动 ---
    if (this.currentLevel === 8 || this.currentLevel === 9) {
      this.objects.forEach(object => {
        if (object.type === 'target' && object.active) {
          const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === object);
          // 第9关：只要有多根绳子就冻结，第8关：需要水平绳子
          const shouldFreeze = this.currentLevel === 9 ? 
            attachedRopes.length >= 2 : 
            (attachedRopes.length >= 2 && attachedRopes.every(r => Math.abs(r.endX - r.startX) > Math.abs(r.endY - r.startY) * 1.5));
          
          if (shouldFreeze) {
            // 直接冻结到所有端点平均值
            let sumX = 0, sumY = 0;
            attachedRopes.forEach(r => {
              const dx = object.x - r.startX;
              const dy = object.y - r.startY;
              const len = Math.sqrt(dx*dx + dy*dy) || 1;
              const dirX = dx / len;
              const dirY = dy / len;
              const tx = r.startX + dirX * r.maxLength;
              const ty = r.startY + dirY * r.maxLength;
              sumX += tx;
              sumY += ty;
            });
            const avgX = sumX / attachedRopes.length;
            const avgY = sumY / attachedRopes.length;
            object.x = avgX;
            object.y = avgY;
            object.velocity.x = 0;
            object.velocity.y = 0;
            freezeTarget = true;
          }
        }
      });
    }
    // 新增：第7关只剩3根绳子时冻结目标物体，防止抖动
    if (this.currentLevel === 7) {
      this.objects.forEach(object => {
        if (object.type === 'target' && object.active) {
          const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === object);
          if (attachedRopes.length === 3) {
            // 直接冻结到所有端点平均值
            let sumX = 0, sumY = 0;
            attachedRopes.forEach(r => {
              const dx = object.x - r.startX;
              const dy = object.y - r.startY;
              const len = Math.sqrt(dx*dx + dy*dy) || 1;
              const dirX = dx / len;
              const dirY = dy / len;
              const tx = r.startX + dirX * r.maxLength;
              const ty = r.startY + dirY * r.maxLength;
              sumX += tx;
              sumY += ty;
            });
            const avgX = sumX / attachedRopes.length;
            const avgY = sumY / attachedRopes.length;
            object.x = avgX;
            object.y = avgY;
            object.velocity.x = 0;
            object.velocity.y = 0;
            freezeTarget = true;
          }
        }
      });
    }
    
    // 如果需要冻结，直接跳过 updateObject 的重力/摩擦/位置更新
    if (!freezeTarget) {
      this.objects.forEach(object => {
        this.updateObject(object);
      });
    }
    // 更新绳子
    this.ropes.forEach(rope => {
      this.updateRope(rope);
    });
    // 检测碰撞
    this.checkCollisions();
  }

  // 更新物理对象
  updateObject(object) {
    if (!object.active) return;

    // 应用重力
    if (object.affectedByGravity) {
      object.velocity.y += this.gravity;
    }

    // 更新位置
    object.x += object.velocity.x;
    object.y += object.velocity.y;

    // 应用摩擦力
    object.velocity.x *= 0.98;
    object.velocity.y *= 0.98;

    // 边界检测
    this.checkBoundaries(object);
  }

  // 更新绳子
  updateRope(rope) {
    if (!rope.active) return;

    const obj = rope.attachedObject;
    if (!obj || !obj.active) return;

    // --- 新增：第8/9关只剩多根水平绳子时，updateRope 不做任何修正 ---
    if ((this.currentLevel === 8 || this.currentLevel === 9) && obj.type === 'target' && obj.active) {
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === obj);
      // 第9关：只要有多根绳子就跳过，第8关：需要水平绳子
      const shouldSkip = this.currentLevel === 9 ? 
        attachedRopes.length >= 2 : 
        (attachedRopes.length >= 2 && attachedRopes.every(r => Math.abs(r.endX - r.startX) > Math.abs(r.endY - r.startY) * 1.5));
      
      if (shouldSkip) {
        return; // 交给 update 末尾统一处理
      }
    }

    // 计算绳子当前长度
    const dx = obj.x - rope.startX;
    const dy = obj.y - rope.startY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // 判断是否为水平绳子
    const isHorizontalRope = Math.abs(dx) > Math.abs(dy) * 1.5;
    
    // 判断是否为特殊绳子
    const isSpecialRope = rope.isSpecialRope || false;

    // 如果绳子长度超过最大长度，施加约束
    if (length > rope.maxLength) {
      // 计算约束方向
      const dirX = dx / length;
      const dirY = dy / length;

      // 计算目标位置
      const targetX = rope.startX + dirX * rope.maxLength;
      const targetY = rope.startY + dirY * rope.maxLength;

      // 如果物体受重力影响，使用更强的约束
      if (obj.affectedByGravity) {
        // 根据关卡和绳子类型调整约束强度
        let constraintStrength = 0.2;
        
        if (this.currentLevel === 3 && isHorizontalRope) {
          constraintStrength = 0.25; // 第3关水平绳子使用适中的约束
        } else if (this.currentLevel === 4 && isHorizontalRope) {
          constraintStrength = 0.25; // 第4关水平绳子使用适中的约束
        } else if (this.currentLevel === 5 && isHorizontalRope) {
          constraintStrength = 0.3; // 第5关水平绳子使用更强的约束
        } else if (this.currentLevel === 6 && isHorizontalRope) {
          constraintStrength = 0.25; // 第6关水平绳子使用适中的约束
        } else if (this.currentLevel === 7) {
          constraintStrength = 0.35; // 第7关所有绳子都用更强约束
        } else if (this.currentLevel === 9) {
          constraintStrength = 0.15; // 第9关使用更弱的约束强度，减少震动
        } else if (isSpecialRope) {
          constraintStrength = 0.25; // 特殊绳子使用更强的约束
        }
        
        // 应用约束
        obj.x = obj.x * (1 - constraintStrength) + targetX * constraintStrength;
        obj.y = obj.y * (1 - constraintStrength) + targetY * constraintStrength;
      } else {
        // 物体不受重力影响时，使用更弱的约束
        let constraintStrength = 0.1;
        
        if (this.currentLevel === 3 && isHorizontalRope) {
          constraintStrength = 0.15; // 第3关水平绳子使用适中的约束
        } else if (this.currentLevel === 4 && isHorizontalRope) {
          constraintStrength = 0.15; // 第4关水平绳子使用适中的约束
        } else if (this.currentLevel === 5 && isHorizontalRope) {
          constraintStrength = 0.15; // 第5关水平绳子使用更强的约束
        } else if (this.currentLevel === 6 && isHorizontalRope) {
          constraintStrength = 0.12; // 第6关水平绳子使用适中的约束
        } else if (this.currentLevel === 7) {
          constraintStrength = 0.2; // 第7关所有绳子都用更强约束
        } else if (isSpecialRope) {
          constraintStrength = 0.12; // 特殊绳子使用更强的约束
        }
        
        // 应用约束
        obj.x = obj.x * (1 - constraintStrength) + targetX * constraintStrength;
        obj.y = obj.y * (1 - constraintStrength) + targetY * constraintStrength;
      }
      
      // 更新绳子终点位置
      rope.endX = obj.x;
      rope.endY = obj.y;
      
      // 减缓物体速度，避免弹跳效果
      if (this.currentLevel === 3 && isHorizontalRope) {
        // 第3关的水平绳子使用适中的阻尼，减少抖动
        obj.velocity.x *= 0.85;
        obj.velocity.y *= 0.85;
      } else if (this.currentLevel === 4 && isHorizontalRope) {
        // 第4关的水平绳子使用适中的阻尼，减少抖动
        obj.velocity.x *= 0.85;
        obj.velocity.y *= 0.85;
      } else if (this.currentLevel === 5 && isHorizontalRope) {
        // 第5关的水平绳子使用更强的阻尼，减少抖动
        obj.velocity.x *= 0.8;
        obj.velocity.y *= 0.8;
      } else if (this.currentLevel === 6 && isHorizontalRope) {
        // 第6关的水平绳子使用适中的阻尼
        obj.velocity.x *= 0.85;
        obj.velocity.y *= 0.85;
      } else if (this.currentLevel === 9 && isHorizontalRope) {
        // 第9关的水平绳子使用更强的阻尼，减少震动
        obj.velocity.x *= 0.7;
        obj.velocity.y *= 0.7;
      } else {
        // 其他关卡的水平绳子也使用适当的阻尼，确保稳定性
        if (isHorizontalRope) {
          obj.velocity.x *= 0.88;
          obj.velocity.y *= 0.88;
        } else {
          obj.velocity.x *= isSpecialRope ? 0.94 : 0.92; // 特殊绳子使用更强的阻尼
          obj.velocity.y *= isSpecialRope ? 0.94 : 0.92; // 特殊绳子使用更强的阻尼
        }
      }
      // 新增：第7关所有绳子都用更强阻尼
      if (this.currentLevel === 7) {
        obj.velocity.x *= 0.6;
        obj.velocity.y *= 0.6;
      }
    } else {
      // 对于未达到最大长度的绳子
      if (obj.type !== 'obstacle') {
        // 如果是水平绳子，无论物体是否受重力影响，都添加适当的下垂效果
        if (isHorizontalRope) {
          // 添加向下的力，模拟绳子下垂
          const sagFactor = obj.affectedByGravity ? 
                            (isSpecialRope ? 0.5 : 1.0) : // 增加下垂系数
                            (isSpecialRope ? 0.2 : 0.5);  // 增加下垂系数
          
          // 根据关卡调整下垂效果
          if (this.currentLevel === 3) {
            // 第3关的水平绳子使用适中的下垂系数，减少抖动
            if (obj.affectedByGravity) {
              obj.velocity.y += this.gravity * 1.2; // 适中的下垂效果
              obj.y += 1.8; // 适中的下垂位移
            } else {
              obj.velocity.y += this.gravity * 0.5; // 适中的下垂效果
              obj.y += 1.0; // 适中的下垂位移
            }
            
            // 增强水平方向的稳定性
            obj.velocity.x *= 0.85; // 适中的水平阻尼
          } else if (this.currentLevel === 4) {
            // 第4关的水平绳子使用更小的下垂系数和更强阻尼，减少抖动
            if (obj.affectedByGravity) {
              obj.velocity.y += this.gravity * 0.8; // 更小的下垂效果
              obj.y += 1.0; // 更小的下垂位移
            } else {
              obj.velocity.y += this.gravity * 0.3; // 更小的下垂效果
              obj.y += 0.5; // 更小的下垂位移
            }
            // 增强水平方向的稳定性
            obj.velocity.x *= 0.75; // 更强的水平阻尼
          } else if (this.currentLevel === 5) {
            // 第5关的水平绳子使用更小的下垂系数，减少抖动
            if (obj.affectedByGravity) {
              obj.velocity.y += this.gravity * 1.0; // 减小下垂效果
              obj.y += 1.5; // 减小下垂位移
            } else {
              obj.velocity.y += this.gravity * 0.4; // 减小下垂效果
              obj.y += 0.8; // 减小下垂位移
            }
            
            // 增强水平方向的稳定性
            obj.velocity.x *= 0.8; // 强力减缓水平速度
          } else if (this.currentLevel === 6) {
            // 第6关的水平绳子使用适中的下垂效果
            if (obj.affectedByGravity) {
              obj.velocity.y += this.gravity * 1.5; // 适中的下垂效果
              obj.y += 2.0; // 适中的下垂位移
            } else {
              obj.velocity.y += this.gravity * 0.6; // 适中的下垂效果
              obj.y += 1.0; // 适中的下垂位移
            }
            
            // 增强水平方向的稳定性
            obj.velocity.x *= 0.85; // 适中的水平阻尼
          } else {
            // 为所有其他关卡的水平绳子添加适当的下垂效果
            if (obj.affectedByGravity) {
              obj.velocity.y += this.gravity * 1.5; // 适中的下垂效果
              obj.y += 2.0; // 适中的下垂位移
            } else {
              // 所有水平绳子都使用适当的下垂效果
              obj.velocity.y += this.gravity * 0.6;
              // 直接添加下垂位移，使效果更明显
              obj.y += 1.0;
            }
            
            // 增强水平方向的稳定性
            obj.velocity.x *= 0.88; // 适中的水平阻尼
          }
          
          // 为不受重力影响的物体添加轻微的下垂位移
          if (!obj.affectedByGravity) {
            // 根据关卡调整下垂位移
            if (this.currentLevel === 3) {
              obj.y += 0.7; // 适中的固定增量
            } else if (this.currentLevel === 4) {
              obj.y += 0.7; // 适中的固定增量
            } else if (this.currentLevel === 5) {
              obj.y += 0.5; // 减小固定增量
            } else if (this.currentLevel === 6) {
              obj.y += 0.8; // 适中的固定增量
            } else {
              // 使用适当的增量使下垂效果明显但不过度
              obj.y += isSpecialRope ? 0.7 : 1.0;
            }
          }
          
          // 水平方向上的稳定性增强
          if (this.currentLevel === 3) {
            obj.velocity.x *= 0.85; // 第3关使用适中的水平阻尼
          } else if (this.currentLevel === 4) {
            obj.velocity.x *= 0.85; // 第4关使用适中的水平阻尼
          } else if (this.currentLevel === 5) {
            obj.velocity.x *= 0.8; // 第5关使用更强的水平阻尼
          } else if (this.currentLevel === 6) {
            obj.velocity.x *= 0.85; // 第6关使用适中的水平阻尼
          } else {
            obj.velocity.x *= isSpecialRope ? 0.88 : 0.85; // 适当的水平阻尼
          }
        }
      }
    }
    
    // 为特殊绳子应用额外的稳定性措施
    if (isSpecialRope) {
      // 应用额外的稳定性措施
      obj.velocity.x *= 0.85; // 更强的水平阻尼
      obj.velocity.y *= 0.85; // 更强的垂直阻尼
      
      // 根据关卡调整阻尼
      if (this.currentLevel === 3) {
        // 第3关的特殊绳子使用适中的阻尼
        obj.velocity.x *= 0.85;
        obj.velocity.y *= 0.85;
      } else if (this.currentLevel === 4) {
        // 第4关的特殊绳子使用更强的阻尼
        obj.velocity.x *= 0.75;
        obj.velocity.y *= 0.75;
      } else if (this.currentLevel === 5) {
        // 第5关的特殊绳子使用更强的阻尼
        obj.velocity.x *= 0.8;
        obj.velocity.y *= 0.8;
      } else if (this.currentLevel === 6) {
        // 第6关的特殊绳子使用适中的阻尼
        obj.velocity.x *= 0.85;
        obj.velocity.y *= 0.85;
      }
      
      // 限制最大速度，防止抖动
      const maxVelocity = 
        this.currentLevel === 3 ? 12 : 
        this.currentLevel === 4 ? 8 :
        this.currentLevel === 5 ? 10 : 
        this.currentLevel === 6 ? 12 : 15;
      
      const velocityMagnitude = Math.sqrt(obj.velocity.x * obj.velocity.x + obj.velocity.y * obj.velocity.y);
      if (velocityMagnitude > maxVelocity) {
        const scale = maxVelocity / velocityMagnitude;
        obj.velocity.x *= scale;
        obj.velocity.y *= scale;
      }
    }
    
    // 移除每帧的增强下垂效果逻辑，避免抖动
    // 水平绳子本身已有下垂效果，不需要额外增强

    // 新增：第6关只剩水平绳子时兜底强制重力
    if (this.currentLevel === 6 && obj.type === 'target' && obj.active) {
      // 统计所有active绳子
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === obj);
      if (attachedRopes.length > 0) {
        let hasVertical = false;
        attachedRopes.forEach(r => {
          const dx = r.endX - r.startX;
          const dy = r.endY - r.startY;
          if (Math.abs(dx) < Math.abs(dy)) {
            hasVertical = true;
          }
        });
        if (!hasVertical) {
          obj.affectedByGravity = true;
          obj.velocity.y += this.gravity * 2;
          obj.y += 2.0;
        }
      }
    }
    // 新增：第8关只剩水平绳子时兜底强制重力
    if (this.currentLevel === 8 && obj.type === 'target' && obj.active) {
      // 统计所有active绳子
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === obj);
      if (attachedRopes.length > 0) {
        let hasVertical = false;
        attachedRopes.forEach(r => {
          const dx = r.endX - r.startX;
          const dy = r.endY - r.startY;
          if (Math.abs(dx) < Math.abs(dy)) {
            hasVertical = true;
          }
        });
        if (!hasVertical) {
          obj.affectedByGravity = true;
          obj.velocity.y += this.gravity * 2;
          obj.y += 2.0;
        }
      }
    }
    // 新增：第8关只剩一根绳子时兜底强制重力
    if (this.currentLevel === 8 && obj.type === 'target' && obj.active) {
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === obj);
      if (attachedRopes.length === 1) {
        obj.affectedByGravity = true;
        obj.velocity.y += this.gravity * 2;
        obj.y += 2.0;
      }
    }
    // 新增：第9关只剩水平绳子时兜底强制重力
    if (this.currentLevel === 9 && obj.type === 'target' && obj.active) {
      // 统计所有active绳子
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === obj);
      if (attachedRopes.length > 0) {
        let hasVertical = false;
        attachedRopes.forEach(r => {
          const dx = r.endX - r.startX;
          const dy = r.endY - r.startY;
          if (Math.abs(dx) < Math.abs(dy)) {
            hasVertical = true;
          }
        });
        if (!hasVertical) {
          obj.affectedByGravity = true;
          obj.velocity.y += this.gravity * 2;
          obj.y += 2.0;
        }
      }
    }
    // 新增：第9关只剩一根绳子时兜底强制重力
    if (this.currentLevel === 9 && obj.type === 'target' && obj.active) {
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === obj);
      if (attachedRopes.length === 1) {
        obj.affectedByGravity = true;
        obj.velocity.y += this.gravity * 2;
        obj.y += 2.0;
      }
    }
    // 兜底：第7关只剩多根水平绳子时，减弱阻尼和约束，确保自然下落
    if (this.currentLevel === 7 && obj.type === 'target' && obj.active) {
      const attachedRopes = this.ropes.filter(r => r.active && r.attachedObject === obj);
      if (attachedRopes.length >= 2 && attachedRopes.every(r => {
        const dx = r.endX - r.startX;
        const dy = r.endY - r.startY;
        return Math.abs(dx) > Math.abs(dy) * 1.5;
      })) {
        // 只剩多根水平绳子，减弱阻尼和约束，确保自然下落
        obj.velocity.x *= 0.9;
        obj.velocity.y *= 0.9;
        obj.velocity.y += this.gravity * 0.5;
      }
    }
  }

  // 边界检测
  checkBoundaries(object) {
    const margin = 50; // 边界容差

    // 左右边界
    if (object.x < -margin || object.x > 800 + margin) {
      object.active = false;
    }

    // 上下边界
    if (object.y < -margin || object.y > this.screenHeight + margin) {
      object.active = false;
    }
  }

  // 检测碰撞
  checkCollisions() {
    for (let i = 0; i < this.objects.length; i++) {
      const obj1 = this.objects[i];
      if (!obj1.active) continue;

      for (let j = i + 1; j < this.objects.length; j++) {
        const obj2 = this.objects[j];
        if (!obj2.active) continue;

        if (this.isColliding(obj1, obj2)) {
          this.handleCollision(obj1, obj2);
        }
      }
    }
  }

  // 碰撞检测
  isColliding(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = obj1.radius + obj2.radius;
    
    return distance < minDistance;
  }

  // 处理碰撞
  handleCollision(obj1, obj2) {
    // 简单的碰撞响应
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;

    const nx = dx / distance;
    const ny = dy / distance;

    // 分离物体
    const overlap = obj1.radius + obj2.radius - distance;
    const separationX = nx * overlap * 0.5;
    const separationY = ny * overlap * 0.5;

    obj1.x -= separationX;
    obj1.y -= separationY;
    obj2.x += separationX;
    obj2.y += separationY;

    // 碰撞回调
    if (obj1.onCollision) obj1.onCollision(obj2);
    if (obj2.onCollision) obj2.onCollision(obj1);
  }

  // 切割绳子
  cutRope(rope, cutX, cutY) {
    if (!rope.active) return false;

    const distance = this.getDistanceToRope(rope, cutX, cutY);
    if (distance < 20) { // 切割距离阈值
      // 立即设置绳子为非活跃状态
      rope.active = false;
      
      // 记录被切断的绳子是否为水平绳子
      const dx = rope.endX - rope.startX;
      const dy = rope.endY - rope.startY;
      const isHorizontalRope = Math.abs(dx) > Math.abs(dy) * 1.5;
      
      // 如果绳子有连接的物体
      if (rope.attachedObject) {
        const obj = rope.attachedObject;
        
        // 检查是否还有其他活跃的绳子连接到这个物体
        let hasOtherRopes = false;
        let hasVerticalRope = false;
        
        this.ropes.forEach(r => {
          if (r !== rope && r.active && r.attachedObject === obj) {
            hasOtherRopes = true;
            
            // 检查是否有垂直绳子
            const rdx = r.endX - r.startX;
            const rdy = r.endY - r.startY;
            if (Math.abs(rdx) < Math.abs(rdy) * 1.5) {
              hasVerticalRope = true;
            }
          }
        });
        
        // 如果没有其他绳子，或者只剩下水平绳子，则让物体受重力影响
        if (!hasOtherRopes || !hasVerticalRope) {
          obj.affectedByGravity = true;
          
          // 特别处理第3关
          if (this.currentLevel === 3) {
            obj.velocity.y += this.gravity * 5;
            obj.y += 5.0;
          } else if (this.currentLevel === 9) {
            // 第9关特殊处理，确保物体能自然下落
            obj.velocity.y += this.gravity * 3;
            obj.y += 2.0;
          } else {
            // 对其他关卡也应用更明显的重力效果
            obj.velocity.y += this.gravity * 3;
          }
        }
      }
      
      // 清除绳子的引用和位置信息，避免重影
      rope.endX = rope.startX;
      rope.endY = rope.startY;
      rope.attachedObject = null; // 清除绳子与物体的连接
      
      // 立即从物理系统中移除绳子
      const index = this.ropes.indexOf(rope);
      if (index !== -1) {
        this.ropes.splice(index, 1);
      }
      
      return true;
    }
    return false;
  }

  // 计算点到绳子的距离
  getDistanceToRope(rope, x, y) {
    const startX = rope.startX;
    const startY = rope.startY;
    const endX = rope.endX;
    const endY = rope.endY;

    const A = x - startX;
    const B = y - startY;
    const C = endX - startX;
    const D = endY - startY;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = startX;
      yy = startY;
    } else if (param > 1) {
      xx = endX;
      yy = endY;
    } else {
      xx = startX + param * C;
      yy = startY + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 重置物理世界
  reset() {
    // 清空所有物理对象
    this.objects = [];
    this.ropes = [];
    
    // 重置重力和其他物理参数
    this.gravity = 0.5;
    
    // 为第3关设置更大的重力
    if (this.currentLevel === 3) {
      this.gravity = 0.8; // 增加第3关的重力
    }
  }
  
  // 同步绳子状态
  syncRopes(gameRopes) {
    // 确保物理引擎中的绳子状态与游戏场景中的绳子状态同步
    if (Array.isArray(gameRopes)) {
      this.ropes = [...gameRopes];
    }
  }

  // 获取物理引擎快照
  getSnapshot() {
    return {
      gravity: this.gravity,
      currentLevel: this.currentLevel,
      // objects 和 ropes 由 GameScene 统一管理
    };
  }

  // 从快照还原物理引擎状态
  restoreFromSnapshot(snapshot, objects, ropes) {
    if (!snapshot) return;
    this.gravity = snapshot.gravity;
    this.currentLevel = snapshot.currentLevel;
    // objects 和 ropes 由 GameScene 传入
    if (Array.isArray(objects)) this.objects = objects;
    if (Array.isArray(ropes)) this.ropes = ropes;
  }
}

module.exports = PhysicsEngine; 