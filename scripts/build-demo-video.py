#!/usr/bin/env python3
"""Build the sub-four-minute Closing Bell Agent demo video on macOS."""

from pathlib import Path
import subprocess
import textwrap

from PIL import Image, ImageDraw, ImageFont, ImageOps
import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "demo-output"
WIDTH, HEIGHT = 1280, 720
BG = "#08111f"
PANEL = "#101d30"
INK = "#edf5ff"
MUTED = "#9cb0c9"
CYAN = "#27d9d0"
GREEN = "#5be49b"
RED = "#ff7185"


def font(size: int, bold: bool = False):
    names = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def wrapped(draw, text, xy, width, size=30, color=INK, bold=False, spacing=12):
    avg = max(10, int(width / (size * 0.56)))
    lines = textwrap.wrap(text, width=avg)
    draw.multiline_text(xy, "\n".join(lines), font=font(size, bold), fill=color, spacing=spacing)


def canvas(title, kicker="CLOSING BELL AGENT"):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((44, 38, 1236, 682), radius=26, fill=PANEL, outline="#243753", width=2)
    draw.text((82, 72), kicker, font=font(18, True), fill=CYAN)
    draw.text((82, 110), title, font=font(48, True), fill=INK)
    return image, draw


def bullet_slide(title, bullets, footer):
    image, draw = canvas(title)
    y = 205
    for color, heading, detail in bullets:
        draw.ellipse((84, y + 8, 104, y + 28), fill=color)
        draw.text((126, y), heading, font=font(30, True), fill=INK)
        wrapped(draw, detail, (126, y + 45), 1000, 23, MUTED, spacing=8)
        y += 125
    draw.text((84, 635), footer, font=font(20, True), fill=CYAN)
    return image


def dashboard_slide():
    image, draw = canvas("Every gate stays visible")
    source = ROOT / "assets" / "closing-bell-evidence.png"
    dash = Image.open(source).convert("RGB")
    dash = ImageOps.fit(dash, (720, 430), method=Image.Resampling.LANCZOS, centering=(0.5, 0.12))
    image.paste(dash, (475, 190))
    draw.rounded_rectangle((78, 192, 430, 620), radius=18, fill="#0a1628", outline="#263b5c", width=2)
    draw.text((108, 225), "Decision boundary", font=font(28, True), fill=CYAN)
    items = [
        ("Fresh market data", GREEN),
        ("Issuer ratio normalized", GREEN),
        ("Underlying market open", RED),
        ("Executable quote", RED),
        ("Unsigned calldata", RED),
        ("Funded simulation", RED),
    ]
    y = 290
    for label, color in items:
        draw.ellipse((110, y + 5, 126, y + 21), fill=color)
        draw.text((145, y), label, font=font(22, False), fill=INK)
        y += 50
    return image


def title_slide():
    image, draw = canvas("Stop fake tokenized-stock spreads before signing", "BNB TOKENIZED STOCKS HACKATHON")
    wrapped(draw, "A read-only execution gate built with Binance Web3 RWA, Trading, and Transaction APIs.", (84, 230), 1050, 34, MUTED)
    draw.rounded_rectangle((84, 420, 1195, 565), radius=22, fill="#071423", outline=CYAN, width=3)
    draw.text((122, 455), "SCREEN  →  QUOTE  →  BUILD  →  SIMULATE  →  REVIEW", font=font(31, True), fill=INK)
    draw.text((84, 635), "No keys · No signatures · No broadcasts", font=font(22, True), fill=CYAN)
    return image


