# TradePlaybook AI 真实行情与 AI 接入实施计划

## 当前项目现状总结

- 当前是 pnpm workspace monorepo：`apps/web` 为 Next.js + React + Tailwind 前端，`apps/api` 为独立 Node HTTP API，`packages/shared` 放共享类型，`packages/mock-data` 放 mock 数据。
- 前端首页是 AI 交易工作台：`TradingWorkbench` 组合 `ChartPanel`、`AiChatPanel`、`DataTabs`，状态主要保存在 React state + localStorage。
- 当前 `ChartPanel` 是手写 mock K 线 UI，不是真实图表库；已支持 mock 标注、MA30 SVG 线、入场/止损/止盈视觉标记。
- 当前 AI 能力是前端本地规则引擎 `workbenchEngine.ts`，没有真实模型调用；AI prompt 和真实结构化输出尚未接入。
- 当前 API 只有 `apps/api/src/server.ts` 中的 `/health`、`/api/workbench`、`/api/review-plan`，没有 Next.js `route.ts` API route。
- 当前没有 OKX client、OpenAI-compatible client、真实行情转换层、真实历史 K 线分页、真实回测逻辑。
- OKX public candles/history-candles 使用 `instId`、`bar`、`limit`、`after`、`before` 等参数；本项目先按 public 只读行情设计，不使用私有账户权限。

## 需要改动的模块列表

- `packages/shared`：新增统一内部 `Kline` 类型、market response 类型、AI structured response/action 类型、backtest 扩展指标类型。
- `packages/mock-data`：保留 mock fallback，补齐 mock Kline、mock AI action、mock backtest fixtures。
- `apps/api`：新增 OKX market client、Kline adapter、AI client、AI prompt/service、基础回测服务，并在现有 Node HTTP server 增加 API endpoints。
- `apps/web`：接入真实图表库、行情 fetch service、AI chat API 调用、AI action reducer、图表 action 标注渲染。
- 文档与配置：新增 `.env.example`，更新 README 启动说明；实际密钥只放本地 `.env.local` 或服务端环境变量，不写入仓库。

## 推荐实施顺序

### 阶段 1：真实图表接入

目标：
- 用 `lightweight-charts` 替换或增强当前 `ChartPanel`。
- 支持 candlestick series、MA30 line、marker、entry/stop/take-profit price line。
- 数据仍使用当前 mock K 线，先不接 OKX。

文件改动范围：
- `apps/web/package.json`
- `apps/web/src/components/ChartPanel.tsx`
- `apps/web/src/lib/chartAdapters.ts`
- 如有必要，微调 `packages/shared` 的 chart annotation 类型。

验收标准：
- `pnpm install` 后图表能渲染真实蜡烛图。
- mock K 线、MA30、买卖点、入场/止损/止盈线都显示正常。
- 红灯状态仍不生成执行计划。
- `pnpm -r typecheck` 和 `pnpm -r build` 通过。

### 阶段 2：OKX REST K 线接入

目标：
- 在 `apps/api` 新增 OKX public market client。
- 新增 `GET /api/market/candles?instId=BTC-USDT&bar=15m&limit=300`。
- 支持 `BTC-USDT`、`ETH-USDT` 和 `15m`、`1H`、`4H`。
- OKX 原始数组统一转换为项目内部 `Kline`，前端组件只接触内部类型。
- 请求失败时 API 返回明确错误，前端展示错误状态并保留 mock fallback。

文件改动范围：
- `apps/api/src/server.ts`
- `apps/api/src/services/okxMarketClient.ts`
- `apps/api/src/services/klineAdapter.ts`
- `apps/web/src/lib/marketApi.ts`
- `packages/shared/src/index.ts`

验收标准：
- 访问 candles API 能返回内部 `Kline[]`。
- 前端 ChartPanel 可切换到真实 BTC/ETH K 线。
- 断网或 OKX 失败时不会白屏，继续展示 mock fallback。
- UI 中不出现 OKX 原始数据结构。

### 阶段 3：OKX 历史 K 线接入

目标：
- 新增 `GET /api/market/history-candles?instId=BTC-USDT&bar=15m&days=90`。
- 支持分页、去重、时间升序。
- 只保留 confirmed K 线用于回测。
- 为 MA30 回测提供真实数据。

文件改动范围：
- `apps/api/src/services/okxMarketClient.ts`
- `apps/api/src/services/klineAdapter.ts`
- `apps/api/src/services/historyCandlesService.ts`
- `apps/api/src/server.ts`
- `packages/shared/src/index.ts`

验收标准：
- 90 天历史 K 线能按升序返回。
- 重复 K 线被去重。
- 未确认 K 线不会进入回测输入。
- BTC/ETH + 15m/1H/4H 均可工作。

### 阶段 4：AI 服务接入

目标：
- 在服务端新增 OpenAI-compatible client，使用环境变量配置 base URL 和模型。
- 新增 `POST /api/ai/chat`。
- 前端只调用本项目 API。
- API key 只从服务端环境变量读取。
- AI 必须返回结构化 JSON，不直接修改页面状态。
- 系统只应用 AI 返回的 `actions`，并继续执行本地红灯/核心规则兜底。

AI 结构：

```ts
interface AiResponse {
  message: string;
  signalLight?: SignalLight;
  triggeredRules?: TradingRule[];
  actions: AiAction[];
}
```

