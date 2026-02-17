package main

import (
	"context"
	"testing"
)

func TestHasPermission(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		role     int
		required permission
		want     bool
	}{
		{
			name:     "admin can manage roles",
			role:     roleAdmin,
			required: permissionManageRoleAssignments,
			want:     true,
		},
		{
			name:     "admin can view any responsibilities",
			role:     roleAdmin,
			required: permissionViewAnyResponsibilities,
			want:     true,
		},
		{
			name:     "employee cannot manage roles",
			role:     roleEmployee,
			required: permissionManageRoleAssignments,
			want:     false,
		},
		{
			name:     "invalid role cannot view any responsibilities",
			role:     999,
			required: permissionViewAnyResponsibilities,
			want:     false,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := hasPermission(tc.role, tc.required)
			if got != tc.want {
				t.Fatalf("hasPermission(role=%d, perm=%q) = %v, want %v", tc.role, tc.required, got, tc.want)
			}
		})
	}
}

func TestParseAdminEmployeeIDsFromEnv(t *testing.T) {
	t.Setenv(adminEmployeeIDsEnvKey, "12345, 67890;abc\nxyz\t  12345")

	ids := parseAdminEmployeeIDsFromEnv()
	if len(ids) != 4 {
		t.Fatalf("parseAdminEmployeeIDsFromEnv() len = %d, want 4", len(ids))
	}
	for _, id := range []string{"12345", "67890", "abc", "xyz"} {
		if _, ok := ids[id]; !ok {
			t.Fatalf("expected id %q to be present", id)
		}
	}
}

func TestGetUserRoleByWbUserID_AdminFromEnvWithoutDB(t *testing.T) {
	t.Setenv(adminEmployeeIDsEnvKey, "emp-777")

	role, err := getUserRoleByWbUserID(context.Background(), nil, "emp-777")
	if err != nil {
		t.Fatalf("getUserRoleByWbUserID returned error: %v", err)
	}
	if role != roleAdmin {
		t.Fatalf("getUserRoleByWbUserID role = %d, want %d", role, roleAdmin)
	}
}
