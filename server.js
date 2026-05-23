// Node.js 开发服务器 - 用于本地开发和测试
// 提供静态文件 + KV 存储模拟 + API 路由

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8787;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ============ 简易内存 KV 存储 ============
class MemoryKV {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const val = this.store.get(key);
    return val || null;
  }

  async put(key, value) {
    this.store.set(key, value);
  }

  async delete(key) {
    this.store.delete(key);
  }

  async list({ prefix } = {}) {
    const keys = [];
    for (const key of this.store.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        keys.push({ name: key });
      }
    }
    return { keys };
  }
}

const kv = new MemoryKV();

// ============ 密码工具（Node.js SHA-256 + 盐值，与前端一致） ============
function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPasswordSync(password, storedValue) {
  const parts = storedValue.split(':');
  if (parts.length !== 2) {
    const computedHash = crypto.createHash('sha256').update(password).digest('hex');
    return computedHash === storedValue;
  }
  const [salt, storedHash] = parts;
  const computedHash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return computedHash === storedHash;
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateRecordId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// ============ API 路由处理 ============
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data, status = 200) {
  return {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(data),
  };
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(pair => {
      const [key, ...valParts] = pair.trim().split('=');
      if (key) cookies[key] = decodeURIComponent(valParts.join('=') || '');
    });
  }
  return cookies;
}

async function getSessionUsername(request) {
  const cookies = parseCookies(request.headers['cookie']);
  const token = cookies['session'];
  if (!token) return null;
  const username = await kv.get(`session:${token}`);
  return username;
}

async function parseBody(request) {
  return new Promise((resolve) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve(null); }
    });
  });
}

