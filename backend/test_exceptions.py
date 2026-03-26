from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)

def test_missing_route():
    response = client.get("/api/invalid-route")
    print("404 Error:", response.status_code, response.json())
    assert response.status_code == 404
    assert response.json()["error"]["error_code"] == "NOT_FOUND"

def test_validation_error():
    # Attempting to access an endpoint with missing/invalid params if one existed
    # Let's add a dummy route on the fly to test validation
    @app.get("/test-validation")
    def dummy_route(user_id: int):
        return {"user_id": user_id}

    response = client.get("/test-validation?user_id=abc")
    print("422 Error:", response.status_code, response.json())
    assert response.status_code == 422
    assert response.json()["error"]["error_code"] == "VALIDATION_ERROR"

def test_internal_error():
    @app.get("/test-500")
    def dummy_500():
        raise ValueError("Oops!")

    response = client.get("/test-500")
    print("500 Error:", response.status_code, response.json())
    assert response.status_code == 500
    assert response.json()["error"]["error_code"] == "INTERNAL_ERROR"

if __name__ == "__main__":
    test_missing_route()
    test_validation_error()
    test_internal_error()
    print("All checks passed!")
