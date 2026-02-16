package main

import "testing"

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
