from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
WIDTH, HEIGHT = 1200, 630


def font(size, bold=False):
    name = "seguisb.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def rounded_paste(canvas, source, box, radius=24):
    size = (box[2] - box[0], box[3] - box[1])
    source = ImageOps.fit(source.convert("RGB"), size, Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    canvas.paste(source, box[:2], mask)


def main():
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#19130f")
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((-140, -180, 510, 470), fill="#3b2117")
    draw.ellipse((930, 430, 1330, 830), fill="#542718")

    icon = Image.open(ROOT / "assets" / "icons" / "icon-128.png").convert("RGBA")
    canvas.paste(icon.resize((58, 58), Image.Resampling.LANCZOS), (68, 58), icon.resize((58, 58), Image.Resampling.LANCZOS))
    draw.text((142, 67), "OPEN-SOURCE WINDOWS APP", font=font(18, True), fill="#ffb184")

    draw.text((65, 145), "Cat Canvas", font=font(70, True), fill="#fff8ed")
    draw.text((65, 222), "Desktop", font=font(70, True), fill="#fff8ed")
    draw.multiline_text(
        (70, 325),
        "Draw a box anywhere.\nFill it with a cat image or GIF.",
        font=font(26),
        fill="#dccbbf",
        spacing=9,
    )

    pills = (("MULTI-MONITOR", 70), ("LOCAL ONLY", 245), ("NO ACCOUNTS", 380))
    for label, x in pills:
        width = int(draw.textlength(label, font=font(13, True))) + 30
        draw.rounded_rectangle((x, 445, x + width, 481), 18, fill="#3f2e25", outline="#70503e")
        draw.text((x + 15, 454), label, font=font(13, True), fill="#ffd5bd")

    preview = Image.open(DOCS / "overlay-preview.png").convert("RGB").crop((87, 107, 781, 607))
    draw.rounded_rectangle((594, 54, 1140, 447), 30, fill="#000000", outline="#ff7540", width=4)
    rounded_paste(canvas, preview, (602, 62, 1132, 439), 23)

    picker = Image.open(DOCS / "picker.png").convert("RGB")
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((860, 238, 1128, 586), 20, fill="#00000080")
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
    rounded_paste(canvas, picker, (872, 226, 1118, 584), 17)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((872, 226, 1118, 584), 17, outline="#fff2e2", width=3)

    draw.text((70, 555), "github.com/Yusuf-Karanib/cat-canvas-desktop", font=font(20, True), fill="#ff9560")
    canvas.save(DOCS / "launch-card.png", optimize=True)


if __name__ == "__main__":
    main()
