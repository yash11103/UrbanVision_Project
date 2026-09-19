// UrbanVision Smart City
// Drainage Monitoring Module
// File: static/drainage.js


// ======================================================
// LOAD DRAINAGE DATA
// ======================================================

async function loadDrainageData() {

    try {

        const response =
            await fetch("/api/dashboard");


        if (!response.ok) {

            throw new Error(
                "Failed to load drainage data"
            );

        }


        const data =
            await response.json();


        const readings =
            data.readings || [];


        const summary =
            data.summary || {};


        // ------------------------------------------------
        // UPDATE SUMMARY CARDS
        // ------------------------------------------------

        setElementText(
            "totalReadings",
            summary.total_readings || 0
        );


        setElementText(
            "alertCount",
            summary.alert_count || 0
        );


        // ------------------------------------------------
        // UPDATE CURRENT READING
        // ------------------------------------------------

        if (readings.length > 0) {

            const latestReading =
                readings[0];


            const waterLevel =
                latestReading.water_level;


            const status =
                latestReading.status;


            setElementText(
                "currentWaterLevel",
                waterLevel !== undefined
                    ? waterLevel + "%"
                    : "--"
            );


            setElementText(
                "currentStatus",
                status || "--"
            );


            // Apply status class
            updateStatusStyle(
                "currentStatus",
                status
            );

        } else {

            setElementText(
                "currentWaterLevel",
                "--"
            );


            setElementText(
                "currentStatus",
                "--"
            );

        }


        // ------------------------------------------------
        // UPDATE HISTORY TABLE
        // ------------------------------------------------

        renderDrainageTable(
            readings
        );


    } catch (error) {

        console.error(
            "Drainage data error:",
            error
        );

    }

}



// ======================================================
// RENDER DRAINAGE HISTORY
// ======================================================

function renderDrainageTable(readings) {

    const tableBody =
        document.getElementById(
            "drainageTable"
        );


    if (!tableBody) {

        return;

    }


    if (
        !readings ||
        readings.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="3"
                    class="empty-state"
                >
                    No drainage readings available.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        readings.map(
            reading => {

                const waterLevel =
                    reading.water_level !== undefined
                        ? reading.water_level + "%"
                        : "--";


                const status =
                    String(
                        reading.status || "--"
                    ).toUpperCase();


                const readingTime =
                    formatDateTime(
                        reading.reading_time
                    );


                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    waterLevel
                                )}
                            </strong>
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

                        <td>
                            ${escapeHTML(
                                readingTime
                            )}
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
// UPDATE CURRENT STATUS STYLE
// ======================================================

function updateStatusStyle(
    elementId,
    status
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return;

    }


    element.classList.remove(
        "ALERT",
        "NORMAL"
    );


    const currentStatus =
        String(
            status || ""
        ).toUpperCase();


    if (currentStatus === "ALERT") {

        element.classList.add(
            "ALERT"
        );

    }


    if (currentStatus === "NORMAL") {

        element.classList.add(
            "NORMAL"
        );

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

loadDrainageData();



// ======================================================
// AUTO REFRESH
// ======================================================

setInterval(
    loadDrainageData,
    10000
);