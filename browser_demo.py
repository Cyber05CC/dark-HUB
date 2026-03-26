from __future__ import annotations

import argparse
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the dark HUB browser preview locally.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind the preview server to.")
    parser.add_argument("--port", type=int, default=8189, help="Port to bind the preview server to.")
    args = parser.parse_args()

    os.chdir(ROOT_DIR)
    server = ThreadingHTTPServer((args.host, args.port), SimpleHTTPRequestHandler)
    url = f"http://{args.host}:{args.port}/showcase.html"

    print(f"dark HUB browser preview is running at: {url}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping preview server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
