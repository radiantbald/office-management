package main

import (
	"context"
	"log"
	"strings"
)

func (a *app) auditResponsibilityChange(ctx context.Context, entityType string, entityID int64, previousEmployeeID, newEmployeeID, changedByEmployeeID string) {
	if a == nil || a.db == nil {
		return
	}
	previous := strings.TrimSpace(previousEmployeeID)
	current := strings.TrimSpace(newEmployeeID)
	actor := strings.TrimSpace(changedByEmployeeID)
	if previous == current {
		return
	}
	if entityType = strings.TrimSpace(entityType); entityType == "" || entityID <= 0 {
		return
	}
	if _, err := a.db.ExecContext(
		ctx,
		`INSERT INTO responsibility_audit_log (
			entity_type,
			entity_id,
			previous_employee_id,
			new_employee_id,
			changed_by_employee_id
		) VALUES ($1, $2, $3, $4, $5)`,
		entityType,
		entityID,
		previous,
		current,
		actor,
	); err != nil {
		log.Printf("responsibility audit: failed to store record: entity=%s id=%d: %v", entityType, entityID, err)
	}
}
