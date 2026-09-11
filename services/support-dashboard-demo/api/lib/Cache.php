<?php

/**
 * Two-tier cache used to avoid hitting the real ticketing platforms on
 * every dashboard load.
 *
 * L1 (in-memory, per-request-process lifetime via a static array here -
 * production used APCu, which persists across requests within a worker)
 *   - very short TTL, absorbs bursts of near-simultaneous requests
 *
 * L2 (file-backed, survives across processes/restarts)
 *   - longer TTL, absorbs the cost of the actual upstream API calls
 *   - refreshed by a scheduled warm job rather than on-demand, so a real
 *     user request is never the one paying the slow-API-call cost
 */
class Cache
{
    private static array $l1 = [];

    public function __construct(
        private string $l2Dir,
        private int $l1TtlSeconds = 30,
        private int $l2TtlSeconds = 300,
    ) {
        if (!is_dir($this->l2Dir)) {
            mkdir($this->l2Dir, 0755, true);
        }
    }

    public function remember(string $key, callable $fetch): mixed
    {
        $now = time();

        if (isset(self::$l1[$key]) && self::$l1[$key]['expires'] > $now) {
            return self::$l1[$key]['value'];
        }

        $l2Path = $this->l2Path($key);
        if (is_file($l2Path)) {
            $entry = json_decode(file_get_contents($l2Path), true);
            if ($entry && $entry['expires'] > $now) {
                self::$l1[$key] = ['value' => $entry['value'], 'expires' => $now + $this->l1TtlSeconds];
                return $entry['value'];
            }
        }

        $value = $fetch();

        self::$l1[$key] = ['value' => $value, 'expires' => $now + $this->l1TtlSeconds];
        file_put_contents($l2Path, json_encode([
            'value' => $value,
            'expires' => $now + $this->l2TtlSeconds,
        ]));

        return $value;
    }

    private function l2Path(string $key): string
    {
        return rtrim($this->l2Dir, '/') . '/' . hash('sha256', $key) . '.json';
    }
}
