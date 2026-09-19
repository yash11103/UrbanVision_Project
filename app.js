// ============================================================
// UrbanVision Smart City Dashboard
// File: static/app.js
// ============================================================


async function loadDashboard() {

    try {

        // ========================================================
        // 1. LOAD DRAINAGE DATA
        // ========================================================

        const dashboardResponse =
            await fetch("/api/dashboard");

        if (!dashboardResponse.ok) {
            throw new Error(
                "Failed to load dashboard data"
            );
        }

        const dashboardData =
            await dashboardResponse.json();

        // IMPORTANT:
        // Backend returns "drainage", not "readings"
        const readings =
            dashboardData.drainage || [];

        const summary =
            dashboardData.summary || {};


        // --------------------------------------------------------
        // Drainage summary
        // --------------------------------------------------------

        setText(
            "totalReadings",
            summary.total_readings || 0
        );

        setText(
            "dashboardDrainageReadings",
            summary.total_readings || 0
        );

        setText(
            "dashboardDrainageAlerts",
            summary.alert_count || 0
        );


        // --------------------------------------------------------
        // Latest drainage reading
        // --------------------------------------------------------

        if (readings.length > 0) {

            const latest =
                readings[0];

            setText(
                "currentWaterLevel",
                latest.water_level !== undefined
                    ? latest.water_level + "%"
                    : "--"
            );

            setText(
                "currentWaterStatus",
                latest.status || "--"
            );

        } else {

            setText(
                "currentWaterLevel",
                "--"
            );

            setText(
                "currentWaterStatus",
                "--"
            );
        }


        // ========================================================
        // 2. LOAD STREETLIGHT DATA
        // ========================================================

        const streetlightResponse =
            await fetch("/api/streetlights");

        if (!streetlightResponse.ok) {

            throw new Error(
                "Failed to load streetlight data"
            );
        }

        const streetlightData =
            await streetlightResponse.json();

        // Backend returns:
        // { "streetlights": [...] }

        const streetlights =
            streetlightData.streetlights || [];


        // --------------------------------------------------------
        // Streetlight calculations
        // --------------------------------------------------------

        const totalStreetlights =
            streetlights.length;


        const lightsOn =
            streetlights.filter(
                light =>
                    String(light.status)
                        .toUpperCase() === "ON"
            ).length;


        const lightFaults =
            streetlights.filter(
                light =>
                    String(light.status)
                        .toUpperCase() === "FAULT"
            ).length;


        let averageBrightness = 0;


        if (totalStreetlights > 0) {

            const brightnessTotal =
                streetlights.reduce(
                    (sum, light) =>
                        sum +
                        Number(
                            light.brightness || 0
                        ),
                    0
                );

            averageBrightness =
                Math.round(
                    brightnessTotal /
                    totalStreetlights
                );
        }


        // --------------------------------------------------------
        // Update streetlight cards
        // --------------------------------------------------------

        setText(
            "totalStreetlights",
            totalStreetlights
        );

        setText(
            "dashboardStreetlights",
            totalStreetlights
        );

        setText(
            "dashboardLightsOn",
            lightsOn
        );

        setText(
            "dashboardLightFaults",
            lightFaults
        );

        setText(
            "dashboardBrightness",
            averageBrightness + "%"
        );


        // ========================================================
        // 3. LOAD GARBAGE DATA
        // ========================================================

        const garbageResponse =
            await fetch("/api/garbage");

        if (!garbageResponse.ok) {

            throw new Error(
                "Failed to load garbage data"
            );
        }

        const garbageData =
            await garbageResponse.json();

        // Backend returns:
        // { "garbage": [...] }

        const garbage =
            garbageData.garbage || [];


        // --------------------------------------------------------
        // Garbage calculations
        // --------------------------------------------------------

        const totalGarbage =
            garbage.length;


        const highGarbage =
            garbage.filter(
                item =>
                    String(item.severity)
                        .toUpperCase() === "HIGH"
            ).length;


        const activeGarbage =
            garbage.filter(
                item =>
                    String(item.status)
                        .toUpperCase() !== "RESOLVED"
            ).length;


        const resolvedGarbage =
            garbage.filter(
                item =>
                    String(item.status)
                        .toUpperCase() === "RESOLVED"
            ).length;


        // --------------------------------------------------------
        // Update garbage cards
        // --------------------------------------------------------

        setText(
            "garbageIssues",
            activeGarbage
        );

        setText(
            "dashboardGarbageTotal",
            totalGarbage
        );

        setText(
            "dashboardGarbageHigh",
            highGarbage
        );

        setText(
            "dashboardGarbageActive",
            activeGarbage
        );

        setText(
            "dashboardGarbageResolved",
            resolvedGarbage
        );


        // ========================================================
        // 4. LOAD INCIDENT DATA
        // ========================================================

        const incidentResponse =
            await fetch("/api/incidents");

        if (!incidentResponse.ok) {

            throw new Error(
                "Failed to load incident data"
            );
        }

        const incidentData =
            await incidentResponse.json();

        // Backend returns:
        // { "incidents": [...] }

        const incidents =
            incidentData.incidents || [];


        const now =
            new Date();


        // --------------------------------------------------------
        // Active incidents
        // --------------------------------------------------------

        const activeIncidents =
            incidents.filter(
                incident =>
                    String(
                        incident.status
                    ).toUpperCase() !== "RESOLVED"
            );


        // --------------------------------------------------------
        // Resolved incidents
        // --------------------------------------------------------

        const resolvedIncidents =
            incidents.filter(
                incident =>
                    String(
                        incident.status
                    ).toUpperCase() === "RESOLVED"
            );


        // --------------------------------------------------------
        // Escalated incidents
        // --------------------------------------------------------

        const escalatedIncidents =
            incidents.filter(
                incident =>
                    String(
                        incident.escalation_level
                    ).toUpperCase() === "ESCALATED"
            );


        // --------------------------------------------------------
        // Overdue incidents
        // --------------------------------------------------------

        const overdueIncidents =
            incidents.filter(
                incident => {

                    if (
                        String(
                            incident.status
                        ).toUpperCase() === "RESOLVED"
                    ) {
                        return false;
                    }


                    if (!incident.due_date) {
                        return false;
                    }


                    const dueDate =
                        new Date(
                            incident.due_date
                        );


                    return dueDate <= now;
                }
            );


        // ========================================================
        // 5. INCIDENT SUMMARY CARDS
        // ========================================================

        setText(
            "activeIncidents",
            activeIncidents.length
        );

        setText(
            "dashboardActiveIncidents",
            activeIncidents.length
        );

        setText(
            "dashboardOverdueIncidents",
            overdueIncidents.length
        );

        setText(
            "dashboardEscalatedIncidents",
            escalatedIncidents.length
        );

        setText(
            "dashboardResolvedIncidents",
            resolvedIncidents.length
        );


        // ========================================================
        // 6. RECENT INCIDENTS TABLE
        // ========================================================

        renderRecentIncidents(
            incidents
        );


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );
    }
}


