"""Read the pinned GMT runner's functional-unit assertion and CPU package totals."""
import ast
import json
import os
from pathlib import Path
import re
import subprocess
import sys

PIN = "7f11a4309dd1d26f5bb8e97e561ef3a65c1a61d2"


def capture(scenario):
    root = Path(os.environ["GMT_DIR"]).resolve()
    if subprocess.check_output(["git", "-C", root, "rev-parse", "HEAD"], text=True).strip() != PIN:
        raise ValueError("Green Metrics Tool v4.2 is required.")
    spec = scenario["gmt"]
    command = [os.environ.get("GMT_PYTHON", str(root / "venv/bin/python")), "runner.py",
               "--uri", str(Path.cwd()), "--filename", spec["file"], "--print-logs",
               "--skip-optimizations", "--print-phase-stats", spec["phase"]]
    log = subprocess.check_output(command, cwd=root, text=True, stderr=subprocess.STDOUT, timeout=300)
    return parse(log, scenario)


def parse(log, scenario):
    # The scenario prints the checksum of the actual output and the completed unit count.
    match = re.findall(r'^EFFICTIV_RESULT ([a-f0-9]{64}) ([1-9][0-9]*)$', log, re.M)
    if match != [(scenario["expectedSha256"], str(scenario["units"]))]:
        raise ValueError("GMT workload output or completed count differs.")
    lines = log.splitlines()
    start = lines.index("Data for phase " + scenario["gmt"]["phase"])
    packages = {}
    for line in lines[start + 1:]:
        if not line.startswith("("):
            break
        metric, domain, value, kind, unit = ast.literal_eval(line)
        if metric == "cpu_energy_rapl_msr_component" and kind == "TOTAL":
            if not re.fullmatch(r"Package_\d+", domain) or domain in packages or unit != "uJ" or type(value) != int or value < 0:
                raise ValueError("Unexpected RAPL package total.")
            packages[domain] = value
    if not packages:
        raise ValueError("GMT did not record CPU package energy.")
    return {"wh": sum(packages.values()) / 3_600_000_000, "domains": sorted(packages)}


if __name__ == "__main__":
    print(json.dumps(capture(json.load(sys.stdin))))
