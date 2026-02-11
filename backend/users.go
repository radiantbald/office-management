package main

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
)

type userSummary struct {
	EmployeeID string `json:"employee_id"`
	FullName   string `json:"full_name,omitempty"`
	WbUserID   string `json:"wb_user_id,omitempty"`
}

func (a *app) handleUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	role, err := resolveRoleFromRequest(r, a.db)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to resolve requester role")
		return
	}
	if role == roleEmployee {
		buildingIDRaw := strings.TrimSpace(r.URL.Query().Get("building_id"))
		if buildingIDRaw == "" {
			respondError(w, http.StatusForbidden, "Недостаточно прав")
			return
		}
		buildingID, err := strconv.ParseInt(buildingIDRaw, 10, 64)
		if err != nil || buildingID <= 0 {
			respondError(w, http.StatusBadRequest, "building_id must be a number")
			return
		}
		employeeID, err := extractEmployeeIDFromRequest(r, a.db)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		employeeID = strings.TrimSpace(employeeID)
		if employeeID == "" {
			respondError(w, http.StatusForbidden, "Недостаточно прав")
			return
		}
		var responsibleID string
		row := a.db.QueryRow(
			`SELECT COALESCE(responsible_employee_id, '') FROM office_buildings WHERE id = $1`,
			buildingID,
		)
		if err := row.Scan(&responsibleID); err != nil {
			if err == sql.ErrNoRows {
				respondError(w, http.StatusNotFound, "building not found")
				return
			}
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if strings.TrimSpace(responsibleID) == "" || strings.TrimSpace(responsibleID) != employeeID {
			respondError(w, http.StatusForbidden, "Недостаточно прав")
			return
		}
	} else if role != roleAdmin {
		respondError(w, http.StatusForbidden, "Недостаточно прав")
		return
	}

	rows, err := a.db.Query(
		`SELECT COALESCE(employee_id, ''),
		        COALESCE(full_name, ''),
		        COALESCE(wb_user_id, '')
		   FROM users
		  WHERE TRIM(COALESCE(employee_id, '')) <> ''
		  ORDER BY full_name, employee_id`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	items := make([]userSummary, 0)
	for rows.Next() {
		var item userSummary
		if err := rows.Scan(&item.EmployeeID, &item.FullName, &item.WbUserID); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		item.EmployeeID = strings.TrimSpace(item.EmployeeID)
		item.FullName = strings.TrimSpace(item.FullName)
		item.WbUserID = strings.TrimSpace(item.WbUserID)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"items": items})
}
