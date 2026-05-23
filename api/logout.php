<?php
/**
 * POST /api/logout.php - 用户登出
 */
require_once __DIR__ . '/config.php';
cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => '请使用 POST 方法'], 405);
}

// 从 Header 或 Cookie 中获取 token
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$token = null;

if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
    $token = $m[1];
} else {
    $token = $_COOKIE['session'] ?? null;
}

if ($token) {
    $db = getDB();
    $stmt = $db->prepare('DELETE FROM sessions WHERE token = ?');
    $stmt->execute([$token]);
}

// 清除 Cookie
setcookie('session', '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);

jsonResponse(['message' => '已登出']);