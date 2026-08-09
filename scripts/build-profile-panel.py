from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


def build_panel(
    source_path: Path,
    mask_path: Path,
    plate_path: Path,
    output_path: Path,
    exclude_mask_path: Path | None = None,
) -> None:
    source = Image.open(source_path).convert("RGB")
    mask = Image.open(mask_path).convert("L")

    if exclude_mask_path is not None:
        exclude_mask = Image.open(exclude_mask_path).convert("L")
        if exclude_mask.size != mask.size:
            raise ValueError(f"mask {mask.size} and exclude mask {exclude_mask.size} must match")
        mask = ImageChops.subtract(mask, exclude_mask)

    # Contract the coarse Vision mask before feathering so pavement and dark
    # edge halos are not carried into the final cutout. The source photograph
    # ends through the hair, so taper that boundary instead of leaving a hard,
    # rectangular photo edge inside the panel.
    mask = mask.filter(ImageFilter.MinFilter(11)).filter(ImageFilter.GaussianBlur(3))
    fade_height = 96
    boundary_fade = Image.new("L", mask.size, 255)
    fade_strip = Image.linear_gradient("L").transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    fade_strip = fade_strip.resize((mask.width, fade_height), Image.Resampling.BILINEAR)
    boundary_fade.paste(fade_strip, (0, mask.height - fade_height))
    mask = ImageChops.multiply(mask, boundary_fade)

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
    plate = ImageEnhance.Brightness(plate).enhance(0.92)

    position = (492, 105)
    subject_layer = Image.new("RGBA", plate.size, (0, 0, 0, 0))
    subject_layer.alpha_composite(subject, position)

    # Keep the photograph behind the physical silver frame. This hides the
    # source-photo boundary at the extended arm and makes it end at the panel
    # edge instead of floating over the border.
    interior_clip = Image.new("L", plate.size, 0)
    ImageDraw.Draw(interior_clip).rectangle((36, 36, 1064, 964), fill=255)
    subject_layer.putalpha(ImageChops.multiply(subject_layer.getchannel("A"), interior_clip))
    plate.alpha_composite(subject_layer)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    plate.save(output_path, format="PNG", optimize=True)
    plate.convert("RGB").save(output_path.with_suffix(".webp"), format="WEBP", quality=90, method=6)


if __name__ == "__main__":
    if len(sys.argv) not in (5, 6):
        raise SystemExit("usage: build-profile-panel.py SOURCE MASK PLATE OUTPUT [EXCLUDE_MASK]")
    values = [Path(value) for value in sys.argv[1:]]
    build_panel(*values)
