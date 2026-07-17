#!/usr/bin/env python3
"""End-to-end self-test for the deterministic game asset pipeline."""

from __future__ import annotations

import argparse
import json
import math
import struct
import tempfile
import wave
from pathlib import Path

from PIL import Image, ImageDraw

import asset_pipeline as pipeline


def create_frame(path: Path, color: tuple[int, int, int, int], offset: int) -> None:
    image = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rectangle((3 + offset, 3, 10 + offset, 12), fill=color)
    draw.point((5 + offset, 5), fill=(255, 255, 255, 255))
    image.save(path)


def create_sized_frame(
    path: Path,
    color: tuple[int, int, int, int],
    subject_width: int,
    subject_height: int,
) -> None:
    image = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    left = (16 - subject_width) // 2
    bottom = 12
    top = bottom - subject_height + 1
    draw = ImageDraw.Draw(image)
    draw.rectangle(
        (left, top, left + subject_width - 1, bottom),
        fill=color,
    )
    draw.point((left + 1, top + 1), fill=(255, 255, 255, 255))
    image.save(path)


def create_wav(path: Path) -> None:
    sample_rate = 8000
    duration = 0.1
    samples = []
    for index in range(round(sample_rate * duration)):
        value = round(8000 * math.sin(2 * math.pi * 440 * index / sample_rate))
        samples.append(struct.pack("<h", value))
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(b"".join(samples))


