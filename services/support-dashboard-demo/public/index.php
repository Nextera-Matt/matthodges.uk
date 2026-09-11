<?php

require_once __DIR__ . '/../api/aggregate.php';

$dbPath = __DIR__ . '/../data/dashboard.sqlite';
if (!file_exists($dbPath)) {
    require __DIR__ . '/../data/generate-mock-tickets.php';
}

$db = new PDO('sqlite:' . $dbPath);
$cache = new Cache(__DIR__ . '/../api/cache');

try {
    $rbac = new Rbac($_GET['role'] ?? 'team_lead');
    $data = get_dashboard_data($db, $cache, $rbac);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    die('<p>Unknown role. Try ?role=engineer, ?role=team_lead, or ?role=admin.</p>');
} catch (RuntimeException $e) {
    http_response_code(403);
    die('<p>' . htmlspecialchars($e->getMessage()) . '</p>');
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Support Dashboard (demo)</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; padding: 2rem; }
  .stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  .stat { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem 1.5rem; }
  .stat .n { font-size: 1.5rem; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #30363d; font-size: 0.9rem; }
  .priority-urgent { color: #f85149; }
  .priority-high { color: #e3b341; }
</style>
</head>
<body>
<h1>Support dashboard <small style="opacity:.6">(demo — synthetic data, role: <?= htmlspecialchars($rbac->role()) ?>)</small></h1>

<div class="stats">
  <div class="stat"><div class="n"><?= $data['total_open'] ?></div>open tickets</div>
  <?php foreach ($data['by_priority'] as $priority => $count): ?>
    <div class="stat"><div class="n"><?= $count ?></div><?= htmlspecialchars($priority) ?></div>
  <?php endforeach; ?>
</div>

<table>
<tr><th>ID</th><th>Subject</th><th>Priority</th><th>Source</th><th>Updated</th></tr>
<?php foreach ($data['tickets'] as $t): ?>
  <tr>
    <td><?= htmlspecialchars($t['id']) ?></td>
    <td><?= htmlspecialchars($t['subject']) ?></td>
    <td class="priority-<?= htmlspecialchars($t['priority']) ?>"><?= htmlspecialchars($t['priority']) ?></td>
    <td><?= htmlspecialchars($t['source']) ?></td>
    <td><?= htmlspecialchars($t['updated_at']) ?></td>
  </tr>
<?php endforeach; ?>
</table>
</body>
</html>
