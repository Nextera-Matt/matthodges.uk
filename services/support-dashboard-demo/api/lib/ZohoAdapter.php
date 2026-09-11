<?php

require_once __DIR__ . '/TicketSource.php';

/**
 * Mock Zoho Desk adapter. Real version used OAuth2 + Zoho's REST API;
 * this reads synthetic tickets from the same seeded local store.
 */
class ZohoAdapter implements TicketSource
{
    public function __construct(private PDO $db)
    {
    }

    public function fetchOpenTickets(): array
    {
        $stmt = $this->db->query(
            'SELECT id, subject, priority, updated_at FROM tickets
             WHERE source = "zoho" AND status = "open"
             ORDER BY updated_at DESC'
        );

        return array_map(
            fn ($row) => [...$row, 'source' => 'zoho'],
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function sourceName(): string
    {
        return 'zoho';
    }
}
