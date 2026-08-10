"""'Reasons We Renew' emotional carousel: photo cover + tender feeling slides + closing."""
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
            if cur: out.append(cur)
            cur=w
    if cur: out.append(cur)
    return out
def fit(d,t,path,mx,mn,mw,mh,lh=1.2):
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
        a=int(min(205,70+130*max(0.0,1-abs(y-880)/560)))
        od.line([(0,y),(W,y)],fill=(7,27,48,a))
    img.alpha_composite(ov); img=img.convert("RGB"); d=ImageDraw.Draw(img)
    tf,tl,tlh=fit(d,title,SERIF,92,54,940,430,lh=1.1)
    y=cshadow(d,tl,tf,tlh,700,WHITE)
    sf,sl,slh=fit(d,subtitle,SANS_R,44,30,900,260,lh=1.3)
    for i,ln in enumerate(sl):
        w=d.textlength(ln,font=sf); x=(W-w)/2
        d.text((x+2,y+30+i*slh+2),ln,font=sf,fill=DEEP); d.text((x,y+30+i*slh),ln,font=sf,fill=(214,227,236))
    bf=F(SANS,26); bt="T H E   S T E A D Y   O N E"; bw=d.textlength(bt,font=bf)
    d.text(((W-bw)/2,1800),bt,font=bf,fill=WHITE); d.line([(W/2-70,1846),(W/2+70,1846)],fill=GREEN,width=3)
    img.save(out)

def feeling(photo,text,out):
    img=coverfit(photo); ov=Image.new("RGBA",(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov)
    for y in range(H):
        a=int(min(220,20+205*max(0.0,(y-620)/(H-620))))
        od.line([(0,y),(W,y)],fill=(7,27,48,a))
    img.alpha_composite(ov); img=img.convert("RGB"); d=ImageDraw.Draw(img)
    tf,tl,tlh=fit(d,text,SERIF,72,44,940,660,lh=1.22)
    total=len(tl)*tlh; top=1010; bottom=1620; y=top+((bottom-top)-total)//2
    cshadow(d,tl,tf,tlh,y,WHITE)
    img.save(out)

def closing(text,out):
    img=Image.new("RGB",(W,H),NAVY); d=ImageDraw.Draw(img)
    for y in range(H):
        t=min(1.0,max(0.0,abs(y-H/2)/(H/2)-0.45)/0.55)*0.6
        d.line([(0,y),(W,y)],fill=(int(NAVY[0]*(1-t)+DEEP[0]*t),int(NAVY[1]*(1-t)+DEEP[1]*t),int(NAVY[2]*(1-t)+DEEP[2]*t)))
    tf,tl,tlh=fit(d,text,SERIF,74,50,920,520,lh=1.22)
    total=len(tl)*tlh; y=470+max(0,(560-total)//2)
    for i,ln in enumerate(tl):
        w=d.textlength(ln,font=tf); d.text(((W-w)/2,y+i*tlh),ln,font=tf,fill=WHITE)
    heed=Image.open(HEED).convert("RGBA"); hh=470; hw=int(heed.width*hh/heed.height); heed=heed.resize((hw,hh))
    img.paste(heed,(int((W-hw)/2),1080),heed); d=ImageDraw.Draw(img)
    bf=F(SANS,30); bt="T H E   S T E A D Y   O N E"; bw=d.textlength(bt,font=bf)
    d.text(((W-bw)/2,1600),bt,font=bf,fill=WHITE); d.line([(W/2-80,1650),(W/2+80,1650)],fill=GREEN,width=3)
    sf=F(SANS_R,36); s="We just make the finding-a-place part calmer."; sw=d.textlength(s,font=sf)
    d.text(((W-sw)/2,1700),s,font=sf,fill=(200,215,228))
    img.save(out)

out="docs/carousels/09_whystay"; os.makedirs(out,exist_ok=True)
thumb_cover("docs/assets/magic_rooftop_sunset.png","I almost gave up on this city","You keep asking if you're doing it wrong. You're not.",f"{out}/01.png")
feeling("docs/assets/magic_bridge.png","You carried the whole exhausting week home over this bridge, and somewhere in the middle of it you felt okay again.",f"{out}/02.png")
feeling("docs/assets/magic_bodega.png","You've been invisible to every landlord for months, and then a stranger behind a counter knows your name.",f"{out}/03.png")
feeling("docs/assets/magic_street.png","You were ready to give up on ever feeling at home, and then you turned onto a street this quiet and your shoulders finally dropped.",f"{out}/04.png")
feeling("docs/assets/magic_subway.png","You were holding it together all day, and an old man playing violin on a dirty platform almost undid you.",f"{out}/05.png")
feeling("docs/assets/magic_rooftop.png","Some nights the city you can barely afford turns gold, and for a minute it feels like it's yours too.",f"{out}/06.png")
closing("The rent asks too much of you. The city keeps giving you reasons to stay.",f"{out}/07.png")
print("DONE 09_whystay")
