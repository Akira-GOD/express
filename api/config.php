<?php
/**
 * 数据库配置与工具函数
 */

// ========== 数据库连接 ==========
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'kd');
define('DB_USER', 'kuaidi');
define('DB_PASS', 'aaaa14977');
define('DB_CHARSET', 'utf8mb4');

/**
 * 获取 PDO 数据库连接（单例）
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', DB_HOST, DB_PORT, DB_NAME, DB_CHARSET);
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}

// ========== CORS & JSON 工具 ==========
function cors(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

function jsonResponse(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ========== 会话认证 ==========
function getAuthUserId(): ?int {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        $token = $m[1];
    } else {
        // 也支持 Cookie 方式
        $token = $_COOKIE['session'] ?? null;
    }

    if (!$token) return null;

    try {
        $db = getDB();
        $stmt = $db->prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()');
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        return $row ? (int)$row['user_id'] : null;
    } catch (PDOException) {
        return null;
    }
}

function requireAuth(): int {
    $userId = getAuthUserId();
    if ($userId === null) {
        jsonResponse(['error' => '未登录或会话已过期，请重新登录'], 401);
    }
    return $userId;
}

// ========== CSRF Token 生成（可选，用于额外安全） ==========
function generateToken(): string {
    return bin2hex(random_bytes(32));
}