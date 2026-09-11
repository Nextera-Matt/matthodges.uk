<?php

require_once __DIR__ . '/lib/UbersmithAdapter.php';
require_once __DIR__ . '/lib/ZohoAdapter.php';
require_once __DIR__ . '/lib/Cache.php';
require_once __DIR__ . '/lib/Rbac.php';

function get_dashboard_data(PDO $db, Cache $cache, Rbac $rbac): array
{
    if (!$rbac->can('view_team_tickets')) {
        throw new RuntimeException('Not authorized to view tickets');
    }

    $sources = [
        new UbersmithAdapter($db, 'ubersmith_dedicated'),
        new UbersmithAdapter($db, 'ubersmith_vps'),
        new ZohoAdapter($db),
    ];

    $tickets = $cache->remember('dashboard:all_tickets', function () use ($sources) {
        $all = [];
        foreach ($sources as $source) {
            $all = [...$all, ...$source->fetchOpenTickets()];
        }
        usort($all, fn ($a, $b) => strcmp($b['updated_at'], $a['updated_at']));
        return $all;
    });

    $byPriority = [];
    foreach ($tickets as $ticket) {
        $byPriority[$ticket['priority']] = ($byPriority[$ticket['priority']] ?? 0) + 1;
    }

    return [
        'total_open' => count($tickets),
        'by_priority' => $byPriority,
        'tickets' => $rbac->can('view_all_tickets') ? $tickets : array_slice($tickets, 0, 10),
    ];
}
