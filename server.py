from flask import Flask, request, jsonify, render_template
import mysql.connector
from datetime import datetime, timedelta

app = Flask(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

ALERT_LEVEL = 70

# Time allowed before an unresolved incident is escalated
ESCALATION_MINUTES = 15

# Authority configuration for each UrbanVision module
AUTHORITY_CONFIG = {
    "DRAINAGE": {
        "authority": "Municipal Drainage Department",
        "mobile": "+91-9000000001",
        "email": "drainage@authority.gov",
        "higher_authority": "Municipal Commissioner",
        "higher_mobile": "+91-9000000011",
        "higher_email": "commissioner@authority.gov"
    },

    "STREETLIGHT": {
        "authority": "Electrical Maintenance Department",
        "mobile": "+91-9000000002",
        "email": "streetlights@authority.gov",
        "higher_authority": "Municipal Engineering Officer",
        "higher_mobile": "+91-9000000012",
        "higher_email": "engineering@authority.gov"
    },

    "GARBAGE": {
        "authority": "Solid Waste Management Department",
        "mobile": "+91-9000000003",
        "email": "waste@authority.gov",
        "higher_authority": "Municipal Health Officer",
        "higher_mobile": "+91-9000000013",
        "higher_email": "health@authority.gov"
    }
}


# ============================================================
# DATABASE CONNECTION
# ============================================================

def connect_database():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="YashM@1103",
        database="urbanvision"
    )


# ============================================================
# HOME / PAGE ROUTES
# ============================================================

@app.route("/")
def dashboard():
    return render_template("index.html")


@app.route("/drainage")
def drainage_page():
    return render_template("drainage.html")


@app.route("/streetlights")
def streetlights_page():
    return render_template("streetlights.html")


@app.route("/garbage")
def garbage_page():
    return render_template("garbage.html")


@app.route("/alerts")
def alerts_page():
    return render_template("alerts.html")


@app.route("/incident/<int:incident_id>")
def incident_page(incident_id):
    return render_template("incident.html", incident_id=incident_id)


# ============================================================
# INCIDENT CREATION HELPER
# ============================================================

def create_incident(
    module,
    location,
    issue_type,
    severity
):
    """
    Creates a new incident automatically if there is not already
    an unresolved incident for the same module, location and issue.
    """

    module = module.upper()

    if module not in AUTHORITY_CONFIG:
        print("Unknown module:", module)
        return None

    authority = AUTHORITY_CONFIG[module]

    db = connect_database()
    cursor = db.cursor(dictionary=True)

    try:

        # --------------------------------------------------------
        # Prevent duplicate incidents
        # --------------------------------------------------------

        cursor.execute("""
            SELECT id, incident_code
            FROM incidents
            WHERE module = %s
              AND location = %s
              AND issue_type = %s
              AND status != 'RESOLVED'
            ORDER BY detected_time DESC
            LIMIT 1
        """, (
            module,
            location,
            issue_type
        ))

        existing = cursor.fetchone()

        if existing:
            return existing["id"]

        # --------------------------------------------------------
        # Incident details
        # --------------------------------------------------------

        detected_time = datetime.now()
        first_alert_time = detected_time

        due_date = detected_time + timedelta(
            minutes=ESCALATION_MINUTES
        )

        # Generate incident code
        timestamp_code = detected_time.strftime("%Y%m%d%H%M%S")

        incident_code = (
            f"UV-{module[:3]}-{timestamp_code}"
        )

        # --------------------------------------------------------
        # Insert incident
        # --------------------------------------------------------

        sql = """
            INSERT INTO incidents (
                incident_code,
                module,
                location,
                issue_type,
                severity,
                detected_time,
                assigned_authority,
                authority_mobile,
                authority_email,
                first_alert_time,
                due_date,
                status,
                escalation_level,
                higher_authority,
                higher_authority_mobile,
                higher_authority_email
            )
            VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                'OPEN',
                'NORMAL',
                %s, %s, %s
            )
        """

        values = (
            incident_code,
            module,
            location,
            issue_type,
            severity,
            detected_time,

            authority["authority"],
            authority["mobile"],
            authority["email"],

            first_alert_time,
            due_date,

            authority["higher_authority"],
            authority["higher_mobile"],
            authority["higher_email"]
        )

        cursor.execute(sql, values)
        db.commit()

        incident_id = cursor.lastrowid

        # --------------------------------------------------------
        # Prototype notification
        # --------------------------------------------------------
        # At this stage we print the notification.
        # Later this can be connected to SMS/email APIs.

        print("")
        print("==========================================")
        print("URBANVISION FIRST ALERT")
        print("==========================================")
        print("Incident:", incident_code)
        print("Module:", module)
        print("Location:", location)
        print("Issue:", issue_type)
        print("Severity:", severity)
        print("Authority:", authority["authority"])
        print("Mobile:", authority["mobile"])
        print("Email:", authority["email"])
        print("Due:", due_date)
        print("==========================================")
        print("")

        return incident_id

    except Exception as e:

        db.rollback()
        print("Incident creation error:", e)
        return None

    finally:

        cursor.close()
        db.close()


