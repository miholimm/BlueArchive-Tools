import os
import sys
import time
import hashlib
import paramiko

RELEASE_ID = "20261009T151600"
LOCAL_ARCHIVE = os.path.join(os.environ.get("TEMP", r"C:\Users\flhan\AppData\Local\Temp"), f"blue-archive-hh-release-{RELEASE_ID}.tar.gz")
REMOTE_ARCHIVE = f"/tmp/blue-archive-hh-release-{RELEASE_ID}.tar.gz"
REMOTE_RELEASE_DIR = f"/opt/blue-archive-hh/releases/{RELEASE_ID}"

print(f"Checking local archive: {LOCAL_ARCHIVE}")
if not os.path.exists(LOCAL_ARCHIVE):
    print("Error: local archive does not exist!")
    sys.exit(1)

size = os.path.getsize(LOCAL_ARCHIVE)
print(f"Archive size: {size / (1024*1024):.2f} MB")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("Connecting to 218.11.5.75...")
client.connect('218.11.5.75', username='root', password='wZzhJ9Q.zFBc8@5')

print("Uploading archive via SFTP...")
sftp = client.open_sftp()

start_time = time.time()
def progress(transferred, total):
    pct = (transferred / total) * 100
    if transferred == total or (int(pct) % 20 == 0 and int(pct) > 0):
        mb = transferred / (1024*1024)
        total_mb = total / (1024*1024)
        elapsed = time.time() - start_time
        speed = mb / elapsed if elapsed > 0 else 0
        sys.stdout.write(f"\rProgress: {pct:.1f}% ({mb:.1f}/{total_mb:.1f} MB) @ {speed:.2f} MB/s")
        sys.stdout.flush()

sftp.put(LOCAL_ARCHIVE, REMOTE_ARCHIVE, callback=progress)
print("\nUpload complete.")
sftp.close()

def run_cmd(cmd):
    print(f">> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"STDOUT: {out}")
    if err:
        print(f"STDERR: {err}")
    code = stdout.channel.recv_exit_status()
    if code != 0:
        raise RuntimeError(f"Command failed with code {code}: {cmd}")
    return out

print("Extracting release on server...")
run_cmd(f"mkdir -p {REMOTE_RELEASE_DIR}")
run_cmd(f"tar -xzf {REMOTE_ARCHIVE} -C {REMOTE_RELEASE_DIR}")

print("Setting up symlinks and permissions...")
run_cmd(f"ln -sfn /opt/blue-archive-hh/releases/20260914T024649/node_modules {REMOTE_RELEASE_DIR}/node_modules")
run_cmd(f"ln -sfn /opt/blue-archive-hh/shared/downloads {REMOTE_RELEASE_DIR}/downloads")
run_cmd(f"ln -sfn /opt/blue-archive-hh/shared/downloads {REMOTE_RELEASE_DIR}/dist/downloads")
run_cmd(f"chown -R bluearchive-hh:bluearchive-hh {REMOTE_RELEASE_DIR}")
run_cmd(f"chmod -R 777 {REMOTE_RELEASE_DIR}")

print("Switching current symlink to new release...")
run_cmd(f"ln -sfn {REMOTE_RELEASE_DIR} /opt/blue-archive-hh/current")

print("Restarting blue-archive-hh.service...")
run_cmd("systemctl restart blue-archive-hh.service")
status = run_cmd("systemctl is-active blue-archive-hh.service")
print(f"Service status: {status}")

print("Cleaning up remote archive...")
run_cmd(f"rm -f {REMOTE_ARCHIVE}")

print("Checking remote HTTP response...")
http_check = run_cmd("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/")
print(f"Local HTTP Status: {http_check}")

client.close()
print("Deployment successful!")
