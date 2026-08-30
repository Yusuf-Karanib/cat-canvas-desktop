from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
WIDTH, HEIGHT = 800, 500


def font(size, bold=False):
    name = "seguisb.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def base_screen():
    image = Image.new("RGB", (WIDTH, HEIGHT), "#171a20")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((18, 18, 782, 480), 18, fill="#f7f8fb")
    draw.rounded_rectangle((18, 18, 782, 58), 18, fill="#272b34")
    draw.rectangle((18, 40, 782, 58), fill="#272b34")
    for index, color in enumerate(("#ff6b5f", "#ffc34d", "#5fc97a")):
        x = 38 + index * 22
        draw.ellipse((x, 31, x + 10, 41), fill=color)
    draw.rounded_rectangle((125, 28, 615, 48), 10, fill="#3a3f49")
    draw.text((142, 30), "An app on your screen", font=font(11), fill="#dfe3ea")
    draw.rounded_rectangle((38, 78, 185, 454), 12, fill="#eceff4")
    draw.text((58, 99), "Workspace", font=font(15, True), fill="#2d3440")
    for index, label in enumerate(("Home", "Projects", "Photos", "Settings")):
        y = 140 + index * 45
        fill = "#fff" if index == 0 else "#eceff4"
        draw.rounded_rectangle((49, y - 8, 174, y + 24), 8, fill=fill)
        draw.text((64, y), label, font=font(12), fill="#596273")
    draw.text((218, 84), "Your workspace", font=font(24, True), fill="#242b36")
    draw.text((219, 119), "Cat Canvas stays above the app underneath.", font=font(13), fill="#727b89")
    for row in range(2):
        for column in range(2):
            x = 218 + column * 255
            y = 160 + row * 135
            draw.rounded_rectangle((x, y, x + 228, y + 108), 12, fill="#ffffff", outline="#dfe3ea", width=2)
            draw.rounded_rectangle((x + 16, y + 16, x + 68, y + 68), 9, fill="#e8edf4")
            draw.rounded_rectangle((x + 84, y + 20, x + 202, y + 31), 5, fill="#d4dae3")
            draw.rounded_rectangle((x + 84, y + 43, x + 184, y + 52), 4, fill="#e3e7ed")
            draw.rounded_rectangle((x + 16, y + 82, x + 153, y + 90), 4, fill="#edf0f4")
    return image


def add_banner(image, title, detail):
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((32, 428, 768, 476), 13, fill="#30251eee")
    draw.text((50, 438), title, font=font(15, True), fill="white")
    detail_width = draw.textlength(detail, font=font(12))
    draw.text((750 - detail_width, 441), detail, font=font(12), fill="#ffd5bd")


def add_cursor(image, x, y):
    draw = ImageDraw.Draw(image)
    points = [(x, y), (x + 3, y + 23), (x + 9, y + 17), (x + 15, y + 28), (x + 20, y + 25), (x + 14, y + 15), (x + 23, y + 13)]
    draw.polygon(points, fill="white", outline="#171a20")


def paste_rounded(destination, source, box, radius=14):
    source = ImageOps.fit(source.convert("RGB"), (box[2] - box[0], box[3] - box[1]), Image.Resampling.LANCZOS)
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, source.width - 1, source.height - 1), radius, fill=255)
    destination.paste(source, box[:2], mask)


def picker_frames(picker):
    frames, durations = [], []
    for step in range(6):
        frame = base_screen()
        x = 800 - int((step + 1) / 6 * 282)
        panel = ImageOps.fit(picker, (250, 438), Image.Resampling.LANCZOS, centering=(0.5, 0.0))
        shadow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((x - 7, 54, x + 257, 500), 17, fill="#00000035")
        frame = Image.alpha_composite(frame.convert("RGBA"), shadow).convert("RGB")
        paste_rounded(frame, panel, (x, 48, x + 250, 486), 15)
        add_cursor(frame, x + 188, 72)
        add_banner(frame, "1. Pick media and a screen", "Random · Favorites · GIFs")
        frames.append(frame)
        durations.append(110)
    durations[-1] = 1200
    return frames, durations


def drawing_frames():
    frames, durations = [], []
    start = (245, 155)
    end = (680, 385)
    for step in range(9):
        frame = base_screen()
        progress = step / 8
        current = (int(start[0] + (end[0] - start[0]) * progress), int(start[1] + (end[1] - start[1]) * progress))
        overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        draw.rounded_rectangle((start[0], start[1], current[0], current[1]), 12, fill="#ff92582c", outline="#ff7b45", width=4)
        frame = Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")
        add_cursor(frame, current[0] - 2, current[1] - 2)
        add_banner(frame, "2. Draw the exact box", "Works on every connected screen")
        frames.append(frame)
        durations.append(95)
    durations[-1] = 450
    return frames, durations


def placed_frames(cat_photo):
    frames, durations = [], []
    for title, detail, duration in (
        ("3. Your cat appears above the app", "Move · resize · next screen", 1500),
        ("Lock it when you are done", "Clicks pass through underneath", 1400),
        ("Cat Canvas Desktop", "Temporary · local · open source", 1700),
    ):
        frame = base_screen()
        paste_rounded(frame, cat_photo, (245, 155, 680, 385), 13)
        draw = ImageDraw.Draw(frame)
        draw.rounded_rectangle((245, 155, 680, 385), 13, outline="#ff7b45", width=3)
        for index, symbol in enumerate(("M", "R", "S", "L", "×")):
            x = 255 + index * 35
            draw.rounded_rectangle((x, 165, x + 28, 193), 7, fill="#30251ee8")
            symbol_font = font(13, True)
            symbol_box = draw.textbbox((0, 0), symbol, font=symbol_font)
            draw.text((x + (28 - (symbol_box[2] - symbol_box[0])) / 2, 170), symbol, font=symbol_font, fill="white")
        add_banner(frame, title, detail)
        frames.append(frame)
        durations.append(duration)
    return frames, durations


def main():
    picker = Image.open(DOCS / "picker.png").convert("RGB")
    overlay = Image.open(DOCS / "overlay-preview.png").convert("RGB")
    cat_photo = overlay.crop((87, 107, 781, 607))

    frames = [base_screen()]
    durations = [700]
    next_frames, next_durations = picker_frames(picker)
    frames.extend(next_frames)
    durations.extend(next_durations)
    next_frames, next_durations = drawing_frames()
    frames.extend(next_frames)
    durations.extend(next_durations)
    next_frames, next_durations = placed_frames(cat_photo)
    frames.extend(next_frames)
    durations.extend(next_durations)

    palette_source = Image.new("RGB", (WIDTH * 2, HEIGHT), "white")
    palette_source.paste(frames[5], (0, 0))
    palette_source.paste(frames[-1], (WIDTH, 0))
    palette = palette_source.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    quantized = [frame.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for frame in frames]
    quantized[0].save(
        DOCS / "demo.gif",
        save_all=True,
        append_images=quantized[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )


if __name__ == "__main__":
    main()
