---
trigger: always_on
globs: 
  - '**/*.py'
---

# Python 开发规范

## 代码风格
- 遵循 PEP 8 规范
- 使用 4 空格缩进（不使用 tab）
- 行长度限制为 100 字符
- 使用单引号，除非需要双引号

## 命名约定
- 变量和函数：snake_case
- 类：PascalCase
- 常量：UPPER_CASE
- 私有成员：_single_leading_underscore

## 文件头
所有 Python 脚本必须包含：
```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
```

## 导入顺序
1. 标准库
2. 第三方库
3. 本地导入

每组之间用空行分隔。

## 类型提示
- 为所有公共函数添加类型提示
- 使用 `typing` 模块处理复杂类型
- 使用 `Optional[T]` 表示可为 None 的参数

## 日志
- 使用 `logging` 模块而非 `print()`
- Logger 名称使用 `__name__`
- 使用适当的日志级别：DEBUG, INFO, WARNING, ERROR, CRITICAL

## 错误处理
- 使用具体的异常类型
- 避免裸 `except:` 子句
- 记录错误并包含上下文信息

## 文档
- 为所有公共模块、类和函数使用 docstring
- 遵循 Google Python Style Guide
- 在 docstring 中包含类型信息
