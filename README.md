# 📦 退货登记管理系统

一个功能完整的退货登记管理 Web 应用，支持用户注册登录、快递单号增删改查、按快递公司分类筛选、关键词搜索、分页浏览及 CSV 数据导出。

## ✨ 功能特性

| 模块 | 功能 |
|------|------|
| **用户系统** | 注册/登录/登出，密码采用 SHA-256 + 16 字节随机盐值哈希存储 |
| **Session 管理** | HttpOnly Cookie，7 天有效期，自动续期 |
| **数据隔离** | 每位用户数据独立存储，互不可见 |
| **快递单号 CRUD** | 新增、编辑、删除、查看，单号重复校验 |
| **快递公司分类** | 支持 8 种快递公司：顺丰、圆通、中通、韵达、申通、京东、邮政、极兔 |
| **关键词搜索** | 支持快递单号 + 客户名称模糊搜索 |
| **分页浏览** | 每页 12 条数据，支持翻页跳转 |
| **复制单号** | 点击快递单号一键复制到剪贴板 |
| **CSV 导出** | 一键导出当前筛选结果（UTF-8 BOM，Excel 友好） |
| **响应式设计** | 适配桌面端与移动端浏览器 |
| **CORS 支持** | 完全开放跨域访问，支持手机/第三方客户端对接 |

## 🚀 快速开始

### 本地开发（Node.js）

```bash
# 克隆仓库
git clone https://github.com/Akira-GOD/express.git
cd express

# 启动开发服务器
node server.js
```

访问 **http://localhost:8787** 即可使用。

### 本地开发（Cloudflare Pages）

```bash
# 安装依赖
npm install

# 启动 Wrangler 开发服务器
npx wrangler pages dev public
```

## 📁 项目结构

```
return-register-system/
├── public/
│   └── index.html                # Vue 3 前端 SPA
├── server.js                     # Node.js 本地开发服务器
├── lib/
│   ├── auth.ts                   # 认证工具（SHA-256 密码哈希 + CORS）
│   └── kv.ts                     # KV 存储工具（用户/记录/Session）
├── functions/
│   └── api/
│       ├── register.ts           # POST /api/register    注册
│       ├── login.ts              # POST /api/login       登录
│       ├── logout.ts             # POST /api/logout      登出
│       ├── user.ts               # GET  /api/user        获取当前用户
│       ├── records.ts            # GET/POST /api/records 列表 + 新增
│       └── records/
│           └── [id].ts           # PUT/DELETE /api/records/:id  编辑 + 删除
├── wrangler.toml                 # Cloudflare Pages 部署配置
├── package.json
├── .gitignore
└── README.md
```

## 📡 API 接口文档

所有接口基础路径为 `/api`，支持 CORS 跨域访问。登录成功后服务端返回 HttpOnly Cookie 用于身份认证。

### 认证接口

#### 注册

```http
POST /api/register
Content-Type: application/json

{
    "username": "admin",
    "password": "123456"
}
```

响应：

```json
{
    "success": true,
    "user": { "id": "xxx", "username": "admin" }
}
```

#### 登录

```http
POST /api/login
Content-Type: application/json

{
    "username": "admin",
    "password": "123456"
}
```

成功后在 Cookie 中设置 `session_id`（HttpOnly，7 天有效）。

#### 登出

```http
POST /api/logout
```

#### 获取当前用户

```http
GET /api/user
```

响应：

```json
{
    "user": { "id": "xxx", "username": "admin" }
}
```

### 记录接口

#### 获取所有记录

```http
GET /api/records
```

响应：

```json
{
    "success": true,
    "records": [
        {
            "id": "xxx",
            "trackingNo": "SF1234567890",
            "courier": "顺丰",
            "customerName": "张三",
            "reason": "商品破损",
            "date": "2026-05-23",
            "createdAt": "2026-05-23T10:00:00.000Z",
            "updatedAt": "2026-05-23T10:00:00.000Z"
        }
    ]
}
```

#### 新增记录

```http
POST /api/records
Content-Type: application/json

{
    "trackingNo": "SF1234567890",
    "courier": "顺丰",
    "customerName": "张三",
    "reason": "商品破损",
    "date": "2026-05-23"
}
```

#### 更新记录

```http
PUT /api/records/:id
Content-Type: application/json

{
    "trackingNo": "SF1234567890",
    "courier": "顺丰",
    "customerName": "张三",
    "reason": "尺码不合适",
    "date": "2026-05-23"
}
```

#### 删除记录

```http
DELETE /api/records/:id
```

### 快递公司枚举值

| 值 | 名称 |
|----|------|
| `顺丰` | 顺丰速运 |
| `圆通` | 圆通快递 |
| `中通` | 中通快递 |
| `韵达` | 韵达快递 |
| `申通` | 申通快递 |
| `京东` | 京东物流 |
| `邮政` | 中国邮政 |
| `极兔` | 极兔快递 |
| `其他` | 其他快递 |

### 错误响应格式

```json
{
    "error": "错误描述信息"
}
```

HTTP 状态码：

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误（如缺少必填字段、单号重复等） |
| 401 | 未登录或 Session 过期 |
| 404 | 记录不存在 |
| 405 | 方法不允许 |

## ☁️ 部署到 Cloudflare Pages

### 前置条件

1. 安装 [Node.js](https://nodejs.org/)（v18+）
2. 注册 [Cloudflare](https://cloudflare.com) 账号
3. 安装 Wrangler CLI：`npm install -g wrangler`

### 部署步骤

```bash
# 1. 登录 Cloudflare
npx wrangler login

# 2. 创建 KV 命名空间（用于存储用户数据和记录）
npx wrangler kv:namespace create RETURN_REGISTER_KV

# 3. 将返回的 KV ID 填入 wrangler.toml
# 编辑 wrangler.toml：
# [[kv_namespaces]]
# binding = "RETURN_REGISTER_KV"
# id = "你的-KV-ID"

# 4. 部署
npx wrangler pages deploy public

# 5. 在 Cloudflare Dashboard 中将 KV 绑定到 Pages 项目
# 进入 Workers & Pages → 你的项目 → Settings → Functions → KV namespace bindings
# 添加绑定：变量名 RETURN_REGISTER_KV，选择对应的命名空间
```

## 🔒 安全设计

| 机制 | 说明 |
|------|------|
| 密码哈希 | SHA-256 + 16 字节随机盐值，每个用户独立盐值 |
| Session | 随机 UUID v4，HttpOnly Cookie，7 天有效期 |
| 数据隔离 | 存储键按用户 ID 前缀分区（`user:` 和 `records:`） |
| XSS 防护 | 前端输出 HTML 转义，Cookie 设置 HttpOnly |
| CSRF | Session Cookie 使用 Lax SameSite 策略 |

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3（CDN，零构建）、原生 CSS、HTML5 |
| 后端（Cloudflare） | TypeScript、Cloudflare Workers / Pages Functions |
| 后端（本地） | Node.js（完全兼容 Cloudflare Workers API） |
| 存储 | Cloudflare KV / 本地文件 JSON |
| 工具 | Wrangler CLI、Git |

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

---

**作者**：Return Register Admin  
**仓库**：[https://github.com/Akira-GOD/express](https://github.com/Akira-GOD/express)