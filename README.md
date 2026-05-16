# TradePlaybook AI

个人 AI 交易辅助系统。它不是自动交易机器人，也不是喊单系统；当前版本支持 mock fallback、OKX public 只读行情、服务端 AI 对话入口和基础 MA30 回测。所有输出仅用于辅助决策，不是投资建议。

## 项目结构

```text
tradeplaybook
├── apps
│   ├── web        # Next.js 前端
│   └── api        # 最小 HTTP API
├── packages
│   ├── shared     # 前后端共享 TypeScript 类型
│   └── mock-data  # 第一版 mock 数据
└── docs
    └── prd.md     # 产品说明
```

## 本地启动

安装依赖：

```bash
pnpm install
```

如果本机还没有 pnpm，可以先运行：

```bash
corepack enable pnpm
```

启动前端：

```bash
pnpm dev:web
```

默认访问 [http://localhost:3000](http://localhost:3000)。

启动后端：

```bash
pnpm dev:api
```

默认访问 [http://localhost:4000/health](http://localhost:4000/health)。

## 环境变量

复制 `.env.example` 到本地环境文件，并只在服务端配置真实密钥：

```bash
OKX_BASE_URL=https://www.okx.com
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-pro
AI_API_KEY=your_server_side_key
```

OKX public K 线接口不需要私有账户 API。OpenAI-compatible API Key 只能放在服务端环境变量中，不能暴露给前端。

## 常用脚本

```bash
pnpm dev          # 同时启动 web 和 api
pnpm typecheck    # 检查 TypeScript
pnpm build        # 构建/检查所有 workspace
```

## 产品边界

- 不接 OKX 下单。
- 不接 OKX 私有账户 API。
- 不接真实数据库。
- 不自动下单。
- 不做真钱执行，不自动开仓/平仓。
- 所有交易计划都必须强调用户最终确认。
- 红灯状态下不能生成执行计划。
- AI 只能提出规则建议，用户确认后才能加入规则库。