def run(output_dir: Path) -> dict[str, object]:
    output_dir.mkdir(parents=True, exist_ok=True)
    frame_dir = output_dir / "source_frames"
    frame_dir.mkdir(exist_ok=True)
    colors = [
        (230, 70, 70, 255),
        (70, 190, 90, 255),
        (70, 120, 230, 255),
        (230, 190, 70, 255),
    ]
    frame_paths = []
    for index, color in enumerate(colors):
        path = frame_dir / f"frame_{index:02d}.png"
        create_frame(path, color, index % 2)
        frame_paths.append(path)

    sheet_path = output_dir / "sheet.png"
    composed = pipeline.compose_grid([str(path) for path in frame_paths], sheet_path, cols=2)
    assert composed["frame_count"] == 4
    assert composed["inspection"]["width"] == 32
    assert composed["inspection"]["height"] == 32

    split_dir = output_dir / "split_frames"
    split = pipeline.split_grid(sheet_path, split_dir, cols=2, rows=2, prefix="idle")
    assert split["output_count"] == 4
    assert split["cell"] == {"width": 16, "height": 16}

    inset_dir = output_dir / "inset_frames"
    inset_split = pipeline.split_grid(
        sheet_path,
        inset_dir,
        cols=2,
        rows=2,
        prefix="trimmed",
        inset=1,
    )
    assert inset_split["source_cell"] == {"width": 16, "height": 16}
    assert inset_split["cell"] == {"width": 14, "height": 14}

    resized_path = output_dir / "frame_2x.png"
    resized = pipeline.resize_image(frame_paths[0], resized_path, scale=2, pixel_art=True)
    assert resized["width"] == 32 and resized["height"] == 32
    assert resized["filter"] == "nearest"

    tile_path = output_dir / "seamless_tile.png"
    tile = Image.new("RGBA", (8, 8), (40, 120, 80, 255))
    tile.save(tile_path)
    seam = pipeline.validate_seam(tile_path, horizontal=True, vertical=True)
    assert seam["passed"] is True

    non_seamless_path = output_dir / "non_seamless_tile.png"
    non_seamless = Image.new("RGBA", (8, 8), (40, 120, 80, 255))
    ImageDraw.Draw(non_seamless).rectangle((0, 0, 2, 7), fill=(180, 70, 40, 255))
    non_seamless.save(non_seamless_path)
    mirrored_tile_path = output_dir / "mirrored_seamless_tile.png"
    mirrored = pipeline.make_seamless_mirror(non_seamless_path, mirrored_tile_path)
    assert mirrored["width"] == 16 and mirrored["height"] == 16
    assert mirrored["seam"]["passed"] is True

    blended_tile_path = output_dir / "blended_seamless_tile.png"
    blended = pipeline.make_seamless_blend(
        non_seamless_path,
        blended_tile_path,
        horizontal=True,
        vertical=True,
        band=2,
    )
    assert blended["seam"]["passed"] is True

    alpha_source_path = output_dir / "alpha_source.png"
    alpha_source = Image.new("RGBA", (8, 8), (120, 80, 40, 0))
    ImageDraw.Draw(alpha_source).rectangle((2, 2, 5, 5), fill=(220, 120, 50, 180))
    alpha_source.save(alpha_source_path)
    alpha_clean_path = output_dir / "alpha_clean.png"
    alpha_clean = pipeline.clean_alpha(alpha_source_path, alpha_clean_path, threshold=128)
    assert alpha_clean["translucent_pixels"] == 0

    chroma_ring_source_path = output_dir / "chroma_ring_source.png"
    chroma_ring_source = Image.new("RGB", (16, 16), (255, 0, 255))
    chroma_ring_draw = ImageDraw.Draw(chroma_ring_source)
    chroma_ring_draw.rectangle((3, 3, 12, 12), fill=(40, 180, 210))
    chroma_ring_draw.rectangle((6, 6, 9, 9), fill=(255, 0, 255))
    chroma_ring_draw.point((3, 3), fill=(130, 10, 160))
    chroma_ring_source.save(chroma_ring_source_path)
    chroma_ring_path = output_dir / "chroma_ring.png"
    chroma_ring = pipeline.chroma_key(
        chroma_ring_source_path,
        chroma_ring_path,
        key_color="#FF00FF",
        tolerance=8,
    )
    assert chroma_ring["has_alpha"] is True
    assert chroma_ring["border_match_ratio"] == 1.0
    with Image.open(chroma_ring_path) as keyed_ring:
        alpha = keyed_ring.convert("RGBA").getchannel("A")
        assert alpha.getpixel((0, 0)) == 0
        assert alpha.getpixel((4, 4)) == 255
        assert alpha.getpixel((7, 7)) == 0
        assert keyed_ring.convert("RGBA").getpixel((3, 3))[:3] == (10, 10, 40)

    for name, key_hex, key_rgb, subject_rgb in (
        ("green", "#00FF00", (0, 255, 0), (220, 70, 70)),
        ("blue", "#0000FF", (0, 0, 255), (230, 200, 70)),
    ):
        source_path = output_dir / f"chroma_{name}_source.png"
        source_image = Image.new("RGB", (8, 8), key_rgb)
        ImageDraw.Draw(source_image).rectangle((2, 2, 5, 5), fill=subject_rgb)
        source_image.save(source_path)
        output_path = output_dir / f"chroma_{name}.png"
        keyed = pipeline.chroma_key(
            source_path,
            output_path,
            key_color=key_hex,
            tolerance=8,
        )
        assert keyed["transparent_pixels"] == 48
        assert keyed["opaque_pixels"] == 16

    generated_sheet_source_path = output_dir / "generated_sheet_chroma.png"
    generated_sheet = Image.new("RGB", (35, 19), (255, 0, 255))
    generated_draw = ImageDraw.Draw(generated_sheet)
    for left, top in ((1, 1), (19, 1), (1, 11), (19, 11)):
        generated_draw.rectangle((left, top, left + 15, top + 7), fill=(40, 180, 210))
        generated_draw.point((left + 4, top + 2), fill=(255, 240, 120))
    generated_sheet.save(generated_sheet_source_path)
    prepared_dir = output_dir / "prepared_sheet"
    prepared = pipeline.prepare_sheet(
        generated_sheet_source_path,
        prepared_dir,
        cols=2,
        rows=2,
        target_width=12,
        target_height=12,
        key_color="#FF00FF",
        tolerance=8,
        margin=1,
    )
    assert prepared["split"]["prepared_canvas"] == {"width": 36, "height": 20}
    assert prepared["split"]["padding"] == {"right": 1, "bottom": 1}
    assert prepared["normalize"]["shared_scale"] < 1
    assert prepared["compose"]["inspection"]["width"] == 24
    assert prepared["compose"]["inspection"]["height"] == 24
    prepared_four = pipeline.validate_multiview(
        prepared["frames"],
        direction_mode="four",
        max_bottom_gap=1,
        min_palette_similarity=0.9,
        max_duplicate_similarity=1.0,
    )
    assert prepared_four["passed"] is True
    assert prepared_four["direction_order"] == ["front", "right", "back", "left"]

    perfect_pixel_path = output_dir / "perfect_pixel.png"
    perfect_pixel = pipeline.perfect_pixel(
        resized_path,
        perfect_pixel_path,
        target_width=8,
        colors=8,
        output_scale=2,
    )
    assert perfect_pixel["width"] == 16 and perfect_pixel["height"] == 16
    assert perfect_pixel["translucent_pixels"] == 0

    ui_sheet_path = output_dir / "ui_sheet.png"
    ui_sheet = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    ui_draw = ImageDraw.Draw(ui_sheet)
    ui_draw.rectangle((2, 2, 13, 13), fill=(220, 80, 80, 255))
    ui_draw.rectangle((24, 3, 39, 15), fill=(80, 220, 100, 255))
    ui_draw.rectangle((48, 4, 61, 19), fill=(80, 120, 220, 255))
    ui_sheet.save(ui_sheet_path)
    components_dir = output_dir / "ui_components"
    components = pipeline.split_components(ui_sheet_path, components_dir, min_pixels=16)
    assert components["output_count"] == 3

    multiview_source_dir = output_dir / "multiview_source"
    multiview_source_dir.mkdir(exist_ok=True)
    multiview_paths = []
    for index in range(8):
        path = multiview_source_dir / f"direction_{index:02d}.png"
        subject_height = 8 if index < 4 else 12
        subject_width = 6 if index < 4 else 9
        create_sized_frame(
            path,
            (180, 90 + index * 4, 70, 255),
            subject_width,
            subject_height,
        )
        multiview_paths.append(path)
    inconsistent_multiview = pipeline.validate_multiview(
        [str(path) for path in multiview_paths],
        direction_mode="eight",
        max_bottom_gap=3,
        min_palette_similarity=0.1,
    )
    assert inconsistent_multiview["passed"] is False
    assert any("height deviation" in issue for issue in inconsistent_multiview["issues"])
    multiview_normalized_dir = output_dir / "multiview_normalized"
    normalized = pipeline.normalize_frames(
        [str(path) for path in multiview_paths],
        multiview_normalized_dir,
        width=20,
        height=20,
        subject_height=12,
        anchor="bottom-center",
    )
    assert normalized["count"] == 8
    assert normalized["scale_mode"] == "subject-height"
    assert normalized["target_subject_height"] == 12
    assert normalized["shared_scale"] is None
    assert {item["normalized_size"]["height"] for item in normalized["outputs"]} == {12}
    multiview = pipeline.validate_multiview(
        [item["path"] for item in normalized["outputs"]],
        direction_mode="eight",
        max_bottom_gap=0,
        min_palette_similarity=0.1,
        max_duplicate_similarity=1.0,
    )
    assert multiview["passed"] is True

    duplicate_paths = [item["path"] for item in normalized["outputs"]]
    duplicate_front_left_path = output_dir / "duplicate_front_left.png"
    with Image.open(duplicate_paths[1]) as duplicate_source:
        duplicate_source.save(duplicate_front_left_path)
    duplicate_paths[-1] = str(duplicate_front_left_path)
    duplicate_multiview = pipeline.validate_multiview(
        duplicate_paths,
        direction_mode="eight",
        max_bottom_gap=0,
        min_palette_similarity=0.1,
    )
    assert duplicate_multiview["passed"] is False
    assert any(
        "front-right/front-left: near-duplicate frames" in issue
        for issue in duplicate_multiview["issues"]
    )

    animation_loop_end = output_dir / "animation_loop_end.png"
    with Image.open(normalized["outputs"][0]["path"]) as loop_source:
        loop_source.save(animation_loop_end)
    animation_paths = [
        normalized["outputs"][0]["path"],
        normalized["outputs"][1]["path"],
        str(animation_loop_end),
    ]
    animation = pipeline.validate_animation(
        animation_paths,
        max_bottom_gap=0,
        max_loop_mean_diff=0,
    )
    assert animation["passed"] is True

    foreground_texture_path = output_dir / "foreground_texture.png"
    background_texture_path = output_dir / "background_texture.png"
    Image.new("RGBA", (8, 8), (60, 170, 70, 255)).save(foreground_texture_path)
    Image.new("RGBA", (8, 8), (40, 80, 180, 255)).save(background_texture_path)
    dual_grid_path = output_dir / "dual_grid_15.png"
    dual_grid = pipeline.build_dual_grid_15(
        foreground_texture_path,
        background_texture_path,
        dual_grid_path,
        tile_size=16,
    )
    assert dual_grid["tile_count"] == 15
    assert dual_grid["inspection"]["width"] == 64
    assert dual_grid["inspection"]["height"] == 64
    tiled_preview_path = output_dir / "dual_grid_preview.png"
    tiled_preview = pipeline.tile_preview(dual_grid_path, tiled_preview_path, cols=2, rows=2)
    assert tiled_preview["width"] == 128 and tiled_preview["height"] == 128
    search = pipeline.search_assets(output_dir, "dual grid")
    assert any(item["path"] == "dual_grid_15.png" for item in search["results"])

    isometric_path = output_dir / "isometric_tile.png"
    isometric = pipeline.to_isometric(foreground_texture_path, isometric_path)
    assert isometric["has_alpha"] is True
    assert isometric["height"] < isometric["width"]

    hex_path = output_dir / "hex_tile.png"
    hex_tile = pipeline.make_hex_tile(foreground_texture_path, hex_path)
    assert hex_tile["transparent_pixels"] > 0

    parallax_dir = output_dir / "parallax"
    parallax = pipeline.pack_parallax(
        ui_sheet_path,
        alpha_source_path,
        background_texture_path,
        parallax_dir,
        width=64,
        height=32,
    )
    assert Path(parallax["preview"]).is_file()

    audio_path = output_dir / "tone.wav"
    create_wav(audio_path)
    audio = pipeline.inspect_audio(audio_path)
    assert audio["sample_rate"] == 8000
    assert 0.09 <= audio["duration_seconds"] <= 0.11

    manifest_path = output_dir / "manifest.json"
    manifest = pipeline.build_manifest(output_dir)
    pipeline.emit(manifest, manifest_path)
    assert manifest["count"] >= 12

    return {
        "assertion": "PASS",
        "output_dir": str(output_dir),
        "sheet": str(sheet_path),
        "resized": str(resized_path),
        "tile": str(tile_path),
        "audio": str(audio_path),
        "manifest_count": manifest["count"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    if args.output_dir:
        result = run(args.output_dir.expanduser().resolve())
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    with tempfile.TemporaryDirectory(prefix="game-asset-pipeline-") as temp_dir:
        result = run(Path(temp_dir))
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
