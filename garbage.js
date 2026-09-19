// UrbanVision Smart City
// AI Garbage Detection Module
// File: static/garbage.js


// ======================================================
// LOAD GARBAGE DATA
// ======================================================

async function loadGarbageData() {

    try {

        const response =
            await fetch("/api/garbage");


        if (!response.ok) {

            throw new Error(
                "Failed to load garbage data"
            );

        }


        const garbageData =
            await response.json();


        // ------------------------------------------------
        // CALCULATE SUMMARY
        // ------------------------------------------------

        const totalDetections =
            garbageData.length;


        const highSeverity =
            garbageData.filter(
                item =>
                    String(item.severity)
                        .toUpperCase() === "HIGH"
            ).length;


        const activeIssues =
            garbageData.filter(
                item =>
                    String(item.status)
                        .toUpperCase() !== "RESOLVED"
            ).length;


        const resolvedIssues =
            garbageData.filter(
                item =>
                    String(item.status)
                        .toUpperCase() === "RESOLVED"
            ).length;


        // ------------------------------------------------
        // UPDATE SUMMARY CARDS
        // ------------------------------------------------

        setElementText(
            "totalDetections",
            totalDetections
        );


        setElementText(
            "highSeverity",
            highSeverity
        );


        setElementText(
            "activeIssues",
            activeIssues
        );


        setElementText(
            "resolvedIssues",
            resolvedIssues
        );


        // ------------------------------------------------
        // UPDATE GARBAGE TABLE
        // ------------------------------------------------

        renderGarbageTable(
            garbageData
        );


    } catch (error) {

        console.error(
            "Garbage detection error:",
            error
        );

    }

}



// ======================================================
// RENDER GARBAGE TABLE
// ======================================================

function renderGarbageTable(
    garbageData
) {

    const tableBody =
        document.getElementById(
            "garbageTable"
        );


    if (!tableBody) {

        return;

    }


    if (
        !garbageData ||
        garbageData.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    No garbage detection data available.
                </td>
            </tr>
        `;

        return;

    }


    // Show newest detections first

    const sortedData =
        [...garbageData].sort(
            (a, b) =>
                new Date(
                    b.detection_time
                ) -
                new Date(
                    a.detection_time
                )
        );


    tableBody.innerHTML =
        sortedData.map(
            item => {

                const severity =
                    String(
                        item.severity || "--"
                    ).toUpperCase();


                const status =
                    String(
                        item.status || "--"
                    ).toUpperCase();


                const detectionTime =
                    formatDateTime(
                        item.detection_time
                    );


                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                item.id
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.location || "--"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.garbage_type || "--"
                            )}
                        </td>

                        <td>

                            <span
                                class="badge ${escapeHTML(
                                    severity
                                )}"
                            >
                                ${escapeHTML(
                                    severity
                                )}
                            </span>

                        </td>

                        <td>
                            ${escapeHTML(
                                detectionTime
                            )}
                        </td>

                        <td>

                            <span
                                class="badge ${escapeHTML(
                                    status
                                )}"
                            >
                                ${escapeHTML(
                                    status
                                )}
                            </span>

                        </td>

                    </tr>
                `;

            }
        ).join("");

}



// ======================================================
// UPDATE ELEMENT TEXT
// ======================================================

function setElementText(
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



// ======================================================
// FORMAT DATE AND TIME
// ======================================================

function formatDateTime(
    dateValue
) {

    if (!dateValue) {

        return "--";

    }


    const date =
        new Date(dateValue);


    if (isNaN(date.getTime())) {

        return String(
            dateValue
        );

    }


    return date.toLocaleString();

}



// ======================================================
// HTML ESCAPE
// ======================================================

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



// ======================================================
// INITIAL LOAD
// ======================================================

loadGarbageData();



// ======================================================
// AUTO REFRESH EVERY 10 SECONDS
// ======================================================

setInterval(
    loadGarbageData,
    10000
);