# Grok Search Skill

通过 CLIProxyAPI（CPA）调用 Grok Agent，搜索公开网页和 X，返回带来源的答案。

## 快速开始

**1. 安装。** 需要 Git 和 Node.js 22+。在项目目录执行：

```bash
npx skills add fengwk/grok-search-skill
```

全局安装：

```bash
npx skills add fengwk/grok-search-skill -g
```

只查看可安装的技能：

```bash
npx skills add fengwk/grok-search-skill --list
```

**2. 配置。** 启动 Agent 前设置两个环境变量：

- `GROK_SEARCH_BASE_URL`：CPA 的 HTTPS 地址，以 `/v1` 结尾。
- `GROK_SEARCH_API_KEY`：CPA 访问密钥。

**3. 提问。** 重开 Agent 后直接提问：

> 查一下 Pi 最新版本的发布说明和 X 上的公开讨论，附来源链接。

## 更新与卸载

```bash
npx skills update grok-search
npx skills remove grok-search
```

全局安装的技能加 `-g`。
