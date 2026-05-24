import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
import requests

mock_checks_col = MagicMock()

with patch("pymongo.MongoClient") as mock_client:
    mock_db = MagicMock()
    mock_client.return_value.__getitem__.return_value = mock_db
    mock_db.__getitem__.return_value = mock_checks_col

    from app import app, check_url


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_check_url_success():
    with patch("requests.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        result = check_url("example.com")
        assert result["url"] == "https://example.com"
        assert result["status"] == "up"
        assert result["status_code"] == 200
        assert "latency_ms" in result
        mock_get.assert_called_once_with("https://example.com", timeout=10, allow_redirects=True)


def test_check_url_already_has_protocol():
    with patch("requests.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        result = check_url("http://custom-url.org")
        assert result["url"] == "http://custom-url.org"
        assert result["status"] == "up"
        mock_get.assert_called_once_with("http://custom-url.org", timeout=10, allow_redirects=True)


def test_check_url_connection_error():
    with patch("requests.get") as mock_get:
        mock_get.side_effect = requests.exceptions.ConnectionError()

        result = check_url("bad-url.com")
        assert result["status"] == "down"
        assert result["error"] == "Connection refused"


def test_check_url_timeout():
    with patch("requests.get") as mock_get:
        mock_get.side_effect = requests.exceptions.Timeout()

        result = check_url("slow-url.com")
        assert result["status"] == "down"
        assert "Timed out" in result["error"]


def test_check_url_invalid():
    with patch("requests.get") as mock_get:
        mock_get.side_effect = requests.exceptions.InvalidURL()

        result = check_url("invalid_url")
        assert result["status"] == "down"
        assert result["error"] == "Invalid URL"


def test_check_url_general_exception():
    with patch("requests.get") as mock_get:
        mock_get.side_effect = requests.exceptions.RequestException("Unknown error")

        result = check_url("error-url.com")
        assert result["status"] == "down"
        assert "Unknown error" in result["error"]


def test_check_route_no_urls(client):
    response = client.post("/check", json={"urls": []})
    assert response.status_code == 400
    assert response.get_json() == {"error": "No URLs provided"}


def test_check_route_success(client):
    mock_checks_col.insert_many.reset_mock()

    with patch("app.check_url") as mock_check:
        mock_check.side_effect = [
            {"url": "https://test1.com", "status": "up", "status_code": 200, "latency_ms": 50},
            {"url": "https://test2.com", "status": "down", "error": "Connection refused"}
        ]

        response = client.post("/check", json={"urls": ["test1.com", "test2.com"]})
        assert response.status_code == 200

        data = response.get_json()
        assert len(data["results"]) == 2
        assert data["results"][0]["url"] == "https://test1.com"
        assert data["results"][1]["status"] == "down"

        assert mock_checks_col.insert_many.called
        args, _ = mock_checks_col.insert_many.call_args
        inserted = args[0]
        assert len(inserted) == 2
        assert inserted[0]["url"] == "https://test1.com"
        assert "checked_at" in inserted[0]


def test_history_route(client):
    mock_dt = datetime(2026, 5, 24, 12, 0, 0, tzinfo=timezone.utc)
    mock_records = [
        {
            "url": "https://example.com",
            "status": "up",
            "status_code": 200,
            "latency_ms": 120,
            "checked_at": mock_dt
        }
    ]

    mock_find = MagicMock()
    mock_sort = MagicMock()
    mock_checks_col.find.return_value = mock_find
    mock_find.sort.return_value = mock_sort
    mock_sort.limit.return_value = mock_records

    response = client.get("/history?limit=10&url=https://example.com")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data["history"]) == 1
    assert data["history"][0]["url"] == "https://example.com"
    assert data["history"][0]["checked_at"] == mock_dt.isoformat()

    mock_checks_col.find.assert_called_with({"url": "https://example.com"}, {"_id": 0})
    mock_find.sort.assert_called_with("checked_at", -1)
    mock_sort.limit.assert_called_with(10)


def test_metrics_route(client):
    mock_dt = datetime(2026, 5, 24, 12, 0, 0, tzinfo=timezone.utc)
    mock_checks_col.aggregate.return_value = [
        {
            "_id": "https://example.com",
            "total": 10,
            "up_count": 9,
            "avg_latency": 150.4,
            "min_latency": 100.1,
            "max_latency": 200.9,
            "last_checked": mock_dt,
            "last_status": "up",
            "sparkline": [{"t": mock_dt, "l": 150, "s": "up"}]
        }
    ]

    response = client.get("/metrics")
    assert response.status_code == 200

    data = response.get_json()
    assert "summary" in data
    assert data["summary"]["total_checks"] == 10
    assert data["summary"]["overall_uptime_pct"] == 90.0
    assert data["summary"]["avg_latency_ms"] == 150
    assert data["summary"]["urls_monitored"] == 1

    assert len(data["per_url"]) == 1
    row = data["per_url"][0]
    assert row["url"] == "https://example.com"
    assert row["avg_latency"] == 150
    assert row["min_latency"] == 100
    assert row["max_latency"] == 201
    assert row["last_checked"] == mock_dt.isoformat()
    assert row["sparkline"][0]["t"] == mock_dt.isoformat()


def test_timeline_route_missing_url(client):
    response = client.get("/metrics/timeline")
    assert response.status_code == 400
    assert response.get_json() == {"error": "url parameter required"}


def test_timeline_route_success(client):
    mock_dt = datetime(2026, 5, 24, 12, 0, 0, tzinfo=timezone.utc)
    mock_cursor = [
        {
            "checked_at": mock_dt,
            "latency_ms": 100,
            "status": "up",
            "status_code": 200
        }
    ]

    mock_find = MagicMock()
    mock_sort = MagicMock()
    mock_checks_col.find.return_value = mock_find
    mock_find.sort.return_value = mock_sort
    mock_sort.limit.return_value = mock_cursor

    response = client.get("/metrics/timeline?url=https://example.com&limit=50")
    assert response.status_code == 200

    data = response.get_json()
    assert data["url"] == "https://example.com"
    assert len(data["timeline"]) == 1
    assert data["timeline"][0]["t"] == mock_dt.isoformat()
    assert data["timeline"][0]["latency_ms"] == 100
    assert data["timeline"][0]["status"] == "up"

    mock_checks_col.find.assert_called_with({"url": "https://example.com"}, {"_id": 0, "url": 0})
    mock_find.sort.assert_called_with("checked_at", 1)
    mock_sort.limit.assert_called_with(50)