# ============================================================
# DRAINAGE SENSOR API
# ============================================================

@app.route("/sensor", methods=["POST"])
def receive_sensor_data():

    data = request.get_json()

    if not data or "water_level" not in data:
        return jsonify({
            "error": "water_level is required"
        }), 400

    try:
        water_level = float(data["water_level"])

    except (ValueError, TypeError):

        return jsonify({
            "error": "water_level must be a number"
        }), 400

    if water_level < 0 or water_level > 100:

        return jsonify({
            "error": "water_level must be between 0 and 100"
        }), 400

    # --------------------------------------------------------
    # Determine status
    # --------------------------------------------------------

    if water_level >= ALERT_LEVEL:
        status = "ALERT"
    else:
        status = "NORMAL"

    reading_time = datetime.now()

    # --------------------------------------------------------
    # Save drainage reading
    # --------------------------------------------------------

    db = connect_database()
    cursor = db.cursor()

    try:

        sql = """
            INSERT INTO drainage_readings
            (water_level, status, reading_time)
            VALUES (%s, %s, %s)
        """

        values = (
            water_level,
            status,
            reading_time
        )

        cursor.execute(sql, values)

        db.commit()

    finally:

        cursor.close()
        db.close()

    # --------------------------------------------------------
    # Create incident if water level is dangerous
    # --------------------------------------------------------

    incident_id = None

    if status == "ALERT":

        incident_id = create_incident(
            module="DRAINAGE",
            location="Smart Drainage Sensor",
            issue_type=f"High water level detected ({water_level}%)",
            severity="HIGH"
        )

    result = {
        "water_level": water_level,
        "status": status,
        "time": reading_time.strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
        "incident_id": incident_id
    }

    print(result)

    return jsonify(result)


# ============================================================
# DASHBOARD API
# ============================================================

