from PIL import Image, ImageDraw, ImageFont
import os

def make_icon(size, path):
    img = Image.new("RGB", (size, size), "#0d0d0d")
    draw = ImageDraw.Draw(img)

    # Orange rounded square background
    margin = size // 8
    r = size // 5
    draw.rounded_rectangle([margin, margin, size - margin, size - margin], radius=r, fill="#e8460a")

    # Letter B
    font_size = int(size * 0.52)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), "B", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), "B", fill="white", font=font)

    img.save(path, "PNG")
    print(f"Saved {path}")

os.makedirs("public", exist_ok=True)
make_icon(192, "public/icon-192.png")
make_icon(512, "public/icon-512.png")
print("Icons created!")