`AiAction` 最少支持：
- `MARK_CHART`
- `CREATE_TRADE_PLAN`
- `REJECT_TRADE_PLAN`
- `RUN_BACKTEST`
- `SUGGEST_RULE`
- `GENERATE_REVIEW`

文件改动范围：
- `apps/api/src/services/aiClient.ts`
- `apps/api/src/services/aiPrompt.ts`
- `apps/api/src/services/aiStructuredOutput.ts`
- `apps/api/src/server.ts`
- `packages/shared/src/index.ts`
- `apps/web/src/lib/aiActionReducer.ts`
- `apps/web/src/lib/workbenchEngine.ts`

验收标准：
- 前端发送消息后走 `/api/ai/chat`。
- 服务端无 API key 时返回可读错误，前端可 fallback 到 mock。
- AI JSON 解析失败时不会污染工作台状态。
- 红灯 action 不能生成 `TradePlan`。
- `SUGGEST_RULE` 只进入待确认建议，不直接改规则库。

### 阶段 5：AI 输出联动图表

目标：
- AI 返回 `MARK_CHART` 后，系统 action reducer 自动更新图表标注。
- 支持 `entryZone`、`stopLossLine`、`takeProfitLine`、`invalidationLine`、`supportZone`、`resistanceZone`、`buyMarker`、`sellMarker`、`reviewMarker`。
- AI 生成交易计划后自动显示入场、止损、止盈。
- AI 拒绝交易计划时只显示红灯原因，不生成执行计划。

文件改动范围：
- `packages/shared/src/index.ts`
- `apps/web/src/lib/aiActionReducer.ts`
- `apps/web/src/components/ChartPanel.tsx`
- `apps/web/src/components/TradingWorkbench.tsx`
- `apps/web/src/components/tabs/CurrentPlanTab.tsx`

验收标准：
- AI 标注能在 Lightweight Charts 上显示。
- 计划标注和回测标注互不覆盖。
- 红灯输入后 currentPlan 为 null。
- 所有交易文案包含“辅助决策，不是投资建议”或等价提示。

### 阶段 6：基础真实回测

目标：
- 用户输入“站上 30 均线买入，站下 30 均线卖出，帮我回测最近 90 天”后识别 MA30 策略。
- 使用 OKX historical candles 做基础 MA30 回测。
- 输出交易次数、胜率、总收益、最大回撤、平均盈利、平均亏损、连续亏损次数。
- 图表标注历史买点和卖点。
- AI 解释回测结果。
- 用户可选择加入观察规则、修改后再测或废弃。

文件改动范围：
- `apps/api/src/services/backtestMa30.ts`
- `apps/api/src/server.ts`
- `packages/shared/src/index.ts`
- `apps/web/src/lib/workbenchEngine.ts`
- `apps/web/src/lib/aiActionReducer.ts`
- `apps/web/src/components/tabs/BacktestTab.tsx`
- `apps/web/src/components/ChartPanel.tsx`

验收标准：
- 回测使用真实 OKX confirmed Kline。
- MA30 回测结果可复现，不依赖 AI 计算数值。
- AI 只解释结果，不伪造回测数据。
- 用户确认前，观察规则不会写入规则库。

## 风险点

- 已暴露过的 OKX 与 AI key 建议立即轮换；计划和代码都不保存密钥原文。
- OKX public 行情可能有频率限制、返回顺序差异、未确认 K 线、分页边界重复，需要 adapter 和 service 层兜底。
- OpenAI-compatible structured JSON 可能偶发非 JSON 或字段缺失，必须做服务端 schema 校验和前端 action 白名单。
- Lightweight Charts 是浏览器图表库，Next.js 中要确保只在 client component 初始化，避免 SSR/window 问题。
- 回测结果容易被误解为收益承诺，所有展示必须明确“辅助决策，不是投资建议，不代表未来收益”。

## 暂不做的事项

- 不接 OKX 下单。
- 不接 OKX 私有账户 API。
- 不做自动交易、真钱执行、自动开仓/平仓。
- 不接数据库，继续使用 localStorage/mock fallback。
- 不做多交易所、多策略框架、复杂撮合、手续费/滑点高级模型。
- 不让 AI 直接修改用户交易体系。
- 不实现 WebSocket 实时行情，先用 REST 最小真实版本。

## 第一阶段完成后的验收方式

- 启动 web 后首页显示真实 candlestick chart。
- 当前 mock candles 正常渲染。
- MA30 线、买卖 marker、entry/stop/take-profit price line 正常显示。
- 切换红灯/绿灯/回测 demo 后图表状态正确更新。
- `pnpm -r typecheck`、`pnpm -r build` 通过。
- 浏览器验证 AI 消息区仍可滚动，图表不会被输入框撑高。

## 需要配置的环境变量

阶段 1 不需要环境变量。

从阶段 2 开始：

```bash
OKX_BASE_URL=https://www.okx.com
```

从阶段 4 开始：

```bash
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-pro
AI_API_KEY=your_server_side_key
```

如果未来确实需要 OKX 读取权限接口，再放在服务端环境变量中；当前 public K 线行情优先不使用私有 OKX key：

```bash
OKX_API_KEY=your_server_side_key
OKX_SECRET_KEY=your_server_side_secret
OKX_PASSPHRASE=your_server_side_passphrase
```
