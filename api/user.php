<?php
/**
 * GET /api/user.php - 获取当前用户信息
 */
require_once __DIR__ . '/config.php';
cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => '请使用 GET 方法'], 405);
}

$userId = requireAuth();

$db = getDB();
$stmt = $db->prepare('SELECT id, username, created_at FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    jsonResponse(['error' => '用户不存在'], 404);
}

jsonResponse([
    'username'   => $user['username'],
    'created_at' => $user['created_at'],
]);