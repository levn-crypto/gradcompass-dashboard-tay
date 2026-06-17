from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import secrets


ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"
SHARES = ROOT / "shares.json"
MAX_BODY = 1024 * 1024


def read_shares():
    if not SHARES.exists():
        return {}
    try:
        return json.loads(SHARES.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def write_shares(value):
    SHARES.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


class GradCompassHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/api/share":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self.send_error(413)
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_error(400)
            return

        shares = read_shares()
        share_id = secrets.token_urlsafe(5).replace("-", "").replace("_", "")[:8]
        while share_id in shares:
            share_id = secrets.token_urlsafe(5).replace("-", "").replace("_", "")[:8]
        shares[share_id] = payload
        write_shares(shares)
        self.send_json({"id": share_id, "url": f"/s/{share_id}"})

    def do_GET(self):
        if self.path.startswith("/s/"):
            self.serve_share(self.path.split("?", 1)[0].split("/", 2)[2])
            return
        super().do_GET()

    def serve_share(self, share_id):
        payload = read_shares().get(share_id)
        if not payload:
            self.send_error(404, "Share not found")
            return
        html = INDEX.read_text(encoding="utf-8")
        injected = (
            "<script>"
            "window.__GRADCOMPASS_SHARE__="
            + json.dumps(payload, ensure_ascii=False)
            + ";</script>"
        )
        html = html.replace("<script>\n    window.onerror", injected + "\n  <script>\n    window.onerror", 1)
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8000), GradCompassHandler).serve_forever()
