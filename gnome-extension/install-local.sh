#!/usr/bin/env bash
set -euo pipefail

UUID="baspark-desktop@baspark"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/${UUID}"
DST_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

# 功能：将源码目录完整同步到本地扩展目录（包含 modules/、assets/、schemas/）。
# 参数：无（使用全局变量 SRC_DIR / DST_DIR）。
# 返回：无。
sync_extension_dir() {
  mkdir -p "${DST_DIR}"

  if command -v rsync >/dev/null 2>&1; then
    # 使用 --delete 清理旧文件，避免模块拆分后残留过时脚本。
    rsync -a --delete \
      --exclude '.git/' \
      --exclude '.DS_Store' \
      "${SRC_DIR}/" "${DST_DIR}/"
    return
  fi

  # rsync 不可用时，退化为“清空后复制”策略。
  find "${DST_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "${SRC_DIR}/." "${DST_DIR}/"
}

# 功能：编译 GSettings schema，保证设置项可被扩展读取。
# 参数：无（使用全局变量 DST_DIR）。
# 返回：无。
compile_schemas_if_needed() {
  if [[ ! -d "${DST_DIR}/schemas" ]]; then
    return
  fi

  if command -v glib-compile-schemas >/dev/null 2>&1; then
    glib-compile-schemas "${DST_DIR}/schemas"
  else
    echo "Warning: glib-compile-schemas not found, settings schema not compiled."
  fi
}

# 功能：尝试重载扩展，使当前会话尽快使用新版本。
# 参数：无（使用全局变量 UUID）。
# 返回：无。
reload_extension_if_possible() {
  if ! command -v gnome-extensions >/dev/null 2>&1; then
    echo "Extension copied to ${DST_DIR}."
    echo "Install gnome-extensions CLI to enable from terminal."
    return
  fi

  if gnome-extensions info "${UUID}" >/dev/null 2>&1; then
    gnome-extensions disable "${UUID}" >/dev/null 2>&1 || true
    gnome-extensions enable "${UUID}" >/dev/null 2>&1 || true
    echo "Extension copied to ${DST_DIR} and enable command was issued."
  else
    echo "Extension copied to ${DST_DIR}."
    echo "GNOME Shell has not recognized this extension in the current session yet."
    echo "Please log out and log back in, then run: gnome-extensions enable ${UUID}"
  fi
}

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "Source extension folder not found: ${SRC_DIR}" >&2
  exit 1
fi

sync_extension_dir
compile_schemas_if_needed
reload_extension_if_possible

echo "Wayland note: GNOME Shell caches extension modules in-session."
echo "After code changes, disable/enable may still run old JS."
echo "Please log out and log back in to guarantee new code is loaded."
