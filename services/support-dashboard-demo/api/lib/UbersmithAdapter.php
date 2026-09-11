<?php

require_once __DIR__ . '/TicketSource.php';

/**
 * Mock Ubersmith adapter. In production this called the real Ubersmith API
 * (client_id/api_key auth, XML-RPC style endpoints) - here it just reads
 * synthetic tickets seeded by data/generate-mock-tickets.php, tagged to a
 * given "instance" label since the original system polled two separate
 * Ubersmith instances (dedicated + VPS hosting brands).
 */
class UbersmithAdapter implements TicketSource
{
    public function __construct(private PDO $db, private string $instanceLabel)
    {
    }

    public function fetchOpenTickets(): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, subject, priority, updated_at FROM tickets
             WHERE source = ? AND status = "open"
             ORDER BY updated_at DESC'
        );
        $stmt->execute([$this->instanceLabel]);

        return array_map(
            fn ($row) => [...$row, 'source' => $this->instanceLabel],
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function sourceName(): string
    {
        return $this->instanceLabel;
    }
}