// ============================================================
// DISPLAY TEXT SAFELY
// ============================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );

    if (element) {

        element.textContent =
            value;
    }
}


// ============================================================
// RENDER RECENT INCIDENTS
// ============================================================

function renderRecentIncidents(
    incidents
) {

    const tableBody =
        document.getElementById(
            "incidentTableBody"
        );


    if (!tableBody) {
        return;
    }


    // ----------------------------------------------------------
    // No incidents
    // ----------------------------------------------------------

    if (
        !incidents ||
        incidents.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    No incidents found.
                </td>
            </tr>
        `;

        return;
    }


    // ----------------------------------------------------------
    // Sort newest first
    // ----------------------------------------------------------

    const recentIncidents =
        [...incidents]
            .sort(
                (a, b) =>
                    new Date(
                        b.detected_time
                    ) -
                    new Date(
                        a.detected_time
                    )
            )
            .slice(0, 10);


    // ----------------------------------------------------------
    // Render rows
    // ----------------------------------------------------------

    tableBody.innerHTML =
        recentIncidents
            .map(
                incident => {

                    const status =
                        String(
                            incident.status ||
                            "OPEN"
                        ).toUpperCase();


                    const severity =
                        String(
                            incident.severity ||
                            "MEDIUM"
                        ).toUpperCase();


                    const escalation =
                        String(
                            incident.escalation_level ||
                            "NORMAL"
                        ).toUpperCase();


                    return `
                        <tr>

                            <td>
                                <button
                                    class="view-button"
                                    onclick="viewIncident(${incident.id})"
                                >
                                    View
                                </button>
                            </td>


                            <td>
                                <strong>
                                    ${escapeHTML(
                                        incident.incident_code ||
                                        "-"
                                    )}
                                </strong>
                            </td>


                            <td>
                                ${escapeHTML(
                                    incident.module ||
                                    "-"
                                )}
                            </td>


                            <td>
                                ${escapeHTML(
                                    incident.location ||
                                    "-"
                                )}
                            </td>


                            <td>
                                <span
                                    class="badge ${severity}"
                                >
                                    ${escapeHTML(
                                        severity
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="badge ${status}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="badge ${escalation}"
                                >
                                    ${escapeHTML(
                                        escalation
                                    )}
                                </span>
                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// ============================================================
// OPEN INCIDENT DETAILS
// ============================================================

function viewIncident(
    id
) {

    window.location.href =
        `/incident/${id}`;
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// INITIAL LOAD
// ============================================================

loadDashboard();


// ============================================================
// AUTO REFRESH EVERY 10 SECONDS
// ============================================================

setInterval(
    loadDashboard,
    10000
);