// GET /api/user - 获取当前用户信息
import { getKV, getSessionUsername } from '../../lib/kv';
import { jsonResponse, errorResponse, handleCORS } from '../../lib/auth';

export const onRequestGet: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const token = sessionMatch ? sessionMatch[1] : null;

  if (!token) {
    return errorResponse('未登录', 401);
  }

  const kv = getKV(context);
  const username = await getSessionUsername(kv, token);
  if (!username) {
    return errorResponse('会话已过期，请重新登录', 401);
  }

  return jsonResponse({ username });
};

export const onRequestOptions: PagesFunction = async () => {
  return handleCORS();
};