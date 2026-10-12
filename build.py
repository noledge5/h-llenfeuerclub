import re, base64, sys, os
SP=os.path.dirname(os.path.abspath(__file__))
V5=SP+'/ref/eulenbach_dm_helfer_v5.html'
src=open(V5,encoding='utf-8').read()
S=lambda n: open(f'{SP}/src/{n}',encoding='utf-8').read()

# ---- fonts (base64) ----
fonts=[('Cinzel','Cinzel-normal.woff2','400 900','normal'),('Cinzel Decorative','CinzelDecorative-normal.woff2','700','normal'),
 ('EB Garamond','EBGaramond-normal.woff2','400 700','normal'),('EB Garamond','EBGaramond-italic.woff2','400 700','italic'),
 ('IM Fell English','IMFellEnglish-normal.woff2','400','normal'),('IM Fell English','IMFellEnglish-italic.woff2','400','italic')]
ff=''
for fam,f,w,st in fonts:
    b=base64.b64encode(open(f'{SP}/assets/fonts/{f}','rb').read()).decode()
    ff+=f"@font-face{{font-family:'{fam}';src:url(data:font/woff2;base64,{b}) format('woff2');font-weight:{w};font-style:{st};font-display:block}}\n"
tok=open(f'{SP}/assets/tokens.css',encoding='utf-8').read()
tok='\n'.join(l for l in tok.split('\n') if not l.startswith('@font-face'))
bundle=open(f'{SP}/assets/bundle.css',encoding='utf-8').read()
root=re.match(r':root\{.*?\n\}',bundle,re.S).group(0)
skin=S('skin.css')

head=f'''<!doctype html>
<html lang="de" data-theme="tome">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Eulenbach DM-Helfer 2.0</title>
<style id="fontfaces">{ff}</style>
<style>[hidden]{{display:none!important}}.beamer-boot body{{visibility:hidden;background:#000}}</style>
<script>if(location.hash==='#beamer')document.documentElement.className='beamer-boot'</script>
<style>
{tok}
{root}
'''
# v5 Layout-CSS behalten (ohne :root-Variablenblöcke und Dark-Mode)
css=re.search(r'<style>\n/\* Layout: App.*?</style>',src,re.S).group(0)
css=css[len('<style>\n'):-len('</style>')]
css=re.sub(r':root \{.*?\n\}\n@media \(prefers-color-scheme: dark\) \{.*?\n\}\n:root\[data-theme="dark"\] \{.*?\n\}\n','',css,count=1,flags=re.S)
assert '--accent-soft: #dcebe2' not in css, 'root block not removed'
head+=css+'\n'+skin+'\n</style>\n</head>\n<body>\n'

# ---- Seiteninhalt ----
a=src.index('<main>')+len('<main>')
k=src.index('<section class="view" id="v-karten"')
e=src.index('</main>')
spielen=src[a:k]
rest=src[k:e]
rest=rest.replace('<div class="prep">','<div class="prep">\n'+S('prep_new.html'),1)
assert 'prepMediaCard' in rest
body=S('top.html')+spielen+S('views_new.html')+rest+'  </main>\n</div>\n'+S('sndbar.html')+'<div class="toast" id="toast" hidden role="status"></div>\n'

# ---- Script ----
s0=src.index('<script>')+len('<script>')
s1=src.rindex('})();')
js=src[s0:s1]
def patch(old,new,count=1):
    global js
    assert js.count(old)>=1, old
    js=js.replace(old,new,count)
patch("'use strict';\n","'use strict';\n  if (location.hash === '#beamer') { window.addEventListener('load', function () { var html = playerDoc(); document.open(); document.write(html); document.close(); }); return; }\n")
patch("var wide = window.matchMedia('(min-width: 1100px)');","var wide = window.matchMedia('(min-width: 1100px)');\n  var EV = { dice: function () {}, combatChanged: function () {}, scene: function () {} };")
patch("var VIEWS = ['spielen', 'karten', 'heldinnen', 'wissen', 'vorbereitung'];","var VIEWS = ['spielen', 'tisch', 'sound', 'karten', 'heldinnen', 'wissen', 'vorbereitung'];")
patch("save('view', id);\n  }","save('view', id);\n    if (typeof onView === 'function') onView(id);\n  }")
patch("renderStepper(); save('scene', cur);","renderStepper(); save('scene', cur); EV.scene();")
patch("function showBig(total, det, cls) {","function showBig(total, det, cls) { EV.dice(total, det, cls);")
patch("function renderCombat() {","function renderCombat() {\n    EV.combatChanged();")
mods=''.join(S(n) for n in ['m1_store.js','m2_audio.js','m3_render.js','m4_player.js','m5_vtt.js','m6_glue.js'])
mods+="\n  EV.scene = function () { if (BOOTED) { renderFxBar(); renderVttUi(); renderSoundView(); } };\n"
out=head+body+'<script>'+js+mods+'})();\n</script>\n</body>\n</html>\n'

open(f'{SP}/Eulenbach_DM-Helfer_2.0.html','w',encoding='utf-8').write(out)
print(len(out)//1024,'KB')
