---
type: problem
description: 修改 Luban 源 Excel 表时必须串行写同一个 xlsx 文件
status: active
last_verified: 2026-06-08
source: codex-observed
---

# Luban Xlsx Serial Writes

## Problem

- 对同一个 `Design/config/#*.xlsx` 并行执行写入，可能导致 Excel 文件损坏或内容异常。

## Root Cause

- `.xlsx` 是压缩包格式，多进程同时改同一文件时写入顺序不可控。

## How To Avoid

- 需要新增或修改同一张 Luban 表时串行执行 helper 写操作。
- 不要把多个针对同一 `.xlsx` 的写命令放进并行工具调用。

## Verification

- 本次新增 `#TableLocalizationText.xlsx` 时复现过并行写损坏，删除后串行重建并通过 `python .agents\skills\luban-dev\scripts\luban_helper.py validate --all`。
