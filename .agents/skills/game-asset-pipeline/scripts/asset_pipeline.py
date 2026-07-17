#!/usr/bin/env python3
"""Deterministic local helpers for game image and audio asset QA."""

from __future__ import annotations

import argparse
import glob
import hashlib
import json
import math
import struct
import sys
import wave
from pathlib import Path
from typing import Any, Iterable

try:
    from PIL import Image, ImageChops, ImageDraw, ImageOps, ImageStat
    import PIL
except ImportError as exc:  # pragma: no cover - explicit environment failure
    raise SystemExit(
        "Pillow is required for game-asset-pipeline scripts. Install it with: python -m pip install Pillow"
    ) from exc


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
AUDIO_EXTENSIONS = {".wav", ".mp3"}


def emit(payload: Any, output: Path | None = None) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if output is None:
        print(text)
        return
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(text + "\n", encoding="utf-8")
    print(text)


def require_file(path: Path) -> Path:
    resolved = path.expanduser().resolve()
    if not resolved.is_file():
        raise FileNotFoundError(f"file not found: {resolved}")
    return resolved


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inspect_image(path: Path) -> dict[str, Any]:
    path = require_file(path)
    with Image.open(path) as image:
        image.load()
        width, height = image.size
        has_alpha = "A" in image.getbands() or "transparency" in image.info
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        alpha_histogram = alpha.histogram()
        total_pixels = width * height
        transparent_pixels = alpha_histogram[0]
        opaque_pixels = alpha_histogram[255]
        translucent_pixels = total_pixels - transparent_pixels - opaque_pixels
        color_values = rgba.getcolors(maxcolors=1_000_000)
        unique_colors = len(color_values) if color_values is not None else None
        return {
            "path": str(path),
            "format": image.format,
            "mode": image.mode,
            "width": width,
            "height": height,
            "frames": int(getattr(image, "n_frames", 1)),
            "has_alpha": has_alpha,
            "alpha_bbox": alpha.getbbox(),
            "transparent_pixels": transparent_pixels,
            "translucent_pixels": translucent_pixels,
            "opaque_pixels": opaque_pixels,
            "transparent_ratio": round(transparent_pixels / total_pixels, 6) if total_pixels else 0,
            "translucent_ratio": round(translucent_pixels / total_pixels, 6) if total_pixels else 0,
            "unique_colors": unique_colors,
            "sha256": sha256_file(path),
        }


def _integer_axis_scale(source: int, target: int) -> bool:
    if source == target:
        return True
    if target > source:
        return target % source == 0
    return source % target == 0


