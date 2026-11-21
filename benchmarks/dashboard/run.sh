#!/usr/bin/env bash
set -euo pipefail

mode=${1:-}
output=${2:-}
count=${3:-30}
if [[ "$mode" == smoke ]]; then count=${3:-3}; fi
if [[ ! "$mode" =~ ^(gmt|smoke)$ || -z "$output" || ! "$count" =~ ^[1-9][0-9]{0,2}$ ]]; then
  echo 'Usage: run.sh (gmt|smoke) <new-output-directory> [visits per path, 1–999]' >&2
  exit 2
fi

scenario_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo=$(git -C "$scenario_dir" rev-parse --show-toplevel)
if [[ -n $(git -C "$repo" status --porcelain) ]]; then
  echo 'Use a clean checkout so the artifact identifies the exact benchmarked commit.' >&2
  exit 2
fi
if [[ $(uname -sm) != 'Linux x86_64' ]]; then
  echo 'The pinned benchmark image requires a native Linux x86_64 runner.' >&2
  exit 2
fi
commit=$(git -C "$repo" rev-parse HEAD)

gmt_version=7f11a4309dd1d26f5bb8e97e561ef3a65c1a61d2
phase='Dashboard visits'
sensor_mode=smoke
if [[ "$mode" == gmt ]]; then
  : "${GMT_DIR:?Set GMT_DIR to the installed Green Metrics Tool v4.2 checkout}"
  gmt_dir=$(cd -- "$GMT_DIR" && pwd)
  if [[ $(git -C "$gmt_dir" rev-parse HEAD) != "$gmt_version" || -n $(git -C "$gmt_dir" diff HEAD --name-only) ]]; then
    echo 'Use Green Metrics Tool v4.2 at the pinned commit with no tracked changes.' >&2
    exit 2
  fi
  sensor_mode=rapl
  if [[ ! -c /dev/cpu/0/msr ]]; then sensor_mode=no-msr; fi
fi

mkdir -- "$output"
output=$(cd -- "$output" && pwd)
image="effictiv-dashboard-benchmark:$commit"
if [[ "$mode" == smoke ]]; then
  docker build --file "$scenario_dir/Dockerfile" --tag "$image" "$repo"
fi

failed=0
for path in landing scroll; do
  log="$output/$path.log"
  status=0
  if [[ "$mode" == gmt ]]; then
    args=(--uri "$repo" --filename benchmarks/dashboard/usage_scenario.yml
      --variable "__GMT_VAR_PATH__=$path" --variable "__GMT_VAR_VISITS__=$count"
      --print-logs --skip-optimizations)
    if [[ "$sensor_mode" == rapl ]]; then
      args+=(--print-phase-stats "$phase")
    else
      args+=(--dev-no-save)
    fi
    (cd -- "$gmt_dir" && "${GMT_PYTHON:-$gmt_dir/venv/bin/python}" runner.py "${args[@]}") > "$log" 2>&1 || status=$?
  else
    docker run --rm --init --shm-size=1g --network none "$image" sh -ec '
      node node_modules/next/dist/bin/next start --hostname 127.0.0.1 &
      node benchmarks/dashboard/visit.mjs wait
      exec node benchmarks/dashboard/visit.mjs "$@"
    ' sh "$path" "$count" > "$log" 2>&1 || status=$?
  fi

  if ! python3 "$scenario_dir/result.py" "$log" "$commit" "$path" "$count" "$status" "$sensor_mode" "$gmt_version" "$phase"; then
    failed=1
  fi
done
exit "$failed"
