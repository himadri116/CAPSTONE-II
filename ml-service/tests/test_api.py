from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PY = '''
def risky(a, b, c, d, e, f):
    try:
        for i in range(10):
            if a:
                while b:
                    if c and d or e:
                        print(i)
    except Exception:
        pass
    return f

def ok(x):
    return x + 1
'''

JS = '''
function ok(a) { return a + 1; }
const arrow = (x) => x * 2;
class Svc { run(a) { if (a) { return 1; } return 2; } }
'''


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_python_analysis_flags_risky_function():
    r = client.post("/analyze", json={"files": [{"path": "a.py", "content": PY}]}).json()
    funcs = {f["name"]: f for f in r["files"][0]["functions"]}
    assert funcs["risky"]["risk"] > funcs["ok"]["risk"]
    kinds = {s["type"] for s in funcs["risky"]["smells"]}
    assert {"long_parameter_list", "empty_catch"} <= kinds


def test_js_functions_found():
    r = client.post("/analyze", json={"files": [{"path": "a.js", "content": JS}]}).json()
    names = {f["name"] for f in r["files"][0]["functions"]}
    assert {"ok", "arrow", "run"} <= names


def test_duplicate_detection_and_skip():
    block = "\n".join(f"x{i} = compute({i}) + helper(x{i-1})" for i in range(1, 9))
    r = client.post("/analyze", json={"files": [
        {"path": "a.py", "content": block}, {"path": "b.py", "content": block}, {"path": "n.txt", "content": "hi"}]}).json()
    assert any(s["type"] == "duplicate_code" for s in r["files"][0]["smells"])
    assert r["files"][2]["skipped"]
