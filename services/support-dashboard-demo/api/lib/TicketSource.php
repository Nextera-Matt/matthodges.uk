<?php

interface TicketSource
{
    /**
     * Fetch open tickets from this source.
     * Real adapters call the platform's API; mock adapters read seeded data.
     *
     * @return array<int, array{id: string, subject: string, priority: string, updated_at: string, source: string}>
     */
    public function fetchOpenTickets(): array;

    public function sourceName(): string;
}