async function handleAPI(method, url, request) {
  // CORS 预检
  if (method === 'OPTIONS') {
    return { status: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    // ====== POST /api/register ======
    if (method === 'POST' && url === '/api/register') {
      const body = await parseBody(request);
      if (!body || !body.username || !body.password) {
        return jsonResponse({ error: '用户名和密码不能为空' }, 400);
      }
      const username = body.username.trim();
      const password = body.password;
      if (username.length < 3) {
        return jsonResponse({ error: '用户名至少3个字符' }, 400);
      }
      if (password.length < 4) {
        return jsonResponse({ error: '密码至少4个字符' }, 400);
      }
      const existing = await kv.get(`user:${username}`);
      if (existing) {
        return jsonResponse({ error: '用户名已存在' }, 409);
      }
      const passwordHash = hashPasswordSync(password);
      await kv.put(`user:${username}`, JSON.stringify({
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
      }));
      // 初始化用户记录列表
      await kv.put(`records:${username}`, JSON.stringify([]));
      return jsonResponse({ message: '注册成功，请登录', username });
    }

    // ====== POST /api/login ======
    if (method === 'POST' && url === '/api/login') {
      const body = await parseBody(request);
      if (!body || !body.username || !body.password) {
        return jsonResponse({ error: '用户名和密码不能为空' }, 400);
      }
      const username = body.username.trim();
      const password = body.password;
      const userData = await kv.get(`user:${username}`);
      if (!userData) {
        return jsonResponse({ error: '用户名或密码错误' }, 401);
      }
      const user = JSON.parse(userData);
      const valid = verifyPasswordSync(password, user.passwordHash);
      if (!valid) {
        return jsonResponse({ error: '用户名或密码错误' }, 401);
      }
      const token = generateSessionToken();
      await kv.put(`session:${token}`, username);
      // 设置 7 天过期
      setTimeout(() => { kv.delete(`session:${token}`).catch(() => {}); }, 7 * 24 * 3600 * 1000);
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`,
          ...CORS_HEADERS,
        },
        body: JSON.stringify({ message: '登录成功', username }),
      };
    }

    // ====== POST /api/logout ======
    if (method === 'POST' && url === '/api/logout') {
      const cookies = parseCookies(request.headers['cookie']);
      const token = cookies['session'];
      if (token) await kv.delete(`session:${token}`);
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
          ...CORS_HEADERS,
        },
        body: JSON.stringify({ message: '已登出' }),
      };
    }

    // ====== GET /api/user ======
    if (method === 'GET' && url === '/api/user') {
      const username = await getSessionUsername(request);
      if (!username) return jsonResponse({ error: '未登录' }, 401);
      return jsonResponse({ username });
    }

    // ====== GET /api/records ======
    if (method === 'GET' && url === '/api/records') {
      const username = await getSessionUsername(request);
      if (!username) return jsonResponse({ error: '未登录' }, 401);
      const recordsJson = await kv.get(`records:${username}`);
      const records = recordsJson ? JSON.parse(recordsJson) : [];
      return jsonResponse(records);
    }

    // ====== POST /api/records ======
    if (method === 'POST' && url === '/api/records') {
      const username = await getSessionUsername(request);
      if (!username) return jsonResponse({ error: '未登录' }, 401);
      const body = await parseBody(request);
      if (!body || !body.trackingNo || !body.courier || !body.date) {
        return jsonResponse({ error: '快递单号、快递公司和日期为必填项' }, 400);
      }
      const recordsJson = await kv.get(`records:${username}`);
      const records = recordsJson ? JSON.parse(recordsJson) : [];
      // 检查重复
      if (records.some(r => r.trackingNo === body.trackingNo)) {
        return jsonResponse({ error: '该快递单号已存在' }, 409);
      }
      const now = new Date().toISOString();
      const record = {
        id: generateRecordId(),
        trackingNo: body.trackingNo.trim(),
        courier: body.courier,
        customerName: (body.customerName || '').trim(),
        reason: (body.reason || '').trim(),
        date: body.date,
        createdAt: now,
        updatedAt: now,
      };
      records.push(record);
      await kv.put(`records:${username}`, JSON.stringify(records));
      return jsonResponse(record, 201);
    }

    // ====== PUT /api/records/:id ======
    const putMatch = method === 'PUT' && url.match(/^\/api\/records\/([^/]+)$/);
    if (putMatch) {
      const username = await getSessionUsername(request);
      if (!username) return jsonResponse({ error: '未登录' }, 401);
      const recordId = putMatch[1];
      const body = await parseBody(request);
      if (!body || !body.trackingNo || !body.courier || !body.date) {
        return jsonResponse({ error: '快递单号、快递公司和日期为必填项' }, 400);
      }
      const recordsJson = await kv.get(`records:${username}`);
      let records = recordsJson ? JSON.parse(recordsJson) : [];
      const index = records.findIndex(r => r.id === recordId);
      if (index === -1) return jsonResponse({ error: '记录不存在' }, 404);
      // 检查重复（排除自身）
      if (records.some(r => r.trackingNo === body.trackingNo && r.id !== recordId)) {
        return jsonResponse({ error: '该快递单号已存在' }, 409);
      }
      records[index] = {
        ...records[index],
        trackingNo: body.trackingNo.trim(),
        courier: body.courier,
        customerName: (body.customerName || '').trim(),
        reason: (body.reason || '').trim(),
        date: body.date,
        updatedAt: new Date().toISOString(),
      };
      await kv.put(`records:${username}`, JSON.stringify(records));
      return jsonResponse(records[index]);
    }

    // ====== DELETE /api/records/:id ======
    const deleteMatch = method === 'DELETE' && url.match(/^\/api\/records\/([^/]+)$/);
    if (deleteMatch) {
      const username = await getSessionUsername(request);
      if (!username) return jsonResponse({ error: '未登录' }, 401);
      const recordId = deleteMatch[1];
      const recordsJson = await kv.get(`records:${username}`);
      let records = recordsJson ? JSON.parse(recordsJson) : [];
      const beforeLen = records.length;
      records = records.filter(r => r.id !== recordId);
      if (records.length === beforeLen) return jsonResponse({ error: '记录不存在' }, 404);
      await kv.put(`records:${username}`, JSON.stringify(records));
      return jsonResponse({ message: '删除成功' });
    }

    return null; // 不是 API 路由
  } catch (err) {
    console.error('API Error:', err);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
}

// ============ 文件服务 ============
function serveStaticFile(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    return { status: 200, headers: { 'Content-Type': contentType }, body: data };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

// ============ HTTP 服务器 ============
const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API 路由
  const apiResult = await handleAPI(method, pathname, req);
  if (apiResult) {
    res.writeHead(apiResult.status, apiResult.headers);
    res.end(apiResult.body);
    return;
  }

  // 静态文件
  let filePath = pathname === '/' ? '/index.html' : pathname;
  // 安全防护
  filePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(PUBLIC_DIR, filePath);

  const staticResult = serveStaticFile(fullPath);
  if (staticResult) {
    res.writeHead(staticResult.status, staticResult.headers);
    res.end(staticResult.body);
  } else {
    // SPA fallback
    const indexResult = serveStaticFile(path.join(PUBLIC_DIR, 'index.html'));
    res.writeHead(indexResult.status, indexResult.headers);
    res.end(indexResult.body);
  }
});

server.listen(PORT, () => {
  console.log('📦 退货登记管理系统 - 本地开发服务器');
  console.log(`   → http://localhost:${PORT}`);
  console.log('   → 按 Ctrl+C 停止服务器');
  console.log('');
  console.log('📡 API 接口列表（支持手机端对接）：');
  console.log('   POST   /api/register    注册');
  console.log('   POST   /api/login       登录（返回 session Cookie）');
  console.log('   POST   /api/logout      登出');
  console.log('   GET    /api/user        获取当前用户');
  console.log('   GET    /api/records     获取所有记录');
  console.log('   POST   /api/records     新增记录');
  console.log('   PUT    /api/records/:id 更新记录');
  console.log('   DELETE /api/records/:id 删除记录');
  console.log('');
  console.log('🔒 密码加密：SHA-256 + 16字节随机盐值');
  console.log('🌐 CORS：已开放跨域访问（支持手机/第三方客户端）');
  console.log('👤 数据隔离：每位用户数据独立存储');
});