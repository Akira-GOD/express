// POST /api/login - 用户登录
import { getKV, getUserData, createSession } from '../../lib/kv';
import { verifyPassword, jsonResponse, errorResponse, handleCORS, parseBody } from '../../lib/auth';

export const onRequestPost: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const body = await parseBody(context.request);
  if (!body || !body.username || !body.password) {
    return errorResponse('用户名和密码不能为空', 400);
  }

  const username = body.username.trim();
  const password = body.password;

  const kv = getKV(context);
  const userData = await getUserData(kv, username);
  if (!userData) {
    return errorResponse('用户名或密码错误', 401);
  }

  const valid = await verifyPassword(password, userData.passwordHash);
  if (!valid) {
    return errorResponse('用户名或密码错误', 401);
  }

  const token = await createSession(kv, username);

  return new Response(JSON.stringify({ message: '登录成功', username }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `session=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
};

export const onRequestOptions: PagesFunction = async () => {
  return handleCORS();
};