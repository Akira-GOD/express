<?php
/**
 * POST /api/login.php - 用户登录
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

$input = getJsonInput();
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if ($username === '' || $password === '') {
    jsonResponse(['error' => '用户名和密码不能为空'], 400);
}

$db = getDB();

// 查找用户
$stmt = $db->prepare('SELECT id, password_hash FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    jsonResponse(['error' => '用户名或密码错误'], 401);
}

// 生成 Token
$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));

// 插入会话
$stmt = $db->prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)');
$stmt->execute([$user['id'], $token, $expiresAt]);

// 通过 Cookie 和 JSON 同时返回 token
setcookie('session', $token, [
    'expires'  => strtotime('+7 days'),
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);

jsonResponse([
    'message'  => '登录成功',
    'username' => $username,
    'token'    => $token,
]);