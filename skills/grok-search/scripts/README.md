# Grok Search CLI

需要 Node.js 22+ 和一条配置了 xAI Grok 4.7 的 CPA Responses 路由。不需要 Pi、npm 依赖或其他 Skill。在启动 Agent 或直接运行 CLI 的环境中设置以下变量；CLI 不读取 `.env` 或 Agent 配置。

| 变量 | 用途 |
|---|---|
| `GROK_SEARCH_BASE_URL` | 可信 CPA 地址，使用 HTTPS，末尾为 `/v1`，例如 `https://proxy.example.com/v1` |
| `CPA_API_KEY` | 上述 CPA 的访问 Key；由运行环境注入，不写入命令参数或 Skill |

```bash
./grok-search.mjs --query '查找 Pi 的最新发布说明' --max-turns 2
```

一次运行只发送一个 `POST /v1/responses`。请求包含固定系统提示词、一条用户消息和两个原生搜索工具。用户消息将 `--query` 原文放在 `[user query]` 下，将 CLI 运行时的本地时间、UTC 偏移和时区放在 `[date]` 下，供时效性问题参考。

`--max-turns <正整数>` 设置单次请求的服务端轮数上限，默认 `3`。Grok 可以提前收尾，单轮可以调用多个工具，所以这个参数不是工具调用次数、Token 或费用上限。客户端超时为 120 秒，不跟随重定向、不自动重试。本地不保存查询或结果。

stdout 是单个 JSON 对象（`--help` 除外）。默认返回 `schema_version: 2`、`status`、`answer`、`sources`；失败时另有 `error`。`answer` 保留原文与行内引用；`sources[].url` 从上游引用标注和网页搜索来源提取并去重，不保证每条都被正文引用。`sources[].title` 只保留上游提供的非空、非 URL、非数字编号文本，不抓取或生成标题。

加 `--verbose` 不改变请求，只在有搜索响应时附加以下字段：

- `model`：请求的模型。
- `usage`：整次响应报告的 `input_tokens`、`output_tokens`、`total_tokens`、`cache_read_tokens`、`cache_write_tokens`、`reasoning_tokens`。输入总量已含缓存读写 Token；不要再次相加。
- `loop.max_turns`：请求的轮数上限。终态响应未提供实际轮数；单轮可调用多个工具。
- `search`：`web_search` 和 `x_search` 各自的 `executed`、`calls`，以及 X Search 的 `posts_fetched`、`users_fetched`。执行证据来自服务端工具统计或网页搜索完成记录，不从答案和链接判断。

省略未报告的诊断字段和空的诊断对象；`0` 是 CPA 返回的值（CPA 可能给缺失的缓存读取或推理计数补 `0`）。

| `status` | 退出码 | 含义 |
|---|---|---|
| `ok` | 0 | 至少确认一种搜索已执行，并收到答案和来源 |
| `partial` | 1 | 上游响应不完整，或已确认搜索但缺答案或来源 |
| `unverified` | 1 | 上游完成回答，但没有搜过的可靠证据 |
| `error` | 2 | 参数、配置、请求或响应失败；按 `error.code` 和 `error.next` 排查 |

超时或断开时，上游可能已开始计费。先查看 CPA 日志，再判断是否需要重试。回归测试：`node --test tests/*.test.mjs`，使用模拟响应，不调用 CPA。