SLIDES = [
    (
        title_slide,
        "Closing Bell Agent is a pre-signing execution gate for tokenized stocks on BNB Smart Chain. It uses the Binance Web3 RWA, Trading, and Transaction APIs. The agent never holds keys, signs, or broadcasts. Its job is to turn a tempting displayed spread into a reviewable block or review decision.",
    ),
    (
        dashboard_slide,
        "The dashboard keeps every gate visible. A token must have fresh data, a normalized issuer share ratio, and an open underlying market. It then needs an executable quote, unsigned calldata, and a successful funded simulation. Missing evidence produces a block. A review decision still leaves the user as the signer.",
    ),
    (
        lambda: bullet_slide(
            "Displayed price is not executable profit",
            [
                (CYAN, "Normalize the share exposure", "Different issuers can represent different fractions of the same underlying share."),
                (GREEN, "Quote both legs", "Buy one representation and sell the equivalent share exposure in the other representation."),
                (RED, "Require positive proceeds", "Stablecoin output must exceed starting capital after routing costs; gas and funded simulation remain mandatory."),
            ],
            "The API-derived reference price is a screening signal, not an external stock oracle.",
        ),
        "The scanner first normalizes token-to-share ratios. It then quotes both legs at equivalent share exposure. The stablecoin proceeds must exceed the starting notional, and gas plus funded simulation still have to pass. The API reference price is used only for screening because Binance documents it as derived from the onchain token price.",
    ),
    (
        lambda: bullet_slide(
            "Live evidence: apparent edges were rejected",
            [
                (RED, "QCOM", "37.68 basis points indicated gross; the executable five-hundred-dollar route returned about 499 dollars and 68 cents."),
                (RED, "CBRS", "29.53 basis points indicated gross; the executable route returned about 499 dollars and 4 cents."),
                (GREEN, "Correct result", "Both calldata legs were built. Both candidates were blocked before signing because proceeds were negative even before gas."),
            ],
            "Negative evidence is the product: it prevents false-profit execution.",
        ),
        "In authenticated live scans, QCOM showed about thirty-seven point seven basis points gross, but the executable five-hundred-dollar route returned about four hundred ninety-nine dollars and sixty-eight cents. CBRS showed about twenty-nine point five basis points gross and returned about four hundred ninety-nine dollars and four cents. Both calldata legs existed, yet both routes were correctly blocked before signing.",
    ),
    (
        lambda: bullet_slide(
            "Continuous opportunity monitoring",
            [
                (CYAN, "488 BSC candidates", "The authenticated universe is rescanned and same-stock cross-issuer signals are discovered."),
                (GREEN, "Two executable quotes", "Every indicated signal is probed through both directions at the configured notional."),
                (RED, "One-dollar protected threshold", "Only quote-implied proceeds above the threshold become local review events; transactions remain disabled."),
            ],
            "The monitor observes. It does not trade.",
        ),
        "The continuous monitor rescans four hundred eighty-eight BSC tokenized-stock candidates. Every same-stock cross-issuer signal is checked with two executable quotes at the configured notional. It records a local event only when quote-implied proceeds exceed the starting capital by at least one dollar. Even then, broadcasting remains disabled and funded simulation is still required.",
    ),
    (
        lambda: bullet_slide(
            "A safer agent for around-the-clock markets",
            [
                (GREEN, "Working product", "Deterministic policy engine, signed Binance API client, live probes, dashboard, and continuous monitor."),
                (CYAN, "Reviewable evidence", "Every block reason is explicit and reproducible from the committed reports and tests."),
                (GREEN, "User remains in control", "Closing Bell Agent stops at REVIEW. An external wallet policy and the human signer decide what happens next."),
            ],
            "github.com/daveaire/closing-bell-agent",
        ),
        "Closing Bell Agent combines a deterministic policy engine, a signed Binance Web3 client, live route probes, a dashboard, and continuous monitoring. Every rejected route includes explicit reasons and reproducible evidence. The system stops at review, keeping the wallet and final decision under user control. The public source is available at github dot com slash daveaire slash closing-bell-agent.",
    ),
]


def run():
    OUT.mkdir(exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    segments = []
    for index, (make_slide, narration) in enumerate(SLIDES, 1):
        slide = OUT / f"slide-{index:02d}.png"
        audio = OUT / f"audio-{index:02d}.aiff"
        segment = OUT / f"segment-{index:02d}.mp4"
        make_slide().save(slide)
        subprocess.run(["say", "-v", "Samantha", "-r", "168", "-o", str(audio), narration], check=True)
        subprocess.run([
            ffmpeg, "-y", "-loop", "1", "-framerate", "30", "-i", str(slide), "-i", str(audio),
            "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "160k",
            "-pix_fmt", "yuv420p", "-shortest", "-movflags", "+faststart", str(segment),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        segments.append(segment)

    listing = OUT / "segments.txt"
    listing.write_text("".join(f"file '{segment.name}'\n" for segment in segments))
    final = OUT / "closing-bell-agent-demo.mp4"
    subprocess.run([
        ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
        "-c", "copy", "-movflags", "+faststart", str(final),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(final)


if __name__ == "__main__":
    run()