@app.route("/api/dashboard")
def dashboard_data():

    db = connect_database()
    cursor = db.cursor(dictionary=True)

    try:

        # ----------------------------------------------------
        # Drainage readings
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                water_level,
                status,
                reading_time
            FROM drainage_readings
            ORDER BY reading_time DESC
            LIMIT 20
        """)

        drainage = cursor.fetchall()

        # ----------------------------------------------------
        # Drainage summary
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                COUNT(*) AS total_readings,
                SUM(
                    CASE
                        WHEN status = 'ALERT'
                        THEN 1
                        ELSE 0
                    END
                ) AS alert_count
            FROM drainage_readings
        """)

        summary = cursor.fetchone()

        # ----------------------------------------------------
        # Incident summary
        # ----------------------------------------------------

        cursor.execute("""
            SELECT
                COUNT(*) AS total_incidents,
                SUM(
                    CASE
                        WHEN status != 'RESOLVED'
                        THEN 1
                        ELSE 0
                    END
                ) AS active_incidents,
                SUM(
                    CASE
                        WHEN escalation_level = 'ESCALATED'
                        THEN 1
                        ELSE 0
                    END
                ) AS escalated_incidents,
                SUM(
                    CASE
                        WHEN status = 'RESOLVED'
                        THEN 1
                        ELSE 0
                    END
                ) AS resolved_incidents
            FROM incidents
        """)

        incident_summary = cursor.fetchone()

    finally:

        cursor.close()
        db.close()

    return jsonify({

        "summary": {

            "total_readings": int(
                summary["total_readings"] or 0
            ),

            "alert_count": int(
                summary["alert_count"] or 0
            ),

            "total_incidents": int(
                incident_summary["total_incidents"] or 0
            ),

            "active_incidents": int(
                incident_summary["active_incidents"] or 0
            ),

            "escalated_incidents": int(
                incident_summary["escalated_incidents"] or 0
            ),

            "resolved_incidents": int(
                incident_summary["resolved_incidents"] or 0
            )
        },

        "drainage": [

            {
                "water_level": float(row["water_level"]),
                "status": row["status"],
                "reading_time": row["reading_time"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
            }

            for row in drainage
        ]
    })


# ============================================================
# STREETLIGHT API
# ============================================================

@app.route("/api/streetlights")
def streetlights_data():

    db = connect_database()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                id,
                location,
                status,
                brightness,
                last_updated
            FROM streetlights
            ORDER BY last_updated DESC
        """)

        streetlights = cursor.fetchall()

        # ----------------------------------------------------
        # Automatically create incidents for faulty lights
        # ----------------------------------------------------

        for light in streetlights:

            status = str(
                light["status"]
            ).upper()

            if status in ["FAULT", "FAILED"]:

                create_incident(
                    module="STREETLIGHT",
                    location=light["location"],
                    issue_type="Streetlight fault detected",
                    severity="HIGH"
                )

            elif status == "OFF":

                create_incident(
                    module="STREETLIGHT",
                    location=light["location"],
                    issue_type="Streetlight switched OFF",
                    severity="MEDIUM"
                )

    finally:

        cursor.close()
        db.close()

    return jsonify({

        "streetlights": [

            {
                "id": row["id"],
                "location": row["location"],
                "status": row["status"],
                "brightness": row["brightness"],
                "last_updated": row["last_updated"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
            }

            for row in streetlights
        ]
    })


# ============================================================
# GARBAGE API
# ============================================================

@app.route("/api/garbage")
def garbage_data():

    db = connect_database()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                id,
                location,
                garbage_type,
                severity,
                detection_time,
                status
            FROM garbage_detections
            ORDER BY detection_time DESC
        """)

        garbage = cursor.fetchall()

        # ----------------------------------------------------
        # Automatically create incidents for active garbage
        # ----------------------------------------------------

        for item in garbage:

            status = str(
                item["status"]
            ).upper()

            severity = str(
                item["severity"]
            ).upper()

            if status != "RESOLVED":

                if severity == "HIGH":

                    incident_severity = "HIGH"

                elif severity == "MEDIUM":

                    incident_severity = "MEDIUM"

                else:

                    incident_severity = "LOW"

                create_incident(
                    module="GARBAGE",
                    location=item["location"],
                    issue_type=(
                        f"{item['garbage_type']} detected"
                    ),
                    severity=incident_severity
                )

    finally:

        cursor.close()
        db.close()

    return jsonify({

        "garbage": [

            {
                "id": row["id"],
                "location": row["location"],
                "garbage_type": row["garbage_type"],
                "severity": row["severity"],
                "detection_time": row["detection_time"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
                "status": row["status"]
            }

            for row in garbage
        ]
    })


# ============================================================
# INCIDENT LIST API
# ============================================================

@app.route("/api/incidents")
def incidents_data():

    db = connect_database()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                id,
                incident_code,
                module,
                location,
                issue_type,
                severity,
                detected_time,
                assigned_authority,
                authority_mobile,
                authority_email,
                first_alert_time,
                due_date,
                status,
                escalation_level,
                escalation_time,
                higher_authority,
                higher_authority_mobile,
                higher_authority_email,
                resolved_time
            FROM incidents
            ORDER BY detected_time DESC
        """)

        incidents = cursor.fetchall()

    finally:

        cursor.close()
        db.close()

    return jsonify({

        "incidents": [

            {
                "id": row["id"],
                "incident_code": row["incident_code"],
                "module": row["module"],
                "location": row["location"],
                "issue_type": row["issue_type"],
                "severity": row["severity"],

                "detected_time": (
                    row["detected_time"].strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                    if row["detected_time"]
                    else None
                ),

                "assigned_authority": row[
                    "assigned_authority"
                ],

                "authority_mobile": row[
                    "authority_mobile"
                ],

                "authority_email": row[
                    "authority_email"
                ],

                "first_alert_time": (
                    row["first_alert_time"].strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                    if row["first_alert_time"]
                    else None
                ),

                "due_date": (
                    row["due_date"].strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                    if row["due_date"]
                    else None
                ),

                "status": row["status"],

                "escalation_level": row[
                    "escalation_level"
                ],

                "escalation_time": (
                    row["escalation_time"].strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                    if row["escalation_time"]
                    else None
                ),

                "higher_authority": row[
                    "higher_authority"
                ],

                "higher_authority_mobile": row[
                    "higher_authority_mobile"
                ],

                "higher_authority_email": row[
                    "higher_authority_email"
                ],

                "resolved_time": (
                    row["resolved_time"].strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )
                    if row["resolved_time"]
                    else None
                )
            }

            for row in incidents
        ]
    })


# ============================================================
# INCIDENT DETAIL API
# ============================================================

@app.route("/api/incidents/<int:incident_id>")
def incident_detail(incident_id):

    db = connect_database()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                id,
                incident_code,
                module,
                location,
                issue_type,
                severity,
                detected_time,
                assigned_authority,
                authority_mobile,
                authority_email,
                first_alert_time,
                due_date,
                status,
                escalation_level,
                escalation_time,
                higher_authority,
                higher_authority_mobile,
                higher_authority_email,
                resolved_time
            FROM incidents
            WHERE id = %s
        """, (incident_id,))

        incident = cursor.fetchone()

    finally:

        cursor.close()
        db.close()

    if not incident:

        return jsonify({
            "incident": None
        }), 404

    return jsonify({

        "incident": {

            "id": incident["id"],

            "incident_code": incident[
                "incident_code"
            ],

            "module": incident[
                "module"
            ],

            "location": incident[
                "location"
            ],

            "issue_type": incident[
                "issue_type"
            ],

            "severity": incident[
                "severity"
            ],

            "detected_time": (
                incident["detected_time"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if incident["detected_time"]
                else None
            ),

            "assigned_authority": incident[
                "assigned_authority"
            ],

            "authority_mobile": incident[
                "authority_mobile"
            ],

            "authority_email": incident[
                "authority_email"
            ],

            "first_alert_time": (
                incident["first_alert_time"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if incident["first_alert_time"]
                else None
            ),

            "due_date": (
                incident["due_date"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if incident["due_date"]
                else None
            ),

            "status": incident[
                "status"
            ],

            "escalation_level": incident[
                "escalation_level"
            ],

            "escalation_time": (
                incident["escalation_time"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if incident["escalation_time"]
                else None
            ),

            "higher_authority": incident[
                "higher_authority"
            ],

            "higher_authority_mobile": incident[
                "higher_authority_mobile"
            ],

            "higher_authority_email": incident[
                "higher_authority_email"
            ],

            "resolved_time": (
                incident["resolved_time"].strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if incident["resolved_time"]
                else None
            )
        }
    })


# ============================================================
# UPDATE INCIDENT STATUS
# ============================================================

@app.route(
    "/api/incidents/<int:incident_id>/status",
    methods=["PUT"]
)
def update_incident_status(incident_id):

    data = request.get_json()

    if not data:

        return jsonify({
            "message": "Request body is required"
        }), 400

    new_status = data.get("status")

    allowed_statuses = [
        "IN_PROGRESS",
        "RESOLVED"
    ]

    if new_status not in allowed_statuses:

        return jsonify({
            "message": "Invalid status"
        }), 400

    db = connect_database()
    cursor = db.cursor()

    try:

        # ----------------------------------------------------
        # RESOLVED
        # ----------------------------------------------------

        if new_status == "RESOLVED":

            cursor.execute("""
                UPDATE incidents
                SET
                    status = %s,
                    resolved_time = %s
                WHERE id = %s
            """, (
                new_status,
                datetime.now(),
                incident_id
            ))

        # ----------------------------------------------------
        # IN PROGRESS
        # ----------------------------------------------------

        else:

            cursor.execute("""
                UPDATE incidents
                SET
                    status = %s
                WHERE id = %s
            """, (
                new_status,
                incident_id
            ))

        db.commit()

    except Exception as e:

        db.rollback()

        return jsonify({
            "message": "Database error",
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        db.close()

    return jsonify({
        "message": (
            f"Incident status updated to {new_status}"
        )
    })


# ============================================================
# AUTOMATIC ESCALATION
# ============================================================

def check_escalations():

    db = connect_database()
    cursor = db.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                id,
                incident_code,
                module,
                location,
                issue_type,
                severity,
                status,
                due_date,
                escalation_level,
                higher_authority,
                higher_authority_mobile,
                higher_authority_email
            FROM incidents
            WHERE status != 'RESOLVED'
        """)

        incidents = cursor.fetchall()

        for incident in incidents:

            if incident["due_date"] is None:
                continue

            # ------------------------------------------------
            # Check if due date has passed
            # ------------------------------------------------

            if incident["due_date"] <= datetime.now():

                # ------------------------------------------------
                # First escalation
                # ------------------------------------------------

                if incident["escalation_level"] == "NORMAL":

                    escalation_time = datetime.now()

                    cursor.execute("""
                        UPDATE incidents
                        SET
                            escalation_level = 'ESCALATED',
                            escalation_time = %s
                        WHERE id = %s
                    """, (
                        escalation_time,
                        incident["id"]
                    ))

                    print("")
                    print("==========================================")
                    print("URBANVISION ESCALATION ALERT")
                    print("==========================================")
                    print(
                        "Incident:",
                        incident["incident_code"]
                    )
                    print(
                        "Module:",
                        incident["module"]
                    )
                    print(
                        "Location:",
                        incident["location"]
                    )
                    print(
                        "Issue:",
                        incident["issue_type"]
                    )
                    print(
                        "Severity:",
                        incident["severity"]
                    )
                    print(
                        "Higher Authority:",
                        incident["higher_authority"]
                    )
                    print(
                        "Mobile:",
                        incident[
                            "higher_authority_mobile"
                        ]
                    )
                    print(
                        "Email:",
                        incident[
                            "higher_authority_email"
                        ]
                    )
                    print(
                        "Escalation Time:",
                        escalation_time
                    )
                    print("==========================================")
                    print("")

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            "Escalation database error:",
            e
        )

    finally:

        cursor.close()
        db.close()


# ============================================================
# BACKGROUND ESCALATION LOOP
# ============================================================

def escalation_loop():

    import time

    while True:

        try:

            check_escalations()

        except Exception as e:

            print(
                "Escalation check error:",
                e
            )

        time.sleep(60)


# ============================================================
# START APPLICATION
# ============================================================

if __name__ == "__main__":

    from threading import Thread

    Thread(
        target=escalation_loop,
        daemon=True
    ).start()

    app.run(
        debug=True,
        use_reloader=False
    )