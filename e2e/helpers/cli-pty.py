"""Real CLI: stdout stays a pipe, stderr owns a PTY (macOS and Linux CI)."""
import errno
import fcntl
import json
import os
import pty
import select
import signal
import struct
import subprocess
import sys
import termios
import time

options = json.load(sys.stdin)
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 24, options.get('columns', 120), 0, 0))


def session():
    os.setsid()
    fcntl.ioctl(slave, termios.TIOCSCTTY, 0)


child = subprocess.Popen(options['command'], cwd=options['cwd'], env=options['env'],
                         stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=slave,
                         preexec_fn=session)
os.close(slave)
stdout, stderr = bytearray(), bytearray()
streams = {master: stderr, child.stdout.fileno(): stdout}
deadline = time.monotonic() + options.get('timeout', 30)
interrupted = False
try:
    while streams:
        if time.monotonic() > deadline:
            raise TimeoutError('CLI PTY timed out')
        ready, _, _ = select.select(list(streams), [], [], 0.1)
        for fd in ready:
            try:
                data = os.read(fd, 65536)
            except OSError as error:
                if error.errno != errno.EIO:
                    raise
                data = b''
            if data:
                streams[fd].extend(data)
            else:
                del streams[fd]
        match = options.get('interruptOn')
        if match and not interrupted and match.encode() in stderr:
            os.killpg(child.pid, signal.SIGINT)
            interrupted = True
    status = child.wait(timeout=5)
    print(json.dumps({'stdout': stdout.decode(), 'stderr': stderr.decode(), 'status': status}))
finally:
    if child.poll() is None:
        os.killpg(child.pid, signal.SIGKILL)
        child.wait()
    os.close(master)
