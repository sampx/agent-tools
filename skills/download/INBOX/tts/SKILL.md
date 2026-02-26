---
name: "tts"
description: "调用火山引擎文字转语音API，将文本转换为语音。在需要为视频配音或生成音频文件时使用此skill。"
---

# 火山引擎TTS (文字转语音) Skill

## 概述

此Skill用于调用火山引擎的文字转语音API，将文本转换为高质量的语音文件。适用于为Remotion视频或其他项目生成配音。

## 配置凭据

### 方式一：环境变量（推荐）

在使用前，请设置以下环境变量：
环境变量获取地址： https://console.volcengine.com/speech/service/10007

```bash
# Windows PowerShell
$env:VOLC_APPID = "你的APP_ID"
$env:VOLC_ACCESS_KEY_ID = "你的ACCESS_KEY"
```

### 方式二：命令行参数

也可以直接在命令行中传递凭据：

```bash
python tts.py --appid "你的APP_ID" --access_token "你的ACCESS_KEY" --text "你好世界"
```

## 安装依赖

首次使用前需要安装依赖：

```bash
python tts.py --install-deps
```

## 基本使用

### Python脚本调用

将以下脚本文件放置在项目中（已包含在此skill的scripts目录下）：

- `protocols.py` - 协议定义
- `tts.py` - 主脚本

### 使用方法

```bash
# 基本使用（使用环境变量中的凭据）
python scripts/tts.py --text "你好，世界！" --output output.wav

# 指定语音类型
python scripts/tts.py --text "你好" --voice_type "BV700_V2_streaming" --output hello.wav

# 完整参数示例
python scripts/tts.py \
  --appid "your-app-id" \
  --access_token "your-access-token" \
  --text "这是一段测试文本" \
  --voice_type "BV700_V2_streaming" \
  --encoding "wav" \
  --output audio.wav
```

### Python API调用

```python
import asyncio
from scripts.tts import VolcEngineTTS

async def main():
    tts = VolcEngineTTS(
        appid="your-app-id",
        access_token="your-access-token"
    )
    
    success, message = await tts.synthesize(
        text="你好，这是一段测试语音",
        output_file="output.wav",
        voice_type="BV700_V2_streaming"
    )
    
    print(message)

asyncio.run(main())
```

## 常用参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--text` | 要转换的文本（必需） | - |
| `--output` | 输出文件路径 | output.wav |
| `--voice_type` | 语音类型 | BV700_V2_streaming |
| `--encoding` | 音频编码格式 | wav |
| `--appid` | 火山引擎APP ID | 环境变量VOLC_APPID |
| `--access_token` | 访问令牌 | 环境变量VOLC_ACCESS_KEY_ID |
| `--cluster` | 集群名称 | 自动识别 |

## 语音类型参考

常用语音类型：
- `BV700_V2_streaming` - 标准女声
- `zh_female_qingxin` - 清新女声
- `zh_male_jingpin` - 精品男声

更多语音类型请参考火山引擎官方文档。

## 与Remotion集成

生成的音频文件可以直接在Remotion项目中使用：

```typescript
import { Audio } from "remotion";

export const MyVideo = () => {
  return (
    <div>
      <Audio src="path/to/audio.wav" />
      {/* 其他视频内容 */}
    </div>
  );
};
```

## 注意事项

1. 确保网络可以访问火山引擎API端点
2. 首次使用需要安装websockets依赖
3. 音频文件会保存到指定的输出路径，请确保目录有写入权限
4. 建议将生成的音频文件放在项目的public或assets目录中
