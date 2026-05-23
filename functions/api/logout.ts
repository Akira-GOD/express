// POST /api/logout - 用户登出
import { getKV, getSessionUsername, destroySession } from '../../lib/kv';
import { jsonResponse, errorResponse, handleCORS, parseBody } from '../../lib/auth';

export const onRequestPost: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const token = sessionMatch ? sessionMatch[1] : null;

  if (token) {
    const kv = getKV(context);
    await destroySession(kv, token);
  }

  return new Response(JSON.stringify({ message: '已登出' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
};

export const onRequestOptions: PagesFunction = async () => {
  return handleCORS();
};