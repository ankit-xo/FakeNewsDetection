# Starts the backend and frontend development servers.

import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:3000"


def find_python_executable() -> str:
    candidates = [
        ROOT / "venv" / "bin" / "python",
        ROOT / "venv" / "Scripts" / "python.exe",
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return sys.executable


def ensure_command(name: str) -> None:
    if shutil.which(name):
        return

    print(f"Missing required command: {name}", file=sys.stderr)
    sys.exit(1)


def terminate_process(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return

    process.terminate()

    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def is_backend_healthy() -> bool:
    try:
        with urllib.request.urlopen(f"{BACKEND_URL}/api/health", timeout=1.5) as response:
            return 200 <= response.status < 300
    except (urllib.error.URLError, TimeoutError):
        return False


def is_frontend_reachable() -> bool:
    try:
        with urllib.request.urlopen(FRONTEND_URL, timeout=1.5) as response:
            return 200 <= response.status < 500
    except (urllib.error.URLError, TimeoutError):
        return False


def main() -> int:
    ensure_command("npm")

    python_exec = find_python_executable()

    if not FRONTEND_DIR.exists():
        print("Frontend directory not found.", file=sys.stderr)
        return 1

    backend_cmd = [
        python_exec,
        "-m",
        "uvicorn",
        "backend.core.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
        "--reload",
    ]
    frontend_cmd = ["npm", "run", "dev"]

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    backend: subprocess.Popen | None = None
    frontend: subprocess.Popen | None = None

    if is_port_in_use(8000):
        if is_backend_healthy():
            print(f"Backend already running on {BACKEND_URL}; reusing it.")
        else:
            print(
                "Port 8000 is already in use, but it does not look like this app backend.\n"
                "Stop the other process on port 8000, or start the backend manually before retrying.",
                file=sys.stderr,
            )
            return 1
    else:
        print(f"Starting backend on {BACKEND_URL}")
        backend = subprocess.Popen(backend_cmd, cwd=ROOT, env=env)

    if is_port_in_use(3000):
        if is_frontend_reachable():
            print(f"Frontend already running on {FRONTEND_URL}; reusing it.")
        else:
            print(
                "Port 3000 is already in use, but no reachable frontend was found there.\n"
                "Stop the other process on port 3000, or open the existing service manually.",
                file=sys.stderr,
            )
            if backend is not None:
                terminate_process(backend)
            return 1
    else:
        print(f"Starting frontend on {FRONTEND_URL}")
        frontend = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR, env=env)

    if backend is None and frontend is None:
        print("Backend and frontend are already running.")
        print(f"Open {FRONTEND_URL}/home")
        return 0

    print("Press Ctrl+C to stop the servers started by this script.")

    def handle_shutdown(signum, frame):
        del signum, frame
        if frontend is not None:
            terminate_process(frontend)
        if backend is not None:
            terminate_process(backend)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    try:
        while True:
            backend_code = backend.poll() if backend is not None else None
            frontend_code = frontend.poll() if frontend is not None else None

            if backend_code is not None or frontend_code is not None:
                if frontend is not None:
                    terminate_process(frontend)
                if backend is not None:
                    terminate_process(backend)

                if backend_code not in (None, 0):
                    return backend_code

                if frontend_code not in (None, 0):
                    return frontend_code

                return 0

            time.sleep(0.5)
    finally:
        if frontend is not None:
            terminate_process(frontend)
        if backend is not None:
            terminate_process(backend)


if __name__ == "__main__":
    raise SystemExit(main())
