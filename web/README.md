# 摊主日记账 Web 应用

面向线下摆摊与家庭商户的手机优先记账工具。支持每日收支、现金日结、多摊位汇总、家庭邀请码、按摊位授权、历史日期分析、收入/支出折线趋势、CSV 导出与离线记账队列。

完整产品与协作规范位于根目录的 [PROJECT_PLAN.md](../PROJECT_PLAN.md)。

## 技术栈

- Next.js App Router + React + TypeScript
- PostgreSQL + Prisma
- JWT 安全会话、Zod 输入校验、bcrypt 密码哈希
- PWA + Service Worker + IndexedDB（Dexie）离线队列
- Vitest 单元测试；Playwright 已配置为后续端到端测试依赖

## 本地启动

1. 确保本机运行 PostgreSQL，并新建数据库，例如 `stall_ledger`。
2. 复制环境变量：`Copy-Item .env.example .env`，填写 `DATABASE_URL` 和足够随机的 `SESSION_SECRET`。
3. 安装依赖：`npm install`。
4. 生成数据库客户端并应用迁移：`npx prisma generate`，然后运行 `npx prisma migrate dev --name init`。
5. 启动开发服务：`npm run dev`，访问 `http://localhost:3000`。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run build` | 生产构建检查 |
| `npm run lint` | 运行 ESLint |
| `npm run test` | 运行金额与汇总单元测试 |
| `npx prisma studio` | 打开开发数据库管理界面 |

## 首版操作流程

1. 创建账号时会自动建立一个家庭商户、一个默认摊位以及所有者权限。
2. 所有者可在页面上生成一次性邀请码，选择家人可访问的摊位。
3. 家人注册或登录时填入邀请码，即成为指定摊位的记账员。
4. 每笔账目按分保存，离线时暂存到 IndexedDB，恢复网络后自动同步。
5. “全部已授权摊位”仅聚合当前账号有权访问的摊位，避免跨摊位数据泄露。
6. 看板可切换快捷或自定义日期范围，并根据跨度自动按日、周、月汇总收入和支出趋势。
7. 首页可进入独立账目页，按摊位、日期、收支类型和收付款方式查账；有权限的成员可编辑，管理员和所有者可二次确认后删除。
8. 日结会按“开档备用金 + 现金收入 - 现金支出”计算应有现金，并与收摊实点现金比较，提示相符、多出或短少。
9. 设置中的“成员与摊位”可供所有者调整成员角色和摊位授权、移除成员、新增摊位及修改摊位名称；其他角色仅能查看自己的授权信息。

## 当前进度

账目管理、现金日结以及成员与摊位管理阶段已经完成。核心记账、离线队列、历史分析、账目修正、现金核对、角色与摊位授权、导出流程均可使用，并通过 TypeScript、ESLint、13 项单元测试、2 项 Playwright 流程及生产构建。下一阶段为通用设置与质量加固，重点完成货币、时区、常用分类，以及所有者、管理员、记账员和查看者的跨账号权限回归；预发布部署留到此后单独推进。完整复盘和验收范围记录在 [PROJECT_PLAN.md](../PROJECT_PLAN.md#146-本阶段复盘与下一阶段安排)。

## 上线前清单

- 配置正式 PostgreSQL、HTTPS、强随机 `SESSION_SECRET`、备份和错误监控。
- 使用预发布数据库完成家庭成员、权限、离线同步和 CSV 导出的完整试用。
- 中国大陆正式发布前完成域名与 ICP 备案相关安排。

## 当前本机数据库状态

已在本机 PostgreSQL 中创建 `stall_ledger` 数据库，并应用了初始 Prisma 迁移。以后每次修改 `prisma/schema.prisma`，请在 `web/` 目录运行：`npx prisma migrate dev --name <迁移名称>`。

本机 PostgreSQL 服务会随 Windows 服务启动；开发时只需确认服务 `postgresql-x64-18` 正在运行，然后执行 `npm run dev`。
