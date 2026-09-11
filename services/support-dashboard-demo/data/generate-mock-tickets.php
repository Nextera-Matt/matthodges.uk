<?php

// Seeds a local SQLite file with synthetic tickets across three fake
// sources, so the dashboard has something realistic to display without
// ever touching a real ticketing platform.

$dbPath = __DIR__ . '/dashboard.sqlite';
$fresh = !file_exists($dbPath);

$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

if ($fresh) {
    $db->exec('CREATE TABLE tickets (
        id TEXT PRIMARY KEY,
        subject TEXT,
        priority TEXT,
        status TEXT,
        source TEXT,
        updated_at TEXT
    )');

    $sources = ['ubersmith_dedicated', 'ubersmith_vps', 'zoho'];
    $priorities = ['low', 'normal', 'high', 'urgent'];
    $subjects = [
        'Server not responding to ping',
        'Unable to access control panel',
        'Billing query re: last invoice',
        'Requesting RAID rebuild status',
        'DNS not resolving for domain',
        'SSL certificate renewal needed',
        'Disk space alert on VPS',
        'Migration request to new plan',
    ];

    $insert = $db->prepare(
        'INSERT INTO tickets (id, subject, priority, status, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    foreach (range(1, 60) as $i) {
        $insert->execute([
            sprintf('%s-%05d', substr($sources[array_rand($sources)], 0, 3), $i),
            $subjects[array_rand($subjects)],
            $priorities[array_rand($priorities)],
            'open',
            $sources[array_rand($sources)],
            date('Y-m-d H:i:s', time() - random_int(0, 86400 * 3)),
        ]);
    }

    echo "Seeded 60 mock tickets across 3 sources.\n";
} else {
    echo "Mock data already exists at {$dbPath}.\n";
}
