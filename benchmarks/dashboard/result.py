"""Keep the native collector log and write a small, versioned result beside it."""

import ast
import hashlib
import json
import os
import platform
import re
import sys
from pathlib import Path


def hardware():
    cpu_info = Path("/proc/cpuinfo").read_text()
    model = re.search(r"^model name\s*:\s*(.+)$", cpu_info, re.MULTILINE)
    return {
        "architecture": platform.machine(),
        "cpuModel": model.group(1) if model else None,
        "logicalCpusAvailable": len(os.sched_getaffinity(0)),
        "kernelRelease": platform.release(),
        "raplMsrDevicePresent": Path("/dev/cpu/0/msr").is_char_device(),
    }


def energy_result(lines, phase, mode, exit_status):
    result = {
        "status": "unavailable",
        "metric": "cpu_energy_rapl_msr_component",
        "phase": phase,
        "readings": [],
    }
    if exit_status:
        return {**result, "reason": "Collector or workload failed. See the source log."}
    if mode == "smoke":
        return {**result, "reason": "Energy collection is disabled in functional mode."}
    if mode == "no-msr":
        return {**result, "reason": "The runner exposes no /dev/cpu/0/msr device."}

    header = f"Data for phase {phase}"
    rows = []
    duration_us = None
    if header in lines:
        for line in lines[lines.index(header) + 1:]:
            if not line.startswith("("):
                break
            metric, detail, value, kind, unit = ast.literal_eval(line)
            if (metric, detail, kind, unit) == ("phase_time_syscall_system", "[SYSTEM]", "TOTAL", "us"):
                duration_us = value
            if metric == result["metric"] and kind == "TOTAL":
                if not re.fullmatch(r"Package_\d+", detail) or unit != "uJ" or type(value) is not int or value < 0:
                    raise ValueError(f"Unexpected RAPL reading: {line}")
                rows.append({"domain": detail, "value": value, "unit": unit})

    if not rows:
        return {**result, "reason": "GMT returned no CPU package RAPL totals for this phase."}
    if len({row["domain"] for row in rows}) != len(rows):
        raise ValueError("Duplicate CPU package totals for the measurement phase")
    return {
        **result,
        "status": "available",
        "phaseDurationUs": duration_us,
        "coverage": "Host CPU packages, including Chromium and Next.js CPU activity",
        "readings": sorted(rows, key=lambda row: row["domain"]),
    }


def main(log_path, commit, path, expected_count, status, mode, gmt_commit, phase):
    log = Path(log_path)
    raw = log.read_bytes()
    lines = raw.decode("utf-8", errors="replace").splitlines()
    summaries = [json.loads(line.removeprefix("EFFICTIV_VISITS "))
                 for line in lines if line.startswith("EFFICTIV_VISITS ")]
    if len(summaries) > 1:
        raise ValueError("Expected one browser summary per collector run")
    visits = summaries[0] if summaries else None
    passed = (status == "0" and visits is not None and visits["scenario"] == f"dashboard-{path}"
              and visits["assertion"] == "passed" and visits["failedVisits"] == 0
              and visits["completedVisits"] == int(expected_count))
    gmt_run = re.search(r"/stats\.html\?id=([0-9a-f-]{36})\b", "\n".join(lines))
    if passed and mode == "rapl" and gmt_run is None:
        raise ValueError("GMT finished without reporting a source run ID")

    artifact = {
        "schemaVersion": 1,
        "commitSha": commit,
        "scenario": f"dashboard-{path}",
        "functionalUnit": "one completed dashboard visit",
        "assertion": "passed" if passed else "failed",
        "hardware": hardware(),
        "collector": ({"name": "Playwright", "version": "1.58.2"} if mode == "smoke"
                      else {"name": "Green Metrics Tool", "version": "4.2", "commit": gmt_commit}),
        "sourceRunId": gmt_run.group(1) if gmt_run else None,
        "sourceLog": {"name": log.name, "sha256": hashlib.sha256(raw).hexdigest()},
        "workload": visits,
        "energy": energy_result(lines, phase, mode, not passed),
    }
    destination = log.with_suffix(".json")
    destination.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"{destination}: {artifact['assertion']}, energy {artifact['energy']['status']}")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
