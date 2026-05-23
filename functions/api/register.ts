// POST /api/register - 用户注册
import { getKV, userExists, saveUser } from '../../lib/kv';
import { hashPassword, jsonResponse, errorResponse, handleCORS, parseBody } from '../../lib/auth';

export const onRequestPost: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const body = await parseBody(context.request);
  if (!body || !body.username || !body.password) {
    return errorResponse('用户名和密码不能为空', 400);
  }

  const username = body.username.trim();
  const password = body.password;

  if (username.length < 3) {
    return errorResponse('用户名至少3个字符', 400);
  }
  if (password.length < 4) {
    return errorResponse('密码至少4个字符', 400);
  }

  const kv = getKV(context);
  const exists = await userExists(kv, username);
  if (exists) {
    return errorResponse('用户名已存在', 409);
  }

  const passwordHash = await hashPassword(password);
  await saveUser(kv, username, passwordHash);

  // 初始化记录列表
  await kv.put(`records:${username}`, JSON.stringify([]));

  return jsonResponse({ message: '注册成功，请登录', username }, 201);
};

export const onRequestOptions: PagesFunction = async () => {
  return handleCORS();
};