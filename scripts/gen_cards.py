"""
Card carousel generator for The Steady One (TikTok/Reels/Shorts photo carousels).
No voiceover: each card must stand alone. Last card is a sales CTA to the quiz.
Brand: navy editorial, white text, green accent, real Heed on the CTA card.

Usage: python3 scripts/gen_cards.py
Outputs PNG carousels under docs/carousels/<slug>/.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
NAVY = (10, 37, 64)
DEEP = (7, 27, 48)
GREEN = (0, 166, 81)
WHITE = (255, 255, 255)
SOFT = (255, 255, 255)
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
SANS_R = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
HEED = "public/brand/heed-mascot.png"

def F(p, s): return ImageFont.truetype(p, s)

def bg():
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = min(1.0, max(0.0, abs(y - H/2)/(H/2) - 0.45)/0.55)*0.6
        d.line([(0, y), (W, y)], fill=(
            int(NAVY[0]*(1-t)+DEEP[0]*t),
            int(NAVY[1]*(1-t)+DEEP[1]*t),
            int(NAVY[2]*(1-t)+DEEP[2]*t)))
    return img, d

def masthead(d):
    f = F(SANS, 30)
    txt = "T H E   S T E A D Y   O N E"
    w = d.textlength(txt, font=f)
    d.text(((W-w)/2, 150), txt, font=f, fill=WHITE)
    d.line([(W/2-90, 210), (W/2+90, 210)], fill=GREEN, width=3)

def wrap(d, text, font, maxw):
    out, cur = [], ""
    for wd in text.split():
        test = (cur+" "+wd).strip()
        if d.textlength(test, font=font) <= maxw:
            cur = test
        else:
            if cur: out.append(cur)
            cur = wd
    if cur: out.append(cur)
    return out

def fit(d, text, path, max_s, min_s, maxw, maxh, lh=1.16):
    for s in range(max_s, min_s-1, -2):
        f = F(path, s)
        lines = wrap(d, text, f, maxw)
        asc, desc = f.getmetrics()
        h = len(lines)*int((asc+desc)*lh)
        if h <= maxh:
            return f, lines, int((asc+desc)*lh)
    f = F(path, min_s)
    lines = wrap(d, text, f, maxw)
    asc, desc = f.getmetrics()
    return f, lines, int((asc+desc)*lh)

def draw_lines(d, lines, font, lh, y, fill=WHITE):
    for i, ln in enumerate(lines):
        w = d.textlength(ln, font=font)
        d.text(((W-w)/2, y+i*lh), ln, font=font, fill=fill)
    return y + len(lines)*lh

def center_block(d, text, path, max_s, min_s, fill=WHITE, top=330, bottom=1430, maxw=900):
    f, lines, lh = fit(d, text, path, max_s, min_s, maxw, bottom-top)
    total = len(lines)*lh
    y = top + ((bottom-top)-total)//2
    return draw_lines(d, lines, f, lh, y, fill)

def swipe_hint(d):
    f = F(SANS, 30)
    txt = "S W I P E   >"
    w = d.textlength(txt, font=f)
    d.text(((W-w)/2, 1500), txt, font=f, fill=GREEN)

# ---------- card renderers ----------

def card_hook(text, path_out, hint=True):
    img, d = bg(); masthead(d)
    center_block(d, text, SERIF, 96, 60, WHITE, top=360, bottom=1380)
    if hint: swipe_hint(d)
    img.save(path_out)

def card_statement(text, path_out, green_tail=None):
    img, d = bg(); masthead(d)
    if green_tail:
        top, bottom = 360, 1430
        wf, wl, wlh = fit(d, text, SERIF, 80, 50, 900, 520)
        gf, gl, glh = fit(d, green_tail, SERIF, 124, 60, 900, 360)
        gap = 56
        total = len(wl)*wlh + gap + len(gl)*glh
        y = top + ((bottom-top)-total)//2
        y = draw_lines(d, wl, wf, wlh, y, WHITE)
        draw_lines(d, gl, gf, glh, y + gap, GREEN)
    else:
        center_block(d, text, SERIF, 84, 54, WHITE, top=360, bottom=1430)
    img.save(path_out)

def card_numbers(kicker, rows, note, total, sub, path_out):
    img, d = bg()
    kf = F(SANS, 38); kw = d.textlength(kicker, font=kf)
    d.text(((W-kw)/2, 360), kicker, font=kf, fill=GREEN)
    y = 520
    lf = F(SANS, 60)
    for label, val in rows:
        d.text((120, y), label, font=lf, fill=WHITE)
        vw = d.textlength(val, font=lf)
        d.text((W-120-vw, y), val, font=lf, fill=WHITE)
        y += 110
    if note:
        d.text((120, y+4), note, font=F(SANS_R, 34), fill=WHITE); y += 84
    d.line([(120, y), (W-120, y)], fill=WHITE, width=3); y += 50
    tf = F(SANS, 74); tw = d.textlength(total, font=tf)
    d.text(((W-tw)/2, y), total, font=tf, fill=GREEN); y += 130
    if sub:
        sf = F(SANS_R, 40); sw = d.textlength(sub, font=sf)
        d.text(((W-sw)/2, y), sub, font=sf, fill=WHITE)
    img.save(path_out)

def card_cta(benefit, path_out, pill="Link in bio", free=True):
    img, d = bg()
    heed = Image.open(HEED).convert("RGBA")
    hh = 600; hw = int(heed.width*hh/heed.height)
    heed = heed.resize((hw, hh))
    img.paste(heed, (int((W-hw)/2), 330), heed)
    y = 1010
    f, lines, lh = fit(d, benefit, SANS, 52, 38, 940, 220)
    y = draw_lines(d, lines, f, lh, y, WHITE)
    if free:
        ff = F(SANS_R, 38); fw = d.textlength("Free. 7 questions, about 2 minutes.", font=ff)
        d.text(((W-fw)/2, y+10), "Free. 7 questions, about 2 minutes.", font=ff, fill=WHITE)
        y += 80
    pf = F(SANS, 54); pw = d.textlength(pill, font=pf)
    px0 = (W-pw)/2-56; px1 = (W+pw)/2+56; py0 = y+30; py1 = y+150
    d.rounded_rectangle([px0, py0, px1, py1], radius=60, fill=GREEN)
    d.text(((W-pw)/2, py0+26), pill, font=pf, fill=WHITE)
    img.save(path_out)

# ---------- carousels ----------

def build(slug, cards):
    out = f"docs/carousels/{slug}"
    os.makedirs(out, exist_ok=True)
    for i, fn in enumerate(cards, 1):
        fn(f"{out}/{i:02d}.png")
    print(f"{slug}: {len(cards)} cards -> {out}")

# 1) Real move-in cost
build("01_movein", [
    lambda p: card_hook("That $2,800 NYC apartment costs almost $6,000 just to walk in the door.", p),
    lambda p: card_statement("The rent is the number they show you.", p, green_tail="There's another one they don't."),
    lambda p: card_numbers("THE ONLY LEGAL UPFRONT",
        [("First month", "$2,800"), ("Security deposit", "$2,800")],
        "deposit capped at 1 month, by law", "= $5,600 minimum", "before you buy a single fork.", p),
    lambda p: card_statement("Add moving, fees, and setup. The average NYC move-in is about", p, green_tail="$13,000."),
    lambda p: card_statement("Most people learn this after they've fallen for the place. That's when you overpay.", p),
    lambda p: card_cta("Know your real move-in number on every place, before you commit.", p),
])

# 2) Anti-panic, 15 apartments
build("02_fifteen", [
    lambda p: card_hook("I saw 15 apartments in one weekend and applied to none. It was the right call.", p),
    lambda p: card_statement("15 viewings. Zero applications. And I slept fine.", p),
    lambda p: card_statement("Seeing more places doesn't make the decision clearer.", p, green_tail="It makes it louder."),
    lambda p: card_statement("The fix isn't more listings. It's knowing your 2 or 3 lines you won't cross, before you start.", p),
    lambda p: card_statement("Set those, and most apartments disqualify themselves. The right one gets obvious.", p),
    lambda p: card_statement("The city always has another apartment.", p),
    lambda p: card_cta("Heed helps you set your lines, then reads every place against them.", p),
])

# 3) FARE Act, no fee
build("03_fareact", [
    lambda p: card_hook("'No fee' doesn't mean no cost. Here's what the FARE Act actually changed.", p),
    lambda p: card_statement("Since the FARE Act, the broker fee falls on whoever hired the broker.", p),
    lambda p: card_statement("Didn't hire one? You usually don't pay that", p, green_tail="12 to 15 percent anymore."),
    lambda p: card_statement("But no fee is not free. You still owe first month plus a deposit upfront.", p),
    lambda p: card_statement("And some 'no fee' listings just bake the cost into a higher rent.", p),
    lambda p: card_statement("Read what you're actually signing, not the headline.", p),
    lambda p: card_cta("Heed shows the real cost and the catch on every place you're weighing.", p),
])

print("DONE")
