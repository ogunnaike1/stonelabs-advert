from PIL import Image, ImageDraw, ImageFont
import pillow_avif, sys
def sheet(ref, text, fonts, out, size=90):
    r = Image.open(ref).convert('RGB'); r = r.resize((900, int(900*r.height/r.width)))
    H = r.height + len(fonts)*(size+40) + 20
    im = Image.new('RGB', (900, H), 'white'); im.paste(r, (0,0)); d = ImageDraw.Draw(im)
    y = r.height + 10
    for path, label in fonts:
        try: f = ImageFont.truetype(path, size)
        except Exception as e: print('fail', path, e); continue
        d.text((10, y), text, font=f, fill='black')
        d.text((760, y+size), label, font=ImageFont.truetype('public/fonts/Inter-VF.ttf', 16), fill='red')
        y += size + 40
    im.save(out)
G='downloads/gf/'
sheet('font1.avif', 'ÆSTHETICS SERIF', [('public/fonts/InstrumentSerif-Regular.ttf','Instrument Serif'),(G+'Gloock-Regular.ttf','Gloock'),(G+'BodoniModa.ttf','Bodoni Moda'),(G+'PlayfairDisplay.ttf','Playfair'),(G+'DMSerifDisplay-Regular.ttf','DM Serif Disp'),(G+'YoungSerif-Regular.ttf','Young Serif')], 'analysis/cmp_serif.png', 96)
sheet('font3.webp', 'ANYMORE STONE', [(G+'MuseoModerno.ttf','MuseoModerno'),(G+'Comfortaa.ttf','Comfortaa'),(G+'Quicksand.ttf','Quicksand'),(G+'TiltNeon.ttf','Tilt Neon'),(G+'PoiretOne-Regular.ttf','Poiret One'),(G+'LexendZetta.ttf','Lexend Zetta'),(G+'Comme.ttf','Comme')], 'analysis/cmp_display.png', 84)
