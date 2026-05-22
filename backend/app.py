from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timezone
import requests
import time
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

TIMEOUT = 10

client = MongoClient(os.getenv("MONGO_URI"))
db = client["healthchecker"]
checks_col = db["url_list"]


def check_url(url: str) -> dict:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    start = time.time()
    try:
        response = requests.get(url, timeout=TIMEOUT, allow_redirects=True)
        latency = round((time.time() - start) * 1000)
        return {
            "url": url,
            "status": "up",
            "status_code": response.status_code,
            "latency_ms": latency,
        }
    except requests.exceptions.ConnectionError:
        return {"url": url, "status": "down", "error": "Connection refused"}
    except requests.exceptions.Timeout:
        return {"url": url, "status": "down", "error": f"Timed out after {TIMEOUT}s"}
    except requests.exceptions.InvalidURL:
        return {"url": url, "status": "down", "error": "Invalid URL"}
    except requests.exceptions.RequestException as e:
        return {"url": url, "status": "down", "error": str(e)}


@app.route("/check", methods=["POST"])
def check_urls():
    data = request.get_json()
    urls = data.get("urls", [])

    if not urls:
        return jsonify({"error": "No URLs provided"}), 400

    results = [check_url(url.strip()) for url in urls if url.strip()]
    checked_at = datetime.now(timezone.utc)

    docs = [
        {**result, "checked_at": checked_at}
        for result in results
    ]
    checks_col.insert_many(docs)

    return jsonify({"results": results})


@app.route("/history", methods=["GET"])
def get_history():
    limit = min(int(request.args.get("limit", 50)), 200)
    url_filter = request.args.get("url")

    query = {"url": url_filter} if url_filter else {}
    cursor = checks_col.find(query, {"_id": 0}).sort("checked_at", -1).limit(limit)

    records = []
    for doc in cursor:
        doc["checked_at"] = doc["checked_at"].isoformat()
        records.append(doc)

    return jsonify({"history": records})


@app.route("/metrics", methods=["GET"])
def get_metrics():
    pipeline = [
        {"$sort": {"checked_at": 1}},
        {"$group": {
            "_id": "$url",
            "total": {"$sum": 1},
            "up_count": {"$sum": {"$cond": [{"$eq": ["$status", "up"]}, 1, 0]}},
            "avg_latency": {"$avg": "$latency_ms"},
            "min_latency": {"$min": "$latency_ms"},
            "max_latency": {"$max": "$latency_ms"},
            "last_checked": {"$max": "$checked_at"},
            "last_status": {"$last": "$status"},
            "points": {"$push": {
                "t": "$checked_at",
                "l": "$latency_ms",
                "s": "$status",
            }},
        }},
        {"$addFields": {
            "uptime_pct": {
                "$round": [{"$multiply": [{"$divide": ["$up_count", "$total"]}, 100]}, 1]
            },
            "sparkline": {"$slice": ["$points", -30]},
        }},
        {"$project": {"points": 0}},
        {"$sort": {"last_checked": -1}},
    ]

    rows = list(checks_col.aggregate(pipeline))

    total_checks = sum(r["total"] for r in rows)
    total_up = sum(r["up_count"] for r in rows)
    overall_uptime = round(total_up / total_checks * 100, 1) if total_checks else 0
    latencies = [r["avg_latency"] for r in rows if r.get("avg_latency")]
    avg_latency = round(sum(latencies) / len(latencies)) if latencies else 0

    for r in rows:
        r["url"] = r.pop("_id")
        r["last_checked"] = r["last_checked"].isoformat()
        r["avg_latency"] = round(r["avg_latency"]) if r.get("avg_latency") else None
        r["min_latency"] = round(r["min_latency"]) if r.get("min_latency") else None
        r["max_latency"] = round(r["max_latency"]) if r.get("max_latency") else None
        for p in r["sparkline"]:
            p["t"] = p["t"].isoformat()

    return jsonify({
        "summary": {
            "total_checks": total_checks,
            "overall_uptime_pct": overall_uptime,
            "avg_latency_ms": avg_latency,
            "urls_monitored": len(rows),
        },
        "per_url": rows,
    })


@app.route("/metrics/timeline", methods=["GET"])
def get_timeline():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "url parameter required"}), 400

    limit = min(int(request.args.get("limit", 100)), 500)
    cursor = checks_col.find(
        {"url": url}, {"_id": 0, "url": 0}
    ).sort("checked_at", 1).limit(limit)

    points = []
    for doc in cursor:
        points.append({
            "t": doc["checked_at"].isoformat(),
            "latency_ms": doc.get("latency_ms"),
            "status": doc["status"],
            "status_code": doc.get("status_code"),
        })

    return jsonify({"url": url, "timeline": points})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
