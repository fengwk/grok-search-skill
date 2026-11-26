# Grok Search Skill

通过 CLIProxyAPI（CPA）调用 Grok，搜索公开网页和 X，返回答案和来源链接。可作为 Agent Skill 使用，也可直接运行 CLI；CLI 无需安装 npm 依赖。

## 安装

需要 Node.js 22+ 和 `npx`。在要使用技能的项目目录执行；将下方路径换成本地检出位置：

```bash
npx skills add /path/to/grok-search-skill
```

发布到 GitHub 后，也可按仓库名安装（需要 Git）：

```bash
npx skills add fengwk/grok-search-skill
```

加 `-g` 可全局安装；加 `--list` 只查看来源里有哪些技能。安装时选 `grok-search` 和要使用的 Agent。重开 Agent 后可以要求它「查一下 Pi 最新版本的发布说明和 X 上的公开讨论，附来源链接」。只用 CLI 时可跳过安装。

## 使用

搜索需要一条配置了 Grok 4.7 的 CPA Responses 路由。在运行环境中设置 `GROK_SEARCH_BASE_URL`（可信 CPA HTTPS 地址，以 `/v1` 结尾）和 `CPA_API_KEY`（该 CPA 的访问 Key）。不要把 Key 写入检出目录、命令参数或 Agent 提示词。

```bash
./skills/grok-search/scripts/grok-search.mjs \
  --query '查找 Pi 的最新发布说明，附官方链接' --max-turns 2
```

默认最多搜索 3 轮。加 `--verbose` 可查看 Token 用量、轮数上限和搜索工具调用计数。查询会消耗模型与搜索额度。

## 更新与卸载

```bash
npx skills update grok-search  # 从 GitHub 安装的技能
npx skills remove grok-search
```

全局安装时加 `-g`。从本地检出安装的技能，用同一条 `npx skills add <本地检出路径>` 重新安装以同步修改。

## 维护

- [技能入口](skills/grok-search/SKILL.md)
- [CLI 配置和输出字段](skills/grok-search/scripts/README.md)

```bash
node --test skills/grok-search/scripts/tests/grok-search.test.mjs
```
