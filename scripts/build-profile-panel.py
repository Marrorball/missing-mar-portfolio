from pathlib import Path
import sys

from PIL import Image, ImageEnhance, ImageFilter


def build_panel(source_path: Path, mask_path: Path, plate_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGB")
    mask = Image.open(mask_path).convert("L")

    if source.size != mask.size:
        raise ValueError(f"source {source.size} and mask {mask.size} must match")

    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("foreground mask is empty")

    subject = source.convert("RGBA")
    subject.putalpha(mask)
    subject = subject.crop(bbox)

    rgb = subject.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.04)
    rgb = ImageEnhance.Color(rgb).enhance(0.96)
    rgb.putalpha(subject.getchannel("A"))
    subject = rgb

    target_height = 700
    target_width = round(subject.width * target_height / subject.height)
    subject = subject.resize((target_width, target_height), Image.Resampling.LANCZOS)

    plate = Image.open(plate_path).convert("RGBA")
    plate = plate.resize((1100, 1000), Image.Resampling.LANCZOS)

    shadow_alpha = subject.getchannel("A").filter(ImageFilter.GaussianBlur(10))
    shadow = Image.new("RGBA", subject.size, (8, 10, 13, 0))
    shadow.putalpha(shadow_alpha.point(lambda value: round(value * 0.24)))

    position = (300, 105)
    plate.alpha_composite(shadow, (position[0] + 8, position[1] + 12))
    plate.alpha_composite(subject, position)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    plate.save(output_path, format="PNG", optimize=True)
    plate.convert("RGB").save(output_path.with_suffix(".webp"), format="WEBP", quality=90, method=6)


if __name__ == "__main__":
    if len(sys.argv) != 5:
        raise SystemExit("usage: build-profile-panel.py SOURCE MASK PLATE OUTPUT")
    build_panel(*(Path(value) for value in sys.argv[1:]))
