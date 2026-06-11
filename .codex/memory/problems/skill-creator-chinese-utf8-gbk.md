---
type: problem
description: Windows 默认 GBK 下 skill-creator 脚本读取中文 UTF-8 SKILL.md 可能失败
status: active
last_verified: 2026-06-11
source: codex-observed
---

# skill-creator 中文 UTF-8 编码坑

在 Windows PowerShell 环境下，`skill-creator` 的 `generate_openai_yaml.py` 和 `quick_validate.py` 使用 `Path.read_text()` 默认编码读取文件。若项目内 `SKILL.md` 包含中文 UTF-8 内容，可能出现：

```text
UnicodeDecodeError: 'gbk' codec can't decode byte ...
```

规避方式：

- `SKILL.md` 仍按项目要求使用中文和 UTF-8。
- `agents/openai.yaml` 可手写 ASCII 内容。
- 用小型 UTF-8 结构校验替代脚本校验，至少检查 frontmatter、`name`、`description` 和 `agents/openai.yaml`。
