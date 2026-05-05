# 版本38 - 钢琴滑动触摸演奏功能

## 功能概述

实现鼠标滑动触摸演奏功能：按住某个钢琴键后，滑动到其他琴键会自动切换音符，松开后正常释放（使用ADSR包络自然衰减）。

## 核心功能

### 滑动演奏机制
- **按住开始**：鼠标按下琴键时开始发声并进入滑动状态
- **滑动切换**：移动到新琴键时自动停止旧音符并开始新音符
- **移出释放**：滑动到空白区域时释放当前音符
- **松开结束**：鼠标松开时释放最后一个音符（自然衰减）

### 事件处理流程

```
mousedown → 记录当前音符 → startNote() → 标记isSliding=true
    ↓
mousemove → 检测当前位置琴键
    ├─ 新琴键 → stopNote(旧) → startNote(新) → 更新当前音符
    └─ 空白区域 → stopNote() → 清除当前音符
    ↓
mouseup → stopNote(最后音符) → 标记isSliding=false
```

## 实现细节

### 状态变量
```javascript
let isSliding = false;           // 是否处于滑动状态
let currentSlideNote = null;     // 当前滑动的音符名称
let currentSlideElement = null;  // 当前滑动的DOM元素
```

### 核心函数

#### getKeyElementAtPoint(clientX, clientY)
获取指定坐标位置的琴键元素

```javascript
function getKeyElementAtPoint(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);
    return element?.closest('.white-key, .black-key');
}
```

#### 滑动事件处理

**mousedown**：初始化滑动状态
- 激活琴键视觉效果
- 开始音符发声
- 记录当前音符和元素

**mousemove**：处理滑动逻辑
- 获取鼠标位置的琴键元素
- 如果是新琴键：停止旧音符，开始新音符
- 如果移出范围：释放当前音符

**mouseup**：结束滑动
- 释放最后一个音符（使用正常释放包络）
- 清除滑动状态

## 技术特点

### 正常释放包络
松开鼠标时调用 `stopNote()` 函数，使用ADSR释放包络，确保音符自然衰减，非立即停止。

### 日志系统
添加控制台日志便于调试：
- `[Slide] Started sliding on note: xxx` - 开始滑动
- `[Slide] Switched from xxx to xxx` - 切换音符
- `[Slide] Moved out of any key, releasing note: xxx` - 移出范围
- `[Slide] Ended sliding, last note: xxx` - 结束滑动

## 兼容性

- ✅ 桌面端鼠标操作
- ✅ 保留原有键盘按键演奏（A-L键）
- ✅ 保留原有触摸演奏（移动端）
- ✅ 继承版本37的连续点击修复

## 版本对比

| 版本 | 主要功能 |
|------|----------|
| 37 | 修复连续点击发声持续问题 |
| 38 | 新增滑动触摸演奏功能 |

## 文件位置

```
钢琴按键/版本38✔️✔️/piano-fft.html
钢琴按键/版本38✔️✔️/CHANGELOG.md
```