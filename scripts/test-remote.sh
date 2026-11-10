#!/bin/sh
# The full suite on the quiet machine, in one command (docs/briefs/test-system.md, layer 5).
#
#   scripts/test-remote.sh                 this branch's last commit, every file
#   scripts/test-remote.sh browser         arguments go to scripts/test.mjs on the other side
#   PLUMB_TEST_HOST=other scripts/test-remote.sh
#
# Sends the commit with its history (some tests read git), installs when the lockfile changed, builds, runs, and
# brings the log and the per-file logs back to .test-logs-remote/. Uncommitted changes are not sent.
set -eu
host=${PLUMB_TEST_HOST:-vm-agent}
# the checkout's folder is named plumb: a test reads the project's folder name in a message
dir=projects/ci/plumb
ssh_="ssh -o RemoteCommand=none -o RequestTTY=no -o BatchMode=yes $host"
root=$(git rev-parse --show-toplevel)
branch=$(git rev-parse --abbrev-ref HEAD)
sha=$(git rev-parse HEAD)
[ -z "$(git status --porcelain --untracked-files=no)" ] || echo "Note: uncommitted changes are not sent; running $sha."

bundle=$(mktemp -t plumb-bundle.XXXXXX)
trap 'rm -f "$bundle"' EXIT
git bundle create "$bundle" "refs/heads/$branch" refs/remotes/origin/main >/dev/null 2>&1
scp -q -o BatchMode=yes "$bundle" "$host:projects/plumb.bundle"

# The remote side is a script file, never an inline command: an inline `pkill -f` matches its own shell.
$ssh_ "cat > projects/plumb-run.sh" <<'REMOTE'
#!/bin/sh
set -eu
branch=$1; sha=$2; shift 2
mkdir -p ~/projects/ci
cd ~/projects/ci
[ -d plumb/.git ] || git clone -q ../plumb.bundle plumb 2>/dev/null || { git init -q plumb; }
cd plumb
if [ -f test.pid ] && kill -0 "$(cat test.pid)" 2>/dev/null; then echo "A run is already going here (pid $(cat test.pid)). Stop it first."; exit 3; fi
before=$(sha1sum package-lock.json 2>/dev/null || true)
git fetch -q ../../plumb.bundle "+refs/heads/$branch:refs/remotes/bundle/$branch"
# this checkout is only ever a copy of a commit: whatever an install left changed in it is dropped
git reset -q --hard
git checkout -q --detach "$sha"
[ -d node_modules ] && [ "$before" = "$(sha1sum package-lock.json)" ] || npm ci > ci.log 2>&1
npm run build > build.log 2>&1
# the two folders with dependencies of their own, as CI installs them; without them their tests cannot start
[ ! -f site/package.json ] || [ -d site/node_modules ] || npm ci --prefix site > site-ci.log 2>&1 || true
[ ! -f overlay/showcase/package.json ] || [ -d overlay/showcase/node_modules ] || npm ci --prefix overlay/showcase > showcase-ci.log 2>&1 || true
rm -rf test.log test.exit mem.log
nohup sh -c 'while [ ! -f test.exit ]; do echo "$(date +%s) used_mb=$(free -m | awk "/Mem:/{print \$3}") chrome=$(pgrep -c -f chrom) load=$(cut -d" " -f1 /proc/loadavg)" >> mem.log; sleep 20; done' > /dev/null 2>&1 &
nohup sh -c 'node scripts/test.mjs "$@" > test.log 2>&1; echo $? > test.exit' sh "$@" > /dev/null 2>&1 &
echo $! > test.pid
REMOTE
$ssh_ "sh projects/plumb-run.sh '$branch' '$sha' $*"

echo "Running $sha on $host…"
# The run is detached over there: a dropped connection here loses nothing. Every step that talks to the box is tried
# again, and a result that could not be fetched is a failure of this script, never a pass.
ssh_="$ssh_ -o ConnectTimeout=20"
until $ssh_ "test -f $dir/test.exit" 2>/dev/null; do sleep 30; done
code=""
for try in 1 2 3 4 5 6; do code=$($ssh_ "cat $dir/test.exit" 2>/dev/null) && [ -n "$code" ] && break; sleep 10; done
[ -n "$code" ] || { echo "The run finished on $host but its result could not be fetched. Read it there: $dir/test.log"; exit 2; }
rm -rf "$root/.test-logs-remote"; mkdir -p "$root/.test-logs-remote"
fetched=""
for try in 1 2 3 4 5 6; do scp -q -r -o BatchMode=yes -o ConnectTimeout=20 "$host:$dir/test.log" "$host:$dir/mem.log" "$host:$dir/.test-logs" "$root/.test-logs-remote/" 2>/dev/null && fetched=1 && break; sleep 10; done
[ -n "$fetched" ] || { echo "The run exited $code on $host but its logs could not be fetched. Read them there: $dir/test.log"; exit 2; }
sed -n '/ runs in /,$p' "$root/.test-logs-remote/test.log"
echo "Peak memory: $(sed -E 's/.*used_mb=([0-9]+).*/\1/' "$root/.test-logs-remote/mem.log" | sort -n | tail -1) MB. Logs: .test-logs-remote/"
exit "$code"
