// Cloudflare Workers KV 工具模块
// 在 Pages Functions 中通过 context.env.KV_BINDING 访问

export interface Env {
  RETURN_REGISTER: KVNamespace;
}

// 获取当前环境（支持 Pages Functions context 和 wrangler dev）
export function getKV(context: any): KVNamespace {
  return context.env.RETURN_REGISTER;
}

// 获取用户数据（JSON 对象，包含 username 和 passwordHash）
export async function getUserData(kv: KVNamespace, username: string): Promise<any | null> {
  const data = await kv.get(`user:${username}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 检查用户是否存在
export async function userExists(kv: KVNamespace, username: string): Promise<boolean> {
  return (await kv.get(`user:${username}`)) !== null;
}

// 保存用户（注册时，passwordHash 格式：salt:hash）
export async function saveUser(
  kv: KVNamespace,
  username: string,
  passwordHash: string,
): Promise<void> {
  const userData = {
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  await kv.put(`user:${username}`, JSON.stringify(userData));
}

// 获取用户所有记录
export async function getUserRecords(kv: KVNamespace, username: string): Promise<any[]> {
  const data = await kv.get(`records:${username}`);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 保存用户所有记录
export async function saveUserRecords(kv: KVNamespace, username: string, records: any[]): Promise<void> {
  await kv.put(`records:${username}`, JSON.stringify(records));
}

// ============ Session 管理 ============

// 生成随机 token
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 48; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

// 创建 session：存储 token -> username 映射，返回 token
export async function createSession(kv: KVNamespace, username: string): Promise<string> {
  const token = generateToken();
  // session 有效期 7 天
  await kv.put(`session:${token}`, username, { expirationTtl: 7 * 24 * 60 * 60 });
  return token;
}

// 验证 session：从 token 获取 username
export async function getSessionUsername(kv: KVNamespace, token: string): Promise<string | null> {
  return await kv.get(`session:${token}`);
}

// 销毁 session
export async function destroySession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`session:${token}`);
}