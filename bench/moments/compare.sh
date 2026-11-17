#!/bin/sh
# Two plumber builds against the same apps, alternating, on one machine (written for vm-agent).
#   sh bench/moments/compare.sh <base plumber dir> <head plumber dir> <rounds> <results dir> <app dir>...
# Each app's @unlocalhosted/react-plumber link is pointed at one build, then the other; the run order flips every
# round so neither build always runs on a warmer machine. Only processes started from these app folders are stopped.
set -u
BASE=$1; HEAD=$2; ROUNDS=$3; OUT=$4; shift 4
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"
stop_app() { for p in $(pgrep -u "$(id -u)" -x node) $(pgrep -u "$(id -u)" -x esbuild) $(pgrep -u "$(id -u)" workerd); do case "$(readlink /proc/$p/cwd)" in "$1"*) kill "$p" 2>/dev/null;; esac; done; sleep 2; }
link() { rm -f "$1/node_modules/@unlocalhosted/react-plumber"; ln -s "$2" "$1/node_modules/@unlocalhosted/react-plumber"; }
for APP in "$@"; do
  NAME=$(basename "$APP")
  stop_app "$APP"
  # the page, captured once with the head build, as the blueprint reader sees it
  if [ ! -s "$OUT/$NAME.page.json" ]; then
    link "$APP" "$HEAD"
    (cd "$APP" && nohup ./node_modules/.bin/vite --port 5190 --strictPort > "$OUT/$NAME.capture.log" 2>&1 &)
    for i in $(seq 1 300); do curl -s localhost:5190/__plumb/health | grep -q '"ready"' && break; sleep 1; done
    node "$HERE/capture.mjs" --url http://localhost:5190/ --out "$OUT/$NAME.page.json" >> "$OUT/$NAME.capture.log" 2>&1
    stop_app "$APP"
  fi
  EDIT=$(node -e "const p=JSON.parse(require('fs').readFileSync('$OUT/$NAME.page.json','utf8')); console.log(p.files[0][0])")
  for r in $(seq 1 "$ROUNDS"); do
    if [ $((r % 2)) -eq 1 ]; then ORDER="base head"; else ORDER="head base"; fi
    for B in $ORDER; do
      if [ "$B" = base ]; then DIR=$BASE; else DIR=$HEAD; fi
      link "$APP" "$DIR"
      systemd-run --user --scope -q -p MemoryMax=7000M -p MemorySwapMax=0 \
        node "$HERE/run.mjs" --app "$APP" --page "$OUT/$NAME.page.json" --edit "$EDIT" --port 5191 --label "$B" --out "$OUT/$NAME.$B.$r.json" > "$OUT/$NAME.$B.$r.log" 2>&1
      stop_app "$APP"
    done
  done
  link "$APP" "$HEAD"
done
node "$HERE/summarize.mjs" "$OUT" > "$OUT/summary.txt"
echo done > "$OUT/done"
