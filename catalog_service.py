from __future__ import annotations

import hashlib
import json
import logging
import mimetypes
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from aiohttp import web
from server import PromptServer


LOGGER = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent
CATALOG_DIR = ROOT_DIR / "catalog"
LOCAL_CATALOG_PATH = CATALOG_DIR / "prompts.json"
PLACEHOLDER_PATH = "previews/placeholder.svg"

CATALOG_CACHE_TTL = 30
ASSET_CACHE_TTL = 120
MAX_ASSET_BYTES = 5 * 1024 * 1024
DEFAULT_SYNC_MODE = "remote_first"
SUPPORTED_SYNC_MODES = {"remote_first", "local_only", "remote_only"}

_CATALOG_CACHE: dict[str, dict[str, Any]] = {}
_ASSET_CACHE: dict[str, dict[str, Any]] = {}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "prompt-item"


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _read_git_origin_url() -> str:
    config_path = ROOT_DIR / ".git" / "config"
    if not config_path.exists():
        return ""

    in_origin = False
    for raw_line in config_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if line.startswith("["):
            in_origin = line == '[remote "origin"]'
            continue
        if in_origin and line.startswith("url"):
            _, _, value = line.partition("=")
            return value.strip()

    return ""


def _read_git_branch() -> str:
    head_path = ROOT_DIR / ".git" / "HEAD"
    if not head_path.exists():
        return "main"

    text = head_path.read_text(encoding="utf-8", errors="ignore").strip()
    if text.startswith("ref:"):
        return text.rsplit("/", 1)[-1].strip() or "main"
    return "main"


def _github_parts_from_remote(remote_url: str) -> tuple[str, str] | None:
    if not remote_url:
        return None

    https_match = re.match(r"https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", remote_url)
    if https_match:
        return https_match.group(1), https_match.group(2)

    ssh_match = re.match(r"git@github\.com:([^/]+)/([^/]+?)(?:\.git)?$", remote_url)
    if ssh_match:
        return ssh_match.group(1), ssh_match.group(2)

    return None


def normalize_catalog_url(catalog_url: str | None) -> str:
    value = (catalog_url or "").strip()
    if not value:
        return ""

    blob_match = re.match(r"https?://github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)", value)
    if blob_match:
        owner, repo, branch, rel_path = blob_match.groups()
        return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{rel_path}"

    repo_match = re.match(r"https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", value)
    if repo_match:
        owner, repo = repo_match.groups()
        return f"https://raw.githubusercontent.com/{owner}/{repo}/main/catalog/prompts.json"

    return value


def get_default_catalog_url() -> str:
    remote_parts = _github_parts_from_remote(_read_git_origin_url())
    if not remote_parts:
        return ""

    owner, repo = remote_parts
    branch = _read_git_branch()
    return f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/catalog/prompts.json"


def _coerce_sync_mode(sync_mode: str | None) -> str:
    value = (sync_mode or DEFAULT_SYNC_MODE).strip().lower()
    return value if value in SUPPORTED_SYNC_MODES else DEFAULT_SYNC_MODE


def _local_file_url(relative_path: str) -> str:
    clean_path = relative_path.replace("\\", "/").lstrip("./")
    quoted = urllib.parse.quote(clean_path, safe="/")
    return f"/darkhub/api/files/{quoted}"


def _proxy_file_url(target_url: str) -> str:
    quoted = urllib.parse.quote(target_url, safe="")
    return f"/darkhub/api/asset?url={quoted}"


def _resolve_image_url(image_ref: str, source_url: str, source_type: str) -> tuple[str, str]:
    clean_ref = (image_ref or "").strip()
    if not clean_ref:
        local_url = _local_file_url(PLACEHOLDER_PATH)
        return local_url, local_url

    if clean_ref.startswith(("http://", "https://")):
        return clean_ref, _proxy_file_url(clean_ref)

    if clean_ref.startswith(("data:", "/")):
        return clean_ref, clean_ref

    if source_type == "remote" and source_url:
        remote_url = urllib.parse.urljoin(source_url, clean_ref)
        return remote_url, _proxy_file_url(remote_url)

    local_url = _local_file_url(clean_ref)
    return local_url, local_url


