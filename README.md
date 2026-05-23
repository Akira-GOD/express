# 退货登记管理系统

一个基于 **PHP + MySQL** 的退货快递单号管理系统，支持用户登录/注册、增删改查快递单号、按快递公司分类筛选、搜索、分页和 CSV 导出。

## 技术栈

- **后端**：PHP 7.4+（无需框架，纯原生）
- **数据库**：MySQL 5.7+ / MariaDB 10.3+
- **前端**：原生 HTML5 + CSS3 + JavaScript（零依赖，单文件）
- **认证**：Session Token（支持 Cookie 和 Bearer Header）

## 功能特性

- 🔐 用户注册 / 登录 / 登出（bcrypt 密码加密、7天会话有效期）
- 📦 退货记录增删改查（CRUD）
- 🏷️ 按快递公司分类（顺丰、圆通、中通、韵达、申通、京东、邮政、极兔、其他）
- 🔍 快递单号 / 客户名称搜索
- 📄 分页浏览
- 📥 CSV 导出
- 📋 一键复制快递单号
- 🎨 美观的现代化 UI，响应式布局
- ⌨️ 键盘快捷键（Ctrl+F 搜索，ESC 关闭弹窗，Enter 提交）

## 部署指南

### 1. 环境要求

- PHP 7.4 或更高版本（需启用 `pdo_mysql`）
- MySQL 5.7 或更高版本
- Apache / Nginx（或其他支持 PHP 的 Web 服务器）

### 2. 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS return_register
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 3. 导入表结构

```bash
mysql -u root -p return_register < database/schema.sql
```

### 4. 配置数据库连接

编辑 `api/config.php`，修改数据库连接信息：

```php
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'return_register');
define('DB_USER', 'root');
define('DB_PASS', 'your_password_here');
```

> ⚠️ 生产环境建议使用 `config.local.php` 覆盖配置，避免将密码提交到 Git。

### 5. 部署到 Web 服务器

将整个项目目录复制到 Web 服务器的文档根目录，或配置虚拟主机指向项目根目录。

**Apache**：确保 `.htaccess` 启用了 `mod_rewrite`（如需要）。

**Nginx** 示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/return-register-system;
    index index.html index.php;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        try_files $uri =404;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### 6. 测试运行

打开浏览器访问 `http://localhost`，即可看到登录页面。注册账号后即可开始使用。

## API 接口

所有 API 位于 `/api/` 目录下：

| 方法   | 端点                | 说明         | 认证 |
| ------ | ------------------- | ------------ | ---- |
| POST   | `/api/register.php` | 用户注册     | 否   |
| POST   | `/api/login.php`    | 用户登录     | 否   |
| POST   | `/api/logout.php`   | 用户登出     | 是   |
| GET    | `/api/user.php`     | 获取用户信息 | 是   |
| GET    | `/api/records.php`  | 获取所有记录 | 是   |
| POST   | `/api/records.php`  | 新增记录     | 是   |
| PUT    | `/api/records.php?id=xxx` | 更新记录 | 是 |
| DELETE | `/api/records.php?id=xxx` | 删除记录 | 是 |

## 文件结构

```
return-register-system/
├── index.html              # 前端单页应用
├── api/
│   ├── config.php          # 数据库连接与工具函数
│   ├── register.php        # 用户注册 API
│   ├── login.php           # 用户登录 API
│   ├── logout.php          # 用户登出 API
│   ├── user.php            # 获取用户信息 API
│   └── records.php         # 退货记录 CRUD API
├── database/
│   └── schema.sql          # 数据库表结构
└── README.md               # 本文件
```

## 安全建议

1. **修改 `config.php` 中的数据库密码**，并使用强密码
2. 生产环境建议将数据库配置移到 `api/config.local.php`（已被 `.gitignore` 忽略）
3. 使用 HTTPS 保护数据传输
4. 定期清理过期的 Session Token（`DELETE FROM sessions WHERE expires_at < NOW()`）
5. 建议在 Web 服务器层面添加速率限制（rate limiting）

## License

MIT