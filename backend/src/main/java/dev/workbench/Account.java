package dev.workbench;

import java.util.List;

public record Account(String id, String username, String displayName, String passwordHash, List<String> roles) {
    public boolean hasRole(String role) {
        return roles.contains(role);
    }

    public boolean canSeeTeam() {
        return roles.stream().anyMatch(List.of("editor", "reviewer", "publisher")::contains);
    }

    public View view() {
        return new View(id, username, displayName, roles);
    }

    public record View(String id, String username, String displayName, List<String> roles) {}
}
