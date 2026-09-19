// UrbanVision Smart City
// Streetlight Monitoring Module
// File: static/streetlights.js


// ======================================================
// LOAD STREETLIGHT DATA
// ======================================================

async function loadStreetlights() {

    try {

        const response =
            await fetch("/api/streetlights");


        if (!response.ok) {

            throw new Error(
                "Failed to load streetlight data"
            );

        }


        const streetlights =
            await response.json();


        // ------------------------------------------------
        // CALCULATE SUMMARY
        // ------------------------------------------------

        const totalLights =
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


        if (totalLights > 0) {

            const totalBrightness =
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
                    totalBrightness /
                    totalLights
                );

        }


        // ------------------------------------------------
        // UPDATE SUMMARY CARDS
        // ------------------------------------------------

        setElementText(
            "totalLights",
            totalLights
        );


        setElementText(
            "lightsOn",
            lightsOn
        );


        setElementText(
            "lightFaults",
            lightFaults
        );


        setElementText(
            "averageBrightness",
            averageBrightness + "%"
        );


        // ------------------------------------------------
        // UPDATE STREETLIGHT TABLE
        // ------------------------------------------------

        renderStreetlightTable(
            streetlights
        );


    } catch (error) {

        console.error(
            "Streetlight data error:",
            error
        );

    }

}



// ======================================================
// RENDER STREETLIGHT TABLE
// ======================================================

function renderStreetlightTable(
    streetlights
) {

    const tableBody =
        document.getElementById(
            "streetlightTable"
        );


    if (!tableBody) {

        return;

    }


    if (
        !streetlights ||
        streetlights.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    No streetlight data available.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        streetlights.map(
            light => {

                const status =
                    String(
                        light.status || "--"
                    ).toUpperCase();


                const brightness =
                    light.brightness !== undefined
                        ? light.brightness + "%"
                        : "--";


                const lastUpdated =
                    formatDateTime(
                        light.last_updated
                    );


                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                light.id
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                light.location || "--"
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

                        <td>
                            <strong>
                                ${escapeHTML(
                                    brightness
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                lastUpdated
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

loadStreetlights();



// ======================================================
// AUTO REFRESH EVERY 10 SECONDS
// ======================================================

setInterval(
    loadStreetlights,
    10000
);