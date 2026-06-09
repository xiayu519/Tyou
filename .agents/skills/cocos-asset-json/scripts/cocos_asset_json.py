#!/usr/bin/env python3
"""Read-only helpers for Cocos Creator source assets."""

from __future__ import annotations

import argparse
import json
import plistlib
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ENGINE_PREFIXES = ("cc.", "CC", "sp.", "dragonBones.")


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def emit(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def rel(path: Path, root: Path | None) -> str:
    if root:
        try:
            return str(path.resolve().relative_to(root.resolve())).replace("\\", "/")
        except ValueError:
            pass
    return str(path).replace("\\", "/")


def iter_refs(value: Any, path: str = ""):
    if isinstance(value, dict):
        if set(value.keys()) == {"__id__"} and isinstance(value.get("__id__"), int):
            yield (path, "__id__", value["__id__"])
        if "__uuid__" in value:
            yield (path, "__uuid__", value.get("__uuid__"))
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            yield from iter_refs(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from iter_refs(child, f"{path}[{index}]")


def load_asset_array(path: Path) -> list[dict[str, Any]]:
    data = read_json(path)
    if not isinstance(data, list):
        raise ValueError(f"expected JSON array: {path}")
    if not all(isinstance(item, dict) for item in data):
        raise ValueError(f"expected JSON object array: {path}")
    return data


def summarize_asset_array(path: Path, root: Path | None = None) -> dict[str, Any]:
    data = load_asset_array(path)
    type_counts = Counter(item.get("__type__", "<missing>") for item in data)
    custom_components = []
    nodes_by_id = {idx: item for idx, item in enumerate(data) if item.get("__type__") == "cc.Node"}
    for idx, item in enumerate(data):
        typ = item.get("__type__", "")
        if typ and not typ.startswith(ENGINE_PREFIXES):
            node_ref = item.get("node", {}).get("__id__") if isinstance(item.get("node"), dict) else None
            node = nodes_by_id.get(node_ref, {}) if node_ref is not None else {}
            keys = [key for key in item.keys() if key not in {"__type__", "_name", "_objFlags", "__editorExtras__", "node", "_enabled", "__prefab", "_id"}]
            custom_components.append({
                "id": idx,
                "type": typ,
                "nodeId": node_ref,
                "nodeName": node.get("_name"),
                "fields": keys[:40],
            })
    prefab_instances = []
    overrides = []
    for idx, item in enumerate(data):
        typ = item.get("__type__")
        if typ in {"cc.PrefabInfo", "cc.PrefabInstance"}:
            prefab_instances.append({
                "id": idx,
                "type": typ,
                "fileId": item.get("fileId"),
                "asset": item.get("asset"),
                "instance": item.get("instance"),
                "targetOverrides": item.get("targetOverrides"),
                "nestedPrefabInstanceRoots": item.get("nestedPrefabInstanceRoots"),
            })
        elif typ and ("Override" in typ or typ in {"cc.TargetInfo", "CCPropertyOverrideInfo"}):
            overrides.append({
                "id": idx,
                "type": typ,
                "propertyPath": item.get("propertyPath"),
                "target": item.get("target"),
                "value": item.get("value"),
            })
    nodes = []
    for idx, item in nodes_by_id.items():
        nodes.append({
            "id": idx,
            "name": item.get("_name"),
            "parent": item.get("_parent", {}).get("__id__") if isinstance(item.get("_parent"), dict) else None,
            "children": [child.get("__id__") for child in item.get("_children") or [] if isinstance(child, dict)],
            "components": [comp.get("__id__") for comp in item.get("_components") or [] if isinstance(comp, dict)],
        })
    return {
        "file": rel(path, root),
        "kind": path.suffix.lstrip("."),
        "objects": len(data),
        "firstType": data[0].get("__type__") if data else None,
        "name": data[0].get("_name") if data else None,
        "typeCounts": dict(type_counts.most_common()),
        "nodeCount": len(nodes),
        "nodes": nodes[:200],
        "customComponents": custom_components,
        "prefabInstanceLike": prefab_instances,
        "overrideLike": overrides,
    }


def uuid_index(assets_root: Path) -> dict[str, Any]:
    entries: dict[str, list[dict[str, Any]]] = defaultdict(list)
    importers = Counter()
    for meta_path in assets_root.rglob("*.meta"):
        try:
            meta = read_json(meta_path)
        except Exception as exc:  # noqa: BLE001
            entries["<parse-error>"].append({"file": rel(meta_path, assets_root), "error": str(exc)})
            continue
        importer = meta.get("importer")
        importers[importer or "<missing>"] += 1
        uuid = meta.get("uuid")
        if uuid:
            entries[uuid].append({"file": rel(meta_path, assets_root), "importer": importer, "files": meta.get("files")})
        sub_metas = meta.get("subMetas") or {}
        if isinstance(sub_metas, dict):
            for sub_id, sub in sub_metas.items():
                if isinstance(sub, dict) and sub.get("uuid"):
                    entries[sub["uuid"]].append({
                        "file": rel(meta_path, assets_root),
                        "subMeta": sub_id,
                        "name": sub.get("name"),
                        "importer": sub.get("importer"),
                    })
    duplicates = {key: value for key, value in entries.items() if key != "<parse-error>" and len(value) > 1}
    return {"assetsRoot": rel(assets_root, None), "importers": dict(importers.most_common()), "count": len(entries), "duplicates": duplicates, "entries": entries}


def validate(path: Path, assets_root: Path | None) -> dict[str, Any]:
    data = load_asset_array(path)
    problems = []
    refs = []
    uuid_entries = uuid_index(assets_root)["entries"] if assets_root else {}
    for idx, item in enumerate(data):
        for ref_path, kind, target in iter_refs(item):
            refs.append({"object": idx, "path": ref_path, "kind": kind, "target": target})
            if kind == "__id__" and (target < 0 or target >= len(data)):
                problems.append({"type": "dangling-id", "object": idx, "path": ref_path, "target": target})
            if kind == "__uuid__" and assets_root and target not in uuid_entries:
                problems.append({"type": "missing-uuid", "object": idx, "path": ref_path, "target": target})
    meta_path = Path(str(path) + ".meta")
    meta_summary = None
    expected_importer = "prefab" if path.suffix == ".prefab" else "scene" if path.suffix == ".scene" else None
    if expected_importer:
        if not meta_path.exists():
            problems.append({"type": "missing-meta", "file": str(meta_path)})
        else:
            meta = read_json(meta_path)
            meta_summary = {"importer": meta.get("importer"), "uuid": meta.get("uuid"), "files": meta.get("files"), "userData": meta.get("userData")}
            if meta.get("importer") != expected_importer:
                problems.append({"type": "meta-importer", "expected": expected_importer, "actual": meta.get("importer")})
            if ".json" not in (meta.get("files") or []):
                problems.append({"type": "meta-files", "expected": ".json", "actual": meta.get("files")})
    return {"file": rel(path, assets_root), "objects": len(data), "refs": len(refs), "problems": problems, "meta": meta_summary}


def asset_index(path: Path) -> dict[str, Any]:
    data = read_json(path)
    assets = data.get("assets") or []
    type_counts = Counter(item.get("type", "<missing>") for item in assets)
    bundle_counts = Counter(item.get("bundle", "<missing>") for item in assets)
    names = defaultdict(list)
    for item in assets:
        names[item.get("name")].append(item)
    duplicates = {key: value for key, value in names.items() if key and len(value) > 1}
    return {"file": rel(path, None), "bundles": data.get("bundles"), "assetCount": len(assets), "typeCounts": dict(type_counts.most_common()), "bundleCounts": dict(bundle_counts.most_common()), "duplicates": duplicates, "assets": assets}


def parse_rect(text: str | None) -> dict[str, int] | None:
    if not isinstance(text, str):
        return None
    nums = [int(n) for n in re.findall(r"-?\d+", text)]
    if len(nums) >= 4:
        return {"x": nums[0], "y": nums[1], "width": nums[2], "height": nums[3]}
    return None


def atlas(plist_path: Path, meta_path: Path | None) -> dict[str, Any]:
    with plist_path.open("rb") as f:
        plist = plistlib.load(f)
    frames = plist.get("frames") or {}
    meta = read_json(meta_path) if meta_path and meta_path.exists() else None
    sub_by_name = {}
    if isinstance(meta, dict):
        for sub_id, sub in (meta.get("subMetas") or {}).items():
            if isinstance(sub, dict) and sub.get("name"):
                sub_by_name[sub["name"]] = {"id": sub_id, "uuid": sub.get("uuid"), "userData": sub.get("userData")}
    out_frames = []
    for name, info in frames.items():
        sub = sub_by_name.get(Path(name).with_suffix("").as_posix()) or sub_by_name.get(str(name).removesuffix(".png")) or sub_by_name.get(name)
        out_frames.append({
            "name": name,
            "rect": parse_rect(info.get("frame") if isinstance(info, dict) else None),
            "rotated": info.get("rotated") if isinstance(info, dict) else None,
            "sourceSize": info.get("sourceSize") if isinstance(info, dict) else None,
            "uuid": sub.get("uuid") if sub else None,
            "subMetaId": sub.get("id") if sub else None,
        })
    return {
        "plist": rel(plist_path, None),
        "meta": rel(meta_path, None) if meta_path else None,
        "frameCount": len(out_frames),
        "atlasUuid": meta.get("uuid") if isinstance(meta, dict) else None,
        "textureUuid": (meta.get("userData") or {}).get("textureUuid") if isinstance(meta, dict) else None,
        "frames": out_frames,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only Cocos Creator source asset inspector")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("inspect")
    p.add_argument("--file", required=True, type=Path)
    p.add_argument("--assets-root", type=Path)

    p = sub.add_parser("validate")
    p.add_argument("--file", required=True, type=Path)
    p.add_argument("--assets-root", type=Path)

    p = sub.add_parser("uuid-index")
    p.add_argument("--assets-root", required=True, type=Path)

    p = sub.add_parser("asset-index")
    p.add_argument("--file", required=True, type=Path)

    p = sub.add_parser("atlas")
    p.add_argument("--plist", required=True, type=Path)
    p.add_argument("--meta", type=Path)

    args = parser.parse_args()
    if args.cmd == "inspect":
        emit(summarize_asset_array(args.file, args.assets_root))
    elif args.cmd == "validate":
        emit(validate(args.file, args.assets_root))
    elif args.cmd == "uuid-index":
        emit(uuid_index(args.assets_root))
    elif args.cmd == "asset-index":
        emit(asset_index(args.file))
    elif args.cmd == "atlas":
        emit(atlas(args.plist, args.meta))


if __name__ == "__main__":
    main()
