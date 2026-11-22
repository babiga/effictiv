"""Measure one successful unit of work on a Linux runner."""
import hashlib
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent


def process_group(group):
    ticks = rss = 0
    for entry in Path("/proc").glob("[0-9]*/stat"):
        try:
            fields = entry.read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) == group:
                ticks += sum(int(value) for value in fields[11:15])
                rss += int(fields[21]) * os.sysconf("SC_PAGE_SIZE")
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            continue
    return ticks / os.sysconf("SC_CLK_TCK"), rss


def terminate_group(process):
    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.killpg(process.pid, sig)
        except ProcessLookupError:
            break
        time.sleep(0.04)
    process.wait()


def run_batch(s):
    with tempfile.TemporaryFile() as output:
        start = time.monotonic()
        proc = subprocess.Popen(["bash", "-ec", s["command"]], stdout=output, stderr=sys.stderr, start_new_session=True)
        try:
            while True:
                pid, status, usage = os.wait4(proc.pid, os.WNOHANG)
                if pid:
                    proc.returncode = os.waitstatus_to_exitcode(status)
                    break
                if time.monotonic() - start > 90:
                    raise ValueError("Batch timed out.")
                time.sleep(0.005)
            elapsed = (time.monotonic() - start) * 1000
            output.seek(0)
            if proc.returncode or hashlib.file_digest(output, "sha256").hexdigest() != s["expectedSha256"]:
                raise ValueError("Command exit status or output digest failed.")
            return {"sample": {"completed": s["units"], "failed": 0, "elapsedMs": elapsed,
                    "cpuSeconds": usage.ru_utime + usage.ru_stime, "peakRssBytes": usage.ru_maxrss * 1024}}
        finally:
            terminate_group(proc)


def run_service(s, audit):
    url = urlparse(s["url"])
    server = subprocess.Popen(["bash", "-ec", s["server"]], stdout=sys.stderr, start_new_session=True)
    try:
        for _ in range(300):
            if server.poll() is not None:
                raise ValueError("Benchmark server exited before readiness.")
            try:
                with socket.create_connection((url.hostname, url.port or 80), timeout=0.1):
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise ValueError("Server did not become ready.")
        if s["kind"] == "page":
            result = subprocess.run(["node", HERE / "page.mjs"], input=json.dumps({"scenario": s, "audit": audit}),
                                    capture_output=True, text=True, timeout=100)
            if result.returncode:
                print(result.stderr[-2000:], file=sys.stderr)
                raise ValueError("Browser assertion or page audit failed.")
            return json.loads(result.stdout)
        env = {**os.environ, "BENCH_URL": s["url"], "REQUEST_COUNT": str(s["requests"]),
               "EXPECTED_DIGEST": s["expectedSha256"], "K6_NO_USAGE_REPORT": "true"}
        args = ["k6", "run", "--quiet", "--no-color", HERE / "http.k6.js"]
        before, peak = process_group(server.pid)
        start = time.monotonic()
        with subprocess.Popen(args, stdout=subprocess.PIPE, text=True, env=env) as client:
            while client.poll() is None:
                if time.monotonic() - start > 90:
                    client.kill()
                    raise ValueError("HTTP benchmark timed out.")
                _, rss = process_group(server.pid)
                peak = max(peak, rss)
                time.sleep(0.02)
            raw = client.stdout.read()
            if client.returncode:
                raise ValueError("HTTP load driver failed.")
        elapsed = (time.monotonic() - start) * 1000
        after, rss = process_group(server.pid)
        result = json.loads(raw)
        if server.poll() is not None or result["completed"] != s["requests"]:
            raise ValueError("HTTP status, response digest or request count failed.")
        return {"sample": {"completed": result["completed"], "failed": 0, "transferBytes": result["bytes"],
                "cpuSeconds": max(0, after - before), "elapsedMs": elapsed, "p95Ms": result["p95Ms"],
                "peakRssBytes": max(peak, rss)}}
    finally:
        terminate_group(server)


if __name__ == "__main__":
    request = json.load(sys.stdin)
    s = request["scenario"]
    try:
        print(json.dumps(run_batch(s) if s["kind"] == "command" else run_service(s, request["audit"])))
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