def _normalize_catalog_payload(payload: Any, source_url: str = "", source_type: str = "local") -> dict[str, Any]:
    if isinstance(payload, dict):
        raw_items = payload.get("prompts", payload.get("items", []))
        meta = payload
    elif isinstance(payload, list):
        raw_items = payload
        meta = {}
    else:
        raise ValueError("Catalog must be a JSON object or array.")

    if not isinstance(raw_items, list):
        raise ValueError("Catalog prompts field must be a list.")

    items: list[dict[str, Any]] = []
    for index, raw_item in enumerate(raw_items, start=1):
        if not isinstance(raw_item, dict):
            continue

        title = str(raw_item.get("title") or raw_item.get("name") or f"Prompt {index}").strip()
        prompt = str(raw_item.get("prompt") or raw_item.get("text") or "").strip()
        item_id = _slugify(str(raw_item.get("id") or title or f"prompt-{index}"))
        tags = raw_item.get("tags") or []
        if not isinstance(tags, list):
            tags = [str(tags)]

        image_url, preview_url = _resolve_image_url(
            str(raw_item.get("image") or raw_item.get("image_url") or raw_item.get("preview") or ""),
            source_url=source_url,
            source_type=source_type,
        )

        items.append(
            {
                "id": item_id,
                "title": title,
                "prompt": prompt,
                "tags": [str(tag).strip() for tag in tags if str(tag).strip()],
                "image_url": image_url,
                "preview_url": preview_url,
            }
        )

    fingerprint_source = {
        "items": items,
        "name": meta.get("name", "dark HUB Prompt Catalog"),
        "version": str(meta.get("version", "")),
        "updated_at": str(meta.get("updated_at", "")),
        "source_type": source_type,
        "source_url": source_url,
    }
    catalog_hash = hashlib.sha256(
        json.dumps(fingerprint_source, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()

    return {
        "name": str(meta.get("name", "dark HUB Prompt Catalog")),
        "version": str(meta.get("version", "")),
        "updated_at": str(meta.get("updated_at", "")),
        "items": items,
        "catalog_hash": catalog_hash,
        "source_type": source_type,
        "source_url": source_url,
    }


def _get_local_catalog() -> dict[str, Any]:
    return _normalize_catalog_payload(_load_json(LOCAL_CATALOG_PATH), source_type="local")


def _get_remote_catalog(catalog_url: str, force_refresh: bool = False) -> dict[str, Any]:
    normalized_url = normalize_catalog_url(catalog_url)
    if not normalized_url:
        raise ValueError("Catalog URL is empty.")

    cached = _CATALOG_CACHE.get(normalized_url)
    if cached and not force_refresh and cached["expires_at"] > time.time():
        return cached["payload"]

    request = urllib.request.Request(
        normalized_url,
        headers={
            "User-Agent": "ComfyUI-darkHUB/0.1.0",
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=8) as response:
        body = response.read()
        encoding = response.headers.get_content_charset("utf-8")

    payload = json.loads(body.decode(encoding))
    normalized = _normalize_catalog_payload(payload, source_url=normalized_url, source_type="remote")
    _CATALOG_CACHE[normalized_url] = {
        "expires_at": time.time() + CATALOG_CACHE_TTL,
        "payload": normalized,
    }
    return normalized


def get_catalog_payload(
    catalog_url: str | None = None,
    sync_mode: str | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    requested_url = normalize_catalog_url(catalog_url)
    default_url = get_default_catalog_url()
    effective_remote_url = requested_url or default_url
    active_sync_mode = _coerce_sync_mode(sync_mode)

    local_catalog = _get_local_catalog()
    selected_catalog = local_catalog
    message = "Local catalog loaded."
    remote_error = ""

    if active_sync_mode != "local_only" and effective_remote_url:
        try:
            selected_catalog = _get_remote_catalog(effective_remote_url, force_refresh=force_refresh)
            message = "Remote catalog loaded."
        except Exception as exc:  # noqa: BLE001
            remote_error = str(exc)
            message = f"Remote catalog unavailable. Local fallback ishladi: {remote_error}"
            LOGGER.warning("darkHUB remote catalog fallback: %s", remote_error)
    elif active_sync_mode == "remote_only" and not effective_remote_url:
        message = "Remote-only mode tanlangan, lekin catalog URL bo'sh. Local fallback ishladi."

    payload = dict(selected_catalog)
    payload.update(
        {
            "default_catalog_url": default_url,
            "requested_catalog_url": requested_url,
            "effective_catalog_url": effective_remote_url,
            "sync_mode": active_sync_mode,
            "message": message,
            "remote_error": remote_error,
        }
    )
    return payload


def get_default_prompt_id() -> str:
    catalog = _get_local_catalog()
    return catalog["items"][0]["id"] if catalog["items"] else "prompt-item"


def get_default_prompt_text() -> str:
    catalog = _get_local_catalog()
    return catalog["items"][0]["prompt"] if catalog["items"] else ""


def resolve_prompt(
    prompt_id: str,
    catalog_url: str | None = None,
    fallback_prompt: str | None = None,
    sync_mode: str | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    catalog = get_catalog_payload(catalog_url, sync_mode, force_refresh=force_refresh)
    fallback_text = (fallback_prompt or "").strip()
    items = catalog.get("items", [])

    selected = next((item for item in items if item["id"] == prompt_id), None)
    if not selected and items:
        selected = items[0]

    if not selected:
        selected = {
            "id": _slugify(prompt_id or "workflow-prompt"),
            "title": "Workflow Stored Prompt",
            "prompt": fallback_text,
            "tags": ["stored"],
            "image_url": _local_file_url(PLACEHOLDER_PATH),
            "preview_url": _local_file_url(PLACEHOLDER_PATH),
        }
        catalog["message"] = "Catalog bo'sh bo'lgani uchun workflow ichidagi fallback prompt ishlatildi."

    if not selected.get("prompt") and fallback_text:
        selected = dict(selected)
        selected["prompt"] = fallback_text

    resolved = dict(selected)
    resolved.update(
        {
            "effective_catalog_url": catalog.get("effective_catalog_url", ""),
            "default_catalog_url": catalog.get("default_catalog_url", ""),
            "catalog_hash": catalog.get("catalog_hash", ""),
            "source_type": catalog.get("source_type", "local"),
            "sync_mode": catalog.get("sync_mode", DEFAULT_SYNC_MODE),
            "message": catalog.get("message", ""),
        }
    )
    return resolved


def get_prompt_fingerprint(
    prompt_id: str,
    catalog_url: str | None = None,
    fallback_prompt: str | None = None,
    sync_mode: str | None = None,
) -> str:
    resolved = resolve_prompt(prompt_id, catalog_url, fallback_prompt, sync_mode)
    fingerprint_payload = {
        "prompt_id": resolved["id"],
        "title": resolved["title"],
        "prompt": resolved["prompt"],
        "preview_url": resolved["preview_url"],
        "catalog_hash": resolved.get("catalog_hash", ""),
        "catalog_url": resolved.get("effective_catalog_url", ""),
        "sync_mode": resolved.get("sync_mode", DEFAULT_SYNC_MODE),
    }
    return hashlib.sha256(
        json.dumps(fingerprint_payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def _resolve_local_asset_path(relative_path: str) -> Path:
    clean_path = relative_path.replace("\\", "/").lstrip("./")
    target = (CATALOG_DIR / clean_path).resolve()
    catalog_root = CATALOG_DIR.resolve()
    if catalog_root not in target.parents and target != catalog_root:
        raise FileNotFoundError("Invalid path.")
    if not target.is_file():
        raise FileNotFoundError(f"Missing file: {clean_path}")
    return target


def _fetch_remote_asset(asset_url: str, force_refresh: bool = False) -> dict[str, Any]:
    cached = _ASSET_CACHE.get(asset_url)
    if cached and not force_refresh and cached["expires_at"] > time.time():
        return cached

    request = urllib.request.Request(
        asset_url,
        headers={
            "User-Agent": "ComfyUI-darkHUB/0.1.0",
            "Accept": "image/*,*/*;q=0.8",
        },
    )

    with urllib.request.urlopen(request, timeout=8) as response:
        body = response.read(MAX_ASSET_BYTES + 1)
        if len(body) > MAX_ASSET_BYTES:
            raise ValueError("Remote preview image is too large.")

        content_type = response.headers.get_content_type()

    payload = {
        "body": body,
        "content_type": content_type or mimetypes.guess_type(asset_url)[0] or "application/octet-stream",
        "expires_at": time.time() + ASSET_CACHE_TTL,
    }
    _ASSET_CACHE[asset_url] = payload
    return payload


@PromptServer.instance.routes.get("/darkhub/api/catalog")
async def darkhub_catalog(request: web.Request) -> web.Response:
    catalog_url = request.query.get("catalog_url", "")
    sync_mode = request.query.get("sync_mode", DEFAULT_SYNC_MODE)
    force_refresh = request.query.get("refresh", "0").lower() in {"1", "true", "yes"}

    payload = get_catalog_payload(catalog_url, sync_mode, force_refresh=force_refresh)
    return web.json_response(payload)


@PromptServer.instance.routes.get("/darkhub/api/files/{path:.*}")
async def darkhub_catalog_file(request: web.Request) -> web.StreamResponse:
    relative_path = request.match_info.get("path", "")
    try:
        return web.FileResponse(_resolve_local_asset_path(relative_path))
    except FileNotFoundError:
        return web.FileResponse(_resolve_local_asset_path(PLACEHOLDER_PATH))


@PromptServer.instance.routes.get("/darkhub/api/asset")
async def darkhub_remote_asset(request: web.Request) -> web.StreamResponse:
    asset_url = request.query.get("url", "")
    force_refresh = request.query.get("refresh", "0").lower() in {"1", "true", "yes"}

    if not asset_url.startswith(("http://", "https://")):
        return web.FileResponse(_resolve_local_asset_path(PLACEHOLDER_PATH))

    try:
        payload = _fetch_remote_asset(asset_url, force_refresh=force_refresh)
        return web.Response(body=payload["body"], content_type=payload["content_type"])
    except Exception as exc:  # noqa: BLE001
        LOGGER.warning("darkHUB remote asset fallback: %s", exc)
        return web.FileResponse(_resolve_local_asset_path(PLACEHOLDER_PATH))
