"""Real CLI with a terminal for stdin and stdout, answering each question when it appears."""
import json
import os
import pty
import select
import subprocess
import sys
import time

options = json.load(sys.stdin)
master, slave = pty.openpty()
child = subprocess.Popen(options['command'], cwd=options['cwd'], env=options['env'], stdin=slave, stdout=slave, stderr=subprocess.PIPE, preexec_fn=os.setsid)
os.close(slave)
out = bytearray()
answers = list(options['answers'])
asked = 0
deadline = time.monotonic() + options.get('timeout', 60)
while True:
    if time.monotonic() > deadline:
        child.kill()
        raise TimeoutError('CLI PTY timed out')
    ready, _, _ = select.select([master], [], [], 0.1)
    if ready:
        try:
            data = os.read(master, 65536)
        except OSError:
            break
        if not data:
            break
        out.extend(data)
        while answers and out.count(b'Enter: yes') > asked:
            asked += 1
            os.write(master, (answers.pop(0) + '\n').encode())
    elif child.poll() is not None:
        break
status = child.wait(timeout=10)
print(json.dumps({'stdout': out.decode(errors='replace'), 'stderr': child.stderr.read().decode(), 'status': status}))
