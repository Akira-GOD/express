<?php
/**
 * GET    /api/records.php          - 获取所有记录
 * POST   /api/records.php          - 新增记录
 * PUT    /api/records.php?id=xxx   - 更新记录
 * DELETE /api/records.php?id=xxx   - 删除记录
 */
require_once __DIR__ . '/config.php';
cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$userId = requireAuth();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ========== GET - 获取所有记录 ==========
if ($method === 'GET') {
    $stmt = $db->prepare(
        'SELECT id, tracking_no, courier, customer_name, reason, record_date, created_at, updated_at
         FROM records
         WHERE user_id = ?
         ORDER BY record_date DESC, created_at DESC'
    );
    $stmt->execute([$userId]);
    $records = $stmt->fetchAll();

    // 格式化输出
    $result = array_map(function ($r) {
        return [
            'id'           => (int)$r['id'],
            'trackingNo'   => $r['tracking_no'],
            'courier'      => $r['courier'],
            'customerName' => $r['customer_name'],
            'reason'       => $r['reason'],
            'date'         => $r['record_date'],
            'createdAt'    => $r['created_at'],
            'updatedAt'    => $r['updated_at'],
        ];
    }, $records);

    jsonResponse($result);
}

// ========== POST - 新增记录 ==========
if ($method === 'POST') {
    $input = getJsonInput();
    $trackingNo  = trim($input['trackingNo'] ?? '');
    $courier     = trim($input['courier'] ?? '');
    $customerName = trim($input['customerName'] ?? '');
    $reason      = trim($input['reason'] ?? '');
    $date        = trim($input['date'] ?? '');

    if ($trackingNo === '' || $courier === '' || $date === '') {
        jsonResponse(['error' => '快递单号、快递公司和日期为必填项'], 400);
    }

    // 检查重复
    $stmt = $db->prepare('SELECT id FROM records WHERE user_id = ? AND tracking_no = ?');
    $stmt->execute([$userId, $trackingNo]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => '该快递单号已存在，请勿重复登记'], 409);
    }

    $stmt = $db->prepare(
        'INSERT INTO records (user_id, tracking_no, courier, customer_name, reason, record_date)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $trackingNo, $courier, $customerName, $reason, $date]);

    $newId = (int)$db->lastInsertId();

    // 查询刚插入的记录返回
    $stmt = $db->prepare('SELECT * FROM records WHERE id = ?');
    $stmt->execute([$newId]);
    $record = $stmt->fetch();

    jsonResponse([
        'id'           => (int)$record['id'],
        'trackingNo'   => $record['tracking_no'],
        'courier'      => $record['courier'],
        'customerName' => $record['customer_name'],
        'reason'       => $record['reason'],
        'date'         => $record['record_date'],
        'createdAt'    => $record['created_at'],
        'updatedAt'    => $record['updated_at'],
    ], 201);
}

// ========== PUT - 更新记录 ==========
if ($method === 'PUT') {
    $recordId = $_GET['id'] ?? null;
    if (!$recordId || !ctype_digit($recordId)) {
        jsonResponse(['error' => '缺少记录 ID'], 400);
    }
    $recordId = (int)$recordId;

    // 验证记录属于当前用户
    $stmt = $db->prepare('SELECT id FROM records WHERE id = ? AND user_id = ?');
    $stmt->execute([$recordId, $userId]);
    if (!$stmt->fetch()) {
        jsonResponse(['error' => '记录不存在'], 404);
    }

    $input = getJsonInput();
    $trackingNo  = trim($input['trackingNo'] ?? '');
    $courier     = trim($input['courier'] ?? '');
    $customerName = trim($input['customerName'] ?? '');
    $reason      = trim($input['reason'] ?? '');
    $date        = trim($input['date'] ?? '');

    if ($trackingNo === '' || $courier === '' || $date === '') {
        jsonResponse(['error' => '快递单号、快递公司和日期为必填项'], 400);
    }

    // 检查重复（排除自身）
    $stmt = $db->prepare('SELECT id FROM records WHERE user_id = ? AND tracking_no = ? AND id != ?');
    $stmt->execute([$userId, $trackingNo, $recordId]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => '该快递单号已存在'], 409);
    }

    $stmt = $db->prepare(
        'UPDATE records SET tracking_no = ?, courier = ?, customer_name = ?, reason = ?, record_date = ?
         WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$trackingNo, $courier, $customerName, $reason, $date, $recordId, $userId]);

    // 返回更新后的记录
    $stmt = $db->prepare('SELECT * FROM records WHERE id = ?');
    $stmt->execute([$recordId]);
    $record = $stmt->fetch();

    jsonResponse([
        'id'           => (int)$record['id'],
        'trackingNo'   => $record['tracking_no'],
        'courier'      => $record['courier'],
        'customerName' => $record['customer_name'],
        'reason'       => $record['reason'],
        'date'         => $record['record_date'],
        'createdAt'    => $record['created_at'],
        'updatedAt'    => $record['updated_at'],
    ]);
}

// ========== DELETE - 删除记录 ==========
if ($method === 'DELETE') {
    $recordId = $_GET['id'] ?? null;
    if (!$recordId || !ctype_digit($recordId)) {
        jsonResponse(['error' => '缺少记录 ID'], 400);
    }
    $recordId = (int)$recordId;

    $stmt = $db->prepare('DELETE FROM records WHERE id = ? AND user_id = ?');
    $stmt->execute([$recordId, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => '记录不存在'], 404);
    }

    jsonResponse(['message' => '删除成功']);
}

jsonResponse(['error' => '不支持的请求方法'], 405);