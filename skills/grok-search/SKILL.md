---
name: grok-search
description: 使用 Grok Agent 搜索公开网页和 X，返回带来源的答案。需要调研互联网上的公开信息，尤其是 X 上的公开帖子和讨论时，加载此技能。
---

# Grok 搜索

Grok Agent 按查询选择网页搜索、X Search 或两者。要查 X 或核对特定来源，在查询里点明。只提交与任务相关的公开信息，不要放入凭据、私有代码或对话历史。

`<skill-dir>` 是本文件所在目录：

```bash
<skill-dir>/scripts/grok-search.mjs --query "在 X 上找 Pi 最新版本的官方公告和公开讨论，附原帖链接。"
```

| 参数 | 说明 |
|---|---|
| `--query <问题>` | 必填，搜索问题。 |
| `--max-turns <正整数>` | 默认最多 3 轮，深度调研可提高上限。 |

从 JSON 读取 `status`、`answer` 和 `sources[].url`。`ok` 表示已确认搜索并拿到答案和来源；`partial` 表示上游响应未完成，或已确认搜索但缺答案或来源；`unverified` 表示无法确认搜过，不要把答案当作已核实的搜索结果。重要结论要核对来源原文，并区分官方公告和用户讨论。

返回 `error` 时按 `error.next` 处理。若缺配置，让用户在启动 Agent 的环境中设置所缺变量，不在对话中索取 Key。请求结果不明时不要自动重试。配置和字段说明见 [scripts/README.md](scripts/README.md)。
