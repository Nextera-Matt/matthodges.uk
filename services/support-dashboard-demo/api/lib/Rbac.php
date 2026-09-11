<?php

/**
 * Minimal RBAC: three roles, each seeing progressively more.
 * Production version tied this to real SSO group membership;
 * here it just takes a role string directly for demo purposes.
 */
class Rbac
{
    private const PERMISSIONS = [
        'engineer'   => ['view_own_tickets', 'view_team_tickets'],
        'team_lead'  => ['view_own_tickets', 'view_team_tickets', 'view_all_tickets', 'view_workload'],
        'admin'      => ['view_own_tickets', 'view_team_tickets', 'view_all_tickets', 'view_workload', 'manage_users'],
    ];

    public function __construct(private string $role)
    {
        if (!isset(self::PERMISSIONS[$role])) {
            throw new InvalidArgumentException("Unknown role: {$role}");
        }
    }

    public function can(string $permission): bool
    {
        return in_array($permission, self::PERMISSIONS[$this->role], true);
    }

    public function role(): string
    {
        return $this->role;
    }
}
