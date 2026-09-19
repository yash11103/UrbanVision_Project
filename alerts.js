// ============================================================
// UrbanVision - Alerts & Incident Center
// ============================================================

async function loadAlerts() {
    try {
        const response = await fetch("/api/incidents");

        if (!response.ok) {
            throw new Error("Failed to load incidents");
        }

        const data = await response.json();

        // Backend returns:
        // { "incidents": [...] }
        const incidents = data.incidents || [];

        updateAlertSummary(incidents);
        renderIncidents(incidents);

    } catch (error) {
        console.error("Alerts loading error:", error);

        const table = document.getElementById("alertsTable");

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; color:#dc2626;">
                        Unable to load incidents
                    </td>
                </tr>
            `;
        }
    }
}


// ============================================================
// UPDATE SUMMARY CARDS
// ============================================================

function updateAlertSummary(incidents) {

    const now = new Date();

    const activeIncidents = incidents.filter(
        incident => incident.status !== "RESOLVED"
    );

    const resolvedIncidents = incidents.filter(
        incident => incident.status === "RESOLVED"
    );

    const escalatedIncidents = incidents.filter(
        incident => incident.escalation_level === "ESCALATED"
    );

    const overdueIncidents = incidents.filter(incident => {

        if (incident.status === "RESOLVED") {
            return false;
        }

        if (!incident.due_date) {
            return false;
        }

        return new Date(incident.due_date) < now;
    });


    setText("activeAlerts", activeIncidents.length);
    setText("overdueAlerts", overdueIncidents.length);
    setText("escalatedAlerts", escalatedIncidents.length);
    setText("resolvedAlerts", resolvedIncidents.length);
}


// ============================================================
// RENDER INCIDENT TABLE
// ============================================================

function renderIncidents(incidents) {

    const table = document.getElementById("alertsTable");

    if (!table) {
        console.error("alertsTable element not found");
        return;
    }

    if (incidents.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;">
                    No incidents found
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML = incidents.map(incident => {

        const severityClass =
            String(incident.severity || "")
                .toLowerCase();

        const statusClass =
            String(incident.status || "")
                .toLowerCase()
                .replace(/\s+/g, "-");

        const escalationClass =
            String(incident.escalation_level || "")
                .toLowerCase();


        return `
            <tr>

                <td>
                    <a
                        href="/incident/${incident.id}"
                        class="view-button"
                    >
                        View
                    </a>
                </td>

                <td>
                    <strong>${escapeHtml(incident.incident_code)}</strong>
                </td>

                <td>
                    ${escapeHtml(incident.module)}
                </td>

                <td>
                    ${escapeHtml(incident.location)}
                </td>

                <td>
                    ${escapeHtml(incident.issue_type)}
                </td>

                <td>
                    <span class="badge ${severityClass}">
                        ${escapeHtml(incident.severity)}
                    </span>
                </td>

                <td>
                    ${formatDateTime(incident.detected_time)}
                </td>

                <td>
                    <span class="badge ${statusClass}">
                        ${escapeHtml(incident.status)}
                    </span>
                </td>

                <td>
                    <span class="badge ${escalationClass}">
                        ${escapeHtml(incident.escalation_level)}
                    </span>
                </td>

            </tr>
        `;

    }).join("");
}


// ============================================================
// FORMAT DATE / TIME
// ============================================================

function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}


// ============================================================
// SET TEXT HELPER
// ============================================================

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


// ============================================================
// HTML SAFETY
// ============================================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// INITIAL LOAD
// ============================================================

loadAlerts();


// ============================================================
// AUTO REFRESH EVERY 10 SECONDS
// ============================================================

setInterval(loadAlerts, 10000);