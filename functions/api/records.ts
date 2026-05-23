// GET /api/records - 获取所有记录
// POST /api/records - 新增记录
import { getKV, getSessionUsername, getUserRecords, saveUserRecords } from '../../lib/kv';
import { generateRecordId, jsonResponse, errorResponse, handleCORS, parseBody } from '../../lib/auth';

async function getUsername(context: any): Promise<string | null> {
  const cookies = context.request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const token = sessionMatch ? sessionMatch[1] : null;
  if (!token) return null;
  const kv = getKV(context);
  return await getSessionUsername(kv, token);
}

// GET - 获取所有记录
export const onRequestGet: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const username = await getUsername(context);
  if (!username) return errorResponse('未登录', 401);

  const kv = getKV(context);
  const records = await getUserRecords(kv, username);
  return jsonResponse(records);
};

// POST - 新增记录
export const onRequestPost: PagesFunction<{ RETURN_REGISTER: KVNamespace }> = async (context) => {
  const username = await getUsername(context);
  if (!username) return errorResponse('未登录', 401);

  const body = await parseBody(context.request);
  if (!body || !body.trackingNo || !body.courier || !body.date) {
    return errorResponse('快递单号、快递公司和日期为必填项', 400);
  }

  const kv = getKV(context);
  const records = await getUserRecords(kv, username);

  // 检查重复
  if (records.some((r: any) => r.trackingNo === body.trackingNo)) {
    return errorResponse('该快递单号已存在', 409);
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
  await saveUserRecords(kv, username, records);
  return jsonResponse(record, 201);
};

export const onRequestOptions: PagesFunction = async () => {
  return handleCORS();
};