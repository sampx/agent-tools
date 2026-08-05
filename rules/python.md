---
trigger: model_decision
description: Follow this rule when developing Python projects and scripts.
keywords:
  - 'python'
  - 'py'
  - '.py'
---

# Python Development Conventions

## Project and Dependency Management

- Use `uv` to manage projects and dependencies

## Version Requirements

- Python version: 3.11+

## File Header

All Python scripts must include:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
```

## Code Style

- Follow the PEP 8 spec
- Use 4-space indentation (no tabs)
- Limit line length to 100 characters
- Use single quotes, unless double quotes are required
- File encoding: UTF-8

## Naming Conventions

| Type | Style | Example |
|------|------|------|
| Variables/functions | snake_case | `get_user_by_id` |
| Classes | PascalCase | `UserSession` |
| Constants | UPPER_CASE | `MAX_RETRY_COUNT` |
| Private members | _leading_underscore | `_internal_cache` |

## Import Order

1. Standard library
2. Third-party libraries
3. Local imports

Separate each group with a blank line. Avoid wildcard imports.

## Type Hints

- Add type hints to all public functions
- Use the `typing` module for complex types: `Dict`, `List`, `Optional`, `Any`
- Use `Optional[T]` for parameters that may be None
- Use the `@dataclass` decorator for data models

```python
from typing import Optional
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: Optional[str] = None

def get_user(user_id: int) -> Optional[User]:
    ...
```

## Logging

- Use the `logging` module rather than `print()` (except for script tools)
- Use `__name__` as the logger name
- Use appropriate log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Log messages include context information

```python
import logging

logger = logging.getLogger(__name__)
logger.info("用户登录成功", extra={"user_id": user_id})
```

## Error Handling

- Use specific exception types
- Avoid bare `except:` clauses
- Log errors with context information
- Handle exceptions at the appropriate level

```python
try:
    result = risky_operation()
except ValueError as e:
    logger.error("参数错误", extra={"error": str(e)})
    raise
except Exception as e:
    logger.exception("未知错误")
    raise
```

## Documentation

- Use docstrings for all public modules, classes, and functions
- Follow the Google Python Style Guide
- Include type information in docstrings

```python
def calculate_total(items: list[dict]) -> float:
    """计算订单总金额.
    
    Args:
        items: 订单项列表，每项包含 price 和 quantity 字段。
    
    Returns:
        订单总金额。
    
    Raises:
        ValueError: 当 items 为空时。
    """
    ...
```

## Comments

- Write comments in Chinese
- Use `#` for single-line comments
- Avoid obvious comments that repeat the code
- Explain why, not what

## Data Classes

Prefer `dataclass` for defining data models:

```python
from dataclasses import dataclass, field
from typing import List

@dataclass
class Order:
    id: int
    items: List[dict] = field(default_factory=list)
    total: float = 0.0
```

## Context Managers

Use `with` statements to manage resources:

```python
with open('file.txt', 'r') as f:
    content = f.read()
```

## Testing

- Use `pytest` as the test framework
- Test file naming: `test_*.py`
- Test function naming: `test_*`
