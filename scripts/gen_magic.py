"""'Why we stay' carousel: pinned-style photo cover + X/10 rating slides + closing."""
import os
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1920
NAVY=(10,37,64); DEEP=(7,27,48); GREEN=(0,166,81); WHITE=(255,255,255)
SERIF="/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
SANS_R="/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
HEED="public/brand/heed-mascot.png"
def F(p,s): return ImageFont.truetype(p,s)
def wrap(d,t,f,mw):
    out,cur=[],""
    for w in t.split():
        test=(cur+" "+w).strip()
        if d.textlength(test,font=f)<=mw: cur=test
        else:
            if cur: out.append(cur); 
            cur=w
    if cur: out.append(cur)
    return out
def fit(d,t,path,mx,mn,mw,mh,lh=1.12):
    for s in range(mx,mn-1,-2):
        f=F(path,s); ls=wrap(d,t,f,mw); a,de=f.getmetrics(); h=len(ls)*int((a+de)*lh)
        if h<=mh: return f,ls,int((a+de)*lh)
    f=F(path,mn); a,de=f.getmetrics(); return f,wrap(d,t,f,mw),int((a+de)*lh)
def coverfit(photo):
    img=Image.open(photo).convert("RGB")
    sc=max(W/img.width,H/img.height); img=img.resize((int(img.width*sc),int(img.height*sc)))
    l=(img.width-W)//2; t=(img.height-H)//2
    return img.crop((l,t,l+W,t+H)).convert("RGBA")
def cshadow(d,lines,font,lh,y,fill):
    for i,ln in enumerate(lines):
        w=d.textlength(ln,font=font); x=(W-w)/2
        d.text((x+3,y+i*lh+3),ln,font=font,fill=DEEP)
        d.text((x,y+i*lh),ln,font=font,fill=fill)
    return y+len(lines)*lh

def thumb_cover(photo,title,subtitle,out):
    img=coverfit(photo); ov=Image.new("RGBA",(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov)
    for y in range(H):
        a=int(min(200,70+120*max(0.0,1-abs(y-880)/520)))
        od.line([(0,y),(W,y)],fill=(7,27,48,a))
    img.alpha_composite(ov); img=img.convert("RGB"); d=ImageDraw.Draw(img)
    tf,tl,tlh=fit(d,title,SERIF,96,58,940,430)
    y=cshadow(d,tl,tf,tlh,760,WHITE)
    sf,sl,slh=fit(d,subtitle,SANS_R,44,30,900,220,lh=1.25)
    for i,ln in enumerate(sl):
        w=d.textlength(ln,font=sf); x=(W-w)/2
        d.text((x+2,y+24+i*slh+2),ln,font=sf,fill=DEEP); d.text((x,y+24+i*slh),ln,font=sf,fill=(210,225,235))
    bf=F(SANS,26); bt="T H E   S T E A D Y   O N E"; bw=d.textlength(bt,font=bf)
    d.text(((W-bw)/2,1800),bt,font=bf,fill=WHITE); d.line([(W/2-70,1846),(W/2+70,1846)],fill=GREEN,width=3)
    img.save(out)

def feeling(photo,text,out):
    img=coverfit(photo); ov=Image.new("RGBA",(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov)
    for y in range(H):
        a=int(min(195,55+135*max(0.0,1-abs(y-1180)/500)))
        od.line([(0,y),(W,y)],fill=(7,27,48,a))
    img.alpha_composite(ov); img=img.convert("RGB"); d=ImageDraw.Draw(img)
    tf,tl,tlh=fit(d,text,SERIF,78,48,920,420,lh=1.16)
    cshadow(d,tl,tf,tlh,1030,WHITE)
    img.save(out)

def closing(out):
    img=Image.new("RGB",(W,H),NAVY); d=ImageDraw.Draw(img)
    for y in range(H):
        t=min(1.0,max(0.0,abs(y-H/2)/(H/2)-0.45)/0.55)*0.6
        d.line([(0,y),(W,y)],fill=(int(NAVY[0]*(1-t)+DEEP[0]*t),int(NAVY[1]*(1-t)+DEEP[1]*t),int(NAVY[2]*(1-t)+DEEP[2]*t)))
    top=fit(d,"The rent is brutal. The brokers are worse.",SANS_R,46,34,900,160,lh=1.3)
    cshadow(d,top[1],top[0],top[2],470,(210,225,235))
    big=F(SERIF,130); t="We stay anyway."; 
    tl=wrap(d,t,big,940); a,de=big.getmetrics(); lh=int((a+de)*1.05); yy=620
    for i,ln in enumerate(tl):
        w=d.textlength(ln,font=big); d.text(((W-w)/2,yy+i*lh),ln,font=big,fill=WHITE)
    heed=Image.open(HEED).convert("RGBA"); hh=520; hw=int(heed.width*hh/heed.height); heed=heed.resize((hw,hh))
    img.paste(heed,(int((W-hw)/2),980),heed); d=ImageDraw.Draw(img)
    bf=F(SANS,30); bt="T H E   S T E A D Y   O N E"; bw=d.textlength(bt,font=bf)
    d.text(((W-bw)/2,1560),bt,font=bf,fill=WHITE); d.line([(W/2-80,1610),(W/2+80,1610)],fill=GREEN,width=3)
    sf=F(SANS_R,38); s="We just make the finding-a-place part calmer."; sw=d.textlength(s,font=sf)
    d.text(((W-sw)/2,1660),s,font=sf,fill=(200,215,228))
    img.save(out)

out="docs/carousels/09_whystay"; os.makedirs(out,exist_ok=True)
thumb_cover("docs/assets/magic_rooftop_sunset.png","Why we still live in NYC","Even with the rent, the brokers, and the chaos.",f"{out}/01.png")
feeling("docs/assets/magic_bridge.png","Walking home over the bridge, the whole skyline lit up.",f"{out}/02.png")
feeling("docs/assets/magic_bodega.png","The guy who starts your coffee before you ask.",f"{out}/03.png")
feeling("docs/assets/magic_street.png","A block so quiet you forget where you are.",f"{out}/04.png")
feeling("docs/assets/magic_subway.png","A stranger playing something beautiful while you wait.",f"{out}/05.png")
feeling("docs/assets/magic_rooftop.png","The city glowing all at once, and nothing else matters.",f"{out}/06.png")
closing(f"{out}/07.png")
print("DONE 09_whystay")
