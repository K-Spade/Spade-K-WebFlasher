"""Local preview only: serves this folder on loopback, with no external dependencies."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import webbrowser

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        # Serve only public site assets. Private editor and source files are not routes.
        path = unquote(urlsplit(self.path).path)
        allowed = {'/', '/index.html', '/devices.json'}
        assets = {'app.js', 'config.js', 'md5.js', 'i18n.js', 'models.js', 'station.css', 'mark.svg', 'king-card.svg', 'vendor/esptool/bundle.js', 'vendor/esptool/LICENSE', 'vendor/three/three.module.js', 'vendor/three/three.core.js', 'vendor/three/LICENSE'}
        public_asset = path.startswith('/assets/') and path[len('/assets/'):] in assets
        firmware = path.startswith('/firmware/') and path.lower().endswith('.bin') and not any(part in {'.', '..'} for part in path.split('/')) and '\\' not in path
        if path not in allowed and not public_asset and not firmware:
            self.send_error(404, 'Not found')
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404, 'Not found')
        return None

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='WebFlash local preview')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://localhost:{args.port}/'
    print('WebFlash: ' + url, flush=True)
    print('Keep this window open; press Ctrl+C to stop.', flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
