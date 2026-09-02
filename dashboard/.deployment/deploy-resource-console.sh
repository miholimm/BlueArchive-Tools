#!/usr/bin/env bash
set -Eeuo pipefail

release_id=${1:?release ID is required}
archive=${2:?release archive path is required}
archive_sha256=${3:?release archive SHA-256 is required}
nginx_config=${4:?Nginx configuration path is required}
nginx_sha256=${5:?Nginx configuration SHA-256 is required}
current_config_sha256=${6:?current Nginx configuration SHA-256 is required}

app_root=/opt/blue-archive
release_root=$app_root/resource-console-releases
current_link=$app_root/resource-console
site_config=/etc/nginx/sites-available/hh.flha.ru
backup_root=$app_root/resource-console-backups
stage=
previous_target=
config_backup=
switched=0

cleanup() {
    if [ -n "$stage" ] && [ -d "$stage" ]; then
        rm -rf "$stage"
    fi
}

rollback() {
    status=$?
    if [ "$switched" -eq 1 ]; then
        if [ -n "$previous_target" ]; then
            ln -sfn "$previous_target" "$current_link"
        else
            rm -f "$current_link"
        fi
    fi
    if [ -n "$config_backup" ] && [ -f "$config_backup" ]; then
        cp "$config_backup" "$site_config"
    fi
    nginx -t >/dev/null 2>&1 && systemctl reload nginx >/dev/null 2>&1 || true
    exit "$status"
}

trap cleanup EXIT
trap rollback ERR

test -d "$app_root"
test -f "$archive"
test -f "$nginx_config"
test "$(sha256sum "$site_config" | awk '{print $1}')" = "$current_config_sha256"
test "$(sha256sum "$archive" | awk '{print $1}')" = "$archive_sha256"
test "$(sha256sum "$nginx_config" | awk '{print $1}')" = "$nginx_sha256"

mkdir -p "$release_root" "$backup_root"
stage=$(mktemp -d "$release_root/.stage.XXXXXX")
tar -xzf "$archive" -C "$stage"
test -f "$stage/index.html"
test -d "$stage/assets"
chmod -R a+rX "$stage"

release_dir=$release_root/$release_id
test ! -e "$release_dir"
mv "$stage" "$release_dir"
stage=

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
config_backup=$backup_root/hh.flha.ru.$timestamp.conf
cp "$site_config" "$config_backup"
cp "$nginx_config" "$site_config"

if [ -L "$current_link" ]; then
    previous_target=$(readlink -f "$current_link" || true)
elif [ -e "$current_link" ]; then
    printf '%s is not a symbolic link; refusing to replace it.\n' "$current_link" >&2
    exit 1
fi

ln -sfn "$release_dir" "$current_link"
switched=1
nginx -t
systemctl reload nginx

printf 'release=%s\n' "$release_id"
printf 'release_dir=%s\n' "$release_dir"
printf 'config_backup=%s\n' "$config_backup"
