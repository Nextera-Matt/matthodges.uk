<?php

require_once __DIR__ . '/../api/aggregate.php';

$dbPath = __DIR__ . '/../data/dashboard.sqlite';
if (!file_exists($dbPath)) {
    require __DIR__ . '/../data/generate-mock-tickets.php';
}

$db = new PDO('sqlite:' . $dbPath);
$cache = new Cache(__DIR__ . '/../api/cache');

$role = $_GET['role'] ?? 'team_lead';
$error = null;

try {
    $rbac = new Rbac($role);
    $data = get_dashboard_data($db, $cache, $rbac);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    $error = "Unknown role '{$role}'. Try engineer, team_lead, or admin.";
} catch (RuntimeException $e) {
    http_response_code(403);
    $error = $e->getMessage();
}

function priority_color(string $p): string {
    return match ($p) {
        'urgent' => 'var(--danger)',
        'high' => 'var(--status-warn)',
        default => 'var(--text-dim)',
    };
}
?>
<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Support Dashboard (live demo) – Matt Hodges</title>
  <link rel="icon" href="/favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Public+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div class="bg-grid" aria-hidden="true"></div>

  <header id="header" class="scrolled">
    <div class="container nav">
      <a href="/" class="brand"><div class="brand-icon">MH</div><span>Matt Hodges</span></a>
      <nav id="nav">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/tools">Tools</a></li>
          <li><a href="/tools/support-dashboard">&larr; Back to intro</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <section class="project-hero container">
      <div class="hero-badge">Live Demo &bull; Synthetic Data</div>
      <h1>Support Dashboard</h1>
      <p class="lede">Real-time ticket aggregation across three platforms, one unified view. Switch roles below to see RBAC in action.</p>

      <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
        <a href="?role=engineer" class="btn <?= $role === 'engineer' ? 'primary' : '' ?>">Engineer</a>
        <a href="?role=team_lead" class="btn <?= $role === 'team_lead' ? 'primary' : '' ?>">Team Lead</a>
        <a href="?role=admin" class="btn <?= $role === 'admin' ? 'primary' : '' ?>">Admin</a>
      </div>
    </section>

    <div class="project-content">
      <?php if ($error): ?>
        <section class="card">
          <p style="color: var(--danger);"><?= htmlspecialchars($error) ?></p>
        </section>
      <?php else: ?>

        <section class="card">
          <div class="about-stats" style="grid-template-columns: repeat(<?= min(4, 1 + count($data['by_priority'])) ?>, 1fr);">
            <div class="stat">
              <div class="stat-value"><?= $data['total_open'] ?></div>
              <div class="stat-label"><span class="stat-dot"></span>open tickets</div>
            </div>
            <?php foreach ($data['by_priority'] as $priority => $count): ?>
              <div class="stat" style="border-left-color: <?= priority_color($priority) ?>;">
                <div class="stat-value"><?= $count ?></div>
                <div class="stat-label"><span class="stat-dot" style="background: <?= priority_color($priority) ?>;"></span><?= htmlspecialchars($priority) ?></div>
              </div>
            <?php endforeach; ?>
          </div>
        </section>

        <section class="card">
          <h2>Open tickets <span style="font-size: 13px; color: var(--text-dim); font-weight: 400;">(viewing as <?= htmlspecialchars($rbac->role()) ?>)</span></h2>
          <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 13px; margin-top: 12px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border); text-align: left; color: var(--text-dim);">
                <th style="padding: 10px 12px;">ID</th>
                <th style="padding: 10px 12px;">Subject</th>
                <th style="padding: 10px 12px;">Priority</th>
                <th style="padding: 10px 12px;">Source</th>
                <th style="padding: 10px 12px;">Updated</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($data['tickets'] as $t): ?>
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 10px 12px;"><?= htmlspecialchars($t['id']) ?></td>
                  <td style="padding: 10px 12px;"><?= htmlspecialchars($t['subject']) ?></td>
                  <td style="padding: 10px 12px; color: <?= priority_color($t['priority']) ?>;"><?= htmlspecialchars($t['priority']) ?></td>
                  <td style="padding: 10px 12px; color: var(--text-dim);"><?= htmlspecialchars($t['source']) ?></td>
                  <td style="padding: 10px 12px; color: var(--text-dim);"><?= htmlspecialchars($t['updated_at']) ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
          </div>
        </section>

      <?php endif; ?>
    </div>
  </main>

  <footer>
    <div class="container footer-content">
      <div class="footer-left"><span>&copy; <span id="year"></span> Matt Hodges</span></div>
      <div class="footer-right">Synthetic demo data - regenerates on container restart</div>
    </div>
  </footer>

  <script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</body>
</html>
