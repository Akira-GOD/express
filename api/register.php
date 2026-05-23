<?php
/**
 * POST /api/register.php - 用户注册
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
if (mb_strlen($username) < 3) {
    jsonResponse(['error' => '用户名至少3个字符'], 400);
}
if (strlen($password) < 4) {
    jsonResponse(['error' => '密码至少4个字符'], 400);
}

$db = getDB();

// 检查用户名是否已存在
$stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute([$username]);
if ($stmt->fetch()) {
    jsonResponse(['error' => '用户名已存在'], 409);
}

// 插入用户
$passwordHash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $db->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
$stmt->execute([$username, $passwordHash]);

jsonResponse(['message' => '注册成功，请登录', 'username' => $username], 201);