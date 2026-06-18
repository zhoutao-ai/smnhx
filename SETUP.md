# 紫微斗数 · 新电脑搭建指南

## 1. 克隆项目

```bash
git clone https://github.com/zhoutao-ai/smnhx.git
cd smnhx
npm install
```

## 2. 配置 .env.local

在项目根目录创建 `.env.local`：

```env
# ─── AI ────────────────────────────
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-你的key

# ─── 数据库（Neon PostgreSQL）──────
# 数据库（从原电脑的 .env.local 复制）

# ─── 站点 ──────────────────────────
NEXT_PUBLIC_SITE_URL=https://zwdssm.top

# ─── 支付宝（正式环境）─────────────
ALIPAY_SANDBOX=false
ALIPAY_APP_ID=你的APPID
ALIPAY_PRIVATE_KEY=你的应用私钥
ALIPAY_PUBLIC_KEY=你的支付宝公钥
ALIPAY_KEY_TYPE=PKCS1
NEXT_PUBLIC_ALIPAY_SANDBOX=false

# ─── Mock（本地=跳过真实支付）───────
MOCK_PAY=true

# ─── 支付开关 ──────────────────────
NEXT_PUBLIC_ENABLE_PAY=true

# ─── 管理后台密码 ──────────────────
# 管理后台密码（从原电脑 .env.local 的 ADMIN_TOKEN 复制）
```

## 3. 初始化数据库

```bash
node --env-file .env.local --import tsx scripts/init-db.ts
```

## 4. 启动

```bash
npm run dev
```

访问 http://localhost:3000

## 5. 部署到 Vercel

```bash
npx vercel login
npx vercel deploy --prod
```

---

## 服务器信息一览

| 服务 | 地址 | 说明 |
|------|------|------|
| 🌐 站点 | `topsmtao.win` / `zwdssm.top` | Vercel 部署 |
| 🗄️ 数据库 | Neon PostgreSQL | `ep-restless-block-aqwtd313` |
| 🤖 AI | DeepSeek API | `deepseek-chat` |
| 💰 支付宝 | 开放平台 | APP_ID 见 .env.local |
| 📦 GitHub | `zhoutao-ai/smnhx` | master 分支 |
| 📊 后台 | `/admin` | 密码在 .env.local 的 ADMIN_TOKEN |

## 6. RAG 样本数据

样本数据在数据库 `rag_samples` 表中（8166+ 条），无需重新导入。

如需导入新样本：
```bash
# 解压样本包
unzip combined.zip -d samples

# 录入（每文件1条=720条，全量=每文件720条）
SAMPLES_PER_FILE=1 node --env-file .env.local --import tsx scripts/ingest-samples.ts samples
```

## 7. 常用命令

```bash
npm run dev          # 本地开发
npm run build        # 生产构建
npx vercel deploy --prod  # 部署到生产
npx vercel env ls    # 查看 Vercel 环境变量
```

## 8. 需要手动保管的密钥

以下内容不在代码仓库中，请自行保存：

- DeepSeek API Key
- 支付宝应用私钥（.env.local 中的 ALIPAY_PRIVATE_KEY）
- 支付宝公钥（.env.local 中的 ALIPAY_PUBLIC_KEY）
- Neon 数据库密码
- Vercel 账号登录信息
