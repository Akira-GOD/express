// 密码哈希工具 - SHA-256 + 随机盐值（Cloudflare Workers 兼容）
// 每个用户独立随机盐值，存储格式：salt:hash

const ENCODER = new TextEncoder();

// 生成 16 字节随机盐值（hex 编码 = 32 字符）
function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 将字符串转为 Uint8Array
function stringToBytes(str: string): Uint8Array {
  return ENCODER.encode(str);
}

// SHA-256 哈希
async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 密码 + 盐值 → 哈希（格式：salt:hash）
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const combined = stringToBytes(salt + password);
  const hash = await sha256(combined);
  return `${salt}:${hash}`;
}

// 验证密码
export async function verifyPassword(password: string, storedValue: string): Promise<boolean> {
  const parts = storedValue.split(':');
  if (parts.length !== 2) {
    // 兼容旧格式（无盐）
    const computedHash = await sha256(stringToBytes(password));
    return computedHash === storedValue;
  }
  const [salt, storedHash] = parts;
  const combined = stringToBytes(salt + password);
  const computedHash = await sha256(combined);
  return computedHash === storedHash;
}

// 生成记录 ID
export function generateRecordId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// JSON 响应
export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// 错误响应
export function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ error: message }, status);
}

// 处理 CORS 预检请求
export function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// 解析请求体 JSON
export async function parseBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}