def resize_image(
    input_path: Path,
    output_path: Path,
    *,
    width: int | None = None,
    height: int | None = None,
    scale: int | None = None,
    filter_name: str = "nearest",
    pixel_art: bool = False,
    allow_non_integer: bool = False,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if scale is not None and (width is not None or height is not None):
        raise ValueError("use either --scale or --width/--height, not both")
    if scale is not None and scale <= 0:
        raise ValueError("--scale must be a positive integer")

    filters = {
        "nearest": Image.Resampling.NEAREST,
        "bilinear": Image.Resampling.BILINEAR,
        "bicubic": Image.Resampling.BICUBIC,
        "lanczos": Image.Resampling.LANCZOS,
    }
    if filter_name not in filters:
        raise ValueError(f"unsupported filter: {filter_name}")
    if pixel_art and filter_name != "nearest":
        raise ValueError("pixel-art resize must use nearest filter")

    with Image.open(input_path) as image:
        image.load()
        source_width, source_height = image.size
        if scale is not None:
            target_width = source_width * scale
            target_height = source_height * scale
        else:
            if width is None and height is None:
                raise ValueError("provide --scale, --width, or --height")
            if width is None:
                target_height = int(height)
                target_width = round(source_width * target_height / source_height)
            elif height is None:
                target_width = int(width)
                target_height = round(source_height * target_width / source_width)
            else:
                target_width = int(width)
                target_height = int(height)

        if target_width <= 0 or target_height <= 0:
            raise ValueError("target dimensions must be positive")
        if pixel_art and not allow_non_integer:
            if not _integer_axis_scale(source_width, target_width) or not _integer_axis_scale(source_height, target_height):
                raise ValueError(
                    f"pixel-art resize must use integer axis ratios: {source_width}x{source_height} -> {target_width}x{target_height}"
                )

        output_path = output_path.expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        resized = image.resize((target_width, target_height), filters[filter_name])
        resized.save(output_path)

    result = inspect_image(output_path)
    result.update(
        {
            "source": str(input_path),
            "source_width": source_width,
            "source_height": source_height,
            "filter": filter_name,
            "pixel_art": pixel_art,
        }
    )
    return result


def split_grid(
    input_path: Path,
    output_dir: Path,
    *,
    cols: int,
    rows: int,
    prefix: str,
    skip_transparent: bool = False,
    inset: int = 0,
    pad_to_grid: bool = False,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if cols <= 0 or rows <= 0:
        raise ValueError("--cols and --rows must be positive")
    if inset < 0:
        raise ValueError("--inset must be zero or positive")
    output_dir = output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs: list[dict[str, Any]] = []
    with Image.open(input_path) as image:
        image.load()
        source_width, source_height = image.size
        pad_right = (-source_width) % cols
        pad_bottom = (-source_height) % rows
        if (pad_right or pad_bottom) and not pad_to_grid:
            raise ValueError(
                f"sheet size {source_width}x{source_height} is not divisible by grid {cols}x{rows}; "
                "use --pad-to-grid to add transparent pixels on the right/bottom"
            )
        if pad_right or pad_bottom:
            prepared = Image.new(
                "RGBA",
                (source_width + pad_right, source_height + pad_bottom),
                (0, 0, 0, 0),
            )
            prepared.alpha_composite(image.convert("RGBA"), (0, 0))
        else:
            prepared = image.convert("RGBA")
        width, height = prepared.size
        cell_width = width // cols
        cell_height = height // rows
        if inset * 2 >= cell_width or inset * 2 >= cell_height:
            raise ValueError(
                f"--inset {inset} removes the entire {cell_width}x{cell_height} cell"
            )
        digits = max(2, len(str(cols * rows - 1)))
        index = 0
        for row in range(rows):
            for col in range(cols):
                frame = prepared.crop(
                    (
                        col * cell_width + inset,
                        row * cell_height + inset,
                        (col + 1) * cell_width - inset,
                        (row + 1) * cell_height - inset,
                    )
                ).convert("RGBA")
                alpha_bbox = frame.getchannel("A").getbbox()
                if skip_transparent and alpha_bbox is None:
                    index += 1
                    continue
                output = output_dir / f"{prefix}_{index:0{digits}d}.png"
                frame.save(output)
                outputs.append({"index": index, "row": row, "col": col, "path": str(output)})
                index += 1

    return {
        "source": str(input_path),
        "source_canvas": {"width": source_width, "height": source_height},
        "prepared_canvas": {"width": width, "height": height},
        "padding": {"right": pad_right, "bottom": pad_bottom},
        "pad_to_grid": pad_to_grid,
        "grid": {"cols": cols, "rows": rows},
        "source_cell": {"width": cell_width, "height": cell_height},
        "inset": inset,
        "cell": {"width": cell_width - inset * 2, "height": cell_height - inset * 2},
        "output_count": len(outputs),
        "outputs": outputs,
    }


def expand_input_patterns(patterns: Iterable[str]) -> list[Path]:
    files: list[Path] = []
    seen: set[Path] = set()
    for pattern in patterns:
        matches = glob.glob(pattern)
        candidates = matches if matches else [pattern]
        for candidate in candidates:
            path = require_file(Path(candidate))
            if path not in seen:
                seen.add(path)
                files.append(path)
    if not files:
        raise ValueError("no input frames found")
    return files


def compose_grid(
    input_patterns: Iterable[str],
    output_path: Path,
    *,
    cols: int,
    cell_width: int | None = None,
    cell_height: int | None = None,
    align: str = "center",
) -> dict[str, Any]:
    if cols <= 0:
        raise ValueError("--cols must be positive")
    if align not in {"center", "top-left"}:
        raise ValueError("--align must be center or top-left")
    inputs = expand_input_patterns(input_patterns)
    frames: list[Image.Image] = []
    try:
        for path in inputs:
            with Image.open(path) as source:
                source.load()
                frames.append(source.convert("RGBA"))
        target_cell_width = cell_width or max(frame.width for frame in frames)
        target_cell_height = cell_height or max(frame.height for frame in frames)
        if target_cell_width <= 0 or target_cell_height <= 0:
            raise ValueError("cell dimensions must be positive")
        for path, frame in zip(inputs, frames):
            if frame.width > target_cell_width or frame.height > target_cell_height:
                raise ValueError(
                    f"frame exceeds cell: {path} is {frame.width}x{frame.height}, cell is {target_cell_width}x{target_cell_height}"
                )

        rows = math.ceil(len(frames) / cols)
        sheet = Image.new("RGBA", (cols * target_cell_width, rows * target_cell_height), (0, 0, 0, 0))
        placements: list[dict[str, Any]] = []
        for index, (path, frame) in enumerate(zip(inputs, frames)):
            row = index // cols
            col = index % cols
            x = col * target_cell_width
            y = row * target_cell_height
            if align == "center":
                x += (target_cell_width - frame.width) // 2
                y += (target_cell_height - frame.height) // 2
            sheet.alpha_composite(frame, (x, y))
            placements.append({"index": index, "row": row, "col": col, "source": str(path), "x": x, "y": y})

        output_path = output_path.expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output_path)
    finally:
        for frame in frames:
            frame.close()

    return {
        "output": str(output_path),
        "grid": {"cols": cols, "rows": rows},
        "cell": {"width": target_cell_width, "height": target_cell_height},
        "frame_count": len(inputs),
        "placements": placements,
        "inspection": inspect_image(output_path),
    }


def _edge_metric(first: list[tuple[int, int, int, int]], second: list[tuple[int, int, int, int]]) -> dict[str, Any]:
    if len(first) != len(second) or not first:
        raise ValueError("edge lengths must match and be non-empty")
    mismatched = 0
    absolute_difference = 0
    for left, right in zip(first, second):
        if left != right:
            mismatched += 1
        absolute_difference += sum(abs(a - b) for a, b in zip(left, right))
    return {
        "pixels": len(first),
        "mismatched_pixels": mismatched,
        "mismatch_ratio": round(mismatched / len(first), 6),
        "mean_abs_channel_diff": round(absolute_difference / (len(first) * 4), 6),
    }


def validate_seam(
    input_path: Path,
    *,
    horizontal: bool,
    vertical: bool,
    max_mismatch_ratio: float = 0.0,
    max_mean_abs_diff: float = 0.0,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if not horizontal and not vertical:
        horizontal = vertical = True
    if not 0 <= max_mismatch_ratio <= 1:
        raise ValueError("--max-mismatch-ratio must be between 0 and 1")
    if max_mean_abs_diff < 0:
        raise ValueError("--max-mean-abs-diff must be non-negative")

    with Image.open(input_path) as source:
        image = source.convert("RGBA")
        width, height = image.size
        results: dict[str, Any] = {}
        if horizontal:
            left = [image.getpixel((0, y)) for y in range(height)]
            right = [image.getpixel((width - 1, y)) for y in range(height)]
            results["horizontal"] = _edge_metric(left, right)
        if vertical:
            top = [image.getpixel((x, 0)) for x in range(width)]
            bottom = [image.getpixel((x, height - 1)) for x in range(width)]
            results["vertical"] = _edge_metric(top, bottom)

    passed = all(
        metric["mismatch_ratio"] <= max_mismatch_ratio
        and metric["mean_abs_channel_diff"] <= max_mean_abs_diff
        for metric in results.values()
    )
    return {
        "path": str(input_path),
        "thresholds": {
            "max_mismatch_ratio": max_mismatch_ratio,
            "max_mean_abs_channel_diff": max_mean_abs_diff,
        },
        "directions": results,
        "passed": passed,
    }


def _read_mp3_info(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    offset = 0
    if data[:3] == b"ID3" and len(data) >= 10:
        tag_size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14) | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F)
        offset = 10 + tag_size

    bitrate_tables = {
        ("1", 1): [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        ("1", 2): [32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
        ("1", 3): [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        ("2", 1): [32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
        ("2", 2): [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
        ("2", 3): [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    }
    sample_rates = {
        "1": [44100, 48000, 32000],
        "2": [22050, 24000, 16000],
        "2.5": [11025, 12000, 8000],
    }

    frames = 0
    total_samples = 0
    audio_bytes = 0
    first: dict[str, Any] | None = None
    while offset + 4 <= len(data):
        if data[offset] != 0xFF or data[offset + 1] & 0xE0 != 0xE0:
            offset += 1
            continue
        version_bits = (data[offset + 1] >> 3) & 0x03
        layer_bits = (data[offset + 1] >> 1) & 0x03
        bitrate_index = (data[offset + 2] >> 4) & 0x0F
        sample_rate_index = (data[offset + 2] >> 2) & 0x03
        padding = (data[offset + 2] >> 1) & 0x01
        if version_bits == 1 or layer_bits == 0 or bitrate_index in {0, 15} or sample_rate_index == 3:
            offset += 1
            continue
        version = "1" if version_bits == 3 else "2" if version_bits == 2 else "2.5"
        layer = 4 - layer_bits
        table_version = "1" if version == "1" else "2"
        bitrate = bitrate_tables[(table_version, layer)][bitrate_index - 1] * 1000
        sample_rate = sample_rates[version][sample_rate_index]
        if layer == 1:
            frame_length = math.floor((12 * bitrate / sample_rate + padding) * 4)
            samples_per_frame = 384
        elif layer == 3 and version != "1":
            frame_length = math.floor(72 * bitrate / sample_rate + padding)
            samples_per_frame = 576
        else:
            frame_length = math.floor(144 * bitrate / sample_rate + padding)
            samples_per_frame = 1152
        if frame_length <= 0 or offset + frame_length > len(data):
            offset += 1
            continue
        if first is None:
            first = {"mpeg_version": version, "layer": layer, "sample_rate": sample_rate, "bitrate": bitrate}
        frames += 1
        total_samples += samples_per_frame
        audio_bytes += frame_length
        offset += frame_length

    if first is None or frames == 0:
        raise ValueError(f"no valid MP3 frames found: {path}")
    duration = total_samples / first["sample_rate"]
    average_bitrate = round(audio_bytes * 8 / duration) if duration > 0 else first["bitrate"]
    return {
        "format": "MP3",
        "duration_seconds": round(duration, 6),
        "sample_rate": first["sample_rate"],
        "bitrate": average_bitrate,
        "frames": frames,
        "mpeg_version": first["mpeg_version"],
        "layer": first["layer"],
    }


def inspect_audio(path: Path) -> dict[str, Any]:
    path = require_file(path)
    suffix = path.suffix.lower()
    if suffix == ".wav":
        with wave.open(str(path), "rb") as stream:
            frame_count = stream.getnframes()
            sample_rate = stream.getframerate()
            result = {
                "format": "WAV",
                "duration_seconds": round(frame_count / sample_rate, 6) if sample_rate else 0,
                "sample_rate": sample_rate,
                "channels": stream.getnchannels(),
                "sample_width_bytes": stream.getsampwidth(),
                "frames": frame_count,
            }
    elif suffix == ".mp3":
        result = _read_mp3_info(path)
    else:
        raise ValueError(f"unsupported audio format: {suffix}; supported: .wav, .mp3")
    result.update({"path": str(path), "size_bytes": path.stat().st_size, "sha256": sha256_file(path)})
    return result


def make_seamless_mirror(input_path: Path, output_path: Path) -> dict[str, Any]:
    input_path = require_file(input_path)
    with Image.open(input_path) as source:
        source.load()
        image = source.convert("RGBA")
        width, height = image.size
        mirrored_x = ImageOps.mirror(image)
        top = Image.new("RGBA", (width * 2, height))
        top.paste(image, (0, 0))
        top.paste(mirrored_x, (width, 0))
        output_image = Image.new("RGBA", (width * 2, height * 2))
        output_image.paste(top, (0, 0))
        output_image.paste(ImageOps.flip(top), (0, height))
        output_path = output_path.expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_image.save(output_path)

    result = inspect_image(output_path)
    result.update(
        {
            "source": str(input_path),
            "construction": "mirror-2x2",
            "seam": validate_seam(output_path, horizontal=True, vertical=True),
        }
    )
    return result


def build_manifest(root: Path) -> dict[str, Any]:
    root = root.expanduser().resolve()
    if not root.is_dir():
        raise NotADirectoryError(f"manifest root not found: {root}")
    entries: list[dict[str, Any]] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        suffix = path.suffix.lower()
        if suffix in IMAGE_EXTENSIONS:
            details = inspect_image(path)
            kind = "image"
        elif suffix in AUDIO_EXTENSIONS:
            details = inspect_audio(path)
            kind = "audio"
        else:
            continue
        details["path"] = path.relative_to(root).as_posix()
        entries.append({"kind": kind, **details})
    return {"root": str(root), "count": len(entries), "entries": entries}


def search_assets(
    root: Path,
    query: str,
    *,
    limit: int = 50,
) -> dict[str, Any]:
    root = root.expanduser().resolve()
    if not root.is_dir():
        raise NotADirectoryError(f"search root not found: {root}")
    if limit <= 0:
        raise ValueError("--limit must be positive")
    tokens = [token.lower() for token in query.replace("\\", " ").replace("/", " ").split() if token]
    if not tokens:
        raise ValueError("--query must contain at least one token")
    results: list[dict[str, Any]] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        relative = path.relative_to(root).as_posix()
        haystack = relative.lower()
        score = sum(1 for token in tokens if token in haystack)
        if score == 0:
            continue
        results.append(
            {
                "score": score,
                "path": relative,
                "size_bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
        )
    results.sort(key=lambda item: (-item["score"], item["path"]))
    return {
        "root": str(root),
        "query": query,
        "count": min(len(results), limit),
        "results": results[:limit],
    }


def tile_preview(
    input_path: Path,
    output_path: Path,
    *,
    cols: int = 3,
    rows: int = 3,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if cols <= 0 or rows <= 0:
        raise ValueError("--cols and --rows must be positive")
    with Image.open(input_path) as source:
        tile = source.convert("RGBA")
        preview = Image.new("RGBA", (tile.width * cols, tile.height * rows), (0, 0, 0, 0))
        for row in range(rows):
            for col in range(cols):
                preview.alpha_composite(tile, (col * tile.width, row * tile.height))
        _save_rgba(preview, output_path)
    result = inspect_image(output_path)
    result.update(
        {
            "source": str(input_path),
            "grid": {"cols": cols, "rows": rows},
        }
    )
    return result


def _save_rgba(image: Image.Image, output_path: Path) -> Path:
    output_path = output_path.expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGBA").save(output_path)
    return output_path


def clean_alpha(
    input_path: Path,
    output_path: Path,
    *,
    threshold: int = 128,
    binary: bool = True,
    clear_transparent_rgb: bool = True,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if not 0 <= threshold <= 255:
        raise ValueError("--threshold must be between 0 and 255")
    with Image.open(input_path) as source:
        image = source.convert("RGBA")
        pixels = list(image.getdata())
        cleaned: list[tuple[int, int, int, int]] = []
        for red, green, blue, alpha in pixels:
            next_alpha = 255 if binary and alpha >= threshold else 0 if binary else alpha
            if clear_transparent_rgb and next_alpha == 0:
                cleaned.append((0, 0, 0, 0))
            else:
                cleaned.append((red, green, blue, next_alpha))
        image.putdata(cleaned)
        _save_rgba(image, output_path)
    result = inspect_image(output_path)
    result.update(
        {
            "source": str(input_path),
            "threshold": threshold,
            "binary": binary,
            "clear_transparent_rgb": clear_transparent_rgb,
        }
    )
    return result


def _parse_rgb_color(value: str) -> tuple[int, int, int]:
    text = value.strip()
    if text.startswith("#"):
        text = text[1:]
    if len(text) != 6 or any(character not in "0123456789abcdefABCDEF" for character in text):
        raise ValueError("color must use six-digit hex form such as #FF00FF")
    return tuple(int(text[index : index + 2], 16) for index in (0, 2, 4))


def _rgb_distance(
    left: tuple[int, int, int],
    right: tuple[int, int, int],
) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def _despill_key_edge(
    color: tuple[int, int, int],
    key: tuple[int, int, int],
) -> tuple[int, int, int]:
    high_channels = [index for index, value in enumerate(key) if value >= 192]
    low_channels = [index for index, value in enumerate(key) if value <= 63]
    if not high_channels or not low_channels:
        return color
    channels = list(color)
    common_key_strength = min(channels[index] for index in high_channels)
    foreground_floor = max(channels[index] for index in low_channels)
    spill = max(0, common_key_strength - foreground_floor)
    if spill == 0:
        return color
    for index in high_channels:
        channels[index] = max(0, channels[index] - spill)
    return tuple(channels)


def chroma_key(
    input_path: Path,
    output_path: Path,
    *,
    key_color: str = "#FF00FF",
    tolerance: float = 64.0,
    feather: float = 0.0,
    min_border_match: float = 0.5,
    despill: bool = True,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if tolerance < 0:
        raise ValueError("--tolerance must be non-negative")
    if feather < 0:
        raise ValueError("--feather must be non-negative")
    if not 0 <= min_border_match <= 1:
        raise ValueError("--min-border-match must be between 0 and 1")
    key = _parse_rgb_color(key_color)

    with Image.open(input_path) as source:
        rgba = source.convert("RGBA")
        width, height = rgba.size
        source_pixels = list(rgba.getdata())
        border_indexes: set[int] = set()
        if width and height:
            for x in range(width):
                border_indexes.add(x)
                border_indexes.add((height - 1) * width + x)
            for y in range(height):
                border_indexes.add(y * width)
                border_indexes.add(y * width + width - 1)
        match_limit = tolerance + feather
        border_matches = sum(
            1
            for index in border_indexes
            if _rgb_distance(source_pixels[index][:3], key) <= match_limit
        )
        border_match_ratio = border_matches / max(len(border_indexes), 1)
        if border_match_ratio < min_border_match:
            raise ValueError(
                f"chroma key {key_color} matches only {border_match_ratio:.3f} of border pixels; "
                "regenerate with a flat key background or choose the correct --key"
            )

        output_pixels: list[tuple[int, int, int, int]] = []
        removed_pixels = 0
        feathered_pixels = 0
        for red, green, blue, original_alpha in source_pixels:
            distance = _rgb_distance((red, green, blue), key)
            if distance <= tolerance:
                alpha_factor = 0.0
            elif feather > 0 and distance < tolerance + feather:
                alpha_factor = (distance - tolerance) / feather
            else:
                alpha_factor = 1.0
            next_alpha = round(original_alpha * alpha_factor)
            if next_alpha <= 0:
                output_pixels.append((0, 0, 0, 0))
                removed_pixels += 1
                continue
            if despill and next_alpha < original_alpha:
                alpha = max(next_alpha / 255.0, 1 / 255)
                red = round((red - (1 - alpha) * key[0]) / alpha)
                green = round((green - (1 - alpha) * key[1]) / alpha)
                blue = round((blue - (1 - alpha) * key[2]) / alpha)
                red = min(255, max(0, red))
                green = min(255, max(0, green))
                blue = min(255, max(0, blue))
                feathered_pixels += 1
            output_pixels.append((red, green, blue, next_alpha))
        despilled_edge_pixels = 0
        if despill and width > 0 and height > 0:
            for index, (red, green, blue, alpha) in enumerate(output_pixels):
                if alpha == 0:
                    continue
                x = index % width
                y = index // width
                touches_transparent = False
                for neighbor_y in range(max(0, y - 1), min(height, y + 2)):
                    for neighbor_x in range(max(0, x - 1), min(width, x + 2)):
                        if neighbor_x == x and neighbor_y == y:
                            continue
                        if output_pixels[neighbor_y * width + neighbor_x][3] == 0:
                            touches_transparent = True
                            break
                    if touches_transparent:
                        break
                if not touches_transparent:
                    continue
                cleaned = _despill_key_edge((red, green, blue), key)
                if cleaned != (red, green, blue):
                    output_pixels[index] = (*cleaned, alpha)
                    despilled_edge_pixels += 1
        rgba.putdata(output_pixels)
        _save_rgba(rgba, output_path)

    result = inspect_image(output_path)
    total_pixels = result["width"] * result["height"]
    result.update(
        {
            "source": str(input_path),
            "key": "#" + "".join(f"{channel:02X}" for channel in key),
            "tolerance": tolerance,
            "feather": feather,
            "despill": despill,
            "border_match_ratio": round(border_match_ratio, 6),
            "removed_pixels": removed_pixels,
            "removed_ratio": round(removed_pixels / total_pixels, 6) if total_pixels else 0,
            "feathered_pixels": feathered_pixels,
            "despilled_edge_pixels": despilled_edge_pixels,
        }
    )
    return result


def perfect_pixel(
    input_path: Path,
    output_path: Path,
    *,
    target_width: int | None = None,
    target_height: int | None = None,
    pixel_size: int | None = None,
    colors: int = 32,
    alpha_threshold: int = 128,
    output_scale: int = 1,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if colors < 2 or colors > 256:
        raise ValueError("--colors must be between 2 and 256")
    if not 0 <= alpha_threshold <= 255:
        raise ValueError("--alpha-threshold must be between 0 and 255")
    if output_scale <= 0:
        raise ValueError("--output-scale must be positive")
    with Image.open(input_path) as source:
        rgba = source.convert("RGBA")
        source_width, source_height = rgba.size
        if pixel_size is not None:
            if pixel_size <= 0:
                raise ValueError("--pixel-size must be positive")
            low_width = max(1, round(source_width / pixel_size))
            low_height = max(1, round(source_height / pixel_size))
        else:
            if target_width is None and target_height is None:
                raise ValueError("provide --pixel-size, --target-width, or --target-height")
            if target_width is None:
                low_height = int(target_height)
                low_width = max(1, round(source_width * low_height / source_height))
            elif target_height is None:
                low_width = int(target_width)
                low_height = max(1, round(source_height * low_width / source_width))
            else:
                low_width = int(target_width)
                low_height = int(target_height)
        if low_width <= 0 or low_height <= 0:
            raise ValueError("target pixel dimensions must be positive")

        low = rgba.resize((low_width, low_height), Image.Resampling.NEAREST)
        alpha = low.getchannel("A").point(lambda value: 255 if value >= alpha_threshold else 0)
        rgb = low.convert("RGB").quantize(
            colors=colors,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.NONE,
        ).convert("RGB")
        result_image = rgb.convert("RGBA")
        result_image.putalpha(alpha)
        clean_pixels = [
            (0, 0, 0, 0) if alpha_value == 0 else (red, green, blue, alpha_value)
            for (red, green, blue, alpha_value) in result_image.getdata()
        ]
        result_image.putdata(clean_pixels)
        if output_scale != 1:
            result_image = result_image.resize(
                (low_width * output_scale, low_height * output_scale),
                Image.Resampling.NEAREST,
            )
        _save_rgba(result_image, output_path)
    result = inspect_image(output_path)
    result.update(
        {
            "source": str(input_path),
            "pixel_canvas": {"width": low_width, "height": low_height},
            "colors": colors,
            "alpha_threshold": alpha_threshold,
            "output_scale": output_scale,
        }
    )
    return result


def _merge_boxes(
    boxes: list[tuple[int, int, int, int, int]],
    merge_gap: int,
) -> list[tuple[int, int, int, int, int]]:
    if merge_gap <= 0:
        return boxes
    pending = list(boxes)
    merged: list[tuple[int, int, int, int, int]] = []
    while pending:
        left, top, right, bottom, area = pending.pop(0)
        changed = True
        while changed:
            changed = False
            remaining: list[tuple[int, int, int, int, int]] = []
            for other_left, other_top, other_right, other_bottom, other_area in pending:
                separated = (
                    other_left > right + merge_gap
                    or other_right < left - merge_gap
                    or other_top > bottom + merge_gap
                    or other_bottom < top - merge_gap
                )
                if separated:
                    remaining.append((other_left, other_top, other_right, other_bottom, other_area))
                    continue
                left = min(left, other_left)
                top = min(top, other_top)
                right = max(right, other_right)
                bottom = max(bottom, other_bottom)
                area += other_area
                changed = True
            pending = remaining
        merged.append((left, top, right, bottom, area))
    return merged


def split_components(
    input_path: Path,
    output_dir: Path,
    *,
    prefix: str = "component",
    alpha_threshold: int = 8,
    min_pixels: int = 16,
    padding: int = 0,
    connectivity: int = 8,
    merge_gap: int = 0,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if not 0 <= alpha_threshold <= 255:
        raise ValueError("--alpha-threshold must be between 0 and 255")
    if min_pixels <= 0:
        raise ValueError("--min-pixels must be positive")
    if padding < 0 or merge_gap < 0:
        raise ValueError("--padding and --merge-gap must be non-negative")
    if connectivity not in {4, 8}:
        raise ValueError("--connectivity must be 4 or 8")

    output_dir = output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(input_path) as source:
        image = source.convert("RGBA")
        width, height = image.size
        alpha = bytes(image.getchannel("A").getdata())
        visited = bytearray(width * height)
        neighbor_offsets = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        if connectivity == 8:
            neighbor_offsets.extend([(-1, -1), (1, -1), (-1, 1), (1, 1)])
        boxes: list[tuple[int, int, int, int, int]] = []
        for start in range(width * height):
            if visited[start] or alpha[start] <= alpha_threshold:
                continue
            stack = [start]
            visited[start] = 1
            min_x = max_x = start % width
            min_y = max_y = start // width
            area = 0
            while stack:
                current = stack.pop()
                x = current % width
                y = current // width
                area += 1
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                for dx, dy in neighbor_offsets:
                    nx = x + dx
                    ny = y + dy
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    index = ny * width + nx
                    if visited[index] or alpha[index] <= alpha_threshold:
                        continue
                    visited[index] = 1
                    stack.append(index)
            if area >= min_pixels:
                boxes.append((min_x, min_y, max_x + 1, max_y + 1, area))

        boxes = _merge_boxes(boxes, merge_gap)
        boxes.sort(key=lambda item: (item[1], item[0]))
        outputs: list[dict[str, Any]] = []
        digits = max(2, len(str(max(0, len(boxes) - 1))))
        for index, (left, top, right, bottom, area) in enumerate(boxes):
            crop_box = (
                max(0, left - padding),
                max(0, top - padding),
                min(width, right + padding),
                min(height, bottom + padding),
            )
            output = output_dir / f"{prefix}_{index:0{digits}d}.png"
            image.crop(crop_box).save(output)
            outputs.append(
                {
                    "index": index,
                    "bbox": list(crop_box),
                    "connected_pixels": area,
                    "path": str(output),
                }
            )
    return {
        "source": str(input_path),
        "canvas": {"width": width, "height": height},
        "alpha_threshold": alpha_threshold,
        "connectivity": connectivity,
        "merge_gap": merge_gap,
        "output_count": len(outputs),
        "outputs": outputs,
    }


def normalize_frames(
    input_patterns: Iterable[str],
    output_dir: Path,
    *,
    width: int | None = None,
    height: int | None = None,
    subject_height: int | None = None,
    anchor: str = "bottom-center",
    margin: int = 0,
    prefix: str = "frame",
    fit: str = "error",
    resize_filter: str = "nearest",
) -> dict[str, Any]:
    if anchor not in {"bottom-center", "center", "top-left"}:
        raise ValueError("--anchor must be bottom-center, center, or top-left")
    if margin < 0:
        raise ValueError("--margin must be non-negative")
    if fit not in {"error", "contain"}:
        raise ValueError("--fit must be error or contain")
    if subject_height is not None and subject_height <= 0:
        raise ValueError("--subject-height must be positive")
    filters = {
        "nearest": Image.Resampling.NEAREST,
        "bilinear": Image.Resampling.BILINEAR,
        "bicubic": Image.Resampling.BICUBIC,
        "lanczos": Image.Resampling.LANCZOS,
    }
    if resize_filter not in filters:
        raise ValueError(f"unsupported resize filter: {resize_filter}")
    inputs = expand_input_patterns(input_patterns)
    crops: list[tuple[Path, Image.Image, tuple[int, int, int, int] | None]] = []
    try:
        for path in inputs:
            with Image.open(path) as source:
                rgba = source.convert("RGBA")
                bbox = rgba.getchannel("A").getbbox()
                crop = rgba.crop(bbox) if bbox else Image.new("RGBA", (1, 1), (0, 0, 0, 0))
                crops.append((path, crop, bbox))
        target_width = width or max(crop.width for _, crop, _ in crops) + margin * 2
        target_height = height or max(crop.height for _, crop, _ in crops) + margin * 2
        if target_width <= 0 or target_height <= 0:
            raise ValueError("normalized frame dimensions must be positive")
        available_width = target_width - margin * 2
        available_height = target_height - margin * 2
        if available_width <= 0 or available_height <= 0:
            raise ValueError("--margin leaves no usable normalized canvas")
        max_crop_width = max(crop.width for _, crop, _ in crops)
        max_crop_height = max(crop.height for _, crop, _ in crops)
        shared_scale: float | None = None
        if subject_height is None:
            shared_scale = min(
                1.0,
                available_width / max(max_crop_width, 1),
                available_height / max(max_crop_height, 1),
            )
        elif subject_height > available_height:
            raise ValueError(
                f"--subject-height {subject_height} exceeds available canvas height {available_height}"
            )
        if shared_scale is not None and shared_scale < 1 and fit == "error":
            oversized = next(
                path
                for path, crop, _ in crops
                if crop.width > available_width or crop.height > available_height
            )
            raise ValueError(
                f"frame does not fit normalized canvas: {oversized}; use --fit contain to scale all frames proportionally"
            )
        output_dir = output_dir.expanduser().resolve()
        output_dir.mkdir(parents=True, exist_ok=True)
        outputs: list[dict[str, Any]] = []
        digits = max(2, len(str(max(0, len(crops) - 1))))
        for index, (path, crop, source_bbox) in enumerate(crops):
            original_crop_width, original_crop_height = crop.size
            if subject_height is not None:
                frame_scale = subject_height / max(crop.height, 1)
            else:
                frame_scale = shared_scale if shared_scale is not None else 1.0
            resized_width = max(1, round(crop.width * frame_scale))
            resized_height = max(1, round(crop.height * frame_scale))
            if resized_width > available_width or resized_height > available_height:
                if subject_height is not None:
                    raise ValueError(
                        f"subject-height normalization does not fit canvas: {path} becomes "
                        f"{resized_width}x{resized_height}, available {available_width}x{available_height}"
                    )
                raise ValueError(f"frame does not fit normalized canvas after scaling: {path}")
            if (resized_width, resized_height) != crop.size:
                normalized_crop = crop.resize(
                    (resized_width, resized_height),
                    filters[resize_filter],
                )
            else:
                normalized_crop = crop
            if (
                normalized_crop.width + margin * 2 > target_width
                or normalized_crop.height + margin * 2 > target_height
            ):
                if normalized_crop is not crop:
                    normalized_crop.close()
                raise ValueError(f"frame does not fit normalized canvas after scaling: {path}")
            if anchor == "bottom-center":
                x = (target_width - normalized_crop.width) // 2
                y = target_height - margin - normalized_crop.height
            elif anchor == "center":
                x = (target_width - normalized_crop.width) // 2
                y = (target_height - normalized_crop.height) // 2
            else:
                x = margin
                y = margin
            canvas = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
            canvas.alpha_composite(normalized_crop, (x, y))
            output = output_dir / f"{prefix}_{index:0{digits}d}.png"
            canvas.save(output)
            normalized_size = {"width": normalized_crop.width, "height": normalized_crop.height}
            if normalized_crop is not crop:
                normalized_crop.close()
            outputs.append(
                {
                    "index": index,
                    "source": str(path),
                    "source_bbox": list(source_bbox) if source_bbox else None,
                    "source_crop": {"width": original_crop_width, "height": original_crop_height},
                    "normalized_size": normalized_size,
                    "scale": round(frame_scale, 8),
                    "x": x,
                    "y": y,
                    "path": str(output),
                }
            )
    finally:
        for _, crop, _ in crops:
            crop.close()
    return {
        "canvas": {"width": target_width, "height": target_height},
        "anchor": anchor,
        "margin": margin,
        "fit": fit,
        "resize_filter": resize_filter,
        "scale_mode": "subject-height" if subject_height is not None else "shared-contain",
        "target_subject_height": subject_height,
        "shared_scale": round(shared_scale, 8) if shared_scale is not None else None,
        "count": len(outputs),
        "outputs": outputs,
    }


def prepare_sheet(
    input_path: Path,
    output_dir: Path,
    *,
    cols: int,
    rows: int,
    target_width: int,
    target_height: int,
    key_color: str,
    subject_height: int | None = None,
    tolerance: float = 64.0,
    feather: float = 0.0,
    min_border_match: float = 0.5,
    despill: bool = True,
    anchor: str = "bottom-center",
    margin: int = 2,
    prefix: str = "frame",
    resize_filter: str = "nearest",
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if target_width <= 0 or target_height <= 0:
        raise ValueError("target frame dimensions must be positive")
    output_dir = output_dir.expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    transparent_path = output_dir / "transparent.png"
    chroma = chroma_key(
        input_path,
        transparent_path,
        key_color=key_color,
        tolerance=tolerance,
        feather=feather,
        min_border_match=min_border_match,
        despill=despill,
    )
    split = split_grid(
        transparent_path,
        output_dir / "split",
        cols=cols,
        rows=rows,
        prefix=prefix,
        pad_to_grid=True,
    )
    expected_count = cols * rows
    if split["output_count"] != expected_count:
        raise ValueError(
            f"expected {expected_count} split frames, got {split['output_count']}"
        )
    normalized = normalize_frames(
        [item["path"] for item in split["outputs"]],
        output_dir / "normalized",
        width=target_width,
        height=target_height,
        subject_height=subject_height,
        anchor=anchor,
        margin=margin,
        prefix=prefix,
        fit="contain",
        resize_filter=resize_filter,
    )
    sheet_path = output_dir / "sheet.png"
    composed = compose_grid(
        [item["path"] for item in normalized["outputs"]],
        sheet_path,
        cols=cols,
        cell_width=target_width,
        cell_height=target_height,
    )
    return {
        "source": str(input_path),
        "output_dir": str(output_dir),
        "grid": {"cols": cols, "rows": rows},
        "target_cell": {"width": target_width, "height": target_height},
        "chroma_key": chroma,
        "split": split,
        "normalize": normalized,
        "compose": composed,
        "transparent": str(transparent_path),
        "sheet": str(sheet_path),
        "frames": [item["path"] for item in normalized["outputs"]],
    }


def _opaque_mean_color(image: Image.Image) -> tuple[float, float, float]:
    total_red = total_green = total_blue = count = 0
    for red, green, blue, alpha in image.convert("RGBA").getdata():
        if alpha < 128:
            continue
        total_red += red
        total_green += green
        total_blue += blue
        count += 1
    if count == 0:
        return (0.0, 0.0, 0.0)
    return (total_red / count, total_green / count, total_blue / count)


def _color_similarity(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
) -> float:
    distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))
    return max(0.0, 1.0 - distance / (math.sqrt(3) * 255))


def _normalized_subject_preview(
    image: Image.Image,
    *,
    size: int = 64,
    padding: int = 2,
) -> tuple[Image.Image, Image.Image]:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        empty_rgb = Image.new("RGB", (size, size), (127, 127, 127))
        empty_alpha = Image.new("L", (size, size), 0)
        return empty_rgb, empty_alpha
    subject = rgba.crop(bbox)
    available = max(1, size - padding * 2)
    scale = min(available / max(subject.width, 1), available / max(subject.height, 1))
    resized = subject.resize(
        (
            max(1, round(subject.width * scale)),
            max(1, round(subject.height * scale)),
        ),
        Image.Resampling.BILINEAR,
    )
    normalized = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    normalized.alpha_composite(
        resized,
        (
            (size - resized.width) // 2,
            size - padding - resized.height,
        ),
    )
    opaque_background = Image.new("RGBA", (size, size), (127, 127, 127, 255))
    opaque_background.alpha_composite(normalized)
    return opaque_background.convert("RGB"), normalized.getchannel("A")


def _frame_visual_similarity(left: Image.Image, right: Image.Image) -> tuple[float, float]:
    left_rgb, left_alpha = _normalized_subject_preview(left)
    right_rgb, right_alpha = _normalized_subject_preview(right)
    difference = ImageChops.difference(left_rgb, right_rgb)
    mean_difference = sum(ImageStat.Stat(difference).mean) / 3
    visual_similarity = max(0.0, 1.0 - mean_difference / 255)

    left_mask = left_alpha.point(lambda value: 255 if value >= 128 else 0)
    right_mask = right_alpha.point(lambda value: 255 if value >= 128 else 0)
    intersection = ImageChops.multiply(left_mask, right_mask)
    union = ImageChops.lighter(left_mask, right_mask)
    intersection_pixels = sum(intersection.getdata()) / 255
    union_pixels = sum(union.getdata()) / 255
    alpha_iou = intersection_pixels / union_pixels if union_pixels else 1.0
    return visual_similarity, alpha_iou


def validate_multiview(
    input_patterns: Iterable[str],
    *,
    direction_mode: str = "eight",
    expected_count: int | None = None,
    max_width_deviation: float = 0.2,
    max_height_deviation: float = 0.05,
    max_bottom_gap: int = 2,
    min_palette_similarity: float = 0.35,
    max_duplicate_similarity: float = 0.95,
    min_duplicate_alpha_iou: float = 0.95,
) -> dict[str, Any]:
    inputs = expand_input_patterns(input_patterns)
    direction_orders = {
        "four": ["front", "right", "back", "left"],
        "eight": [
            "front",
            "front-right",
            "right",
            "back-right",
            "back",
            "back-left",
            "left",
            "front-left",
        ],
    }
    if direction_mode not in direction_orders:
        raise ValueError("--mode must be four or eight")
    directions = direction_orders[direction_mode]
    required_count = expected_count if expected_count is not None else len(directions)
    frames: list[dict[str, Any]] = []
    images: list[Image.Image] = []
    mean_colors: list[tuple[float, float, float]] = []
    widths: list[int] = []
    heights: list[int] = []
    for index, path in enumerate(inputs):
        with Image.open(path) as source:
            image = source.convert("RGBA")
            images.append(image)
            bbox = image.getchannel("A").getbbox()
            if bbox is None:
                frame_width = frame_height = 0
                bottom_gap = image.height
            else:
                frame_width = bbox[2] - bbox[0]
                frame_height = bbox[3] - bbox[1]
                bottom_gap = image.height - bbox[3]
            widths.append(frame_width)
            heights.append(frame_height)
            mean_colors.append(_opaque_mean_color(image))
            frames.append(
                {
                    "index": index,
                    "direction": directions[index] if index < len(directions) else f"extra-{index}",
                    "path": str(path),
                    "canvas": {"width": image.width, "height": image.height},
                    "alpha_bbox": list(bbox) if bbox else None,
                    "subject_width": frame_width,
                    "subject_height": frame_height,
                    "bottom_gap": bottom_gap,
                }
            )
    non_zero_widths = [value for value in widths if value > 0]
    non_zero_heights = [value for value in heights if value > 0]
    median_width = sorted(non_zero_widths)[len(non_zero_widths) // 2] if non_zero_widths else 0
    median_height = sorted(non_zero_heights)[len(non_zero_heights) // 2] if non_zero_heights else 0
    reference_color = mean_colors[0] if mean_colors else (0.0, 0.0, 0.0)
    issues: list[str] = []
    if len(inputs) != required_count:
        issues.append(f"expected {required_count} frames, got {len(inputs)}")
    canvas_sizes = {(frame["canvas"]["width"], frame["canvas"]["height"]) for frame in frames}
    if len(canvas_sizes) > 1:
        issues.append("frame canvas sizes differ")
    for frame, mean_color in zip(frames, mean_colors):
        if frame["alpha_bbox"] is None:
            issues.append(f"{frame['direction']}: empty frame")
            frame["palette_similarity"] = 0.0
            continue
        width_deviation = abs(frame["subject_width"] - median_width) / max(median_width, 1)
        height_deviation = abs(frame["subject_height"] - median_height) / max(median_height, 1)
        palette_similarity = _color_similarity(reference_color, mean_color)
        frame["mean_color"] = [round(value, 3) for value in mean_color]
        frame["width_deviation"] = round(width_deviation, 6)
        frame["height_deviation"] = round(height_deviation, 6)
        frame["palette_similarity"] = round(palette_similarity, 6)
        if width_deviation > max_width_deviation:
            issues.append(f"{frame['direction']}: subject width deviation exceeds threshold")
        if height_deviation > max_height_deviation:
            issues.append(f"{frame['direction']}: subject height deviation exceeds threshold")
        if frame["bottom_gap"] > max_bottom_gap:
            issues.append(f"{frame['direction']}: bottom anchor gap {frame['bottom_gap']} exceeds threshold")
        if palette_similarity < min_palette_similarity:
            issues.append(f"{frame['direction']}: palette similarity below threshold")

    pairwise_similarity: list[dict[str, Any]] = []
    duplicate_candidates: list[dict[str, Any]] = []
    for left_index in range(len(images)):
        for right_index in range(left_index + 1, len(images)):
            visual_similarity, alpha_iou = _frame_visual_similarity(
                images[left_index],
                images[right_index],
            )
            pair = {
                "left_index": left_index,
                "left_direction": frames[left_index]["direction"],
                "right_index": right_index,
                "right_direction": frames[right_index]["direction"],
                "visual_similarity": round(visual_similarity, 6),
                "alpha_iou": round(alpha_iou, 6),
            }
            pairwise_similarity.append(pair)
            if (
                visual_similarity > max_duplicate_similarity
                and alpha_iou >= min_duplicate_alpha_iou
            ):
                duplicate_candidates.append(pair)
                issues.append(
                    f"{pair['left_direction']}/{pair['right_direction']}: near-duplicate frames "
                    f"(similarity {pair['visual_similarity']}, alpha_iou {pair['alpha_iou']})"
                )
    pairwise_similarity.sort(
        key=lambda item: (item["visual_similarity"], item["alpha_iou"]),
        reverse=True,
    )
    return {
        "mode": direction_mode,
        "direction_order": directions,
        "expected_count": required_count,
        "actual_count": len(inputs),
        "thresholds": {
            "max_width_deviation": max_width_deviation,
            "max_height_deviation": max_height_deviation,
            "max_bottom_gap": max_bottom_gap,
            "min_palette_similarity": min_palette_similarity,
            "max_duplicate_similarity": max_duplicate_similarity,
            "min_duplicate_alpha_iou": min_duplicate_alpha_iou,
        },
        "median_subject": {"width": median_width, "height": median_height},
        "frames": frames,
        "pairwise_similarity": pairwise_similarity,
        "duplicate_candidates": duplicate_candidates,
        "manual_semantic_review_required": True,
        "issues": issues,
        "passed": not issues,
    }


def make_seamless_blend(
    input_path: Path,
    output_path: Path,
    *,
    horizontal: bool = True,
    vertical: bool = True,
    band: int = 8,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if band <= 0:
        raise ValueError("--band must be positive")
    with Image.open(input_path) as source:
        image = source.convert("RGBA")
        width, height = image.size
        if band * 2 > min(width, height):
            raise ValueError("--band is too large for the image")
        pixels = image.load()
        if horizontal:
            for offset in range(band):
                weight = 1.0 - offset / band
                left_x = offset
                right_x = width - 1 - offset
                for y in range(height):
                    left_pixel = pixels[left_x, y]
                    right_pixel = pixels[right_x, y]
                    average = tuple(round((a + b) / 2) for a, b in zip(left_pixel, right_pixel))
                    pixels[left_x, y] = tuple(
                        round(original * (1 - weight) + target * weight)
                        for original, target in zip(left_pixel, average)
                    )
                    pixels[right_x, y] = tuple(
                        round(original * (1 - weight) + target * weight)
                        for original, target in zip(right_pixel, average)
                    )
        if vertical:
            for offset in range(band):
                weight = 1.0 - offset / band
                top_y = offset
                bottom_y = height - 1 - offset
                for x in range(width):
                    top_pixel = pixels[x, top_y]
                    bottom_pixel = pixels[x, bottom_y]
                    average = tuple(round((a + b) / 2) for a, b in zip(top_pixel, bottom_pixel))
                    pixels[x, top_y] = tuple(
                        round(original * (1 - weight) + target * weight)
                        for original, target in zip(top_pixel, average)
                    )
                    pixels[x, bottom_y] = tuple(
                        round(original * (1 - weight) + target * weight)
                        for original, target in zip(bottom_pixel, average)
                    )
        _save_rgba(image, output_path)
    result = inspect_image(output_path)
    result.update(
        {
            "source": str(input_path),
            "band": band,
            "horizontal": horizontal,
            "vertical": vertical,
            "seam": validate_seam(
                output_path,
                horizontal=horizontal,
                vertical=vertical,
                max_mismatch_ratio=0.0,
                max_mean_abs_diff=0.0,
            ),
        }
    )
    return result


def _tile_texture(image: Image.Image, width: int, height: int) -> Image.Image:
    source = image.convert("RGBA")
    tiled = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for y in range(0, height, source.height):
        for x in range(0, width, source.width):
            tiled.alpha_composite(source, (x, y))
    return tiled


def _dual_grid_mask(mask_index: int, tile_size: int) -> Image.Image:
    top_left = 1 if mask_index & 1 else 0
    top_right = 1 if mask_index & 2 else 0
    bottom_right = 1 if mask_index & 4 else 0
    bottom_left = 1 if mask_index & 8 else 0
    mask = Image.new("L", (tile_size, tile_size), 0)
    pixels = mask.load()
    denominator = max(tile_size - 1, 1)
    for y in range(tile_size):
        v = y / denominator
        for x in range(tile_size):
            u = x / denominator
            value = (
                top_left * (1 - u) * (1 - v)
                + top_right * u * (1 - v)
                + bottom_right * u * v
                + bottom_left * (1 - u) * v
            )
            pixels[x, y] = 255 if value >= 0.5 else 0
    return mask


def build_dual_grid_15(
    foreground_path: Path,
    background_path: Path | None,
    output_path: Path,
    *,
    tile_size: int = 64,
    cols: int = 4,
    transparent_background: bool = False,
) -> dict[str, Any]:
    foreground_path = require_file(foreground_path)
    if background_path is not None:
        background_path = require_file(background_path)
    if tile_size <= 0 or cols <= 0:
        raise ValueError("--tile-size and --cols must be positive")
    with Image.open(foreground_path) as foreground_source:
        foreground = _tile_texture(foreground_source, tile_size, tile_size)
    if transparent_background:
        background = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
    else:
        if background_path is None:
            raise ValueError("--background is required unless --transparent-background is used")
        with Image.open(background_path) as background_source:
            background = _tile_texture(background_source, tile_size, tile_size)
    masks = list(range(1, 16))
    rows = math.ceil(len(masks) / cols)
    sheet = Image.new("RGBA", (cols * tile_size, rows * tile_size), (0, 0, 0, 0))
    entries: list[dict[str, Any]] = []
    for index, mask_index in enumerate(masks):
        cell = background.copy()
        cell.alpha_composite(Image.composite(foreground, Image.new("RGBA", foreground.size), _dual_grid_mask(mask_index, tile_size)))
        row = index // cols
        col = index % cols
        sheet.alpha_composite(cell, (col * tile_size, row * tile_size))
        entries.append({"index": index, "mask": mask_index, "row": row, "col": col})
    _save_rgba(sheet, output_path)
    return {
        "foreground": str(foreground_path),
        "background": str(background_path) if background_path else None,
        "output": str(output_path.expanduser().resolve()),
        "tile_size": tile_size,
        "grid": {"cols": cols, "rows": rows},
        "tile_count": len(entries),
        "tiles": entries,
        "inspection": inspect_image(output_path),
    }


def to_isometric(
    input_path: Path,
    output_path: Path,
    *,
    height_ratio: float = 0.5,
    pixel_art: bool = True,
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if height_ratio <= 0:
        raise ValueError("--height-ratio must be positive")
    resample = Image.Resampling.NEAREST if pixel_art else Image.Resampling.BICUBIC
    with Image.open(input_path) as source:
        image = source.convert("RGBA")
        rotated = image.rotate(45, resample=resample, expand=True)
        bbox = rotated.getchannel("A").getbbox()
        if bbox:
            rotated = rotated.crop(bbox)
        target_height = max(1, round(rotated.height * height_ratio))
        result_image = rotated.resize((rotated.width, target_height), resample)
        _save_rgba(result_image, output_path)
    result = inspect_image(output_path)
    result.update(
        {
            "source": str(input_path),
            "height_ratio": height_ratio,
            "pixel_art": pixel_art,
        }
    )
    return result


def make_hex_tile(
    input_path: Path,
    output_path: Path,
    *,
    orientation: str = "pointy",
) -> dict[str, Any]:
    input_path = require_file(input_path)
    if orientation not in {"pointy", "flat"}:
        raise ValueError("--orientation must be pointy or flat")
    with Image.open(input_path) as source:
        image = source.convert("RGBA")
        width, height = image.size
        mask = Image.new("L", image.size, 0)
        draw = ImageDraw.Draw(mask)
        if orientation == "pointy":
            points = [
                (width // 2, 0),
                (width - 1, height // 4),
                (width - 1, height * 3 // 4),
                (width // 2, height - 1),
                (0, height * 3 // 4),
                (0, height // 4),
            ]
        else:
            points = [
                (width // 4, 0),
                (width * 3 // 4, 0),
                (width - 1, height // 2),
                (width * 3 // 4, height - 1),
                (width // 4, height - 1),
                (0, height // 2),
            ]
        draw.polygon(points, fill=255)
        result_image = Image.new("RGBA", image.size, (0, 0, 0, 0))
        result_image.paste(image, (0, 0), ImageChops.multiply(mask, image.getchannel("A")))
        _save_rgba(result_image, output_path)
    result = inspect_image(output_path)
    result.update({"source": str(input_path), "orientation": orientation})
    return result


def pack_parallax(
    foreground_path: Path,
    midground_path: Path,
    background_path: Path,
    output_dir: Path,
    *,
    width: int | None = None,
    height: int | None = None,
    seamless_horizontal: bool = False,
    seam_band: int = 8,
) -> dict[str, Any]:
    paths = {
        "foreground": require_file(foreground_path),
        "midground": require_file(midground_path),
        "background": require_file(background_path),
    }
    loaded: dict[str, Image.Image] = {}
    try:
        for name, path in paths.items():
            with Image.open(path) as source:
                loaded[name] = source.convert("RGBA")
        target_width = width or max(image.width for image in loaded.values())
        target_height = height or max(image.height for image in loaded.values())
        if target_width <= 0 or target_height <= 0:
            raise ValueError("parallax dimensions must be positive")
        output_dir = output_dir.expanduser().resolve()
        output_dir.mkdir(parents=True, exist_ok=True)
        output_paths: dict[str, str] = {}
        normalized: dict[str, Image.Image] = {}
        for name, image in loaded.items():
            canvas = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
            x = (target_width - image.width) // 2
            y = target_height - image.height
            canvas.alpha_composite(image, (x, y))
            path = output_dir / f"{name}.png"
            canvas.save(path)
            if seamless_horizontal:
                make_seamless_blend(path, path, horizontal=True, vertical=False, band=seam_band)
                with Image.open(path) as seamless_source:
                    canvas = seamless_source.convert("RGBA")
            normalized[name] = canvas
            output_paths[name] = str(path)
        preview = normalized["background"].copy()
        preview.alpha_composite(normalized["midground"])
        preview.alpha_composite(normalized["foreground"])
        preview_path = output_dir / "preview.png"
        preview.save(preview_path)
    finally:
        for image in loaded.values():
            image.close()
        for image in locals().get("normalized", {}).values():
            image.close()
    return {
        "canvas": {"width": target_width, "height": target_height},
        "seamless_horizontal": seamless_horizontal,
        "layers": output_paths,
        "preview": str(preview_path),
    }


def validate_animation(
    input_patterns: Iterable[str],
    *,
    max_bottom_gap: int = 2,
    max_size_deviation: float = 0.3,
    max_loop_mean_diff: float = 80.0,
) -> dict[str, Any]:
    inputs = expand_input_patterns(input_patterns)
    if len(inputs) < 2:
        raise ValueError("animation validation requires at least two frames")
    frames: list[Image.Image] = []
    frame_reports: list[dict[str, Any]] = []
    try:
        for path in inputs:
            with Image.open(path) as source:
                image = source.convert("RGBA")
                frames.append(image)
                bbox = image.getchannel("A").getbbox()
                frame_reports.append(
                    {
                        "path": str(path),
                        "canvas": {"width": image.width, "height": image.height},
                        "alpha_bbox": list(bbox) if bbox else None,
                        "subject_width": bbox[2] - bbox[0] if bbox else 0,
                        "subject_height": bbox[3] - bbox[1] if bbox else 0,
                        "bottom_gap": image.height - bbox[3] if bbox else image.height,
                    }
                )
        canvas_sizes = {(frame.width, frame.height) for frame in frames}
        issues: list[str] = []
        if len(canvas_sizes) != 1:
            issues.append("animation frame canvas sizes differ")
        widths = [item["subject_width"] for item in frame_reports if item["subject_width"] > 0]
        heights = [item["subject_height"] for item in frame_reports if item["subject_height"] > 0]
        median_width = sorted(widths)[len(widths) // 2] if widths else 0
        median_height = sorted(heights)[len(heights) // 2] if heights else 0
        for index, item in enumerate(frame_reports):
            if item["alpha_bbox"] is None:
                issues.append(f"frame {index}: empty")
                continue
            width_deviation = abs(item["subject_width"] - median_width) / max(median_width, 1)
            height_deviation = abs(item["subject_height"] - median_height) / max(median_height, 1)
            item["width_deviation"] = round(width_deviation, 6)
            item["height_deviation"] = round(height_deviation, 6)
            if item["bottom_gap"] > max_bottom_gap:
                issues.append(f"frame {index}: bottom anchor gap exceeds threshold")
            if width_deviation > max_size_deviation or height_deviation > max_size_deviation:
                issues.append(f"frame {index}: subject size deviation exceeds threshold")
        consecutive: list[float] = []
        loop_mean_diff: float | None = None
        if len(canvas_sizes) == 1:
            loop_diff = ImageChops.difference(frames[0], frames[-1])
            mean_channels = ImageStat.Stat(loop_diff).mean
            loop_mean_diff = sum(mean_channels) / len(mean_channels)
            if loop_mean_diff > max_loop_mean_diff:
                issues.append("first/last frame loop difference exceeds threshold")
            for left, right in zip(frames, frames[1:]):
                difference = ImageChops.difference(left, right)
                means = ImageStat.Stat(difference).mean
                consecutive.append(round(sum(means) / len(means), 6))
    finally:
        for frame in frames:
            frame.close()
    return {
        "frame_count": len(inputs),
        "thresholds": {
            "max_bottom_gap": max_bottom_gap,
            "max_size_deviation": max_size_deviation,
            "max_loop_mean_diff": max_loop_mean_diff,
        },
        "median_subject": {"width": median_width, "height": median_height},
        "loop_mean_diff": round(loop_mean_diff, 6) if loop_mean_diff is not None else None,
        "consecutive_mean_diffs": consecutive,
        "frames": frame_reports,
        "issues": issues,
        "passed": not issues,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("capabilities", help="Show local deterministic capabilities and generation boundaries")

    inspect_parser = subparsers.add_parser("inspect", help="Inspect an image")
    inspect_parser.add_argument("--input", required=True, type=Path)
    inspect_parser.add_argument("--output", type=Path)

    resize_parser = subparsers.add_parser("resize", help="Resize an image")
    resize_parser.add_argument("--input", required=True, type=Path)
    resize_parser.add_argument("--output", required=True, type=Path)
    resize_parser.add_argument("--width", type=int)
    resize_parser.add_argument("--height", type=int)
    resize_parser.add_argument("--scale", type=int)
    resize_parser.add_argument("--filter", choices=["nearest", "bilinear", "bicubic", "lanczos"], default="nearest")
    resize_parser.add_argument("--pixel-art", action="store_true")
    resize_parser.add_argument("--allow-non-integer", action="store_true")

    split_parser = subparsers.add_parser("split-grid", help="Split a uniform sprite sheet")
    split_parser.add_argument("--input", required=True, type=Path)
    split_parser.add_argument("--output-dir", required=True, type=Path)
    split_parser.add_argument("--cols", required=True, type=int)
    split_parser.add_argument("--rows", required=True, type=int)
    split_parser.add_argument("--prefix", default="frame")
    split_parser.add_argument("--skip-transparent", action="store_true")
    split_parser.add_argument(
        "--inset",
        type=int,
        default=0,
        help="Trim this many pixels from every edge of each cell after splitting",
    )
    split_parser.add_argument(
        "--pad-to-grid",
        action="store_true",
        help="Pad the right/bottom edges with transparent pixels until the sheet is divisible by the grid",
    )
    split_parser.add_argument("--output", type=Path, help="Optional JSON report path")

    compose_parser = subparsers.add_parser("compose-grid", help="Compose frames into a uniform sprite sheet")
    compose_parser.add_argument("--inputs", required=True, nargs="+")
    compose_parser.add_argument("--output", required=True, type=Path)
    compose_parser.add_argument("--cols", required=True, type=int)
    compose_parser.add_argument("--cell-width", type=int)
    compose_parser.add_argument("--cell-height", type=int)
    compose_parser.add_argument("--align", choices=["center", "top-left"], default="center")
    compose_parser.add_argument("--report", type=Path)

    seam_parser = subparsers.add_parser("validate-seam", help="Compare opposite tile edges")
    seam_parser.add_argument("--input", required=True, type=Path)
    seam_parser.add_argument("--horizontal", action="store_true")
    seam_parser.add_argument("--vertical", action="store_true")
    seam_parser.add_argument("--max-mismatch-ratio", type=float, default=0.0)
    seam_parser.add_argument("--max-mean-abs-diff", type=float, default=0.0)
    seam_parser.add_argument("--output", type=Path)

    seamless_parser = subparsers.add_parser(
        "make-seamless-mirror",
        help="Build an exact tileable 2x2 mirrored texture from one image",
    )
    seamless_parser.add_argument("--input", required=True, type=Path)
    seamless_parser.add_argument("--output", required=True, type=Path)
    seamless_parser.add_argument("--report", type=Path)

    manifest_parser = subparsers.add_parser("manifest", help="Build a JSON manifest for supported assets")
    manifest_parser.add_argument("--root", required=True, type=Path)
    manifest_parser.add_argument("--output", type=Path)

    search_parser = subparsers.add_parser("search-assets", help="Search local image presets by path tokens")
    search_parser.add_argument("--root", required=True, type=Path)
    search_parser.add_argument("--query", required=True)
    search_parser.add_argument("--limit", type=int, default=50)
    search_parser.add_argument("--output", type=Path)

    preview_parser = subparsers.add_parser("tile-preview", help="Build a repeated texture preview")
    preview_parser.add_argument("--input", required=True, type=Path)
    preview_parser.add_argument("--output", required=True, type=Path)
    preview_parser.add_argument("--cols", type=int, default=3)
    preview_parser.add_argument("--rows", type=int, default=3)
    preview_parser.add_argument("--report", type=Path)

    alpha_parser = subparsers.add_parser("clean-alpha", help="Normalize or binarize alpha and clear transparent RGB")
    alpha_parser.add_argument("--input", required=True, type=Path)
    alpha_parser.add_argument("--output", required=True, type=Path)
    alpha_parser.add_argument("--threshold", type=int, default=128)
    alpha_parser.add_argument("--preserve-alpha", action="store_true")
    alpha_parser.add_argument("--keep-transparent-rgb", action="store_true")
    alpha_parser.add_argument("--report", type=Path)

    chroma_parser = subparsers.add_parser("chroma-key", help="Convert a contrasting solid background into alpha")
    chroma_parser.add_argument("--input", required=True, type=Path)
    chroma_parser.add_argument("--output", required=True, type=Path)
    chroma_parser.add_argument("--key", default="#FF00FF")
    chroma_parser.add_argument("--tolerance", type=float, default=64.0)
    chroma_parser.add_argument("--feather", type=float, default=0.0)
    chroma_parser.add_argument("--min-border-match", type=float, default=0.5)
    chroma_parser.add_argument("--no-despill", action="store_true")
    chroma_parser.add_argument("--report", type=Path)

    perfect_parser = subparsers.add_parser("perfect-pixel", help="Create a palette-limited nearest-neighbor pixel asset")
    perfect_parser.add_argument("--input", required=True, type=Path)
    perfect_parser.add_argument("--output", required=True, type=Path)
    perfect_parser.add_argument("--target-width", type=int)
    perfect_parser.add_argument("--target-height", type=int)
    perfect_parser.add_argument("--pixel-size", type=int)
    perfect_parser.add_argument("--colors", type=int, default=32)
    perfect_parser.add_argument("--alpha-threshold", type=int, default=128)
    perfect_parser.add_argument("--output-scale", type=int, default=1)
    perfect_parser.add_argument("--report", type=Path)

    components_parser = subparsers.add_parser("split-components", help="Split transparent UI sheets by alpha connectivity")
    components_parser.add_argument("--input", required=True, type=Path)
    components_parser.add_argument("--output-dir", required=True, type=Path)
    components_parser.add_argument("--prefix", default="component")
    components_parser.add_argument("--alpha-threshold", type=int, default=8)
    components_parser.add_argument("--min-pixels", type=int, default=16)
    components_parser.add_argument("--padding", type=int, default=0)
    components_parser.add_argument("--connectivity", type=int, choices=[4, 8], default=8)
    components_parser.add_argument("--merge-gap", type=int, default=0)
    components_parser.add_argument("--output", type=Path)

    normalize_parser = subparsers.add_parser("normalize-frames", help="Crop and align sprite frames on one canvas")
    normalize_parser.add_argument("--inputs", required=True, nargs="+")
    normalize_parser.add_argument("--output-dir", required=True, type=Path)
    normalize_parser.add_argument("--width", type=int)
    normalize_parser.add_argument("--height", type=int)
    normalize_parser.add_argument("--subject-height", type=int)
    normalize_parser.add_argument("--anchor", choices=["bottom-center", "center", "top-left"], default="bottom-center")
    normalize_parser.add_argument("--margin", type=int, default=0)
    normalize_parser.add_argument("--prefix", default="frame")
    normalize_parser.add_argument("--fit", choices=["error", "contain"], default="error")
    normalize_parser.add_argument(
        "--resize-filter",
        choices=["nearest", "bilinear", "bicubic", "lanczos"],
        default="nearest",
    )
    normalize_parser.add_argument("--output", type=Path)

    prepare_parser = subparsers.add_parser(
        "prepare-sheet",
        help="Chroma-key, pad, split, contain-fit, normalize, and recompose a generated sprite sheet",
    )
    prepare_parser.add_argument("--input", required=True, type=Path)
    prepare_parser.add_argument("--output-dir", required=True, type=Path)
    prepare_parser.add_argument("--cols", required=True, type=int)
    prepare_parser.add_argument("--rows", required=True, type=int)
    prepare_parser.add_argument("--target-width", required=True, type=int)
    prepare_parser.add_argument("--target-height", required=True, type=int)
    prepare_parser.add_argument("--subject-height", type=int)
    prepare_parser.add_argument("--key", required=True)
    prepare_parser.add_argument("--tolerance", type=float, default=64.0)
    prepare_parser.add_argument("--feather", type=float, default=0.0)
    prepare_parser.add_argument("--min-border-match", type=float, default=0.5)
    prepare_parser.add_argument("--no-despill", action="store_true")
    prepare_parser.add_argument("--anchor", choices=["bottom-center", "center", "top-left"], default="bottom-center")
    prepare_parser.add_argument("--margin", type=int, default=2)
    prepare_parser.add_argument("--prefix", default="frame")
    prepare_parser.add_argument(
        "--resize-filter",
        choices=["nearest", "bilinear", "bicubic", "lanczos"],
        default="nearest",
    )
    prepare_parser.add_argument("--output", type=Path)

    multiview_parser = subparsers.add_parser("validate-multiview", help="Validate an ordered four- or eight-direction character set")
    multiview_parser.add_argument("--inputs", required=True, nargs="+")
    multiview_parser.add_argument("--mode", choices=["four", "eight"], default="eight")
    multiview_parser.add_argument("--expected-count", type=int)
    multiview_parser.add_argument("--max-width-deviation", type=float, default=0.2)
    multiview_parser.add_argument("--max-height-deviation", type=float, default=0.05)
    multiview_parser.add_argument("--max-bottom-gap", type=int, default=2)
    multiview_parser.add_argument("--min-palette-similarity", type=float, default=0.35)
    multiview_parser.add_argument("--max-duplicate-similarity", type=float, default=0.95)
    multiview_parser.add_argument("--min-duplicate-alpha-iou", type=float, default=0.95)
    multiview_parser.add_argument("--output", type=Path)

    blend_parser = subparsers.add_parser("make-seamless-blend", help="Blend opposite edge bands into an exact seamless texture")
    blend_parser.add_argument("--input", required=True, type=Path)
    blend_parser.add_argument("--output", required=True, type=Path)
    blend_parser.add_argument("--horizontal", action="store_true")
    blend_parser.add_argument("--vertical", action="store_true")
    blend_parser.add_argument("--band", type=int, default=8)
    blend_parser.add_argument("--report", type=Path)

    dual_grid_parser = subparsers.add_parser("dual-grid-15", help="Build a deterministic 15-tile dual-grid transition sheet")
    dual_grid_parser.add_argument("--foreground", required=True, type=Path)
    dual_grid_parser.add_argument("--background", type=Path)
    dual_grid_parser.add_argument("--output", required=True, type=Path)
    dual_grid_parser.add_argument("--tile-size", type=int, default=64)
    dual_grid_parser.add_argument("--cols", type=int, default=4)
    dual_grid_parser.add_argument("--transparent-background", action="store_true")
    dual_grid_parser.add_argument("--report", type=Path)

    isometric_parser = subparsers.add_parser("to-isometric", help="Convert a top-down tile into a 2:1 isometric diamond")
    isometric_parser.add_argument("--input", required=True, type=Path)
    isometric_parser.add_argument("--output", required=True, type=Path)
    isometric_parser.add_argument("--height-ratio", type=float, default=0.5)
    isometric_parser.add_argument("--smooth", action="store_true")
    isometric_parser.add_argument("--report", type=Path)

    hex_parser = subparsers.add_parser("make-hex", help="Mask an image into a pointy or flat hex tile")
    hex_parser.add_argument("--input", required=True, type=Path)
    hex_parser.add_argument("--output", required=True, type=Path)
    hex_parser.add_argument("--orientation", choices=["pointy", "flat"], default="pointy")
    hex_parser.add_argument("--report", type=Path)

    parallax_parser = subparsers.add_parser("parallax-pack", help="Normalize foreground, midground, background and compose a preview")
    parallax_parser.add_argument("--foreground", required=True, type=Path)
    parallax_parser.add_argument("--midground", required=True, type=Path)
    parallax_parser.add_argument("--background", required=True, type=Path)
    parallax_parser.add_argument("--output-dir", required=True, type=Path)
    parallax_parser.add_argument("--width", type=int)
    parallax_parser.add_argument("--height", type=int)
    parallax_parser.add_argument("--seamless-horizontal", action="store_true")
    parallax_parser.add_argument("--seam-band", type=int, default=8)
    parallax_parser.add_argument("--output", type=Path)

    animation_parser = subparsers.add_parser("validate-animation", help="Validate sprite frame sizing, anchors and loop difference")
    animation_parser.add_argument("--inputs", required=True, nargs="+")
    animation_parser.add_argument("--max-bottom-gap", type=int, default=2)
    animation_parser.add_argument("--max-size-deviation", type=float, default=0.3)
    animation_parser.add_argument("--max-loop-mean-diff", type=float, default=80.0)
    animation_parser.add_argument("--output", type=Path)

    audio_parser = subparsers.add_parser("inspect-audio", help="Inspect WAV or MP3 metadata")
    audio_parser.add_argument("--input", required=True, type=Path)
    audio_parser.add_argument("--output", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "capabilities":
            emit(
                {
                    "pillow_version": PIL.__version__,
                    "local": [
                        "inspect images",
                        "nearest/bilinear/bicubic/lanczos resize",
                        "convert contrasting solid backgrounds into RGBA chroma-key assets",
                        "split uniform sprite sheets with optional transparent grid padding",
                        "compose uniform sprite sheets",
                        "split transparent UI sheets by connected components",
                        "normalize sprite frame canvases and anchors with proportional contain-fit",
                        "prepare generated sprite sheets end-to-end",
                        "validate four- and eight-direction character sets",
                        "validate sprite animation loops",
                        "clean alpha and create palette-limited perfect-pixel assets",
                        "validate opposite tile edges",
                        "construct exact mirrored seamless textures",
                        "blend exact seamless texture edge bands",
                        "build deterministic dual-grid 15 tilesets",
                        "convert top-down tiles to 2:1 isometric diamonds",
                        "mask pointy or flat hex tiles",
                        "pack three-layer parallax backgrounds",
                        "search local image preset folders",
                        "build tiled texture previews",
                        "build image/audio manifests",
                        "inspect WAV and MP3 metadata",
                    ],
                    "semantic_image_generation": "use Codex imagegen tool",
                    "audio_music_video_generation": "unavailable without an explicitly selected provider or local model",
                    "external_api_default": "none",
                }
            )
            return 0
        if args.command == "inspect":
            emit(inspect_image(args.input), args.output)
            return 0
        if args.command == "resize":
            emit(
                resize_image(
                    args.input,
                    args.output,
                    width=args.width,
                    height=args.height,
                    scale=args.scale,
                    filter_name=args.filter,
                    pixel_art=args.pixel_art,
                    allow_non_integer=args.allow_non_integer,
                )
            )
            return 0
        if args.command == "split-grid":
            emit(
                split_grid(
                    args.input,
                    args.output_dir,
                    cols=args.cols,
                    rows=args.rows,
                    prefix=args.prefix,
                    skip_transparent=args.skip_transparent,
                    inset=args.inset,
                    pad_to_grid=args.pad_to_grid,
                ),
                args.output,
            )
            return 0
        if args.command == "compose-grid":
            emit(
                compose_grid(
                    args.inputs,
                    args.output,
                    cols=args.cols,
                    cell_width=args.cell_width,
                    cell_height=args.cell_height,
                    align=args.align,
                ),
                args.report,
            )
            return 0
        if args.command == "validate-seam":
            result = validate_seam(
                args.input,
                horizontal=args.horizontal,
                vertical=args.vertical,
                max_mismatch_ratio=args.max_mismatch_ratio,
                max_mean_abs_diff=args.max_mean_abs_diff,
            )
            emit(result, args.output)
            return 0 if result["passed"] else 2
        if args.command == "make-seamless-mirror":
            emit(make_seamless_mirror(args.input, args.output), args.report)
            return 0
        if args.command == "manifest":
            emit(build_manifest(args.root), args.output)
            return 0
        if args.command == "search-assets":
            emit(search_assets(args.root, args.query, limit=args.limit), args.output)
            return 0
        if args.command == "tile-preview":
            emit(
                tile_preview(
                    args.input,
                    args.output,
                    cols=args.cols,
                    rows=args.rows,
                ),
                args.report,
            )
            return 0
        if args.command == "clean-alpha":
            emit(
                clean_alpha(
                    args.input,
                    args.output,
                    threshold=args.threshold,
                    binary=not args.preserve_alpha,
                    clear_transparent_rgb=not args.keep_transparent_rgb,
                ),
                args.report,
            )
            return 0
        if args.command == "chroma-key":
            emit(
                chroma_key(
                    args.input,
                    args.output,
                    key_color=args.key,
                    tolerance=args.tolerance,
                    feather=args.feather,
                    min_border_match=args.min_border_match,
                    despill=not args.no_despill,
                ),
                args.report,
            )
            return 0
        if args.command == "perfect-pixel":
            emit(
                perfect_pixel(
                    args.input,
                    args.output,
                    target_width=args.target_width,
                    target_height=args.target_height,
                    pixel_size=args.pixel_size,
                    colors=args.colors,
                    alpha_threshold=args.alpha_threshold,
                    output_scale=args.output_scale,
                ),
                args.report,
            )
            return 0
        if args.command == "split-components":
            emit(
                split_components(
                    args.input,
                    args.output_dir,
                    prefix=args.prefix,
                    alpha_threshold=args.alpha_threshold,
                    min_pixels=args.min_pixels,
                    padding=args.padding,
                    connectivity=args.connectivity,
                    merge_gap=args.merge_gap,
                ),
                args.output,
            )
            return 0
        if args.command == "normalize-frames":
            emit(
                normalize_frames(
                    args.inputs,
                    args.output_dir,
                    width=args.width,
                    height=args.height,
                    subject_height=args.subject_height,
                    anchor=args.anchor,
                    margin=args.margin,
                    prefix=args.prefix,
                    fit=args.fit,
                    resize_filter=args.resize_filter,
                ),
                args.output,
            )
            return 0
        if args.command == "prepare-sheet":
            emit(
                prepare_sheet(
                    args.input,
                    args.output_dir,
                    cols=args.cols,
                    rows=args.rows,
                    target_width=args.target_width,
                    target_height=args.target_height,
                    key_color=args.key,
                    subject_height=args.subject_height,
                    tolerance=args.tolerance,
                    feather=args.feather,
                    min_border_match=args.min_border_match,
                    despill=not args.no_despill,
                    anchor=args.anchor,
                    margin=args.margin,
                    prefix=args.prefix,
                    resize_filter=args.resize_filter,
                ),
                args.output,
            )
            return 0
        if args.command == "validate-multiview":
            result = validate_multiview(
                args.inputs,
                direction_mode=args.mode,
                expected_count=args.expected_count,
                max_width_deviation=args.max_width_deviation,
                max_height_deviation=args.max_height_deviation,
                max_bottom_gap=args.max_bottom_gap,
                min_palette_similarity=args.min_palette_similarity,
                max_duplicate_similarity=args.max_duplicate_similarity,
                min_duplicate_alpha_iou=args.min_duplicate_alpha_iou,
            )
            emit(result, args.output)
            return 0 if result["passed"] else 2
        if args.command == "make-seamless-blend":
            horizontal = args.horizontal
            vertical = args.vertical
            if not horizontal and not vertical:
                horizontal = vertical = True
            emit(
                make_seamless_blend(
                    args.input,
                    args.output,
                    horizontal=horizontal,
                    vertical=vertical,
                    band=args.band,
                ),
                args.report,
            )
            return 0
        if args.command == "dual-grid-15":
            emit(
                build_dual_grid_15(
                    args.foreground,
                    args.background,
                    args.output,
                    tile_size=args.tile_size,
                    cols=args.cols,
                    transparent_background=args.transparent_background,
                ),
                args.report,
            )
            return 0
        if args.command == "to-isometric":
            emit(
                to_isometric(
                    args.input,
                    args.output,
                    height_ratio=args.height_ratio,
                    pixel_art=not args.smooth,
                ),
                args.report,
            )
            return 0
        if args.command == "make-hex":
            emit(make_hex_tile(args.input, args.output, orientation=args.orientation), args.report)
            return 0
        if args.command == "parallax-pack":
            emit(
                pack_parallax(
                    args.foreground,
                    args.midground,
                    args.background,
                    args.output_dir,
                    width=args.width,
                    height=args.height,
                    seamless_horizontal=args.seamless_horizontal,
                    seam_band=args.seam_band,
                ),
                args.output,
            )
            return 0
        if args.command == "validate-animation":
            result = validate_animation(
                args.inputs,
                max_bottom_gap=args.max_bottom_gap,
                max_size_deviation=args.max_size_deviation,
                max_loop_mean_diff=args.max_loop_mean_diff,
            )
            emit(result, args.output)
            return 0 if result["passed"] else 2
        if args.command == "inspect-audio":
            emit(inspect_audio(args.input), args.output)
            return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc), "command": args.command}, ensure_ascii=False), file=sys.stderr)
        return 1
    raise AssertionError(f"unhandled command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
