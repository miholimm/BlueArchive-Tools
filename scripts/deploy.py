import os
import sys
import time
import hashlib
import paramiko

import tarfile

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RELEASE_ID = sys.argv[1] if len(sys.argv) > 1 else time.strftime("%Y%m%dT%H%M%S")
LOCAL_ARCHIVE = os.path.join(os.environ.get("TEMP", r"C:\Users\flhan\AppData\Local\Temp"), f"blue-archive-hh-release-{RELEASE_ID}.tar.gz")
REMOTE_ARCHIVE = f"/tmp/blue-archive-hh-release-{RELEASE_ID}.tar.gz"
REMOTE_RELEASE_DIR = f"/opt/blue-archive-hh/releases/{RELEASE_ID}"

def filter_fn(tarinfo):
    parts = tarinfo.name.split('/')
    if any(p in ['node_modules', '.git', 'downloads', 'temp', 'tools', '__pycache__', '.playwright-cli'] for p in parts):
        return None
    if tarinfo.name.endswith('.log') or tarinfo.name.endswith('.tmp'):
        return None
    return tarinfo

print(f"Release ID: {RELEASE_ID}")
print("Packaging release archive...")
t0 = time.time()
with tarfile.open(LOCAL_ARCHIVE, "w:gz") as tar:
    for item in ['dist', 'dashboard', 'package.json', 'pnpm-lock.yaml', 'server', 'src', 'vendor']:
        p = os.path.join(BASE_DIR, item)
        if os.path.exists(p):
            tar.add(p, arcname=f"./{item}", filter=filter_fn)

size = os.path.getsize(LOCAL_ARCHIVE)
print(f"Archive packaged: {LOCAL_ARCHIVE} ({size / (1024*1024):.2f} MB) in {time.time()-t0:.2f}s")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("Connecting to 218.11.5.75...")
for attempt in range(5):
    try:
        time.sleep(2)
        client.connect('218.11.5.75', username='root', password='wZzhJ9Q.zFBc8@5', look_for_keys=False, allow_agent=False, banner_timeout=15)
        print("Connected to 218.11.5.75!")
        break
    except Exception as e:
        if attempt == 4:
            raise
        print(f"SSH connect attempt {attempt+1} failed ({e}), retrying in 3s...")
        time.sleep(3)

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

local_glossary = os.path.join(os.path.dirname(__file__), "..", "server", "data", "glossary.json")
remote_glossary = "/opt/blue-archive-hh/shared/data/glossary.json"
if os.path.exists(local_glossary):
    print(f"Uploading {local_glossary} to {remote_glossary} ...")
    sftp.put(local_glossary, remote_glossary)
    print("Remote shared glossary.json updated successfully.")

def put_with_progress(local_p, remote_p, name):
    try:
        r_stat = sftp.stat(remote_p)
        if r_stat.st_size == os.path.getsize(local_p):
            print(f"Remote {name} is already up to date ({r_stat.st_size} bytes). Skipping.")
            return
    except IOError:
        pass
    print(f"Uploading {name} ({os.path.getsize(local_p) / (1024*1024):.1f} MB) to {remote_p} ...")
    p_start = time.time()
    def p_cb(transferred, total):
        pct = (transferred / total) * 100
        if transferred == total or (int(pct) % 20 == 0 and int(pct) > 0):
            mb = transferred / (1024*1024)
            total_mb = total / (1024*1024)
            el = time.time() - p_start
            sp = mb / el if el > 0 else 0
            sys.stdout.write(f"\r{name}: {pct:.1f}% ({mb:.1f}/{total_mb:.1f} MB) @ {sp:.2f} MB/s")
            sys.stdout.flush()
    sftp.put(local_p, remote_p, callback=p_cb)
    print(f"\n{name} updated successfully in {time.time()-p_start:.1f}s.")

local_launcher = os.path.join(os.path.dirname(__file__), "..", "downloads", "jp", "BlueArchive_PC_CN_Launcher.exe")
remote_launcher = "/opt/blue-archive-hh/shared/downloads/jp/BlueArchive_PC_CN_Launcher.exe"
if os.path.exists(local_launcher):
    put_with_progress(local_launcher, remote_launcher, "BlueArchive_PC_CN_Launcher.exe")

local_patch = os.path.join(os.path.dirname(__file__), "..", "downloads", "jp", "BlueArchive_JP_CN_Patch_JP1.73.459696.zip")
remote_patch = "/opt/blue-archive-hh/shared/downloads/jp/BlueArchive_JP_CN_Patch_JP1.73.459696.zip"
if os.path.exists(local_patch):
    put_with_progress(local_patch, remote_patch, "BlueArchive_JP_CN_Patch_JP1.73.459696.zip")

local_res = os.path.join(os.path.dirname(__file__), "..", "downloads", "jp", "resources.assets")
remote_res = "/opt/blue-archive-hh/shared/downloads/jp/resources.assets"
if os.path.exists(local_res):
    put_with_progress(local_res, remote_res, "resources.assets")

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
run_cmd("chown bluearchive-hh:bluearchive-hh /opt/blue-archive-hh/shared/data/glossary.json && chmod 666 /opt/blue-archive-hh/shared/data/glossary.json")

print("Switching current symlink to new release...")
run_cmd(f"ln -sfn {REMOTE_RELEASE_DIR} /opt/blue-archive-hh/current")

print("Restarting blue-archive-hh.service...")
run_cmd("systemctl restart blue-archive-hh.service")
status = run_cmd("systemctl is-active blue-archive-hh.service")
print(f"Service status: {status}")

print("Cleaning up remote archive...")
run_cmd(f"rm -f {REMOTE_ARCHIVE}")

print("Auto cleaning up old releases to protect server disk space...")
run_cmd('''python3 -c "
import os, shutil
releases_dir = '/opt/blue-archive-hh/releases'
current_link = '/opt/blue-archive-hh/current'
curr = os.path.basename(os.path.realpath(current_link))
all_rels = sorted([d for d in os.listdir(releases_dir) if os.path.isdir(os.path.join(releases_dir, d))], reverse=True)
protected = {curr, '20260914T024649'}
for r in all_rels[:2]:
    protected.add(r)
for r in all_rels:
    if r not in protected:
        p = os.path.join(releases_dir, r)
        print('Pruning old release:', p)
        shutil.rmtree(p, ignore_errors=True)
"''')
print("Current server disk status:")
run_cmd("df -h /")

print("Checking remote HTTP response...")
http_check = "000"
for i in range(5):
    time.sleep(2)
    http_check = run_cmd("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/")
    if http_check == "200":
        break
print(f"Local HTTP Status: {http_check}")

client.close()
print("Deployment successful!")
