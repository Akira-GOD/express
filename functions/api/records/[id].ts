// PUT /api/records/:id - 更新记录
// DELETE /api/records/:id - 删除记录
import { getKV, getSessionUsername, getUserRecords, saveUserRecords } from '../../../lib/kv';
import { jsonResponse, errorResponse, handleCORS, parseBody } from '../../../lib/auth';

async function getUsername(context: any): Promise<string | null> {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const token = sessionMatch ? sessionMatch[1] : null;
  if (!token) return null;
  const kv = getKV(context);
  return await getSessionUsername(kv, token);
}

// PUT - 更新记录
export const onRequestPut: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const username = await getUsername(context);
  if (!username) return errorResponse('未登录', 401);

  const recordId = context.params.id as string;
  const body = await parseBody(context.request);

  if (!body || !body.trackingNo || !body.courier || !body.date) {
    return errorResponse('快递单号、快递公司和日期为必填项', 400);
  }

  const kv = getKV(context);
  const records = await getUserRecords(kv, username);
  const index = records.findIndex((r: any) => r.id === recordId);

  if (index === -1) {
    return errorResponse('记录不存在', 404);
  }

  // 检查重复（排除自身）
  if (records.some((r: any) => r.trackingNo === body.trackingNo && r.id !== recordId)) {
    return errorResponse('该快递单号已存在', 409);
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

  await saveUserRecords(kv, username, records);
  return jsonResponse(records[index]);
};

// DELETE - 删除记录
export const onRequestDelete: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const username = await getUsername(context);
  if (!username) return errorResponse('未登录', 401);

  const recordId = context.params.id as string;
  const kv = getKV(context);
  const records = await getUserRecords(kv, username);
  const beforeLen = records.length;

  const filtered = records.filter((r: any) => r.id !== recordId);

  if (filtered.length === beforeLen) {
    return errorResponse('记录不存在', 404);
  }

  await saveUserRecords(kv, username, filtered);
  return jsonResponse({ message: '删除成功' });
};

export const onRequestOptions: PagesFunction = async () => {
  return handleCORS();
};