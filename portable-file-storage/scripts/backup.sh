#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
backup_dir="${FILE_STORAGE_BACKUP_DIR:-$root/backups}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
tar -czf "$backup_dir/file-storage-$stamp.tar.gz" -C "$root" storage
sha256sum "$backup_dir/file-storage-$stamp.tar.gz" > "$backup_dir/file-storage-$stamp.tar.gz.sha256"
printf '%s\n' "$backup_dir/file-storage-$stamp.tar.gz"
