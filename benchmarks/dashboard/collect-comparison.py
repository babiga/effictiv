"""Run the pinned GMT collector from a trusted, disposable RAPL host."""

import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import tempfile

import result

GMT_COMMIT = "7f11a4309dd1d26f5bb8e97e561ef3a65c1a61d2"
PHASE = "Dashboard visits"
APP = "effictiv-comparison-app"
BROWSER = "effictiv-comparison-browser"
ROOT = Path(__file__).resolve().parents[2]
BENCHMARK = Path(__file__).resolve().parent
RUN_FLAGS = ("--detach", "--init", "--cap-drop=ALL", "--security-opt=no-new-privileges",
             "--pids-limit=512", "--log-driver=none")
APP_PATHS = ("app", "components", "hooks", "lib", "public", "package.json", "package-lock.json",
             "next.config.ts", "postcss.config.mjs", "tsconfig.json")


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def capture_output(*args, **kwargs):
    return run(*args, stdout=subprocess.PIPE, **kwargs).stdout


def build(commit, date, directory):
    directory.mkdir()
    with tempfile.TemporaryFile() as archive:
        run("git", "archive", commit, *APP_PATHS, cwd=ROOT, stdout=archive)
        archive.seek(0)
        run("tar", "--extract", "--directory", str(directory), stdin=archive)
    image = f"{APP}:{commit}"
    run("docker", "build", "--target", "application", "--file", str(BENCHMARK / "comparison.Dockerfile"),
        "--tag", image, "--build-arg", f"FIXTURE_DATE={date}", str(directory),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=1200)
    return image


def build_browser(directory):
    directory.mkdir()
    for name in ("package.json", "package-lock.json", "fixture.json", "visit.mjs"):
        (directory / name).write_bytes((BENCHMARK / name).read_bytes())
    run("docker", "build", "--target", "browser", "--file", str(BENCHMARK / "comparison.Dockerfile"),
        "--tag", BROWSER, str(directory), timeout=1200)


def source_log(raw, summary):
    """Retain only native CPU phase rows and the trusted browser's visit summary."""
    lines = raw.splitlines()
    match = re.search(r"/stats\.html\?id=([0-9a-f-]{36})\b", raw)
    kept = [f"GMT source run /stats.html?id={match[1]}"] if match else []
    header = f"Data for phase {PHASE}"
    if header in lines:
        kept.append(header)
        for line in lines[lines.index(header) + 1:]:
            if not line.startswith("("):
                break
            metric, domain, value, kind, unit = ast.literal_eval(line)
            is_package = (metric == "cpu_energy_rapl_msr_component" and re.fullmatch(r"Package_\d{1,2}", domain)
                          and kind == "TOTAL" and unit == "uJ")
            is_duration = (metric, domain, kind, unit) == ("phase_time_syscall_system", "[SYSTEM]", "TOTAL", "us")
            if (is_package or is_duration) and type(value) is int and 0 <= value < 2 ** 53:
                kept.append(repr((metric, domain, value, kind, unit)))
        kept.append("")
    kept.append("EFFICTIV_VISITS " + json.dumps(summary, separators=(",", ":")))
    return "\n".join(kept) + "\n"


