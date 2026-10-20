#!/usr/bin/env python3
# DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com
"""NIMOX Inventory: serves this folder and saves every change to db/items.json.
Uses only Python's standard library, so there is nothing to install."""
import base64, http.server, json, os, re, socket

ROOT = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(ROOT, 'db', 'items.json')
PORT = 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/api/items':
            try:
                with open(DB, encoding='utf-8') as f:
                    self.reply(200, json.load(f))
            except FileNotFoundError:
                self.reply(200, {'items': []})
        else:
            super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        try:
            data = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))))
            if path == '/api/items':
                if not isinstance(data.get('items'), list):
                    raise ValueError('items list missing')
                tmp = DB + '.tmp'
                with open(tmp, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                os.replace(tmp, DB)
                self.reply(200, {'ok': True})
            elif path == '/api/image':
                name = re.sub(r'[^A-Za-z0-9_-]', '', data['name'].rsplit('.', 1)[0])[:40] or 'photo'
                raw = base64.b64decode(data['data'].split(',', 1)[1])
                os.makedirs(os.path.join(ROOT, 'images'), exist_ok=True)
                with open(os.path.join(ROOT, 'images', name + '.jpg'), 'wb') as f:
                    f.write(raw)
                self.reply(200, {'name': name + '.jpg'})
            else:
                self.reply(404, {'error': 'not found'})
        except Exception as e:
            self.reply(400, {'error': str(e)})


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


if __name__ == '__main__':
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print('NIMOX Inventory is running.')
    print(f'  On this computer:           http://localhost:{PORT}')
    print(f'  On phones on the same Wi-Fi: http://{lan_ip()}:{PORT}')
    print('Press Ctrl+C to stop.')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