def collect(gmt, image, commit, fixture_digest, path, directory):
    if image is None:
        return None

    directory.mkdir()
    try:
        run("docker", "run", *RUN_FLAGS, "--network=none", "--name", APP, image,
            stdout=subprocess.DEVNULL, timeout=30)
        run("docker", "run", *RUN_FLAGS, f"--network=container:{APP}", "--shm-size=1g", "--name", BROWSER,
            "--env", f"EFFICTIV_BENCHMARK_MOCK_DATA_SHA256={fixture_digest}", BROWSER,
            stdout=subprocess.DEVNULL, timeout=30)
        run("docker", "exec", BROWSER, "node", "/harness/visit.mjs", "wait",
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=40)
        command = [os.environ.get("GMT_PYTHON", str(gmt / "venv/bin/python")), "runner.py",
                   "--uri", str(ROOT), "--filename", "benchmarks/dashboard/comparison_scenario.yml",
                   "--variable", f"__GMT_VAR_PATH__={path}", "--skip-optimizations",
                   "--print-phase-stats", PHASE]
        with tempfile.TemporaryFile() as raw:
            status = subprocess.run(command, cwd=gmt, stdout=raw, stderr=subprocess.STDOUT, timeout=600).returncode
            raw.seek(0)
            native = raw.read(4 * 1024 * 1024 + 1)
        if len(native) > 4 * 1024 * 1024:
            raise ValueError("GMT output exceeded the collection budget")

        summary_file = directory / "visits.json"
        run("docker", "cp", f"{BROWSER}:/tmp/effictiv-visits.json", str(summary_file),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
        if summary_file.stat().st_size > 32 * 1024:
            raise ValueError("Browser summary exceeded the collection budget")
        summary = json.loads(summary_file.read_text())
        log_file = directory / f"{path}.log"
        log = source_log(native.decode("utf8", errors="replace"), summary)
        log_file.write_text(log)
        result.main(str(log_file), commit, path, "30", str(status), "rapl", GMT_COMMIT, PHASE)
        return {"result": json.loads(log_file.with_suffix(".json").read_text()), "log": log}
    except (OSError, ValueError, SyntaxError, subprocess.SubprocessError) as error:
        print(f"{path} measurement unavailable ({type(error).__name__})", flush=True)
        return None
    finally:
        subprocess.run(("docker", "rm", "-f", BROWSER, APP), stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=30, check=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("baseline")
    parser.add_argument("candidate")
    parser.add_argument("workflow_run")
    parser.add_argument("attempt", type=int)
    parser.add_argument("pull_request", type=int)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    gmt = Path(os.environ["GMT_DIR"]).resolve(strict=True)
    if platform.system() != "Linux" or platform.machine() != "x86_64" or not Path("/dev/cpu/0/msr").is_char_device():
        parser.error("A dedicated Linux x86-64 runner with RAPL MSRs is required.")
    if (capture_output("git", "rev-parse", "HEAD", cwd=gmt).decode().strip() != GMT_COMMIT
            or capture_output("git", "diff", "HEAD", "--name-only", cwd=gmt)):
        parser.error("Use the pinned GMT v4.2 checkout with no tracked changes.")
    if capture_output("git", "status", "--porcelain", cwd=ROOT):
        parser.error("Use a clean checkout of the trusted harness.")
    if (not re.fullmatch(r"[1-9]\d{0,18}", args.workflow_run) or args.attempt < 1 or args.pull_request < 1
            or any(not re.fullmatch(r"[a-f0-9]{40}", sha) for sha in (args.baseline, args.candidate))):
        parser.error("Expected full commit SHAs and positive GitHub workflow identifiers.")

    date = json.loads((BENCHMARK / "fixture.json").read_text())["date"]
    scenarios = []
    with tempfile.TemporaryDirectory(prefix="effictiv-comparison-") as temporary:
        directory = Path(temporary)
        build_browser(directory / "browser")
        images = {}
        digests = {}
        for sha in dict.fromkeys((args.baseline, args.candidate)):
            try:
                digests[sha] = hashlib.sha256(capture_output("git", "show", f"{sha}:lib/mockData.ts", cwd=ROOT)).hexdigest()
                images[sha] = build(sha, date, directory / sha)
            except (OSError, subprocess.SubprocessError) as error:
                print(f"App build unavailable for {sha} ({type(error).__name__})", flush=True)
                images[sha] = None

        for path in ("landing", "scroll"):
            scenario = {"scenario": f"dashboard-{path}"}
            for kind, candidate in (("calibration", args.baseline), ("comparison", args.candidate)):
                pairs = []
                for ordinal in range(1, 7):
                    commits = {"baseline": args.baseline, "candidate": candidate}
                    order = ("baseline", "candidate") if ordinal % 2 else ("candidate", "baseline")
                    pair = {}
                    for side in order:
                        sha = commits[side]
                        print(f"{path} {kind} {ordinal} {side}", flush=True)
                        pair[side] = collect(gmt, images[sha], sha, digests.get(sha), path,
                                             directory / f"{path}-{kind}-{ordinal}-{side}")
                    pairs.append(pair)
                scenario[kind] = pairs
            scenarios.append(scenario)

    artifact = {"version": 1, "repositoryId": "1306723014", "workflowRunId": args.workflow_run,
                "attempt": args.attempt, "pullRequest": args.pull_request, "baselineSha": args.baseline,
                "candidateSha": args.candidate, "runnerId": f"run-{args.workflow_run}-attempt-{args.attempt}",
                "scenarios": scenarios}
    encoded = json.dumps(artifact, separators=(",", ":"), ensure_ascii=False).encode()
    if len(encoded) > 4 * 1024 * 1024:
        parser.error("The generated comparison exceeds the upload limit.")
    args.destination.write_bytes(encoded)


if __name__ == "__main__":
    main()
