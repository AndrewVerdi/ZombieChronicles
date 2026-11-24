(()=>{
/* ---------- SOUND: everything synthesized live, 80s horror-synth flavor ---------- */
const SND=(()=>{
  const PK='holdout-squad-audio';let pref={music:true,sfx:true};
  try{const p=JSON.parse(localStorage.getItem(PK));if(p)pref=Object.assign(pref,p);}catch(e){}
  let A=null,master,musicBus,sfxBus,rev,revIn,dly,dlyIn,noiseBuf,last={},track=null,want=null,nextT=0,step=0,timer=null,intensity=0,engine=null,groanT=3;
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  function init(){
    if(A){if(A.state!=='running')A.resume();return;}
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    try{A=new C();}catch(e){return;}
    master=A.createGain();master.gain.value=.9;
    const comp=A.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;
    master.connect(comp);comp.connect(A.destination);
    musicBus=A.createGain();musicBus.gain.value=pref.music?.42:0;musicBus.connect(master);
    sfxBus=A.createGain();sfxBus.gain.value=pref.sfx?.8:0;sfxBus.connect(master);
    // reverb send
    const L=A.sampleRate*2.6,ib=A.createBuffer(2,L,A.sampleRate);
    for(let c=0;c<2;c++){const d=ib.getChannelData(c);for(let i=0;i<L;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/L,2.6);}
    rev=A.createConvolver();rev.buffer=ib;revIn=A.createGain();revIn.gain.value=1;revIn.connect(rev);const rg=A.createGain();rg.gain.value=.5;rev.connect(rg);rg.connect(master);
    // tape-ish delay send
    dly=A.createDelay(1);dly.delayTime.value=.33;const fb=A.createGain();fb.gain.value=.38;const dl=A.createBiquadFilter();dl.type='lowpass';dl.frequency.value=2200;
    dlyIn=A.createGain();dlyIn.connect(dly);dly.connect(dl);dl.connect(fb);fb.connect(dly);const dg=A.createGain();dg.gain.value=.45;dl.connect(dg);dg.connect(master);
    noiseBuf=A.createBuffer(1,A.sampleRate*2,A.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    timer=setInterval(sched,25);
  }
  ['pointerdown','pointerup','touchstart','touchend','click','keydown'].forEach(ev=>window.addEventListener(ev,init,{passive:true}));
  // ---- building blocks ----
  function out(bus,pan,rv,dl){let n=bus;const g=A.createGain();
    if(pan&&A.createStereoPanner){const p=A.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(bus);}else g.connect(bus);
    if(rv){const s=A.createGain();s.gain.value=rv;g.connect(s);s.connect(revIn);}
    if(dl){const s=A.createGain();s.gain.value=dl;g.connect(s);s.connect(dlyIn);}
    return g;}
  function env(g,t,a,peak,d,sus,r,len){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak*sus),t+a+d);const e=t+Math.max(a+d,len);g.gain.setValueAtTime(Math.max(.0002,peak*sus),e);g.gain.exponentialRampToValueAtTime(.0001,e+r);return e+r;}
  function osc(type,f,t,stop,dest,f2,ft){const o=A.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+(ft||.1));o.connect(dest);o.start(t);o.stop(stop+.05);return o;}
  function noise(t,stop,dest,rate){const s=A.createBufferSource();s.buffer=noiseBuf;s.loop=true;if(rate)s.playbackRate.value=rate;s.connect(dest);s.start(t,Math.random()*1.5);s.stop(stop+.05);return s;}
  function filt(type,f,q,dest,f2,ft,t){const b=A.createBiquadFilter();b.type=type;b.frequency.setValueAtTime(f,t||A.currentTime);if(f2)b.frequency.exponentialRampToValueAtTime(f2,(t||A.currentTime)+(ft||.1));if(q)b.Q.value=q;b.connect(dest);return b;}
  function thr(k,gap){const n=A.currentTime;if(last[k]&&n-last[k]<gap)return false;last[k]=n;return true;}
  const ok=()=>A&&pref.sfx;
  // ---- SFX ----
  function boom(t,f0,f1,dur,vol,dest){const g=A.createGain();g.connect(dest);const e=env(g,t,.003,vol,dur*.3,.4,dur*.7,0);osc('sine',f0,t,e,g,f1,dur*.6);}
  function crack(t,hp,dur,vol,dest,bp){const g=A.createGain();const f=filt(bp?'bandpass':'highpass',hp,bp?1.2:.7,dest);g.connect(f);const e=env(g,t,.001,vol,dur*.25,.25,dur*.75,0);noise(t,e,g);}
  function shot(kind,pan){if(!ok())return;const t=A.currentTime+.005;
    const K={pistol:['p',.05],smg:['s',.05],rifle:['r',.06],shotgun:['sg',.2],sniper:['sn',.3],flame:['f',.11],zap:['z',.15],ice:['i',.12],orb:['o',.16],rocket:['rk',.2],rail:['rl',.25],minigun:['s',.04]}[kind];
    if(!K||!thr('shot'+kind,K[1]))return;
    const o=out(sfxBus,pan,kind==='sniper'||kind==='shotgun'?.35:.12);
    if(kind==='pistol'){crack(t,1400,.09,.5,o);boom(t,170,55,.08,.6,o);}
    else if(kind==='smg'){crack(t,1800,.05,.3,o);boom(t,140,60,.05,.35,o);}
    else if(kind==='rifle'){crack(t,2400,.07,.55,o,1);crack(t,900,.12,.3,o);boom(t,150,50,.1,.6,o);}
    else if(kind==='shotgun'){const lp=filt('lowpass',3200,.5,o,500,.3,t);const g=A.createGain();g.connect(lp);const e=env(g,t,.002,.9,.08,.3,.25,0);noise(t,e,g);boom(t,120,38,.25,1,o);
      for(const d of[.28,.36]){const c=A.createGain();const hf=filt('bandpass',2600,6,o);c.connect(hf);const ce=env(c,t+d,.001,.35,.02,.1,.03,0);noise(t+d,ce,c);}}
    else if(kind==='sniper'){crack(t,3500,.05,.7,o,1);crack(t,700,.35,.4,o);boom(t,90,32,.45,1,o);
      const c=A.createGain();const hf=filt('bandpass',1800,5,o);c.connect(hf);const ce=env(c,t+.42,.001,.3,.03,.1,.05,0);noise(t+.42,ce,c);}
    else if(kind==='flame'){const lp=filt('lowpass',900,.8,o);const g=A.createGain();g.connect(lp);const e=env(g,t,.01,.3,.05,.6,.08,.08);noise(t,e,g,.6);
      for(let i=0;i<3;i++){const c=A.createGain();const hf=filt('highpass',3000,0,o);c.connect(hf);const tt=t+Math.random()*.1,ce=env(c,tt,.001,.12,.004,.1,.01,0);noise(tt,ce,c);}}
    else if(kind==='zap'){const g=A.createGain();const bp=filt('bandpass',1500,1,o);g.connect(bp);const e=env(g,t,.002,.4,.05,.5,.12,.06);
      const s=A.createOscillator();s.type='sawtooth';const c=new Float32Array(24);for(let i=0;i<24;i++)c[i]=120+Math.random()*1400;s.frequency.setValueCurveAtTime(c,t,.2);s.connect(g);s.start(t);s.stop(e+.05);crack(t,4000,.15,.25,o);}
    else if(kind==='ice'){const g=A.createGain();g.connect(o);const e=env(g,t,.002,.25,.05,.3,.15,0);osc('triangle',2400,t,e,g,1600,.12);osc('sine',3600,t,e,g,2900,.1);crack(t,6000,.05,.15,o);}
    else if(kind==='orb'){const g=A.createGain();const out2=out(sfxBus,pan,.5,.3);g.connect(out2);const e=env(g,t,.03,.22,.1,.5,.2,.1);
      const s=osc('sine',320,t,e,g,620,.3);const l=A.createOscillator();l.frequency.value=14;const lg=A.createGain();lg.gain.value=40;l.connect(lg);lg.connect(s.frequency);l.start(t);l.stop(e+.05);}
    else if(kind==='rocket'){const g=A.createGain();const bp=filt('bandpass',400,1.5,o,2400,.4,t);g.connect(bp);const e=env(g,t,.02,.5,.1,.6,.3,.2);noise(t,e,g);}
    else if(kind==='rail'){const g=A.createGain();g.connect(o);const e=env(g,t,.002,.35,.05,.4,.3,0);osc('sawtooth',2200,t,e,g,180,.3);crack(t,3000,.2,.3,o);}
  }
  function slash(pan){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,pan,.25);const g=A.createGain();const b=filt('bandpass',5200,1.4,o,900,.16,t);g.connect(b);const e=env(g,t,.004,.55,.06,.3,.1,.04);noise(t,e,g);
    const r=A.createGain();r.connect(o);const re=env(r,t+.02,.002,.12,.1,.3,.35,0);osc('sine',2650,t+.02,re,r);osc('sine',3980,t+.02,re,r);}
  function hit(pan){if(!ok()||!thr('hit',.045))return;const t=A.currentTime;const o=out(sfxBus,pan);const g=A.createGain();const b=filt('bandpass',700,2,o,250,.06,t);g.connect(b);const e=env(g,t,.002,.35,.03,.2,.04,0);noise(t,e,g);}
  function die(type,pan){if(!ok()||!thr('die',.06))return;const t=A.currentTime;const big=type==='brute'||type==='boss';const o=out(sfxBus,pan,.15);
    if(type==='splitter'){const g=A.createGain();g.connect(o);const e=env(g,t,.002,.45,.05,.3,.12,0);osc('sine',180,t,e,g,1100,.12);crack(t,1200,.18,.35,o,1);return;}
    const g=A.createGain();const b=filt('bandpass',big?500:900,3,o,big?120:220,.3,t);g.connect(b);const e=env(g,t,.004,big?.8:.45,.1,.4,big?.4:.2,0);noise(t,e,g);
    boom(t,big?90:130,big?28:45,big?.5:.2,big?1:.5,o);
    if(big){const v=A.createGain();const f1=filt('bandpass',420,6,o,260,.6,t);v.connect(f1);const ve=env(v,t,.02,.4,.2,.5,.3,.3);osc('sawtooth',90,t,ve,v,55,.6);}}
  function wallHit(pan){if(!ok()||!thr('wall',.09))return;const t=A.currentTime;const o=out(sfxBus,pan,.1);boom(t,85,40,.18,.7,o);const g=A.createGain();const lp=filt('lowpass',500,0,o);g.connect(lp);const e=env(g,t,.002,.5,.04,.3,.1,0);noise(t,e,g);
    if(Math.random()<.4){const c=A.createGain();const hp=filt('bandpass',1700,4,o);c.connect(hp);const ce=env(c,t+.02,.001,.2,.02,.2,.05,0);noise(t+.02,ce,c);}}
  function explosion(vol){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.45);const g=A.createGain();const lp=filt('lowpass',2400,.3,o,90,1.6,t);g.connect(lp);const e=env(g,t,.004,vol||1,.25,.35,1.4,0);noise(t,e,g,.7);boom(t,70,26,1.2,vol||1,o);}
  function wallBreak(){if(!ok())return;explosion(1);const t=A.currentTime;const o=out(sfxBus,0,.3);for(let i=0;i<9;i++){const tt=t+.1+Math.random()*.9;const c=A.createGain();const b=filt('bandpass',600+Math.random()*2400,5,o);c.connect(b);const ce=env(c,tt,.001,.3,.03,.2,.08,0);noise(tt,ce,c);}}
  function hurt(pan){if(!ok()||!thr('hurt',.15))return;const t=A.currentTime;const o=out(sfxBus,pan);boom(t,110,60,.12,.6,o);const g=A.createGain();const lp=filt('lowpass',900,4,o);g.connect(lp);const e=env(g,t,.005,.35,.05,.4,.08,.04);osc('square',230,t,e,g,150,.12);}
  function heroDown(){if(!ok())return;const t=A.currentTime;explosion(.6);const o=out(sfxBus,0,.6,.2);[62,58,53,50].forEach((m,i)=>{const g=A.createGain();const lp=filt('lowpass',1600,0,o);g.connect(lp);const e=env(g,t+.15+i*.28,.02,.22,.2,.5,.6,.3);osc('sawtooth',mtof(m),t+.15+i*.28,e,g);osc('sawtooth',mtof(m)*1.006,t+.15+i*.28,e,g);});}
  function chime(notes,type,gap,vol,rv){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,rv||.3,.35);notes.forEach((m,i)=>{const g=A.createGain();g.connect(o);const tt=t+i*gap,e=env(g,tt,.004,vol,.1,.3,.35,0);osc(type,mtof(m),tt,e,g);osc('sine',mtof(m+12),tt,e,g);});}
  const levelUp=()=>chime([64,67,71,76],'triangle',.07,.22);
  function freed(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.4,.25);[[50,57,62],[53,60,65],[55,62,67]].forEach((ch,i)=>{const tt=t+i*.18,len=i===2?.9:.14;ch.forEach(m=>{const g=A.createGain();const lp=filt('lowpass',2200,1,o);g.connect(lp);const e=env(g,tt,.01,.12,.05,.7,.4,len);osc('sawtooth',mtof(m),tt,e,g);osc('sawtooth',mtof(m)*1.008,tt,e,g);});});chime([74,79,86],'triangle',.12,.15,.5);}
  function tap(f){if(!ok()||!thr('tap',.03))return;const t=A.currentTime;const o=out(sfxBus,.3,.1);const g=A.createGain();g.connect(o);const e=env(g,t,.001,.25,.03,.2,.08,0);const b=700+f*700;osc('square',b,t,e,g);osc('square',b*1.53,t,e,g);crack(t,5000,.03,.15,o);}
  function alarm(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.35);for(let i=0;i<4;i++){const g=A.createGain();const lp=filt('lowpass',1800,2,o);g.connect(lp);const tt=t+i*.32,e=env(g,tt,.01,.16,.05,.8,.06,.22);osc('square',i%2?587:784,tt,e,g);osc('square',(i%2?587:784)*1.01,tt,e,g);}boom(t,60,40,.8,.5,o);}
  function waveClear(){chime([62,66,69,74,78],'triangle',.09,.18,.45);}
  function gameOver(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.7);boom(t,55,25,2,1,o);[50,49,46,38].forEach((m,i)=>{const g=A.createGain();const lp=filt('lowpass',900,0,o);g.connect(lp);const tt=t+i*.45,e=env(g,tt,.05,.2,.3,.6,1,.4);osc('sawtooth',mtof(m),tt,e,g);osc('sawtooth',mtof(m)*.995,tt,e,g);});}
  function click(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.05);const g=A.createGain();g.connect(o);const e=env(g,t,.001,.18,.02,.1,.03,0);osc('square',1300,t,e,g,700,.03);}
  function groan(pan,vol){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,pan,.35);const len=.7+Math.random()*.8,f=70+Math.random()*60;
    const g=A.createGain();const e=env(g,t,.12,vol,.2,.7,.4,len);
    const f1=filt('bandpass',520+Math.random()*120,7,o,320,len,t),f2=filt('bandpass',1000+Math.random()*200,9,o,700,len,t);g.connect(f1);g.connect(f2);
    const s=osc('sawtooth',f*1.15,t,e,g,f*.8,len);const l=A.createOscillator();l.frequency.value=5+Math.random()*4;const lg=A.createGain();lg.gain.value=f*.06;l.connect(lg);lg.connect(s.frequency);l.start(t);l.stop(e+.05);
    const n=A.createGain();n.gain.value=.25;n.connect(f1);noise(t,e,n,.5);}
  function engineSet(on){if(!A)return;if(on&&!engine&&pref.sfx){const t=A.currentTime;const g=A.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.35,t+.3);const o=out(sfxBus,.3,.1);const lp=filt('lowpass',380,3,o);g.connect(lp);
      const s1=A.createOscillator();s1.type='sawtooth';s1.frequency.value=48;const s2=A.createOscillator();s2.type='square';s2.frequency.value=72;s1.connect(g);s2.connect(g);
      const l=A.createOscillator();l.frequency.value=11;const lg=A.createGain();lg.gain.value=8;l.connect(lg);lg.connect(s1.frequency);[s1,s2,l].forEach(x=>x.start());engine={g,nodes:[s1,s2,l],t0:t};}
    else if(!on&&engine){const t=A.currentTime;engine.g.gain.cancelScheduledValues(t);engine.g.gain.setValueAtTime(engine.g.gain.value,t);engine.g.gain.exponentialRampToValueAtTime(.0001,t+.3);engine.nodes.forEach(x=>x.stop(t+.35));engine=null;}
    if(engine){const k=Math.min(1,(A.currentTime-engine.t0)/2.5);engine.nodes[0].frequency.setTargetAtTime(48+k*30,A.currentTime,.2);engine.nodes[1].frequency.setTargetAtTime(72+k*45,A.currentTime,.2);}}
  function ambient(dt,ens){if(!ok())return;groanT-=dt;if(groanT>0||!ens.length)return;groanT=1.6+Math.random()*3.2;const e=ens[Math.floor(Math.random()*ens.length)];if(e.dead||e.type==='boss')return;
    const near=Math.max(0,1-(e.z-100)/1100);groan(e.x/600,.05+near*.25*(e.type==='brute'?1.4:1));}
  // cutscene
  function whoosh(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.4);const g=A.createGain();const b=filt('bandpass',200,1.5,o,2600,.5,t);g.connect(b);const e=env(g,t,.15,.3,.2,.5,.3,.2);noise(t,e,g);}
  function type(){if(!ok()||!thr('type',.035))return;const t=A.currentTime;const o=out(sfxBus,0);const g=A.createGain();const b=filt('bandpass',2400+Math.random()*900,4,o);g.connect(b);const e=env(g,t,.001,.08,.01,.1,.02,0);noise(t,e,g);}
  function thunder(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.6);const g=A.createGain();const lp=filt('lowpass',600,0,o,80,2.5,t);g.connect(lp);const e=env(g,t+.05,.04,.8,.5,.4,2,0);noise(t+.05,e,g,.4);boom(t,60,30,1.6,.6,o);}
  function hiss(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.3);const g=A.createGain();const b=filt('bandpass',3000,.8,o,1200,2.5,t);g.connect(b);const e=env(g,t,.4,.18,.5,.6,1.5,1.5);noise(t,e,g);}
  function buzz(){if(!ok())return;const t=A.currentTime;const o=out(sfxBus,0,.1);const g=A.createGain();const lp=filt('lowpass',1200,0,o);g.connect(lp);const e=env(g,t,.01,.07,.05,.8,.1,.6);osc('sawtooth',120,t,e,g);osc('square',240,t,e,g);}
  // ---- MUSIC: lookahead sequencer ----
  function mNote(type,m,t,len,vol,cut,opts){const o=opts||{};const dest=A.createGain();dest.connect(musicBus);if(o.rv){const s=A.createGain();s.gain.value=o.rv;dest.connect(s);s.connect(revIn);}if(o.dl){const s=A.createGain();s.gain.value=o.dl;dest.connect(s);s.connect(dlyIn);}
    const lp=filt('lowpass',cut,o.q||1,dest,o.cut2,o.ct,t);const g=A.createGain();g.connect(lp);const e=env(g,t,o.a||.005,vol,o.d||.08,o.s==null?.6:o.s,o.r||.1,len);
    osc(type,mtof(m),t,e,g);if(o.det)osc(type,mtof(m)*(1+o.det),t,e,g);if(o.sub)osc('sine',mtof(m-12),t,e,g);}
  function kick(t,v){const g=A.createGain();g.connect(musicBus);const e=env(g,t,.002,v,.12,.01,.05,0);osc('sine',140,t,e,g,42,.12);}
  function snare(t,v){const g=A.createGain();const b=filt('bandpass',1800,.8,musicBus);g.connect(b);const s=A.createGain();s.gain.value=.25;g.connect(s);s.connect(revIn);const e=env(g,t,.001,v,.05,.2,.12,0);noise(t,e,g);
    const g2=A.createGain();g2.connect(musicBus);const e2=env(g2,t,.001,v*.5,.05,.1,.05,0);osc('triangle',190,t,e2,g2,140,.05);}
  function hat(t,v){const g=A.createGain();const h=filt('highpass',7000,0,musicBus);g.connect(h);const e=env(g,t,.001,v,.02,.1,.02,0);noise(t,e,g);}
  const T={
    title:{bpm:88,len:64,fn(s,t,sp){const bar=s>>4,i=s&15,R=[38,34,31,33][bar],CH=[[62,65,69],[58,62,65],[55,58,62],[57,61,64]][bar];
      if(i%2===0)mNote('sawtooth',(i%4===2?R+12:R),t,sp*1.6,.22,520,{cut2:220,ct:sp*1.5,det:.004,s:.3});
      if(i===0)CH.forEach(m=>mNote('sawtooth',m,t,sp*15,.05,900,{a:.6,d:.3,s:.8,r:1.2,det:.006,rv:.5}));
      const MEL={0:[74,0],6:[77,0],12:[76,0],16:[74,1],24:[70,1],32:[67,2],38:[70,2],44:[74,2],48:[73,3],56:[69,3]},n=MEL[s];
      if(n&&passN%2===1)mNote('triangle',n[0]+12,t,sp*.5,.09,3000,{d:.3,s:.1,r:.6,dl:.6,rv:.3});
      if(i===0&&bar===0)kick(t,.35);}},
    combat:{bpm:128,len:64,fn(s,t,sp){const bar=s>>4,i=s&15,R=[40,36,38,35][bar],CH=[[64,67,71],[60,64,67],[62,66,69],[59,63,66]][bar],hi=intensity;
      const off=[0,0,12,0,0,0,12,0,0,0,12,0,0,12,0,12][i];mNote('sawtooth',R+off,t,sp*.8,.2,700,{cut2:200,ct:sp*.8,det:.004,s:.2,sub:i%4===0});
      if(i===0)CH.forEach(m=>mNote('sawtooth',m,t,sp*15,.035,1100,{a:.3,s:.8,r:.8,det:.007,rv:.4}));
      if(i===0||i===8||(hi&&(i===4||i===12))||(i===10&&bar===3))kick(t,.55);
      if(i===4||i===12)snare(t,.3);
      if(hi?true:i%2===0)hat(t,i%4===2?.09:.05);
      if(hi&&i%2===0)mNote('square',CH[(i>>1)%3]+12,t,sp*.6,.05,2400,{d:.05,s:.2,r:.05,dl:.4});
      if(!hi&&i===14&&bar===3)mNote('triangle',CH[2]+12,t,sp*2,.06,3000,{s:.2,r:.4,dl:.6});}},
    cine:{bpm:60,len:32,fn(s,t,sp){if(s%16===0){[38,45].forEach(m=>mNote('sawtooth',m,t,sp*15,.09,420,{a:1.5,s:.9,r:2,det:.005,rv:.6}));kick(t,.4);}
      if(s%8===4&&Math.random()<.6)mNote('triangle',[74,77,81,69][Math.floor(Math.random()*4)],t,sp,.05,3000,{d:.4,s:.1,r:1,dl:.6,rv:.6});}},
  };
  let passN=0;
  function sched(){if(!A)return;
    if(want!==track){track=want;step=0;passN=0;nextT=A.currentTime+.08;}
    if(!track||!T[track])return;const tr=T[track],sp=60/tr.bpm/4;
    while(nextT<A.currentTime+.14){tr.fn(step,nextT,sp);nextT+=sp;step++;if(step>=tr.len){step=0;passN++;}}}
  function setTrack(n){want=n;}
  function setPause(p){if(!A)return;musicBus.gain.setTargetAtTime(pref.music?(p?.15:.42):0,A.currentTime,.2);}
  function toggle(k){pref[k]=!pref[k];try{localStorage.setItem(PK,JSON.stringify(pref));}catch(e){}
    if(A){musicBus.gain.setTargetAtTime(pref.music?.42:0,A.currentTime,.1);sfxBus.gain.setTargetAtTime(pref.sfx?.8:0,A.currentTime,.1);if(!pref.sfx)engineSet(false);}}
  return{init,shot,slash,hit,die,wallHit,wallBreak,explosion,hurt,heroDown,levelUp,freed,tap,alarm,waveClear,gameOver,click,groan,ambient,engineSet,whoosh,type,thunder,hiss,buzz,setTrack,setPause,toggle,
    set intensity(v){intensity=v;},get pref(){return pref;}};
})();

const ATLAS_SRC="assets/atlas.webp?v=4f9e62236b";
const ATL_DATA={"rects":[[0,0,84,149,42,150],[86,0,86,150,43,150],[174,0,85,150,42,150],[261,0,91,150,45,150],[354,0,87,150,43,150],[443,0,83,150,41,150],[528,0,90,150,45,150],[620,0,90,144,45,150],[712,0,87,150,43,150],[801,0,85,148,42,150],[888,0,90,150,45,149],[980,0,89,148,44,149],[1071,0,89,144,44,148],[1162,0,87,143,43,148],[1251,0,83,145,36,145],[1336,0,81,145,36,145],[1419,0,110,154,32,154],[1531,0,105,154,36,154],[1638,0,90,147,39,146],[1730,0,85,147,39,146],[1817,0,89,145,44,145],[1908,0,110,141,55,141],[0,156,126,142,63,141],[128,156,89,141,44,144],[219,156,103,137,52,143],[324,156,117,137,58,140],[443,156,76,150,33,150],[521,156,78,150,32,150],[601,156,70,151,35,151],[673,156,69,150,29,151],[744,156,79,150,30,150],[825,156,73,150,35,150],[900,156,87,151,43,150],[989,156,88,151,44,150],[1079,156,87,151,43,150],[1168,156,90,151,45,150],[1260,156,89,151,44,150],[1351,156,71,149,36,148],[1424,156,75,146,37,147],[1501,156,76,147,38,148],[1579,156,81,145,40,146],[1662,156,75,144,37,145],[1739,156,79,146,39,147],[1820,156,74,144,36,145],[1896,156,77,143,39,147],[0,309,80,142,41,143],[82,309,103,142,39,142],[187,309,131,142,39,144],[320,309,139,153,38,154],[461,309,117,142,39,142],[580,309,80,141,40,140],[662,309,75,115,37,114],[739,309,85,108,42,109],[826,309,91,108,45,109],[919,309,75,118,37,117],[996,309,83,108,42,110],[1081,309,90,109,45,110],[1173,309,101,151,50,150],[1276,309,99,151,49,150],[1377,309,100,151,50,150],[1479,309,100,151,50,150],[1581,309,99,151,49,150],[1682,309,101,147,50,146],[1785,309,87,154,44,154],[1874,309,86,155,43,155],[1962,309,84,155,42,155],[0,466,84,155,42,155],[86,466,85,155,42,155],[173,466,85,155,42,155],[260,466,86,155,43,155],[348,466,86,156,43,155],[436,466,97,154,48,153],[535,466,125,147,44,148],[662,466,142,165,45,165],[806,466,187,170,45,171],[995,466,195,167,54,169],[1192,466,183,157,53,158],[1377,466,105,159,52,158],[1484,466,115,159,56,158],[1601,466,122,159,61,159],[1725,466,118,159,59,158],[1845,466,115,159,58,158],[0,638,116,159,58,158],[118,638,92,150,46,149],[212,638,92,152,46,151],[306,638,93,152,46,151],[401,638,91,154,46,153],[494,638,92,150,46,149],[588,638,92,148,46,147],[682,638,99,149,49,148],[783,638,90,149,45,149],[875,638,94,149,46,151],[971,638,89,149,44,149],[1062,638,94,149,46,149],[1158,638,93,146,46,149],[1253,638,96,150,47,150],[1351,638,87,151,43,151],[1440,638,99,151,41,150],[1541,638,83,151,35,151],[1626,638,102,152,36,151],[1730,638,82,151,36,150],[1814,638,83,147,37,146],[1899,638,95,151,40,150],[0,799,96,146,47,145],[98,799,96,144,47,143],[196,799,114,139,57,140],[312,799,94,148,46,147],[408,799,105,143,52,143],[515,799,127,141,63,141],[644,799,85,151,36,150],[731,799,101,150,37,150],[834,799,82,151,33,150],[918,799,82,154,35,153],[1002,799,99,152,35,151],[1103,799,82,153,34,152],[1187,799,90,152,45,150],[1279,799,89,152,45,150],[1370,799,87,153,44,151],[1459,799,84,152,42,150],[1545,799,89,152,45,150],[1636,799,84,149,42,147],[1722,799,77,162,38,160],[1801,799,82,162,41,160],[1885,799,77,164,38,162],[1964,799,81,161,40,159],[0,965,83,157,41,163],[85,965,82,165,41,163],[169,965,81,165,41,163],[252,965,77,165,38,163],[331,965,105,156,52,155],[438,965,108,155,45,153],[548,965,152,155,41,153],[702,965,192,156,46,155],[896,965,201,159,52,157],[1099,965,161,155,55,153],[1262,965,119,168,59,167],[1383,965,125,168,63,166],[1510,965,145,166,73,165],[1657,965,115,168,56,166],[1774,965,125,169,62,167],[1901,965,122,169,61,167],[0,1136,97,151,49,150],[99,1136,94,152,47,151],[195,1136,96,152,48,151],[293,1136,102,151,50,150],[397,1136,101,151,50,150],[500,1136,100,151,49,150],[602,1136,91,151,45,150],[695,1136,85,148,43,150],[782,1136,85,149,42,151],[869,1136,87,151,44,150],[958,1136,84,151,42,150],[1044,1136,86,151,43,150],[1132,1136,91,149,45,150],[1225,1136,85,148,42,150],[1312,1136,87,151,47,150],[1401,1136,76,149,38,148],[1479,1136,77,150,38,149],[1558,1136,91,150,38,149],[1651,1136,75,150,37,149],[1728,1136,75,150,37,149],[1805,1136,107,139,53,138],[1914,1136,118,137,59,136],[0,1290,142,135,71,134],[144,1290,116,128,58,127],[262,1290,130,126,64,124],[394,1290,133,125,67,123],[529,1290,87,151,41,150],[618,1290,90,153,48,152],[710,1290,88,153,46,152],[800,1290,90,156,49,155],[892,1290,101,156,45,155],[995,1290,88,156,48,155],[1085,1290,118,143,50,143],[1205,1290,101,142,46,142],[1308,1290,112,143,38,143],[1422,1290,143,142,40,142],[1567,1290,153,141,48,141],[1722,1290,149,143,64,142],[1873,1290,110,150,55,150],[0,1448,109,151,54,151],[111,1448,110,152,55,152],[223,1448,109,150,54,150],[334,1448,109,149,54,148],[445,1448,108,149,54,149],[555,1448,115,152,57,154],[672,1448,105,149,52,153],[779,1448,108,150,54,154],[889,1448,107,150,53,153],[998,1448,105,152,52,154],[1105,1448,110,150,56,154],[1217,1448,104,149,52,155],[1323,1448,106,155,53,157],[1431,1448,119,151,55,150],[1552,1448,90,149,38,148],[1644,1448,100,162,39,161],[1746,1448,88,150,38,149],[1836,1448,90,150,37,149],[1928,1448,99,151,38,150],[0,1612,117,141,58,140],[119,1612,123,139,61,139],[244,1612,143,138,72,138],[389,1612,115,143,57,142],[506,1612,113,139,56,140],[621,1612,135,139,67,140],[758,1612,100,144,50,144],[860,1612,92,156,37,156],[954,1612,86,145,37,145],[1042,1612,83,147,37,147],[1127,1612,90,157,34,156],[1219,1612,85,147,37,147],[1306,1612,118,152,54,150],[1426,1612,115,152,55,150],[1543,1612,109,152,55,150],[1654,1612,108,152,54,150],[1764,1612,110,152,54,150],[1876,1612,106,152,53,150],[0,1771,90,150,46,148],[92,1771,90,148,45,148],[184,1771,90,149,45,148],[276,1771,90,148,45,148],[368,1771,87,148,43,148],[457,1771,90,149,45,148],[549,1771,91,149,45,148],[642,1771,92,149,46,148],[736,1771,128,132,55,130],[866,1771,123,133,41,131],[991,1771,138,132,41,130],[1131,1771,136,132,43,130],[1269,1771,114,132,44,130],[1385,1771,117,131,41,129],[1504,1771,120,146,59,144],[1626,1771,123,146,60,144],[1751,1771,128,146,63,144],[1881,1771,123,148,61,146],[0,1923,124,147,62,145],[126,1923,124,146,61,144],[252,1923,98,116,48,119],[352,1923,84,122,42,121],[438,1923,102,120,51,119],[542,1923,93,122,46,122],[637,1923,105,115,52,114],[744,1923,99,122,49,121],[845,1923,96,118,48,117],[943,1923,94,122,47,121],[1039,1923,105,107,52,106],[1146,1923,131,119,65,118],[1279,1923,134,122,67,122],[1415,1923,136,142,68,142],[1553,1923,106,107,53,106],[1661,1923,110,107,55,106],[1773,1923,113,113,56,112],[1888,1923,94,113,47,112],[0,2072,106,97,53,97],[108,2072,112,75,55,75],[222,2072,120,59,60,58],[344,2072,119,92,59,92],[465,2072,118,62,61,62],[585,2072,76,121,38,120],[663,2072,75,121,37,120],[740,2072,75,121,38,120],[817,2072,75,121,38,120],[894,2072,74,121,37,120],[970,2072,78,121,39,120],[1050,2072,75,121,38,120],[1127,2072,75,121,37,120],[1204,2072,70,92,35,92],[1276,2072,94,93,47,93],[1372,2072,102,93,51,93],[1476,2072,113,94,56,94],[1591,2072,119,96,59,96],[1712,2072,100,82,49,82],[1814,2072,69,93,34,94],[1885,2072,69,92,29,93],[1956,2072,80,92,42,93],[0,2195,86,90,44,91],[88,2195,87,90,40,89],[177,2195,79,90,34,90],[258,2195,69,78,34,78],[329,2195,89,78,44,77],[420,2195,101,81,50,80],[523,2195,111,82,55,82],[636,2195,75,75,37,75],[713,2195,85,73,42,72],[800,2195,90,69,45,69],[892,2195,57,82,28,82],[951,2195,67,76,33,76],[1020,2195,72,65,36,65],[1094,2195,91,57,45,57],[1187,2195,98,84,48,85],[1287,2195,110,84,55,85],[1399,2195,111,65,55,65],[1512,2195,109,47,54,47],[1623,2195,65,123,32,121],[1690,2195,66,121,33,120],[1758,2195,65,120,32,119],[1825,2195,67,120,33,119],[1894,2195,66,122,33,121],[1962,2195,70,122,35,121],[0,2320,68,121,33,120],[70,2320,70,120,35,119],[142,2320,82,124,41,123],[226,2320,102,123,50,122],[330,2320,112,127,56,125],[444,2320,114,121,57,119],[560,2320,81,125,41,123],[643,2320,89,125,44,124],[734,2320,100,118,50,117],[836,2320,86,136,43,135],[924,2320,91,116,45,115],[1017,2320,91,102,45,102],[1110,2320,101,83,47,82],[1213,2320,122,64,58,63],[1337,2320,138,46,65,45],[1477,2320,66,117,33,115],[1545,2320,72,119,36,118],[1619,2320,67,121,33,121],[1688,2320,71,120,35,119],[1761,2320,71,121,35,121],[1834,2320,69,122,34,121],[1905,2320,69,122,34,121],[1976,2320,71,118,35,117],[0,2458,88,117,44,115],[90,2458,108,126,54,125],[200,2458,117,127,59,126],[319,2458,103,100,51,98],[424,2458,80,119,40,117],[506,2458,102,127,51,126],[610,2458,111,120,55,119],[723,2458,89,121,44,122],[814,2458,99,107,49,107],[915,2458,102,87,51,87],[1019,2458,113,67,56,66],[1134,2458,133,50,67,52],[1269,2458,144,42,72,41],[1415,2458,82,112,41,118],[1499,2458,92,113,46,120],[1593,2458,92,112,46,118],[1687,2458,90,120,45,119],[1779,2458,92,121,46,120],[1873,2458,93,115,46,122],[0,2587,94,117,47,123],[96,2587,94,115,47,122],[192,2587,124,117,62,116],[318,2587,126,112,63,112],[446,2587,122,122,61,122],[570,2587,157,102,76,101],[729,2587,121,121,60,120],[852,2587,126,122,63,121],[980,2587,134,118,67,117],[1116,2587,115,127,57,126],[1233,2587,112,111,56,110],[1347,2587,110,99,55,98],[1459,2587,117,86,58,85],[1578,2587,132,69,66,68],[1712,2587,145,56,71,55],[1859,2587,77,120,38,119],[1938,2587,80,122,40,120],[0,2716,80,122,40,120],[82,2716,77,122,38,121],[161,2716,78,121,39,120],[241,2716,79,121,39,120],[322,2716,83,122,41,120],[407,2716,84,121,42,120],[493,2716,98,122,49,124],[593,2716,109,119,54,120],[704,2716,108,121,54,121],[814,2716,154,117,77,116],[970,2716,96,124,48,123],[1068,2716,106,125,53,124],[1176,2716,115,125,58,124],[1293,2716,99,134,49,132],[1394,2716,109,124,51,123],[1505,2716,120,107,60,106],[1627,2716,131,97,65,97],[1760,2716,140,67,69,67],[0,2852,151,53,75,53],[153,2852,109,118,54,118],[264,2852,106,120,53,119],[372,2852,105,119,52,118],[479,2852,105,123,52,122],[586,2852,108,122,54,121],[696,2852,109,125,55,125],[807,2852,104,127,52,126],[913,2852,109,120,55,118],[1024,2852,145,131,72,132],[1171,2852,161,127,81,127],[1334,2852,173,149,86,148],[1509,2852,132,128,66,127],[1643,2852,135,142,67,140],[1780,2852,144,154,72,153],[0,3008,163,154,83,153],[165,3008,119,120,59,119],[286,3008,116,121,58,120],[404,3008,120,122,60,120],[526,3008,131,122,65,120],[659,3008,119,122,59,120],[780,3008,119,122,59,120],[901,3008,102,120,51,118],[1005,3008,90,120,45,118],[1097,3008,135,139,68,137],[1234,3008,150,143,76,141],[1386,3008,124,160,61,159],[1512,3008,135,160,64,159],[1649,3008,158,125,76,123],[1809,3008,156,134,77,132],[0,3170,148,121,74,121],[150,3170,178,123,89,123],[330,3170,207,134,103,133],[539,3170,235,137,117,135],[776,3170,126,122,63,120],[904,3170,157,120,78,118],[1063,3170,168,122,84,120],[1233,3170,110,137,55,136],[1345,3170,110,129,55,128],[1457,3170,113,123,56,122],[1572,3170,123,116,61,114],[1697,3170,134,101,66,100],[1833,3170,135,99,66,97],[0,3309,139,89,69,87],[141,3309,136,88,68,86],[279,3309,111,117,55,116],[392,3309,102,120,51,119],[496,3309,107,123,54,122],[605,3309,104,124,52,123],[711,3309,108,122,54,121],[821,3309,103,120,51,120],[926,3309,102,121,51,120],[1030,3309,91,116,45,115],[1123,3309,142,130,71,129],[1267,3309,143,133,71,132],[1412,3309,121,160,61,159],[1535,3309,125,161,62,160],[1662,3309,148,148,77,147],[1812,3309,155,137,76,136],[0,3472,96,96,0,0],[98,3472,96,96,0,0],[196,3472,96,96,0,0],[294,3472,96,96,0,0],[392,3472,96,96,0,0],[490,3472,96,96,0,0],[588,3472,96,96,0,0],[0,3570,79,117,41,119],[81,3570,79,120,37,120],[162,3570,80,121,40,120],[244,3570,84,122,40,121],[330,3570,84,122,41,121],[416,3570,84,121,42,120],[502,3570,80,118,39,121],[584,3570,80,117,40,120],[666,3570,81,113,40,113],[749,3570,108,113,54,113],[859,3570,125,113,60,113],[986,3570,142,118,69,118],[1130,3570,145,122,71,122],[1277,3570,146,132,72,132],[1425,3570,83,107,42,106],[1510,3570,94,105,48,105],[1606,3570,98,105,51,105],[1706,3570,127,105,42,104],[1835,3570,130,104,43,103],[0,3704,91,102,45,102],[93,3704,159,108,77,108],[254,3704,161,110,77,109],[417,3704,166,111,80,110],[585,3704,150,111,74,110],[737,3704,83,108,42,108],[822,3704,97,112,48,111],[921,3704,118,98,48,98],[1041,3704,95,134,48,134],[1138,3704,98,121,53,122],[1238,3704,103,116,53,117],[1343,3704,125,108,64,107],[1470,3704,141,93,72,92],[1613,3704,137,74,69,74],[1752,3704,141,59,69,58],[1895,3704,137,42,66,41],[0,3840,86,117,35,119],[88,3840,83,120,35,123],[173,3840,83,122,43,125],[258,3840,85,117,41,119],[345,3840,84,120,47,121],[431,3840,86,119,49,119],[519,3840,96,121,59,127],[617,3840,95,120,55,126],[714,3840,104,120,61,126],[820,3840,117,120,66,126],[939,3840,119,126,62,126],[1060,3840,123,127,65,126],[1185,3840,123,140,53,146],[1310,3840,116,142,63,144],[1428,3840,108,144,50,148],[1538,3840,103,140,45,144],[1643,3840,86,142,43,141],[1731,3840,104,127,55,126],[1837,3840,93,136,49,137],[1932,3840,105,119,52,119],[0,3986,106,92,52,93],[108,3986,125,69,61,69],[235,3986,127,46,55,47],[364,3986,130,40,51,39]],"meta":{"hex":{"idle":[0,1,2,3,4,5],"run":[6,7,8,9,10,11,12,13],"shoot":[14,15,16,17,18,19],"leanL":[20,21,22],"leanR":[23,24,25],"wshoot":[26,27,28,29,30,31]},"frost":{"idle":[32,33,34,35,36],"run":[37,38,39,40,41,42,43,44],"shoot":[45,46,47,48,49,50],"leanL":[51,52,53],"leanR":[54,55,56]},"volt":{"idle":[57,58,59,60,61,62],"run":[63,64,65,66,67,68,69,70],"shoot":[71,72,73,74,75,76],"leanL":[77,78,79],"leanR":[80,81,82]},"cmd":{"idle":[83,84,85,86,87,88],"run":[89,90,91,92,93,94,95,96],"shoot":[97,98,99,100,101,102],"leanL":[103,104,105],"leanR":[106,107,108],"wshoot":[109,110,111,112,113,114]},"blaze":{"idle":[115,116,117,118,119,120],"run":[121,122,123,124,125,126,127,128],"shoot":[129,130,131,132,133,134],"leanL":[135,136,137],"leanR":[138,139,140]},"rook":{"idle":[141,142,143,144,145,146],"run":[147,148,149,150,151,152,153,154],"shoot":[155,156,157,158,159,160],"leanL":[161,162,163],"leanR":[164,165,166],"wshoot":[167,168,169,170,171,172],"slash":[173,174,175,176,177,178]},"bruno":{"idle":[179,180,181,182,183,184],"run":[185,186,187,188,189,190,191,192],"shoot":[193,194,195,196,197,198],"leanL":[199,200,201],"leanR":[202,203,204],"wshoot":[205,206,207,208,209,210]},"nova":{"idle":[211,212,213,214,215,216],"run":[217,218,219,220,221,222,223,224],"shoot":[225,226,227,228,229,230],"leanL":[231,232,233],"leanR":[234,235,236]},"screecher":{"walk":[237,238,239,240,241,242,243,244],"attack":[245,246,247,248],"hit":[249,250,251],"death":[252,253,254,255,256,257]},"momma":{"walk":[258,259,260,261,262,263,264,265],"summon":[266,267,268,269,270,271],"throw":[272,273,274,275,276,277],"shriek":[278,279,280,281],"hit":[282,283,284],"death":[285,286,287,288,289,290,291,292]},"grunt":{"walk":[293,294,295,296,297,298,299,300],"attack":[301,302,303,304],"hit":[305,306,307],"death":[308,309,310,311,312,313]},"runner":{"walk":[314,315,316,317,318,319,320,321],"attack":[322,323,324,325],"hit":[326,327,328],"death":[329,330,331,332,333,334]},"brute":{"walk":[335,336,337,338,339,340,341,342],"attack":[343,344,345,346],"hit":[347,348,349],"death":[350,351,352,353,354,355]},"armored":{"walk":[356,357,358,359,360,361,362,363],"attack":[364,365,366,367],"hit":[368,369,370],"death":[371,372,373,374,375,376]},"splitter":{"walk":[377,378,379,380,381,382,383,384],"hit":[385,386,387],"death":[388,389,390,391]},"boss":{"walk":[392,393,394,395,396,397,398,399],"throw":[400,401,402,403,404,405],"roar":[406,407,408,409],"hit":[410,411,412],"death":[413,414,415,416,417,418,419,420]},"boss2":{"walk":[421,422,423,424,425,426,427,428],"throwcar":[429,430,431,432,433,434]},"por":{"hex":435,"frost":436,"volt":437,"blaze":438,"rook":439,"bruno":440,"nova":441},"momma2":{"walk":[442,443,444,445,446,447,448,449],"summon":[450,451,452,453,454,455],"throw":[456,457,458,459,460,461],"shriek":[462,463,464,465],"hit":[466,467,468],"death":[469,470,471,472,473,474,475,476]},"hexz":{"idle":[477,478,479,480,481,482],"cast":[483,484,485,486,487,488],"vanish":[489,490,491,492],"hit":[493,494],"death":[495,496,497,498,499,500]}}};
const RECTS=ATL_DATA.rects, META=ATL_DATA.meta;
const ATL=new Image(); let atlasReady=false; ATL.onload=()=>{atlasReady=true;ui();}; ATL.src=ATLAS_SRC;

const cv=document.getElementById('cv'),ctx=cv.getContext('2d'),stage=document.getElementById('stage');
const ov=document.getElementById('ov'),hud=document.getElementById('hud'),turn=document.getElementById('turn');

/* ---------- CAMERA (behind the squad, looking down the road) ---------- */
let WW=640;const WH=360;
const HOR=118, CAMH=222, D=200, F=200, ZFAR=1150, LANE=520, CELL=70, CELLW=110;
const CHAR_H=92, BODY_PX=150; // world height of a hero; atlas body height
let scale=1,ox=0,oy=0,dpr=1,camX=0,scroll=0;
/* ---------- BASE: concrete pad and a sandbag wall the horde has to break through ---------- */
const WALL_Z=78;
/* ---------- STAGE 1 ART: background plate, wall, towers, camp, refugees, skyline fx ---------- */
const ENV_D={"r": {"towerL": [0, 0, 272, 400, 136, 400], "towerR": [274, 0, 272, 400, 136, 400], "campL": [548, 0, 377, 330, 188, 330], "campR": [927, 0, 391, 330, 195, 330], "jwreck_3": [1320, 0, 174, 170, 91, 170], "jwreck_5": [1496, 0, 170, 170, 84, 170], "jwreck_4": [1668, 0, 172, 167, 86, 167], "pcar_3": [1842, 0, 162, 161, 81, 80], "jwreck_2": [0, 402, 184, 155, 91, 155], "pcar_1": [186, 402, 175, 147, 87, 73], "jdrive_2": [363, 402, 174, 145, 86, 145], "jdrive_4": [539, 402, 185, 144, 92, 144], "jdrive_0": [726, 402, 173, 143, 92, 143], "jdrive_1": [901, 402, 175, 143, 90, 143], "jdrive_3": [1078, 402, 178, 143, 85, 143], "jdmg_3": [1258, 402, 200, 143, 94, 143], "jdrive_5": [1460, 402, 178, 142, 92, 142], "jdmg_1": [1640, 402, 199, 142, 100, 142], "jdmg_2": [1841, 402, 198, 142, 97, 142], "pcar_2": [0, 559, 181, 142, 90, 71], "jdmg_0": [183, 559, 202, 141, 106, 141], "jwreck_1": [387, 559, 179, 141, 87, 141], "jflip_3": [568, 559, 200, 136, 94, 136], "jcrash_3": [770, 559, 185, 135, 92, 135], "jflip_1": [957, 559, 199, 135, 100, 135], "jflip_2": [1158, 559, 198, 134, 97, 134], "jwreck_0": [1358, 559, 170, 134, 85, 134], "jcrash_2": [1530, 559, 186, 130, 92, 130], "jflip_0": [1718, 559, 202, 129, 106, 129], "jcrash_1": [1922, 559, 185, 127, 92, 127], "jcrash_0": [0, 703, 185, 125, 92, 125], "jcrash_4": [187, 703, 185, 120, 92, 120], "pcar_0": [374, 703, 173, 120, 86, 60], "pwheel_3": [549, 703, 134, 110, 67, 55], "pwheel_2": [685, 703, 135, 109, 68, 55], "pwheel_1": [822, 703, 134, 107, 67, 54], "pblast_3": [958, 703, 153, 107, 76, 107], "pwheel_0": [1113, 703, 137, 106, 68, 53], "pblast_4": [1252, 703, 137, 106, 68, 106], "ptank_0": [1391, 703, 141, 104, 70, 52], "pgurney_0": [1534, 703, 137, 101, 69, 50], "pgurney_1": [1673, 703, 139, 101, 70, 51], "pgurney_2": [1814, 703, 137, 101, 69, 51], "pgurney_3": [1953, 703, 132, 101, 66, 51], "ptank_2": [0, 830, 136, 101, 68, 51], "ptank_3": [138, 830, 133, 97, 66, 48], "pblast_5": [273, 830, 126, 96, 63, 96], "ptank_1": [401, 830, 146, 92, 73, 46], "pblast_2": [549, 830, 124, 91, 62, 91], "scared_5_0": [675, 830, 70, 87, 35, 87], "pblast_1": [747, 830, 110, 86, 55, 86], "ref_0_3": [859, 830, 66, 84, 33, 84], "scared_0_0": [927, 830, 71, 84, 35, 84], "scared_2_0": [1000, 830, 75, 84, 37, 84], "ref_0_2": [1077, 830, 66, 83, 33, 83], "wall0": [0, 933, 2014, 82, 1007, 82], "wall1": [0, 1017, 2027, 82, 1013, 82], "wall2": [0, 1101, 1909, 82, 954, 82], "scared_0_3": [1911, 1101, 68, 82, 34, 82], "jcrash_5": [0, 1185, 177, 82, 92, 82], "pimpact_3": [179, 1185, 136, 82, 68, 82], "ref_0_0": [317, 1185, 67, 81, 33, 81], "ref_0_1": [386, 1185, 66, 81, 33, 81], "scared_5_3": [454, 1185, 66, 81, 33, 81], "scared_1_0": [522, 1185, 72, 80, 36, 80], "scared_2_3": [596, 1185, 71, 80, 35, 80], "scared_3_0": [669, 1185, 71, 80, 35, 80], "scared_4_0": [742, 1185, 69, 80, 34, 80], "pimpact_4": [813, 1185, 130, 80, 65, 80], "scared_4_3": [945, 1185, 66, 78, 33, 78], "ref_1_2": [1013, 1185, 66, 77, 33, 77], "scared_3_3": [1081, 1185, 60, 77, 30, 77], "scared_5_1": [1143, 1185, 55, 77, 27, 77], "ref_1_0": [1200, 1185, 66, 76, 33, 76], "ref_1_1": [1268, 1185, 66, 76, 33, 76], "ref_1_3": [1336, 1185, 66, 76, 33, 76], "ref_3_0": [1404, 1185, 67, 76, 33, 76], "ref_3_1": [1473, 1185, 65, 76, 32, 76], "ref_4_0": [1540, 1185, 85, 76, 42, 76], "ref_4_1": [1627, 1185, 97, 76, 48, 76], "ref_4_2": [1726, 1185, 111, 76, 55, 76], "ref_4_3": [1839, 1185, 89, 76, 44, 76], "pimpact_2": [1930, 1185, 124, 76, 62, 76], "ref_3_2": [0, 1269, 64, 75, 32, 75], "scared_1_3": [66, 1269, 64, 75, 32, 75], "ref_3_3": [132, 1269, 65, 74, 32, 74], "pblast_0": [199, 1269, 89, 74, 45, 74], "scared_0_1": [290, 1269, 57, 72, 28, 72], "scared_4_1": [349, 1269, 57, 72, 28, 72], "smoke_0": [408, 1269, 56, 72, 28, 72], "smoke_3": [466, 1269, 70, 72, 35, 72], "smoke_4": [538, 1269, 72, 72, 36, 72], "smoke_5": [612, 1269, 72, 72, 36, 72], "smoke_6": [686, 1269, 58, 72, 29, 72], "smoke_1": [746, 1269, 72, 71, 36, 71], "smoke_2": [820, 1269, 62, 71, 31, 71], "ref_5_0": [884, 1269, 88, 70, 44, 70], "scared_2_1": [974, 1269, 59, 70, 29, 70], "ref_5_3": [1035, 1269, 88, 69, 44, 69], "scared_3_1": [1125, 1269, 52, 68, 26, 68], "ref_2_1": [1179, 1269, 80, 67, 40, 67], "ref_2_2": [1261, 1269, 80, 67, 40, 67], "ref_2_3": [1343, 1269, 80, 67, 40, 67], "scared_1_1": [1425, 1269, 56, 67, 28, 67], "barrel_1": [1483, 1269, 50, 67, 25, 67], "barrel_2": [1535, 1269, 49, 67, 24, 67], "barrel_3": [1586, 1269, 49, 67, 24, 67], "barrel_4": [1637, 1269, 48, 67, 24, 67], "barrel_5": [1687, 1269, 48, 67, 24, 67], "ref_2_0": [1737, 1269, 80, 66, 40, 66], "scared_5_2": [1819, 1269, 55, 65, 27, 65], "barrel_0": [1876, 1269, 50, 65, 25, 65], "ref_5_1": [1928, 1269, 88, 63, 44, 63], "scared_0_2": [2018, 1269, 56, 61, 28, 61], "scared_2_2": [0, 1346, 56, 61, 28, 61], "ref_5_2": [58, 1346, 88, 59, 44, 59], "scared_1_2": [148, 1346, 50, 59, 25, 59], "pimpact_5": [200, 1346, 127, 59, 63, 59], "scared_4_2": [329, 1346, 52, 57, 26, 57], "scared_3_2": [383, 1346, 50, 56, 25, 56], "boom_2": [435, 1346, 67, 53, 33, 53], "pimpact_1": [504, 1346, 113, 53, 57, 53], "boom_3": [619, 1346, 69, 50, 34, 50], "fire_5": [690, 1346, 60, 47, 30, 47], "boom_1": [752, 1346, 65, 47, 32, 47], "boom_4": [819, 1346, 68, 47, 34, 47], "fire_3": [889, 1346, 60, 46, 30, 46], "embers_5": [951, 1346, 34, 45, 17, 45], "fire_4": [987, 1346, 59, 44, 29, 44], "embers_4": [1048, 1346, 34, 43, 17, 43], "fire_0": [1084, 1346, 57, 42, 28, 42], "fire_1": [1143, 1346, 57, 41, 28, 41], "fire_2": [1202, 1346, 58, 40, 29, 40], "embers_3": [1262, 1346, 33, 40, 16, 40], "embers_0": [1297, 1346, 32, 37, 16, 37], "embers_1": [1331, 1346, 30, 37, 15, 37], "embers_2": [1363, 1346, 30, 37, 15, 37], "boom_0": [1395, 1346, 67, 36, 33, 36], "boom_5": [1464, 1346, 61, 35, 30, 35], "crows_4": [1527, 1346, 49, 32, 24, 32], "pimpact_0": [1578, 1346, 104, 31, 52, 31], "crows_0": [1684, 1346, 50, 30, 25, 30], "crows_2": [1736, 1346, 46, 29, 23, 29], "crows_1": [1784, 1346, 46, 28, 23, 28], "crows_3": [1832, 1346, 46, 28, 23, 28], "crows_5": [1880, 1346, 48, 26, 24, 26]}, "m": {"gate": [0.4650578179989945, 0.555052790346908], "barrel": ["barrel_0", "barrel_1", "barrel_2", "barrel_3", "barrel_4", "barrel_5"], "ref": [["ref_0_0", "ref_0_1", "ref_0_2", "ref_0_3"], ["ref_1_0", "ref_1_1", "ref_1_2", "ref_1_3"], ["ref_2_0", "ref_2_1", "ref_2_2", "ref_2_3"], ["ref_3_0", "ref_3_1", "ref_3_2", "ref_3_3"], ["ref_4_0", "ref_4_1", "ref_4_2", "ref_4_3"], ["ref_5_0", "ref_5_1", "ref_5_2", "ref_5_3"]], "scared": [["scared_0_0", "scared_0_1", "scared_0_2", "scared_0_3"], ["scared_1_0", "scared_1_1", "scared_1_2", "scared_1_3"], ["scared_2_0", "scared_2_1", "scared_2_2", "scared_2_3"], ["scared_3_0", "scared_3_1", "scared_3_2", "scared_3_3"], ["scared_4_0", "scared_4_1", "scared_4_2", "scared_4_3"], ["scared_5_0", "scared_5_1", "scared_5_2", "scared_5_3"]], "fire": ["fire_0", "fire_1", "fire_2", "fire_3", "fire_4", "fire_5"], "embers": ["embers_0", "embers_1", "embers_2", "embers_3", "embers_4", "embers_5"], "smoke": ["smoke_0", "smoke_1", "smoke_2", "smoke_3", "smoke_4", "smoke_5", "smoke_6"], "boom": ["boom_0", "boom_1", "boom_2", "boom_3", "boom_4", "boom_5"], "crows": ["crows_0", "crows_1", "crows_2", "crows_3", "crows_4", "crows_5"], "jdrive": ["jdrive_0", "jdrive_1", "jdrive_2", "jdrive_3", "jdrive_4", "jdrive_5"], "jcrash": ["jcrash_0", "jcrash_1", "jcrash_2", "jcrash_3", "jcrash_4", "jcrash_5"], "jflip": ["jflip_0", "jflip_1", "jflip_2", "jflip_3"], "jdmg": ["jdmg_0", "jdmg_1", "jdmg_2", "jdmg_3"], "jwreck": ["jwreck_0", "jwreck_1", "jwreck_2", "jwreck_3", "jwreck_4", "jwreck_5"], "pgurney": ["pgurney_0", "pgurney_1", "pgurney_2", "pgurney_3"], "pwheel": ["pwheel_0", "pwheel_1", "pwheel_2", "pwheel_3"], "ptank": ["ptank_0", "ptank_1", "ptank_2", "ptank_3"], "pimpact": ["pimpact_0", "pimpact_1", "pimpact_2", "pimpact_3", "pimpact_4", "pimpact_5"], "pblast": ["pblast_0", "pblast_1", "pblast_2", "pblast_3", "pblast_4", "pblast_5"], "pcar": ["pcar_0", "pcar_1", "pcar_2", "pcar_3"]}},ER=ENV_D.r,EM=ENV_D.m;
const ENV=new Image();let envReady=false;ENV.onload=()=>{envReady=true;};ENV.src="assets/env.webp?v=826c825e17";
const PLATE=new Image();let plateReady=false;PLATE.onload=()=>{plateReady=true;};PLATE.src="assets/plate.webp?v=7aa354f5d0";
const PLATE_HZ=.383;
const SKYIMG=new Image();let skyReady=false;SKYIMG.onload=()=>{skyReady=true;};SKYIMG.src="assets/sky2.webp?v=44b6a4286e";
const PLATE2=new Image();let plate2Ready=false;PLATE2.onload=()=>{plate2Ready=true;};PLATE2.src="assets/plate2.webp?v=0781949f22";
function eDraw(k,x,y,sc,alpha){const r=ER[k];if(!r)return;if(alpha!==undefined)ctx.globalAlpha=alpha;ctx.drawImage(ENV,r[0],r[1],r[2],r[3],x,y,r[2]*sc,r[3]*sc);ctx.globalAlpha=1;}
function eDrawA(k,x,y,sc,flip,alpha){const r=ER[k];if(!r)return;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);if(alpha!==undefined)ctx.globalAlpha=alpha;ctx.drawImage(ENV,r[0],r[1],r[2],r[3],-r[4]*sc,-r[5]*sc,r[2]*sc,r[3]*sc);ctx.restore();}
const SKY={booms:[],nextBoom:2,crows:null,nextCrow:5,lastT:0};
function wallState(){if(!R)return 0;const f=R.wall/R.wallMax;return f>.6?0:f>.3?1:2;}
function towerGeo(side){
  const k=side<0?'towerL':'towerR',r=ER[k];if(!r)return null;
  const th=WH*.56,sc=th/r[3],w=r[2]*sc,kW=K(WALL_Z),yb=HOR+CAMH*kW+4;
  const cx=(side<0?58:WW-58)-camX*kW*.3,x=cx-w/2,y=yb-th;
  return{k,x,y,sc,w,th,lx:x+w*(side<0?.66:.34),ly:y+th*.07};
}
const WALL_W=1.55,ROAD=440,WALL_STOP=34;
function drawPad(){}
function drawSky(dt){
  SKY.nextBoom-=dt;
  if(SKY.nextBoom<=0){SKY.nextBoom=3+Math.random()*5;SKY.booms.push({x:WW*(.18+Math.random()*.64),y:HOR-2-Math.random()*12,t:0,s:.22+Math.random()*.16});}
  for(const b of SKY.booms){b.t+=dt;const f=Math.floor(b.t*7);if(f<EM.boom.length)eDrawA(EM.boom[f],b.x,b.y,b.s);}
  SKY.booms=SKY.booms.filter(b=>b.t*7<EM.boom.length);
  SKY.nextCrow-=dt;
  if(!SKY.crows&&SKY.nextCrow<=0){const dir=Math.random()<.5?1:-1;SKY.crows={x:dir>0?-50:WW+50,y:22+Math.random()*44,dir,t:0};SKY.nextCrow=10+Math.random()*8;}
  const c=SKY.crows;if(c){c.t+=dt;c.x+=c.dir*55*dt;c.y+=Math.sin(c.t*1.3)*6*dt;eDrawA(EM.crows[Math.floor(c.t*8)%EM.crows.length],c.x,c.y,.45,c.dir<0);if(c.x<-80||c.x>WW+80)SKY.crows=null;}
}
function drawBeams(){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const side of[-1,1]){const g=towerGeo(side);if(!g)continue;
    const tx=WW/2+Math.sin(t*.45+(side>0?2.1:0))*WW*.28,ty=HOR+34+Math.sin(t*.7+side)*14,spread=46;
    const gr=ctx.createLinearGradient(g.lx,g.ly,tx,ty);gr.addColorStop(0,'rgba(255,236,170,.30)');gr.addColorStop(1,'rgba(255,236,170,0)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(g.lx,g.ly);ctx.lineTo(tx-spread,ty);ctx.lineTo(tx+spread,ty);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,236,170,.10)';ctx.beginPath();ctx.ellipse(tx,ty,spread*1.1,9,0,0,6.283);ctx.fill();}
  ctx.restore();
}
const REF_L=[[2,.60,.95],[5,.86,.90],[0,.36,.985]],REF_R=[[1,.62,.95],[4,.86,.90],[3,.36,.985]];
function drawWall(){
  if(!envReady)return;
  const kW=K(WALL_Z),yb=HOR+CAMH*kW,st=wallState();
  const r=ER['wall'+st],ww=WW*WALL_W,sc=ww/r[2],wh=r[3]*sc,wx=WW/2-ww/2-camX*kW*.3;
  const sg=ctx.createLinearGradient(0,yb-wh*.5,0,yb+14);sg.addColorStop(0,'rgba(0,0,0,0)');sg.addColorStop(.7,'rgba(0,0,0,.55)');sg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sg;ctx.fillRect(-20,yb-wh*.5,WW+40,wh*.5+14);
  eDraw('wall'+st,wx,yb-wh*.97,sc);
  if(st===2)for(const f of[.21,.62,.81]){const n=EM.fire.length;eDrawA(EM.fire[Math.floor(t*9+f*7)%n],wx+ww*f,yb-wh*.15,.42);}
  for(const side of[-1,1]){const g=towerGeo(side);if(g)eDraw(g.k,g.x,g.y,g.sc);}
  // camp corners + refugees
  const scat=R?Math.min(1,R.scatter/1.6):0,scared=R&&(R.wall/R.wallMax<.45||scat>0);
  for(const side of[-1,1]){
    const k=side<0?'campL':'campR',cr=ER[k],ch=WH*.4,cs=ch/cr[3],cw=cr[2]*cs;
    const cx=side<0?-cw*.16:WW-cw*.84,cy=yb+20-ch;
    eDraw(k,cx,cy,cs);
    if(side<0){const b=EM.barrel?ER.campL&&EM.barrel:null;const bx=cx+cw*EM.barrel[0],by=cy+ch*EM.barrel[1];eDrawA(EM.embers[Math.floor(t*7)%EM.embers.length],bx,by-ch*.12,.55,false,.9);}
    for(const[row,fx,fy]of(side<0?REF_L:REF_R)){
      const set=scared?EM.scared:EM.ref,fr=set[row];if(!fr)continue;
      const n=fr.length,f=scared?Math.floor(t*6+row)%n:Math.floor(t*3+row*1.7)%n;
      const shake=scared&&!scat?Math.sin(t*40+row)*.6:0,run=scat*cw*1.1*(side<0?-1:1);
      if(scat>=1)continue;
      eDrawA(fr[f],cx+cw*(side<0?fx:1-fx)+shake+run,cy+ch*fy,.6,scat>0?side<0:side>0,1-scat*.6);
    }
  }
}
const K=z=>F/(z+D);
function P(x,z,h=0){const k=K(z);return[WW/2+(x-camX)*k,HOR+(CAMH-h)*k,k];}

/* ---------- DATA ---------- */
const HEROES={
 rook:{name:'Rook',role:'Operative',color:'#ff8a3d',rate:.5,dmg:11,range:1000,
   perks:['Twin pistols','Faster blade','Double tap: 2% chance to kill outright','Guardian: slides in to slash zombies on his squad','Super · Thousand cuts']},
 blaze:{name:'Blaze',role:'Flamer',color:'#ff7a2e',rate:.07,dmg:1.6,range:330,
   perks:['Wide cone','Long burn','Long reach']},
 volt:{name:'Volt',role:'Storm caller',color:'#a98bff',rate:1.0,dmg:15,range:800,
   perks:['+1 chain','+2 chains','Stun strike']},
 frost:{name:'Frost',role:'Cryo',color:'#9fe8ff',rate:.6,dmg:8,range:900,
   perks:['Shatter splash','Deep chill','Flash freeze']},
 hex:{name:'Hex',role:'Witch',color:'#c47bff',rate:.85,dmg:12,range:1050,
   perks:['Twin orbs','Hungry orbs','Splitting orbs','Hex mark: teleports and curses zombies in her face','Super · Banish']},
 bruno:{name:'Bruno',role:'Breacher',color:'#ffb347',rate:.9,dmg:7,range:1600,
   perks:['+2 pellets','Heavy knockback','Point blank','Breaching slug every 4th shot','Super · Bulldozer']},
 nova:{name:'Nova',role:'Sniper',color:'#ff5a6a',rate:2.0,dmg:55,range:1500,
   perks:['Quick bolt','Pierce all','Giant slayer']},
};
const HERO_ORDER=['bruno','rook','blaze','volt','frost','hex','nova'];
const PERK_LV=[5,10,15,20,25];
const WEAPONS={
 pistol:{name:'Semi-Auto Rifle',rate:.3,dmg:8.5},
 smg:{name:'SMG',rate:.09,dmg:3.6},
 shotgun:{name:'Shotgun',rate:.7,dmg:6,pel:6},
 rail:{name:'Railgun',rate:1.1,dmg:48},
 rocket:{name:'Rockets',rate:.85,dmg:22,splash:90},
 minigun:{name:'Minigun',rate:.045,dmg:4},
};
const WEAPON_ORDER=['pistol','smg','shotgun','rail','rocket','minigun'];
// squad fans out from the commander in a shallow arc (dx, dz)
const SLOTS=[[-90,10],[90,10],[-180,26]];
const xpNeed=l=>50+50*l+4*(l-1)*(l-1);
const trainCost=l=>Math.round(xpNeed(l)*2.5/5)*5;
const MAXLV=25,XP_SHARE=.2;
/* ---------- STATS: starting values per character, points add fixed amounts (cap 10 each), super is a 1-point unlock at 25 ---------- */
const ENEMY_K=7,HURT_K=.65,STAT_CAP=10,RIFLE_BASE=8.5;
const HSTAT={cmd:{hp:80,dmg:80,rec:5,crit:5,cm:2},bruno:{hp:120,dmg:150,rec:2,crit:3,cm:'zone'},rook:{hp:65,dmg:60,sword:200,rec:10,crit:10,cm:2.5},hex:{hp:55,dmg:125,rec:15,crit:15,cm:10},
  blaze:{hp:85,dmg:11,rec:5,crit:5,cm:2},volt:{hp:75,dmg:105,rec:5,crit:5,cm:2},frost:{hp:75,dmg:56,rec:5,crit:5,cm:2},nova:{hp:65,dmg:385,rec:5,crit:5,cm:2}};
const JOIN_LV={bruno:2,rook:4,hex:5,volt:8,blaze:8};
const ZONE_CM=[10,5,3,1,1];
const STAT_DEF=[['hp','Health',15,''],['dmg','Damage',10,''],['rec','Round recovery',5,'%'],['crit','Crit chance',5,'%']];
function lvOf(id){return id==='cmd'?save.cmd:((save.heroes[id]||(save.away&&save.away[id])||{lv:1}).lv);}
function pts(id){save.pts=save.pts||{};return save.pts[id]||(save.pts[id]={hp:0,dmg:0,rec:0,crit:0,sup:0});}
function ptsUsed(id){const p=pts(id);return p.hp+p.dmg+p.rec+p.crit+p.sup;}
function ptsFree(id){return Math.max(0,lvOf(id)-ptsUsed(id));}
function st(id){const b=HSTAT[id],p=pts(id);let crit=b.crit+5*p.crit;return{hp:b.hp+15*p.hp,dmg:b.dmg+10*p.dmg,sword:(b.sword||0)+10*p.dmg,rec:b.rec+5*p.rec,crit,cm:b.cm,sup:p.sup};}
const respecCost=id=>20*lvOf(id);
const perksOf=id=>(id==='cmd'?CMD_PERKS:HEROES[id].perks.length>=5?HEROES[id].perks:HEROES[id].perks.concat(['To be revealed','Super ability']));

/* ---------- SAVE ---------- */
const KEY='holdout-squad-v1';
let save={heroes:{},weapons:['pistol'],equip:'pistol',gold:0,best:0,cmd:1,active:[],fallen:[]};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.weapons){save=Object.assign(save,s);if(!Array.isArray(s.active))save.active=HERO_ORDER.filter(h=>save.heroes[h]).slice(0,3);}}catch(e){}
if(!Array.isArray(save.fallen))save.fallen=[];save.gold=Math.floor(save.gold||0);
save.active=save.active.filter(h=>save.heroes[h]);
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}
/* checkpoint: the wave you're on, so Continue drops you back at its start */
function checkpoint(){if(!R)return;if(R.s5||R.s6)return;if(R.cfa){cfaCkpt(R.cfaAt||'f1');return;}if(R.cfb){cfbCkpt(R.cfbAt||1);return;}markReach(R.forest?'3f':String(R.stage||1),R.stage===2?1:R.wave);save.ckpt={stage:R.forest?'3f':(R.stage||1),wave:R.stage===2?1:R.wave,hex:!!save.heroes.hex};persist();}
function clearCkpt(){if(save.ckpt){delete save.ckpt;persist();}}
const ckptLabel=c=>c.stage==='6'?'Stage 6 · The Drive, '+(c.wave==='start'?'the forest road':c.wave==='hwy'?'the highway':'Mega City'):c.stage==='5'?'Stage 5 · The Forest Run, '+(c.wave==='w1'?'wave 1':c.wave==='rit'?'the ritual':'the ranger station'):c.stage==='4a'?'Stage 4 · Cyber Future, '+(c.wave==='vault'?'containment':c.wave==='f4'?'the hall':'floor '+String(c.wave).slice(1)):c.stage===2?'Stage 2 · The Escape':c.stage===3?(c.wave==='end'?'Stage 3 · The Empty Town, ending':'Stage 3 · The Empty Town, wave '+c.wave):c.stage==='4b'?'Stage 4 · Cyber Future, '+(c.wave===1?'the courtyard':'floor '+String(c.wave).slice(1)):c.stage==='3f'?(c.wave==='end'?'Stage 3 · The Forest, ending':'Stage 3 · The Forest, wave '+c.wave):'Stage 1 · wave '+c.wave;
function resumeCkpt(){const c=save.ckpt;if(!c)return;if(!legacy().current)legacyStart(save.mode||'normal');SX=0;camX=0;
  if(c.stage===2)startStage2();
  else if(c.stage===3){startStage3();if(c.wave==='end'){R.wave=3;startTownEnd();}else if(c.wave>1)startWave3(c.wave);}
  else if(c.stage==='4b'){cfbStart(c.wave,c.clock);}
  else if(c.stage==='4a'){cfaStart(c.wave,c.turned);}
  else if(c.stage==='5'){s5Start(c.wave,1);}
  else if(c.stage==='6'){s6Start(c.wave,1);}
  else if(c.stage==='3f'){startForest();if(c.wave==='end'){if(c.hex&&save.away&&save.away.hex){save.heroes.hex=save.away.hex;delete save.away.hex;if(save.active.length<MAX_ACTIVE)save.active.push('hex');}R.wave=4;startForestEnd();}else if(c.wave>1){if(c.hex&&save.away&&save.away.hex){save.heroes.hex=save.away.hex;delete save.away.hex;if(save.active.length<MAX_ACTIVE)save.active.push('hex');}startWaveF(c.wave);}}
  else newRun(c.wave);}

/* ---------- RUN STATE ---------- */
let R=null,state='splash',SX=0,t=0;
const LANE_E=300;
function sxLimit(){return LANE_E;}
function newRun(startWave){setTimeout(()=>cineLoad(SHOTS2),20000);storyParty(startWave>1?['bruno']:[]);
  for(const id of['cmd',...Object.keys(save.heroes)])setHp(id,maxHp(id));for(const id of REVD)if(save.heroes[id])setHp(id,maxHp(id)*.5);REVD=[];
  R={wave:startWave,wall:WALL_MAX,wallMax:WALL_MAX,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,vx:0,prevSX:SX,dead:[]};
  startWave_(startWave);
}
function hpScale(w){return 1}
function spdScale(w){return .9}
function startWave_(w){
  R.wave=w;SND.alarm();setTimeout(checkpoint,0);
  const boss=w%5===0;
  // Stage 1 lineups: [total, runners, armored]
  const LU=(({1:[20,0,0],2:[30,10,0],3:[35,12,1],4:[40,13,3],5:[40,14,3]}[w]||[Math.max(20,4+w*4+Math.max(0,w-4)*2),Math.round(w*1.5),Math.round(w/2)])).map(n=>n*(HORDE()?2:1));
  const q=[];for(let i=0;i<LU[1];i++)q.push('runner');for(let i=0;i<LU[0]-LU[1]-LU[2];i++)q.push('grunt');
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}
  for(let i=0;i<LU[2];i++){const pos=Math.floor(q.length*(.3+.6*(i+1)/(LU[2]+1)));q.splice(pos,0,'armored');}
  R.queue=q;R.kills=0;
  R.spawnLeft=q.length; R.spawnTotal=R.spawnLeft; R.spawnT=2.6;
  R.bossPending=boss; R.crateAt=[];
  R.jeepAt=(!save.heroes.bruno&&!save.fallen.includes('bruno')&&!R.jeep)?Math.floor(R.spawnTotal*.6):-1;
  R.banner={txt:boss?'BOSS WAVE '+w:'WAVE '+w,t:2};
  state='play';ui();
}
function nextReward(){
  const lw=WEAPON_ORDER.filter(w=>!save.weapons.includes(w));
  return lw.length?{type:'weapon',id:lw[0]}:{type:'xp'};
}
/* ---------- HERO CAGE: parked on the far left, freed by shooting it or by kills ---------- */
const JAIL_Z=240,JAIL_W=130,JAIL_H=150;
function spawnJail(){
  const id=HERO_ORDER.find(h=>!save.heroes[h]&&h!=='bruno'&&!save.fallen.includes(h));if(!id)return;
  const hp=150+R.wave*60;R.jail={id,x:-sxLimit()+4,z:JAIL_Z,hp,max:hp,flash:0};
}

/* ---------- BRUNO'S JEEP: drives in, flips, tap it to pull him out ---------- */
const JEEP_STOP=280,JEEP_W=185,JEEP_HT=86;
function spawnJeep(cine){
  R.jeep={phase:'drive',x:Math.min(220,LANE-110),z:ZFAR+60,t:0,hp:240,max:240,meter:0,gunCd:.3,rot:0,hop:0,taps:0,cine:!!cine,spd:cine?440:300};
  if(!cine)R.banner={txt:'ALLIES INBOUND',t:2,col:'#c8d68a'};
}
/* ---------- CUTSCENE: grunts gather, Bruno plows through, jeep tumbles ---------- */
function startCine(){
  R.cinePending=false;R.cine={t:0,phase:'horde',bar:0,cap:'Something is moving out there...',spawned:0};
}
function cineUpdate(dt){
  const c=R.cine;c.t+=dt;
  c.bar=c.phase==='out'?Math.max(0,c.bar-dt*2):Math.min(1,c.bar+dt*2);
  const jx=Math.min(220,LANE-110);
  if(c.phase==='horde'){
    while(c.spawned<12&&c.t>c.spawned*.12){
      const e=mkEnemy('grunt',jx+(Math.random()*2-1)*(c.spawned%3===0?40:150),330+Math.random()*380);e.cine=1;e.x=Math.max(-LANE+40,Math.min(LANE-40,e.x));c.spawned++;}
    if(c.t>2.4){c.phase='jeep';c.t=0;spawnJeep(true);c.cap='BRUNO: "Hang on, I\'m coming through!"';}
  }else if(c.phase==='jeep'){
    if(R.jeep&&R.jeep.phase==='down'){c.phase='land';c.t=0;c.cap='The jeep flipped! Tap it to pull Bruno out!';}
  }else if(c.phase==='land'){
    if(c.t>1.8){c.phase='out';c.t=0;for(const e of R.en)e.cine=0;}
  }else if(c.phase==='out'){
    if(c.bar<=0)R.cine=null;
  }
}
function drawCine(){
  const c=R.cine,bh=Math.round(38*c.bar);if(bh<=0)return;
  ctx.fillStyle='#000';ctx.fillRect(-10,-10,WW+20,bh+10);ctx.fillRect(-10,WH-bh,WW+20,bh+10);
  if(c.phase!=='out'&&c.bar>.8){ctx.fillStyle='#f3e6c8';ctx.font='15px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(c.cap,WW/2,WH-bh/2+5);}
}

function jeepUpdate(dt){
  const j=R.jeep;if(!j)return;j.t+=dt;
  if(j.phase==='drive'){
    j.z-=j.spd*dt;j.x+=Math.sin(j.t*3)*20*dt;j.hop=Math.abs(Math.sin(j.t*14))*3;
    for(const e of R.en){if(e.dead||Math.abs(e.x-j.x)>JEEP_W*.5+e.r*.4||Math.abs(e.z-j.z)>46)continue;
      burst(e.x,e.z,e.r*1.5,e.col,10);R.shake=Math.max(R.shake||0,.12);e.dead=1;kill(e,'npc');}
    j.gunCd-=dt;
    if(j.gunCd<=0){j.gunCd=.16;
      let best=null,bd=520*520;for(const e of R.en){if(e.dead)continue;const d=(e.x-j.x)**2+(e.z-j.z)**2;if(d<bd){bd=d;best=e;}}
      if(best){const side=Math.random()<.5?-1:1;R.bolts.push({pts:[[j.x+side*36,j.z,JEEP_HT+26],[best.x,best.z,best.r]],life:.07,col:'#ffe08a',tr:1});damage(best,7,'npc');}
    }
    if(Math.random()<dt*20)R.pa.push({x:j.x+(Math.random()-.5)*80,z:j.z+40,h:4,vx:(Math.random()-.5)*40,vz:60,vh:30,t:.5,col:'#6b5a48',ng:1});
    if(j.z<=JEEP_STOP){j.phase='flip';j.t=0;R.shake=.2;SND.engineSet(false);SND.explosion(.5);}
  }else if(j.phase==='flip'){
    const d=j.cine?1.15:.85,turns=j.cine?3:1,p=Math.min(1,j.t/d);j.rot=Math.PI*turns*p;j.hop=Math.sin(Math.PI*p)*(j.cine?120:70);j.z-=(j.cine?90:40)*dt;j.x+=(j.cine?-50:30)*dt;
    if(p>=1){j.phase='down';j.t=0;SND.explosion(.8);j.rot=Math.PI;j.hop=0;R.shake=.4;burst(j.x,j.z,10,'#8a7a5c',26);
      if(!j.cine)R.banner={txt:'TAP THE JEEP TO FREE BRUNO',t:2.6,col:'#ffb347'};
      if(!j.cine)for(let i=0;i<3;i++)mkEnemy(i===1?'runner':'grunt',j.x+(i-1)*90,j.z+260+i*40);}
  }else if(j.phase==='down'){
    if(j.meter<1)j.meter=Math.max(0,j.meter-dt*.03);
    if(Math.random()<dt*10)R.pa.push({x:j.x+(Math.random()-.5)*60,z:j.z,h:30+Math.random()*20,vx:(Math.random()-.5)*20,vz:0,vh:70,t:.9,col:Math.random()<.3?'#ff8a3d':'#4a4450',ng:1});
    if(j.meter>=1)freeBruno(j);
    else if(j.hp<=0){j.phase='lost';j.t=0;SND.explosion(1);story(HORDE()?'hero_died':'hero_down',{hero:'bruno',how:'jeep_destroyed'});if(!save.fallen.includes('bruno'))save.fallen.push('bruno');if(!HORDE()){save.downed=save.downed||{};save.downed.bruno={lv:1,xp:0};}persist();R.shake=.5;burst(j.x,j.z,30,'#ff7a2e',40);burst(j.x,j.z,30,'#3a3440',30);
      R.banner={txt:'BRUNO IS DOWN',t:2.6,col:'#ff4d5e'};}
  }else{
    if(j.phase==='lost'&&Math.random()<dt*12)R.pa.push({x:j.x+(Math.random()-.5)*70,z:j.z,h:20,vx:0,vz:0,vh:80,t:1,col:Math.random()<.4?'#ff7a2e':'#3a3440',ng:1});
    if(j.t>(j.phase==='lost'?6:1.2))R.jeep=null;
  }
}
function freeBruno(j){if(j.phase!=='down')return;SND.freed();j.phase='freed';j.t=0;j.meter=1;addHero('bruno');persist();burst(j.x,j.z,40,'#ffb347',40);
  R.banner={txt:'BRUNO JOINS THE SQUAD',t:2.6,col:'#ffb347'};}
function jeepScreen(){const j=R.jeep;const[sx,sy,k]=P(j.x,j.z,j.hop);return{sx,sy,k,w:JEEP_W*k,h:JEEP_HT*k};}
function tapJeep(wx,wy){
  const j=R&&R.jeep;if(!j||j.phase!=='down')return false;
  const s=jeepScreen(),hw=Math.max(60,s.w*.7),top=s.sy-Math.max(80,s.h*2.6);
  if(wx<s.sx-hw||wx>s.sx+hw||wy<top||wy>s.sy+20)return false;
  j.meter=Math.min(1,j.meter+.06);j.taps++;SND.tap(j.meter);if(j.meter>=1)freeBruno(j);
  R.tx.push({x:s.sx+(Math.random()-.5)*40,y:s.sy-s.h-10,txt:'+',col:'#8fd3ff',t:.5});
  for(let i=0;i<4;i++)R.pa.push({x:j.x,z:j.z,h:40,vx:(Math.random()-.5)*160,vz:0,vh:120+Math.random()*80,t:.4,col:'#8fd3ff'});
  return true;
}
function drawJeep(j){
  const{sx,sy,k,w,h}=jeepScreen();
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(sx,P(j.x,j.z)[1],w*.62,w*.14,0,0,6.283);ctx.fill();
  if(envReady&&EM.jdrive){
    let set,f;
    if(j.phase==='drive'){set=EM.jdrive;f=Math.floor(j.t*10)%set.length;}
    else if(j.phase==='flip'){set=EM.jcrash;const d=j.cine?1.15:.85;f=Math.min(set.length-1,Math.floor(j.t/d*set.length));}
    else if(j.phase==='lost'){set=EM.jwreck;f=Math.min(set.length-1,Math.floor(j.t*7));if(f===set.length-1)f=set.length-2+Math.floor(j.t*6)%2;}
    else{set=j.hp/j.max>.5?EM.jflip:EM.jdmg;f=Math.floor(j.t*6)%set.length;}
    const ref=ER[EM.jdrive[0]],sc=w*1.3/ref[2],gy=P(j.x,j.z)[1]-(j.phase==='flip'?j.hop*k*.35:j.phase==='drive'?j.hop*k:0);
    const fade=j.phase==='freed'?Math.max(0,1-j.t/1.2):j.phase==='lost'?Math.max(.3,1-Math.max(0,j.t-3)/3):1;
    eDrawA(set[f],sx,gy,sc,false,fade);
  }else{
  const fade=j.phase==='lost'?Math.max(.25,1-j.t/6):j.phase==='freed'?Math.max(0,1-j.t/1.2):1;
  ctx.save();ctx.globalAlpha=fade;ctx.translate(sx,sy-h*.55);ctx.rotate(j.rot);
  const burnt=j.phase==='lost';
  ctx.fillStyle='#16161a';ctx.fillRect(-w*.5,h*.05,w*.2,h*.5);ctx.fillRect(w*.3,h*.05,w*.2,h*.5);
  ctx.fillStyle=burnt?'#2e2a26':'#56653a';ctx.fillRect(-w*.5,-h*.15,w,h*.42);
  ctx.fillStyle=burnt?'#25221f':'#46532f';ctx.fillRect(-w*.32,-h*.12,w*.64,h*.32);
  ctx.fillStyle='#2b3220';for(let i=-3;i<=3;i++)ctx.fillRect(i*w*.075-w*.012,-h*.08,w*.024,h*.24);
  ctx.fillStyle=j.phase==='drive'?'#fff2b0':'#5a5a4a';ctx.beginPath();ctx.arc(-w*.41,0,h*.08,0,6.283);ctx.arc(w*.41,0,h*.08,0,6.283);ctx.fill();
  ctx.strokeStyle=burnt?'#2e2a26':'#56653a';ctx.lineWidth=Math.max(2,4*k);ctx.strokeRect(-w*.42,-h*.62,w*.84,h*.44);
  ctx.fillStyle='rgba(120,160,190,.35)';ctx.fillRect(-w*.42,-h*.62,w*.84,h*.44);
  if(!burnt){ctx.fillStyle='#e8e2c8';ctx.beginPath();ctx.arc(0,h*.12,h*.06,0,6.283);ctx.fill();}
  if(j.phase==='drive'){
    for(const s of[-1,1]){ctx.fillStyle='#c79a72';ctx.beginPath();ctx.arc(s*w*.22,-h*.75,h*.13,0,6.283);ctx.fill();
      ctx.fillStyle='#4b5a32';ctx.beginPath();ctx.arc(s*w*.22,-h*.8,h*.14,Math.PI,0);ctx.fill();
      if(Math.random()<.5){ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(s*w*.3,-h*.82,h*.09,0,6.283);ctx.fill();}}
  }
  ctx.restore();ctx.globalAlpha=1;
  }
  if(j.phase==='down'){
    const bw=Math.max(110,w*1.2),bx=sx-bw/2,by=sy-h-46;
    if(porReady('bruno')){ctx.drawImage(POR.bruno,bx-36,by-6,32,32);ctx.strokeStyle='#0b080e';ctx.lineWidth=2;ctx.strokeRect(bx-36,by-6,32,32);}
    ctx.fillStyle='#000a';ctx.fillRect(bx,by,bw,7);ctx.fillStyle='#ff4d5e';ctx.fillRect(bx,by,bw*Math.max(0,j.hp/j.max),7);
    ctx.fillStyle='#000a';ctx.fillRect(bx,by+11,bw,9);ctx.fillStyle='#5fc8ff';ctx.fillRect(bx,by+11,bw*j.meter,9);
    const pulse=.5+.5*Math.sin(t*10);
    ctx.fillStyle='#ffb347';ctx.font='13px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('TAP! FREE BRUNO',sx,by-7);
    ctx.strokeStyle='rgba(143,211,255,'+(0.35+pulse*.5)+')';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(sx,sy-h*.5,w*.62+pulse*6,h*.75+pulse*4,0,0,6.283);ctx.stroke();
  }
}

/* ---------- STAGE 2: THE ESCAPE (truck roof, runners + The Ward) ---------- */
/* starting a stage directly: heroes the story has already given you join if they're missing (not fallen) */
function ensureHero(id){if(LOADSEL&&!LOADSEL.includes(id))return;if(save.heroes[id]||save.fallen.includes(id))return;if(save.away&&save.away[id]){save.heroes[id]=save.away[id];delete save.away[id];save.heroes[id].hp=null;if(save.active.length<MAX_ACTIVE)save.active.push(id);}else addHero(id);persist();}
/* keep only the heroes the story has given you at this point; the rest wait (levels kept) until they join */
let REVD=[];
function stageRevive(){if(HORDE()||!save.downed)return;for(const id of Object.keys(save.downed)){const d=save.downed[id];if(save.heroes[id])continue;save.heroes[id]={lv:d.lv,xp:d.xp};save.fallen=save.fallen.filter(h=>h!==id);if(save.active.length<MAX_ACTIVE)save.active.push(id);story('hero_revived',{hero:id,how:'stage_start'});REVD.push(id);setHp(id,maxHp(id)*.5);}save.downed={};persist();}
function storyParty(allowed){if(LOADSEL)allowed=LOADSEL;for(const id of Object.keys(save.heroes))if(!allowed.includes(id))stashHero(id);}
function startStage2(){stageRevive();ensureHero('bruno');storyParty(['bruno']);setTimeout(()=>cineLoad(SHOTS3),8000);setTimeout(()=>cineLoadKeys(FORK_KEYS),20000);setTimeout(townLoad,30000);
  for(const id of['cmd',...Object.keys(save.heroes)])setHp(id,maxHp(id));for(const id of REVD)if(save.heroes[id])setHp(id,maxHp(id)*.5);REVD=[];
  R={stage:2,wave:5,wall:WALL_MAX,wallMax:WALL_MAX,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:{txt:'STAGE 2: THE ESCAPE',t:2.6,col:'#ffc53d'},vx:0,prevSX:SX,dead:[],
    queue:[],kills:0,spawnLeft:99999,spawnTotal:99999,spawnT:2.2,bossPending:false,crateAt:[],jeepAt:-1,proj:[]};
  SND.alarm();spawnBoss();const b=R.en[R.en.length-1];b.z=ZFAR+60;setTimeout(checkpoint,0);
  state='play';ui();
}
function startRook(e){
  R.raged=1;e.hp=e.max*.5;R.proj=[];e.act=null;
  startIntro(()=>{
    if(!save.heroes.rook&&!save.fallen.includes('rook')){addHero('rook');if(!save.active.includes('rook')){save.active.push('rook');}persist();}
    e.enraged=1;e.thrT=1;e.roarT=4;R.banner={txt:'THE WARD IS ENRAGED',t:2.6,col:'#ff2e63'};R.shake=.6;
    state='play';last=performance.now();ui();},SHOTS3);
}

/* ---------- STAGE 2 SCENE: whole roadside streams away behind the truck ---------- */
const PX=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;};
let seed2=11;const rnd2=()=>(seed2=(seed2*16807)%2147483647)/2147483647;
const SKY2=PX(1000,150,(x,W,H)=>{
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1c0f2e');g.addColorStop(.45,'#4a1f4c');g.addColorStop(.8,'#c94a2a');g.addColorStop(1,'#ff7a2e');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<30;i++){x.fillStyle=i%2?'rgba(40,18,48,.7)':'rgba(70,30,70,.6)';const cx=rnd2()*W,cy=10+rnd2()*55,r=14+rnd2()*30;for(let k=0;k<6;k++){x.beginPath();x.arc(cx+(rnd2()-.5)*r*1.6,cy+(rnd2()-.5)*r*.5,r*(.4+rnd2()*.5),0,6.3);x.fill();}}
  const rg=x.createRadialGradient(W/2,H,0,W/2,H,W*.45);rg.addColorStop(0,'rgba(255,150,60,.7)');rg.addColorStop(1,'rgba(255,150,60,0)');x.fillStyle=rg;x.fillRect(0,0,W,H);
  for(const[lay,col,hmax,dens]of[[0,'#3a1838',95,1],[1,'#24102a',70,1],[2,'#140a1a',34,1]]){let px=0;while(px<W){const w=5+rnd2()*14,cent=Math.max(0,1-Math.abs(px-W/2)/(W*.42)),h=3+rnd2()*hmax*(.12+cent*cent*1.1);x.fillStyle=col;x.fillRect(px|0,(H-h)|0,w|0,h|0);
      if(lay<2&&rnd2()<.25){x.fillRect((px+w/2-1)|0,(H-h-6)|0,2,6);}
      if(lay===1){x.fillStyle='rgba(255,200,110,.7)';for(let k=0;k<h*w/18;k++){if(rnd2()<.4)x.fillRect((px+1+rnd2()*(w-2))|0,(H-h+2+rnd2()*(h-3))|0,1,1);}}
      px+=w+(rnd2()<.3?rnd2()*4:0);}}
  for(let i=0;i<18;i++){const fx=W*.3+rnd2()*W*.4,fy=H-10-rnd2()*30;const fg=x.createRadialGradient(fx,fy,0,fx,fy,10+rnd2()*12);fg.addColorStop(0,'rgba(255,170,60,.9)');fg.addColorStop(1,'rgba(255,90,30,0)');x.fillStyle=fg;x.fillRect(fx-25,fy-25,50,50);}
  for(let i=0;i<90;i++){x.fillStyle='rgba(182,242,58,'+(.25+rnd2()*.35)+')';x.fillRect((rnd2()*W)|0,(H-6-rnd2()*12)|0,(6+rnd2()*18)|0,(2+rnd2()*3)|0);}
});
const GROUND2=PX(384,192,(x,W,H)=>{
  const wx=v=>(v+1400)/2800*W;
  x.fillStyle='#2e2430';x.fillRect(0,0,W,H);
  x.fillStyle='#3b2f36';x.fillRect(wx(-700),0,wx(700)-wx(-700),H);
  x.fillStyle='rgb(56,44,59)';x.fillRect(wx(-470),0,wx(470)-wx(-470),H);
  for(let i=0;i<5200;i++){const v=rnd2();x.fillStyle=v<.45?'rgba(20,14,22,.5)':v<.8?'rgba(80,64,82,.4)':v<.93?'rgba(70,90,40,.45)':'rgba(120,90,70,.4)';x.fillRect((rnd2()*W)|0,(rnd2()*H)|0,1+(rnd2()*2|0),1);}
  for(let i=0;i<40;i++){const side=rnd2()<.5?-1:1,px=wx(side*(760+rnd2()*600)),py=rnd2()*H;x.fillStyle='rgba(60,80,36,.75)';x.fillRect(px|0,py|0,2+(rnd2()*4|0),1);x.fillRect((px+1)|0,(py-1)|0,1,1);}
  for(let i=0;i<10;i++){let px=wx(-450+rnd2()*900),py=rnd2()*H;x.fillStyle='rgba(18,12,22,.8)';for(let s=0;s<22;s++){x.fillRect(px|0,py|0,1,2);px+=rnd2()*3-1.5;py+=1.5+rnd2()*1.5;}}
  for(let i=0;i<4;i++){const px=wx(-420+rnd2()*780),py=rnd2()*(H-20);x.fillStyle='rgba(30,20,34,.85)';x.fillRect(px,py,10+rnd2()*8,5+rnd2()*4);x.fillStyle='rgba(255,120,60,.45)';x.fillRect(px+2,py+1,6,2);}
  x.fillStyle='rgba(230,220,200,.9)';x.fillRect(wx(-10),0,wx(10)-wx(-10),H*.38);
  for(const ex of[-455,450]){x.fillStyle='rgba(225,215,195,.8)';x.fillRect(wx(ex),0,2,H);}
});
function drawStage2World(dt){
  if(state==='play')roadScroll+=dt*780;
  // sky backdrop (static, it is far away)
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(skyReady){const sw=WW+24,sh=sw*SKYIMG.height/SKYIMG.width;ctx.imageSmoothingEnabled=true;ctx.drawImage(SKYIMG,WW/2-sw/2,HOR+3-sh,sw,sh);ctx.imageSmoothingEnabled=false;}
  else{const sh=HOR+4,sw=Math.max(WW+20,sh*SKY2.width/SKY2.height);ctx.drawImage(SKY2,WW/2-sw/2,0,sw,sh);}
  // ground plane, mode-7 style
  const TILE=640,Wt=GROUND2.width,Ht=GROUND2.height;
  for(let y=WH+30;y>HOR+1;y-=1){const k=(y-HOR)/CAMH,z=F/k-D;if(z>4200)break;
    let v=((z-roadScroll)/TILE)%1;if(v<0)v+=1;const hw=1400*k;
    ctx.drawImage(GROUND2,0,Math.floor(v*Ht),Wt,1,WW/2-hw,y,hw*2,1.25);}
  ctx.restore();
  const hz=ctx.createLinearGradient(0,HOR-6,0,HOR+40);hz.addColorStop(0,'rgba(255,122,46,.0)');hz.addColorStop(.25,'rgba(201,74,42,.55)');hz.addColorStop(1,'rgba(201,74,42,0)');ctx.fillStyle=hz;ctx.fillRect(-20,HOR-6,WW+40,46);
  // roadside objects, far to near
  const items=[];const span=3600,zmin=40;
  const wrap=(base,sp)=>{const out=[];for(let i=0;i*sp<span;i++){out.push(zmin+((base+i*sp+roadScroll)%span));}return out;};
  for(const z of wrap(0,95))for(const s of[-1,1])items.push([z,'post',s]);
  for(const z of wrap(40,560))for(const s of[-1,1])items.push([z+(s>0?280:0),'lamp',s]);
  wrap(200,1200).forEach((z,i)=>items.push([z,'car',i%2?1:-1,i]));
  items.sort((a,b)=>b[0]-a[0]);
  for(const it of items){const[z,kind,s]=it;if(z>3400)continue;const fade=Math.min(1,(3400-z)/900);ctx.globalAlpha=fade;
    if(kind==='post'){const[x0,y0,k]=P(s*640,z),[,y1]=P(s*640,z,26);ctx.fillStyle='#5a4e52';ctx.fillRect(x0-2*k,y1,Math.max(1,4*k),y0-y1);
      const[x2,y2]=P(s*640,z+95,22),[,y3]=P(s*640,z,22);ctx.strokeStyle='#8f857c';ctx.lineWidth=Math.max(1,5*k);ctx.beginPath();ctx.moveTo(x0,y3);ctx.lineTo(x2,y2);ctx.stroke();}
    else if(kind==='lamp'){const[x0,y0,k]=P(s*820,z),[,yt]=P(s*820,z,320),[xa,ya]=P(s*730,z,320);
      ctx.fillStyle='#2a2028';ctx.fillRect(x0-3.5*k,yt,Math.max(1,7*k),y0-yt);ctx.strokeStyle='#2a2028';ctx.lineWidth=Math.max(1,5*k);ctx.beginPath();ctx.moveTo(x0,yt);ctx.lineTo(xa,ya);ctx.stroke();
      ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(xa,ya+3*k,0,xa,ya+3*k,40*k);gr.addColorStop(0,'rgba(255,214,120,.9)');gr.addColorStop(1,'rgba(255,214,120,0)');ctx.fillStyle=gr;ctx.fillRect(xa-40*k,ya-37*k,80*k,80*k);
      const pg=ctx.createRadialGradient(xa,P(s*730,z)[1],0,xa,P(s*730,z)[1],90*k);pg.addColorStop(0,'rgba(255,190,100,.22)');pg.addColorStop(1,'rgba(255,190,100,0)');ctx.fillStyle=pg;const gy=P(s*730,z)[1];ctx.fillRect(xa-90*k,gy-30*k,180*k,60*k);ctx.globalCompositeOperation='source-over';}
    else if(kind==='car'&&envReady&&EM.pcar){const fr=EM.pcar[it[3]%2?3:0],r=ER[fr],[x0,y0,k]=P(s*780,z),sc=k*230/r[2];ctx.save();ctx.translate(x0,y0-r[3]*sc*.45);if(s>0)ctx.scale(-1,1);eDrawA(fr,0,0,sc);ctx.restore();}
  }
  ctx.globalAlpha=1;
}
/* moving asphalt: a pixel texture mapped onto the road in perspective, scrolling away from the truck */
const ROADTEX=(()=>{const W=96,H=192,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  x.fillStyle='rgb(56,44,59)';x.fillRect(0,0,W,H);
  for(let i=0;i<1400;i++){const v=rnd();x.fillStyle=v<.5?'rgba(30,22,34,.55)':v<.85?'rgba(78,62,80,.45)':'rgba(96,78,92,.4)';x.fillRect(rnd()*W|0,rnd()*H|0,1+(rnd()*2|0),1);}
  for(let i=0;i<7;i++){let px=rnd()*W,py=rnd()*H;x.fillStyle='rgba(18,12,22,.8)';for(let s=0;s<26;s++){x.fillRect(px|0,py|0,1,2);px+=rnd()*3-1.5;py+=1.5+rnd()*1.5;}}
  for(let i=0;i<3;i++){const px=8+rnd()*(W-30),py=rnd()*(H-20);x.fillStyle='rgba(30,20,34,.85)';x.fillRect(px,py,14+rnd()*10,5+rnd()*4);x.fillStyle='rgba(255,120,60,.45)';x.fillRect(px+2,py+1,8,2);}
  x.fillStyle='rgba(230,220,200,.9)';x.fillRect(W/2-2,0,4,H*.38);
  for(const ex of[5,W-8]){x.fillStyle='rgba(225,215,195,.75)';x.fillRect(ex,0,3,H);}
  x.globalCompositeOperation='destination-in';const gr=x.createLinearGradient(0,0,W,0);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.1,'rgba(0,0,0,1)');gr.addColorStop(.9,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,W,H);
  return c;})();
let roadScroll=0;
function drawMovingRoad(roofY){
  const ROADW=470,TILE=640,W=ROADTEX.width,Hh=ROADTEX.height;
  ctx.save();ctx.imageSmoothingEnabled=false;
  for(let y=Math.floor(roofY)-1;y>HOR+3;y-=1){
    const k=(y-HOR)/CAMH,z=F/k-D;if(z>2600)break;
    let v=((z-roadScroll)/TILE)%1;if(v<0)v+=1;const row=Math.floor(v*Hh);
    const hw=ROADW*k,a=z>1300?Math.max(0,1-(z-1300)/1300):1;if(a<=0)continue;
    ctx.globalAlpha=a;ctx.drawImage(ROADTEX,0,row,W,1,WW/2-hw,y,hw*2,1.25);}
  ctx.restore();ctx.globalAlpha=1;
}
function drawRoad2(){
  // grit streaming away from the truck
  ctx.fillStyle='rgba(200,170,140,.35)';
  for(let i=0;i<26;i++){const z=((t*900+i*97)%1100)+120,x=((i*263)%900)-450,[sx,sy,k]=P(x,z);ctx.fillRect(sx,sy,Math.max(1,5*k),Math.max(1,2*k));}
}
function drawTruckRoof(){
  const zA=-150,zB=WALL_Z+8,w=LANE_E+260;
  const[a0,ay]=P(-w,zA),[a1]=P(w,zA),[b0,by]=P(-w,zB),[b1]=P(w,zB);
  ctx.fillStyle='#4a3f2c';ctx.beginPath();ctx.moveTo(a0,ay);ctx.lineTo(a1,ay);ctx.lineTo(b1,by);ctx.lineTo(b0,by);ctx.fill();
  ctx.strokeStyle='rgba(20,14,10,.55)';ctx.lineWidth=2;
  for(let z=zA+40;z<zB;z+=48){const[p0,q0]=P(-w,z),[p1]=P(w,z);ctx.beginPath();ctx.moveTo(p0,q0);ctx.lineTo(p1,q0);ctx.stroke();}
  for(let x=-w;x<=w;x+=120){const[p0,q0]=P(x,zA),[p1,q1]=P(x,zB);ctx.strokeStyle='rgba(255,220,160,.06)';ctx.beginPath();ctx.moveTo(p0,q0);ctx.lineTo(p1,q1);ctx.stroke();}
  ctx.fillStyle='#211a14';ctx.fillRect(b0,by-6,b1-b0,9);ctx.fillStyle='#ffc53d';
  for(let x=-w;x<w;x+=60){const[p]=P(x,zB),[p2]=P(x+30,zB);ctx.fillRect(p,by-5,p2-p,4);}
}

/* ---------- STAGE 3: THE EMPTY TOWN (highway road). The squad walks down main street with the survivors, no wall ---------- */
const TOWN0={"house3": [0, 0, 362, 500], "shop4": [364, 0, 430, 480], "house4": [796, 0, 450, 478], "shop1": [1248, 0, 431, 473], "shop5": [0, 502, 428, 473], "house1": [430, 502, 328, 468], "house0": [760, 502, 456, 467], "shop2": [1218, 502, 427, 467], "shop0": [0, 977, 423, 465], "shop3": [425, 977, 415, 462], "house2": [842, 977, 505, 457], "house5": [1349, 977, 494, 449], "lampOn": [1845, 977, 166, 386], "lampOff": [0, 1444, 166, 386], "news": [168, 1444, 185, 296], "car1": [355, 1444, 329, 278], "mailbox": [686, 1444, 187, 276], "car2": [875, 1444, 340, 263], "car3": [1217, 1444, 341, 260], "car0": [1560, 1444, 339, 245], "trash": [0, 1832, 351, 241], "hydrant": [353, 1832, 156, 231], "barricade": [511, 1832, 310, 218], "bench": [823, 1832, 383, 207], "bike": [1208, 1832, 340, 207], "civ5_1": [1550, 1832, 95, 167], "civ5_2": [1647, 1832, 97, 167], "civ0_0": [1746, 1832, 92, 166], "civ0_1": [1840, 1832, 89, 166], "civ0_2": [1931, 1832, 93, 166], "civ0_4": [0, 2075, 89, 166], "civ0_5": [91, 2075, 84, 166], "civ5_0": [177, 2075, 96, 166], "civ5_3": [275, 2075, 96, 166], "civ0_3": [373, 2075, 90, 165], "civ4_0": [465, 2075, 101, 164], "civ4_2": [568, 2075, 103, 164], "civ5_4": [673, 2075, 94, 164], "civ2_2": [769, 2075, 95, 163], "civ2_0": [866, 2075, 91, 162], "civ2_4": [959, 2075, 88, 162], "civ2_5": [1049, 2075, 87, 162], "civ5_5": [1138, 2075, 92, 162], "civ2_1": [1232, 2075, 91, 161], "civ2_3": [1325, 2075, 96, 161], "civ4_1": [1423, 2075, 101, 161], "civ4_3": [1526, 2075, 103, 161], "civ5_7": [1631, 2075, 92, 161], "civ4_4": [1725, 2075, 101, 160], "civ4_5": [1828, 2075, 99, 160], "civ0_7": [1929, 2075, 94, 156], "civ2_7": [0, 2243, 89, 156], "civ3_0": [91, 2243, 114, 153], "civ3_1": [207, 2243, 112, 152], "civ3_7": [321, 2243, 112, 152], "civ4_7": [435, 2243, 104, 151], "civ3_2": [541, 2243, 111, 150], "civ3_4": [654, 2243, 112, 150], "civ3_3": [768, 2243, 110, 149], "civ3_5": [880, 2243, 109, 145], "civ1_0": [991, 2243, 102, 144], "civ1_1": [1095, 2243, 100, 144], "civ1_2": [1197, 2243, 101, 143], "civ1_4": [1300, 2243, 106, 143], "civ1_3": [1408, 2243, 103, 142], "civ1_5": [1513, 2243, 102, 142], "civ1_7": [1617, 2243, 106, 142], "civ0_6": [1725, 2243, 94, 141], "civ2_6": [1821, 2243, 95, 138], "civ4_6": [1918, 2243, 104, 137], "civ5_6": [0, 2401, 100, 135], "civ3_6": [102, 2401, 120, 129], "civ1_6": [224, 2401, 116, 120]},YARD_R={"house5": [0, 0, 566, 402], "shop0": [568, 0, 563, 398], "house1": [1133, 0, 516, 398], "shop2": [0, 404, 568, 396], "shop4": [570, 404, 563, 396], "house2": [1135, 404, 583, 396], "house4": [0, 802, 570, 388], "house0": [572, 802, 582, 382], "house3": [1156, 802, 541, 375], "shop3": [0, 1192, 569, 373], "shop5": [571, 1192, 553, 367], "lampOn": [1126, 1192, 319, 341], "lampOff": [1447, 1192, 248, 337], "shop1": [0, 1567, 554, 306], "hydrant": [556, 1567, 171, 280], "car0": [729, 1567, 550, 277], "car3": [1281, 1567, 550, 277], "car2": [0, 1875, 437, 276], "car1": [439, 1875, 303, 271], "mailbox": [744, 1875, 228, 246], "news": [974, 1875, 297, 198], "trash": [1273, 1875, 341, 192], "bench": [1616, 1875, 317, 171], "bike": [0, 2153, 311, 164], "barricade": [313, 2153, 293, 142]};let TOWN_R=TOWN0,TKIND=null,SKY4WIDE=false;const TOWNIMG=new Image();let townReady=false;TOWNIMG.onload=()=>{townReady=true;};
const SKY3IMG=new Image();let sky3Ready=false;SKY3IMG.onload=()=>{sky3Ready=true;};const STREET3=new Image();let street3Ready=false;STREET3.onload=()=>{street3Ready=true;};
function townUse(k){if(k==='yard'&&!'assets/yard.webp?v=c12df63db2')k='town';if(TKIND===k)return;TKIND=k;townReady=sky3Ready=street3Ready=false;TOWN_R=k==='yard'?YARD_R:TOWN0;
  if(k==='yard'){TOWNIMG.src="assets/yard.webp?v=c12df63db2";SKY3IMG.src="assets/sky4.webp?v=733bddbdb9";STREET3.src="assets/street4.webp?v=e04bc475f6";}else{TOWNIMG.src="assets/town.webp?v=b607b70880";SKY3IMG.src="assets/sky3.webp?v=c5b518ab42";STREET3.src="assets/street3.webp?v=1022fa651e";}}
function townLoad(){townUse('town');}
/* draw a town sprite standing at world (x,z): size given as world height (h) or width (w) */
function tSprite(n,x,z,size,byW,flip,alpha){const r=TOWN_R[n];if(!r||!townReady)return null;const[sx,sy,k]=P(x,z),sc=k*size/(byW?r[2]:r[3]),w=r[2]*sc,h=r[3]*sc;
  ctx.globalAlpha=alpha==null?1:alpha;if(flip){ctx.save();ctx.translate(sx,sy);ctx.scale(-1,1);ctx.drawImage(TOWNIMG,r[0],r[1],r[2],r[3],-w/2,-h,w,h);ctx.restore();}
  else ctx.drawImage(TOWNIMG,r[0],r[1],r[2],r[3],sx-w/2,sy-h,w,h);ctx.globalAlpha=1;return{sx,sy,k,w,h};}
const S3_WAVES=3,WALK=105,CIV_N=10,BLD_X=640,BLD_SEG=430;
let seed3=29;const rnd3=()=>(seed3=(seed3*16807)%2147483647)/2147483647;
const hash3=n=>{let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const SKY3=PX(1000,170,(x,W,H)=>{
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0e0818');g.addColorStop(.55,'#2a1238');g.addColorStop(1,'#4a1f4c');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<120;i++){x.fillStyle='rgba(240,230,255,'+(.2+rnd3()*.5)+')';x.fillRect((rnd3()*W)|0,(rnd3()*H*.6)|0,1,1);}
  const mx=W*.78,my=H*.26,mg=x.createRadialGradient(mx,my,0,mx,my,70);mg.addColorStop(0,'rgba(190,245,60,.45)');mg.addColorStop(1,'rgba(190,245,60,0)');x.fillStyle=mg;x.fillRect(mx-70,my-70,140,140);
  x.fillStyle='#c8f25a';x.beginPath();x.arc(mx,my,17,0,6.283);x.fill();x.fillStyle='rgba(120,160,40,.55)';for(const[a,b,r]of[[-5,-4,4],[6,3,3],[-2,7,2.5],[4,-8,2]]){x.beginPath();x.arc(mx+a,my+b,r,0,6.283);x.fill();}
  for(let i=0;i<26;i++){x.fillStyle=i%2?'rgba(58,26,72,.75)':'rgba(84,36,96,.6)';const cx=rnd3()*W,cy=14+rnd3()*70,r=12+rnd3()*26;for(let k=0;k<5;k++){x.beginPath();x.ellipse(cx+(rnd3()-.5)*r*2.2,cy+(rnd3()-.5)*r*.4,r*(.6+rnd3()*.6),r*(.18+rnd3()*.15),0,0,6.283);x.fill();}}
  // treeline + church + water tower at the end of the street
  x.fillStyle='#160b1e';let px=0;while(px<W){const h=8+rnd3()*16;x.beginPath();x.moveTo(px,H);x.lineTo(px+5,H-h);x.lineTo(px+10,H);x.fill();px+=6+rnd3()*4;}
  const cx=W/2;x.fillStyle='#1d0f26';x.fillRect(cx-16,H-34,32,34);x.beginPath();x.moveTo(cx-19,H-34);x.lineTo(cx,H-50);x.lineTo(cx+19,H-34);x.fill();
  x.fillRect(cx-5,H-70,10,22);x.beginPath();x.moveTo(cx-6,H-70);x.lineTo(cx,H-98);x.lineTo(cx+6,H-70);x.fill();x.fillRect(cx-.5,H-106,1,8);x.fillRect(cx-3,H-103,6,1);
  x.fillStyle='rgba(255,170,80,.75)';x.fillRect(cx-2,H-62,4,6);x.fillRect(cx-6,H-26,3,5);x.fillRect(cx+3,H-26,3,5);
  const wx=W*.64;x.fillStyle='#1d0f26';x.fillRect(wx-1,H-46,2,46);x.fillRect(wx+13,H-46,2,46);x.fillRect(wx-4,H-66,22,20);x.beginPath();x.moveTo(wx-5,H-66);x.lineTo(wx+7,H-74);x.lineTo(wx+19,H-66);x.fill();
});
const GROUND3=PX(448,224,(x,W,H)=>{
  const wx=v=>(v+1400)/2800*W;
  x.fillStyle='#1f1622';x.fillRect(0,0,W,H);
  x.fillStyle='#5a4d58';x.fillRect(wx(-640),0,wx(-470)-wx(-640),H);x.fillRect(wx(470),0,wx(640)-wx(470),H);
  x.fillStyle='rgba(30,22,34,.6)';for(let y=0;y<H;y+=14){x.fillRect(wx(-640),y,wx(-470)-wx(-640),1);x.fillRect(wx(470),y,wx(640)-wx(470),1);}
  x.fillStyle='#3a2f3c';x.fillRect(wx(-470),0,wx(470)-wx(-470),H);
  for(let i=0;i<6000;i++){const v=rnd3(),px=wx(-470+rnd3()*940);x.fillStyle=v<.5?'rgba(20,14,24,.5)':v<.85?'rgba(80,66,84,.4)':'rgba(70,96,40,.35)';x.fillRect(px|0,(rnd3()*H)|0,1+(rnd3()*2|0),1);}
  for(let i=0;i<1600;i++){const s=rnd3()<.5?-1:1,px=wx(s*(480+rnd3()*150));x.fillStyle=rnd3()<.5?'rgba(40,32,44,.5)':'rgba(120,104,112,.35)';x.fillRect(px|0,(rnd3()*H)|0,1,1);}
  x.fillStyle='#8a7c80';x.fillRect(wx(-474),0,3,H);x.fillRect(wx(471),0,3,H);
  for(let y=0;y<H;y+=28){x.fillStyle='rgba(255,197,61,.8)';x.fillRect(wx(-6),y,2,14);x.fillRect(wx(3),y,2,14);}
  for(let i=0;i<14;i++){let px=wx(-440+rnd3()*880),py=rnd3()*H;x.fillStyle='rgba(16,10,20,.85)';for(let s=0;s<20;s++){x.fillRect(px|0,py|0,1,2);px+=rnd3()*3-1.5;py+=1.5+rnd3()*1.5;}}
  for(let i=0;i<7;i++){const px=wx(-420+rnd3()*840),py=rnd3()*(H-14),w=8+rnd3()*12;x.fillStyle='rgba(26,18,32,.9)';x.fillRect(px,py,w,4+rnd3()*3);x.fillStyle=rnd3()<.5?'rgba(255,120,60,.5)':'rgba(182,242,58,.35)';x.fillRect(px+2,py+1,w*.5,1);}
  for(let i=0;i<3;i++){const px=wx(-300+rnd3()*600),py=rnd3()*(H-10);x.fillStyle='#2a2230';x.fillRect(px,py,7,4);x.fillStyle='#4a3e4c';x.fillRect(px+1,py+1,5,1);}
  for(let i=0;i<30;i++){const s=rnd3()<.5?-1:1,px=wx(s*(600+rnd3()*700)),py=rnd3()*H;x.fillStyle='rgba(16,10,20,.9)';x.fillRect(px|0,py|0,3,2);}
});
/* storefront facades, pixel-drawn: [ground floor shop, upper floors] */
const FACADES=(()=>{const out=[];
  const BR=[['#6b2f2a','#4e211e'],['#5b3a5e','#40273f'],['#7a4a2c','#573420'],['#4a3b52','#33283a'],['#6a5442','#4b3b2e']];
  const AW=[['#ff6a2b','#2a1630'],['#b6f23a','#2a1630'],['#8a3fb5','#1d1024'],['#ffc53d','#3a1b18']];
  for(let n=0;n<10;n++){const fl=2+(n%3===0?1:0),W=120,H=36+fl*30;
    out.push(PX(W,H,(x)=>{const[b1,b2]=BR[n%BR.length];x.fillStyle=b1;x.fillRect(0,0,W,H);
      for(let y=0;y<H;y+=3)for(let xx=(y/3)%2?0:3;xx<W;xx+=6){x.fillStyle=b2;x.fillRect(xx,y,5,1);x.fillRect(xx+5,y,1,3);}
      x.fillStyle='#1a1020';x.fillRect(0,0,W,4);x.fillStyle=b2;x.fillRect(0,4,W,2);
      for(let f=0;f<fl;f++){const y=8+f*30;for(let w=0;w<4;w++){const wx=8+w*28;x.fillStyle='#120a18';x.fillRect(wx,y,16,20);x.fillStyle=b2;x.fillRect(wx-2,y-2,20,2);x.fillRect(wx-1,y+20,18,2);
        const r=hash3(n*31+f*7+w);if(r<.18){x.fillStyle='#ffb35c';x.fillRect(wx+2,y+2,12,16);x.fillStyle='#ff7a2e';x.fillRect(wx+2,y+12,12,6);}
        else if(r<.5){x.fillStyle='#2b1a33';x.beginPath();x.moveTo(wx,y);x.lineTo(wx+9,y+8);x.lineTo(wx+5,y+20);x.lineTo(wx,y+20);x.fill();}
        x.fillStyle='rgba(255,255,255,.08)';x.fillRect(wx+1,y+1,3,8);}}
      const gy=H-34;const[a1,a2]=AW[n%AW.length];
      x.fillStyle='#1c1220';x.fillRect(4,gy-12,W-8,10);x.fillStyle=a1;x.fillRect(6,gy-11,W-12,1);x.fillRect(6,gy-4,W-12,1);
      for(let i=0;i<5;i++){x.fillStyle=hash3(n+i)<.5?a1:'#3a2a44';x.fillRect(14+i*20,gy-9,12,3);}
      for(let i=0;i<W-8;i+=8){x.fillStyle=i/8%2?a1:a2;x.beginPath();x.moveTo(4+i,gy-1);x.lineTo(12+i,gy-1);x.lineTo(10+i,gy+5);x.lineTo(2+i,gy+5);x.fill();}
      x.fillStyle='#0d0812';x.fillRect(6,gy+7,46,24);x.fillRect(70,gy+7,44,24);x.fillStyle='#22142a';x.fillRect(54,gy+5,14,29);x.fillStyle='#ffc53d';x.fillRect(65,gy+19,1,2);
      x.fillStyle='rgba(182,242,58,.18)';x.fillRect(8,gy+9,42,4);x.fillStyle='rgba(255,140,60,.2)';x.fillRect(72,gy+24,40,6);
      for(const sx of[6,70]){x.fillStyle='#3a2a44';for(let k=0;k<5;k++){const px=sx+hash3(n*9+k+sx)*40,py=gy+7+hash3(n*5+k*3+sx)*20;x.beginPath();x.moveTo(px,py);x.lineTo(px+4,py+5);x.lineTo(px-2,py+7);x.fill();}}
      x.fillStyle='#2a1c30';x.fillRect(0,H-3,W,3);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,3,H);x.fillRect(W-3,0,3,H);
    }));}
  return out;})();
function drawFacadeSide(side){const BLD_SEG=R&&R.cfb?645:430;
  const X=side*BLD_X,tw=FACADES[0].width;
  const iA=Math.floor((20+roadScroll)/BLD_SEG),iB=Math.floor((3200+roadScroll)/BLD_SEG);
  ctx.imageSmoothingEnabled=false;
  for(let i=iB;i>=iA;i--){const h=hash3(i*3+(side>0?1:0)),gap=!(R&&R.cfb)&&hash3(i*5+side)<.12;
    if(gap)continue;const zs=i*BLD_SEG-roadScroll,z0=Math.max(8,zs),z1=zs+BLD_SEG-6;if(z1<=z0)continue;
    let tex=FACADES[Math.floor(h*FACADES.length)],tr=null;
    if(townReady){const nm=(hash3(i*11+side*3)<.3?'house':'shop')+Math.floor(h*6);tr=TOWN_R[nm];}
    const Hw=tr?(BLD_SEG-6)*tr[3]/tr[2]*.9:tex.height*3.1,x0=WW/2+X*F/(z0+D),x1=WW/2+X*F/(z1+D),fade=Math.min(1,Math.max(0,(3200-z1)/900));
    const lo=Math.floor(Math.min(x0,x1)),hi=Math.ceil(Math.max(x0,x1));ctx.globalAlpha=fade;
    for(let c=Math.max(-2,lo);c<=Math.min(WW+2,hi);c+=1){const dx=c+.5-WW/2;if(dx*side<=0)continue;const z=F*X/dx-D;if(z<z0||z>z1)continue;
      let u=(z-zs)/(BLD_SEG-6);if(side>0)u=1-u;const k=F/(z+D),yb=HOR+CAMH*k,yt=HOR+(CAMH-Hw)*k;
      if(tr)ctx.drawImage(TOWNIMG,tr[0]+Math.min(tr[2]-1,Math.floor(u*tr[2])),tr[1],1,tr[3],c,yt,1.6,yb-yt);
      else ctx.drawImage(tex,Math.min(tw-1,Math.floor(u*tw)),0,1,tex.height,c,yt,1.6,yb-yt);}
    // dark end wall where the block starts
    const k0=F/(z0+D);ctx.fillStyle='rgba(10,6,14,.9)';const ye=HOR+CAMH*k0,yt0=HOR+(CAMH-Hw)*k0;ctx.fillRect(x0-(side>0?0:2),yt0,2,ye-yt0);
  }
  ctx.globalAlpha=1;
}
function drawTownWorld(dt){
  if(state==='play'&&!(R&&R.cfb))roadScroll+=dt*WALK;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(sky3Ready){ctx.imageSmoothingEnabled=true;let sh=152,sw=sh*SKY3IMG.width/SKY3IMG.height;if(R&&R.cfb){sh=230;sw=sh*SKY3IMG.width/SKY3IMG.height;}ctx.fillStyle='#120a1a';ctx.fillRect(-20,-20,WW+40,HOR+30);const sx0=R&&R.cfb?WW/2-.518*sw:WW/2-sw/2,sy0=R&&R.cfb?HOR+4-.835*sh:HOR+5-sh;ctx.drawImage(SKY3IMG,sx0,sy0,sw,sh);
  if(R&&R.cfb&&!SKY4WIDE){for(const d of[-1,1]){ctx.save();ctx.translate(sx0+(d>0?sw*2:0),0);ctx.scale(-1,1);ctx.drawImage(SKY3IMG,d>0?0:0,sy0,sw,sh);ctx.restore();}const g=ctx.createLinearGradient(0,0,0,HOR+5);g.addColorStop(0,'rgba(18,10,26,0)');g.addColorStop(1,'rgba(18,10,26,.35)');ctx.fillStyle=g;ctx.fillRect(0,0,sx0,HOR+5);ctx.fillRect(sx0+sw,0,WW,HOR+5);}ctx.imageSmoothingEnabled=false;}
  else{const sh=HOR+4,sw=Math.max(WW+20,sh*SKY3.width/SKY3.height);ctx.drawImage(SKY3,WW/2-sw/2,HOR+4-sh,sw,sh);}
  if(street3Ready){const HWs=647,TL=HWs*2*STREET3.height/STREET3.width,Wt=STREET3.width,Ht=STREET3.height;ctx.fillStyle='#1a1220';ctx.fillRect(-20,HOR,WW+40,WH);
    for(let y=WH+30;y>HOR+1;y-=1){const k=(y-HOR)/CAMH,z=F/k-D;if(z>4200)break;let v=((z+roadScroll)/TL)%1;if(v<0)v+=1;const hw=HWs*k;ctx.drawImage(STREET3,0,Ht-1-Math.floor(v*Ht),Wt,1,WW/2-hw,y,hw*2,1.25);}}
  else{const TILE=560,Wt=GROUND3.width,Ht=GROUND3.height;
  for(let y=WH+30;y>HOR+1;y-=1){const k=(y-HOR)/CAMH,z=F/k-D;if(z>4200)break;let v=((z+roadScroll)/TILE)%1;if(v<0)v+=1;const hw=1400*k;ctx.drawImage(GROUND3,0,Math.floor(v*Ht),Wt,1,WW/2-hw,y,hw*2,1.25);}}
  drawFacadeSide(-1);drawFacadeSide(1);
  ctx.restore();
  // horizon fog swallowing the far street
  const hz=ctx.createLinearGradient(0,HOR-30,0,HOR+40);hz.addColorStop(0,'rgba(74,31,76,0)');hz.addColorStop(.45,'rgba(60,40,70,.75)');hz.addColorStop(1,'rgba(60,40,70,0)');ctx.fillStyle=hz;ctx.fillRect(-20,HOR-30,WW+40,70);
  // streetlights, wrecks, low green fog: far to near
  const items=[],span=3600,zmin=30;const wrap=(base,sp)=>{const out=[];for(let i=0;i*sp<span;i++)out.push(zmin+((((base-roadScroll)%span)+span)%span+i*sp)%span);return out;};
  wrap(60,620).forEach((z,i)=>items.push([z,'lamp',i%2?1:-1,i]));
  wrap(330,1500).forEach((z,i)=>items.push([z,'car',i%2?-1:1,i]));
  if(townReady)wrap(200,370).forEach((z,i)=>{const g=Math.floor((roadScroll+z)/370);if(hash3(g*13)<.35)return;items.push([z,'prop',hash3(g*7)<.5?-1:1,g]);});
  items.sort((a,b)=>b[0]-a[0]);
  for(const it of items){const[z,kind,s,i]=it;if(z>3300)continue;ctx.globalAlpha=Math.min(1,(3300-z)/900);
    if(kind==='lamp'&&townReady){const g=Math.floor((roadScroll+z)/620),dead=hash3(g*7)<.3,ph=(t*.9+hash3(i+g)*5)%3,on=!dead&&(!!(R&&R.cfb)||(!(ph>2.6&&ph<2.68)&&!(ph>2.75&&ph<2.8)));
      const d=tSprite(on?'lampOn':'lampOff',s*560,z,300,false,s>0,ctx.globalAlpha);
      if(d&&on){const lx=d.sx-s*d.w*.36,ly=d.sy-d.h*.7,k=d.k;ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(lx,ly,0,lx,ly,46*k);gr.addColorStop(0,'rgba(255,170,90,.7)');gr.addColorStop(1,'rgba(255,170,90,0)');ctx.fillStyle=gr;ctx.fillRect(lx-46*k,ly-46*k,92*k,92*k);
        const pg=ctx.createRadialGradient(lx,d.sy,0,lx,d.sy,120*k);pg.addColorStop(0,'rgba(255,150,80,.2)');pg.addColorStop(1,'rgba(255,150,80,0)');ctx.fillStyle=pg;ctx.fillRect(lx-120*k,d.sy-40*k,240*k,80*k);ctx.globalCompositeOperation='source-over';}}
    else if(kind==='car'&&townReady){const g=Math.floor((roadScroll+z)/1500);tSprite('car'+Math.floor(hash3(g*5+s)*4),s*415,z,128,true,false,ctx.globalAlpha*Math.min(1,Math.max(0,(z-90)/200)));}
    else if(kind==='prop'){const P_=[['hydrant',46],['mailbox',64],['news',58],['trash',84,1],['bench',100,1],['barricade',104,1],['bike',76,1]][Math.floor(hash3(i*3+1)*7)];
      tSprite(P_[0],s*(P_[0]==='bike'?440:575),z,P_[1],!!P_[2],s>0&&P_[0]!=='bench',ctx.globalAlpha*Math.min(1,Math.max(0,(z-60)/160)));}
    else if(kind==='lamp'){const[x0,y0,k]=P(s*520,z),[,yt]=P(s*520,z,330),[xa,ya]=P(s*440,z,330);
      ctx.fillStyle='#24182a';ctx.fillRect(x0-3.5*k,yt,Math.max(1,7*k),y0-yt);ctx.strokeStyle='#24182a';ctx.lineWidth=Math.max(1,5*k);ctx.beginPath();ctx.moveTo(x0,yt);ctx.lineTo(xa,ya);ctx.stroke();
      const ph=(t*.9+hash3(i+Math.floor((roadScroll+z)/620))*5)%3,dead=hash3(Math.floor((roadScroll+z)/620)*7)<.3,on=!dead&&!(ph>2.6&&ph<2.68)&&!(ph>2.75&&ph<2.8);
      if(on){ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(xa,ya+3*k,0,xa,ya+3*k,46*k);gr.addColorStop(0,'rgba(255,170,90,.85)');gr.addColorStop(1,'rgba(255,170,90,0)');ctx.fillStyle=gr;ctx.fillRect(xa-46*k,ya-43*k,92*k,92*k);
        const gy=P(s*440,z)[1],pg=ctx.createRadialGradient(xa,gy,0,xa,gy,110*k);pg.addColorStop(0,'rgba(255,150,80,.2)');pg.addColorStop(1,'rgba(255,150,80,0)');ctx.fillStyle=pg;ctx.fillRect(xa-110*k,gy-36*k,220*k,72*k);ctx.globalCompositeOperation='source-over';}
      else{ctx.fillStyle='#3a2a30';ctx.fillRect(xa-4*k,ya,8*k,3*k);}}
    else if(kind==='car'&&envReady&&EM.pcar){const fr=EM.pcar[0],r=ER[fr],[x0,y0,k]=P(s*400,z),sc=k*230/r[2];ctx.save();ctx.translate(x0,y0-r[3]*sc*.38);if(s>0)ctx.scale(-1,1);eDrawA(fr,0,0,sc);ctx.restore();}}
  ctx.globalAlpha=1;
  for(let i=0;i<7;i++){const z=((i*480-roadScroll*1.0)%3360+3360)%3360+60,[sx,sy,k]=P(Math.sin(i*2.1+t*.15)*300,z),w=900*k,h=60*k;ctx.globalAlpha=Math.min(.32,(3400-z)/3000);
    const fg=ctx.createRadialGradient(sx,sy,0,sx,sy,w*.5);fg.addColorStop(0,'rgba(182,242,58,.55)');fg.addColorStop(1,'rgba(182,242,58,0)');ctx.fillStyle=fg;ctx.save();ctx.translate(sx,sy);ctx.scale(1,h/w);ctx.translate(-sx,-sy);ctx.fillRect(sx-w/2,sy-w/2,w,w);ctx.restore();}
  ctx.globalAlpha=1;
}
/* survivors walking with the squad */
function mkCivs(){const out=[];for(let i=0;i<CIV_N;i++){const side=i%2?1:-1,j=Math.floor(i/2);out.push({side,ox:side*(350+(j%2)*70+hash3(i)*30),oz:30+j*30+hash3(i+9)*16,x:0,z:0,hp:30,max:30,kind:i%6,ph:hash3(i*3)*4,flash:0,scare:0});}
  for(const c of out){c.x=c.ox;c.z=c.oz;}return out;}
function civsAlive(){return R.civ?R.civ.filter(c=>c.hp>0):[];}
function civUpdate(dt){for(const c of R.civ){if(c.hp<=0)continue;c.ph+=dt;if(c.flash>0)c.flash-=dt;if(c.scare>0)c.scare-=dt;
  const tx=c.ox+Math.sin(c.ph*.7)*14,tz=c.oz+Math.sin(c.ph*.45+1)*8;c.x+=(tx-c.x)*Math.min(1,dt*2);c.z+=(tz-c.z)*Math.min(1,dt*2);}}
function hurtCiv(c,d){if(c.hp<=0||R.over)return;if(HORDE())d*=1.15;c.hp-=d;c.flash=.12;c.scare=1.2;burst(c.x,c.z,36,'#ff4d5e',5);
  if(c.hp>0)return;burst(c.x,c.z,30,'#c9a46a',22);SND.heroDown();R.civLost=(R.civLost||0)+1;story('survivor_lost',{left:civsAlive().length});
  const[px,py]=P(c.x,c.z,CHAR_H+10);R.tx.push({x:px,y:py,txt:'SURVIVOR LOST',col:'#ff4d5e',t:1.6});
  for(const e of R.en)if(e.ctgt===c){e.ctgt=null;e.atk=undefined;}
  if(!civsAlive().length){R.over=true;SND.gameOver();story('survivors_lost',{});legacyEnd('survivors_lost');delete save.ckpt;persist();R.lostAll=1;state='over';ui();}
  else{R.banner={txt:civsAlive().length+' SURVIVORS LEFT',t:2,col:'#ff4d5e'};}}
function drawCiv(c){if(townReady){const[sx,sy,k]=P(c.x,c.z);ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(sx,sy,20*k,6*k,0,0,6.283);ctx.fill();
    const f=c.scare>0?6+(Math.floor(c.ph*5)%2):Math.floor(c.ph*8)%6,n='civ'+c.kind+'_'+f,d=tSprite(n,c.x,c.z,CHAR_H*.9,false,false,c.van!=null?Math.max(0,1-c.van/.45):1);
    if(d&&c.flash>0){ctx.globalCompositeOperation='lighter';tSprite(n,c.x,c.z,CHAR_H*.9,false,false,.6);ctx.globalCompositeOperation='source-over';}
    return;}
  if(!envReady)return;const[sx,sy,k]=P(c.x,c.z);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(sx,sy,20*k,6*k,0,0,6.283);ctx.fill();
  const set=c.scare>0?EM.scared[c.kind]:EM.ref[c.kind],fr=set[Math.floor(c.ph*(c.scare>0?8:5))%set.length],r=ER[fr];if(!r)return;
  const sc=k*CHAR_H*.86/r[3];eDrawA(fr,sx,sy,sc,c.side>0);
  if(c.flash>0){ctx.globalCompositeOperation='lighter';eDrawA(fr,sx,sy,sc,c.side>0,.6);ctx.globalCompositeOperation='source-over';}
}
function startStage3(){stageRevive();setTimeout(()=>{const c=teCrew();cineLoad(teOpen(c).slice(0,2));},4000);ensureHero('bruno');ensureHero('rook');storyParty(['bruno','rook']);townLoad();
  for(const id of['cmd',...Object.keys(save.heroes)])setHp(id,maxHp(id));for(const id of REVD)if(save.heroes[id])setHp(id,maxHp(id)*.5);REVD=[];
  roadScroll=0;
  R={stage:3,wave:1,wall:0,wallMax:1,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,vx:0,prevSX:SX,dead:[],civ:mkCivs(),civLost:0,
    queue:[],kills:0,spawnLeft:0,spawnTotal:0,spawnT:2,bossPending:false,crateAt:[],jeepAt:-1,proj:[]};
  startWave3(1);
}
function startWave3(w){
  R.wave=w;SND.alarm();setTimeout(checkpoint,0);const H2=HORDE()?2:1;const q=[];
  if(w===3){for(let i=0;i<200*H2;i++)q.push('grunt');}
  else if(w===2){for(let i=0;i<15*H2;i++){q.push('runner');q.push('armored');}for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}}
  else{for(let i=0;i<6*H2;i++)q.push('runner');for(let i=0;i<14*H2;i++)q.push('grunt');for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}}
  R.queue=q;R.kills=0;R.spawnLeft=q.length;R.spawnTotal=q.length;R.spawnT=w===3?3.2:2.4;
  R.banner=w===3?{txt:'THE HORDE IS COMING',t:3,col:'#ff4d5e'}:{txt:(w===1?'STAGE 3: THE EMPTY TOWN · ':'')+'WAVE '+w,t:2.4,col:'#ffc53d'};
  state='play';ui();
}
function spawnPace3(){if(R.wave===3){const p=1-R.spawnLeft/R.spawnTotal;return lerp(.5,.22,Math.min(1,p*1.8))*(.75+Math.random()*.5);}return(R.wave===1?1.7:1.3)*(.65+Math.random()*.7);}
function waveClear3(){if(R.ending)return;if(R.wave>=S3_WAVES)R.ending=1;SND.waveClear();healRecovery();save.gold+=80+R.wave*40;persist();
  if(R.wave>=S3_WAVES){const n=civsAlive().length;save.cleared=Math.max(save.cleared||0,3);save.townSaved=n;legacyStage(3);story('survivors_saved',{saved:n,of:CIV_N});legacyEnd('cleared_stage_3');save.gold+=600;persist();startTownEnd();return;}
  state='inter';ui();}

/* ---------- STAGE 3B: THE FOREST (backroad). Survivors vanish, Hex ambush, Screechers, Momma ---------- */
const FM={"r": {"tree0": [0, 0, 203, 501], "tree1": [205, 0, 365, 501], "tree2": [572, 0, 396, 485], "tree3": [970, 0, 335, 473], "fe0": [1307, 0, 541, 353], "fe2": [0, 503, 541, 353], "fe1": [543, 503, 540, 352], "fe3": [1085, 503, 541, 352], "fe4": [0, 858, 540, 352], "fe5": [542, 858, 541, 352], "sign": [1085, 858, 227, 270], "lantern": [1314, 858, 181, 269], "tent": [1497, 858, 416, 223], "stump": [0, 1212, 224, 201], "tele0": [226, 1212, 133, 196], "tele1": [361, 1212, 144, 196], "tele2": [507, 1212, 146, 196], "tele3": [655, 1212, 148, 196], "tele4": [805, 1212, 149, 196], "tele5": [956, 1212, 145, 196], "tele6": [1103, 1212, 144, 196], "tele7": [1249, 1212, 136, 196], "bush": [1387, 1212, 278, 182], "claw0": [1667, 1212, 154, 174], "claw1": [1823, 1212, 154, 174], "claw2": [0, 1415, 156, 174], "claw3": [158, 1415, 178, 174], "claw4": [338, 1415, 171, 174], "claw5": [511, 1415, 170, 174], "claw6": [683, 1415, 152, 174], "claw7": [837, 1415, 150, 174], "wave0": [989, 1415, 32, 173], "wave1": [1023, 1415, 68, 173], "wave2": [1093, 1415, 112, 173], "wave3": [1207, 1415, 142, 173], "wave4": [1351, 1415, 186, 173], "wave5": [1539, 1415, 199, 173], "dagger0": [1740, 1415, 159, 170], "dagger1": [1901, 1415, 52, 170], "dagger2": [0, 1591, 158, 170], "dagger3": [160, 1591, 70, 170], "rock": [232, 1591, 249, 157], "mush": [483, 1591, 149, 152], "bones": [634, 1591, 359, 134], "log": [995, 1591, 327, 108]}, "nat": {"tree0": [203, 501], "tree1": [365, 501], "tree2": [396, 485], "tree3": [335, 473], "rock": [249, 157], "log": [327, 108], "stump": [224, 201], "mush": [149, 152], "bush": [278, 182], "tent": [416, 223], "lantern": [181, 269], "sign": [227, 270], "bones": [359, 134], "fe0": [541, 353], "fe1": [540, 352], "fe2": [541, 353], "fe3": [541, 352], "fe4": [540, 352], "fe5": [541, 352], "claw0": [154, 174], "claw1": [154, 174], "claw2": [156, 174], "claw3": [178, 174], "claw4": [171, 174], "claw5": [170, 174], "claw6": [152, 174], "claw7": [150, 174], "dagger0": [159, 170], "dagger1": [52, 170], "dagger2": [158, 170], "dagger3": [70, 170], "wave0": [32, 173], "wave1": [68, 173], "wave2": [112, 173], "wave3": [142, 173], "wave4": [186, 173], "wave5": [199, 173], "tele0": [133, 196], "tele1": [144, 196], "tele2": [146, 196], "tele3": [148, 196], "tele4": [149, 196], "tele5": [145, 196], "tele6": [144, 196], "tele7": [136, 196]}},FOR_R=FM.r,FNAT=FM.nat;const FORIMG=new Image();let forReady=false;FORIMG.onload=()=>{forReady=true;};
const SKYFIMG=new Image();let skyfReady=false;SKYFIMG.onload=()=>{skyfReady=true;};const TRAILIMG=new Image();let trailReady=false;TRAILIMG.onload=()=>{trailReady=true;};
function forestLoad(){townLoad();if(FORIMG.src)return;FORIMG.src="assets/forest.webp?v=6cd6ee8ecb";SKYFIMG.src="assets/skyf.webp?v=dc2b8c4e81";TRAILIMG.src="assets/trail.webp?v=bf9254ee7b";}
const F_WAVES=4;
/* draw a forest sprite: ws = world units per native pixel; anchor 'bottom' or 'mid' (centred at height h) */
function fSpr(n,x,z,ws,o){const r=FOR_R[n],nt=FNAT[n];if(!r||!forReady)return null;o=o||{};const[sx,sy,k]=P(x,z,o.h||0),w=nt[0]*ws*k,h=nt[1]*ws*k;
  ctx.globalAlpha=o.a==null?1:Math.max(0,Math.min(1,o.a));if(o.op)ctx.globalCompositeOperation=o.op;
  const y0=o.mid?sy-h/2:sy-h;
  if(o.flip){ctx.save();ctx.translate(sx,0);ctx.scale(-1,1);ctx.drawImage(FORIMG,r[0],r[1],r[2],r[3],-w/2,y0,w,h);ctx.restore();}
  else ctx.drawImage(FORIMG,r[0],r[1],r[2],r[3],sx-w/2,y0,w,h);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';return{sx,sy,k,w,h};}
function drawPanelSide(side){
  const X=side*BLD_X,iA=Math.floor((20+roadScroll)/BLD_SEG),iB=Math.floor((3200+roadScroll)/BLD_SEG);
  ctx.imageSmoothingEnabled=false;
  for(let i=iB;i>=iA;i--){const zs=i*BLD_SEG-roadScroll,z0=Math.max(8,zs),z1=zs+BLD_SEG;if(z1<=z0)continue;
    const tr=FOR_R['fe'+Math.floor(hash3(i*3+(side>0?7:0))*6)];if(!tr)continue;
    const Hw=BLD_SEG*tr[3]/tr[2]*1.45,x0=WW/2+X*F/(z0+D),x1=WW/2+X*F/(z1+D),fade=Math.min(1,Math.max(0,(3200-z1)/900));
    const lo=Math.floor(Math.min(x0,x1)),hi=Math.ceil(Math.max(x0,x1));ctx.globalAlpha=fade;
    for(let c=Math.max(-2,lo);c<=Math.min(WW+2,hi);c+=1){const dx=c+.5-WW/2;if(dx*side<=0)continue;const z=F*X/dx-D;if(z<z0||z>z1)continue;
      let u=(z-zs)/BLD_SEG;if(side>0)u=1-u;const k=F/(z+D),yb=HOR+CAMH*k,yt=HOR+(CAMH-Hw)*k;
      ctx.drawImage(FORIMG,tr[0]+Math.min(tr[2]-1,Math.floor(u*tr[2])),tr[1],1,tr[3],c,yt,1.6,yb-yt);}}
  ctx.globalAlpha=1;
}
const FPROPS=[['rock',.55],['log',.7],['stump',.6],['mush',.5],['bush',.75],['tent',.8],['lantern',.75],['sign',.7],['bones',.6]];
function drawForestWorld(dt){
  if(state==='play'&&!(R&&R.cfb))roadScroll+=dt*WALK;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#0c0814';ctx.fillRect(-20,-20,WW+40,WH+40);
  if(skyfReady){ctx.imageSmoothingEnabled=true;const sh=152,sw=sh*SKYFIMG.width/SKYFIMG.height;ctx.drawImage(SKYFIMG,WW/2-sw/2,HOR+5-sh,sw,sh);ctx.imageSmoothingEnabled=false;}
  if(trailReady){const HWs=647,TL=HWs*2*TRAILIMG.height/TRAILIMG.width,Wt=TRAILIMG.width,Ht=TRAILIMG.height;ctx.fillStyle='#0d110c';ctx.fillRect(-20,HOR,WW+40,WH);
    for(let y=WH+30;y>HOR+1;y-=1){const k=(y-HOR)/CAMH,z=F/k-D;if(z>4200)break;let v=((z+roadScroll)/TL)%1;if(v<0)v+=1;const hw=HWs*k;ctx.drawImage(TRAILIMG,0,Ht-1-Math.floor(v*Ht),Wt,1,WW/2-hw,y,hw*2,1.25);}}
  if(forReady){drawPanelSide(-1);drawPanelSide(1);}
  ctx.restore();
  const hz=ctx.createLinearGradient(0,HOR-40,0,HOR+40);hz.addColorStop(0,'rgba(40,60,30,0)');hz.addColorStop(.5,'rgba(50,70,40,.6)');hz.addColorStop(1,'rgba(40,60,30,0)');ctx.fillStyle=hz;ctx.fillRect(-20,HOR-40,WW+40,80);
  if(!forReady)return;
  const items=[],span=3600,zmin=30;const wrap=(base,sp)=>{const out=[];for(let i=0;i*sp<span;i++)out.push(zmin+((((base-roadScroll)%span)+span)%span+i*sp)%span);return out;};
  wrap(90,300).forEach(z=>{const g=Math.floor((roadScroll+z)/300);items.push([z,'tree',hash3(g*7)<.5?-1:1,g]);if(hash3(g*13)<.45)items.push([z+40,'tree',hash3(g*7)<.5?1:-1,g+999]);});
  wrap(200,260).forEach(z=>{const g=Math.floor((roadScroll+z)/260);if(hash3(g*17)<.3)return;items.push([z,'prop',hash3(g*5)<.5?-1:1,g]);});
  items.sort((a,b)=>b[0]-a[0]);
  for(const[z,kind,s,g]of items){if(z>3300)continue;const a=Math.min(1,(3300-z)/900)*Math.min(1,Math.max(0,(z-50)/160));
    if(kind==='tree'){const n='tree'+(hash3(g*3+1)<.12?3:Math.floor(hash3(g*11)*3)),H=620+hash3(g*19)*260;fSpr(n,s*(585+hash3(g*23)*60),z,H/FNAT[n][1],{a,flip:hash3(g*29)<.5});}
    else{const p=FPROPS[Math.floor(hash3(g*31)*FPROPS.length)],n=p[0],x=s*(500+hash3(g*37)*70),nt=FNAT[n],big=n==='tent'||n==='log'||n==='bones';
      const ws=big?p[1]*200/nt[0]:p[1]*(n==='lantern'||n==='sign'?190:n==='bush'?120:n==='stump'?90:70)/nt[1];
      const d=fSpr(n,x,z,ws,{a,flip:s>0&&n!=='sign'});
      if(d&&(n==='lantern'||n==='mush')){ctx.globalCompositeOperation='lighter';const lx=n==='lantern'?d.sx+(s>0?-1:1)*d.w*.18:d.sx,ly=d.sy-d.h*(n==='lantern'?.42:.5),R_=(n==='lantern'?60:46)*d.k,fl=.75+.25*Math.sin(t*9+g);
        const gr=ctx.createRadialGradient(lx,ly,0,lx,ly,R_);gr.addColorStop(0,n==='lantern'?'rgba(255,170,80,'+.6*fl*a+')':'rgba(182,242,58,'+.45*a+')');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.fillRect(lx-R_,ly-R_,R_*2,R_*2);ctx.globalCompositeOperation='source-over';}}}
  for(let i=0;i<8;i++){const z=((i*430-roadScroll)%3440+3440)%3440+60,[sx,sy,k]=P(Math.sin(i*2.3+t*.12)*360,z),w=1000*k,h=70*k;ctx.globalAlpha=Math.min(.36,(3400-z)/3000);
    const fg=ctx.createRadialGradient(sx,sy,0,sx,sy,w*.5);fg.addColorStop(0,'rgba(182,242,58,.5)');fg.addColorStop(1,'rgba(182,242,58,0)');ctx.fillStyle=fg;ctx.save();ctx.translate(sx,sy);ctx.scale(1,h/w);ctx.translate(-sx,-sy);ctx.fillRect(sx-w/2,sy-w/2,w,w);ctx.restore();}
  ctx.globalAlpha=1;
  const top=ctx.createLinearGradient(0,0,0,HOR*.9);top.addColorStop(0,'rgba(5,3,10,.55)');top.addColorStop(1,'rgba(5,3,10,0)');ctx.fillStyle=top;ctx.fillRect(-20,-20,WW+40,HOR*.9+20);
}

/* survivors who vanish in green light during wave 1 */
const F_LINES=[['rook',"Boss... where'd the medic go?",'cmd',"Where'd the medic go?"],['cmd',"Keep them close! Nobody wanders off!"],['rook',"They're not wandering. They're disappearing.",'cmd',"They're not wandering off. They're vanishing."],['cmd',"Something's in these woods with us."],['rook',"That's all of them. We're alone out here.",'cmd',"That's all of them. I'm alone out here."]];
const F_LINE_AT={1:0,3:1,5:2,8:3,10:4};
function say(i){const L=F_LINES[i];let who=L[0],txt=L[1];if(who==='rook'&&!save.active.includes('rook')){who=L[2];txt=L[3];}R.say={who,txt,t:3.4};}
function forestCivs(){const c=mkCivs();for(const q of c){q.max=q.hp=1;q.safe=1;}return c;}
function vanishUpdate(dt){
  if(!R.civ)return;for(const c of R.civ)if(c.van!=null){c.van+=dt;if(c.van>=.45&&c.hp>0){c.hp=0;}}
  if(R.wave!==1||!R.vorder)return;
  const goal=Math.max(1,R.spawnTotal-10),done=R.civ.filter(c=>c.van!=null).length,want=Math.min(CIV_N,Math.floor(Math.min(1,(R.kills||0)/goal)*CIV_N+.0001));
  R.vT=(R.vT||0)-dt;
  if(done<want&&R.vT<=0){const c=R.civ[R.vorder[done]];c.van=0;R.vT=(R.kills||0)>=goal?.35:.9;SND.whoosh();
    const[px,py]=P(c.x,c.z,CHAR_H+6);R.tx.push({x:px,y:py,txt:'?',col:'#b6f23a',t:1.2});
    const n=done+1;if(F_LINE_AT[n]!=null)say(F_LINE_AT[n]);}
}
function drawVanish(c){const q=c.van/.9;if(q>=1)return;const f=Math.min(7,Math.floor(q*8));fSpr('tele'+f,c.x,c.z,1.05,{a:1});}
function drawSay(){const s=R.say;if(!s||R.cine)return;const a=Math.min(1,s.t*2),nm=s.who==='cmd'?'COMMANDER':HEROES[s.who]?HEROES[s.who].name.toUpperCase():s.who,col=s.who==='cmd'?'#ffc53d':HEROES[s.who]?HEROES[s.who].color:'#b6f23a';
  ctx.globalAlpha=a;ctx.font='13px "Chakra Petch", sans-serif';const tw=ctx.measureText(s.txt).width,w=Math.min(WW-40,tw+40),x=WW/2-w/2,y=80;
  ctx.fillStyle='#0b080ee0';ctx.fillRect(x,y,w,44);ctx.fillStyle=col;ctx.fillRect(x,y,3,44);
  ctx.font='10px Bungee, Impact, sans-serif';ctx.textAlign='left';ctx.fillText(nm,x+14,y+16);ctx.fillStyle='#efe6dc';ctx.font='13px "Chakra Petch", sans-serif';ctx.fillText(s.txt,x+14,y+34);ctx.globalAlpha=1;}

/* Screechers: hitting one releases a shockwave that stuns a hero for 3 seconds */
function screech(e){if(e.scrCd>0)return;e.scrCd=2.5;e.scrT=.5;R.swaves=R.swaves||[];let tg=null,bd=1e9;for(const m of squad()){const d=Math.abs(m.x-e.x);if(d<bd){bd=d;tg=m;}}R.swaves.push({x:e.x,z:e.z,x0:e.x,z0:e.z,tx:tg?tg.x:e.x,t:0});SND.hiss&&SND.hiss();}
function swaveUpdate(dt){if(!R.swaves)return;
  for(const w of R.swaves){w.t+=dt;if(!w.hit){w.z-=900*dt;w.x=w.tx+(w.x0-w.tx)*Math.max(0,w.z-30)/Math.max(1,w.z0-30);if(w.z<=30){w.hit=1;w.ht=0;const sq=squad();R.hstun=R.hstun||{};let best=null,bd=60;for(const m of sq){if(R.hstun[m.id]>-2)continue;const d=Math.abs(m.x-w.x);if(d<bd){bd=d;best=m;}}
      if(best){w.x=best.x;{R.hstun[best.id]=3;const[px,py]=P(best.x,best.z,CHAR_H+16);R.tx.push({x:px,y:py,txt:'STUNNED',col:'#c9a7ff',t:1.4});}hurtMember(best.id,3);R.shake=Math.max(R.shake||0,.15);}}}
    else w.ht+=dt;}
  R.swaves=R.swaves.filter(w=>!w.hit||w.ht<.3);
  if(R.hstun)for(const k in R.hstun)if(R.hstun[k]>-2)R.hstun[k]-=dt;}
const stunned=id=>!!(R&&R.hstun&&R.hstun[id]>0);
function drawSWave(w){const f=w.hit?5:2+Math.floor(w.t*10)%3,d=Math.min(1,w.t*3);fSpr('wave'+f,w.x,w.z,1.1+(1-Math.min(1,w.z/ZFAR))*.6,{h:60,mid:1,a:d,op:'lighter'});}
function drawStuns(){if(!R.hstun)return;for(const m of squad()){if(!stunned(m.id))continue;const[sx,sy,k]=P(m.x,m.z,CHAR_H+8);ctx.strokeStyle='rgba(201,167,255,.9)';ctx.lineWidth=2;
  for(let i=0;i<3;i++){const a=t*6+i*2.09;ctx.beginPath();ctx.ellipse(sx,sy,22*k,7*k,0,a,a+1.2);ctx.stroke();}}}

/* Momma: summons ground claws under the squad and throws bone daggers */
const MOMMA_HP=6000;
function spawnMomma(){R.en.push({type:'momma',hp:MOMMA_HP*ENEMY_K*(HORDE()?1.4:1),max:MOMMA_HP*ENEMY_K*(HORDE()?1.4:1),spd:16*SPD,r:62,gold:60,xp:160,col:'#b6f23a',x:0,z:ZFAR+60,slow:0,burn:0,bdps:0,stun:0,wob:0,dmg:0,armor:1});}
const MACT={summon:{d:1.1,rel:.85,fn:mommaSummon},throw:{d:.9,rel:.6,fn:mommaThrow},shriek:{d:1.0,rel:.45,fn:mommaShriek}};
function mommaAI(e,dt){
  if(e.sumT==null){e.sumT=3.5;e.thrT=2.2;e.callT=10;e.act=null;R.banner={txt:'MOMMA',t:2.6,col:'#b6f23a'};SND.groan(0,.7);}
  let sp=e.spd;if(e.slow>0){e.slow-=dt;sp*=e.slowAmt;}
  if(e.z>440&&!e.act)e.z-=sp*dt;
  if(!e.act)e.x+=(Math.max(-220,Math.min(220,SX))-e.x)*.25*dt+Math.sin(t*.8)*14*dt;
  if(e.act){e.at+=dt;const A=MACT[e.act];if(!e.rel&&e.at>=A.rel){e.rel=1;A.fn(e);}if(e.at>=A.d)e.act=null;return;}
  if(e.z>ZFAR)return;
  e.sumT-=dt;e.thrT-=dt;e.callT-=dt;
  if(!e.enr&&e.hp<e.max*.5){e.enr=1;e.act='shriek';e.at=0;e.rel=0;return;}
  if(e.callT<=0){e.callT=e.enr?7:11;e.act='shriek';e.at=0;e.rel=0;e.call=1;return;}
  if(e.sumT<=0){e.sumT=e.enr?3:4.5;e.act='summon';e.at=0;e.rel=0;}
  else if(e.thrT<=0){e.thrT=e.enr?1.3:2;e.act='throw';e.at=0;e.rel=0;}
}
function mommaSummon(e){R.claws=R.claws||[];const sq=squad(),pick=sq.slice();
  for(const m of pick)R.claws.push({x:m.x,z:m.z+6,t:0});if(e.enr)for(const dx of[-170,170])R.claws.push({x:Math.max(-LANE_E,Math.min(LANE_E,SX+dx+(Math.random()-.5)*60)),z:6,t:-.2});SND.groan(e.x/600,.5);}
function mommaThrow(e){R.dag=R.dag||[];const sq=squad(),n=e.enr?4:3,pick=sq.slice().sort(()=>Math.random()-.5);
  for(let i=0;i<n;i++){const m=pick[i%pick.length],tx=m.x+(i>=pick.length?(Math.random()<.5?-70:70):(Math.random()-.5)*20),tz=m.z+10,dist=Math.hypot(tx-e.x,tz-e.z);
  R.dag.push({x0:e.x+30,z0:e.z-10,h0:e.r*3,x1:tx,z1:tz,t:-i*.12,T:dist/820,x:e.x,z:e.z,h:e.r*3});}SND.whoosh();}
function mommaShriek(e){const call=e.call;e.call=0;if(!call)R.banner={txt:'MOMMA IS ENRAGED',t:2.4,col:'#ff4d5e'};R.shake=.4;SND.groan(0,.9);for(let k=0;k<(call?(e.enr?4:3):6);k++){const m=mkEnemy('screecher',e.x+(k-1.5)*80,e.z-40);m.z=e.z-30;}}
function bossFxUpdate(dt){if(R.s5)s5Fx(dt);
  if(R.claws){for(const c of R.claws){c.t+=dt;if(c.t>=1.2&&!c.hit){c.hit=1;R.shake=Math.max(R.shake||0,.25);SND.explosion(.35);burst(c.x,c.z,30,'#b6f23a',14);
      for(const m of squad())if(Math.abs(m.x-c.x)<62&&Math.abs(m.z-c.z)<44)hurtMember(m.id,20/HURT_K);}}R.claws=R.claws.filter(c=>c.t<2);}
  if(R.dag){for(const p of R.dag){p.t+=dt;const q=Math.max(0,Math.min(1,p.t/p.T));p.x=p.x0+(p.x1-p.x0)*q;p.z=p.z0+(p.z1-p.z0)*q;p.h=p.h0+(50-p.h0)*q;
      if(q>=1&&!p.done){p.done=1;burst(p.x,p.z,40,'#e8dcb0',8);for(const m of squad())if(Math.abs(m.x-p.x)<46&&Math.abs(m.z-p.z)<40)hurtMember(m.id,9/HURT_K);}}R.dag=R.dag.filter(p=>!p.done);}
}
function drawClaw(c){const[sx,sy,k]=P(c.x,c.z);if(c.t<1.2){const pl=.5+.5*Math.sin(t*16);ctx.fillStyle='rgba(182,242,58,'+(.12+.25*pl*Math.min(1,Math.max(0,c.t)*2))+')';ctx.strokeStyle='rgba(182,242,58,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,64*k,20*k,0,0,6.283);ctx.fill();ctx.stroke();}
  if(c.t<0)return;const f=c.t<1.2?Math.floor(c.t*4)%2:Math.min(7,2+Math.floor((c.t-1.2)*8));fSpr('claw'+f,c.x,c.z+4,.95);}
function drawDag(p){if(p.t<0)return;fSpr('dagger'+(Math.floor(p.t*14)%4),p.x,p.z,.55,{h:p.h,mid:1});}
function mommaFrame(e){const M=e.reborn&&META.momma2?META.momma2:META.momma;if(e.act){const A=M[e.act],q=Math.min(.999,e.at/MACT[e.act].d);return A[Math.floor(q*A.length)];}return M.walk[Math.floor(t*(e.z>445?7:4))%M.walk.length];}

/* stage flow */
/* on the backroad Bruno drives off to the lab: kept aside, not in the squad */
function brunoLeaves(){if(LOADSEL)return;if(!save.heroes.bruno)return;save.away=save.away||{};save.away.bruno=save.heroes.bruno;delete save.heroes.bruno;save.active=save.active.filter(h=>h!=='bruno');persist();}
function startForest(){
  stageRevive();ensureHero('rook');if(save.route==='backroad')brunoLeaves();storyParty(['rook']);
  forestLoad();for(const id of['cmd',...Object.keys(save.heroes)])setHp(id,maxHp(id));for(const id of REVD)if(save.heroes[id])setHp(id,maxHp(id)*.5);REVD=[];
  roadScroll=0;
  const civ=forestCivs(),ord=[5].concat([0,1,2,3,4,6,7,8,9].sort(()=>Math.random()-.5));
  R={stage:3,forest:1,wave:1,wall:0,wallMax:1,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,vx:0,prevSX:SX,dead:[],civ,vorder:ord,
    queue:[],kills:0,spawnLeft:0,spawnTotal:0,spawnT:2,bossPending:false,crateAt:[],jeepAt:-1,proj:[]};
  setTimeout(()=>cineLoadKeys(FCUT_KEYS),4000);
  startWaveF(1);
}
function shuf(q){for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}return q;}
function startWaveF(w){
  R.wave=w;SND.alarm();setTimeout(checkpoint,0);const H2=HORDE()?2:1,q=[],add=(ty,n)=>{for(let i=0;i<n*H2;i++)q.push(ty);};
  if(w===1){add('grunt',40);add('runner',20);add('armored',5);shuf(q);}
  else if(w===2)add('grunt',150);
  else if(w===3){add('screecher',10);add('grunt',50);add('runner',20);add('armored',10);shuf(q);}
  else{add('screecher',20);spawnMomma();setTimeout(()=>{if(R&&R.forest)cineLoad(feOpen(feCrew()).slice(0,2));},5000);}
  if(w>=2&&R.civ&&R.civ.some(c=>c.safe)){for(const c of R.civ){c.hp=c.max=30;c.safe=0;c.van=null;c.x=c.ox;c.z=c.oz;}}
  R.queue=q;R.kills=0;R.spawnLeft=q.length;R.spawnTotal=q.length;R.spawnT=w===4?3:2.4;R.say=null;
  R.banner=w===2?{txt:'THEY ARE EVERYWHERE',t:2.6,col:'#ff4d5e'}:w===4?null:{txt:(w===1?'STAGE 3: THE FOREST · ':'')+'WAVE '+w,t:2.4,col:'#ffc53d'};
  if(R.pendBanner){R.banner=R.pendBanner;R.pendBanner=null;}
  state='play';ui();
}
function spawnPaceF(){const w=R.wave;if(w===2){const p=1-R.spawnLeft/R.spawnTotal;return lerp(.5,.24,Math.min(1,p*1.8))*(.75+Math.random()*.5);}return(w===1?.8:w===3?.75:2.6)*(.65+Math.random()*.7);}
function packF(){const w=R.wave;return w===2?1+Math.floor(Math.random()*2.6):w===3&&Math.random()<.35?2:1;}
function waveClearF(){SND.waveClear();healRecovery();save.gold+=80+R.wave*40;persist();
  if(R.wave>=F_WAVES){if(R.ending)return;R.ending=1;persist();startForestEnd();return;}
  state='inter';ui();}
function forestNext(){const w=R.wave+1;startForestCut(w-1,()=>{startWaveF(w);},true);}

/* cutscenes: real art keys with stand-in backgrounds (fb) until the riso shots arrive */
const fogF=(c,tt,a)=>{for(let k=0;k<2;k++){const q=((tt*.03+k*.5)%1);c.sheet('c3fog',Math.floor(tt*1.5+k*4)%8,lerp(-.2,1.2,q),1.02,.8,'bottom',a*Math.sin(Math.PI*q));}};
const sparks=(c,tt,u,v,n)=>{for(let i=0;i<n;i++){const q=(tt*.4+i/n)%1;c.glow(u+Math.sin(i*7.3)*.06,v-q*.18,.006,.9*(1-q),'190,245,60');}};
const camP=(cx,cy,z0,z1)=>p=>({cx,cy,z:lerp(z0,z1,ease(p))});
const fx4=(c,k,f,u,v,w,a)=>c.sheet(k,Math.max(0,Math.min(3,f)),u,v,w,'mid',a==null?1:a);
const sparkLoop=(c,tt,u,v,w,a)=>{for(let i=0;i<2;i++){const q=(tt*.7+i*.5)%1;fx4(c,'c4spark',Math.floor(q*4),u+(i?.03:-.02),v-q*.05,w,(a||1)*Math.sin(Math.PI*q));}};
const ringOut=(c,tt,u,v,w,t0,dur)=>{const q=(tt-t0)/dur;if(q<0||q>1)return;fx4(c,'c4ring',Math.floor(q*4),u,v,w,1-q*.4);fx4(c,'c4fog',Math.floor(q*4),u,v+.02,w*1.15,.8*(1-q));};
const FC={
 f1:{bg:'xf1',fb:'xb8',d:7,vo:"Rook: \"Everybody's gone, boss. Just... gone.\" Commander: \"Stay on my back.\"",cam:p=>({cx:lerp(.45,.52,ease(p)),cy:.48,z:lerp(1.04,1.14,ease(p))}),
  fx(c,tt){c.glow(.02,.42,.12,.35+.15*Math.sin(tt*11)+.08*Math.sin(tt*37),'190,245,60');fogF(c,tt,.5);blinkEyes(c,tt,[[.3,.28,2],[.64,.22,3.4]],.005);}},
 rv1:{bg:'xrv1',fb:'xv6',d:7,vo:"Commander: \"Everybody's gone. It's just me out here.\"",cam:p=>({cx:lerp(.42,.5,ease(p)),cy:.5,z:lerp(1.04,1.14,ease(p))}),
  fx(c,tt){c.glow(.5,.47,.06,.5+.2*Math.sin(tt*11),'190,245,60');fogF(c,tt,.5);blinkEyes(c,tt,[[.66,.4,2],[.88,.48,3.4]],.005);}},
 s1alt:{bg:'xrv1',fb:'xv6',d:6,vo:"Then the woods began to scream.",cam:p=>({cx:.55,cy:.5,z:lerp(1.08,1.16,ease(p))}),snd:()=>{SND.hiss&&SND.hiss();setTimeout(()=>SND.hiss&&SND.hiss(),1400);},
  fx(c,tt){const q=(tt*.55)%1;fx4(c,'c4fog',Math.floor(q*4),.78,.7,.35+q*.3,1-q);if((tt%1.4)<.3)c.shake=3;}},
 f2:{bg:'xf2',fb:'xb8',d:6,vo:"Then the weight at his back was gone.",cam:p=>({cx:lerp(.5,.62,ease(p)),cy:.5,z:lerp(1.04,1.2,ease(p))}),
  fx(c,tt){sparkLoop(c,tt,.82,.62,.22,.9);c.glow(.86,.6,.12,.2,'190,245,60');}},
 f3:{bg:'xf3',fb:'xv6',d:6,vo:"Commander: \"Whoever you are, show yourself!\"",cam:p=>({cx:.45,cy:.5,z:lerp(1.02,1.12,ease(p))}),snd:()=>SND.groan(.6,.2),
  fx(c,tt){c.glow(.58,.49,.07,.55+.2*Math.sin(tt*13),'190,245,60');fogF(c,tt,.45);if(tt>.8&&tt<1.5)c.shake=5;}},
 f4:{bg:'xf4',fb:'xv6',d:4,vo:"She came out of the dark.",cam:p=>({cx:lerp(.5,.32,ease(p)),cy:lerp(.5,.45,ease(p)),z:lerp(1.05,1.35,ease(p))}),snd:()=>{SND.whoosh();setTimeout(()=>SND.zap&&SND.zap(),2200);},
  fx(c,tt){c.glow(.2,.42,.18,.3+.3*Math.min(1,tt/2),'190,245,60');if(tt>2.2)fx4(c,'c4burst',Math.floor((tt-2.2)*3.5),.22,.42,.42,1);if(tt>3)c.flash(Math.min(.8,(tt-3)*.9));}},
 f5:{bg:'xf5',fb:'xv6',d:5.2,choiceAt:1.4,mini:1,vo:"She pinned him down, a spell crackling in her hand. Break her hold!",cam:p=>({cx:.47,cy:.45,z:lerp(1.1,1.2,ease(p))}),
  fx(c,tt){const left=cine&&cine.mg?cine.mg.left:6,pl=.5+.5*Math.sin(Date.now()/Math.max(40,left*30));c.glow(.16,.3,.2,.3+.4*pl,'190,245,60');sparkLoop(c,tt*(1+(6-left)*.4),.17,.28,.22,1);c.shake=cine&&cine.mg?2+(6-left):0;}},
 w1:{bg:'xw1',fb:'xb8',d:6,vo:"Commander: \"Hex?!\" Hex: \"...Oh. It's you.\"",cam:p=>({cx:.42,cy:.5,z:lerp(1.08,1.18,ease(p))}),
  fx(c,tt){fx4(c,'c4spark',2+Math.floor(tt*2)%2,.68,.47,.1,Math.max(0,1-tt/5));fx4(c,'c4spark',3,.13,.6,.1,Math.max(0,1-tt/4));}},
 w2:{bg:'xw2',fb:'xb8',d:7,vo:"Commander: \"Good to see you too.\" Hex: \"Your people are fine. I moved them. You're welcome.\"",cam:p=>({cx:.5,cy:.5,z:lerp(1.02,1.1,ease(p))}),
  fx(c,tt){fogF(c,tt,.35);fx4(c,'c4spark',3,.33,.45,.08,.5+.3*Math.sin(tt*3));}},
 w3:{bg:'xw3',fb:'xb8',d:7,vo:"Rook: \"Anybody want to explain what just happened?\"",cam:p=>({cx:lerp(.5,.6,ease(p)),cy:.55,z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){ringOut(c,tt,.73,.75,.6,1.5,4.5);c.glow(.73,.75,.3,.25*Math.max(0,1-tt/5),'190,245,60');}},
 rv3:{bg:'xrv3',fb:'xv6',d:7,vo:"The survivors were waiting, safe and confused.",cam:p=>({cx:lerp(.5,.6,ease(p)),cy:.55,z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){ringOut(c,tt,.66,.72,.6,1.5,4.5);c.glow(.66,.72,.3,.25*Math.max(0,1-tt/5),'190,245,60');}},
 l1:{bg:'xl1',fb:'xv6',d:3,vo:"The spell finished.",cam:p=>({cx:.5,cy:.5,z:lerp(1.08,1.3,ease(p))}),snd:()=>SND.explosion(.4),
  fx(c,tt){fx4(c,'c4burst',Math.floor(tt*2.5),.42,.42,.8,1);c.flash(Math.max(0,.9-tt*.5));}},
 l2:{bg:'xl2',fb:'xb8',d:7,vo:"Rook: \"You too, huh? One second I was there, then I was here.\"",cam:p=>({cx:.5,cy:lerp(.62,.5,ease(p)),z:lerp(1.12,1.02,ease(p))}),
  fx(c,tt){ringOut(c,tt,.32,.82,.55,0,3.5);c.dim(Math.max(0,.5-tt*.15));}},
 rv2:{bg:'xrv2',fb:'xv6',d:7,vo:"The survivors stared at him. They had no idea how they got there either.",cam:p=>({cx:.5,cy:lerp(.62,.5,ease(p)),z:lerp(1.12,1.02,ease(p))}),
  fx(c,tt){ringOut(c,tt,.32,.82,.55,0,3.5);c.dim(Math.max(0,.5-tt*.15));}},
 f6:{bg:'xf6',fb:'xb6',d:5,vo:"Commander: \"Contact! All around us!\"",cam:p=>({cx:.5,cy:.5,z:lerp(1.14,1.0,ease(p))}),snd:()=>{SND.groan(-.6,.5);setTimeout(()=>SND.groan(.6,.5),500);},
  fx(c,tt){sparkLoop(c,tt,.71,.31,.1,1);blinkEyes(c,tt,[[.05,.62,.3],[.15,.68,.6],[.9,.6,.9],[.97,.68,1.2],[.25,.2,1.5],[.78,.22,1.8],[.45,.12,2.1],[.6,.15,2.4]],.004);}},
 s1:{bg:'xs1',fb:'xb8',d:6,vo:"Then the woods began to scream.",cam:p=>({cx:lerp(.5,.6,ease(p)),cy:.5,z:lerp(1.02,1.1,ease(p))}),snd:()=>{SND.hiss&&SND.hiss();setTimeout(()=>SND.hiss&&SND.hiss(),1400);},
  fx(c,tt){const q=(tt*.55)%1;fx4(c,'c4fog',Math.floor(q*4),.8,.68,.3+q*.35,1-q);if((tt%1.4)<.3)c.shake=3;}},
 s2:{bg:'xs2',fb:'xb8',d:4,snd:()=>{SND.hiss&&SND.hiss();},vo:"Hex: \"Those are Screechers. RUN!\"",cam:p=>({cx:.45,cy:.42,z:lerp(1.05,1.25,ease(p))}),fx(c,tt){c.shake=2;}},
 s2v:{bg:'xs2v',fb:'xv6',d:4,snd:()=>{SND.hiss&&SND.hiss();setTimeout(()=>SND.hiss&&SND.hiss(),900);},vo:"Commander: \"Whatever that is, we're not sticking around. RUN!\"",cam:p=>({cx:.45,cy:.42,z:lerp(1.05,1.25,ease(p))}),fx(c,tt){c.shake=2;}},
 m1:{bg:'xm1',fb:'xb6',d:8,vo:"Something heard her children die. And she was angry.",cam:p=>({cx:.5,cy:lerp(.72,.36,ease(p)),z:lerp(1.3,1.08,ease(p))}),snd:()=>{SND.groan(0,.8);setTimeout(()=>SND.hiss&&SND.hiss(),2500);},
  fx(c,tt){c.glow(.2,.37,.1,.35+.15*Math.sin(tt*5),'190,245,60');c.glow(.8,.41,.1,.35+.15*Math.sin(tt*5+1),'190,245,60');
   if(tt>4.2){const a=Math.min(1,(tt-4.2)*1.5);c.glow(.478,.077,.012,a,'230,255,180');c.glow(.517,.077,.012,a,'230,255,180');c.glow(.497,.08,.05,.35*a,'190,245,60');}
   if(tt>5.5&&tt<6.2)c.shake=6;}},
};
const FCUT_KEYS=['c3fog','c3ember','c3flash','c4ring','c4spark','c4fog','c4burst'].concat(...Object.values(FC).map(s=>[s.bg,s.fb]));
function fcutList(n,crew){const rook=crew.rook,C=FC;
  if(n===1)return rook?[C.f1,C.f2,C.f3,C.f4,C.f5]:[C.rv1,C.f3,C.f4,C.f5];
  if(n===2)return crew.hex&&rook?[C.s1,C.s2]:[crew.hex?C.s2:C.s2v];
  return[C.m1];}
function miniShow(){if(clayer.querySelector('.cmini'))return;const cf=typeof cine.list[cine.i].mini==='object'?cine.list[cine.i].mini:{};if(cf.kind==='volt'){voltMiniShow(cf);return;}cine.mg={fill:0,left:cf.time||6,cf,shT:1.2,shI:0};const d=document.createElement('div');d.className='cmini';
  d.innerHTML='<div class="mlab">'+(cf.label||'BREAK HER HOLD!')+'</div><div class="mbar"><i></i></div><div class="mtime">'+(cf.time||6).toFixed(1)+'</div><button type="button">TAP!</button>';
  const tap=e=>{e.preventDefault();e.stopPropagation();if(!cine||!cine.mg||cine.mg.res)return;cine.mg.fill=Math.min(1,cine.mg.fill+1/(cf.taps||28));SND.click();if(cine.mg.fill>=1){miniEnd(true);return;}const b=d.querySelector('button');b.classList.remove('hit');void b.offsetWidth;b.classList.add('hit');};
  d.addEventListener('pointerdown',tap);clayer.appendChild(d);}
function miniTick(dt){const g=cine.mg;if(!g||g.res)return;if(g.volt){voltMiniTick(dt);return;}if(g.fill>=1){miniEnd(true);return;}g.left-=dt;g.fill=Math.max(0,g.fill-(g.cf.decay||.04)*dt);if(g.cf.shouts){g.shT-=dt;if(g.shT<=0){g.shT=2.1;feShout(g.shI++);}}const d=clayer.querySelector('.cmini');
  if(d){d.querySelector('.mbar i').style.width=(g.fill*100)+'%';d.querySelector('.mtime').textContent=Math.max(0,g.left).toFixed(1);}
  if(g.fill>=1)miniEnd(true);else if(g.left<=0)miniEnd(false);}
function feShout(i){const L=[['Commander','Hex, any time now!'],['Rook',"I'm running dry here!"],['Commander',"They're on top of us!"],['Rook','Whatever you are doing, do it faster!'],['Commander','HEX!']].filter(x=>x[0]!=='Rook'||(FECREW&&FECREW.rook));const x=L[i%L.length];let d=clayer.querySelector('.cshout');if(!d){d=document.createElement('div');d.className='cshout';d.style.cssText='position:absolute;left:50%;top:16%;transform:translateX(-50%) rotate(-2deg);background:#0d1016e6;border:2px solid #ffc53d;color:#efe6dc;font:15px Bungee,Impact,sans-serif;padding:6px 12px;pointer-events:none;white-space:nowrap;z-index:5';clayer.appendChild(d);}d.innerHTML='<span style="color:#ffc53d">'+x[0].toUpperCase()+':</span> '+x[1];d.style.top=(3+(i%3)*4)+'%';d.style.left=(i%2?62:38)+'%';SND.shot(x[0]==='Rook'?'pistol':'rifle',0);}
function miniEnd(won){const g=cine.mg;g.res=won?'won':'lost';cineLastMini=g.res;cine0pick='mini';const d=clayer.querySelector('.cmini');if(d)d.remove();
  if(won)SND.levelUp();else SND.explosion(.3);
  const sh=clayer.querySelector('.cshout');if(sh)sh.remove();
  if(g.cf&&g.cf.branch){cine.list=cine.list.slice(0,cine.i+1).concat(g.cf.branch(won));cine.tt=Math.max(cine.tt,cine.list[cine.i].d-.7);return;}
  const crew=cine.crew,C=FC,br=won?[C.w1,C.w2].concat(crew.rook?[C.w3,C.f6]:[C.rv3]):[C.l1,crew.rook?C.l2:C.rv2];
  cine.list=cine.list.slice(0,cine.i+1).concat(br);cine.tt=Math.max(cine.tt,cine.list[cine.i].d-.7);}
function startForestCut(n,done,record){cutSeen(['fc'+n]);cineLoadKeys(FCUT_KEYS);const crew={rook:!!save.heroes.rook&&save.active.includes('rook'),hex:!!save.heroes.hex&&save.active.includes('hex')};
  if(CREW_VIEW){crew.rook=CREW_VIEW.rook;crew.hex=CREW_VIEW.hex!==false;}
  cine0pick=null;startIntro(()=>{const res=cineLastMini;cineLastMini=null;cine0pick=null;
    if(record&&n===1){const won=res==='won';story('minigame',{id:'hex_pin',won});
      if(won&&!save.heroes.hex&&!save.fallen.includes('hex')){const lvs=[save.cmd,...save.active.map(h=>save.heroes[h].lv)],avg=lvs.reduce((a,b)=>a+b,0)/lvs.length,had=!!(save.away&&save.away.hex);const act=addHero('hex');setHp('hex',maxHp('hex'));R.pendBanner={txt:(act?'HEX JOINS THE SQUAD':'HEX JOINS THE RESERVES'),t:2.6,col:HEROES.hex.color};save.hexMet='joined';}
      else if(!won&&!save.heroes.hex)save.hexMet=save.hexMet||'missed';persist();}
    done&&done(res);},fcutList(n,crew));
  cine.crew=crew;}
let cineLastMini=null;
window.addEventListener('error',e=>{try{let d=document.getElementById('errbox');if(!d){d=document.createElement('div');d.id='errbox';d.style.cssText='position:fixed;left:6px;bottom:6px;right:6px;z-index:99999;background:#300;color:#fff;font:11px monospace;padding:6px;border:1px solid #f55;max-height:30%;overflow:auto;pointer-events:none';document.body.appendChild(d);}d.textContent+=(e.message||'error')+' @'+(e.lineno||'?')+':'+(e.colno||'?')+' ['+state+(R?' s'+R.stage+'w'+R.wave:'')+']\n';}catch(_){}});

/* ---------- LOAD (testing): start any board you've reached, at any wave, with any squad that belongs there ---------- */
const BOARDS=[
 {k:'1',name:'Stage 1 · The Outskirts',waves:[1,2,3,4,5],heroes:w=>w>1?['bruno']:[]},
 {k:'2',name:'Stage 2 · The Escape',waves:[1],heroes:()=>['bruno']},
 {k:'3',name:'Stage 3 · The Empty Town',waves:[1,2,3,'end'],heroes:()=>['bruno','rook']},
 {k:'3f',name:'Stage 3 · The Forest',waves:[1,2,3,4,'end'],heroes:w=>w==='end'||w>1?['rook','hex']:['rook']},
 {k:'4a',name:'Stage 4 · Cyber Future (town route)',waves:['f1','f2','f3','f4','vault'],heroes:w=>['rook','blaze','bruno'].concat(['f3','f4','vault'].includes(w)?['volt']:[])},
 {k:'4b',name:'Stage 4 · Cyber Future (forest route)',waves:[1,'f1','f2','f3'],heroes:w=>w==='f3'?['rook','hex','volt']:['rook','hex']},
 {k:'5',name:'Stage 5 · The Forest Run',waves:['w1','rit','post'],heroes:w=>((LSEL&&LSEL.route)||save.route||'highway')==='backroad'||w==='post'?['rook','hex','volt','bruno','blaze']:['rook','volt','bruno','blaze'],route:1},
 {k:'6',name:'Stage 6 · The Drive',waves:['start','hwy','city'],heroes:()=>['rook','hex','volt','bruno','blaze']}];
let LSEL=null,LOADSEL=null;
function reachOf(k){if(k==='6')return (save.reach&&save.reach['6'])||(save.s6Done?3:0);if(k==='5')return (save.reach&&save.reach['5'])||(save.s5Done?3:0);if(k==='4a')return (save.reach&&save.reach['4a'])||(save.cfaDone?5:0);if(k==='4b')return (save.reach&&save.reach['4b'])||(save.cfbDone?4:0);const R0=(save.reach&&save.reach[k])||0,c=save.cleared||0;
  if(k==='1')return Math.max(R0,c>=1?5:Math.min(5,(save.best||0)+1),1);
  if(k==='2')return Math.max(R0,c>=1?1:0);
  if(k==='3')return Math.max(R0,c>=2&&save.route==='highway'?1:0,c>=3&&save.route==='highway'?3:0);
  if(k==='3f')return Math.max(R0,c>=2&&save.route==='backroad'?1:0,save.forestDone?4:0);return 0;}
const reachEnd=()=>!!(save.reach&&save.reach['3e'])||((save.cleared||0)>=3&&save.route==='highway');
const waveOpen=(k,w)=>k==='6'?((save.reach&&save.reach['6'])||(save.s6Done?3:0))>S6_ORDER.indexOf(w):k==='5'?((save.reach&&save.reach['5'])||(save.s5Done?3:0))>S5_ORDER.indexOf(w):k==='4a'?((save.reach&&save.reach['4a'])||0)>CFA_ORDER.indexOf(w):k==='4b'?((save.reach&&save.reach['4b'])||0)>CF_ORDER.indexOf(w):w==='end'?(k==='3f'?!!(save.reach&&save.reach['3fe'])||!!save.forestDone:reachEnd()):reachOf(k)>=w;
function markReach(k,w){save.reach=save.reach||{};if(k==='6'){save.reach['6']=Math.max(save.reach['6']||0,S6_ORDER.indexOf(w)+1);return;}if(k==='5'){save.reach['5']=Math.max(save.reach['5']||0,S5_ORDER.indexOf(w)+1);return;}if(k==='4a'){save.reach['4a']=Math.max(save.reach['4a']||0,CFA_ORDER.indexOf(w)+1);return;}if(k==='4b'){save.reach['4b']=Math.max(save.reach['4b']||0,CF_ORDER.indexOf(w)+1);return;}if(w==='end'){save.reach[k==='3f'?'3fe':'3e']=1;return;}save.reach[k]=Math.max(save.reach[k]||0,w);}
function loadHTML(){const BUILD=(window.__VER||'artifact').slice(0,6);if(!LSEL){const b=BOARDS.find(b=>reachOf(b.k)>0)||BOARDS[0];LSEL={k:b.k,w:1,h:{bruno:1,rook:1,hex:1}};}
  let h=`<h2>Load</h2><div class="stripe"></div><p class="sub">Testing tool. Start any board you've reached, from any wave, with any squad that belongs there. Mode: ${HORDE()?'Horde':'Normal'}. Build ${BUILD}.</p>`;
  for(const b of BOARDS){const open=reachOf(b.k)>0,sel=LSEL.k===b.k;
    if(!open){h+=`<div class="card locked" style="grid-template-columns:1fr auto"><div class="cname">${b.name}<small>Not reached yet</small></div><div class="lv">LOCKED</div></div>`;continue;}
    h+=`<div class="card" style="grid-template-columns:1fr auto;cursor:pointer;${sel?'border-color:#ff6a2b':''}" data-act="lb" data-k="${b.k}"><div class="cname">${b.name}<small>${sel?'Selected':'Tap to choose'}</small></div><div class="lv">${sel?'●':''}</div></div>`;
    if(!sel)continue;
    h+=`<h3>Start from</h3><div class="chips">${b.waves.map(w=>{const ok=waveOpen(b.k,w);return `<button class="chip ${LSEL.w===w?'on':''}" data-act="lw" data-w="${w}" ${ok?'':'disabled style="opacity:.35"'}>${w==='end'?'Ending':w==='f1'?'Floor 1':w==='f2'?'Floor 2':w==='f3'?'Floor 3':w==='f4'?'The hall':w==='vault'?'Containment':w==='start'?'Forest road':w==='hwy'?'Highway':w==='city'?'Mega City':w==='w1'?'Wave 1':w==='rit'?'The ritual':w==='post'?'Ranger station':b.waves.length>1?(b.k==='4b'?'Courtyard':'Wave '+w):'Start'}</button>`;}).join('')}</div>`;
    if(b.route){const r=LSEL.route||save.route||'highway';h+=`<h3>Route taken</h3><div class="chips"><button class="chip ${r==='highway'?'on':''}" data-act="lr" data-r="highway">Town route</button><button class="chip ${r==='backroad'?'on':''}" data-act="lr" data-r="backroad">Forest route</button></div>`;}
    const hs=b.heroes(LSEL.w);
    h+=`<h3>Squad</h3><div class="chips"><button class="chip on" disabled>Commander</button>${hs.map(id=>`<button class="chip ${LSEL.h[id]?'on':''}" data-act="lh" data-id="${id}">${HEROES[id].name}</button>`).join('')}${hs.length?'':'<span class="sub">The Commander fights alone here.</span>'}</div>
    <div class="btns"><button class="btn" data-act="lgo">Start</button></div>`;}
  return h+`<div class="btns"><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="menu">Back</button></div>`;}
function loadGo(){const b=BOARDS.find(b=>b.k===LSEL.k),w=LSEL.w,pick=b.heroes(w).filter(id=>LSEL.h[id]);
  if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:b.k,wave:w,load:true});}
  save.away=save.away||{};
  for(const id of pick){if(save.heroes[id])continue;const src=save.away[id]||(save.downed&&save.downed[id]);
    save.heroes[id]=src?{lv:src.lv,xp:src.xp||0}:{lv:JOIN_LV[id]||1,xp:0};delete save.away[id];if(save.downed)delete save.downed[id];save.fallen=save.fallen.filter(x=>x!==id);}
  for(const id of Object.keys(save.heroes))if(!pick.includes(id))stashHero(id);
  save.active=pick.slice(0,MAX_ACTIVE);if(b.k==='3')save.route='highway';if(b.k==='3f')save.route='backroad';
  LOADSEL=pick;SX=0;camX=0;delete save.ckpt;persist();
  if(b.k==='1')newRun(w);else if(b.k==='2')startStage2();
  else if(b.k==='3'){startStage3();if(w==='end'){R.wave=3;startTownEnd();}else if(w>1)startWave3(w);}
  else if(b.k==='4b'){cfbStart(w);}
  else if(b.k==='4a'){cfaStart(w);}
  else if(b.k==='6'){s6Start(w,1);}
  else if(b.k==='5'){save.route=LSEL.route||save.route||'highway';persist();s5Start(w);}
  else{startForest();if(w==='end'){R.wave=4;startForestEnd();}else if(w>1)startWaveF(w);}
  for(const id of pick)if(!save.heroes[id]&&save.away[id]){save.heroes[id]=save.away[id];delete save.away[id];}
  save.active=pick.filter(id=>save.heroes[id]).slice(0,MAX_ACTIVE);for(const id of['cmd',...save.active])setHp(id,maxHp(id));
  LOADSEL=null;persist();}

/* ---------- STAGE 3A ENDING: the endless swarm, Blaze, the flamethrower mini-game ---------- */
const TEF='xa7';
const glowF=(c,tt,u,v,r,a,rgb)=>c.glow(u,v,r,a*(.75+.25*Math.sin(tt*23)*Math.sin(tt*9.7)),rgb||'255,170,80');
const muz=(c,tt,pts)=>{for(const[u,v,ph]of pts){if(((tt+ph)%.42)<.08)c.glow(u,v,.06,.9,'255,220,140');}};
const TE={
 t1:{bg:'te_t1',fb:TEF,d:6,vo:"The horde fell. Then the alleys started moving.",cam:p=>({cx:.5,cy:lerp(.56,.48,ease(p)),z:lerp(1.02,1.14,ease(p))}),snd:()=>{SND.groan(-.5,.5);setTimeout(()=>SND.groan(.5,.5),900);},
  fx(c,tt){c.embers(tt);glowF(c,tt,.44,.16,.03,.5);glowF(c,tt,.47,.43,.03,.4);}},
 t2:{bg:'te_t2a',fb:TEF,d:5.5,vo:"Commander: \"They just keep coming!\"",cam:p=>({cx:.5,cy:.5,z:lerp(1.12,1.02,ease(p))}),snd:()=>{[.3,.7,1.1,1.6,2.1,2.6,3.2].forEach((t,i)=>setTimeout(()=>SND.shot(i%2?'shotgun':'rifle',i%2?-.4:.4),t*1000));},
  fx(c,tt){c.embers(tt);if((tt%.42)<.06)c.shake=2;}},
 t3:{bg:'te_t3',fb:TEF,d:6,vo:"Commander: \"Everyone, to Cyber Future! Go! You'll be safe there!\"",cam:p=>({cx:lerp(.42,.55,ease(p)),cy:.5,z:lerp(1.12,1.04,ease(p))}),
  fx(c,tt){c.glow(.63,.29,.06,.4+.1*Math.sin(tt*3),'190,245,60');c.glow(.86,.29,.06,.4+.1*Math.sin(tt*3+1),'190,245,60');c.embers(tt);}},
 t4:{bg:'te_t4',fb:TEF,d:5.5,vo:"Cyber Future. Walls, guns, and steel gates. Eight blocks away.",cam:p=>({cx:.5,cy:lerp(.55,.42,ease(p)),z:lerp(1.02,1.16,ease(p))}),
  fx(c,tt){for(const[u,v,ph]of[[.35,.3,0],[.67,.3,1.3],[.42,.43,2],[.61,.43,.7]])c.glow(u,v,.05,.35+.25*Math.sin(tt*1.6+ph),'190,245,60');c.glow(.5,.3,.12,.15+.05*Math.sin(tt*2),'190,245,60');}},
 t5:{bg:'te_t5a',fb:TEF,d:5.5,vo:"They ran. The swarm kept pace, block after block.",cam:p=>({cx:.5,cy:lerp(.46,.54,ease(p)),z:lerp(1.16,1.04,ease(p))}),snd:()=>{[.4,1.2,2,2.8,3.6].forEach((t,i)=>setTimeout(()=>SND.shot(i%2?'shotgun':'rifle',0),t*1000));SND.groan(0,.6);},
  fx(c,tt){c.shake=1.2;if((tt%.5)<.06)c.shake=3;}},
 t6:{bg:'te_t6',fb:TEF,d:5.5,vo:"Commander: \"We can't lead them to the gates. We'll have to pull them away from—\"",cam:p=>({cx:lerp(.42,.36,ease(p)),cy:.45,z:lerp(1.04,1.18,ease(p))}),snd:()=>SND.groan(.6,.4),
  fx(c,tt){c.embers(tt);}},
 t7:{bg:'te_t7',fb:TEF,d:5.5,vo:"???: \"Care for a light?\"",cam:p=>({cx:.5,cy:lerp(.62,.4,ease(p)),z:lerp(1.18,1.04,ease(p))}),snd:()=>{setTimeout(()=>SND.whoosh(),2600);},
  fx(c,tt){glowF(c,tt,.84,.73,.05,.9,'255,180,80');if(tt>2.6&&tt<3.1)c.shake=2;}},
 t8:{bg:'te_t8',fb:TEF,d:4.5,vo:"Blaze: \"Get behind me, boys. Light 'em up.\"",cam:p=>({cx:lerp(.4,.55,ease(p)),cy:.5,z:lerp(1.14,1.04,ease(p))}),snd:()=>{SND.explosion(.2);},
  fx(c,tt){glowF(c,tt,.66,.48,.08,.9,'255,210,120');glowF(c,tt,.85,.48,.12,.5,'255,150,60');c.embers(tt*1.4);c.shake=1.5;}},
 w1:{bg:'te_w1',fb:TEF,d:6,vo:"The street went up like a matchbook.",cam:p=>({cx:.5,cy:.5,z:lerp(1.02,1.12,ease(p))}),snd:()=>{SND.explosion(.6);SND.groan(0,.7);},
  fx(c,tt){c.pulse('rgba(255,120,40,1)',.05+.04*Math.sin(tt*7)*Math.sin(tt*3.1));glowF(c,tt,.64,.86,.04,.8,'255,190,90');c.embers(tt*1.6);}},
 w2:{bg:'te_w2a',fb:TEF,d:6,vo:"Rook: \"Remind me never to get on her bad side.\"",cam:p=>({cx:.5,cy:.48,z:lerp(1.02,1.1,ease(p))}),
  fx(c,tt){c.embers(tt);glowF(c,tt,.67,.86,.03,.7,'255,190,90');}},
 w2b:{bg:'te_w2b',fb:TEF,d:6,vo:"Commander: \"Hell of an entrance.\"",cam:p=>({cx:.48,cy:.48,z:lerp(1.02,1.1,ease(p))}),
  fx(c,tt){c.embers(tt);glowF(c,tt,.97,.82,.03,.7,'255,190,90');}},
 w3:{bg:'te_w3',fb:TEF,d:7,vo:"Bruno: \"Told you I'd find you.\" Blaze: \"You're late.\"",cam:p=>({cx:.45,cy:lerp(.5,.4,ease(p)),z:lerp(1.02,1.16,ease(p))}),
  fx(c,tt){c.embers(tt*.6);}},
 w4:{bg:'te_w4',fb:TEF,d:6,vo:"Blaze: \"Where's Bruno? He was with you... where is he?\"",cam:p=>({cx:.5,cy:.42,z:lerp(1.04,1.16,ease(p))}),
  fx(c,tt){c.embers(tt*.5);}},
 w5:{bg:'te_w5',fb:TEF,d:7,vo:"She'd saved them all. Everyone except the one she'd been waiting for.",cam:p=>({cx:.5,cy:.5,z:lerp(1.18,1.02,ease(p))}),
  fx(c,tt){c.embers(tt*.4);c.dim(Math.min(.25,tt*.04));}},
 l1:{bg:'te_l1',fb:TEF,d:5,vo:"The igniter sputtered. The horde didn't wait.",cam:p=>({cx:.45,cy:.45,z:lerp(1.04,1.2,ease(p))}),snd:()=>{SND.click();setTimeout(()=>SND.click(),300);setTimeout(()=>SND.groan(0,.9),800);},
  fx(c,tt){if(tt<1.4&&(tt%.35)<.1)c.glow(.1,.2,.04,.9,'255,220,140');if(tt>1)c.shake=2;c.dim(Math.max(0,(tt-3.6)*.6));}},
 l2:{bg:'te_l2',fb:TEF,d:4.5,vo:"Bruno: \"BLAZE!\"",cam:p=>({cx:.5,cy:.45,z:lerp(1.16,1.04,ease(p))}),snd:()=>{[.2,1,1.8,2.6,3.4].forEach(t=>setTimeout(()=>SND.shot('shotgun',.3),t*1000));},
  fx(c,tt){muz(c,tt*.95,[[.93,.37,0]]);if((tt%.84)<.12)c.shake=4;}},
 l3:{bg:'te_l3',fb:TEF,d:6,vo:"He reached her. Neither of them came back.",cam:p=>({cx:.5,cy:lerp(.4,.55,ease(p)),z:lerp(1.12,1.0,ease(p))}),snd:()=>{setTimeout(()=>SND.shot('shotgun',0),1500);},
  fx(c,tt){const a=tt>1.5&&tt<1.75?1:0;c.glow(.5,.06,.1,.9*a,'255,220,140');if(a)c.shake=4;c.dim(Math.max(0,(tt-4)*.4));}},
 l4:{bg:'te_l4a',fb:TEF,d:6,vo:"The survivors made it inside. Not all of the squad did.",cam:p=>({cx:.5,cy:.5,z:lerp(1.16,1.04,ease(p))}),snd:()=>{SND.groan(0,.6);setTimeout(()=>SND.explosion(.5),4200);},
  fx(c,tt){if(tt>4.2&&tt<4.6)c.shake=6;}},
 l4b:{bg:'te_l4b',fb:TEF,d:6,vo:"The survivors made it inside. Not all of the squad did.",cam:p=>({cx:.5,cy:.5,z:lerp(1.16,1.04,ease(p))}),snd:()=>{SND.groan(0,.6);setTimeout(()=>SND.explosion(.5),4200);},
  fx(c,tt){c.glow(.31,.15,.05,.5,'190,245,60');c.glow(.69,.15,.05,.5,'190,245,60');if(tt>4.2&&tt<4.6)c.shake=6;}},
 e1:{bg:'te_e1',fb:TEF,d:7,vo:"Cyber Future. Solid walls. Armed guards. Nothing was getting through.",cam:p=>({cx:.5,cy:lerp(.62,.42,ease(p)),z:lerp(1.14,1.02,ease(p))}),snd:()=>{SND.explosion(.6);SND.groan(0,.5);},
  fx(c,tt){if(tt<.4)c.shake=6;c.glow(.25,.06,.06,.5+.1*Math.sin(tt*2),'190,245,60');c.glow(.75,.06,.06,.5+.1*Math.sin(tt*2+1),'190,245,60');}},
 e2:{bg:'te_e2',fb:TEF,d:5,vo:"Nothing.",cam:p=>({cx:.5,cy:.48,z:lerp(1.02,1.12,ease(p))}),snd:()=>{setTimeout(()=>SND.explosion(.35),3200);},
  fx(c,tt){const on=(tt%1.3)<.9;c.glow(.5,.08,.09,on?.8:.15,'255,60,40');c.dim(on?0:.25);if(tt>3.2&&tt<3.5)c.shake=7;if(tt>4.3)c.dim((tt-4.3)*1.4);}},
};
const TE_KEYS=Object.values(TE).map(s=>s.bg).concat(['te_t2b','te_t2c','te_t2d','te_t5b','te_t5c','te_t5d',TEF]);
const teV=(s,crew)=>{const v=crew.bruno&&crew.rook?'a':crew.bruno?'b':crew.rook?'c':'d';return Object.assign({},s,{bg:s.bg.slice(0,-1)+v});};
function teOpen(crew){return[TE.t1,teV(TE.t2,crew),TE.t3,TE.t4,teV(TE.t5,crew),TE.t6,TE.t7];}
function teEnd(won,crew){const T=TE,out=won?[T.w1].concat(crew.bruno?[crew.rook?T.w2:T.w2b,T.w3]:[T.w4,T.w5]):[T.l1].concat(crew.bruno?[T.l2,T.l3]:[]).concat([crew.rook?T.l4:T.l4b]);return out.concat([T.e1,T.e2]);}
function teCrew(){const c={bruno:save.active.includes('bruno')&&!!save.heroes.bruno,rook:save.active.includes('rook')&&!!save.heroes.rook};if(CREW_VIEW){c.bruno=CREW_VIEW.bruno;c.rook=CREW_VIEW.rook;}return c;}
/* the real thing: opening -> igniter -> T8 -> sweep -> ending */
function startTownEnd(){markReach('3','end');save.ckpt={stage:3,wave:'end'};persist();blzLoad();const crew=teCrew(),L=teOpen(crew),t0=performance.now();cineLoad(L);setTimeout(()=>cineLoad([TE.t8].concat(teEnd(true,crew),teEnd(false,crew))),3000);
  const go=()=>{const ok=L.slice(0,2).every(s=>CI[s.bg]&&CI[s.bg].complete&&CI[s.bg].naturalWidth);if(ok||performance.now()-t0>6000)startIntro(()=>blazeStart(crew),L);else setTimeout(go,100);};go();}
function townEndFinish(won,crew){
  if(won){save.blaze='joined';story('minigame',{id:'blaze_burn',won:true});}
  else{save.blaze='lost';story('minigame',{id:'blaze_burn',won:false});
    if(crew.bruno&&save.heroes.bruno){
      save.blazeBruno=1;story(HORDE()?'hero_died':'hero_down',{hero:'bruno',how:'overrun_with_blaze'});delete save.heroes.bruno;save.active=save.active.filter(h=>h!=='bruno');if(!save.fallen.includes('bruno'))save.fallen.push('bruno');}}
  persist();
  startIntro(()=>{delete save.ckpt;persist();R.blz=null;state='win3';ui();},teEnd(won,crew));}
/* gallery: cutscenes only, the mini-game is replaced by its result */
function townEndGallery(won,back){const crew=teCrew();cineLoadKeys(TE_KEYS);const t0=performance.now(),go=()=>{const i=CI.te_t1;if((i&&i.complete&&i.naturalWidth)||performance.now()-t0>6000)go2();else setTimeout(go,100);},go2=()=>startIntro(back,teOpen(crew).concat(won?[TE.t8]:[]).concat(teEnd(won,crew)));go();}

/* the mini-game, played on the town street in first person */

/* ---------- STAGE 3B ENDING: Cyber Future burning, Hex's teleport ---------- */
const FE={
 g1:{bg:'fe_g1',d:6,vo:"Momma fell. Beyond the last of the pines stood Cyber Future.",cam:p=>({cx:.55,cy:lerp(.55,.45,ease(p)),z:lerp(1.02,1.14,ease(p))}),
  fx(c,tt){c.embers(tt);glowF(c,tt,.62,.4,.12,.25,'255,140,60');}},
 g2:{bg:'fe_g2',d:6,vo:"The dead had found it first. They clawed at the walls. The walls held.",cam:p=>({cx:lerp(.4,.6,ease(p)),cy:.55,z:1.12}),snd:()=>{SND.groan(-.4,.6);setTimeout(()=>SND.groan(.4,.5),1400);},
  fx(c,tt){c.embers(tt);if((tt%1.1)<.08)c.shake=1.5;}},
 g3:{bg:'fe_g3',d:6,vo:"But the fire wasn't outside. It was coming from within.",cam:p=>({cx:.6,cy:lerp(.62,.4,ease(p)),z:lerp(1.04,1.16,ease(p))}),snd:()=>{setTimeout(()=>SND.explosion(.35),2500);},
  fx(c,tt){glowF(c,tt,.6,.4,.16,.45,'255,140,50');c.embers(tt*1.4);if(tt>2.5&&tt<2.9)c.shake=4;}},
 g4:{bg:'fe_g4',d:5,vo:"The marksmen at the gates were gone. Whatever was happening inside had pulled them in.",cam:p=>({cx:.5,cy:.5,z:lerp(1.14,1.04,ease(p))}),snd:()=>SND.buzz(),
  fx(c,tt){c.embers(tt*.6);}},
 g5:{bg:'fe_g5',d:6,vo:"Screams from inside the walls. Then roars. More than one.",cam:p=>({cx:.5,cy:.45,z:lerp(1.02,1.14,ease(p))}),snd:()=>{SND.groan(0,.9);setTimeout(()=>SND.thunder(),2600);setTimeout(()=>SND.groan(.5,1),3400);},
  fx(c,tt){glowF(c,tt,.5,.45,.2,.25,'255,150,60');if(tt>2.6&&tt<3.3)c.shake=5;}},
 g6:{bg:'fe_g6',d:6,vo:"Commander: \"Wait! Stay with us! Don't—\"",cam:p=>({cx:lerp(.45,.55,ease(p)),cy:.5,z:lerp(1.12,1.04,ease(p))}),
  fx(c,tt){c.embers(tt);}},
 g7:{bg:'fe_g7',d:5,vo:"The screams drew the horde. Half of it peeled away after them.",cam:p=>({cx:lerp(.6,.4,ease(p)),cy:.55,z:1.1}),snd:()=>SND.groan(.3,.8),
  fx(c,tt){c.shake=1;c.embers(tt);}},
 g8:{bg:'fe_g8a',d:5,vo:"The rest of them turned toward the squad.",cam:p=>({cx:.5,cy:lerp(.42,.5,ease(p)),z:lerp(1.16,1.04,ease(p))}),snd:()=>{SND.groan(-.3,.7);[1.6,2.2,2.9,3.5].forEach((t,i)=>setTimeout(()=>SND.shot(i%2?'pistol':'rifle',i%2?-.3:.3),t*1000));},
  fx(c,tt){c.embers(tt*.7);}},
 h1:{bg:'fe_h1',d:6,vo:"Commander: \"Hex! Get us inside!\" Hex: \"Give me a minute... Momma took everything I had.\"",cam:p=>({cx:.55,cy:lerp(.48,.42,ease(p)),z:lerp(1.04,1.16,ease(p))}),snd:()=>SND.groan(-.6,.6),
  fx(c,tt){const on=(tt%1.4)<.5;c.glow(.3,.93,.06,on?.7:.15,'220,90,255');}},
 h2:{bg:'fe_h2',bg2:'fe_h3',mix:()=>cine&&cine.mg?cine.mg.fill:1,d:4.2,choiceAt:.8,
  mini:{label:'CHARGE THE SPELL!',time:10,taps:32,decay:.03,shouts:1,branch:feBranch},
  vo:"Hex reached for whatever power she had left.",cam:p=>({cx:.5,cy:.41,z:1}),snd:()=>SND.hiss(),
  fx(c,tt){const f=cine&&cine.mg?cine.mg.fill:1;c.glow(.5,.88,.25,.15+.5*f,'220,90,255');c.glow(.27,.33,.04,.3+.6*f,'240,150,255');c.glow(.73,.33,.04,.3+.6*f,'240,150,255');if(f>.6)c.shake=f*2;}},
 w1:{bg:'fe_w1a',d:4,vo:"Hex: \"Hold on to something.\"",cam:p=>({cx:.5,cy:.48,z:lerp(1.04,1.18,ease(p))}),snd:()=>{SND.whoosh();setTimeout(()=>SND.explosion(.4),2600);},
  fx(c,tt){c.glow(.5,.5,.35,.3+.2*Math.sin(tt*9),'230,120,255');if(tt>2.6){c.flash(Math.min(1,(tt-2.6)*1.6));}c.shake=1.5;}},
 w1n:{bg:'fe_w1c',d:4,vo:"The runes flared. The world went white.",cam:p=>({cx:.5,cy:.48,z:lerp(1.04,1.18,ease(p))}),snd:()=>{SND.whoosh();setTimeout(()=>SND.explosion(.4),2600);},
  fx(c,tt){c.glow(.5,.5,.35,.3+.2*Math.sin(tt*9),'230,120,255');if(tt>2.6){c.flash(Math.min(1,(tt-2.6)*1.6));}c.shake=1.5;}},
 w2:{bg:'fe_w2a',d:7,vo:"They landed inside the walls. Inside, it was worse.",cam:p=>({cx:.5,cy:lerp(.55,.42,ease(p)),z:lerp(1.02,1.14,ease(p))}),snd:()=>{SND.thunder();setTimeout(()=>SND.groan(0,1),1800);},
  fx(c,tt){if(tt<.5)c.flash(1-tt*2);glowF(c,tt,.55,.3,.18,.35,'255,140,50');c.embers(tt*1.3);c.glow(.5,.95,.2,.3*Math.max(0,1-tt/3),'230,120,255');if(tt>1.8&&tt<2.4)c.shake=3;}},
 l1:{bg:'fe_l1',d:5,vo:"The runes flickered. Then went out.",cam:p=>({cx:.5,cy:.5,z:lerp(1.04,1.2,ease(p))}),snd:()=>{SND.hiss();setTimeout(()=>SND.groan(0,1),700);},
  fx(c,tt){c.glow(.5,.75,.3,Math.max(0,.6-tt*.2),'220,90,255');if(tt>1)c.shake=2;c.dim(Math.max(0,(tt-3.8)*.7));}},
 l2:{bg:'fe_l2a',d:6,vo:"So close to the gates. Not close enough.",cam:p=>({cx:.5,cy:.5,z:lerp(1.14,1.0,ease(p))}),snd:()=>{SND.groan(0,1);[.3,.9,1.6].forEach(t=>setTimeout(()=>SND.shot('pistol',0),t*1000));setTimeout(()=>SND.gameOver(),3800);},
  fx(c,tt){c.glow(.15,.25,.05,.6,'220,90,255');c.shake=tt<2?2:0;c.dim(Math.max(0,(tt-3.6)*.4));}},
 n1:{bg:'fe_n1c',d:6,vo:"Commander: \"No way in. We're out of road.\"",cam:p=>({cx:.45,cy:.5,z:lerp(1.14,1.04,ease(p))}),snd:()=>{SND.groan(-.5,.8);[.6,1.3,2,2.8].forEach((t,i)=>setTimeout(()=>SND.shot(i%2?'pistol':'rifle',0),t*1000));},
  fx(c,tt){c.embers(tt*.6);if((tt%.7)<.07)c.shake=2;}},
 n2:{bg:'fe_n2',d:6,vo:"In the shadows of the pines, someone was watching. She knew those faces.",cam:p=>({cx:lerp(.4,.35,ease(p)),cy:.42,z:lerp(1.04,1.18,ease(p))}),
  fx(c,tt){c.glow(.27,.27,.05,.4+.2*Math.sin(tt*2),'230,140,255');c.glow(.35,.26,.05,.4+.2*Math.sin(tt*2+.5),'230,140,255');c.glow(.18,.68,.05,.3+.2*Math.sin(tt*3),'220,90,255');}},
 n3:{bg:'fe_n3c',d:6,vo:"Hex (whispering): \"...I owe you that much.\"",cam:p=>({cx:.5,cy:.55,z:lerp(1.02,1.12,ease(p))}),snd:()=>SND.hiss(),
  fx(c,tt){c.glow(.5,.78,.3,.35+.15*Math.sin(tt*6),'220,90,255');c.glow(.12,.18,.05,.5+.3*Math.sin(tt*4),'230,140,255');}},
 n4:{bg:'fe_n4',d:5,vo:"When the light faded, so had she.",cam:p=>({cx:lerp(.4,.32,ease(p)),cy:.45,z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){const a=Math.max(0,1-tt/4);c.glow(.26,.26,.035,.8*a,'230,140,255');c.glow(.28,.26,.035,.8*a,'230,140,255');c.dim(Math.max(0,(tt-3.5)*.5));}},
};
const FE_KEYS=['g1','g2','g3','g4','g5','g6','g7','g8a','g8b','g8c','g8d','h1','h2','h3','w1a','w1b','w1c','w1d','w2a','w2b','w2c','w2d','l1','l2a','l2b','n1c','n1d','n2','n3c','n3d','n4'].map(k=>'fe_'+k);
let FECREW=null;
const feV=(s,v)=>Object.assign({},s,{bg:s.bg.slice(0,-1)+v});
function feCrew(){return{rook:save.active.includes('rook')&&!!save.heroes.rook,hex:save.active.includes('hex')&&!!save.heroes.hex};}
const feL=c=>c.hex?(c.rook?'a':'b'):(c.rook?'c':'d');
function feOpen(c){return[FE.g1,FE.g2,FE.g3,FE.g4,FE.g5,FE.g6,FE.g7,feV(FE.g8,feL(c))];}
function feList(c){const v=feL(c);return feOpen(c).concat(c.hex?[FE.h1,FE.h2]:[feV(FE.n1,v),FE.n2,feV(FE.n3,v),feV(FE.w1n,v),FE.n4,feV(FE.w2,v)]);}
function feBranch(won){const v=feL(FECREW);return won?[feV(FE.w1,v),feV(FE.w2,v)]:[FE.l1,feV(FE.l2,v)];}
function feLoad(c){cineLoad(feOpen(c).slice(0,2));setTimeout(()=>cineLoadKeys(FE_KEYS.filter(k=>!/[abcd]$/.test(k)||k.endsWith(feL(c)))),2500);}
function startForestEnd(){markReach('3f','end');save.ckpt={stage:'3f',wave:'end',hex:!!save.heroes.hex};persist();const c=FECREW=feCrew(),L=feList(c),t0=performance.now();feLoad(c);
  const go=()=>{const ok=L.slice(0,2).every(s=>CI[s.bg]&&CI[s.bg].complete&&CI[s.bg].naturalWidth);if(ok||performance.now()-t0>6000)startIntro(forestEndDone,L);else setTimeout(go,100);};go();}
function forestEndDone(){const res=cineLastMini;cineLastMini=null;cine0pick=null;const c=FECREW;
  if(c.hex&&res!=='won'){story('minigame',{id:'hex_teleport',won:false});R.over=true;R.hexFail=1;legacyEnd('overrun_at_cyber_future');persist();state='over';ui();return;}
  if(c.hex)story('minigame',{id:'hex_teleport',won:true});else{save.hexShadow=1;story('hex_from_shadows',{});}
  save.cleared=Math.max(save.cleared||0,3);save.forestDone=1;legacyStage(3);story('stage_clear_forest',{hex:!!save.heroes.hex});legacyEnd('cleared_stage_3');save.gold+=600;delete save.ckpt;persist();state='win3f';ui();}
function forestEndGallery(k,back){const c={hex:!/n/.test(k),rook:!/r/.test(k.slice(2))},won=!/l/.test(k);FECREW=c;feLoad(c);cineLoadKeys(FE_KEYS);
  let L=feList(c);if(c.hex){L=L.slice(0,-1).concat([Object.assign({},FE.h2,{choiceAt:null,mini:null,mix:()=>won?1:.35})]).concat(feBranch(won));}
  const t0=performance.now(),go=()=>{const i=CI.fe_g1;if((i&&i.complete&&i.naturalWidth)||performance.now()-t0>6000)startIntro(back,L);else setTimeout(go,100);};go();}


/* =====================================================================
   STAGE 4B · CYBER FUTURE (forest route)
   Wave 1: the courtyard horde (pseudo-3D, reuses the town engine)
   Then a side-scrolling climb through the tower: floors 1-3.
   A clock runs from the start of wave 1: Bruno and Blaze are pinned on floor 3.
   ===================================================================== */
const CF_TIME=()=>HORDE()?400:330;          // seconds on the clock
const CF_ORDER=[1,'f1','f2','f3'];
const fmtClock=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
function cfbStart(at,clock){
  at=at||1;stageRevive();storyParty(['rook','hex','volt']);townUse('yard');
  for(const id of['cmd',...Object.keys(save.heroes)])if(at===1)setHp(id,maxHp(id));
  roadScroll=0;SX=0;camX=0;
  R={stage:3,cfb:1,wave:1,wall:0,wallMax:1,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,vx:0,prevSX:SX,dead:[],civ:[],civLost:0,civHide:1,
    queue:[],kills:0,spawnLeft:0,spawnTotal:0,spawnT:2,bossPending:false,crateAt:[],jeepAt:-1,proj:[],sayQ:[]};
  R.clock0=CF_TIME();R.clock=clock!=null?clock:R.clock0;R.cfbAt=at;R.cfbClock=R.clock;
  if(at===1)cfbYard();else sideStart(+String(at).slice(1));}
function cfbCkpt(at){if(R.s5)return;if(R.cfa){cfaCkpt(at);return;}markReach('4b',at);save.ckpt={stage:'4b',wave:at,clock:R.clock};R.cfbAt=at;R.cfbClock=R.clock;persist();}
function cfbYard(){
  const H2=HORDE()?2:1,q=[];for(let i=0;i<70*H2;i++)q.push('grunt');for(let i=0;i<20*H2;i++)q.push('runner');for(let i=0;i<10*H2;i++)q.push('armored');
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}
  q.splice(Math.floor(q.length*.3),0,'brute');
  R.queue=q;R.kills=0;R.spawnLeft=q.length;R.spawnTotal=q.length;R.spawnT=3;
  R.banner={txt:'STAGE 4: CYBER FUTURE · THE COURTYARD',t:2.6,col:'#ffc53d'};SND.alarm();
  R.sayQ=[{who:'bruno',txt:"Commander! It's Bruno! Can anyone hear me?",t:3.4},{who:'bruno',txt:"Me and Blaze are pinned on the third floor!",t:3.4},
    {who:'blaze',txt:"We're running low on everything. Hurry!",t:3.4},{who:'cmd',txt:"Hold on. We're coming to you.",t:3}];
  cfbCkpt(1);state='play';ui();}
function cfbTick(dt){if(R.s5){s5Tick(dt);return;}if(R.cfa){cfaTick(dt);return;}
  if(R.clock>0&&!R.clockStop){R.clock-=dt;if(R.clock<=0){R.clock=0;cfbTimeUp();}}
  if(R.say&&!R.side){R.say.t-=dt;if(R.say.t<=0)R.say=null;}
  if(!R.say&&R.sayQ&&R.sayQ.length)R.say=R.sayQ.shift();
  if(R.side)return;
  if(R.toSide>0){R.toSide-=dt;if(R.toSide<=0){R.sayQ.push({who:'cmd',txt:"Elevators are dead. We take the stairs.",t:3});sideStart(1);return;}}
  // the brute walks with the horde; as it closes in two more break out
  if(!R.b1){const b=R.en.find(e=>e.type==='brute');if(b){R.b1=b;R.b1T=0;R.banner={txt:'A BRUTE BROKE OUT!',t:2.4,col:'#ff4d5e'};}}
  else if(!R.b2){R.b1T+=dt;if(R.b1.z<900||R.b1.dead||R.b1T>14){R.b2=1;R.queue.unshift('brute','brute');R.spawnLeft+=2;R.spawnTotal+=2;R.spawnT=Math.min(R.spawnT,.6);
    R.banner={txt:'TWO MORE ARE COMING',t:2.4,col:'#ff4d5e'};SND.groan(0,1);}}}
function cfbTimeUp(){if(R.cfLost)return;R.cfLost=1;save.bbLost=1;story('bruno_blaze_lost',{});
  R.sayQ=[{who:'blaze',txt:"They're through the barricade! Bruno!",t:3},{who:'bruno',txt:"Blaze, get behind m—",t:2.6}];R.say=null;
  R.banner={txt:'THE BARRICADE FELL',t:3,col:'#ff4d5e'};SND.heroDown();
  if(R.side&&R.side.floor===3)sideBarricadeFalls();persist();}
function spawnPaceCF(){const p=1-R.spawnLeft/R.spawnTotal;return lerp(.75,.32,Math.min(1,p*1.6))*(.7+Math.random()*.6);}
function cfbYardDone(){if(R.yardDone)return;R.yardDone=1;SND.waveClear();save.gold+=600;persist();
  R.banner={txt:'THE COURTYARD IS CLEAR',t:2.4,col:'#b6f23a'};
  R.toSide=2.2;}

/* ---------------- SIDE SCROLLER ---------------- */
const GY=306,SPD_SIDE=175;
const SIDE_W={cmd:{rate:.14,mul:.55,col:'#ffd27a',spd:950,vsB:1.15},rook:{rate:.22,mul:.75,col:'#ff8a3d',spd:900,vsB:.8},hex:{rate:.45,mul:1,col:'#d68bff',spd:520,orb:1,vsB:1.5},volt:{rate:.5,mul:1,col:'#9fd0ff',chain:1,vsB:2.2}};
const FLOORS={1:{len:2700,start:120,dir:1,n:25},2:{len:2700,start:2580,dir:-1,n:25},3:{len:2700,start:120,dir:1,n:30}};
/* doors in the wall art repeat every WALL_P; props that are doors sit exactly over one */
let WALL_S=(306+6)/625,WALL_P=2172*WALL_S,WALL_D=[540*WALL_S,1630*WALL_S],WALLIMG=null;
/* 4A walls: base of the wall at y=550 of the source, doors at x=306 and 1880 */
function wallUse(k){WALLIMG=k?(k==='h'?FAWH:FAWC):null;WALL_S=k?(GY+6)/550:(GY+6)/625;WALL_P=2172*WALL_S;WALL_D=(k?[306,1880]:[540,1630]).map(v=>v*WALL_S);}
function snapDoor(x){let best=x,bd=1e9;for(let n=Math.floor(x/WALL_P)-1;n<=Math.floor(x/WALL_P)+1;n++)for(const d of WALL_D){const c=n*WALL_P+d;if(Math.abs(c-x)<bd){bd=Math.abs(c-x);best=c;}}return Math.round(best);}
const MZ={cmd:[76,46],rook:[74,40],hex:[77,52],volt:[80,50],blaze:[52,44],bruno:[56,50]};
function sideMembers(){if(R&&R.s5)return s5Members();if(R&&R.cfa)return['cmd',...CFA_SQUAD.filter(id=>save.heroes[id])];return['cmd',...save.active].filter(id=>id==='cmd'||save.heroes[id]);}
function sideStart(f){sideLoad();wallUse(R.cfa?(f===4?'h':'c'):null);const F=(R.s5?FLOORS_5:R.cfa?FLOORS_A:FLOORS)[f],H=HORDE()?1.5:1;R.en=[];R.bu=[];R.pa=[];R.proj=[];R.banner=null;
  const S=R.side={on:1,floor:f,len:F.len,x:F.start,face:F.dir,cam:0,active:R.sideActive||'cmd',en:[],bu:[],fx:[],zaps:[],mv:0,shoot:false,shT:0,melT:0,melA:0,anT:0,
    trig:[],door:null,npc:null,brute:null,t:0,hint:4,exitT:-1,ptr:{}};
  if(!sideMembers().includes(S.active))S.active=sideMembers()[0]||'cmd';
  if(R.s5){S.sci=[];s5Floor(S,f,F,H);}else if(R.cfa)cfaFloor(S,f,F,H);else{
  S.exitX=f===1?snapDoor(F.len-260):f===2?snapDoor(260):null;S.elevX=f===1?snapDoor(300):f===2?snapDoor(F.len-260):null;
  const n=Math.round(F.n*H);
  if(f===1){for(let i=0;i<n;i++)S.trig.push({x:420+i*(F.len-700)/n+Math.random()*60,side:1,type:'grunt'});}
  if(f===2){for(let i=0;i<n;i++)S.trig.push({x:F.start-260-i*(F.len-600)/n-Math.random()*60,side:i%3===2?1:-1,type:'grunt'});
    const hasV=!!save.heroes.volt;S.door={x:snapDoor(F.start-(F.start-120)*.75),debris:!hasV,locked:!hasV,open:hasV,argT:2};}
  if(f===3){S.bar={x:F.len-460};S.npc={bT:1,flT:0,lineT:3,li:0};
    for(let i=0;i<Math.round(20*H);i++)sideEnemy('grunt',S.bar.x-34-i*7-Math.random()*22,{bar:1});
    for(let i=0;i<Math.round(10*H);i++)sideEnemy('grunt',700+i*(S.bar.x-1100)/(10*H)+Math.random()*50,{toBar:1});
    S.doors=[snapDoor(1400),snapDoor(1900)];if(R.cfLost)sideBarricadeFalls();}
  R.banner={txt:'FLOOR '+f+(f===1?' · FIND THE STAIRS':f===2?' · HEAD LEFT':' · REACH BRUNO AND BLAZE'),t:2.6,col:'#ffc53d'};
}
  cfbCkpt('f'+f);state='side';ui();last=performance.now();}
function sideEnemy(type,x,o){const S=R.side,big=type==='brute';
  const e=Object.assign({type,x,hp:big?(HORDE()?6000:5000):185,max:big?(HORDE()?6000:5000):185,spd:big?38:42+Math.random()*16,hd:big?30:7,atkT:0,stun:0,dead:0,dt:0,wob:Math.random()*6,face:-1,w:big?44:22},o||{});
  if(type==='grunt'&&Math.random()<.18){e.type='runner';e.hp=e.max=65;e.spd=105;e.hd=3;}
  if(e.type==='grunt'){const q=Math.random();e.skin=q<.4?'grunt':q<.72?'sci':'sol';}
  S.en.push(e);return e;}
function sideBarricadeFalls(){const S=R.side;if(!S||S.floor!==3||!S.npc)return;S.npc=null;S.barDown=1;for(const e of S.en)if(e.bar){e.bar=0;e.aggro=1;}}
function sideHero(){return R.side.active;}
function sideFall(id){const S=R.side;if(R.s5){s5Fall(id);return;}
  if(id==='cmd'){R.over=true;gameOver();return;}
  if(!HORDE()){save.downed=save.downed||{};save.downed[id]={lv:save.heroes[id].lv,xp:save.heroes[id].xp};}
  story(HORDE()?'hero_died':'hero_down',{hero:id,level:save.heroes[id].lv,where:'cyber_future'});
  delete save.heroes[id];save.active=save.active.filter(h=>h!==id);if(!save.fallen.includes(id))save.fallen.push(id);
  SND.heroDown();R.banner={txt:HEROES[id].name.toUpperCase()+(HORDE()?' HAS FALLEN':' IS DOWN'),t:3,col:'#ff4d5e'};S.active='cmd';persist();}
function sideHurt(id,d){if(R.over)return;if(R.s5){SND.hurt(0);R.side.flash=.12;return;}if(HORDE())d*=1.15;const hp=getHp(id)-d;setHp(id,hp);SND.hurt(0);R.side.flash=.15;if(hp<=0)sideFall(id);}
function sideKill(e,own){e.dead=1;e.dt=0;if(SIDE_W[own])addKill(own,e.type==='runner'?'runner':e.type);save.gold+=e.type==='brute'?150:e.type==='runner'?30:10;
  const xp=e.type==='brute'?11:e.type==='runner'?3:4;for(const id of['cmd',...save.active]){const x=xp*(id===own?1:XP_SHARE);if(id==='cmd')cmdXp(x);else giveXp(id,x);}
  SND.die(e.type,0);}
function sideDmg(e,d,own,kb,melee){if(e.dead)return;
  if(e.type==='brute'){d*=melee?(own==='rook'?1.6:own==='volt'?1:.8):(SIDE_W[own]?SIDE_W[own].vsB:1);kb=0;}
  e.hp-=d;e.flash=.08;e.aggro=1;if(e.bar&&!melee&&Math.random()<.7)e.bar=0;if(e.toBar)e.toBar=0;
  if(kb){e.x+=kb*R.side.face;e.stun=Math.max(e.stun,.45);}else if(e.type!=='brute')e.stun=Math.max(e.stun,.12);
  SND.hit(0);if(e.hp<=0)sideKill(e,own);}
function sideShoot(){const S=R.side,id=S.active,W=SIDE_W[id],dmg=st(id).dmg*W.mul,mz=MZ[id]||[70,40],y=GY+2-mz[0]*SK,mx=S.x+S.face*mz[1]*SK+(S.mv?(S.rgOff||0):0);S.shT=W.rate;S.anT=.25;S.melA=0;
  if(id==='blaze'||id==='bruno'){cfaShootBB(S,id,W,dmg,mx,y);return;}
  SND.shot(SHOT_KIND[id]||'rifle',0);
  if(W.chain){let cur=null,bd=470;for(const e of S.en){if(e.dead)continue;const dx=(e.x-S.x)*S.face;if(dx>0&&dx<bd){bd=dx;cur=e;}}
    const pts=[[mx,y]];const hit=new Set();
    if(R.cfa){const sc=cfaSciNear(S.x,S.face,cur?Math.abs(cur.x-S.x):470);if(sc){cfaSciDown(sc);pts.push([sc.x,GY-60*SK]);cur=null;}}
    for(let k=0;k<3&&cur;k++){hit.add(cur);pts.push([cur.x,GY-62*SK]);sideDmg(cur,dmg,id,0);let nx=null,nd=170;for(const e of S.en){if(e.dead||hit.has(e))continue;const d=Math.abs(e.x-cur.x);if(d<nd){nd=d;nx=e;}}cur=nx;}
    if(pts.length===1)pts.push([S.x+S.face*300,y-10]);S.zaps.push({pts,t:.16});return;}
  {const reach=Math.abs(mx-S.x),pb=S.en.filter(e=>!e.dead&&(e.x-S.x)*S.face>-12&&(e.x-S.x)*S.face<reach+e.w*.5).sort((p,q)=>Math.abs(p.x-S.x)-Math.abs(q.x-S.x))[0];
    if(pb){sideDmg(pb,dmg,id,W.orb?20:6);S.fx.push({x:pb.x,y:y,vx:0,vy:0,t:.12,col:W.col});return;}}
  S.bu.push({x:mx,y:y+(id==='rook'?(S.alt=!S.alt)?-5:5:0),v:W.spd*S.face,d:dmg,own:id,col:W.col,orb:W.orb,life:.85});}
function sideMelee(){if(R&&R.s5&&s5Melee(R.side))return;const S=R.side,id=S.active,s=st(id);S.melA=.35;S.anT=.35;S.melT=id==='hex'?.8:id==='volt'?.7:.45;
  // Volt's door: Hex burns away the debris, then Rook or the Commander kicks it in
  const D=S.door;if(D&&D.key&&Math.abs(S.x-D.x)<110&&!D.open){cfaKey(S,D,id);return;}
  if(D&&Math.abs(S.x-D.x)<95&&!D.open){
    if(D.debris&&id==='hex'){D.debris=0;D.clearT=.8;SND.explosion(.4);R.shake=.3;for(let i=0;i<30;i++)S.fx.push({x:D.x+(Math.random()-.5)*80,y:GY-Math.random()*90,vx:(Math.random()-.5)*160,vy:-60-Math.random()*120,t:.8,col:Math.random()<.5?'#d68bff':'#ffb347'});return;}
    if(!D.debris&&D.locked&&(id==='rook'||id==='cmd')){D.locked=0;D.open=1;SND.explosion(.6);R.shake=.4;S.voltT=.6;return;}}
  const reach=id==='hex'?135:id==='rook'?100:80;let any=false;
  const targets=S.en.filter(e=>!e.dead&&(e.x-S.x)*S.face>-10&&(e.x-S.x)*S.face<reach+e.w).sort((a,b)=>Math.abs(a.x-S.x)-Math.abs(b.x-S.x));
  if(id==='cmd'){SND.hit(0);const e=targets[0];if(e){sideDmg(e,s.dmg*1.2,id,80,1);any=true;}}
  else if(id==='rook'){SND.slash?SND.slash(0):SND.hit(0);for(const e of targets){sideDmg(e,s.sword,id,30,1);any=true;}}
  else if(id==='hex'){SND.explosion(.25);S.fx.push({ring:1,x:S.x+S.face*60,y:GY-55,t:.35});for(const e of targets){sideDmg(e,s.dmg*1.6,id,110,1);any=true;}}
  else if(id==='blaze'){SND.hit(0);const e=targets[0];if(e){sideDmg(e,120,id,90,1);any=true;}}
  else if(id==='bruno'){SND.hit(0);R.shake=.15;for(const e of targets.slice(0,3)){sideDmg(e,170,id,150,1);any=true;}}
  else if(id==='volt'){const e=targets[0];S.zaps.push({pts:[[S.x+S.face*18,GY-60],[S.x+S.face*60,GY-70]],t:.12});if(e){if(e.type==='brute')sideDmg(e,s.dmg*4,id,0,1);else{e.hp=0;sideKill(e,id);for(let i=0;i<14;i++)S.fx.push({x:e.x,y:GY-90,vx:(Math.random()-.5)*200,vy:-40-Math.random()*140,t:.6,col:Math.random()<.5?'#9fd0ff':'#7fcf4a'});}SND.shot('zap',0);any=true;}}
  if(any)R.shake=Math.max(R.shake||0,.08);}
function voltFound(){const S=R.side;story('volt_found',{});cineLoad(VF);
  startIntro(()=>{const lvs=[save.cmd,...save.active.map(h=>save.heroes[h].lv)],lv=Math.round(lvs.reduce((a,b)=>a+b,0)/lvs.length);
    if(!save.heroes.volt){const av=save.away&&save.away.volt;save.heroes.volt=av?{lv:av.lv,xp:av.xp||0,hp:null}:{lv,xp:0,hp:null};if(av)delete save.away.volt;if(save.downed)delete save.downed.volt;save.fallen=save.fallen.filter(h=>h!=='volt');if(save.active.length<MAX_ACTIVE)save.active.push('volt');story('hero_joined',{hero:'volt'});}
    save.voltMet='joined';setHp('volt',maxHp('volt'));S.active='volt';R.banner={txt:'VOLT JOINS THE SQUAD',t:2.6,col:HEROES.volt.color};persist();state='side';ui();last=performance.now();},
   VF);}
const VF=[{bg:'vf_1',d:5,vo:"Commander: \"Volt? Is that you? What did you do to yourself?\"",cam:p=>({cx:lerp(.42,.58,ease(p)),cy:.48,z:lerp(1.04,1.16,ease(p))}),snd:()=>SND.buzz&&SND.buzz(),
  fx(c,tt){const fl=(tt*7%1)<.5;c.glow(.6,.45,.18,fl?.45:.25,'190,245,60');if((tt%1.3)<.08)c.flash(.15);}},
 {bg:'vf_2',d:5,vo:"Volt: \"Let's just say I'm a little... overcharged.\"",cam:p=>({cx:.5,cy:lerp(.4,.46,ease(p)),z:lerp(1.14,1.02,ease(p))}),snd:()=>{SND.shot('zap',0);setTimeout(()=>SND.shot('zap',0),1600);},
  fx(c,tt){c.glow(.17,.84,.12,.5+.3*Math.sin(tt*17),'200,255,90');c.glow(.85,.84,.12,.5+.3*Math.sin(tt*13+1),'200,255,90');c.glow(.47,.17,.03,.6,'200,255,90');c.glow(.53,.17,.03,.6,'200,255,90');if(tt<.3||(tt>1.6&&tt<1.8))c.shake=3;}}];
const VOLT_YELLS=['ARGH!','GET ME OUT!','HNNNGH!','ANYBODY?!','OPEN THE DOOR!'];
const NPC_LINES_SEEN=[['bruno',"FINALLY! Commander, over here!"],['blaze',"About time you showed up!"],['bruno',"Hit them from behind, we'll keep them busy!"],['blaze',"Clear them off the barricade!"],['bruno',"Took you long enough!"],['blaze',"Watch the desks, they're climbing!"]];
const NPC_LINES=[['bruno',"There's too many of them!"],['blaze',"I'm almost out of fuel!"],['bruno',"Commander, where are you?!"],['blaze',"Keep shooting, babe, they're climbing the desks!"],['bruno',"Hold the line! HOLD IT!"],['blaze',"I see them! Our people are on the floor!"]];
function sideUpdate(dt){const S=R.side;if(!S)return;t+=dt;S.t+=dt;cfbTick(dt);if(R.over)return;
  if(R.banner){R.banner.t-=dt;if(R.banner.t<=0)R.banner=null;}if(R.say){R.say.t-=dt;if(R.say.t<=0)R.say=null;}if(R.shake>0)R.shake-=dt;if(S.flash>0)S.flash-=dt;
  if(S.hint>0)S.hint-=dt;if(S.shT>0)S.shT-=dt;if(S.melT>0)S.melT-=dt;if(S.anT>0)S.anT-=dt;if(S.melA>0)S.melA-=dt;
  if(!sideMembers().includes(S.active))S.active=sideMembers()[0]||'cmd';
  // move, blocked by a zombie in the way
  let mv=S.mv||(S.keys&&((S.keys.r?1:0)-(S.keys.l?1:0)))||0;
  if(mv){S.face=mv;const block=S.en.some(e=>!e.dead&&(e.x-S.x)*mv>0&&(e.x-S.x)*mv<e.w+22);if(!block&&S.exitT<0&&!S.lock){const[lo,hi]=R.s5?s5Bounds(S):R.cfa?cfaBounds(S):[S.floor===2?S.exitX:40,S.floor===1?S.exitX:S.floor===3?S.bar.x-45:S.len-40];S.x=Math.max(lo,Math.min(hi,S.x+mv*SPD_SIDE*dt));}}
  if((S.shoot||(S.keys&&S.keys.s))&&S.shT<=0)sideShoot();
  // camera
  const tgt=S.x-WW/2+S.face*90;S.cam+=(Math.max(0,Math.min(S.len-WW,tgt))-S.cam)*Math.min(1,dt*4);
  // spawn triggers: appear at the edge of the screen
  for(const g of S.trig){if(g.done)continue;const near=(S.floor===2||S.rev)?S.x<g.x+WW*.6:S.x>g.x-WW*.6;if(near){g.done=1;const ex=g.side>0?S.cam+WW+40:S.cam-40;const z=sideEnemy(g.type,ex,{aggro:1});if(g.hp)z.hp=z.max=g.hp;if(g.skin&&z.type==='grunt')z.skin=g.skin;}}
  // floor 3: clock stops once you reach the fight
  if(S.floor===2&&S.door&&!S.vfl&&Math.abs(S.x-S.door.x)<900){S.vfl=1;cineLoad(VF);}
  if(!R.cfa&&S.floor===3&&!R.clockStop&&S.x>S.bar.x-900){R.clockStop=1;if(!R.cfLost){R.sayQ.unshift({who:'bruno',txt:"Commander! Over here!",t:2.6});}}
  // enemies
  for(const e of S.en){if(e.dead){e.dt+=dt;continue;}if(e.flash>0)e.flash-=dt;if(e.stun>0){e.stun-=dt;continue;}
    if(R.cfa&&cfaSciAI(e,S,dt))continue;
    if(R.s5&&s5ZAI(e,S,dt))continue;
    const d=S.x-e.x,ad=Math.abs(d);
    if(e.bar||e.toBar){if(ad<130||(S.floor===3&&ad<520&&Math.random()<dt*.25)){e.bar=0;e.toBar=0;e.aggro=1;}}
    if(e.bar){e.face=1;e.atkT-=dt;if(e.atkT<=0)e.atkT=1.1;continue;}
    if(e.toBar){e.face=1;if(e.x<S.bar.x-70)e.x+=e.spd*.8*dt;else{e.toBar=0;e.bar=1;}continue;}
    e.face=Math.sign(d)||1;const reach=e.w+26;
    if(ad>reach){const crowd=S.en.some(o=>o!==e&&!o.dead&&Math.sign(o.x-e.x)===e.face&&Math.abs(o.x-e.x)<20&&Math.abs(o.x-S.x)<ad);if(!crowd)e.x+=e.face*e.spd*dt;e.atkT=Math.min(e.atkT,.4);e.wind=0;}
    else{e.atkT-=dt;if(e.type==='brute'&&e.atkT<.5&&!e.wind){e.wind=1;}if(e.atkT<=0){e.atkT=e.type==='brute'?1.5:1.1;e.wind=0;sideHurt(S.active,e.hd);if(e.type==='brute'){R.shake=.3;S.x-=S.face*0;}}}}
  S.en=S.en.filter(e=>!e.dead||e.dt<1.2);
  // bullets
  for(const b of S.bu){b.x+=b.v*dt;b.life-=dt;if(R.cfa&&b.life>0&&cfaSciShot(b.x-b.v*dt,b.x))b.life=0;for(const e of S.en){if(e.dead)continue;if(Math.abs(e.x-b.x)<e.w&&b.life>0){sideDmg(e,b.d,b.own,b.orb?20:6);b.life=0;break;}}}
  S.bu=S.bu.filter(b=>b.life>0);
  for(const z of S.zaps)z.t-=dt;S.zaps=S.zaps.filter(z=>z.t>0);
  for(const p of S.fx){p.t-=dt;if(!p.ring){p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.vy=(p.vy||0)+300*dt;}}S.fx=S.fx.filter(p=>p.t>0);
  // Volt's door
  const D=S.door;if(D&&!D.open){D.argT-=dt;if(D.argT<=0&&Math.abs(S.x-D.x)<620){D.argT=3+Math.random()*1.5;D.arg=2.2;D.line=VOLT_YELLS[(D.yi=(D.yi||0)+1)%VOLT_YELLS.length];SND.groan(0,.35);SND.shot('zap',0);}if(D.arg>0)D.arg-=dt;
}
  if(D&&D.clearT>0)D.clearT-=dt;
  if(S.voltT>0){S.voltT-=dt;if(S.voltT<=0){voltFound();return;}}
  // floor 3: Bruno and Blaze, the brute
  if(R.s5){if(s5Update(S,dt))return;}
  else if(R.cfa){if(cfaUpdate(S,dt))return;}
  else if(S.floor===3){const N=S.npc;
    if(N){N.bT-=dt;if(N.bT<=0){N.bT=.95;const B_=S.brute&&!S.brute.dead&&S.brute.x>S.bar.x-1100?S.brute:null,c=B_||S.en.filter(e=>!e.dead&&e.x<S.bar.x&&e.x>S.bar.x-480).sort((a,b)=>b.x-a.x)[0];if(c){sideDmg(c,c.type==='brute'?70:70,'bruno_npc');N.muz=.1;SND.shot('shotgun',0);if(c.type==='brute')S.zaps.push({pts:[[S.bar.x+20,GY-70*SK],[c.x,GY-90*SK]],t:.06,col:'#ffe08a'});}}
    if(N&&S.brute&&!S.brute.dead&&S.brute.x>S.bar.x-1100){N.blzT=(N.blzT||0)-dt;if(N.blzT<=0){N.blzT=.6;sideDmg(S.brute,30,'blaze_npc');N.fire=true;}}
      if(N.muz>0)N.muz-=dt;N.flT-=dt;const fl=S.en.filter(e=>!e.dead&&e.x<S.bar.x&&e.x>S.bar.x-210);N.fire=fl.length>0;for(const e of fl)sideDmg(e,(e.type==='brute'?25:40)*dt,'blaze_npc');
      N.lineT-=dt;if(N.lineT<=0&&!R.say){N.lineT=5+Math.random()*3;const LS=R.clockStop?NPC_LINES_SEEN:NPC_LINES;if(R.clockStop&&!N.seen){N.seen=1;N.li=0;}const L=LS[N.li++%LS.length];R.say={who:L[0],txt:L[1],t:3};}}
    const live=S.en.filter(e=>!e.dead);
    if(!S.brute&&S.x>S.bar.x-1100&&live.length<=3){const dx=S.doors.find(x=>x>S.x+140)||Math.min(S.bar.x-120,S.x+220);S.brute=sideEnemy('brute',dx,{aggro:1,burst:dx});S.burstT=.8;if(Math.abs(S.x-dx)<120){sideHurt(S.active,20);const dir=S.x<dx?-1:1;S.x=Math.max(40,Math.min(S.bar.x-45,S.x+dir*150));S.flash=.3;}
      R.banner={txt:'BRUTE!',t:2,col:'#ff4d5e'};SND.explosion(.8);SND.groan(0,1);R.shake=.6;for(let i=0;i<26;i++)S.fx.push({x:dx+(Math.random()-.5)*60,y:GY-Math.random()*120,vx:(Math.random()-.5)*260,vy:-80-Math.random()*160,t:.9,col:'#8a94a6'});}
    if(S.burstT>0)S.burstT-=dt;
    if(S.brute&&S.brute.dead&&!live.length&&S.exitT<0){S.exitT=1.6;R.banner={txt:'FLOOR CLEAR',t:2,col:'#b6f23a'};SND.waveClear();}}
  // exits
  if(!R.cfa&&!R.s5&&S.floor!==3){const atEnd=Math.abs(S.x-S.exitX)<3;if(atEnd&&S.exitT<0){S.exitT=.9;S.entering=1;SND.whoosh();}}
  R.sideActive=S.active;
  if(S.exitT>=0){S.exitT-=dt;if(S.exitT<0){S.exitT=-1;if(R.s5)s5Exit(S);else if(R.cfa)cfaExit(S);else if(S.floor<3)sideStart(S.floor+1);else cfbFinish();}}
}
function cfbEndShots(saved){return saved?[{bg:'cfe_1',d:5,vo:"Bruno: \"Took you long enough, Commander.\"",cam:p=>({cx:.5,cy:.45,z:lerp(1.02,1.14,ease(p))}),fx(c,tt){c.embers(tt);}},
      {bg:'cfe_2',d:5,vo:"Blaze: \"Next time, we pick the meeting spot.\"",cam:p=>({cx:lerp(.45,.4,ease(p)),cy:.4,z:lerp(1.04,1.16,ease(p))}),fx(c,tt){c.embers(tt*.7);c.glow(.9,.25,.08,.3+.1*Math.sin(tt*9),'255,150,60');}}]
    :[{bg:'cfe_3',d:6.5,vo:"The barricade fell. They had held as long as anyone could.",cam:p=>({cx:lerp(.55,.5,ease(p)),cy:.5,z:lerp(1.18,1.02,ease(p))}),fx(c,tt){c.embers(tt*.5);c.glow(.05,.15,.1,.35+.1*Math.sin(tt*8),'255,140,50');c.dim(Math.max(0,(tt-5)*.4));}}];}
function cfbFinish(){const saved=!R.cfLost;story('stage_clear_cfb',{saved});R.side.on=0;
  const shots=cfbEndShots(saved);
  cineLoad(shots);
  startIntro(()=>{if(saved){for(const id of['bruno','blaze']){if(save.heroes[id])continue;const src=save.away&&save.away[id];
      const lvs=[save.cmd,...save.active.map(h=>save.heroes[h].lv)],lv=Math.round(lvs.reduce((a,b)=>a+b,0)/lvs.length);
      save.heroes[id]=src?{lv:src.lv,xp:src.xp||0,hp:null}:{lv,xp:0,hp:null};if(save.away)delete save.away[id];if(save.active.length<MAX_ACTIVE)save.active.push(id);story('hero_joined',{hero:id});setHp(id,maxHp(id));}
      save.blaze='joined';}
    else{save.blaze=save.blaze||'lost';if(save.away)delete save.away.bruno;if(!save.fallen.includes('bruno'))save.fallen.push('bruno');}
    save.cleared=Math.max(save.cleared||0,4);save.cfbDone=1;legacyStage(4);save.gold+=800;delete save.ckpt;persist();state='win4b';ui();},shots);}

/* ---------- input ---------- */
const SB={shoot:{x:()=>WW-64,y:()=>WH-62,r:40},melee:{x:()=>WW-156,y:()=>WH-46,r:30},pause:{x:()=>WW-24,y:()=>22,r:18}};
function sideXY(e){const rc=cv.getBoundingClientRect();return[(e.clientX-rc.left-ox)/scale,(e.clientY-rc.top-oy)/scale];}
function sideDown(e){const S=R.side;const[x,y]=sideXY(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}
  const hitB=b=>Math.hypot(x-b.x(),y-b.y())<b.r+10;
  if(hitB(SB.pause)){R.pst='side';state='pause';ui();return;}
  if(hitB(SB.shoot)){S.ptr[e.pointerId]='shoot';S.shoot=true;return;}
  if(hitB(SB.melee)){S.ptr[e.pointerId]='melee';if(S.melT<=0)sideMelee();return;}
  const M=sideMembers();for(let i=0;i<M.length;i++){if(x>8+i*50&&x<8+i*50+44&&y<64){if(getHp(M[i])>0){S.active=M[i];SND.click();S.shT=Math.max(S.shT,.15);}return;}}
  S.ptr[e.pointerId]={x0:x};S.hint=0;}
function sideMove(e){const S=R.side,p=S.ptr[e.pointerId];if(!p||typeof p!=='object')return;const[x]=sideXY(e),dx=x-p.x0;
  if(Math.abs(dx)>60)p.x0=x-Math.sign(dx)*60;S.mv=Math.abs(dx)>10?Math.sign(dx):0;}
function sideUp(e){const S=R.side;const p=S.ptr[e.pointerId];delete S.ptr[e.pointerId];if(p==='shoot')S.shoot=Object.values(S.ptr).includes('shoot');else if(p&&typeof p==='object')S.mv=0;}
addEventListener('keydown',e=>{if(state!=='side')return;const S=R.side;S.keys=S.keys||{};const k=e.key;
  if(k==='ArrowLeft'||k==='a')S.keys.l=1;if(k==='ArrowRight'||k==='d')S.keys.r=1;if(k==='z'||k===' ')S.keys.s=1;if(k==='x'&&S.melT<=0)sideMelee();
  const n=+k;if(n>=1&&n<=5){const M=sideMembers();if(M[n-1])S.active=M[n-1];}});
addEventListener('keyup',e=>{if(state!=='side'||!R.side.keys)return;const S=R.side,k=e.key;if(k==='ArrowLeft'||k==='a')S.keys.l=0;if(k==='ArrowRight'||k==='d')S.keys.r=0;if(k==='z'||k===' ')S.keys.s=0;});

/* ---------- drawing ---------- */
const SH=95;
const SIDEM={"cmd":{"idle":[[1154,429,70,105,29.4,35.1],[1456,429,67,104,27.7,31.6],[1226,429,65,105,27.2,29.3],[1525,429,67,104,26.9,29.9]],"run":[[365,1060,71,99,13.9,48.4],[960,855,76,100,18.8,52.7],[1038,855,72,100,7.3,56.6],[941,751,81,101,30.3,65.3],[209,1162,65,98,9.8,44.9],[438,1060,61,99,10.5,46.0],[1112,855,63,100,16.4,43.6],[1177,855,66,100,33.3,44.4]],"shoot":[[1245,855,116,100,36.0,41.4],[1363,855,90,100,36.0,42.2],[501,1060,113,99,35.7,40.1],[1455,855,88,100,35.0,38.6]],"melee":[[1594,429,72,104,30.8,37.4],[1159,645,77,102,34.5,48.7],[1238,645,120,102,37.2,66.4],[0,1263,116,96,37.0,67.4],[1545,855,96,100,34.0,53.3],[1668,429,75,104,31.8,38.7]],"rshoot":[[0,1543,102,100,14,51.0,34.0,0],[104,1543,129,100,19,71.5,30.0,0],[235,1543,99,100,7,48.0,38.0,0],[336,1543,131,100,30,73.5,21.0,0],[469,1543,94,100,10,43.0,30.0,0],[565,1543,120,100,10,62.5,30.0,0],[687,1543,94,100,16,43.0,24.0,0],[783,1543,125,100,33,67.5,12.0,0]]},"rook":{"idle":[[1745,429,58,104,30.0,26.2],[1805,429,59,104,30.0,26.8],[1866,429,63,104,34.1,30.6],[1931,429,67,104,38.5,34.6]],"run":[[601,645,69,103,12.1,45.2],[1360,645,75,102,20.1,52.0],[1024,751,75,101,7.3,52.5],[1437,645,84,102,7.5,59.9],[616,1060,71,99,10.2,47.7],[1523,645,67,102,10.4,42.6],[1592,645,70,102,22.0,42.5],[1664,645,70,102,30.0,43.6]],"shoot":[[1736,645,112,102,36.0,33.5],[1850,645,84,102,35.3,31.5],[1101,751,102,101,35.6,27.4],[1205,751,86,101,39.7,29.9]],"melee":[[0,539,66,104,34.8,34.3],[68,539,70,104,34.1,35.8],[140,539,97,104,39.4,38.5],[1293,751,136,101,41.1,59.8],[672,645,121,103,40.1,52.5],[1293,429,69,105,38.2,34.0]],"rshoot":[[910,1543,86,102,12,33.5,25.299999999999997,0],[998,1543,118,102,20,58.5,22.0,0],[1118,1543,90,102,7,37.5,34.30000000000001,0],[1210,1543,118,102,8,58.5,34.0,0],[1330,1543,84,102,10,31.5,25.299999999999997,0],[1416,1543,112,102,12,52.5,24.0,0],[1530,1543,86,102,22,33.5,15.299999999999997,0],[1618,1543,116,102,30,56.5,10.0,0]]},"hex":{"idle":[[239,539,65,104,33.6,43.0],[306,539,64,104,33.9,42.6],[372,539,66,104,32.7,43.8],[440,539,66,104,34.1,43.4]],"run":[[276,1162,70,98,21.8,51.5],[348,1162,76,98,21.0,56.8],[118,1263,81,96,12.1,61.9],[1394,1162,82,97,6.5,61.8],[1478,1162,79,97,19.1,59.9],[426,1162,73,98,19.1,54.3],[501,1162,74,98,26.6,55.4],[689,1060,76,99,46.4,56.9]],"shoot":[[1643,855,81,100,44.7,46.7],[1726,855,100,100,41.1,45.8],[767,1060,115,99,41.8,49.7],[884,1060,146,99,43.1,49.9]],"melee":[[1936,645,78,102,42.3,46.1],[0,751,85,102,42.3,52.7],[1431,751,94,101,53.7,56.1],[1828,855,129,100,53.2,54.1],[1527,751,82,101,48.9,48.6],[87,751,78,102,41.4,42.4]],"rshoot":[[1736,1543,94,100,22,38.0,13.099999999999994,0],[1832,1543,109,99,21,62.5,14.799999999999997,0],[1943,1543,94,100,12,38.0,23.099999999999994,0],[0,1647,109,99,6,62.5,29.80000000000001,0],[111,1647,98,100,19,42.0,20.099999999999994,0],[211,1647,106,99,19,59.5,13.799999999999997,0],[319,1647,95,100,27,39.0,9.099999999999994,0],[416,1647,110,99,46,63.5,-9.200000000000003,0]]},"volt":{"idle":[[508,539,63,104,32.4,37.1],[573,539,63,104,32.9,37.1],[638,539,59,104,29.5,33.6],[699,539,61,104,30.7,34.1]],"run":[[1959,855,70,100,13.3,53.0],[0,958,76,100,9.9,59.8],[78,958,76,100,6.8,60.2],[156,958,84,100,8.2,67.8],[1032,1060,73,99,9.2,55.6],[242,958,65,100,10.2,48.4],[1107,1060,71,99,32.2,54.7],[309,958,73,100,42.3,55.6]],"shoot":[[762,539,81,104,34.6,37.5],[845,539,91,104,34.1,43.0],[938,539,119,104,34.3,42.6],[1059,539,129,104,34.3,39.1]],"melee":[[167,751,61,102,28.5,36.1],[384,958,82,100,34.8,58.6],[468,958,112,100,37.2,67.7],[1559,1162,136,97,38.0,84.1],[1180,1060,92,99,36.8,61.5],[230,751,62,102,29.7,36.7]],"rshoot":[[528,1647,108,104,13,71.0,38.099999999999994,0],[638,1647,139,104,10,77.5,44.30000000000001,0],[779,1647,106,104,7,69.0,42.099999999999994,0],[887,1647,141,104,8,79.5,48.30000000000001,0],[1030,1647,104,104,9,67.0,38.099999999999994,0],[1136,1647,127,104,10,65.5,32.30000000000001,0],[1265,1647,107,104,32,70.0,18.099999999999994,0],[1374,1647,139,104,42,77.5,12.299999999999997,0]]},"bb":{"bruno":[[1190,539,99,104,54.8,58.1],[1291,539,98,104,53.5,56.6],[1391,539,119,104,75.2,78.2],[1512,539,102,104,57.6,58.7],[1616,539,96,104,51.8,50.7],[1714,539,100,104,55.8,58.4]],"blaze":[[485,180,84,115,48.5,54.9],[571,180,84,115,48.5,55.0],[657,180,120,115,84.6,91.1],[779,180,120,115,85.3,91.6],[901,180,120,115,84.8,91.4],[1023,180,123,115,84.8,91.5]]},"grunt":{"walk":[[1274,1060,74,99,31.2,54.8],[1611,751,69,101,26.6,51.6],[582,958,76,100,28.1,53.9],[1682,751,65,101,24.9,49.1],[660,958,67,100,28.6,51.4],[294,751,67,102,25.6,51.0],[1749,751,69,101,29.4,53.4],[1820,751,67,101,24.1,52.1]],"attack":[[1889,751,70,101,29.6,54.1],[729,958,96,100,35.2,61.8],[628,429,112,106,39.2,68.8],[742,429,115,106,36.9,70.6]],"hit":[[1816,539,73,104,35.2,36.5],[173,429,77,107,39.9,21.6]],"death":[[577,1162,72,98,31.4,56.8],[302,1361,83,82,39.2,64.1],[1127,1361,94,65,47.5,71.4],[0,1452,110,53,55.0,71.9],[1434,1452,131,40,65.6,67.6],[303,1507,136,32,68.1,70.6]]},"sci":{"walk":[[1961,751,73,101,30.4,57.9],[0,855,72,101,28.4,56.9],[827,958,75,100,27.2,55.4],[74,855,65,101,23.5,51.0],[904,958,67,100,28.4,52.8],[973,958,64,100,24.0,50.0],[1039,958,72,100,28.7,55.5],[1113,958,71,100,26.0,55.5]],"attack":[[1186,958,71,100,29.9,56.0],[1259,958,96,100,35.0,65.6],[859,429,114,106,39.2,71.5],[252,429,116,107,36.8,68.6]],"hit":[[975,429,75,106,34.8,40.7],[370,429,84,107,42.9,23.6]],"death":[[1350,1060,74,99,30.9,59.4],[387,1361,84,82,39.0,64.4],[1223,1361,94,65,47.3,74.5],[373,1452,110,52,55.1,78.7],[1567,1452,129,37,64.7,65.3],[441,1507,136,29,68.1,68.9]]},"sol":{"walk":[[1357,958,69,100,30.2,55.4],[141,855,66,101,25.9,52.0],[1426,1060,71,99,27.1,56.4],[209,855,65,101,25.2,50.4],[1428,958,66,100,28.3,51.2],[276,855,64,101,22.8,49.1],[342,855,68,101,29.2,53.6],[1499,1060,67,99,23.8,52.0]],"attack":[[651,1162,71,98,29.7,56.3],[724,1162,95,98,34.2,64.7],[363,751,117,102,39.4,73.3],[795,645,115,103,36.3,69.0]],"hit":[[912,645,75,103,33.3,41.9],[1891,539,83,104,41.6,18.4]],"death":[[821,1162,76,98,31.1,60.5],[213,1361,87,84,39.0,69.1],[1647,1361,96,63,46.8,74.9],[621,1452,107,47,53.7,70.5],[1849,1452,126,34,63.2,72.2],[579,1507,134,29,67.2,74.3]]},"runner":{"walk":[[1568,1060,83,99,30.1,63.9],[456,429,96,107,30.1,74.8],[0,429,98,108,6.5,75.7],[1653,1060,95,99,54.0,75.9],[989,645,88,103,21.0,70.6],[1750,1060,91,99,11.8,70.0],[482,751,96,102,12.1,76.8],[201,1263,85,96,11.6,65.0]],"attack":[[412,855,91,101,36.3,73.7],[0,645,110,104,38.2,84.4],[1399,314,131,110,39.0,84.6],[1164,314,134,111,42.7,83.8]],"hit":[[396,314,90,112,37.9,58.5],[307,180,90,117,35.5,18.8]],"death":[[112,645,87,104,31.5,68.1],[1573,1263,98,90,46.0,81.4],[1014,1361,111,68,55.9,85.3],[112,1452,124,53,62.1,82.3],[1155,1452,141,41,70.7,69.1],[152,1507,149,33,74.7,78.0]]},"brute":{"walk":[[1342,0,114,150,51.2,72.3],[574,0,114,153,40.9,70.1],[690,0,111,153,40.5,75.2],[803,0,95,152,30.2,59.6],[1458,0,100,150,37.3,63.9],[900,0,100,151,39.5,63.1],[1002,0,99,151,35.9,61.9],[1103,0,92,151,34.8,55.8]],"attack":[[1707,0,138,141,59.7,80.0],[1560,0,145,148,60.8,74.2],[137,0,140,157,62.9,68.6],[0,0,135,178,56.5,68.5],[1847,0,172,132,84.6,84.7],[126,180,179,118,89.9,95.4]],"hit":[[1197,0,143,151,61.8,77.4],[279,0,167,154,83.5,62.0]],"death":[[448,0,124,154,53.3,75.7],[0,180,124,132,62.2,76.7],[1813,314,151,109,75.4,94.6],[1183,1263,168,93,83.2,101.2],[701,1361,194,71,97.4,106.6],[1434,1361,211,64,105.6,108.8]]},"blaze":{"idle":[[201,645,78,104,37.2,32.8],[281,645,78,104,37.2,33.6],[361,645,78,104,37.7,33.1],[441,645,78,104,37.5,32.8]],"run":[[288,1263,72,96,25.3,41.6],[1493,1263,78,92,28.9,47.9],[1353,1263,69,93,20.9,38.2],[735,1263,65,95,22.9,34.5],[1697,1162,67,97,24.2,35.9],[1424,1263,67,93,39.7,34.9],[362,1263,67,96,17.8,34.9],[802,1263,70,95,16.7,37.8]],"shoot":[[505,855,116,101,38.6,28.7],[623,855,127,101,38.6,27.8],[1496,958,138,100,38.6,26.3],[1636,958,152,100,37.7,25.4]],"melee":[[752,855,64,101,33.5,27.8],[1790,958,63,100,25.6,24.6],[818,855,61,101,28.0,25.9],[1855,958,96,100,35.9,24.7],[1953,958,70,100,25.1,24.8],[0,1060,65,100,35.0,25.6]],"rshoot":[[1515,1647,127,101,48,28.0,-9.400000000000006,0],[1644,1647,152,100,50,25.5,-12.299999999999997,0],[1798,1647,127,101,41,28.0,-2.4000000000000057,0],[0,1753,152,100,49,25.5,-11.299999999999997,0],[154,1753,127,101,54,28.0,-15.400000000000006,0],[283,1753,152,100,66,25.5,-28.299999999999997,0],[437,1753,127,101,42,28.0,-3.4000000000000057,0],[566,1753,152,100,40,25.5,-2.299999999999997,0]]},"bruno":{"idle":[[488,314,89,112,41.3,39.2],[579,314,88,112,40.9,38.3],[669,314,89,112,41.1,38.5],[760,314,88,112,39.9,37.4]],"run":[[1364,429,90,105,31.0,53.7],[580,751,90,102,23.1,53.6],[881,855,77,101,22.1,42.5],[67,1060,83,100,20.2,48.3],[1079,645,78,103,23.1,43.6],[672,751,75,102,14.9,38.6],[749,751,86,102,22.1,48.0],[521,645,78,104,12.5,39.0]],"shoot":[[1678,180,144,113,45.2,40.1],[850,314,120,112,47.6,43.8],[1824,180,103,113,44.7,36.4],[1929,180,104,113,46.4,41.2]],"melee":[[1532,314,87,110,40.9,45.1],[837,751,102,102,40.4,64.5],[874,1263,152,95,75.9,83.0],[574,1361,125,77,35.3,68.8],[1621,314,90,110,41.6,52.0],[972,314,81,112,40.1,44.1]],"rshoot":[[720,1753,109,113,31,41.0,20.400000000000006,0],[831,1753,111,113,23,43.0,30.400000000000006,0],[944,1753,104,113,26,36.0,20.400000000000006,0],[1050,1753,106,113,20,38.0,28.400000000000006,0],[1158,1753,104,113,26,36.0,20.400000000000006,0],[1264,1753,104,113,19,36.0,27.400000000000006,0],[1370,1753,110,113,22,42.0,30.400000000000006,0],[1482,1753,104,113,16,36.0,30.400000000000006,0]]},"sc1":{"run":[[899,1162,72,98,40.1,57.4],[1843,1060,70,99,16.7,54.7],[1028,1263,75,95,24.3,60.4],[1105,1263,76,95,36.7,61.4],[431,1263,77,96,65.1,61.6],[1915,1060,70,99,22.9,54.1],[152,1060,70,100,15.3,54.5],[0,1162,69,99,24.8,54.3]],"fall":[[1300,314,97,111,65.3,31.4],[1771,1263,110,89,63.9,24.4],[485,1452,134,52,67.0,87.2],[0,1507,150,34,74.6,87.5]],"up":[[1298,1452,134,41,66.8,103.9],[1745,1361,113,62,56.5,89.3],[473,1361,99,82,43.6,82.7],[100,429,71,108,30.3,54.2]],"grab":[[1148,180,77,115,42.4,18.1],[1227,180,82,115,42.9,18.6],[0,314,88,113,47.5,25.0],[90,314,93,113,47.5,20.2]]},"sc2":{"run":[[973,1162,67,98,45.0,42.7],[1042,1162,67,98,20.1,43.7],[510,1263,71,96,24.1,47.3],[583,1263,74,96,36.7,46.7],[659,1263,74,96,61.5,46.8],[1111,1162,69,98,25.6,45.6],[224,1060,70,100,18.9,45.5],[71,1162,67,99,28.6,43.8]],"fall":[[1052,429,100,106,68.6,23.5],[1883,1263,118,89,69.8,24.4],[1860,1361,134,60,66.8,94.7],[730,1452,153,45,76.5,102.8]],"up":[[885,1452,132,45,65.8,93.5],[897,1361,115,70,57.3,74.6],[1673,1263,96,90,41.4,64.4],[1966,314,74,109,32.9,45.3]],"grab":[[1311,180,97,115,62.7,26.8],[185,314,100,113,61.8,25.9],[1055,314,107,112,65.6,31.3],[287,314,107,113,62.7,26.6]]},"sc3":{"run":[[1182,1162,71,98,40.3,55.9],[1255,1162,68,98,16.9,52.7],[1766,1162,74,97,24.9,59.2],[1842,1162,75,97,37.3,59.9],[1919,1162,77,97,64.9,60.1],[140,1162,67,99,23.0,51.9],[296,1060,67,100,15.9,52.0],[1325,1162,67,98,24.6,52.1]],"fall":[[1713,314,98,110,66.1,31.4],[0,1361,110,89,63.3,24.9],[238,1452,133,53,66.3,95.6],[1698,1452,149,35,74.1,90.5]],"up":[[1019,1452,134,45,66.8,103.9],[1319,1361,113,65,56.0,87.7],[112,1361,99,85,43.8,81.9],[554,429,72,107,35.6,57.2]],"grab":[[1410,180,79,115,44.1,18.4],[399,180,84,116,45.2,19.4],[1491,180,87,115,47.4,21.4],[1580,180,96,114,49.0,18.7]]}},SIDEIMG=new Image();let sideReady=false;SIDEIMG.onload=()=>{sideReady=true;};
const INPM={"labOpen": [0, 0, 148, 144], "debris": [150, 0, 227, 142], "exit": [379, 0, 111, 141], "lab": [492, 0, 139, 141], "elev": [633, 0, 147, 140], "dblOpen": [782, 0, 151, 111], "fire": [935, 0, 124, 111], "dbl": [1061, 0, 135, 110], "bar": [1198, 0, 245, 107], "bench": [1445, 0, 204, 97]},INP=new Image(),INW=new Image(),INF=new Image();let inReady=0;[INP,INW,INF].forEach(i=>i.onload=()=>{inReady++;});
function sideLoad(){if(SIDEIMG.src||!'assets/side.webp?v=0ac9e01f0b')return;SIDEIMG.src='assets/side.webp?v=0ac9e01f0b';INP.src='assets/inprops.webp?v=d6d2aabdb1';INW.src='assets/inwall.webp?v=1f8e087191';INF.src='assets/infloor.webp?v=59231b8782';}
const SK=122/104;
function sd(id,row,i,x,flip,alpha){const L=SIDEM[id]&&SIDEM[id][row];if(!sideReady||!L)return false;const f=L[((i%L.length)+L.length)%L.length],w=f[2]*SK,h=f[3]*SK;
  ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.translate(x,GY+2);if(flip)ctx.scale(-1,1);ctx.drawImage(SIDEIMG,f[0],f[1],f[2],f[3],-f[4]*SK,-h,w,h);ctx.restore();return true;}
function ipr(n,x,h,alpha,y){const r=INPM[n];if(!r||inReady<3)return false;const k=h/r[3];ctx.globalAlpha=alpha==null?1:alpha;ctx.drawImage(INP,r[0],r[1],r[2],r[3],x-r[2]*k/2,(y==null?GY+4:y)-r[3]*k,r[2]*k,r[3]*k);ctx.globalAlpha=1;return true;}
const sideArt=()=>sideReady&&inReady>=3;
function fireGlow(x,y,r){const fl=.6+.4*Math.sin(t*13+x)*Math.sin(t*7+x*.3);const g=ctx.createRadialGradient(x,y,4,x,y,r);g.addColorStop(0,'rgba(255,150,50,'+(.5*fl)+')');g.addColorStop(1,'rgba(255,100,40,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function drawSideBG2(S){const f=S.floor,c=S.cam;ctx.fillStyle='#120a1a';ctx.fillRect(0,0,WW,WH);
  const WI=WALLIMG&&WALLIMG.complete&&WALLIMG.naturalWidth?WALLIMG:null;
  if(WI){const s=WALL_S,w=WI.width*s,hW=WI.height*s;for(let x=-(c%w);x<WW;x+=w)ctx.drawImage(WI,x,0,w+1,Math.max(hW,WH));}
  else{const s=(GY+6)/625,w=INW.width*s,hW=INW.height*s;let x0=-(c%w);for(let x=x0;x<WW;x+=w)ctx.drawImage(INW,x,0,w+1,hW);
  const fh=WH-GY+6,fw=INF.width*fh/INF.height;for(let x=-(c%fw);x<WW;x+=fw)ctx.drawImage(INF,x,GY-4,fw+1,fh);}
  // props along the floor
  const vis=(px,pw)=>px-c>-pw&&px-c<WW+pw;
  if(R.cfa){cfaProps(S,c,vis);}
  else if(f!==3){const ex=S.exitX;if(vis(ex,120)){ipr('exit',ex-c,172);ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(f===1?'→':'←',ex-c,GY-182);}
    const el=S.elevX;if(vis(el,160))ipr('elev',el-c,172);}
  for(let i=Math.floor(c/430)-1;i<(c+WW)/430+1;i++){const h=hash3(i*17+f*3),px=i*430+180;if(px<200||px>S.len-200)continue;if([S.exitX,S.elevX].some(d=>d!=null&&Math.abs(px-d)<150))continue;if(S.door&&Math.abs(px-S.door.x)<200)continue;if(R.cfa&&cfaNoProp(S,px))continue;if(!R.cfa&&f===3&&(Math.abs(px-S.bar.x)<260||S.doors.some(d=>Math.abs(px-d)<150)))continue;
    if(h<(R.cfa?(f===4?.4:.05):.22)){fireGlow(px-c,GY-30,90);ipr('fire',px-c,74);}else if(h<.4)ipr('bench',px-c,86);}
  if(!R.cfa&&f===3){for(const dx of S.doors){const br=S.brute&&S.brute.burst===dx;ipr(br?'dblOpen':'dbl',dx-c,156);}
    const bx=S.bar.x-c;if(!S.barDown)ipr('bar',bx+30,108);else ipr('bar',bx+40,50,.85);}}
function sideSprite(id,arr,i,x,h,alpha){if(!atlasReady||!arr||!arr.length)return;const idx=arr[((i%arr.length)+arr.length)%arr.length],r=RECTS[idx];if(!r)return;const base=RECTS[arr[0]];drawFrame(idx,x,GY,h/base[3],alpha);}
function drawSideBG(S){const f=S.floor,c=S.cam;
  const sky=ctx.createLinearGradient(0,0,0,GY);sky.addColorStop(0,'#1a0d26');sky.addColorStop(1,'#2b1640');ctx.fillStyle=sky;ctx.fillRect(0,0,WW,WH);
  // back wall panels (parallax .6)
  const pc=c*.6;for(let i=Math.floor(pc/160)-1;i<(pc+WW)/160+1;i++){const x=i*160-pc;ctx.fillStyle=i%2?'#26143a':'#2c1842';ctx.fillRect(x,40,158,GY-60);
    if(hash3(i*7+f)<.55){const lit=!(hash3(i*3+Math.floor(t*2))<.06);ctx.fillStyle=lit?'#b6f23a33':'#0000';ctx.fillRect(x+30,70,98,70);ctx.strokeStyle='#4a2d66';ctx.lineWidth=2;ctx.strokeRect(x+30,70,98,70);}}
  // main wall
  for(let i=Math.floor(c/120)-1;i<(c+WW)/120+1;i++){const x=i*120-c;ctx.fillStyle='#3a2050';ctx.fillRect(x,GY-170,118,170);ctx.fillStyle='#4a2a64';ctx.fillRect(x,GY-170,118,6);
    const h=hash3(i*13+f*5);
    if(h<.18){ctx.fillStyle='#120a1a';ctx.fillRect(x+30,GY-120,58,120);ctx.fillStyle='#b6f23a';ctx.fillRect(x+52,GY-132,14,6);}
    else if(h<.32){const fl=.6+.4*Math.sin(t*13+i)*Math.sin(t*7+i*2);const g=ctx.createRadialGradient(x+60,GY-30,4,x+60,GY-30,70);g.addColorStop(0,'rgba(255,150,50,'+(.55*fl)+')');g.addColorStop(1,'rgba(255,100,40,0)');ctx.fillStyle=g;ctx.fillRect(x-10,GY-110,140,110);
      for(let k=0;k<4;k++){const fx=x+40+k*12,hh=26+18*Math.sin(t*11+k*2+i);ctx.fillStyle=k%2?'#ff7a2e':'#ffc53d';ctx.beginPath();ctx.moveTo(fx-7,GY);ctx.quadraticCurveTo(fx,GY-hh*1.2,fx+7,GY);ctx.fill();}}
    else if(h<.5){ctx.fillStyle='#ffffff10';ctx.fillRect(x+20,GY-150,80,50);ctx.fillStyle='#b6f23a';ctx.font='9px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(h<.4?'LAB '+(f*100+i%40):'BIOHAZARD',x+60,GY-120);}}
  // ceiling lights
  for(let i=Math.floor(c/240);i<(c+WW)/240+1;i++){const x=i*240-c+60,on=hash3(i*5+f)>.25&&!(hash3(i+Math.floor(t*6))<.08);ctx.fillStyle=on?'#efe6dc':'#3a2a44';ctx.fillRect(x,38,70,4);
    if(on){const g=ctx.createLinearGradient(0,42,0,GY);g.addColorStop(0,'#efe6dc22');g.addColorStop(1,'#efe6dc00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,42);ctx.lineTo(x+70,42);ctx.lineTo(x+120,GY);ctx.lineTo(x-50,GY);ctx.fill();}}
  ctx.fillStyle='#0d0814';ctx.fillRect(0,0,WW,38);
  // floor
  ctx.fillStyle='#1d1028';ctx.fillRect(0,GY,WW,WH-GY);for(let i=Math.floor(c/60);i<(c+WW)/60+1;i++){ctx.fillStyle=i%2?'#241334':'#1d1028';ctx.fillRect(i*60-c,GY,60,10);}
  ctx.fillStyle='#4a2a64';ctx.fillRect(0,GY,WW,2);
  // stairs
  const ex=f===1?S.len-60:f===2?60:-999;if(ex>-999){const x=ex-c;ctx.fillStyle='#0b0610';ctx.fillRect(x-36,GY-130,72,130);ctx.strokeStyle='#b6f23a';ctx.lineWidth=3;ctx.strokeRect(x-36,GY-130,72,130);
    ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('STAIRS',x,GY-140);ctx.fillText(f===1?'→':'←',x,GY-60);}
  // floor 3 doors and barricade
  if(!R.cfa&&f===3){for(const dx of S.doors){const x=dx-c,br=S.brute&&S.brute.burst===dx;ctx.fillStyle=br?'#0b0610':'#5a3a20';ctx.fillRect(x-34,GY-120,68,120);ctx.strokeStyle='#8a94a6';ctx.lineWidth=2;ctx.strokeRect(x-34,GY-120,68,120);if(!br){ctx.beginPath();ctx.moveTo(x,GY-120);ctx.lineTo(x,GY);ctx.stroke();}}
    const bx=S.bar.x-c;if(!S.barDown){ctx.fillStyle='#6b4a2a';ctx.fillRect(bx-10,GY-60,70,60);ctx.fillStyle='#8a5e34';ctx.fillRect(bx-24,GY-34,46,34);ctx.save();ctx.translate(bx+30,GY-70);ctx.rotate(-.3);ctx.fillStyle='#5a3a20';ctx.fillRect(-36,-10,72,20);ctx.restore();ctx.fillStyle='#3a2a44';ctx.fillRect(bx+10,GY-96,10,40);}
    else{ctx.fillStyle='#6b4a2a';ctx.save();ctx.translate(bx,GY-12);ctx.rotate(.4);ctx.fillRect(-30,-10,60,20);ctx.restore();ctx.fillRect(bx+30,GY-16,50,16);}}}
function drawSide(){const S=R.side;ctx.save();if(R.shake>0)ctx.translate((Math.random()-.5)*6,(Math.random()-.5)*6);const NEW=sideArt();if(R.s5)s5BG(S);else if(NEW)drawSideBG2(S);else drawSideBG(S);const c=S.cam;
  // Volt's door
  const D=S.door;if(D&&NEW){const x=D.x-c;ipr(D.open?'labOpen':'lab',x,172);if(D.open&&S.voltT>0&&!save.heroes.volt)sd('volt','idle',Math.floor(t*6),x+8,false);
    if(D.debris){fireGlow(x,GY-40,110);ipr('debris',x,138);}
    if(D.key)cfaDrawPad(x,D);
    if(!D.open){for(let k=0;k<3;k++){if(Math.random()<.35){const ex=x+(k-1)*38+(Math.random()-.5)*20,ey=GY-150+Math.random()*110;ctx.strokeStyle='#d6ff7a';ctx.lineWidth=2;ctx.shadowColor='#b6f23a';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(ex,ey);for(let q=0;q<4;q++)ctx.lineTo(ex+(Math.random()-.5)*26,ey-q*9-Math.random()*8);ctx.stroke();ctx.shadowBlur=0;}}}
    if(D.arg>0){const a=Math.min(1,D.arg*3),sz=1+.15*Math.max(0,D.arg-1.9)*6,bx=x+44+(Math.random()-.5)*4,by=GY-212+(Math.random()-.5)*3,txt=D.line||'ARGH!';
      ctx.save();ctx.globalAlpha=a;ctx.translate(bx,by);ctx.scale(sz,sz);ctx.font='18px Bungee, Impact, sans-serif';const tw=ctx.measureText(txt).width+26;
      ctx.fillStyle='#efe6dc';ctx.strokeStyle='#0d1016';ctx.lineWidth=3;ctx.beginPath();for(let q=0;q<18;q++){const an=q/18*6.283,rr=q%2?1:1.18;ctx.lineTo(Math.cos(an)*tw/2*rr,Math.sin(an)*24*rr);}ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(-14,18);ctx.lineTo(-34,46);ctx.lineTo(2,22);ctx.fill();ctx.fillStyle='#0d1016';ctx.textAlign='center';ctx.fillText(txt,0,7);ctx.restore();}}
  else if(D){const x=D.x-c;ctx.fillStyle=D.open?'#0b0610':'#4a3a5a';ctx.fillRect(x-38,GY-128,76,128);ctx.strokeStyle='#8a94a6';ctx.lineWidth=3;ctx.strokeRect(x-38,GY-128,76,128);
    ctx.fillStyle='#b6f23a';ctx.font='9px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('POWER LAB',x,GY-136);
    if(D.open&&!save.heroes.volt&&atlasReady)sideSprite('volt',META.volt.idle,Math.floor(t*6),x,SH*.95);
    if(D.debris){for(let k=0;k<7;k++){ctx.fillStyle=k%2?'#5a4a5a':'#3a2a3a';ctx.save();ctx.translate(x-44+k*15,GY-14-(k%3)*16);ctx.rotate(k*.7);ctx.fillRect(-14,-9,28,18);ctx.restore();}
      for(let k=0;k<5;k++){const fx=x-36+k*18,hh=34+20*Math.sin(t*12+k*1.7);ctx.fillStyle=k%2?'#ff7a2e':'#ffc53d';ctx.beginPath();ctx.moveTo(fx-9,GY);ctx.quadraticCurveTo(fx,GY-hh*1.3,fx+9,GY);ctx.fill();}}
    if(D.arg>0){ctx.globalAlpha=Math.min(1,D.arg*2);ctx.fillStyle='#efe6dc';ctx.font='14px Bungee, Impact, sans-serif';ctx.fillText('ARGH!',x+(Math.random()-.5)*3,GY-150);ctx.globalAlpha=1;}}
  // Bruno and Blaze
  if(S.floor===3&&S.npc&&NEW){const N=S.npc,bx=S.bar.x-c;sd('bb','bruno',N.muz>0?2:(N.bT>.6?4:0),bx+66,false);sd('bb','blaze',N.fire?2+Math.floor(t*10)%2:0,bx+128,false);
    if(N.fire){for(let k=0;k<8;k++){const q=(t*3+k/8)%1,fx=bx+40-q*180;ctx.globalAlpha=(1-q)*.8;ctx.fillStyle=k%2?'#ff7a2e':'#ffc53d';ctx.beginPath();ctx.arc(fx,GY-48+Math.sin(t*20+k)*8,5+q*13,0,6.283);ctx.fill();}ctx.globalAlpha=1;}}
  else if(S.floor===3&&S.npc&&atlasReady){const N=S.npc,bx=S.bar.x-c;sideSprite('bruno',N.muz>0?META.bruno.shoot:META.bruno.idle,Math.floor(t*8),bx+50,SH);sideSprite('blaze',N.fire?META.blaze.shoot:META.blaze.idle,Math.floor(t*10),bx+90,SH*.95);
    if(N.fire){for(let k=0;k<8;k++){const q=(t*3+k/8)%1,fx=bx+20-q*200;ctx.globalAlpha=1-q;ctx.fillStyle=k%2?'#ff7a2e':'#ffc53d';ctx.beginPath();ctx.arc(fx,GY-55+Math.sin(t*20+k)*8,6+q*14,0,6.283);ctx.fill();}ctx.globalAlpha=1;}
    if(N.muz>0){ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(bx+18,GY-60,9,0,6.283);ctx.fill();}}
  // enemies
  for(const e of S.en){const x=e.x-c;if(x<-80||x>WW+80)continue;const M=META[e.type==='runner'?'runner':e.type],h=e.type==='brute'?SH*1.55:SH*.98;
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,GY,e.w*1.1,5,0,0,6.283);ctx.fill();
    if(NEW){const sk=e.type==='brute'?'brute':e.type==='runner'?'runner':(e.skin||'grunt'),fl=e.face<0,hh=(e.type==='brute'?150:100)*SK;
      if(e.dead){sd(sk,'death',Math.min(5,Math.floor(e.dt*8)),x,fl,Math.max(0,1-(e.dt-.7)*2));continue;}
      const near=(Math.abs(e.x-S.x)<e.w+30&&!e.bar)||e.bar,row=e.stun>.15?'hit':near?'attack':'walk',fr=row==='hit'?1:row==='attack'?(e.type==='brute'&&e.wind?Math.min(3,Math.floor((.5-e.atkT)*8)):Math.floor(t*(e.bar?6:8)+e.wob)):Math.floor(t*(e.type==='runner'?14:9)+e.wob);
      sd(sk,row,fr,x,fl);if(e.flash>0){ctx.globalCompositeOperation='lighter';sd(sk,row,fr,x,fl,.5);ctx.globalCompositeOperation='source-over';}
      if(e.wind){ctx.strokeStyle='#ff4d5e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,GY-hh*.6,hh*.45,0,6.283);ctx.stroke();}
      if(e.type==='brute'||e.hp<e.max){const w=e.type==='brute'?70:32;ctx.fillStyle='#0008';ctx.fillRect(x-w/2,GY-hh-12,w,4);ctx.fillStyle='#ff4d5e';ctx.fillRect(x-w/2,GY-hh-12,w*Math.max(0,e.hp/e.max),4);}continue;}
    if(e.dead){const n=M.death.length,fr=Math.min(n-1,Math.floor(e.dt*10));sideSprite(e.type,M.death,fr,x,h,Math.max(0,1-(e.dt-.7)*2));continue;}
    const arr=e.stun>0?M.hit:(Math.abs(e.x-S.x)<e.w+30&&!e.bar)||e.bar?M.attack:M.walk;sideSprite(e.type,arr,Math.floor(t*(e.bar?6:9)+e.wob),x,h);
    if(e.wind){ctx.strokeStyle='#ff4d5e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,GY-h*.6,h*.45,0,6.283);ctx.stroke();}
    if(e.flash>0){ctx.globalCompositeOperation='lighter';sideSprite(e.type,arr,Math.floor(t*9+e.wob),x,h,.5);ctx.globalCompositeOperation='source-over';}
    if(e.type==='brute'||e.hp<e.max){const w=e.type==='brute'?70:32;ctx.fillStyle='#0008';ctx.fillRect(x-w/2,GY-h-12,w,4);ctx.fillStyle='#ff4d5e';ctx.fillRect(x-w/2,GY-h-12,w*Math.max(0,e.hp/e.max),4);}}
  if(R.cfa)cfaDrawSci(S,c);
  if(R.s5)s5DrawSide(S,c);
  // player
  const id=S.active,M=META[id],px=S.x-c;
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(px,GY,24,6,0,0,6.283);ctx.fill();
  const pa=S.entering?Math.max(0,S.exitT/.9):(S.flash>0?.6:1);
  if(NEW&&(id==='blaze'||id==='bruno')&&!SIDEM[id])cfaDrawBB(S,id,px,pa);
  else if(NEW&&S.anT>0&&S.mv&&!(S.melA>0)&&SIDEM[id]&&SIDEM[id].rshoot){const RS=SIDEM[id].rshoot,fi=Math.floor(t*12),f=RS[fi%RS.length];S.rgOff=(f[6]||0)*SK*(S.face<0?-1:1);sd(id,'rshoot',fi,px,S.face<0,pa);}
  else if(NEW){const row=S.melA>0?'melee':S.anT>0?'shoot':S.mv?'run':'idle',fr=row==='melee'?Math.min(5,Math.floor((.35-S.melA)/.35*6)):row==='shoot'?(id==='bruno'?Math.min(3,Math.max(0,Math.floor((SIDE_W.bruno.rate-S.shT)/.2))):Math.floor(t*12)):row==='run'?Math.floor(t*12):Math.floor(t*6);sd(id,row,fr,px,S.face<0,pa);}
  else if(atlasReady&&M){let arr=M.idle,fr=Math.floor(t*6);if(S.melA>0&&id==='rook'&&M.slash){arr=M.slash;fr=Math.floor((.35-S.melA)*18);}else if(S.anT>0&&(M.wshoot||M.shoot)){arr=(S.mv&&M.wshoot)?M.wshoot:M.shoot;fr=Math.floor(t*14);}else if(S.mv)arr=M.run,fr=Math.floor(t*10);
    sideSprite(id,arr,fr,px,SH,S.flash>0?.6:1);}
  if(R.cfa||R.s5)cfaPlayerFx(S,id,px);
  // melee effects
  if(S.melA>0&&!NEW){const q=1-S.melA/.35,mx=px+S.face*55;ctx.globalAlpha=1-q;
    if(id==='cmd'){ctx.strokeStyle='#ffd27a';ctx.lineWidth=5;ctx.beginPath();ctx.arc(px+S.face*20,GY-60,46,S.face>0?-1.2:Math.PI-.4,S.face>0?.4:Math.PI+1.2);ctx.stroke();}
    if(id==='rook'){ctx.strokeStyle='#ffffff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(px,GY-60,80,S.face>0?-1.1:Math.PI-.6,S.face>0?.6:Math.PI+1.1);ctx.stroke();ctx.strokeStyle='#ff8a3d';ctx.lineWidth=2;ctx.stroke();}
    ctx.globalAlpha=1;}
  // bullets, zaps, fx
  for(const b of S.bu){const x=b.x-c;if(b.orb){const g=ctx.createRadialGradient(x,b.y,1,x,b.y,12);g.addColorStop(0,'#fff');g.addColorStop(.4,b.col);g.addColorStop(1,'#d68bff00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,b.y,12,0,6.283);ctx.fill();}else{ctx.fillStyle=b.col;ctx.fillRect(x-8,b.y-1.5,16,3);}}
  for(const z of S.zaps){if(z.col){ctx.strokeStyle=z.col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(z.pts[0][0]-c,z.pts[0][1]);ctx.lineTo(z.pts[1][0]-c,z.pts[1][1]);ctx.stroke();continue;}ctx.strokeStyle='#cfe6ff';ctx.lineWidth=2.5;ctx.shadowColor='#6aa8ff';ctx.shadowBlur=12;ctx.beginPath();z.pts.forEach((p,i)=>{const x=p[0]-c,y=p[1];if(!i)ctx.moveTo(x,y);else{const q=z.pts[i-1];ctx.lineTo((x+q[0]-c)/2+(Math.random()-.5)*16,(y+q[1])/2+(Math.random()-.5)*16);ctx.lineTo(x,y);}});ctx.stroke();ctx.shadowBlur=0;}
  for(const p of S.fx){if(p.ring){const q=1-p.t/.35;ctx.globalAlpha=1-q;ctx.strokeStyle='#d68bff';ctx.lineWidth=6;ctx.beginPath();ctx.arc(p.x-c,p.y,20+q*80,0,6.283);ctx.stroke();ctx.globalAlpha=1;continue;}ctx.globalAlpha=Math.min(1,p.t*2);ctx.fillStyle=p.col;ctx.fillRect(p.x-c-3,p.y-3,6,6);}ctx.globalAlpha=1;
  if(S.burstT>0){ctx.fillStyle='rgba(255,255,255,'+(S.burstT*.5)+')';ctx.fillRect(0,0,WW,WH);}
  if(S.flash>0){ctx.fillStyle='rgba(255,40,60,'+(S.flash*1.2)+')';ctx.fillRect(0,0,WW,WH);}
  ctx.restore();drawSideHUD(S);}
function drawSideHUD(S){const Mb=sideMembers();
  Mb.forEach((id,i)=>{const x=8+i*50,y=6,act=id===S.active;ctx.fillStyle='#0d1016cc';ctx.fillRect(x-2,y-2,48,60);
    if(porReady(id))ctx.drawImage(POR[id],x,y,44,44);else{ctx.fillStyle=id==='cmd'?'#ffc53d':HEROES[id].color;ctx.fillRect(x,y,44,44);}
    ctx.strokeStyle=act?'#ffc53d':'#4a2a64';ctx.lineWidth=act?3:1.5;ctx.strokeRect(x,y,44,44);
    const f=Math.max(0,getHp(id)/maxHp(id));ctx.fillStyle='#2a1f33';ctx.fillRect(x,y+48,44,6);ctx.fillStyle=f<.3?'#ff4d5e':'#5ee08a';ctx.fillRect(x,y+48,44*f,6);});
  ctx.textAlign='center';ctx.font='12px Bungee, Impact, sans-serif';
  const cx=WW/2+40;if(R.cfa)cfaHUD(cx);else if(R.s5)s5HUD(cx);else{ctx.fillStyle='#0d1016cc';ctx.fillRect(cx-110,6,220,26);
  ctx.fillStyle=R.cfLost?'#ff4d5e':R.clockStop?'#5ee08a':R.clock<60&&(t%1<.5)?'#ff4d5e':'#ffc53d';
  ctx.fillText(R.cfLost?'BRUNO & BLAZE · LOST':R.clockStop?'BRUNO & BLAZE · YOU MADE IT':'BRUNO & BLAZE · '+fmtClock(R.clock),cx,24);}
  ctx.fillStyle='#efe6dc';ctx.font='10px Bungee, Impact, sans-serif';ctx.textAlign='right';ctx.fillText(R.s5?(S.floor===1?'OUTSIDE':'THE STATION'):'FLOOR '+S.floor,WW-48,26);
  // buttons
  const btn=(b,txt,on)=>{ctx.globalAlpha=on?.95:.75;ctx.fillStyle=on?'#ff6a2b':'#0d1016cc';ctx.beginPath();ctx.arc(b.x(),b.y(),b.r,0,6.283);ctx.fill();ctx.strokeStyle='#ffc53d';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#efe6dc';ctx.font=(b.r>35?13:11)+'px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(txt,b.x(),b.y()+5);ctx.globalAlpha=1;};
  btn(SB.shoot,'SHOOT',S.shoot);btn(SB.melee,'MELEE',S.melA>0);btn(SB.pause,'II',false);
  if(S.hint>0){ctx.globalAlpha=Math.min(1,S.hint);ctx.fillStyle='#efe6dc';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='left';ctx.fillText('DRAG LEFT OR RIGHT TO MOVE',16,WH-20);ctx.globalAlpha=1;}
  if(R.banner){const b=R.banner;ctx.globalAlpha=Math.min(1,b.t*2);ctx.fillStyle='#0d1016cc';ctx.fillRect(0,168,WW,40);ctx.fillStyle=b.col||'#ffc53d';ctx.font='16px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.txt,WW/2,194);ctx.globalAlpha=1;}
  if(R.say)drawSay();}

/* =====================================================================
   STAGE 4A · CYBER FUTURE (town route)
   Opening cutscene, then a side-scrolling climb: floors 1-3, the hall,
   then the containment doors: 10 brutes, fought from behind the squad.
   Scientists flee toward the squad. Shot ones drop (help them up);
   ones a zombie reaches turn. 10 turned = game over.
   ===================================================================== */
const CFA_ORDER=['f1','f2','f3','f4','vault'];
const CFA_SQUAD=['rook','blaze','bruno','volt'];
let SCI_MAX=20;const sciMax=()=>HORDE()?15:20;
const FLOORS_A={1:{len:2700,start:120,dir:1,n:20,sci:10},2:{len:2700,start:2580,dir:-1,n:20,sci:10},3:{len:2700,start:120,dir:1,n:14,sci:8},4:{len:3600,start:120,dir:1,n:44,sci:0}};
Object.assign(SIDE_W,{blaze:{rate:.08,mul:1,col:'#ff7a2e',flame:1,range:215,vsB:1.3},bruno:{rate:.85,mul:1,col:'#ffd27a',sg:1,range:300,vsB:1.1}});
const FAPM={"cdoorOpen": [0, 0, 511, 313], "cdoor": [513, 0, 507, 308], "pod": [1022, 0, 200, 198], "rack": [1224, 0, 218, 116], "gurney": [1444, 0, 208, 113], "rubble": [1654, 0, 201, 102], "deadGuard": [0, 315, 286, 72], "deadSci": [288, 315, 290, 66], "blood": [580, 315, 196, 56]},FAP=new Image(),FAWC=new Image(),FAWH=new Image(),FACONT=new Image(),FAFLOOR=new Image();
function faLoad(){if(FAP.src||!'assets/faprops.webp?v=a8720f434b')return;FAP.src='assets/faprops.webp?v=a8720f434b';FAWC.src='assets/fawc.webp?v=cda58715c3';FAWH.src='assets/fawh.webp?v=bf6f4e2d5a';FACONT.src='assets/facont.webp?v=a14cccf830';FAFLOOR.src='assets/fafloor.webp?v=e32c3d4607';}
const imOk=i=>i.complete&&i.naturalWidth>0;
function fap(n,x,h,alpha,flip){const r=FAPM[n];if(!r||!imOk(FAP))return false;const k=h/r[3];ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.translate(x,GY+4);if(flip)ctx.scale(-1,1);ctx.drawImage(FAP,r[0],r[1],r[2],r[3],-r[2]*k/2,-r[3]*k,r[2]*k,r[3]*k);ctx.restore();return true;}
const FA_FB='te_e1',FA_FB2='te_e2';
/* cutscene versions by who's alive: each key lists the heroes in that image besides the Commander */
const FA_V={o1:{fa_o1:['bruno','blaze','rook'],fa_o1_br:['blaze','rook'],fa_o1_b:['blaze'],fa_o1_r:['rook'],fa_o1_c:[]},
 hall:{fa_h_vbbr:['volt','bruno','blaze','rook'],fa_h_vbb:['volt','bruno','blaze'],fa_h_bbr:['bruno','blaze','rook'],fa_h_br:['blaze','rook'],fa_h_bv:['blaze','volt'],fa_h_r:['rook'],fa_h_b:['blaze']}};
let FA_VIEW=null;
function faAlive(){if(FA_VIEW)return FA_VIEW.slice();return CFA_SQUAD.filter(id=>save.heroes[id]&&!(save.fallen||[]).includes(id));}
function faPickV(set,have){let best=null,bn=-1;for(const[k,c]of Object.entries(set)){if(c.every(id=>have.includes(id))&&c.length>bn){bn=c.length;best=k;}}return best;}
function faOpenList(){const have=faAlive().filter(id=>id!=='volt');return[
 {bg:faPickV(FA_V.o1,have),fb:FA_FB,d:5,vo:"Cyber Future. The squad had finally made it to the gates.",cam:p=>({cx:.5,cy:lerp(.55,.45,ease(p)),z:lerp(1.02,1.1,ease(p))}),fx(c,tt){}},
 {bg:'fa_o2',fb:FA_FB,d:5,vo:"Then the doors of the main building burst open.",cam:p=>({cx:.5,cy:.5,z:lerp(1.04,1.2,ease(p))}),snd:()=>{SND.explosion(.4);setTimeout(()=>SND.groan(0,.5),900);},fx(c,tt){if(tt<.5)c.shake=5;}},
 {bg:'fa_o3',fb:FA_FB,d:4.5,vo:"Scientists. Dozens of them, running for their lives.",cam:p=>({cx:lerp(.42,.55,ease(p)),cy:.55,z:1.12}),fx(c,tt){}},
 {bg:'fa_o3b',fb:FA_FB,d:4.5,vo:"And right behind them, the ones who had already turned.",cam:p=>({cx:.5,cy:lerp(.5,.42,ease(p)),z:lerp(1.08,1.22,ease(p))}),snd:()=>SND.groan(0,.8),fx(c,tt){}},
 {bg:'fa_o4',fb:FA_FB2,d:4.5,vo:'Commander: "Something\'s wrong in there. We\'re going in."',cam:p=>({cx:lerp(.42,.5,ease(p)),cy:.45,z:lerp(1.14,1.02,ease(p))}),fx(c,tt){}}];}
function faEndList(){const have=faAlive(),hall=faPickV(FA_V.hall,have),who=have.includes('rook')?'rook':have.includes('blaze')?'blaze':'cmd',nm={rook:'Rook',blaze:'Blaze',cmd:'Commander'}[who];
 return[
 hall&&{bg:hall,fb:FA_FB2,d:5,vo:"The last brute fell. Then the hall behind them filled with the dead.",cam:p=>({cx:.5,cy:.5,z:lerp(1.02,1.14,ease(p))}),snd:()=>SND.groan(0,1),fx(c,tt){if((tt%1.2)<.1)c.shake=3;}},
 {bg:'fa_l_'+who,fb:FA_FB2,d:4.5,vo:(hall?'':"The last brute fell, and the dead filled the hall behind them. ")+nm+': "Too many! There\'s a ladder, move!"',cam:p=>({cx:lerp(.42,.56,ease(p)),cy:.5,z:1.1}),fx(c,tt){}},
 {bg:'fa_roof',fb:FA_FB,d:5.5,vo:"The ladder opened onto one of the lower roofs. Below them, the courtyard was gone.",cam:p=>({cx:lerp(.4,.55,ease(p)),cy:.5,z:lerp(1.16,1.04,ease(p))}),fx(c,tt){}},
 {bg:'fa_gate',fb:FA_FB2,d:7.5,vo:"A brute had torn the main gate open and the horde was pouring in. Cyber Future was lost. Now the squad needed a way out.",cam:p=>({cx:.58,cy:.5,z:lerp(1.02,1.2,ease(p))}),snd:()=>{SND.explosion(.6);SND.groan(0,1);},fx(c,tt){if(tt<.4)c.shake=6;c.dim(Math.max(0,(tt-6)*.6));}}].filter(Boolean);}

function cfaRoster(){
  if(save.blaze==='joined'&&!save.heroes.blaze){const src=save.away&&save.away.blaze,lvs=[save.cmd,...Object.values(save.heroes).map(h=>h.lv)],lv=Math.round(lvs.reduce((a,b)=>a+b,0)/lvs.length);
    save.heroes.blaze=src?{lv:src.lv,xp:src.xp||0}:{lv:Math.max(lv,JOIN_LV.blaze),xp:0};if(save.away)delete save.away.blaze;story('hero_joined',{hero:'blaze'});}
  for(const id of CFA_SQUAD)if(!save.heroes[id]&&save.away&&save.away[id]&&(id!=='volt'||save.voltMet==='joined')&&!(LOADSEL&&!LOADSEL.includes(id))){save.heroes[id]=save.away[id];delete save.away[id];}
  storyParty(CFA_SQUAD);save.active=CFA_SQUAD.filter(id=>save.heroes[id]).slice(0,MAX_ACTIVE);}
function cfaStart(at,turned,skip){SCI_MAX=sciMax();at=at||'f1';faLoad();stageRevive();cfaRoster();
  if(at==='f1')for(const id of['cmd',...Object.keys(save.heroes)])setHp(id,maxHp(id));for(const id of REVD)if(save.heroes[id])setHp(id,maxHp(id)*.5);REVD=[];
  roadScroll=0;SX=0;camX=0;
  R={stage:3,cfa:1,wave:1,wall:0,wallMax:1,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,vx:0,prevSX:SX,dead:[],civ:[],civLost:0,civHide:1,
    queue:[],kills:0,spawnLeft:0,spawnTotal:0,spawnT:2,bossPending:false,crateAt:[],jeepAt:-1,proj:[],sayQ:[],sciTurned:turned||0,sciSaved:0};
  R.cfaAt=at;R.cfaTurned0=R.sciTurned;
  if(at==='vault'){cfaPick();return;}
  const f=+at.slice(1);
  if(at==='f1'&&!skip){const L=faOpenList();cineLoad(L);startIntro(()=>{sideStart(1);R.sayQ.push({who:'cmd',txt:"Get them out. Watch your fire, they're running right at us.",t:3.4});},L);return;}
  sideStart(f);}
function cfaCkpt(at){markReach('4a',at);save.ckpt={stage:'4a',wave:at,turned:R.sciTurned};R.cfaAt=at;R.cfaTurned0=R.sciTurned;persist();}
function cfaTick(dt){
  if(R.say&&!R.side){R.say.t-=dt;if(R.say.t<=0)R.say=null;}
  if(!R.say&&R.sayQ&&R.sayQ.length)R.say=R.sayQ.shift();}

/* ---- floors ---- */
function cfaFloor(S,f,F,H){
  S.sci=[];S.strig=[];S.corpse=[];
  S.exitX=f===1?snapDoor(F.len-260):f===2?snapDoor(260):null;S.elevX=f===1?snapDoor(300):f===2?snapDoor(F.len-260):null;
  const n=Math.round(F.n*H),dir=F.dir;
  if(f===1)for(let i=0;i<n;i++)S.trig.push({x:460+i*(F.len-760)/n+Math.random()*60,side:1,type:'grunt'});
  if(f===2){for(let i=0;i<n;i++)S.trig.push({x:F.start-280-i*(F.len-640)/n-Math.random()*60,side:i%4===3?1:-1,type:'grunt'});
    S.door={x:snapDoor(F.start-(F.start-120)*.6),key:1,locked:1,open:false,argT:2};}
  if(f===3){S.bdoor=snapDoor(1500);for(let i=0;i<n;i++)S.trig.push({x:380+i*(S.bdoor-560)/n+Math.random()*50,side:1,type:'grunt'});}
  if(f===4){S.vault={x:F.len-300,st:0,t:0};
    for(let i=0;i<n;i++)S.trig.push({x:380+i*(F.len-900)/n+Math.random()*40,side:i%7===6?-1:1,type:'grunt',skin:Math.random()<.75?'sci':'sol'});
    for(const q of[.33,.66])S.trig.push({x:F.len*q,side:1,type:'brute',hp:HORDE()?3100:2600});
    const HP=[['deadSci',30],['deadGuard',32],['blood',16],['deadSci',30],['gurney',56],['rubble',48],['blood',16],['rack',58],['pod',96],['deadGuard',32]];for(let i=0;i<26;i++){const q=HP[i%HP.length];S.corpse.push({x:300+i*(F.len-800)/26+Math.random()*60,n:q[0],h:q[1],fl:Math.random()<.5});}
    if(0)S.corpse.push({x:300+Math.random()*(F.len-700),sk:['grunt','sci','sol','sci'][i%4],fl:Math.random()<.5,fr:4+Math.floor(Math.random()*2)});}
  // scientists come at you from ahead, spaced out over the floor
  const span=f===2?[F.start-500,420]:[620,(f===3?S.bdoor-200:F.len-600)];
  const nS=Math.round(F.sci*(HORDE()?1.2:1));for(let i=0;i<nS;i++){const q=(i+.5)/nS;S.strig.push({x:span[0]+(span[1]-span[0])*q});}
  if(f===4)R.sayQ.push({who:'bruno',txt:"God... what happened down here?",t:3});
  R.banner={txt:f===4?'THE HALL':'FLOOR '+f+(f===1?' · GET THEM OUT':f===2?' · HEAD LEFT':' · KEEP CLIMBING'),t:2.6,col:'#ffc53d'};}
function cfaBounds(S){const f=S.floor;
  if(f===1)return[40,S.exitX];if(f===2)return[S.exitX,S.len-40];
  if(f===3)return[40,S.bdoor+(S.brute&&S.brute.dead?0:20)];
  return[40,S.vault.x-130];}
function cfaNoProp(S,px){return(S.bdoor&&Math.abs(px-S.bdoor)<160)||(S.vault&&px>S.vault.x-320);}
function cfaExit(S){if(S.floor<3)sideStart(S.floor+1);else if(S.floor===3)sideStart(4);}

/* ---- scientists ---- */
function cfaSpawnSci(S,g){const F=FLOORS_A[S.floor],ahead=F.dir,x=ahead>0?S.cam+WW+50:S.cam-50;
  S.sci.push({x,dir:-ahead,spd:118+Math.random()*30,down:0,grab:0,upT:0,ph:Math.random()*5,kind:1+Math.floor(Math.random()*3),fallT:0});
  // something is after them
  const k=Math.random()<.6?1:2;for(let i=0;i<k;i++){const z=sideEnemy('grunt',x+ahead*(220+i*70+Math.random()*60),{aggro:1});if(z.type==='runner'){z.type='grunt';z.hp=z.max=185;z.spd=46;z.hd=7;z.skin='sci';}}}
function cfaSciLive(s){return!s.gone&&!s.saved;}
function cfaSciDown(s){if(s.down)return;s.down=1;s.upT=0;s.fallT=0;SND.hurt(0);R.tx.push({sx:s.x,txt:'HIT!',t:1});if(!R.sciHitSaid){R.sciHitSaid=1;R.sayQ.unshift({who:'cmd',txt:"Check your fire! Get them back on their feet!",t:3});}}
function cfaSciShot(x0,x1){const S=R.side;const lo=Math.min(x0,x1)-6,hi=Math.max(x0,x1)+6;for(const s of S.sci){if(!cfaSciLive(s)||s.down||s.held)continue;if(s.x>lo&&s.x<hi){cfaSciDown(s);return true;}}return false;}
function cfaSciNear(x,face,maxd){const S=R.side;let best=null,bd=maxd;for(const s of S.sci){if(!cfaSciLive(s)||s.down)continue;const d=(s.x-x)*face;if(d>0&&d<bd){bd=d;best=s;}}return best;}
function cfaSciTurn(s,S){s.gone=1;R.sciTurned++;const z=sideEnemy('grunt',s.x,{aggro:1,stun:.6});z.type='grunt';z.hp=z.max=185;z.spd=46;z.hd=7;z.skin='sci';
  SND.groan(0,.8);R.shake=.2;R.banner={txt:'A SCIENTIST TURNED · '+R.sciTurned+'/'+SCI_MAX,t:2.2,col:'#ff4d5e'};story('scientist_turned',{n:R.sciTurned});
  if(R.sciTurned>=SCI_MAX){R.over=true;R.sciFail=1;SND.gameOver();story('scientists_lost',{});legacyEnd('scientists_lost');persist();state='over';ui();}}
/* zombies go for a scientist when one is closer than the squad */
function cfaSciAI(e,S,dt){if(e.bar||e.type==='brute')return false;if(Math.abs(S.x-e.x)<e.w+34){if(e.hold){e.hold.held=0;e.hold=null;}return false;}let tg=null,bd=Math.min(Math.abs(S.x-e.x),260);
  for(const s of S.sci){if(!cfaSciLive(s)||(e.miss&&e.miss.has(s)&&!s.down))continue;const d=Math.abs(s.x-e.x);if(d<bd){bd=d;tg=s;}}
  if(!tg){if(e.hold){e.hold.held=0;e.hold=null;}return false;}
  e.face=Math.sign(tg.x-e.x)||1;
  if(bd>20){e.x+=e.face*e.spd*1.1*dt;return true;}
  // a running scientist usually slips past; one on the floor never does
  if(!tg.down&&!tg.held){if(Math.random()>.25){(e.miss=e.miss||new Set()).add(tg);e.stun=Math.max(e.stun,.25);return true;}}
  tg.held=1;tg.grab+=dt;e.hold=tg;e.atkT-=dt;if(tg.grab>1.3){e.hold=null;cfaSciTurn(tg,S);}return true;}
function cfaSciUpdate(S,dt){
  for(const g of S.strig){if(g.done)continue;const ahead=FLOORS_A[S.floor].dir,near=ahead<0?S.x<g.x+WW*.55:S.x>g.x-WW*.55;if(near){g.done=1;cfaSpawnSci(S,g);}}
  for(const s of S.sci){if(!cfaSciLive(s))continue;s.ph+=dt;
    if(s.held){if(!S.en.some(e=>!e.dead&&e.hold===s)){s.held=0;s.grab=0;}continue;}
    s.grab=Math.max(0,s.grab-dt);
    if(s.down){s.fallT+=dt;if(Math.abs(s.x-S.x)<38){s.upT+=dt;if(s.upT>.45){s.down=0;s.upT=0;SND.click();R.tx.push({sx:s.x,txt:'UP YOU GET',t:1.1,col:'#5ee08a'});}}continue;}
    s.x+=s.dir*s.spd*dt;
    if((s.dir<0&&s.x<S.cam-60)||(s.dir>0&&s.x>S.cam+WW+60)||s.x<-40||s.x>S.len+40){s.saved=1;R.sciSaved++;}}
  S.sci=S.sci.filter(s=>cfaSciLive(s));
  for(const q of R.tx)q.t-=dt;R.tx=R.tx.filter(q=>q.t>0&&q.sx!=null);}

/* ---- Blaze's flamer and Bruno's shotgun ---- */
function cfaShootBB(S,id,W,dmg,mx,y){
  if(W.flame){S.flame=.14;S.burnT=(S.burnT||0);
    if(S.mv){S.burnT+=W.rate;if(S.burnT>=.35){S.burnT=0;sideHurt('blaze',3);if(!R.burnSaid){R.burnSaid=1;R.sayQ.unshift({who:'blaze',txt:"Ow! Hot, hot! I can't run with this thing lit!",t:3});}}}
    if((S.flSnd=(S.flSnd||0)+1)%4===1)SND.shot('flame',0);
    for(const s of S.sci){if(!cfaSciLive(s)||s.down||s.held)continue;const d=(s.x-S.x)*S.face;if(d>0&&d<W.range)cfaSciDown(s);}
    for(const e of S.en){if(e.dead)continue;const d=(e.x-S.x)*S.face;if(d>-10&&d<W.range+e.w*.5)sideDmg(e,dmg,id,0);}return;}
  // shotgun: whatever is closest takes the blast, the next two take the spread
  SND.shot('shotgun',0);S.muz=.08;S.anT=.8;R.shake=Math.max(R.shake||0,.06);
  const sc=cfaSciNear(S.x,S.face,W.range);
  const tg=S.en.filter(e=>!e.dead&&(e.x-S.x)*S.face>-10&&(e.x-S.x)*S.face<W.range).sort((a,b)=>Math.abs(a.x-S.x)-Math.abs(b.x-S.x)).slice(0,3);
  if(sc&&(!tg[0]||Math.abs(sc.x-S.x)<Math.abs(tg[0].x-S.x)))cfaSciDown(sc);
  tg.forEach((e,i)=>sideDmg(e,dmg*(i?.55:1),id,i?20:55));
  for(let i=0;i<7;i++)S.fx.push({x:mx,y:y+(Math.random()-.5)*10,vx:S.face*(500+Math.random()*300),vy:(Math.random()-.5)*120,t:.18,col:'#ffe08a'});}

/* ---- Volt's door: Blaze's keycard ---- */
function cfaKey(S,D,id){
  if(id==='blaze'){D.locked=0;D.open=1;D.arg=0;D.swipe=.8;SND.click();setTimeout(()=>SND.click(),180);S.voltT=.9;R.sayQ.unshift({who:'blaze',txt:"Security clearance, baby.",t:2.4});return;}
  D.deny=.6;SND.click();if(!S.saidKey||S.saidKey<S.t-4){S.saidKey=S.t;R.say={who:id,txt:save.heroes.blaze?"Locked. Blaze has a security card, switch to her.":"Locked tight. We need a security card.",t:3};}}
function cfaDrawPad(x,D){const px=x+70,py=GY-118,ok=!D.locked;ctx.fillStyle='#1a1d24';ctx.fillRect(px-11,py-18,22,36);ctx.strokeStyle='#5a6070';ctx.lineWidth=2;ctx.strokeRect(px-11,py-18,22,36);
  ctx.fillStyle=D.deny>0&&(t*12%1)<.5?'#ff4d5e':ok?'#5ee08a':'#ff4d5e';ctx.fillRect(px-6,py-13,12,5);
  ctx.fillStyle='#8a94a6';for(let r=0;r<3;r++)for(let q=0;q<3;q++)ctx.fillRect(px-7+q*5,py-3+r*5,3,3);
  ctx.fillStyle='#2a2f3a';ctx.fillRect(px-8,py+13,16,3);
  if(D.swipe>0){ctx.fillStyle='#efe6dc';ctx.fillRect(px-7,py+10-D.swipe*14,14,8);}
  const S=R.side;if(!ok&&Math.abs(S.x-D.x)<200&&save.heroes.blaze){ctx.fillStyle='#ffc53d';ctx.font='10px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(S.active==='blaze'?'MELEE TO SWIPE':'BLAZE HAS THE CARD',px,py-26);}}

/* ---- per-frame floor logic; returns true if it changed scene ---- */
function cfaUpdate(S,dt){
  if(S.floor<4){cfaSciUpdate(S,dt);if(R.over)return true;}
  if(S.flame>0)S.flame-=dt;if(S.muz>0)S.muz-=dt;
  const D=S.door;if(D){if(D.deny>0)D.deny-=dt;if(D.swipe>0)D.swipe-=dt;
    if(!D.hint&&Math.abs(S.x-D.x)<520){D.hint=1;if(!save.heroes.blaze)R.banner={txt:'LOCKED · NEEDS A SECURITY CARD',t:2.6,col:'#ff4d5e'};}}
  // floor 3: the brute is waiting behind the door
  if(S.floor===3){
    if(!S.brute&&Math.abs(S.x-S.bdoor)<70){const dx=S.bdoor;S.brute=sideEnemy('brute',dx+S.face*10,{aggro:1,burst:dx});S.brute.hp=S.brute.max=HORDE()?4200:3500;S.burstT=.8;
      sideHurt(S.active,20);S.x=Math.max(40,S.x-150);S.flash=.3;
      R.banner={txt:'BRUTE!',t:2,col:'#ff4d5e'};SND.explosion(.8);SND.groan(0,1);R.shake=.6;
      for(let i=0;i<26;i++)S.fx.push({x:dx+(Math.random()-.5)*60,y:GY-Math.random()*120,vx:(Math.random()-.5)*260,vy:-80-Math.random()*160,t:.9,col:'#8a94a6'});}
    if(S.burstT>0)S.burstT-=dt;
    if(S.brute&&S.brute.dead&&!S.hallSaid){S.hallSaid=1;R.banner={txt:'GO THROUGH THE DOOR HE CAME FROM',t:2.6,col:'#b6f23a'};SND.waveClear();R.sayQ.push({who:'cmd',txt:"He came from down there. That's where this started.",t:3});}
    if(S.brute&&S.brute.dead&&Math.abs(S.x-S.bdoor)<6&&S.exitT<0){S.exitT=.9;S.entering=1;SND.whoosh();}}
  // floor 4: the containment doors
  if(S.floor===4){const V=S.vault;
    if(V.st===0&&S.x>V.x-140){V.st=1;V.t=0;S.lock=1;S.mv=0;R.banner={txt:'CONTAINMENT',t:2.2,col:'#ff4d5e'};SND.alarm();R.sayQ.unshift({who:'rook',txt:"Those are the doors from the gate... Something's hitting them.",t:3});}
    if(V.st===1){V.t+=dt;if((V.t%.7)<dt){R.shake=.25;SND.explosion(.25);}if(V.t>3.2){V.st=2;V.t=0;R.shake=.9;SND.explosion(1);SND.groan(0,1);S.burstT=.8;}}
    if(V.st===2){V.t+=dt;if(V.t>1.2){V.st=3;cfaCkpt('vault');cfaPick();return true;}}}
  // floors 1, 2: stairs
  if(S.floor<3){const atEnd=Math.abs(S.x-S.exitX)<3;if(atEnd&&S.exitT<0){S.exitT=.9;S.entering=1;SND.whoosh();}}
  return false;}
function cfaProps(S,c,vis){const f=S.floor;
  if(f<3){const ex=S.exitX;if(vis(ex,120)){ipr('exit',ex-c,172);ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(f===1?'→':'←',ex-c,GY-182);}
    const el=S.elevX;if(vis(el,160))ipr('elev',el-c,172);}
  if(f===3){const br=S.brute;ipr(br?'dblOpen':'dbl',S.bdoor-c,156);if(br&&br.dead){ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('↓',S.bdoor-c,GY-170);}}
  if(f===4){for(const k of S.corpse){if(!vis(k.x,120))continue;if(!fap(k.n,k.x-c,k.h,1,k.fl))ctx.fillStyle='#0000';}
    for(let i=0;i<Math.ceil(S.len/260);i++){const x=i*260+90-c;if(x<-60||x>WW+60)continue;ctx.fillStyle='rgba(90,10,14,.55)';ctx.beginPath();ctx.ellipse(x+hash3(i)*60,GY+6,30+hash3(i*3)*30,5,0,0,6.283);ctx.fill();}
    cfaDrawVault(S,c);}}
function cfaDrawVault(S,c){const V=S.vault,x=V.x-c,w=220,h=250,top=GY-h;if(x<-w-200||x>WW+w+200)return;
  if(FAPM.cdoor&&imOk(FAP)){const sh=V.st===1?(Math.random()-.5)*(V.t%.7<.15?8:2):0,op=V.st>=2,k=270/FAPM.cdoor[3];fap(op?'cdoorOpen':'cdoor',x+sh,FAPM[op?'cdoorOpen':'cdoor'][3]*k);
    if(V.st===1&&V.t%.7<.12){ctx.fillStyle='rgba(255,60,60,.18)';ctx.fillRect(x-200,GY-280,400,280);}return;}
  const sh=V.st===1?(Math.random()-.5)*(V.t%.7<.15?8:2):0,open=V.st>=2?Math.min(1,V.t*3):0;
  ctx.fillStyle='#050307';ctx.fillRect(x-w/2,top,w,h);
  if(open){const g=ctx.createRadialGradient(x,GY-90,10,x,GY-90,160);g.addColorStop(0,'rgba(255,60,60,.5)');g.addColorStop(1,'rgba(255,60,60,0)');ctx.fillStyle=g;ctx.fillRect(x-w/2,top,w,h);}
  const lw=w/2*(1-open*.85);
  for(const d of[-1,1]){const x0=(d<0?x-w/2-open*w*.42:x+open*w*.42)+sh;ctx.fillStyle='#4a4f5c';ctx.fillRect(x0,top,lw,h);ctx.strokeStyle='#2a2d36';ctx.lineWidth=3;ctx.strokeRect(x0,top,lw,h);
    ctx.fillStyle='#ffc53d';for(let k=0;k<5;k++){ctx.save();ctx.beginPath();ctx.rect(x0,top+h-34,lw,22);ctx.clip();ctx.fillRect(x0+k*30-10,top+h-34,14,22);ctx.restore();}
    ctx.fillStyle='#3a3e48';for(let k=0;k<6;k++)ctx.fillRect(x0+8,top+20+k*34,lw-16,4);}
  ctx.strokeStyle='#8a94a6';ctx.lineWidth=4;ctx.strokeRect(x-w/2-6,top-6,w+12,h+6);
  const on=(t*2%1)<.5;ctx.fillStyle=on?'#ff4d5e':'#5a1a20';ctx.beginPath();ctx.arc(x-w/2-16,top+10,7,0,6.283);ctx.arc(x+w/2+16,top+10,7,0,6.283);ctx.fill();
  ctx.fillStyle='#ff4d5e';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('CONTAINMENT · LEVEL 4',x,top-14);}
function cfaPlayerFx(S,id,px){
  if(id==='blaze'&&S.flame>0&&S.melA<=0){const ox=px+S.face*(S.mv?60:84)*SK,oy=GY-(S.mv?50:52)*SK;for(let k=0;k<9;k++){const q=(t*3.2+k/9)%1,fx=ox+S.face*q*130;ctx.globalAlpha=(1-q)*.75;ctx.fillStyle=k%2?'#ff7a2e':'#ffc53d';ctx.beginPath();ctx.arc(fx,oy+Math.sin(t*20+k)*7*q,5+q*14,0,6.283);ctx.fill();}ctx.globalAlpha=1;fireGlow(ox+S.face*60,oy,120);}
  if(id==='bruno'&&S.muz>0&&S.mv){const mz=MZ.bruno;ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(px+S.face*(mz[1]*SK+(S.rgOff||0)*S.face),GY+2-mz[0]*SK,11,0,6.283);ctx.fill();}}
/* stand-in for the playable Blaze / Bruno sheets: the barricade frames from the 4B sheet */
function cfaDrawBB(S,id,px,pa){const fl=S.face>0,mv=S.mv&&S.anT<=0,bob=mv?Math.abs(Math.sin(t*12))*-4:0;
  const fr=id==='blaze'?(S.anT>0?2+Math.floor(t*10)%2:0):(S.muz>0?2:S.anT>.5?4:0);
  ctx.save();ctx.translate(0,bob);if(mv){ctx.translate(px,GY);ctx.rotate(S.face*.05);ctx.translate(-px,-GY);}sd('bb',id,fr,px,fl,pa);ctx.restore();
  if(id==='blaze'&&S.flame>0){const ox=px+S.face*40,oy=GY-52*SK;for(let k=0;k<10;k++){const q=(t*3.2+k/10)%1,fx=ox+S.face*q*215;ctx.globalAlpha=(1-q)*.85;ctx.fillStyle=k%2?'#ff7a2e':'#ffc53d';ctx.beginPath();ctx.arc(fx,oy+Math.sin(t*20+k)*8*q,4+q*15,0,6.283);ctx.fill();}ctx.globalAlpha=1;fireGlow(ox+S.face*80,oy,110);}
  if(id==='bruno'&&S.muz>0){ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(px+S.face*56,GY-50*SK,10,0,6.283);ctx.fill();}}
/* stand-in for the human scientist sheet: the scientist zombie, drained of the green */
function cfaDrawSci(S,c){for(const s of S.sci){const x=s.x-c;if(x<-60||x>WW+60)continue;
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,GY,18,5,0,0,6.283);ctx.fill();
  const sk='sc'+(s.kind||1),fl=s.dir<0;
  if(SIDEM[sk]){
    if(s.down){if(s.upT>0)sd(sk,'up',Math.min(3,Math.floor(s.upT/.45*4)),x,fl);else sd(sk,'fall',Math.min(3,Math.floor(s.fallT*9)),x,fl);}
    else if(s.held){sd(sk,'grab',Math.floor(t*8),x+(Math.random()-.5)*2,fl);}
    else sd(sk,'run',Math.floor(s.ph*14),x,fl);}
  else{ctx.save();ctx.filter='grayscale(1) brightness(1.35) contrast(1.1)';
  if(s.down){sd('sci','death',3,x,s.dir>0);}
  else if(s.held){ctx.translate(x,GY);ctx.translate((Math.random()-.5)*3,0);ctx.translate(-x,-GY);sd('sci','hit',Math.floor(t*8)%2,x,s.dir>0);}
  else{ctx.translate(x,GY);ctx.scale(1,1);ctx.translate(-x,-GY);sd('sci','walk',Math.floor(s.ph*16),x,s.dir>0);}
  ctx.restore();}
  if(s.down){const p=s.upT/.45;ctx.fillStyle='#0d1016cc';ctx.fillRect(x-20,GY-60,40,5);ctx.fillStyle='#5ee08a';ctx.fillRect(x-20,GY-60,40*p,5);if(Math.abs(s.x-S.x)>38&&(t*2%1)<.6){ctx.fillStyle='#ffc53d';ctx.font='10px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('HELP!',x,GY-68);}}
  if(s.held){ctx.fillStyle='#ff4d5e';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('!!',x,GY-128);}}
  for(const q of R.tx){if(q.sx==null)continue;ctx.globalAlpha=Math.min(1,q.t*2);ctx.fillStyle=q.col||'#ff4d5e';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(q.txt,q.sx-c,GY-120-(1-q.t)*20);}ctx.globalAlpha=1;}
function cfaHUD(cx){if(R.side&&R.side.floor>=4)return;ctx.fillStyle='#0d1016cc';ctx.fillRect(cx-120,6,240,26);const n=R.sciTurned,warn=n>=SCI_MAX-3;
  ctx.fillStyle=warn&&(t%1<.5)?'#ff4d5e':n?'#ffc53d':'#5ee08a';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';
  ctx.fillText('SCIENTISTS TURNED '+n+'/'+SCI_MAX+'  ·  SAVED '+R.sciSaved,cx,24);}

/* ---- containment: choose three, then 10 brutes, from behind the squad ---- */
let CFA_PICK=null;
function cfaPick(){const av=CFA_SQUAD.filter(id=>save.heroes[id]&&getHp(id)>0);
  if(av.length<=MAX_ACTIVE){save.active=av;cfaVault();return;}
  CFA_PICK=av.filter(id=>save.active.includes(id)).slice(0,MAX_ACTIVE);state='pick4a';ui();}
function cfaPickHTML(){const av=CFA_SQUAD.filter(id=>save.heroes[id]&&getHp(id)>0),need=Math.min(MAX_ACTIVE,av.length),ok=CFA_PICK.length===need;
  return `<h2>The containment doors</h2><div class="stripe"></div><p class="sub">They're coming out all at once. There's only room for three beside the Commander. Choose who stands with you.</p>
  <div class="chips"><button class="chip on" disabled>Commander</button>${av.map(id=>`<button class="chip ${CFA_PICK.includes(id)?'on':''}" data-act="p4" data-id="${id}">${HEROES[id].name} · ${Math.round(getHp(id))}/${Math.round(maxHp(id))}</button>`).join('')}</div>
  <p class="sub">${CFA_PICK.length}/${need} chosen</p><div class="btns"><button class="btn" data-act="p4go" ${ok?'':'disabled style="opacity:.4"'}>Hold the line</button></div>`;}
function cfaPickAct(a,b){if(a==='p4'){const id=b.dataset.id;if(CFA_PICK.includes(id))CFA_PICK=CFA_PICK.filter(x=>x!==id);else if(CFA_PICK.length<MAX_ACTIVE)CFA_PICK.push(id);ui();return true;}
  if(a==='p4go'){save.active=CFA_PICK.slice();persist();cfaVault();return true;}return false;}
function cfaVault(){faLoad();const keep=R;townUse('yard');roadScroll=0;SX=0;camX=0;
  R={stage:3,cfa:1,cfb:1,cont:1,wave:1,wall:0,wallMax:1,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:{txt:'CONTAINMENT BREACH',t:2.6,col:'#ff4d5e'},vx:0,prevSX:SX,dead:[],civ:[],civLost:0,civHide:1,
    queue:[],kills:0,spawnLeft:0,spawnTotal:0,spawnT:99,bossPending:false,crateAt:[],jeepAt:-1,proj:[],sayQ:[{who:'cmd',txt:"Here they come. Don't let them close!",t:3}],
    sciTurned:keep.sciTurned,sciSaved:keep.sciSaved,cfaAt:'vault',cfaTurned0:keep.sciTurned};
  const n=10;for(let i=0;i<n;i++){const e=mkEnemy('brute',((i%5)/4*2-1)*(LANE_E-60)+(Math.random()-.5)*40,520+Math.floor(i/5)*170+Math.random()*80);e.spd*=1.3+Math.random()*.25;}
  SND.alarm();SND.groan(0,1);state='play';ui();last=performance.now();}
function cfaVaultDone(){if(R.cfaDone)return;R.cfaDone=1;SND.waveClear();persist();
  R.banner={txt:'THE LAST ONE IS DOWN',t:2.2,col:'#b6f23a'};setTimeout(cfaFinish,1800);}
function cfaFinish(){story('stage_clear_cfa',{turned:R.sciTurned,saved:R.sciSaved});const L=faEndList();cineLoad(L);
  startIntro(()=>{save.cleared=Math.max(save.cleared||0,4);save.cfaDone=1;save.cfaTurned=R.sciTurned;save.cfaSaved=R.sciSaved;legacyStage(4);delete save.ckpt;persist();state='win4a';ui();},L);}
function cfaWinHTML(){return `<h1 class="title">STAGE 4<span>COMPLETE</span></h1><div class="stripe"></div>
  <p class="sub">The squad cut through Cyber Future and broke the containment brutes. From the roof they watched the horde pour through the busted gate. Cyber Future is lost. Now they need a way out.</p>
  <div class="row"><span class="sub">Scientists saved</span><span class="big">${save.cfaSaved||0}</span></div>
  <div class="row"><span class="sub">Scientists turned</span><span class="big">${save.cfaTurned||0} / ${sciMax()}</span></div>
  <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
  <div class="btns"><button class="btn" data-act="s5">On to Stage 5</button><button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="cfa">Play Stage 4 again</button></div>`;}

/* ---- the containment room, drawn until its art arrives ---- */
let FLW=null;
function drawContWorld(dt){if(!imOk(FACONT)){drawContWorld0(dt);return;}
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0d0a12';ctx.fillRect(-20,-20,WW+40,WH+40);
  const s=.4,iw=FACONT.width*s,ih=FACONT.height*s,x0=WW/2-iw/2,y0=HOR+4-548*s;
  ctx.drawImage(FACONT,x0,y0,iw,ih);
  if(x0>-20)for(const d of[-1,1]){ctx.save();ctx.translate(d<0?x0:x0+iw,0);ctx.scale(-1,1);ctx.drawImage(FACONT,d<0?0:-iw,y0,iw,ih);ctx.restore();}
  if(imOk(FAFLOOR)){if(!FLW){FLW=document.createElement('canvas');FLW.width=256*6;FLW.height=256;const g=FLW.getContext('2d');for(let i=0;i<6;i++)g.drawImage(FAFLOOR,i*256,0,256,256);}
    const HWs=1600,TL=HWs*2/6;for(let y=WH+30;y>HOR+1;y-=1){const k=(y-HOR)/CAMH,z=F/k-D;if(z>4200)break;let v=(z/TL)%1;if(v<0)v+=1;const hw=HWs*k;ctx.drawImage(FLW,0,Math.floor(v*256),FLW.width,1,WW/2-hw,y,hw*2,1.25);}}
  const hz=ctx.createLinearGradient(0,HOR-6,0,HOR+60);hz.addColorStop(0,'rgba(60,10,20,.85)');hz.addColorStop(1,'rgba(60,10,20,0)');ctx.fillStyle=hz;ctx.fillRect(-20,HOR-6,WW+40,66);
  const lg=ctx.createRadialGradient(WW/2,HOR-20,10,WW/2,HOR-20,260);lg.addColorStop(0,'rgba(255,40,40,'+(.12+.06*Math.sin(t*5))+')');lg.addColorStop(1,'rgba(255,40,40,0)');ctx.fillStyle=lg;ctx.fillRect(WW/2-260,HOR-280,520,400);
  ctx.restore();}
function drawContWorld0(dt){ctx.save();ctx.fillStyle='#0d0a12';ctx.fillRect(-20,-20,WW+40,WH+40);
  const bw=Math.min(WW*.7,620),top=HOR-150;
  const wg=ctx.createLinearGradient(0,top,0,HOR+4);wg.addColorStop(0,'#1c1824');wg.addColorStop(1,'#2c2636');ctx.fillStyle=wg;ctx.fillRect(-20,top,WW+40,HOR+4-top);
  for(let i=0;i<14;i++){const x=i*(WW/13);ctx.fillStyle='#14111a';ctx.fillRect(x,top,3,HOR+4-top);}
  const dw=200,dh=130,dx=WW/2;ctx.fillStyle='#050307';ctx.fillRect(dx-dw/2,HOR+4-dh,dw,dh);
  const g=ctx.createRadialGradient(dx,HOR-40,6,dx,HOR-40,150);g.addColorStop(0,'rgba(255,50,50,'+(.35+.15*Math.sin(t*6))+')');g.addColorStop(1,'rgba(255,50,50,0)');ctx.fillStyle=g;ctx.fillRect(dx-160,HOR-190,320,200);
  for(const d of[-1,1]){ctx.fillStyle='#4a4f5c';ctx.beginPath();ctx.moveTo(dx+d*dw/2,HOR+4-dh);ctx.lineTo(dx+d*(dw/2+70),HOR-dh-24);ctx.lineTo(dx+d*(dw/2+70),HOR+26);ctx.lineTo(dx+d*dw/2,HOR+4);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#2a2d36';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ffc53d';ctx.fillRect(Math.min(dx+d*dw/2,dx+d*(dw/2+70)),HOR-8,70,6);}
  ctx.strokeStyle='#8a94a6';ctx.lineWidth=3;ctx.strokeRect(dx-dw/2-4,HOR+4-dh-4,dw+8,dh+4);
  for(const d of[-1,1]){const on=Math.sin(t*5+d)>0;const bx=dx+d*(dw/2+110),by=HOR-dh-10;const bg=ctx.createRadialGradient(bx,by,2,bx,by,60);bg.addColorStop(0,on?'rgba(255,70,60,.8)':'rgba(255,70,60,.15)');bg.addColorStop(1,'rgba(255,70,60,0)');ctx.fillStyle=bg;ctx.fillRect(bx-60,by-60,120,120);}
  ctx.fillStyle='#ff4d5e';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('CONTAINMENT · LEVEL 4',dx,HOR-dh-14);
  const fg=ctx.createLinearGradient(0,HOR,0,WH);fg.addColorStop(0,'#17131d');fg.addColorStop(1,'#2a2430');ctx.fillStyle=fg;ctx.fillRect(-20,HOR+4,WW+40,WH);
  ctx.strokeStyle='rgba(138,148,166,.18)';ctx.lineWidth=1;
  for(let x=-2400;x<=2400;x+=200){const[a1,b1]=P(x,ZFAR+200),[a2,b2]=P(x,-150);ctx.beginPath();ctx.moveTo(a1,b1);ctx.lineTo(a2,b2);ctx.stroke();}
  for(let z=-100;z<ZFAR+200;z+=140){const[a1,b1]=P(-2400,z),[a2]=P(2400,z);ctx.beginPath();ctx.moveTo(a1,b1);ctx.lineTo(a2,b1);ctx.stroke();}
  for(let i=0;i<9;i++){const[sx,sy,k]=P((hash3(i*5)*2-1)*900,120+hash3(i*7)*900);ctx.fillStyle='rgba(90,10,14,.6)';ctx.beginPath();ctx.ellipse(sx,sy,60*k,10*k,0,0,6.283);ctx.fill();}
  for(const d of[-1,1]){ctx.fillStyle='#120f17';ctx.beginPath();ctx.moveTo(d<0?-20:WW+20,top);ctx.lineTo(dx+d*bw/2*1.15,HOR+4);ctx.lineTo(d<0?-20:WW+20,WH+20);ctx.closePath();ctx.globalAlpha=.55;ctx.fill();ctx.globalAlpha=1;}
  ctx.restore();}

/* =====================================================================
   STAGE 5 · THE FOREST RUN
   Zip line out of Cyber Future, a Screecher ambush (wave 1), the ritual
   (Volt's water mini-game or a Momma / Hex fight), then the ranger post:
   a side-scroller to find the jeep key before the horde swarms the jeep.
   ===================================================================== */
const S5_ORDER=['w1','rit','post'];
const S5_SQUAD=['rook','hex','volt','bruno','blaze'];
let S5_VIEW=null;
const s5Town=()=>S5_VIEW?S5_VIEW.town:save.route!=='backroad';
const S5_FB='xf1',S5_FB2='xrv1';
const sh5=(bg,fb,d,vo,cam,o)=>Object.assign({bg,fb,d,vo,cam:cam||(p=>({cx:.5,cy:.5,z:lerp(1.02,1.12,ease(p))})),fx(){}} ,o||{});
const panL=p=>({cx:lerp(.42,.58,ease(p)),cy:.5,z:1.1}),pushIn=p=>({cx:.5,cy:.48,z:lerp(1.0,1.18,ease(p))}),pullOut=p=>({cx:.5,cy:.5,z:lerp(1.18,1.02,ease(p))});
const shakeFx=(c,tt)=>{if((tt%1.3)<.12)c.shake=3;};

function s5Alive(id){if(S5_VIEW&&S5_VIEW[id]!=null)return S5_VIEW[id];return !!save.heroes[id];}
function s5Catcher(){return s5Alive('rook')?'Rook':s5Alive('bruno')?'Bruno':'The Commander';}

/* ---------- cutscenes (riso art pending: stand-ins via fb) ---------- */
function s5Have(){if(S5_VIEW)return S5_VIEW.squad||S5_SQUAD.filter(id=>s5Alive(id));return S5_SQUAD.filter(id=>save.heroes[id]);}
function s5V(set){const have=s5Have();let best=null,bn=-1;for(const[k,c]of Object.entries(set))if(c.every(id=>have.includes(id))&&c.length>bn){bn=c.length;best=k;}return best;}
const S5ALL=['bruno','blaze','hex','rook','volt'],S5NV=['bruno','blaze','hex','rook'];
function s5IntroList(){return[
  sh5('s5_i1',S5_FB,6,"Frost (radio): \"Anyone out there? I'm on a rooftop in Mega City with a helicopter and no pilot. And I know where there might be a cure.\"",pushIn),
  sh5(s5V({s5_i2_all:S5ALL,s5_i2_nv:S5NV,s5_i2_c:[]}),S5_FB,5,"The way out was through the horde. So they went over it instead.",panL),
  sh5('s5_i3',S5_FB,5,"A grappling line, fired over the wall and into the trees. One by one, they rode it down.",p=>({cx:lerp(.42,.55,ease(p)),cy:lerp(.4,.5,ease(p)),z:lerp(1.05,1.18,ease(p))}),{snd:()=>SND.whoosh()}),
  sh5(s5V({s5_i4_all:S5ALL,s5_i4_cbb:['bruno','blaze'],s5_i4_c:[]}),S5_FB,5.5,"Into the forest, toward a ranger station and anything with wheels.",pushIn),
  sh5('s5_i5',S5_FB2,5,"Then the woods began to scream.",p=>({cx:.55,cy:.5,z:lerp(1.08,1.16,ease(p))}),{snd:()=>{SND.hiss&&SND.hiss();setTimeout(()=>SND.hiss&&SND.hiss(),1400);},fx:shakeFx}),
  sh5(s5V({s5_i6_all:S5ALL,s5_i6_r:S5NV,s5_i6_h:['bruno','blaze','hex'],s5_i6_bb:['bruno','blaze'],s5_i6_b:['bruno'],s5_i6_c:[]}),S5_FB,4.5,"Commander: \"Backs together! They're all around us!\"",pullOut)];}
function s5Squad5(){return s5V({x:S5NV})==='x';}
function s5RitualList(kind){
  if(kind==='hexv')return[
    sh5('s5_r2',S5_FB,6,"Through the trees: a black pool and a ring of Screechers. Above the water, limp, floated Hex. They were turning her.",pushIn,{snd:()=>SND.groan(0,.5)}),
    sh5('s5_r3',S5_FB,6,"Volt: \"They're all standing in water. Give me a second.\"",pushIn,voltMiniShot('hexv'))];
  if(kind==='hext')return[
    sh5('s5_r2',S5_FB,5.5,"Through the trees: a black pool and a ring of Screechers"+(s5Town()?", with Momma somewhere in the dark.":".")+" Above the water floated Hex.",pushIn,{snd:()=>SND.groan(0,.5)}),
    sh5('s5_h2',S5_FB,5.5,"Her eyes opened, and they were green.",pushIn,{fx:shakeFx})];
  const v=s5Alive('volt');return[
    sh5('s5_v1',S5_FB,5.5,"Momma's body lay in a black pool. A ring of Screechers was singing her back.",pushIn,{snd:()=>SND.groan(0,.4)}),
    sh5('s5_v2',S5_FB,v?6:4.5,"Hex: \"They're bringing her back.\""+(v?" Volt: \"Not if I fry the pond first.\"":" Commander: \"Then we put her down again.\""),panL,v?voltMiniShot('mom'):{}),
    ...(v?[]:s5RiseList())];}
function s5RiseList(){return[sh5('s5_l2',S5_FB,5,"Too late. Momma rose out of the pool, bigger and angrier.",pushIn,{snd:()=>SND.groan(0,1),fx:shakeFx}),
  ...(s5Squad5()?[sh5('s5_r1',S5_FB,4.5,"And every Screecher in the woods rose with her.",pullOut)]:[])];}
function voltMiniShot(kind){return{choiceAt:2.4,mini:{kind:'volt',for:kind,branch:won=>won?s5WinList(kind):s5LoseList(kind)},
  fx(c,tt){const g=cine&&cine.mg;if(g&&g.volt){if(g.flashT>0)c.flash(Math.min(.9,g.flashT*1.8));if(g.hold)c.shake=1+g.charge*3;c.glow(.5,.62,.3,.15+.4*g.rit,'182,242,58');}}};}
function voltMiniShow(cf){cine.mg={volt:1,cf,rit:0,charge:0,hold:false,zone:[.62,.86],surges:0,need:3,t:0,spd:1,msg:'',msgT:0,flashT:0};
  const d=document.createElement('div');d.className='cmini';d.style.cssText='position:absolute;inset:0;z-index:4;touch-action:none;cursor:pointer;background:none;border:0;padding:0;transform:none;left:0;top:0;width:auto';
  const lab=cf.for==='hexv'?'TURNING HEX':'MOMMA RETURNS';
  d.innerHTML='<div style="position:absolute;left:50%;top:5%;transform:translateX(-50%);width:52%;text-align:center;font:12px Bungee,Impact,sans-serif;color:#b6f23a;text-shadow:0 1px 0 #000">'+lab+'<div style="height:9px;background:#2a1a22;margin-top:4px;border:1px solid #000"><i class="vr" style="display:block;height:100%;width:0;background:#b6f23a"></i></div></div>'
   +'<div style="position:absolute;right:4%;top:16%;height:56%;width:30px;background:#1a2a33;border:2px solid #efe6dc"><b class="vz" style="position:absolute;left:0;right:0;background:rgba(94,224,138,.9)"></b><b class="vc" style="position:absolute;left:6px;right:6px;bottom:0;height:0;background:#9fe8ff"></b></div>'
   +'<div class="vp" style="position:absolute;right:3%;top:75%;font:16px Bungee,Impact,sans-serif;color:#9fe8ff;letter-spacing:4px"></div>'
   +'<div class="vm" style="position:absolute;left:50%;top:38%;transform:translateX(-50%);font:24px Bungee,Impact,sans-serif;color:#9fe8ff;text-shadow:0 2px 0 #000;white-space:nowrap"></div>'
   +'<div style="position:absolute;left:50%;bottom:24%;transform:translateX(-50%);font:13px Bungee,Impact,sans-serif;color:#efe6dc;background:#0d1016d9;padding:6px 12px;white-space:nowrap">HOLD TO CHARGE · LET GO IN THE GREEN</div>';
  const dn=e=>{e.preventDefault();e.stopPropagation();const g=cine&&cine.mg;if(!g||g.res)return;g.hold=true;try{d.setPointerCapture(e.pointerId);}catch(_){}},
        up=e=>{e.preventDefault();e.stopPropagation();voltRelease();};
  d.addEventListener('pointerdown',dn);d.addEventListener('pointerup',up);d.addEventListener('pointercancel',up);clayer.appendChild(d);voltMiniDom();}
function voltRelease(){const g=cine&&cine.mg;if(!g||g.res||!g.hold)return;g.hold=false;
  if(g.charge>=g.zone[0]&&g.charge<=g.zone[1]){g.surges++;g.rit=Math.max(0,g.rit-.14);g.flashT=.45;SND.shot('zap',0);SND.explosion(.3);g.msg='SURGE '+g.surges+'/'+g.need;g.msgT=1;
    const w=Math.max(.1,.24-g.surges*.05),c0=.42+Math.random()*(.9-w-.42);g.zone=[c0,c0+w];g.spd=1+g.surges*.3;}
  else if(g.charge>.15){g.msg='TOO WEAK';g.msgT=.9;g.rit=Math.min(1,g.rit+.03);SND.click();}
  g.charge=0;voltMiniDom();if(g.surges>=g.need){setTimeout(()=>{if(cine&&cine.mg===g&&!g.res)miniEnd(true);},450);}}
function voltMiniTick(dt){const g=cine.mg;if(!g||g.res)return;g.t+=dt;if(g.flashT>0)g.flashT-=dt;if(g.msgT>0)g.msgT-=dt;
  if(g.surges<g.need){g.rit+=dt/(HORDE()?11:15);
    if(g.hold){g.charge+=dt*(.55+.35*Math.abs(Math.sin(g.t*2.3)))*g.spd;if(g.charge>1.04){g.charge=0;g.hold=false;g.msg='OVERLOAD';g.msgT=1;g.rit=Math.min(1,g.rit+.05);SND.click();}}
    if(g.rit>=1){voltMiniDom();miniEnd(false);return;}}
  voltMiniDom();}
function voltMiniDom(){const g=cine&&cine.mg,d=clayer.querySelector('.cmini');if(!g||!d)return;
  d.querySelector('.vr').style.width=Math.min(100,g.rit*100)+'%';d.querySelector('.vr').style.background=g.rit>.75&&(g.t%.5<.25)?'#ff4d5e':'#b6f23a';
  const z=d.querySelector('.vz');z.style.bottom=(g.zone[0]*100)+'%';z.style.height=((g.zone[1]-g.zone[0])*100)+'%';
  const c=d.querySelector('.vc');c.style.height=Math.min(100,g.charge*100)+'%';c.style.background=g.charge>g.zone[1]?'#ff4d5e':'#9fe8ff';
  d.querySelector('.vp').textContent='●'.repeat(g.surges)+'○'.repeat(g.need-g.surges);
  const m=d.querySelector('.vm');m.textContent=g.msgT>0?g.msg:'';m.style.color=g.msg.startsWith('SURGE')?'#9fe8ff':'#ff4d5e';}
function s5WinList(kind){
  if(kind==='hexv')return[
    sh5('s5_w1',S5_FB,5,"The pool lit up. Every Screecher dropped. So did Momma.",pullOut,{snd:()=>SND.explosion(.6),fx:(c,tt)=>{if(tt<.5)c.shake=6;}}),
    sh5('s5_w2',S5_FB,5,"Hex fell. The Commander caught her before she hit the water.",pushIn),
    sh5('s5_w3',S5_FB,5,"Hex: \"...You came back for me?\" Commander: \"You're with us now.\"",panL)];
  return[sh5('s5_w1',S5_FB,4.5,"The pool lit up. The Screechers dropped where they stood.",pullOut,{snd:()=>SND.explosion(.6),fx:(c,tt)=>{if(tt<.5)c.shake=6;}}),
    sh5('s5_w4',S5_FB,5,"And this time, Momma stayed down.",pushIn)];}
function s5LoseList(kind){
  if(kind==='hexv')return[sh5('s5_h2',S5_FB,5,"Volt's charge died in the water. Hex's eyes snapped open, green.",pushIn,{fx:shakeFx})];
  return s5RiseList();}
function s5HasBruno(){if(S5_VIEW&&S5_VIEW.bruno!=null)return S5_VIEW.bruno;return s5Team().includes('bruno');}
function s5PostList(){const b=s5HasBruno();return[
  sh5(s5V({s5_p5_all:S5ALL,s5_p5_nv:S5NV,s5_p5_c:[]}),S5_FB,5.5,"The ranger station. A garage, a padlock, and behind it, a jeep.",pushIn),
  ...(b?[sh5('s5_p6',S5_FB,3.5,"Bruno: \"I got this.\"",panL,{snd:()=>setTimeout(()=>SND.shot('shotgun',0),2600)}),
         sh5('s5_p2',S5_FB,4,"The lock was gone. So was the quiet.",pushIn),
         sh5('s5_p7',S5_FB,4.5,"Commander: \"Bruno! Every dead thing for a mile heard that.\"",pushIn),
         sh5('s5_p9',S5_FB2,4,"They had. And there was still no key for the jeep.",pullOut,{snd:()=>SND.groan(0,1),fx:shakeFx})]
       :[sh5('s5_p8',S5_FB,4.5,"Locked tight. The keys for the garage and the jeep had to be inside the station.",panL),
         sh5('s5_p9',S5_FB2,4.5,"No noise this time. But the dead always find their way, a few at a time. Commander: \"Hold the garage!\"",pullOut,{snd:()=>SND.groan(0,1),fx:shakeFx})])];}
function s5KeysList(){return[sh5('s5_e0',S5_FB,3.5,"Keys.",pushIn)];}
function s5EndList(){return[
  sh5('s5_e2',S5_FB,6,"The jeep tore out of the garage, through the horde, and onto the road. Next stop: Mega City.",pullOut,{snd:()=>SND.explosion(.4),fx:(c,tt)=>{c.dim(Math.max(0,(tt-4.6)*.7));}})];}

/* ---------- start, checkpoints ---------- */
function s5Ckpt(at){markReach('5',at);save.ckpt={stage:'5',wave:at};persist();}
function s5Base(){roadScroll=0;SX=0;camX=0;forestLoad();
  R={stage:3,forest:1,s5:1,wave:3,wall:0,wallMax:1,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,vx:0,prevSX:SX,dead:[],civ:[],civHide:1,
    queue:[],kills:0,spawnLeft:0,spawnTotal:0,spawnT:2,bossPending:false,crateAt:[],jeepAt:-1,proj:[],sayQ:[]};}
function s5Start(at,skip){at=at||'w1';stageRevive();storyParty(S5_SQUAD);
  for(const id of['cmd',...Object.keys(save.heroes)])if(at==='w1')setHp(id,maxHp(id));for(const id of REVD)if(save.heroes[id])setHp(id,maxHp(id)*.5);REVD=[];
  const av=S5_SQUAD.filter(id=>save.heroes[id]);
  if(at!=='post'&&av.length>MAX_ACTIVE){S5_SP={at,skip,sel:save.active.filter(id=>av.includes(id)).slice(0,MAX_ACTIVE)};state='pick5s';ui();return;}
  save.active=av.slice(0,MAX_ACTIVE);s5Go(at,skip);}
let S5_SP=null;
function s5SquadHTML(){const av=S5_SQUAD.filter(id=>save.heroes[id]),need=Math.min(MAX_ACTIVE,av.length),ok=S5_SP.sel.length===need;
  return `<h2>Stage 5: The Forest Run</h2><div class="stripe"></div><p class="sub">Choose who fights beside the Commander. Everyone else travels with the squad.</p>
  <div class="chips"><button class="chip on" disabled>Commander</button>${av.map(id=>`<button class="chip ${S5_SP.sel.includes(id)?'on':''}" data-act="p5s" data-id="${id}">${HEROES[id].name}</button>`).join('')}</div>
  <p class="sub">${S5_SP.sel.length}/${need} chosen</p><div class="btns"><button class="btn" data-act="p5sgo" ${ok?'':'disabled style="opacity:.4"'}>Into the forest</button></div>`;}
function s5SquadAct(a,b){if(a==='p5s'){const id=b.dataset.id,L=S5_SP.sel;if(L.includes(id))S5_SP.sel=L.filter(x=>x!==id);else if(L.length<MAX_ACTIVE)L.push(id);ui();return;}
  save.active=S5_SP.sel.slice();persist();const{at,skip}=S5_SP;S5_SP=null;s5Go(at,skip);}
function s5Go(at,skip){
  s5Base();sideLoad();
  if(at==='rit'){s5Ritual();return;}
  if(at==='post'){s5Post();return;}
  if(!skip){const L=s5IntroList();cineLoad(L);startIntro(s5Wave1,L);return;}
  s5Wave1();}
function s5Wave1(){R.s5ph='w1';R.wave=3;s5Ckpt('w1');SND.alarm();
  const H2=HORDE()?2:1,q=[],add=(ty,n)=>{for(let i=0;i<n*H2;i++)q.push(ty);};
  add('grunt',45);add('runner',20);add('armored',10);add('screecher',12);shuf(q);
  for(const z of[.35,.75])q.splice(Math.floor(q.length*z),0,'brute');
  // the Screechers close the circle first
  for(let i=0;i<12*H2;i++){const e=mkEnemy('screecher',(i/(12*H2-1)*2-1)*(LANE_E-20),820+Math.random()*300);}
  R.queue=q;R.kills=0;R.spawnLeft=q.length;R.spawnTotal=q.length;R.spawnT=3;
  R.banner={txt:'STAGE 5: THE FOREST RUN · WAVE 1',t:2.6,col:'#ffc53d'};R.say=null;state='play';ui();last=performance.now();}
function s5Tick3(dt){if(R.say&&R.say.t!=null){R.say.t-=dt;if(R.say.t<=0)R.say=null;}if(!R.say&&R.sayQ&&R.sayQ.length)R.say=R.sayQ.shift();}
function s5WaveDone(){if(R.s5Done)return;R.s5Done=1;SND.waveClear();healRecovery();persist();
  if(R.s5ph==='w1'){setTimeout(s5Ritual,1200);return;}
  if(R.s5ph==='fight'){const won=1;setTimeout(()=>{R.banner=null;s5AfterFight();},1500);}}

/* ---------- the ritual ---------- */
function s5Kind(){if(s5Alive('hex'))return'mom';if(s5Town())return s5Alive('volt')?'hexv':'hext';return'hext';}
function s5Ritual(){s5Base();R.s5ph='rit';s5Ckpt('rit');const k=R.s5kind=s5Kind(),L=s5RitualList(k);cineLoad(L);cineLoad(s5WinList(k).concat(s5LoseList(k)));
  cine0pick=null;cineLastMini=null;
  startIntro(()=>{const res=cineLastMini;cineLastMini=null;cine0pick=null;
    if(res==='won'){s5VoltWon(k);s5Post();}
    else if(res==='lost')s5Fight(k==='hexv'?'both':'mom');
    else s5Fight(k==='mom'?'mom':s5Town()?'both':'hex');},L);}
function s5VoltWon(k){story('volt_pool',{won:true,kind:k});
  if(k==='hexv'){const lvs=[save.cmd,...save.active.map(h=>save.heroes[h].lv)],lv=Math.round(lvs.reduce((a,b)=>a+b,0)/lvs.length);
    const src=save.away&&save.away.hex;save.heroes.hex=src?{lv:src.lv,xp:src.xp||0,hp:null}:{lv:Math.max(lv,JOIN_LV.hex||1),xp:0,hp:null};if(save.away)delete save.away.hex;
    save.fallen=(save.fallen||[]).filter(h=>h!=='hex');delete save.hexTurned;story('hero_joined',{hero:'hex',where:'stage5'});setHp('hex',maxHp('hex'));}
  persist();}
function s5Fight(kind){s5Base();R.s5ph='fight';R.s5fight=kind;R.wave=4;const H2=HORDE()?2:1,q=[];
  const nS=(kind==='hex'?14:kind==='both'?16:18)*H2;for(let i=0;i<nS;i++)q.push('screecher');
  for(let i=0;i<6*H2;i++)q.push('grunt');shuf(q);
  if(kind!=='hex'){spawnMomma();const m=R.en[R.en.length-1];m.sumT=3;m.thrT=2;m.callT=12;if(kind==='mom'){m.hp=m.max=m.max*1.5;m.enr=1;m.callT=8;m.reborn=1;}}
  if(kind!=='mom')s5SpawnHex(kind==='both'?160:0);
  R.queue=q;R.kills=0;R.spawnLeft=q.length;R.spawnTotal=q.length;R.spawnT=4;
  R.banner={txt:kind==='mom'?'MOMMA, REBORN':kind==='both'?'MOMMA AND HEX':'HEX',t:2.6,col:'#ff4d5e'};SND.groan(0,1);state='play';ui();last=performance.now();}
function s5AfterFight(){const k=R.s5fight;
  if(k!=='mom'&&!save.hexTurned){save.hexTurned=1;story('hex_turned',{route:s5Town()?'town':'forest'});}
  persist();s5Post();}

/* ---------- turned Hex, as an enemy ---------- */
const HEXZ_HP=3200;
function s5SpawnHex(x){const hp=HEXZ_HP*ENEMY_K*(HORDE()?1.4:1);
  R.en.push({type:'hexz',hp,max:hp,spd:40*SPD,r:34,gold:40,xp:120,col:'#c9a7ff',x:x||0,z:ZFAR+40,slow:0,burn:0,bdps:0,stun:0,wob:0,dmg:0,armor:1,boltT:2.5,blinkT:8,callT:11,blink:0});}
function hexzAI(e,dt){if(e.blink>0)e.blink-=dt;if(e.castT>0)e.castT-=dt;
  let sp=e.spd;if(e.slow>0){e.slow-=dt;sp*=e.slowAmt||.5;}
  if(e.z>520)e.z-=sp*dt;else e.x+=Math.sin(t*.9+e.wob)*30*dt;
  if(e.z>ZFAR)return;
  e.boltT-=dt;e.blinkT-=dt;e.callT-=dt;
  if(!e.enr&&e.hp<e.max*.5){e.enr=1;R.banner={txt:'HEX SCREAMS',t:2.2,col:'#ff4d5e'};SND.hiss&&SND.hiss();R.shake=.3;}
  if(e.boltT<=0){e.boltT=e.enr?1.5:2.3;e.castT=.55;R.hb=R.hb||[];const sq=squad();const n=e.enr?2:1;
    for(let i=0;i<n;i++){const m=sq[Math.floor(Math.random()*sq.length)];if(!m)break;const tx=m.x+(Math.random()-.5)*30,tz=m.z+10;R.hb.push({x0:e.x,z0:e.z,x:e.x,z:e.z,x1:tx,z1:tz,h:90,t:-i*.2,T:Math.hypot(tx-e.x,tz-e.z)/700});}SND.shot('zap',e.x/600);}
  if(e.blinkT<=0){e.blinkT=e.enr?5.5:8;burst(e.x,e.z,40,'#c9a7ff',14);e.x=(Math.random()*2-1)*(LANE_E-40);e.z=460+Math.random()*220;e.blink=.4;burst(e.x,e.z,40,'#c9a7ff',14);SND.whoosh();}
  if(e.callT<=0){e.callT=e.enr?9:12;for(let k=0;k<3;k++){const m=mkEnemy('screecher',e.x+(k-1)*70,e.z-20);m.z=e.z-20;}}}
function s5Fx(dt){if(!R.hb)return;
  for(const p of R.hb){p.t+=dt;if(p.t<0)continue;const q=Math.min(1,p.t/p.T);p.x=p.x0+(p.x1-p.x0)*q;p.z=p.z0+(p.z1-p.z0)*q;p.h=90-50*q;
    if(q>=1&&!p.done){p.done=1;burst(p.x,p.z,30,'#c9a7ff',10);R.hstun=R.hstun||{};for(const m of squad())if(Math.abs(m.x-p.x)<50&&Math.abs(m.z-p.z)<44){hurtMember(m.id,12/HURT_K);if(!(R.hstun[m.id]>-2)){R.hstun[m.id]=1.2;}}}}
  R.hb=R.hb.filter(p=>!p.done);}
function drawHexBody(sx,sy,sc,alpha,lim){if(!SIDEM.hex)return false;ctx.save();ctx.globalAlpha=alpha;ctx.translate(sx,sy);ctx.scale(sc,sc);ctx.translate(0,-(GY+2));
  ctx.filter=lim?'saturate(.5) brightness(.9)':'hue-rotate(70deg) saturate(1.5) brightness(1.1)';sd('hex',lim?'idle':'shoot',lim?1:Math.floor(t*6),0,true);ctx.restore();return true;}
function drawHexZ(e){const[sx,sy,k]=P(e.x,e.z),fade=Math.max(0,Math.min(1,(ZFAR+130-e.z)/160)),hov=(18+Math.sin(t*2.2)*7)*k,M=META.hexz;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.1*k,e.r*.3*k,0,0,6.283);ctx.fill();
  const g=ctx.createRadialGradient(sx,sy-hov-CHAR_H*.6*k,4,sx,sy-hov-CHAR_H*.6*k,CHAR_H*k);g.addColorStop(0,'rgba(182,242,58,.3)');g.addColorStop(1,'rgba(182,242,58,0)');ctx.fillStyle=g;ctx.fillRect(sx-CHAR_H*k,sy-hov-CHAR_H*1.6*k,CHAR_H*2*k,CHAR_H*2*k);
  if(!M||!atlasReady){ctx.fillStyle='#7a3fa0';ctx.beginPath();ctx.ellipse(sx,sy-hov-40*k,20*k,40*k,0,0,6.283);ctx.fill();return;}
  let fr;if(e.blink>0)fr=M.vanish[Math.min(3,Math.floor((1-e.blink/.4)*4))];else if(e.castT>0)fr=M.cast[Math.min(5,Math.floor((1-e.castT/.55)*6))];else if(e.hitT>0)fr=M.hit[e.hitT>.12?0:1];else fr=M.idle[Math.floor(t*7+e.wob*3)%M.idle.length];
  const sc=k*e.r*EH/EBODY*1.35;drawFrame(fr,sx,sy-hov,sc,fade);
  if(e.flash>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,sx,sy-hov,sc,.4);ctx.globalCompositeOperation='source-over';}}
function drawHexBolt(p){if(p.t<0)return;const[sx,sy,k]=P(p.x,p.z,p.h),r=Math.max(3,14*k);const g=ctx.createRadialGradient(sx,sy,1,sx,sy,r*1.8);g.addColorStop(0,'#ffffff');g.addColorStop(.4,'#b6f23a');g.addColorStop(1,'rgba(182,242,58,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,r*1.8,0,6.283);ctx.fill();}
function s5Draw(){if(R.hb)for(const p of R.hb)drawHexBolt(p);
  const h=R.en.find(e=>e.type==='hexz'&&e.z<ZFAR),m=R.en.find(e=>e.type==='momma'&&e.z<ZFAR);
  if(h&&m){const w=WW*.3,x=WW/2-w/2,y=98;ctx.fillStyle='#0b080ecc';ctx.fillRect(x-4,y-12,w+8,22);ctx.fillStyle='#c9a7ff';ctx.font='10px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('HEX',WW/2,y-2);ctx.fillStyle='#2a1a22';ctx.fillRect(x,y+2,w,5);ctx.fillStyle='#c9a7ff';ctx.fillRect(x,y+2,w*Math.max(0,h.hp/h.max),5);}}
function s5HexDown(e){burst(e.x,e.z,60,'#c9a7ff',24);SND.explosion(.6);R.shake=.5;R.banner={txt:'HEX IS GONE',t:2.6,col:'#c9a7ff'};story('turned_hex_defeated',{});}

/* ---------- Volt's mini-game: electrify the pool ---------- */
function vmgStart(kind){s5Base();R.s5ph='vmg';R.civHide=1;
  const ring=[];for(let i=0;i<10;i++){const a=i/10*6.283;ring.push({x:Math.cos(a)*240,z:170+Math.sin(a)*45,ph:Math.random()*6,dead:0});}
  R.vmg={kind,ph:'go',rit:0,charge:0,hold:false,zone:[.7,.9],surges:0,need:3,t:0,flashT:0,msg:null,msgT:0,ring,endT:0,spd:1,bolt:0};
  R.banner={txt:'ELECTRIFY THE POOL',t:2.4,col:'#9fe8ff'};state='volt';ui();last=performance.now();}
function vmgDown(){const V=R.vmg;if(!V||V.ph!=='go')return;V.hold=true;}
function vmgUp(){const V=R.vmg;if(!V||V.ph!=='go'||!V.hold)return;V.hold=false;
  if(V.charge>=V.zone[0]&&V.charge<=V.zone[1]){V.surges++;V.rit=Math.max(0,V.rit-.14);V.flashT=.45;V.bolt=.5;R.shake=.35;SND.shot('zap',0);SND.explosion(.3);
    for(const s of V.ring)s.hit=.5;V.msg='SURGE '+V.surges+'/'+V.need;V.msgT=1;
    const w=Math.max(.09,.2-V.surges*.04),c0=.45+Math.random()*(.88-w-.45);V.zone=[c0,c0+w];V.spd=1+V.surges*.3;
    if(V.surges>=V.need){V.ph='final';V.endT=0;V.msg=null;}}
  else if(V.charge>.15){V.msg='TOO WEAK';V.msgT=.9;V.rit=Math.min(1,V.rit+.03);SND.click();}
  V.charge=0;}
function vmgUpdate(dt){const V=R.vmg;if(!V)return;dt=Math.max(0,Math.min(dt,.1));V.t+=dt;t+=dt;if(R.shake>0)R.shake-=dt;if(V.flashT>0)V.flashT-=dt;if(V.bolt>0)V.bolt-=dt;if(V.msgT>0)V.msgT-=dt;
  if(R.banner){R.banner.t-=dt;if(R.banner.t<=0)R.banner=null;}
  for(const s of V.ring){s.ph+=dt;if(s.hit>0)s.hit-=dt;}
  if(V.ph==='go'){V.rit+=dt/(HORDE()?11:15);
    if(V.hold){V.charge+=dt*(.55+.35*Math.abs(Math.sin(V.t*2.3)))*V.spd;if(V.charge>1.04){V.charge=0;V.hold=false;V.msg='OVERLOAD';V.msgT=1;V.rit=Math.min(1,V.rit+.05);SND.click();R.shake=.2;}}
    if(V.rit>=1){V.ph='fail';V.endT=0;SND.groan(0,1);R.shake=.5;}}
  else if(V.ph==='final'){V.endT+=dt;V.bolt=.3;if(V.endT<1.6){R.shake=.3;if(Math.random()<dt*8)SND.shot('zap',(Math.random()-.5));}
    for(const s of V.ring)if(V.endT>.6+s.ph%1*.6)s.dead=Math.min(1,(s.dead||0)+dt*2);
    if(V.endT>2.6){V.ph='done';s5VoltWin();}}
  else if(V.ph==='fail'){V.endT+=dt;if(V.endT>1.4){V.ph='done';s5VoltLose();}}}
function s5VoltWin(){const k=R.vmg.kind;story('volt_pool',{won:true,kind:k});
  if(k==='hexv'){const lvs=[save.cmd,...save.active.map(h=>save.heroes[h].lv)],lv=Math.round(lvs.reduce((a,b)=>a+b,0)/lvs.length);
    const src=save.away&&save.away.hex;save.heroes.hex=src?{lv:src.lv,xp:src.xp||0,hp:null}:{lv:Math.max(lv,JOIN_LV.hex||1),xp:0,hp:null};if(save.away)delete save.away.hex;
    save.fallen=(save.fallen||[]).filter(h=>h!=='hex');delete save.hexTurned;story('hero_joined',{hero:'hex',where:'stage5'});setHp('hex',maxHp('hex'));}
  persist();const L=s5WinList(k);cineLoad(L);startIntro(()=>{R.vmg=null;s5Post();},L);}
function s5VoltLose(){const k=R.vmg.kind;story('volt_pool',{won:false,kind:k});const L=s5LoseList(k);cineLoad(L);
  startIntro(()=>{R.vmg=null;s5Fight(k==='hexv'?'both':'mom');},L);}
function drawVoltMG(){const V=R.vmg;if(!V)return;
  // the pool
  const[px,py,pk]=P(0,170);ctx.save();
  ctx.fillStyle=V.flashT>0?'rgba(200,240,255,'+(.4+V.flashT)+')':'#0b1a22';ctx.beginPath();ctx.ellipse(px,py,290*pk,70*pk*.55,0,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(159,232,255,.25)';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const q=(((V.t*.4+i/3)%1)+1)%1;ctx.globalAlpha=1-q;ctx.beginPath();ctx.ellipse(px,py,290*pk*q,38*pk*q,0,0,6.283);ctx.stroke();}ctx.globalAlpha=1;
  // Momma: standing in the ritual (town) or lying in the water (forest)
  const MM=META.momma;if(MM&&atlasReady){const[mx,my,mk]=P(0,235),sc=mk*62*EH/EBODY*1.7;
    if(V.kind==='hexv'){const A=MM.summon||MM.walk;const fr=V.ph==='final'&&V.endT>1?MM.death[Math.min(MM.death.length-1,Math.floor((V.endT-1)*6))]:A[Math.floor(V.t*4)%A.length];drawFrame(fr,mx,my,sc,1);}
    else{const D=MM.death,tw=V.rit>.55&&V.ph==='go'?Math.floor(V.t*8)%2:0;drawFrame(D[Math.max(0,D.length-1-tw-(V.ph==='fail'?Math.min(D.length-1,Math.floor(V.endT*5)):0))],mx,my,sc,1);
      const g=ctx.createRadialGradient(mx,my-20*mk,4,mx,my-20*mk,160*mk);g.addColorStop(0,'rgba(182,242,58,'+(.15+.35*V.rit)+')');g.addColorStop(1,'rgba(182,242,58,0)');ctx.fillStyle=g;ctx.fillRect(mx-160*mk,my-180*mk,320*mk,320*mk);}}
  // Hex above the water
  if(V.kind==='hexv'){const[hx,hy,hk]=P(0,190,110+Math.sin(V.t*1.6)*8),sc=CHAR_H*1.2*hk/(100*SK);
    ctx.save();ctx.translate(hx,hy);ctx.rotate(Math.PI/2*.9);ctx.translate(-hx,-hy);drawHexBody(hx,hy+40*hk,sc,1,true);ctx.restore();
    const g=ctx.createRadialGradient(hx,hy,4,hx,hy,90*hk);g.addColorStop(0,'rgba(182,242,58,'+(.2+.5*V.rit)+')');g.addColorStop(1,'rgba(182,242,58,0)');ctx.fillStyle=g;ctx.fillRect(hx-90*hk,hy-90*hk,180*hk,180*hk);}
  // the ring of Screechers, chanting
  const SM=META.screecher;const order=V.ring.slice().sort((a,b)=>b.z-a.z);
  for(const s of order){const[sx,sy,k]=P(s.x,s.z);const sc=k*22*EH/EBODY;if(!SM||!atlasReady)continue;
    if(s.dead){drawFrame(SM.death[Math.min(SM.death.length-1,Math.floor(s.dead*SM.death.length))],sx,sy,sc,Math.max(0,1-(s.dead-.8)*5));continue;}
    const A=s.hit>0?SM.hit:SM.attack||SM.walk;drawFrame(A[Math.floor(s.ph*(s.hit>0?14:5))%A.length],sx+(s.hit>0?(Math.random()-.5)*4:0),sy,sc,1);
    if(V.kind==='hexv'&&V.ph==='go'){const[hx,hy]=P(0,190,110);ctx.strokeStyle='rgba(182,242,58,'+(.12+.2*V.rit)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(sx,sy-40*k);ctx.lineTo(hx,hy);ctx.stroke();}}
  // lightning from Volt (bottom left) into the pool
  const vx=WW*.16,vy=WH-10;
  if(V.hold||V.bolt>0||V.ph==='final'){const n=V.bolt>0||V.ph==='final'?3:1;ctx.strokeStyle=V.bolt>0?'#ffffff':'#9fe8ff';ctx.shadowColor='#6aa8ff';ctx.shadowBlur=14;ctx.lineWidth=V.bolt>0?4:2;
    for(let b=0;b<n;b++){const tx=px+(Math.random()-.5)*360*pk,ty=py+(Math.random()-.5)*30*pk,ex=V.hold&&!V.bolt?vx+40+V.charge*120:tx,ey=V.hold&&!V.bolt?vy-150-V.charge*40:ty;
      ctx.beginPath();ctx.moveTo(vx+40,vy-120);for(let q=1;q<=8;q++){const f=q/8;ctx.lineTo(lerp(vx+40,ex,f)+(Math.random()-.5)*22,lerp(vy-120,ey,f)+(Math.random()-.5)*22);}ctx.stroke();}
    ctx.shadowBlur=0;
    if(V.bolt>0||V.ph==='final')for(const s of V.ring){if(s.dead>=1)continue;const[sx,sy,k]=P(s.x,s.z);ctx.strokeStyle='#cfe6ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(sx,sy);for(let q=0;q<4;q++)ctx.lineTo(sx+(Math.random()-.5)*20*k,sy-q*14*k);ctx.stroke();}}
  ctx.save();ctx.translate(vx,vy);ctx.scale(1.5,1.5);ctx.translate(0,-(GY+2));sd('volt',V.hold||V.bolt>0?'shoot':'idle',Math.floor(V.t*(V.hold?12:6)),0,false);ctx.restore();
  ctx.restore();
  // HUD
  const w=WW*.5,x=WW/2-w/2,y=24;ctx.fillStyle='#0b080ecc';ctx.fillRect(x-4,y-14,w+8,28);ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';
  ctx.fillText(V.kind==='hexv'?'TURNING HEX':'MOMMA RETURNS',WW/2,y-2);ctx.fillStyle='#2a1a22';ctx.fillRect(x,y+3,w,7);ctx.fillStyle=V.rit>.75&&(t%.5<.25)?'#ff4d5e':'#b6f23a';ctx.fillRect(x,y+3,w*Math.min(1,V.rit),7);
  const mx=WW-52,mh=WH*.56,my=WH*.2;ctx.fillStyle='#0b080ecc';ctx.fillRect(mx-6,my-6,34,mh+12);ctx.fillStyle='#1a2a33';ctx.fillRect(mx,my,22,mh);
  ctx.fillStyle='rgba(94,224,138,.85)';ctx.fillRect(mx,my+mh*(1-V.zone[1]),22,mh*(V.zone[1]-V.zone[0]));
  ctx.fillStyle=V.charge>V.zone[1]?'#ff4d5e':'#9fe8ff';ctx.fillRect(mx+5,my+mh*(1-Math.min(1,V.charge)),12,mh*Math.min(1,V.charge));
  ctx.strokeStyle='#efe6dc';ctx.lineWidth=2;ctx.strokeRect(mx,my,22,mh);
  for(let i=0;i<V.need;i++){ctx.fillStyle=i<V.surges?'#9fe8ff':'#2a3a44';ctx.beginPath();ctx.arc(mx+11,my+mh+22+i*16,5,0,6.283);ctx.fill();}
  if(V.ph==='go'){ctx.fillStyle='#efe6dc';ctx.font='13px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.globalAlpha=V.t<4?1:.55+.45*Math.sin(t*4);ctx.fillText('HOLD TO CHARGE · LET GO IN THE GREEN',WW/2,WH-22);ctx.globalAlpha=1;}
  if(V.msgT>0&&V.msg){ctx.globalAlpha=Math.min(1,V.msgT*2);ctx.fillStyle=V.msg.startsWith('SURGE')?'#9fe8ff':'#ff4d5e';ctx.font='20px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(V.msg,WW/2,HOR+40);ctx.globalAlpha=1;}
  if(V.flashT>0){ctx.fillStyle='rgba(220,245,255,'+(V.flashT*.6)+')';ctx.fillRect(0,0,WW,WH);}}

/* ---------- the ranger post (side-scroller) ---------- */
const FLOORS_5={1:{len:2000,start:300,dir:1},2:{len:1500,start:110,dir:1}};
const S5OUT=new Image(),S5IN=new Image(),S5FURN=new Image(),S5JEEP=new Image();
function s5ArtLoad(){if(S5OUT.src||!'assets/s5out.webp?v=4a47954f52')return;S5OUT.src='assets/s5out.webp?v=4a47954f52';S5IN.src='assets/s5in.webp?v=bcd4a6672a';S5FURN.src='assets/s5furn.webp?v=bc1f1da113';S5JEEP.src='assets/s5jeep.webp?v=2a18a6a99c';}
const s5ok=i=>i.complete&&i.naturalWidth>0;
/* furniture sheet boxes at full size (sheet is stored at half size) */
const S5F={desk:[138,30,591,324],cabinet:[728,25,884,329],locker:[1029,25,1192,329],shelf:[1309,26,1640,323],trunk:[1743,175,2034,323],drawers:[188,440,497,692],table:[643,422,1040,690],gunrack:[1184,361,1496,698],window:[1669,374,1955,657]};
function s5fur(k,x,base,sc,alpha){const b=S5F[k];if(!b||!s5ok(S5FURN))return false;const w=(b[2]-b[0])*sc,h=(b[3]-b[1])*sc;ctx.globalAlpha=alpha==null?1:alpha;ctx.drawImage(S5FURN,b[0]/2,b[1]/2,(b[2]-b[0])/2,(b[3]-b[1])/2,x-w/2,base-h,w,h);ctx.globalAlpha=1;return true;}
const S5_ITEMS=[['desk','DESK'],['cabinet','FILE CABINET'],['locker','LOCKER'],['shelf','BOOKSHELF'],['trunk','FOOTLOCKER'],['drawers','DRESSER'],['table','MAP TABLE'],['gunrack','GUN CABINET']];
let S5_PICK=null;
function s5Team(){return['cmd',...S5_SQUAD.filter(id=>save.heroes[id])];}
function s5Post(){s5Base();s5ArtLoad();R.s5ph='post';s5Ckpt('post');const L=s5PostList();cineLoad(L);
  startIntro(()=>{R.s5ret=0;R.clockStop=0;const T=s5Team();R.s5keys=s5HasBruno()?1:2;R.clock=R.s5keys>1?480:HORDE()?180:300;
    if(T.length===2&&T.includes('bruno')){R.s5go=['cmd'];R.s5jeep=['bruno'];R.clock=60;s5Outside();return;}
    if(T.length<=2){R.s5go=T.slice();R.s5jeep=[];s5Outside();return;}
    S5_PICK=[];state='pick5';ui();},L);}
function s5PickHTML(){const T=s5Team(),ok=S5_PICK.length===2,nm=id=>id==='cmd'?'Commander':HEROES[id].name;
  return `<h2>The ranger station</h2><div class="stripe"></div><p class="sub">Two go to the station for ${R.s5keys>1?'the jeep key and the garage key':'the jeep key'}. Everyone else holds the ${R.s5keys>1?'garage':'jeep'}. You have ${fmtClock(R.clock)} before the horde overruns them, and everyone with them.</p>
  <div class="chips">${T.map(id=>`<button class="chip ${S5_PICK.includes(id)?'on':''}" data-act="p5" data-id="${id}">${nm(id)}</button>`).join('')}</div>
  <p class="sub">${S5_PICK.length}/2 chosen</p><div class="btns"><button class="btn" data-act="p5go" ${ok?'':'disabled style="opacity:.4"'}>Go</button></div>`;}
function s5GuardHTML(){const T=R.s5go,nm=id=>id==='cmd'?'Commander':HEROES[id].name;
  return `<h2>At the door</h2><div class="stripe"></div><p class="sub">One stands guard outside. The other goes in and searches. Who guards the door?</p>
  <div class="btns">${T.map(id=>`<button class="btn ghost" data-act="g5" data-id="${id}">${nm(id)} guards</button>`).join('')}</div>`;}
function s5PickAct(a,b){
  if(a==='p5'){const id=b.dataset.id;if(S5_PICK.includes(id))S5_PICK=S5_PICK.filter(x=>x!==id);else if(S5_PICK.length<2)S5_PICK.push(id);ui();return true;}
  if(a==='p5go'){R.s5go=S5_PICK.slice();R.s5jeep=s5Team().filter(id=>!R.s5go.includes(id));s5Outside();return true;}
  if(a==='g5'){const g=b.dataset.id;R.s5guard={id:g};R.s5in=R.s5go.filter(x=>x!==g)[0];R.sideActive=R.s5in;sideStart(2);return true;}
  return false;}
function s5Outside(){cineLoad(s5KeysList());story('ranger_post',{go:R.s5go,jeep:R.s5jeep});R.sideActive=R.s5go[0];sideStart(1);
  R.sayQ.push({who:R.s5go[0]==='cmd'?'cmd':R.s5go[0],txt:R.s5go.length>1?"Station's on the right. Move!":R.s5keys>1?"I'll find the keys. Hold them off!":"I'll find it. Hold them off!",t:3});}
function s5Members(){const S=R.side;if(!S)return['cmd'];const L=S.floor===2?[R.s5in]:R.s5go;return L.filter(id=>id==='cmd'||save.heroes[id]);}
function s5Floor(S,f,F,H){S.items=[];S.wins=[];S.grab=null;
  if(f===1&&R.s5ret){S.postX=F.len-260;S.rev=1;S.x=S.postX-30;S.face=-1;S.garX=s5GarX();
    const n=Math.round((R.s5keys>1?6:12)*H);for(let i=0;i<n;i++)S.trig.push({x:S.postX-200-i*(S.postX-S.garX-300)/n-Math.random()*60,side:i%4===3?1:-1,type:'grunt'});
    S.trickT=3;R.banner={txt:'KEYS IN HAND · BACK TO THE GARAGE',t:2.6,col:'#b6f23a'};}
  else if(f===1){S.postX=F.len-260;
    const n=Math.round((R.s5keys>1?9:18)*H);for(let i=0;i<n;i++)S.trig.push({x:520+i*(S.postX-700)/n+Math.random()*60,side:i%5===4?-1:1,type:'grunt'});
    S.trickT=5;R.banner={txt:'GET TO THE STATION',t:2.4,col:'#ffc53d'};}
  else{const it=S5_ITEMS.slice().sort(()=>Math.random()-.5),ks=[0,1,2,3,4,5,6,7].sort(()=>Math.random()-.5).slice(0,R.s5keys||1);S.found=0;
    for(let i=0;i<it.length;i++){const ki=ks.indexOf(i);S.items.push({x:200+i*163+(Math.random()-.5)*30,k:it[i][0],name:it[i][1],key:ki<0?null:ki===0?'JEEP KEY':'GARAGE KEY',done:0});}
    for(const wx of[280,681,1390])S.wins.push({x:wx,broke:0});
    S.winT=4;S.doorT=0;R.banner={txt:(R.s5keys>1?'FIND BOTH KEYS':'FIND THE JEEP KEY')+' · MELEE TO SEARCH',t:3,col:'#ffc53d'};
    if(R.s5guard)R.sayQ.push({who:R.s5guard.id,txt:"I've got the door. Be quick.",t:2.6});}}
function s5Bounds(S){return S.floor===1?[60,S.postX]:[70,S.len-60];}
function s5Tick(dt){if(R.say&&R.side){}if(!R.say&&R.sayQ&&R.sayQ.length)R.say=R.sayQ.shift();
  if(!R.clockStop&&R.side){R.clock-=dt;if(R.clock<=0&&!R.over){R.clock=0;R.over=true;R.s5Swarm=1;story('party_overrun',{where:'ranger_post'});gameOver();}}}
/* zombies that come through the windows grab whoever is searching */
function s5ZAI(e,S,dt){if(!e.win)return false;
  if(e.inT>0){e.inT-=dt;return true;}
  const d=S.x-e.x,ad=Math.abs(d);e.face=Math.sign(d)||1;
  if(S.grab===e){e.atkT-=dt;if(e.atkT<=0){e.atkT=.8;sideHurt(S.active,4);}return true;}
  if(ad>e.w+18){e.x+=e.face*e.spd*dt;return true;}
  if(!S.grab&&!S.search){S.grab=e;S.lock=1;e.atkT=.5;R.banner={txt:'GRABBED · SHOOT IT OFF',t:1.6,col:'#ff4d5e'};SND.groan(0,.6);}
  else{e.atkT-=dt;if(e.atkT<=0){e.atkT=1.1;sideHurt(S.active,5);}}
  return true;}
function s5Update(S,dt){
  if(S.grab&&S.grab.dead){S.grab=null;S.lock=0;}
  if(S.floor===1){
    S.trickT-=dt;if(S.trickT<=0){S.trickT=(HORDE()?2.2:3.2)*(R.s5keys>1?2:1)*(.7+Math.random()*.6);const side=Math.random()<.75?(S.rev?-1:1):(S.rev?1:-1);sideEnemy('grunt',side>0?S.cam+WW+40:S.cam-40,{aggro:1});}
    s5GarageFire(S,dt);
    if(S.rev){if(S.x<=S.garX+8&&!R.clockStop)s5Arrive(S);}
    else if(S.x>=S.postX-4&&S.exitT<0){S.exitT=.9;S.entering=1;SND.whoosh();}
    return false;}
  if(R.s5ret&&S.x<=78&&S.exitT<0){S.exitT=.9;S.entering=1;SND.whoosh();}
  // inside: searching, windows, the guard
  if(S.search){S.search.t+=dt;if(S.search.t>=.9){const it=S.search.it;it.done=1;S.lock=0;S.search=null;
      if(it.key){S.found++;R.tx.push({sx:it.x,txt:it.key+'!',t:1.6,col:'#b6f23a'});SND.levelUp();if(S.found>=(R.s5keys||1)){s5KeyFound(S);return false;}R.banner={txt:it.key+' · '+(R.s5keys-S.found)+' TO GO',t:2,col:'#b6f23a'};return false;}R.tx.push({sx:it.x,txt:'NOTHING',t:1.1,col:'#efe6dc'});SND.click();}}
  S.winT-=dt;if(S.winT<=0){S.winT=(HORDE()?3.4:5)*(R.s5keys>1?1.8:1)*(.75+Math.random()*.5);const vis=S.wins.filter(w=>w.x>S.cam+40&&w.x<S.cam+WW-40);const w=vis[Math.floor(Math.random()*vis.length)];
    if(w){w.broke=1;w.shard=.6;const z=sideEnemy('grunt',w.x,{aggro:1,win:1,inT:.55});if(z.type==='runner'){z.type='grunt';z.hp=z.max=185;z.spd=46;z.hd=7;}z.spd=60;SND.explosion(.2);
      for(let i=0;i<14;i++)S.fx.push({x:w.x+(Math.random()-.5)*50,y:GY-150+Math.random()*60,vx:(Math.random()-.5)*220,vy:-40-Math.random()*100,t:.8,col:'#cfe6ff'});}}
  for(const w of S.wins)if(w.shard>0)w.shard-=dt;
  for(const q of R.tx)if(q.sx!=null)q.t-=dt;R.tx=R.tx.filter(q=>q.sx==null||q.t>0);
  return false;}
function s5GuardFalls(id){R.banner={txt:(id==='cmd'?'THE COMMANDER':HEROES[id].name.toUpperCase())+' IS DOWN AT THE DOOR',t:3,col:'#ff4d5e'};SND.heroDown();
  if(id==='cmd'){R.over=true;gameOver();return;}
  if(!HORDE()){save.downed=save.downed||{};save.downed[id]={lv:save.heroes[id].lv,xp:save.heroes[id].xp};}
  story(HORDE()?'hero_died':'hero_down',{hero:id,level:save.heroes[id].lv,where:'ranger_post'});
  delete save.heroes[id];save.active=save.active.filter(h=>h!==id);if(!save.fallen.includes(id))save.fallen.push(id);persist();}
function s5Fall(id){const S=R.side;if(id==='cmd'){R.over=true;gameOver();return;}
  if(!HORDE()){save.downed=save.downed||{};save.downed[id]={lv:save.heroes[id].lv,xp:save.heroes[id].xp};}
  story(HORDE()?'hero_died':'hero_down',{hero:id,level:save.heroes[id].lv,where:'ranger_post'});
  delete save.heroes[id];save.active=save.active.filter(h=>h!==id);if(!save.fallen.includes(id))save.fallen.push(id);
  SND.heroDown();R.banner={txt:HEROES[id].name.toUpperCase()+(HORDE()?' HAS FALLEN':' IS DOWN'),t:3,col:'#ff4d5e'};persist();
  const left=s5Members();if(!left.length){R.over=true;R.s5NoOne=1;gameOver();return;}
  if(S.floor===2&&R.s5guard&&!R.s5guard.down){R.s5in=R.s5guard.id;R.s5guard=null;R.banner={txt:HEROES[id].name.toUpperCase()+' IS DOWN · '+(R.s5in==='cmd'?'COMMANDER':HEROES[R.s5in].name.toUpperCase())+' TAKES OVER',t:3,col:'#ff4d5e'};}
  S.active=s5Members()[0];S.grab=null;S.lock=0;S.search=null;}
function s5Melee(S){if(S.floor!==2||S.grab)return false;const it=S.items.find(i=>!i.done&&Math.abs(i.x-S.x)<70);if(!it)return false;
  S.search={it,t:0};S.lock=1;S.melA=.35;S.anT=.35;S.melT=.9;SND.click();return true;}
function s5KeyFound(S){R.s5ret=1;S.lock=1;SND.waveClear();story('jeep_key_found',{left:Math.round(R.clock)});
  for(const it of S.items)it.done=1;for(const e of S.en)if(e.win&&!e.dead){e.dead=1;e.dt=0;}S.grab=null;
  const L=s5KeysList();cineLoad(L);
  startIntro(()=>{if(R.over)return;S.lock=0;state='side';ui();last=performance.now();
    R.banner={txt:(R.s5keys>1?'GOT THE KEYS':'GOT THE JEEP KEY')+' · BACK OUT THE DOOR',t:3,col:'#b6f23a'};
    R.sayQ.push({who:R.s5in==='cmd'?'cmd':R.s5in,txt:"Got it! Coming out!",t:2.4});},L);}
/* the garage squad: everyone left at the jeep fires at anything in range, turning to face it */
function s5GarX(){return 300+Math.max(0,(R.s5jeep||[]).length)*40+40;}
function s5GarageFire(S,dt){const G=S.gar=S.gar||{};
  (R.s5jeep||[]).forEach((id,i)=>{if(id!=='cmd'&&!save.heroes[id])return;const g=G[id]=G[id]||{cd:Math.random()*.5,face:1,muz:0};const x=300+i*40;
    if(g.muz>0)g.muz-=dt;g.cd-=dt;if(g.cd>0)return;
    let best=null,bd=560;for(const e of S.en){if(e.dead||e.win)continue;const d=Math.abs(e.x-x);if(d<bd){bd=d;best=e;}}
    if(!best){g.cd=.2;return;}
    g.face=best.x<x?-1:1;const W=SIDE_W[id]||{rate:.4,mul:1},rate=Math.max(.35,(W.rate||.4)*1.6);g.cd=rate*(.85+Math.random()*.3);g.muz=.08;
    const dmg=Math.max(20,st(id).dmg*(W.mul||1)*.8);sideDmg(best,best.type==='brute'?dmg*.5:dmg,id,0);
    S.zaps.push({pts:[[x+g.face*28*SK,GY-60*SK],[best.x,GY-70*SK]],t:.05,col:id==='volt'?'#b6f23a':id==='blaze'?'#ff6a2b':'#ffe08a'});
    if(Math.random()<.35)SND.shot(SHOT_KIND[id]||'rifle',0);});}
function s5Arrive(S){R.clockStop=1;S.lock=1;R.banner={txt:'MADE IT · '+(R.s5keys>1?'OPEN THE GARAGE':'START THE JEEP'),t:3,col:'#b6f23a'};SND.waveClear();story('keys_returned',{left:Math.round(R.clock)});
  setTimeout(s5Finish,1600);}
function s5Exit(S){if(S.floor===2&&R.s5ret){R.sideActive=R.s5in;R.s5guard=null;sideStart(1);return;}
  if(S.floor===1){if(R.s5go.length>1){S.on=0;state='guard5';ui();}else{R.s5in=R.s5go[0];R.s5guard=null;sideStart(2);}}}
function s5Finish(){if(R.s5End)return;R.s5End=1;if(R.side)R.side.on=0;const L=s5EndList();cineLoad(L);
  startIntro(()=>{save.cleared=Math.max(save.cleared||0,5);save.s5Done=1;legacyStage(5);delete save.ckpt;persist();state='win5';ui();},L);}
function s5WinHTML(){return `<h1 class="title">STAGE 5<span>COMPLETE</span></h1><div class="stripe"></div>
  <p class="sub">Over the wall, through the forest, out of the ranger station with the keys. The squad is on the road to Mega City, where Frost is waiting with a helicopter.</p>
  <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
  <div class="btns"><button class="btn" data-act="s6">On to Stage 6</button><button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="s5">Play Stage 5 again</button></div>`;}

/* ---------- drawing the post (stand-in art until the side images arrive) ---------- */
function s5Pine(x,base,h,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,base-h);ctx.lineTo(x-h*.28,base);ctx.lineTo(x+h*.28,base);ctx.closePath();ctx.fill();}
function s5BG(S){const c=S.cam;
  if(S.floor===1&&s5ok(S5OUT)){const I=S5OUT,k=(GY+6)/630,L=150-395*k,Rx=S.postX-1715*k;
    ctx.fillStyle='#160d1c';ctx.fillRect(0,0,WW,WH);
    const piece=(sx0,sx1,wx,flip)=>{const w=(sx1-sx0)*k,x=wx-c;if(x>WW||x+w<0)return;if(flip){ctx.save();ctx.translate(x+w,0);ctx.scale(-1,1);ctx.drawImage(I,sx0,0,sx1-sx0,724,0,0,w+1,724*k);ctx.restore();}else ctx.drawImage(I,sx0,0,sx1-sx0,724,x,0,w+1,724*k);};
    const tw=(1180-760)*k;let i=0;for(let x=L+760*k;x<Rx+1180*k;x+=tw,i++)piece(760,1180,x,i%2);
    for(let x=L-tw,j=0;x>c-tw-10;x-=tw,j++)piece(760,1180,x,j%2===0);
    for(let x=Rx+2172*k,j=0;x<c+WW+10;x+=tw,j++)piece(760,1180,x,j%2===0);
    piece(0,760,L);piece(1180,2172,Rx+1180*k);
    if(724*k<WH){ctx.fillStyle='#24141c';ctx.fillRect(0,724*k-1,WW,WH);}
    const open=R.s5keys===1;if(open&&s5ok(S5JEEP)){const x0=L+250*k-c,y0=300*k,w=295*k,h=288*k;ctx.drawImage(S5JEEP,x0,y0,w,h);ctx.strokeStyle='#2a1810';ctx.lineWidth=3;ctx.strokeRect(x0,y0,w,h);}else if(open){const x0=L+250*k-c,y0=300*k,w=295*k,h=288*k;ctx.fillStyle='#0b0610';ctx.fillRect(x0,y0,w,h);
      ctx.fillStyle='#3a4a2a';ctx.fillRect(x0+w*.12,y0+h*.55,w*.76,h*.3);ctx.fillRect(x0+w*.28,y0+h*.36,w*.44,h*.2);ctx.fillStyle='#ffc53d';ctx.fillRect(x0+w*.16,y0+h*.6,8,5);ctx.fillRect(x0+w*.8,y0+h*.6,8,5);
      ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x0+w*.25,y0+h*.88,h*.1,0,6.283);ctx.arc(x0+w*.75,y0+h*.88,h*.1,0,6.283);ctx.fill();}
    const gx=150-c;for(let i=0;i<R.s5jeep.length;i++){const id=R.s5jeep[i];if(id==='cmd'||save.heroes[id]){const g=S.gar&&S.gar[id];sd(id,'shoot',Math.floor(t*10+i*3),gx+150+i*40,g?g.face<0:false,.95);}}
    ctx.fillStyle='#b6f23a';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';if(S.rev)ctx.fillText('← GARAGE',Math.max(60,S.garX-c),GY-150);else if(S.x<S.postX-200)ctx.fillText('→',S.postX-c,GY-140);return;}
  if(S.floor===2&&s5ok(S5IN)){const I=S5IN,k=(GY+6)/610,w=2172*k;ctx.fillStyle='#1a0f0f';ctx.fillRect(0,0,WW,WH);
    for(let x=-(c%w)-w;x<WW;x+=w)ctx.drawImage(I,x,0,w+1,724*k);if(724*k<WH){ctx.fillStyle='#2a160e';ctx.fillRect(0,724*k-1,WW,WH);}
    for(const wn of S.wins){if(!wn.broke)continue;const x=wn.x-c;if(x<-90||x>WW+90)continue;s5fur('window',x,(300+125)*k,k*.88);}
    const dx=70-c;ctx.fillStyle='#0b0610';ctx.fillRect(dx-34,GY-130,68,132);ctx.strokeStyle='#5a3020';ctx.lineWidth=5;ctx.strokeRect(dx-34,GY-130,68,132);
    for(const it of S.items){const x=it.x-c;if(x<-120||x>WW+120)continue;s5Item(it,x);}if(R.s5ret){ctx.fillStyle='#b6f23a';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('← OUT',Math.max(50,dx),GY-145);}return;}
  s5BG0(S);}
function s5BG0(S){const c=S.cam;
  if(S.floor===1){const g=ctx.createLinearGradient(0,0,0,GY);g.addColorStop(0,'#1a0f2a');g.addColorStop(.6,'#4a1f3a');g.addColorStop(1,'#ff6a2b');ctx.fillStyle=g;ctx.fillRect(0,0,WW,GY);
    for(const[par,col,hh,sp]of[[.2,'#2a1638',150,90],[.45,'#1c0f26',200,120],[.7,'#120a1a',250,150]]){const off=c*par;for(let i=Math.floor(off/sp)-1;i<(off+WW)/sp+1;i++){const h=hash3(i*13+hh);s5Pine(i*sp-off+h*40,GY+4,hh*(.7+.5*h),col);}}
    ctx.fillStyle='#22161c';ctx.fillRect(0,GY,WW,WH-GY);ctx.fillStyle='#3a2a2a';for(let i=0;i<40;i++){const x=((i*97-c)%WW+WW)%WW;ctx.fillRect(x,GY+6+(i%5)*9,14,3);}
    // garage + jeep at the start
    const gx=150-c;if(gx>-260&&gx<WW+260){ctx.fillStyle='#3a2830';ctx.fillRect(gx-130,GY-170,260,170);ctx.fillStyle='#5a3a3a';ctx.beginPath();ctx.moveTo(gx-145,GY-170);ctx.lineTo(gx,GY-215);ctx.lineTo(gx+145,GY-170);ctx.fill();
      ctx.fillStyle='#0b0610';ctx.fillRect(gx-100,GY-130,200,130);const open=R.s5keys===1;
      if(!open){ctx.fillStyle='#6a5a62';for(let k=0;k<6;k++)ctx.fillRect(gx-100,GY-130+k*22,200,18);ctx.fillStyle='#ffc53d';ctx.fillRect(gx-8,GY-50,16,18);}
      else{ctx.fillStyle='#3a4a2a';ctx.fillRect(gx-80,GY-62,160,44);ctx.fillRect(gx-50,GY-92,100,30);ctx.fillStyle='#111';ctx.beginPath();ctx.arc(gx-50,GY-16,16,0,6.283);ctx.arc(gx+50,GY-16,16,0,6.283);ctx.fill();}
      for(let i=0;i<R.s5jeep.length;i++){const id=R.s5jeep[i];if(id==='cmd'||save.heroes[id]){const g=S.gar&&S.gar[id];sd(id,'shoot',Math.floor(t*10+i*3),gx+150+i*40,g?g.face<0:false,.9);}}
      ctx.fillStyle='#efe6dc';ctx.font='10px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('GARAGE',gx,GY-178);}
    // the station
    const sx=S.postX-c;if(sx>-320&&sx<WW+320){ctx.fillStyle='#4a2f2a';ctx.fillRect(sx-110,GY-200,320,200);ctx.fillStyle='#3a2420';for(let k=0;k<10;k++)ctx.fillRect(sx-110,GY-200+k*20,320,3);
      ctx.fillStyle='#6a3a2a';ctx.beginPath();ctx.moveTo(sx-130,GY-200);ctx.lineTo(sx+50,GY-260);ctx.lineTo(sx+230,GY-200);ctx.fill();
      ctx.fillStyle='#0b0610';ctx.fillRect(sx-30,GY-120,60,120);ctx.fillStyle='#ffc53d';ctx.fillRect(sx+90,GY-150,60,40);ctx.fillStyle='#2a1a14';ctx.fillRect(sx+118,GY-150,4,40);
      ctx.fillStyle='#1d3a2a';ctx.fillRect(sx-40,GY-178,180,22);ctx.fillStyle='#efe6dc';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('RANGER STATION',sx+50,GY-162);
      fireGlow(sx+120,GY-130,80);ctx.fillStyle='#b6f23a';ctx.fillText('→',sx,GY-130);}}
  else{ctx.fillStyle='#2a1a1e';ctx.fillRect(0,0,WW,WH);
    for(let y=20;y<GY;y+=22){ctx.fillStyle=(y/22)%2?'#4a2c26':'#3e2420';ctx.fillRect(0,y,WW,20);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,y+18,WW,2);}
    ctx.fillStyle='#1a0f0f';ctx.fillRect(0,0,WW,20);for(let i=Math.floor(c/300)-1;i<(c+WW)/300+1;i++){ctx.fillStyle='#2a1612';ctx.fillRect(i*300-c,0,26,GY);}
    for(const w of S.wins){const x=w.x-c;if(x<-90||x>WW+90)continue;ctx.fillStyle='#120d22';ctx.fillRect(x-48,GY-200,96,80);ctx.fillStyle='rgba(159,180,255,.18)';ctx.fillRect(x-48,GY-200,96,80);
      ctx.strokeStyle='#6a4030';ctx.lineWidth=6;ctx.strokeRect(x-48,GY-200,96,80);if(!w.broke){ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,GY-200);ctx.lineTo(x,GY-120);ctx.moveTo(x-48,GY-160);ctx.lineTo(x+48,GY-160);ctx.stroke();}
      else{ctx.strokeStyle='#cfe6ff';ctx.lineWidth=1;for(let k=0;k<5;k++){ctx.beginPath();ctx.moveTo(x-48+k*20,GY-200);ctx.lineTo(x-40+k*22,GY-185+(k%2)*10);ctx.stroke();}}}
    const dx=70-c;ctx.fillStyle='#0b0610';ctx.fillRect(dx-34,GY-130,68,130);ctx.strokeStyle='#6a4030';ctx.lineWidth=5;ctx.strokeRect(dx-34,GY-130,68,130);
    ctx.fillStyle='#3a2420';ctx.fillRect(0,GY,WW,WH-GY);for(let i=Math.floor(c/60)-1;i<(c+WW)/60+1;i++){ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(i*60-c,GY,2,WH-GY);}
    fireGlow(WW*.5,40,180);
    for(const it of S.items){const x=it.x-c;if(x<-90||x>WW+90)continue;s5Item(it,x);}}}
function s5Item(it,x){const dn=it.done,base=GY+2;if(s5fur(it.k,x,base+3,.34,dn?.55:1)){s5ItemUI(it,x,base);return;}ctx.save();ctx.globalAlpha=dn?.6:1;
  const box=(w,h,col,y0)=>{ctx.fillStyle=col;ctx.fillRect(x-w/2,base-h-(y0||0),w,h);ctx.strokeStyle='#1a0f0f';ctx.lineWidth=2;ctx.strokeRect(x-w/2,base-h-(y0||0),w,h);};
  if(it.k==='desk'){box(110,10,'#6a4a30',52);box(14,52,'#5a3a24');ctx.fillRect(x+41,base-52,14,52);box(40,30,'#5a3a24',18);}
  else if(it.k==='cabinet'){box(52,110,'#5a6070');for(let k=0;k<3;k++){ctx.fillStyle='#8a94a6';ctx.fillRect(x-8,base-98+k*34,16,4);}}
  else if(it.k==='locker'){box(56,150,'#4a5a4a');ctx.fillStyle='#2a3a2a';for(let k=0;k<5;k++)ctx.fillRect(x-18,base-140+k*6,36,2);}
  else if(it.k==='shelf'){box(90,140,'#5a3a24');for(let k=0;k<4;k++){ctx.fillStyle='#3a2414';ctx.fillRect(x-42,base-30-k*34,84,4);for(let b=0;b<6;b++){ctx.fillStyle=['#8a2a2a','#2a4a6a','#6a6a2a'][(b+k)%3];ctx.fillRect(x-38+b*13,base-56-k*34,9,24);}}}
  else if(it.k==='trunk'){box(80,40,'#5a3a24');ctx.fillStyle='#ffc53d';ctx.fillRect(x-4,base-30,8,8);}
  else if(it.k==='drawers'){box(70,80,'#6a4a30');for(let k=0;k<3;k++){ctx.fillStyle='#3a2414';ctx.fillRect(x-30,base-72+k*25,60,2);ctx.fillRect(x-6,base-64+k*25,12,4);}}
  else if(it.k==='table'){box(120,8,'#6a4a30',60);ctx.fillStyle='#c9b48a';ctx.fillRect(x-48,base-74,96,8);box(10,60,'#5a3a24');}
  else if(it.k==='gunrack'){box(64,130,'#4a2a1a');ctx.fillStyle='rgba(159,180,255,.15)';ctx.fillRect(x-26,base-122,52,100);ctx.strokeStyle='#2a1a10';for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(x-16+k*16,base-118);ctx.lineTo(x-16+k*16,base-30);ctx.stroke();}}
  ctx.restore();s5ItemUI(it,x,base);}
function s5ItemUI(it,x,base){const dn=it.done;
  const S=R.side;if(!dn&&Math.abs(S.x-it.x)<70&&!S.search){ctx.fillStyle='#ffc53d';ctx.font='10px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('MELEE TO SEARCH',x,base-170);}
  if(S.search&&S.search.it===it){const p=S.search.t/.9;ctx.fillStyle='#0d1016cc';ctx.fillRect(x-30,base-180,60,7);ctx.fillStyle='#ffc53d';ctx.fillRect(x-30,base-180,60*p,7);}
  if(dn){ctx.fillStyle='#8a94a6';ctx.font='9px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('SEARCHED',x,base-160);}}
function s5DrawSide(S,c){for(const q of R.tx){if(q.sx==null)continue;ctx.globalAlpha=Math.min(1,q.t*2);ctx.fillStyle=q.col||'#efe6dc';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(q.txt,q.sx-c,GY-190-(1-q.t)*18);}ctx.globalAlpha=1;
  if(S.grab){const x=S.x-c;ctx.strokeStyle='#ff4d5e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,GY-70,46+Math.sin(t*14)*3,0,6.283);ctx.stroke();}}
function s5HUD(cx){ctx.fillStyle='#0d1016cc';ctx.fillRect(cx-130,6,260,26);const c=R.clock;
  ctx.fillStyle=R.clockStop?'#5ee08a':c<30&&(t%1<.5)?'#ff4d5e':'#ffc53d';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';
  ctx.fillText(R.clockStop?'MADE IT':R.s5ret?'KEYS IN HAND · GET BACK · '+fmtClock(c):(R.s5keys>1?'THE GARAGE HOLDS · ':'THE JEEP HOLDS · ')+fmtClock(c),cx,24);
  if(R.side&&R.side.floor===2){const G=R.s5guard;ctx.fillStyle='#0d1016cc';ctx.fillRect(cx-130,34,260,18);ctx.fillStyle='#efe6dc';ctx.font='9px Bungee, Impact, sans-serif';
    ctx.fillText('KEYS '+(R.side.found||0)+'/'+(R.s5keys||1)+(G?'  ·  '+(G.id==='cmd'?'COMMANDER':HEROES[G.id].name.toUpperCase())+' HOLDS THE DOOR':''),cx,47);}}

/* =====================================================================
   STAGE 6 · THE DRIVE
   Top-down driving. The player seats the squad in the jeep, then steers,
   gasses and brakes from the forest to Mega City. Seats fire on their own.
   Only the jeep's health matters. The Ward chases from the highway on.
   ===================================================================== */
const S6_ORDER=['start','hwy','city'];
const S6_HEROES=['cmd','rook','hex','volt','bruno','blaze'];
const S6_SEATS=['driver','front','rearL','rearR','stand','back'];
const S6_SEATNAME={driver:'Driver',front:'Front passenger',rearL:'Rear left',rearR:'Rear right',stand:'Standing (360°)',back:'Facing backward'};
const S6_RANK={driver:['cmd','rook','blaze','volt','hex','bruno'],front:['volt','rook','cmd','bruno','hex','blaze'],
  rearL:['blaze','rook','hex','volt','bruno','cmd'],rearR:['blaze','rook','hex','volt','bruno','cmd'],
  stand:['hex','volt','cmd','bruno','blaze','rook'],back:['bruno','blaze','cmd','rook','hex','volt']};
const S6_NOTE={
  driver:{cmd:'Takes the wheel. Steers the jeep.',rook:'Takes the wheel. Steers the jeep.',blaze:'Takes the wheel. Steers the jeep.',volt:'Takes the wheel. Steers the jeep.',hex:'Takes the wheel. Steers the jeep.',bruno:'Takes the wheel. Steers the jeep.'},
  front:{volt:'Chain lightning at what\'s ahead.',rook:'Dual pistols, two targets at once.',cmd:'Rifle fire at what\'s ahead.',bruno:'Shotgun blasts at what\'s ahead.',hex:'Magic orbs at what\'s ahead.',blaze:'Flamethrower out over the hood.'},
  rearL:{blaze:'Flamethrower out the side.',rook:'Dual pistols out the side.',hex:'Homing orbs that seek the closest threat.',volt:'Chain lightning out the side.',bruno:'Shotgun spray out the side.',cmd:'Rifle fire out the side.'},
  stand:{hex:'A protection spell over the jeep.',volt:'Chain lightning in every direction.',cmd:'Rifle fire in every direction.',bruno:'Shotgun spray in every direction.',blaze:'Flamethrower in every direction.',rook:'Pistol fire in every direction.'},
  back:{bruno:'Shotgun at anything behind.',blaze:'Flamethrower at anything behind.',cmd:'Rifle at anything behind.',rook:'Pistols at anything behind.',hex:'Orbs at anything behind.',volt:'Lightning at anything behind.'}};
S6_NOTE.rearR=S6_NOTE.rearL;
const S6_MULT=[1.4,1.2,1.0,.85,.7,.55];
const S6_W={cmd:{rate:.11,dmg:26,range:400,col:'#ffd27a'},rook:{rate:.2,dmg:24,range:330,n:2,col:'#ff8a3d'},volt:{rate:.6,dmg:70,range:330,ch:3,col:'#a98bff'},
  bruno:{rate:.85,dmg:120,range:210,sp:3,col:'#ffe08a'},hex:{rate:1.2,dmg:170,range:460,orb:1,col:'#c9a7ff'},blaze:{rate:.08,dmg:9,range:180,fl:1,col:'#ff7a2e'}};
/* seat position on the jeep (forward, right) and firing arc (center, half-width) */
const S6_POS={driver:[1,9],front:[1,-9],rearL:[-12,-9],rearR:[-12,9],stand:[-21,0],back:[-29,0]};
const S6_ARC={front:[0,1.05],rearL:[-Math.PI/2,1.25],rearR:[Math.PI/2,1.25],stand:[0,Math.PI],back:[Math.PI,1.05]};

/* ---------- the route ---------- */
const X_FOREST=0,X_BACK=6000,X_RAMP=12000,X_HWY=13000,X_BASE=24000,X_CROAD=30000,X_CITY=33000,CB=680,CS=85;
function s6Zone(x){return x<X_BACK?'forest':x<X_RAMP?'back':x<X_HWY?'ramp':x<X_BASE?'hwy':x<X_CROAD?'base':x<X_CITY?'croad':'city';}
const S6_ZNAME={forest:'THE FOREST ROAD',back:'THE BACK ROAD',ramp:'THE ON-RAMP',hwy:'THE HIGHWAY',base:'THE OLD BASE',croad:'THE ROAD TO MEGA CITY',city:'MEGA CITY'};
function cyAt(x){if(x>=X_CROAD)return 0;
  const fo=q=>Math.sin(q/520)*120+Math.sin(q/190)*30;
  if(x>=X_BACK-700&&x<X_BACK){const t=(x-X_BACK+700)/700,k=t*t*(3-2*t);return fo(x)*(1-k)+Math.sin(x/700)*160*k;}
  const f=x<X_BACK?fo(x):x<X_RAMP?Math.sin(x/700)*160:x<X_HWY?Math.sin(x/700)*160*(1-(x-X_RAMP)/(X_HWY-X_RAMP)):x<X_BASE?Math.sin((x-X_HWY)/900)*60:Math.sin((x-X_BASE)/900)*40*(1-Math.min(1,(x-X_BASE)/(X_CROAD-X_BASE)));
  return f;}
function hwAt(x){return x<X_BACK?72:x<X_RAMP?95:x<X_HWY?95+(x-X_RAMP)/(X_HWY-X_RAMP)*135:x<X_BASE?230:x<X_CROAD?250:150;}
/* city: vertical streets at X_CITY+i*CB (i 0..6), horizontal at j*CB (j -3..3); barricades close some blocks */
const S6_LOBBY=[X_CITY+4.5*CB,-2*CB];
const S6_BAR=[['h',0,3],['v',0,-2],['h',-1,4],['h',-2,0],['v',2,1],['v',5,-1],['h',1,1],['v',3,-3],['h',-3,2],['v',6,-2]];
function s6BarRects(){return S6_BAR.map(([k,a,b])=>k==='h'?{x:X_CITY+(b+.5)*CB,y:a*CB,w:40,h:CS*2+10}:{x:X_CITY+a*CB,y:(b+.5)*CB,w:CS*2+10,h:40});}
let S6BR=null;
function cityOpen(x,y){if(x<X_CITY-CS)return Math.abs(y)<CS;
  const i=Math.round((x-X_CITY)/CB),j=Math.round(y/CB),dx=Math.abs(x-(X_CITY+i*CB)),dy=Math.abs(y-j*CB);
  if(x>X_CITY+6*CB+CS||y<-3*CB-CS||y>3*CB+CS)return false;
  if(!(dx<CS&&i>=0&&i<=6)&&!(dy<CS&&j>=-3&&j<=3))return false;
  S6BR=S6BR||s6BarRects();for(const b of S6BR)if(Math.abs(x-b.x)<b.w/2&&Math.abs(y-b.y)<b.h/2)return false;return true;}
function s6Open(x,y){if(x>=X_CITY-CS*1.2&&x>=X_CROAD+600)return cityOpen(x,y);if(x<-40)return false;return Math.abs(y-cyAt(x))<hwAt(x)+14;}

/* ---------- state ---------- */
let S6_SEATSEL=null;
function s6Roster(){return S6_HEROES.filter(id=>id==='cmd'||save.heroes[id]);}
function s6AutoSeat(){const have=s6Roster(),out={};S6_SEATS.forEach((s,i)=>{if(have[i])out[s]=have[i];});return out;}
function s6Start(at,skip){at=at||'start';s6ArtLoad();stageRevive();for(const id of REVD)if(save.heroes[id])setHp(id,maxHp(id)*.5);REVD=[];
  R={stage:6,s6:1,wave:1,wall:0,wallMax:1,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,dead:[],queue:[],kills:0,spawnLeft:0,spawnTotal:0,proj:[],sayQ:[],s6at:at,s6hp:save.ckpt&&save.ckpt.stage==='6'&&save.ckpt.hp||null};
  S6_SEATSEL={seats:{},pick:null};
  if(at==='start'&&!skip){const L=s6IntroList();cineLoad(L);startIntro(()=>{state='seat6';ui();},L);return;}
  state='seat6';ui();}
function s6SeatsValid(s){const have=s6Roster(),v=Object.values(s);return v.length===have.length&&have.every(id=>v.includes(id))&&!!s.driver;}
function s6SeatHTML(){const S=S6_SEATSEL,have=s6Roster(),nm=id=>id==='cmd'?'Commander':HEROES[id].name;
  const seatOf=id=>Object.keys(S.seats).find(k=>S.seats[k]===id);
  const rows=S6_SEATS.map(s=>{const id=S.seats[s];return `<div class="row" style="align-items:center;gap:8px;flex-wrap:wrap"><span class="sub" style="min-width:128px"><b>${S6_SEATNAME[s]}</b></span>
    <button class="chip ${S.pick===s?'on':''}" data-act="s6seat" data-s="${s}" style="min-width:120px">${id?nm(id):'empty'}</button>
    <span class="sub" style="flex:1;min-width:160px;font-size:12px">${id?S6_NOTE[s][id]:''}</span></div>`;}).join('');
  const picker=S.pick?`<p class="sub">Who sits in <b>${S6_SEATNAME[S.pick]}</b>?</p><div class="chips">${have.map(id=>`<button class="chip ${S.seats[S.pick]===id?'on':''}" data-act="s6hero" data-id="${id}">${nm(id)}</button>`).join('')}${S.seats[S.pick]&&S.pick!=='driver'?'<button class="chip" data-act="s6hero" data-id="">Leave empty</button>':''}</div>`:'<p class="sub">Tap a seat to change who sits there. Everyone has to ride somewhere.</p>';
  const ok=s6SeatsValid(S.seats);
  return `<h2>The jeep</h2><div class="stripe"></div><p class="sub">Only the jeep's health matters on this drive. If it's destroyed, it's over. Where everyone sits matters; work out who belongs where.</p>${rows}${picker}
  <div class="btns"><button class="btn" data-act="s6go" ${ok?'':'disabled style="opacity:.4"'}>Drive</button></div>${ok?'':'<p class="sub" style="color:#ff4d5e">Seat everyone, and someone has to drive.</p>'}`;}
function s6SeatAct(a,b){const S=S6_SEATSEL;
  if(a==='s6seat'){S.pick=S.pick===b.dataset.s?null:b.dataset.s;}
  else if(a==='s6hero'){const id=b.dataset.id,s=S.pick;if(!s)return;const was=Object.keys(S.seats).find(k=>S.seats[k]===id),cur=S.seats[s];
    if(!id){delete S.seats[s];}else{S.seats[s]=id;if(was&&was!==s){if(cur)S.seats[was]=cur;else delete S.seats[was];}}S.pick=null;}
  else if(a==='s6auto'){S.seats=s6AutoSeat();S.pick=null;}
  else if(a==='s6go'){save.seats6=Object.assign({},S.seats);persist();s6Drive(R.s6at);return;}
  const y=ov.scrollTop;ui();ov.scrollTop=y;}

function s6Drive(at){const x0=at==='hwy'?X_HWY-200:at==='city'?X_CROAD+200:60,H=HORDE();
  const seats=save.seats6,drv=seats.driver,rk=S6_RANK.driver.indexOf(drv);
  const D=R.s6={on:1,t:0,x:x0,y:cyAt(x0),a:0,vx:0,vy:0,v:at==='start'?0:260,hp:0,max:1000,hand:[1,.9,.8,.7,.6,.5][rk],seats,cd:{},fx:[],orbs:[],ob:[],trail:[],ward:null,
    in:{l:0,r:0,g:0,b:0},ptr:{},zone:null,nextSpawn:x0+300,cityT:0,healT:7,shake:0,dmgT:0,stuck:0,best:x0,said:{}};
  D.hp=R.s6hp||D.max;R.s6hp=null;
  s6Obstacles(D);if(at!=='start')s6Ckpt(at,D.hp);else s6Ckpt('start',D.hp);
  if(at!=='start')s6WardWake(D,true);
  for(let i=0;i<200;i++)D.trail.push([x0-(200-i)*4,cyAt(x0-(200-i)*4)]);
  R.banner={txt:'STAGE 6: THE DRIVE',t:2.6,col:'#ffc53d'};R.say={who:drv==='cmd'?'cmd':drv,txt:drv==='bruno'?"Hold on to something.":drv==='cmd'?"Everybody hold on.":"I've got the wheel. Hang on!",t:3};
  state='drive';ui();last=performance.now();SND.engineSet&&SND.engineSet(true);}
function s6Ckpt(at,hp){markReach('6',at);save.ckpt={stage:'6',wave:at,hp:Math.round(hp)};persist();R.s6at=at;R.s6ckHp=Math.round(hp);}
const S6_OBK={car:{L:82,len:27,r:19},cop:{L:80,len:26,r:19},truck:{L:150,len:58,r:23},sand:{L:72,len:20,r:20},barrier:{L:62,len:22,r:12},barrel:{L:22,len:0,r:13}};
function s6RoadA(x){return Math.atan2(cyAt(x+12)-cyAt(x-12),24);}
function s6Ob(k,x,y,a,rnd){const b=S6_OBK[k];return{k,x,y,a,len:b.len,r:b.r,fl:rnd()<.5};}
function s6ObN(o,x,y){const c=Math.cos(o.a),n=Math.sin(o.a);let u=(x-o.x)*c+(y-o.y)*n;u=Math.max(-o.len,Math.min(o.len,u));const px=o.x+c*u,py=o.y+n*u;return[Math.hypot(x-px,y-py),px,py];}
function s6Obstacles(D){const ob=D.ob;let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const jit=x=>s6RoadA(x)+(rnd()-.5)*.7+(rnd()<.3?Math.PI:0);
  for(let x=X_HWY+300;x<X_BASE-200;x+=180+rnd()*260){const y=cyAt(x)+(rnd()*2-1)*(hwAt(x)-60),q=rnd();ob.push(s6Ob(q<.55?'car':q<.8?'cop':'truck',x,y,jit(x),rnd));}
  for(let x=X_BASE+200;x<X_CROAD-100;x+=220+rnd()*200){const y=cyAt(x)+(rnd()*2-1)*(hwAt(x)-60),q=rnd();
    if(q<.3)ob.push(s6Ob('sand',x,y,(rnd()-.5)*.5+(rnd()<.5?Math.PI/2:-Math.PI/2)*0,rnd));else if(q<.55)ob.push(s6Ob('barrier',x,y,s6RoadA(x)+(rnd()<.5?Math.PI/2:0),rnd));else if(q<.75)ob.push(s6Ob('truck',x,y,jit(x),rnd));else{ob.push(s6Ob('barrel',x,y,0,rnd));if(rnd()<.6)ob.push(s6Ob('barrel',x+30,y+14,0,rnd));}}
  for(let x=X_CROAD+300;x<X_CITY-200;x+=420+rnd()*300){const q=rnd();ob.push(s6Ob(q<.6?'car':q<.85?'cop':'barrel',x,(rnd()*2-1)*90,(rnd()-.5)*.6+(rnd()<.3?Math.PI:0),rnd));}
  for(let i=0;i<=6;i++)for(let j=-3;j<=3;j++){if(rnd()<.35){const hz=rnd()<.5,q=rnd();ob.push(s6Ob(q<.6?'car':q<.85?'cop':'truck',X_CITY+i*CB+(hz?CB*(.3+rnd()*.4):(rnd()*2-1)*30),j*CB+(hz?(rnd()*2-1)*30:CB*(.3+rnd()*.4)),(hz?0:Math.PI/2)+(rnd()-.5)*.4,rnd));}}
  D.ob=ob.filter(o=>Math.hypot(o.x-S6_LOBBY[0],o.y-S6_LOBBY[1])>200&&o.x>200);}

/* ---------- enemies ---------- */
const S6_E={grunt:{hp:185,spd:52,r:16,bite:3,run:2},runner:{hp:65,spd:135,r:14,bite:2,run:1.5},screecher:{hp:80,spd:75,r:15,bite:2,run:1.5},
  armored:{hp:500,spd:42,r:20,bite:5,ram:8},brute:{hp:1500,spd:62,r:30,bite:10,ram:16}};
function s6Mix(z){return z==='forest'?['grunt','grunt','runner','screecher','screecher']:z==='back'||z==='ramp'?['grunt','grunt','runner','runner','armored']:
  z==='hwy'?['grunt','grunt','runner','runner','armored','armored']:z==='base'?['grunt','grunt','armored','armored','runner','brute']:['grunt','grunt','grunt','runner','runner','armored','screecher','brute']}
function s6Spawn(D,type,x,y){const b=S6_E[type],k=HORDE()?1.15:1;R.en.push({type,x,y,hp:b.hp*k,max:b.hp*k,spd:b.spd*(.85+Math.random()*.3),r:b.r,atkT:0,dead:0,wob:Math.random()*6,hitT:0,face:1,kb:[0,0]});}
function s6SpawnTick(D,dt){const H=HORDE()?1.6:1,z=s6Zone(D.x);
  if(z!=='city'){if(D.best>D.nextSpawn-700){const x=D.nextSpawn,mix=s6Mix(s6Zone(x)),n=Math.round((1.6+Math.random()*2.6)*H*(z==='base'||z==='hwy'?1.4:1)),mid=Math.random()<.3;
      for(let i=0;i<n;i++){const t_=mix[Math.floor(Math.random()*mix.length)];if(t_==='brute'&&Math.random()<.6)continue;const xx=x+(Math.random()-.5)*160,side=Math.random()<.5?-1:1;
        s6Spawn(D,t_,xx,cyAt(xx)+(mid?(Math.random()-.5)*hwAt(xx)*.8:side*(hwAt(xx)*(.2+Math.random()*1.1))));}
      D.nextSpawn+=145+Math.random()*130;}
    return;}
  D.cityT-=dt;if(D.cityT<=0&&R.en.length<70*H){D.cityT=(.4+Math.random()*.4)/H;const mix=s6Mix('city');
    for(let k=0;k<8;k++){const a=Math.random()*6.283,d=520+Math.random()*320,x=D.x+Math.cos(a)*d,y=D.y+Math.sin(a)*d;if(!cityOpen(x,y))continue;
      const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++){const t_=mix[Math.floor(Math.random()*mix.length)];if(t_==='brute'&&Math.random()<.7)continue;s6Spawn(D,t_,x+(Math.random()-.5)*50,y+(Math.random()-.5)*50);}break;}}}
function s6Enemies(D,dt){const sp=Math.hypot(D.vx,D.vy);
  for(const e of R.en){if(e.dead)continue;if(e.hitT>0)e.hitT-=dt;if(e.stun>0){e.stun-=dt;}
    e.x+=e.kb[0]*dt;e.y+=e.kb[1]*dt;e.kb[0]*=Math.pow(.02,dt);e.kb[1]*=Math.pow(.02,dt);
    const dx=D.x-e.x,dy=D.y-e.y,d=Math.hypot(dx,dy)||1;e.face=dx<0?-1:1;
    if(d>1500&&e.x<D.x){e.dead=1;e.gone=1;continue;}
    if(!(e.stun>0)&&d>e.r+22){e.x+=dx/d*e.spd*dt;e.y+=dy/d*e.spd*dt;e.wob+=dt*e.spd/30;}
    if(d<e.r+26){const b=S6_E[e.type];
      if(sp>95&&b.run){s6Kill(e,'run');s6Hurt(D,b.run,1,'run');D.vx*=.97;D.vy*=.97;continue;}
      if(sp>70&&b.ram&&!e.rammed){e.rammed=.6;s6Hurt(D,b.ram,0,'ram');s6DmgE(e,e.type==='brute'?300:180);D.vx*=e.type==='brute'?.2:.45;D.vy*=e.type==='brute'?.2:.45;R.shake=.35;SND.wallHit&&SND.wallHit();e.kb=[-dx/d*160,-dy/d*160];continue;}
      e.atkT-=dt;if(e.atkT<=0){e.atkT=1;s6Hurt(D,b.bite,0,'bite');}}
    if(e.rammed>0)e.rammed-=dt;}
  R.en=R.en.filter(e=>!e.dead);}
function s6DmgE(e,d){if(e.dead)return;e.hp-=d;e.hitT=.12;if(e.hp<=0)s6Kill(e,'shot');}
function s6Kill(e,how){e.dead=1;R.kills++;const g={grunt:10,runner:8,screecher:10,armored:25,brute:60}[e.type]||10;save.gold+=g;
  R.s6.fx.push({k:'splat',ty:e.type,lf:R.s6.x<e.x,x:e.x,y:e.y,t:9,r:e.r,col:how==='run'?'#5a1414':'#3a1010'});if(how==='run')SND.hit&&SND.hit(0);}
function s6Hurt(D,d,quiet,src){if(D.dead)return;const st=D.seats.stand==='hex'?.85:1;D.hp-=d*st;D.dsrc=D.dsrc||{};D.dsrc[src||'?']=(D.dsrc[src||'?']||0)+d*st;D.dmgT=.2;if(!quiet)SND.hurt(0);
  if(D.hp<=0){D.hp=0;D.dead=1;s6Wreck();}}
function s6Wreck(){const D=R.s6;R.shake=.8;SND.explosion(1);story('jeep_destroyed',{zone:s6Zone(D.x)});R.over=true;R.s6Lost=1;
  setTimeout(()=>{SND.engineSet&&SND.engineSet(false);SND.gameOver();legacyEnd('jeep_destroyed');persist();state='over';ui();},1200);}

/* ---------- the Ward ---------- */
function s6WardWake(D,quiet){if(D.ward)return;const W=D.ward={d:-700,hp:0,stag:HORDE()?6400:5200,stagMax:HORDE()?6400:5200,down:0,slamT:0,thrT:9,x:D.x-700,y:D.y,wob:0,hitT:0,roar:1.2};
  if(!quiet){R.banner={txt:'THE WARD',t:3,col:'#ff4d5e'};R.say={who:'cmd',txt:"Is that... the Ward? Floor it!",t:3.2};}SND.groan(0,1);R.shake=.4;story('ward_returns',{});}
function s6WardTick(D,dt){const W=D.ward;if(!W)return;if(W.hitT>0)W.hitT-=dt;if(W.roar>0)W.roar-=dt;
  // he follows the jeep's trail, so he goes where the jeep went
  const tr=D.trail;let L=0;const seg=[];for(let i=tr.length-1;i>0;i--){const l=Math.hypot(tr[i][0]-tr[i-1][0],tr[i][1]-tr[i-1][1]);seg.push(l);L+=l;}
  const H=HORDE(),base=(H?440:405);
  if(W.down>0){W.down-=dt;W.d-=Math.max(0,Math.hypot(D.vx,D.vy))*dt*0;if(W.down<=0){W.stag=W.stagMax;W.roar=1;R.banner={txt:'THE WARD IS BACK UP',t:2,col:'#ff4d5e'};SND.groan(0,.8);}}
  else{const gap=-W.d,sp=gap>900?620:gap>500?base*1.15:base;W.d=Math.min(-20,W.d+sp*dt-Math.hypot(D.vx,D.vy)*dt);W.wob+=dt*6;}
  if(W.down>0){W.d-=Math.hypot(D.vx,D.vy)*dt;}
  W.d=Math.max(W.d,-Math.min(L,1400));
  // position: walk back along the trail by |d|
  let need=-W.d,i=tr.length-1,k=0;while(i>0&&need>seg[k]){need-=seg[k];i--;k++;}
  if(i>0){const a=tr[i],b=tr[i-1],q=need/(seg[k]||1);W.x=a[0]+(b[0]-a[0])*q;W.y=a[1]+(b[1]-a[1])*q;}else{W.x=tr[0][0];W.y=tr[0][1];}
  if(W.slamT>0)W.slamT-=dt;
  if(!(W.down>0)&&-W.d<70&&W.slamT<=0){W.slamT=1.6;s6Hurt(D,HORDE()?24:16,0,'slam');R.shake=.6;SND.explosion(.5);W.d=-160;D.vx+=Math.cos(D.a)*120;D.vy+=Math.sin(D.a)*120;R.banner={txt:'SLAMMED',t:1,col:'#ff4d5e'};}
  W.thrT-=dt;if(!(W.down>0)&&W.thrT<=0&&-W.d<900){W.thrT=HORDE()?5:7;const lead=.9,tx=D.x+D.vx*lead,ty=D.y+D.vy*lead;D.fx.push({k:'throw',x0:W.x,y0:W.y,x:tx,y:ty,t:0,T:lead});SND.whoosh();}}
function s6WardHit(W,d){if(!W||W.down>0)return;W.stag-=d;W.hitT=.1;if(W.stag<=0){W.down=HORDE()?5:6.5;W.stag=0;R.banner={txt:'THE WARD IS DOWN',t:2,col:'#b6f23a'};SND.groan(0,1);R.shake=.3;}}

/* ---------- seats firing ---------- */
const angN=a=>{while(a>Math.PI)a-=6.283;while(a<-Math.PI)a+=6.283;return a;};
function s6Targets(D,s,range){const[c,h]=S6_ARC[s],out=[];const all=R.en.slice();if(D.ward&&!(D.ward.down>0))all.push(Object.assign(D.ward,{type:'ward',r:44}));
  for(const e of all){if(e.dead)continue;const dx=e.x-D.x,dy=e.y-D.y,d=Math.hypot(dx,dy);if(d>range+e.r)continue;
    if(h<Math.PI){const rel=angN(Math.atan2(dy,dx)-D.a-c);if(Math.abs(rel)>h)continue;}out.push([d,e]);}
  return out.sort((p,q)=>p[0]-q[0]).map(p=>p[1]);}
function s6SeatXY(D,s){const[f,r]=S6_POS[s],c=Math.cos(D.a),n=Math.sin(D.a);return[D.x+c*f-n*r,D.y+n*f+c*r];}
function s6Hit(D,e,d){if(e.type==='ward')s6WardHit(D.ward,d);else s6DmgE(e,d);}
function s6Seats(D,dt){
  for(const s of S6_SEATS){if(s==='driver')continue;const id=D.seats[s];if(!id)continue;const W=S6_W[id],m=S6_MULT[S6_RANK[s].indexOf(id)];
    D.cd[s]=(D.cd[s]||0)-dt;
    if(s==='stand'&&id==='hex'){D.healT-=dt;if(D.healT<=0){D.healT=7;const h=D.max*.06;D.hp=Math.min(D.max,D.hp+h);D.fx.push({k:'heal',t:.8});SND.chime&&SND.chime();}}
    if(D.cd[s]>0)continue;
    let range=W.range,rate=W.rate;if(s==='stand'&&id==='hex')rate=2.2;
    let ts=(s==='rearL'||s==='rearR')&&id==='hex'?s6Targets(D,'stand',range):s6Targets(D,s,range);if(!ts.length)continue;D.cd[s]=rate;
    const[sx,sy]=s6SeatXY(D,s),dmg=W.dmg*m,tg=ts[0];
    if(W.fl){const a0=Math.atan2(tg.y-sy,tg.x-sx);for(const e of ts){const rel=angN(Math.atan2(e.y-sy,e.x-sx)-a0);if(Math.abs(rel)<.3){s6Hit(D,e,dmg);if(e.type!=='ward'){const kb=(s==='rearL'||s==='rearR')?260:140;e.kb=[Math.cos(a0)*kb,Math.sin(a0)*kb];}}}
      D.fx.push({k:'flame',x:sx,y:sy,a:a0,t:.14,r:range});
      if(s==='front'){s6Hurt(D,.06,1,'blaze');}
      if(s==='stand'&&Math.abs(angN(a0-D.a))<1.05){s6Hurt(D,.1,1,'blaze');if(!D.said.blz){D.said.blz=1;R.say={who:'blaze',txt:"Sorry! Sorry! The hood's fine!",t:2.4};}}
      if((D.flS=(D.flS||0)+1)%5===1)SND.shot('flame',0);continue;}
    if(W.orb){D.orbs.push({x:sx,y:sy,tg,sp:520,dmg,t:2});SND.shot('zap',0);continue;}
    if(W.ch){let cur=tg,pts=[[sx,sy]],hit=new Set(),n=W.ch+(s==='stand'?1:0);while(cur&&n-->0){hit.add(cur);s6Hit(D,cur,dmg);pts.push([cur.x,cur.y]);
        let nx=null,nd=170;for(const e of R.en){if(hit.has(e)||e.dead)continue;const d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<nd){nd=d;nx=e;}}cur=nx;}
      D.fx.push({k:'bolt',pts,t:.16});SND.shot('zap',0);continue;}
    if(W.sp){for(const e of ts.slice(0,W.sp)){const d=Math.hypot(e.x-sx,e.y-sy),f=Math.max(.35,1-d/range);s6Hit(D,e,dmg*f);D.fx.push({k:'tr',x1:sx,y1:sy,x2:e.x,y2:e.y,t:.08,col:W.col});}SND.shot('shotgun',0);continue;}
    for(const e of ts.slice(0,W.n||1)){s6Hit(D,e,dmg);D.fx.push({k:'tr',x1:sx,y1:sy,x2:e.x+(Math.random()-.5)*8,y2:e.y+(Math.random()-.5)*8,t:.06,col:W.col});}
    if((D.shS=(D.shS||0)+1)%2)SND.shot(id==='rook'?'pistol':'rifle',0);}
  for(const o of D.orbs){o.t-=dt;const tg=o.tg&&!o.tg.dead&&!(o.tg.type==='ward'&&o.tg.down>0)?o.tg:null;if(!tg){o.t=0;continue;}const dx=tg.x-o.x,dy=tg.y-o.y,d=Math.hypot(dx,dy)||1;
    o.x+=dx/d*o.sp*dt;o.y+=dy/d*o.sp*dt;if(d<tg.r+8){s6Hit(D,tg,o.dmg);o.t=0;D.fx.push({k:'pop',x:o.x,y:o.y,t:.3});}}
  D.orbs=D.orbs.filter(o=>o.t>0);}

/* ---------- driving ---------- */
function s6Update(dt){const D=R.s6;if(!D)return;dt=Math.min(dt,.05);t+=dt;D.t+=dt;if(R.shake>0)R.shake-=dt;if(D.dmgT>0)D.dmgT-=dt;
  if(R.banner){R.banner.t-=dt;if(R.banner.t<=0)R.banner=null;}if(R.say){R.say.t-=dt;if(R.say.t<=0)R.say=null;}
  for(const f of D.fx)f.t-=dt;
  for(const f of D.fx)if(f.k==='throw'&&!f.done){f.tt=(f.tt||0)+dt;if(f.tt>=f.T){f.done=1;f.t=0;D.fx.push({k:'boom',x:f.x,y:f.y,t:.5});SND.explosion(.4);if(Math.hypot(D.x-f.x,D.y-f.y)<60){s6Hurt(D,HORDE()?18:14,0,'throw');R.shake=.4;}}else f.t=1;}
  D.fx=D.fx.filter(f=>f.t>0);
  if(D.dead){D.vx*=.9;D.vy*=.9;return;}
  const I=D.in,kb=keys||{},L=I.l||kb.ArrowLeft||kb.a,Rr=I.r||kb.ArrowRight||kb.d,G=I.g||kb.ArrowUp||kb.w,B=I.b||kb.ArrowDown||kb.s;
  const steer=(Rr?1:0)-(L?1:0),c=Math.cos(D.a),n=Math.sin(D.a);let fw=D.vx*c+D.vy*n,lat=-D.vx*n+D.vy*c;
  if(G)fw+=(fw<0?520:300)*dt;else if(B)fw-=(fw>0?560:220)*dt;else fw-=Math.sign(fw)*Math.min(Math.abs(fw),90*dt);
  fw=Math.max(-170,Math.min(450,fw));
  const ts=Math.min(1,Math.abs(fw)/170)*Math.sign(fw||1);D.a+=steer*2.5*D.hand*ts*dt;
  lat*=Math.pow(.5,dt*(4+8*D.hand));const c2=Math.cos(D.a),n2=Math.sin(D.a);D.vx=c2*fw-n2*lat;D.vy=n2*fw+c2*lat;
  const nx=D.x+D.vx*dt,ny=D.y+D.vy*dt,fx=nx+Math.cos(D.a)*26*Math.sign(fw||1),fy=ny+Math.sin(D.a)*26*Math.sign(fw||1);
  let bump=!s6Open(nx,ny)||!s6Open(fx,fy),obh=null;
  let obp=null;for(const o of D.ob){const q=s6ObN(o,nx,ny);if(q[0]<o.r+18){obh=o;obp=q;break;}}
  if(bump||obh){const sp=Math.hypot(D.vx,D.vy);if(sp>140){s6Hurt(D,(sp-120)*.03,0,'wall');R.shake=Math.max(R.shake,.2);SND.wallHit&&SND.wallHit();}
    if(obh){const dx=nx-obp[1],dy=ny-obp[2],d=Math.hypot(dx,dy)||1;D.vx=dx/d*sp*.35;D.vy=dy/d*sp*.35;}
    else{let ok=0;if(s6Open(nx,D.y)&&s6Open(nx+Math.cos(D.a)*20,D.y)){D.x=nx;D.vy*=-.25;D.vx*=.7;ok=1;}else if(s6Open(D.x,ny)&&s6Open(D.x,ny+Math.sin(D.a)*20)){D.y=ny;D.vx*=-.25;D.vy*=.7;ok=1;}if(!ok){D.vx*=-.3;D.vy*=-.3;}}}
  else{D.x=nx;D.y=ny;}
  const tl=D.trail[D.trail.length-1];if(Math.hypot(D.x-tl[0],D.y-tl[1])>18){D.trail.push([D.x,D.y]);if(D.trail.length>260)D.trail.shift();}
  D.best=Math.max(D.best,D.x);
  const z=s6Zone(D.x);if(z!==D.zone){D.zone=z;if(D.t>1)R.banner={txt:S6_ZNAME[z],t:2.4,col:'#ffc53d'};s6ZoneLine(z);}
  if(D.x>X_HWY+300&&!D.ward)s6WardWake(D);
  if(R.s6at==='start'&&D.x>X_HWY+300)s6Ckpt('hwy',D.hp);
  if(R.s6at!=='city'&&D.x>X_CROAD+200)s6Ckpt('city',D.hp);
  s6SpawnTick(D,dt);s6Enemies(D,dt);s6Seats(D,dt);s6WardTick(D,dt);
  SND.engineSet&&SND.engineSet(true);
  if(Math.hypot(D.x-S6_LOBBY[0],D.y-S6_LOBBY[1])<95&&!D.done){D.done=1;s6Finish();}}
function s6ZoneLine(z){const D=R.s6,L={back:['rook',"Back road. Stay off the shoulder."],hwy:null,base:['bruno',"Home sweet home. Look what they did to it."],croad:['cmd',"Mega City. Frost's building has a helipad on the roof. Look for the beacon."],city:['cmd',"Follow the beacon. Streets are blocked, so find a way around."]}[z];
  if(L&&(L[0]==='cmd'||save.heroes[L[0]]))R.sayQ.push({who:L[0],txt:L[1],t:3.4});if(!R.say&&R.sayQ.length)R.say=R.sayQ.shift();}
function s6Finish(){const D=R.s6;D.on=0;story('stage_clear_6',{hp:Math.round(D.hp)});SND.engineSet&&SND.engineSet(false);const L=s6EndList();cineLoad(L);
  startIntro(()=>{save.cleared=Math.max(save.cleared||0,6);save.s6Done=1;legacyStage(6);delete save.ckpt;persist();state='win6';ui();},L);}
function s6WinHTML(){return `<h1 class="title">STAGE 6<span>COMPLETE</span></h1><div class="stripe"></div>
  <p class="sub">Through the forest, down the highway with the Ward on their tail, and straight through the lobby glass of Frost's building.</p>
  <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
  <p class="sub">Stage 7 is coming soon.</p>
  <div class="btns"><button class="btn" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="s6">Play Stage 6 again</button></div>`;}

/* ---------- cutscenes (stand-in art until the riso shots arrive) ---------- */
function s6Full(){return S6_HEROES.every(id=>id==='cmd'||save.heroes[id]);}
function s6IntroList(){return[
  sh5('s6_i1','s5_e2',5.5,"Frost (radio): \"You've got wheels? Good. Mega City, the tower with the helipad. Don't stop for anything.\"",pushIn),
  sh5('s6_i2','s5_i4_all',5,"Commander: \"Everybody find a seat.\"",pullOut),
  sh5('s6_i3','s6_i2',4,"Commander: \"This is going to get loud.\"",pushIn,{snd:()=>SND.engineSet&&SND.engineSet(true)})];}
const S6_E2SET={cmd:1,volt:1,blaze:1,bruno:1,hex:1};
function s6EndList(){const D=R.s6,full=s6Full(),drv=(D&&D.seats&&D.seats.driver)||'cmd',sfx=drv==='cmd'?'':'_'+drv,L=[];
  L.push(sh5('s6_e0'+sfx,'s6_e0',4.5,"In the mirror: the Ward, still coming.",pushIn,{snd:()=>SND.groan&&SND.groan(0,1)}));
  if(full)L.push(sh5('s6_e1_all'+sfx,'s6_e1_all',5,"The beacon. Frost's tower. And no time to stop.",pullOut,{snd:()=>SND.engineSet&&SND.engineSet(true)}));
  const glass=full&&S6_E2SET[drv]?'s6_e2_all'+sfx:'s6_e2';
  L.push(sh5(glass,'s6_e2',5.5,full?"The jeep went through the lobby glass at full speed.":"Frost's tower. No time to stop. The jeep went through the lobby glass at full speed.",pullOut,{snd:()=>{SND.explosion(1);SND.engineSet&&SND.engineSet(false);},fx:(c,tt)=>{if(tt<.6)c.shake=8;}}));
  L.push(sh5(full?'s6_e3_all':'s6_e3','s6_e3',6,"Forty floors of dark above them. Somewhere on the roof, Frost was waiting.",pushIn,{fx:(c,tt)=>{c.dim(Math.max(0,(tt-4.6)*.7));}}));
  return L;}
function s6ViewList(){const L=s6IntroList();return L;}
function s6EndView(){const L=[],dn={cmd:'',rook:'_rook',blaze:'_blaze',volt:'_volt',hex:'_hex',bruno:'_bruno'};
  for(const d in dn)L.push(sh5('s6_e0'+dn[d],'s6_e0',4,"In the mirror: the Ward, still coming.",pushIn));
  for(const d in dn)L.push(sh5('s6_e1_all'+dn[d],'s6_e1_all',4,"The beacon. Frost's tower.",pullOut));
  L.push(sh5('s6_e2','s6_e2',4,"Through the lobby glass.",pullOut));for(const d in S6_E2SET)L.push(sh5('s6_e2_all'+dn[d],'s6_e2',4,"Through the lobby glass.",pullOut));
  L.push(sh5('s6_e3','s6_e3',5,"Forty floors of dark above them.",pushIn),sh5('s6_e3_all','s6_e3',5,"Somewhere on the roof, Frost was waiting.",pushIn));return L;}

/* ---------- input ---------- */
const S6B={l:{x:()=>62,y:()=>WH-62,r:40,t:'◀'},r:{x:()=>160,y:()=>WH-62,r:40,t:'▶'},b:{x:()=>WW-170,y:()=>WH-58,r:36,t:'BRAKE'},g:{x:()=>WW-68,y:()=>WH-70,r:48,t:'GAS'},p:{x:()=>WW-28,y:()=>26,r:18,t:'II'}};
function s6Btn(x,y){for(const k in S6B){const b=S6B[k];if(Math.hypot(x-b.x(),y-b.y())<b.r+14)return k;}
  if(y>WH*.45){if(x<WW*.3)return x<111?'l':'r';if(x>WW*.62)return x<WW-118?'b':'g';}return null;}
function s6Down(e){const D=R.s6;if(!D)return;const[x,y]=sideXY(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}const k=s6Btn(x,y);
  if(k==='p'){state='pause';ui();return;}if(k){D.ptr[e.pointerId]=k;s6In(D);}}
function s6Move(e){const D=R.s6;if(!D||!(e.pointerId in D.ptr))return;const[x,y]=sideXY(e),k=s6Btn(x,y);if(k&&k!=='p'){D.ptr[e.pointerId]=k;s6In(D);}}
function s6Up(e){const D=R.s6;if(!D)return;delete D.ptr[e.pointerId];s6In(D);}
function s6In(D){const v=Object.values(D.ptr);D.in={l:v.includes('l'),r:v.includes('r'),g:v.includes('g'),b:v.includes('b')};}

/* ---------- drawing ---------- */
const S6_ZOOM=.78;
const S6SPR=new Image(),S6DIRT=new Image(),S6ASPH=new Image(),S6CONC=new Image(),S6M=JSON.parse('{"roof3": [0, 0, 327, 332], "helipad": [329, 0, 551, 332], "roof1": [882, 0, 313, 306], "roof0": [1197, 0, 294, 304], "roof2": [1493, 0, 290, 295], "jeep0": [0, 334, 310, 226], "jeep1": [312, 334, 310, 226], "jeep2": [624, 334, 310, 226], "tower": [936, 334, 118, 203], "ws2": [1056, 334, 149, 172], "tree0": [1207, 334, 164, 171], "truck": [1373, 334, 383, 168], "tent": [1758, 334, 178, 168], "ws3": [0, 562, 180, 162], "tree1": [182, 562, 130, 159], "ww2": [314, 562, 174, 158], "ww3": [490, 562, 183, 153], "ws1": [675, 562, 170, 151], "ww0": [847, 562, 148, 149], "ww1": [997, 562, 155, 149], "ws0": [1154, 562, 181, 149], "wd0": [1337, 562, 220, 149], "barrel": [1559, 562, 84, 148], "wd1": [1645, 562, 220, 144], "car": [0, 726, 264, 139], "tank": [266, 726, 269, 139], "z_brute0": [537, 726, 119, 125], "z_brute3": [658, 726, 135, 124], "z_brute2": [795, 726, 130, 123], "z_brute1": [927, 726, 132, 122], "z_brute4": [1061, 726, 194, 122], "cop": [1257, 726, 229, 119], "tree2": [1488, 726, 112, 116], "crates": [1602, 726, 114, 116], "z_grunt0": [1718, 726, 102, 114], "z_grunt2": [1822, 726, 124, 114], "sand": [0, 867, 205, 113], "z_runner0": [207, 867, 96, 112], "z_runner1": [305, 867, 131, 112], "z_runner3": [438, 867, 122, 112], "z_grunt1": [562, 867, 126, 111], "z_grunt3": [690, 867, 120, 111], "z_grunt4": [812, 867, 175, 111], "z_runner2": [989, 867, 117, 111], "z_armored1": [1108, 867, 123, 110], "z_armored2": [1233, 867, 118, 110], "z_armored4": [1353, 867, 173, 110], "z_armored0": [1528, 867, 93, 108], "z_armored3": [1623, 867, 123, 108], "z_screecher2": [1748, 867, 129, 108], "z_runner4": [0, 982, 184, 108], "z_screecher0": [186, 982, 88, 105], "z_screecher1": [276, 982, 114, 104], "z_screecher3": [392, 982, 127, 103], "z_screecher4": [521, 982, 175, 102], "z_brute5": [698, 982, 187, 93], "z_grunt5": [887, 982, 164, 85], "z_armored5": [1053, 982, 165, 85], "barrier": [1220, 982, 172, 78], "rail": [1394, 982, 291, 78], "z_runner5": [1687, 982, 162, 75], "z_screecher5": [1851, 982, 157, 73]}'||'{}');let S6PAT={};
function s6ArtLoad(){if(S6SPR.src||!'assets/s6spr.webp?v=a062f639b8')return;S6SPR.src='assets/s6spr.webp?v=a062f639b8';S6DIRT.src='assets/s6dirt.webp?v=3284f2b95a';S6ASPH.src='assets/s6asph.webp?v=c481df7af7';S6CONC.src='assets/s6conc.webp?v=21f0c7258c';}
const s6ok=i=>i.complete&&i.naturalWidth>0;
function s6SprF(n,x,y,w,left,al){const r=S6M[n];if(!r||!s6ok(S6SPR))return false;const h=w*r[3]/r[2];ctx.save();ctx.translate(x,y);if(left)ctx.scale(-1,1);if(al!=null)ctx.globalAlpha=al;ctx.drawImage(S6SPR,r[0],r[1],r[2],r[3],-w/2,-h*.8,w,h);ctx.restore();return true;}
function s6Spr(n,x,y,w,a,fl,al){const r=S6M[n];if(!r||!s6ok(S6SPR))return false;const h=w*r[3]/r[2];ctx.save();ctx.translate(x,y);if(a)ctx.rotate(a);if(fl)ctx.scale(1,-1);if(al!=null)ctx.globalAlpha=al;ctx.drawImage(S6SPR,r[0],r[1],r[2],r[3],-w/2,-h/2,w,h);ctx.restore();return true;}
function s6Pat(k,X,Y,Z){const im=k==='dirt'?S6DIRT:k==='asph'?S6ASPH:S6CONC;if(!s6ok(im))return null;let p=S6PAT[k];if(!p)p=S6PAT[k]=ctx.createPattern(im,'repeat');
  try{p.setTransform(new DOMMatrix().translateSelf(X(0),Y(0)).scaleSelf(Z*380/512));}catch(_){}return p;}
function s6Draw(){const D=R.s6;if(!D)return;const sp=Math.hypot(D.vx,D.vy),la=Math.min(1,sp/400)*170;
  const cx=D.x+Math.cos(D.a)*la,cy=D.y+Math.sin(D.a)*la*.6,Z=S6_ZOOM,X=x=>(x-cx)*Z+WW/2,Y=y=>(y-cy)*Z+WH/2;
  const x0=cx-WW/2/Z-40,x1=cx+WW/2/Z+40,y0=cy-WH/2/Z-40,y1=cy+WH/2/Z+40;
  ctx.save();if(R.shake>0)ctx.translate((Math.random()-.5)*8,(Math.random()-.5)*8);
  s6Ground(D,X,Y,Z,x0,x1,y0,y1);
  for(const f of D.fx)if(f.k==='splat'&&f.ty&&S6M['z_'+f.ty+'5']&&s6ok(S6SPR)){s6SprF('z_'+f.ty+'5',X(f.x),Y(f.y)+f.r*Z*.6,f.r*Z*(f.ty==='brute'?2.6:3.2),f.lf,Math.min(1,f.t/2));}else if(f.k==='splat'){ctx.globalAlpha=Math.min(1,f.t/2)*.8;ctx.fillStyle=f.col;ctx.beginPath();ctx.ellipse(X(f.x),Y(f.y),f.r*1.3*Z,f.r*.9*Z,f.x%3,0,6.283);ctx.fill();ctx.globalAlpha=1;}
  for(const o of D.ob){if(o.x<x0-60||o.x>x1+60||o.y<y0-60||o.y>y1+60)continue;s6Prop(o,X(o.x),Y(o.y),Z);}
  for(const f of D.fx)if(f.k==='throw'){const q=Math.min(1,(f.tt||0)/f.T),x=X(f.x),y=Y(f.y);ctx.strokeStyle='rgba(255,77,94,'+(.4+.4*q)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,60*Z,0,6.283);ctx.stroke();
    const px=X(f.x0+(f.x-f.x0)*q),py=Y(f.y0+(f.y-f.y0)*q)-Math.sin(q*Math.PI)*80*Z;ctx.fillStyle='#5a5f6c';ctx.fillRect(px-14*Z,py-10*Z,28*Z,20*Z);}
  const ord=R.en.slice().sort((a,b)=>a.y-b.y);for(const e of ord){if(e.x<x0||e.x>x1||e.y<y0||e.y>y1)continue;s6Enemy(e,X(e.x),Y(e.y),Z);}
  if(D.ward)s6WardDraw(D.ward,X(D.ward.x),Y(D.ward.y),Z);
  s6Jeep(D,X(D.x),Y(D.y),Z);
  for(const o of D.orbs){const g=ctx.createRadialGradient(X(o.x),Y(o.y),1,X(o.x),Y(o.y),10);g.addColorStop(0,'#fff');g.addColorStop(.4,'#c9a7ff');g.addColorStop(1,'rgba(201,167,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(X(o.x),Y(o.y),10,0,6.283);ctx.fill();}
  for(const f of D.fx){
    if(f.k==='tr'){ctx.strokeStyle=f.col;ctx.lineWidth=2;ctx.globalAlpha=f.t/.08;ctx.beginPath();ctx.moveTo(X(f.x1),Y(f.y1));ctx.lineTo(X(f.x2),Y(f.y2));ctx.stroke();ctx.globalAlpha=1;}
    else if(f.k==='bolt'){ctx.strokeStyle='#cfe0ff';ctx.shadowColor='#a98bff';ctx.shadowBlur=10;ctx.lineWidth=2.5;ctx.beginPath();f.pts.forEach((p,i)=>{const x=X(p[0])+(i?(Math.random()-.5)*6:0),y=Y(p[1])+(i?(Math.random()-.5)*6:0);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();ctx.shadowBlur=0;}
    else if(f.k==='flame'){for(let i=0;i<7;i++){const q=Math.random(),r=f.r*q*Z,a=f.a+(Math.random()-.5)*.5;ctx.globalAlpha=(1-q)*.8;ctx.fillStyle=i%2?'#ff7a2e':'#ffc53d';ctx.beginPath();ctx.arc(X(f.x)+Math.cos(a)*r,Y(f.y)+Math.sin(a)*r,3+q*11*Z,0,6.283);ctx.fill();}ctx.globalAlpha=1;}
    else if(f.k==='pop'||f.k==='boom'){const r=(f.k==='boom'?70:22)*(1-f.t/(f.k==='boom'?.5:.3))*Z+4;ctx.globalAlpha=f.t*2;ctx.fillStyle=f.k==='boom'?'#ff9a3d':'#c9a7ff';ctx.beginPath();ctx.arc(X(f.x),Y(f.y),r,0,6.283);ctx.fill();ctx.globalAlpha=1;}
    else if(f.k==='heal'){ctx.strokeStyle='rgba(182,242,58,'+f.t+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(X(D.x),Y(D.y),(70-f.t*40)*Z,0,6.283);ctx.stroke();}}
  ctx.restore();
  if(D.dmgT>0){ctx.fillStyle='rgba(255,40,40,'+D.dmgT*.6+')';ctx.fillRect(0,0,WW,WH);}
  s6HUD(D);}
function s6Tree(x,y,r){ctx.fillStyle='#0f1a12';ctx.beginPath();ctx.arc(x+3,y+4,r,0,6.283);ctx.fill();ctx.fillStyle='#1f3a22';ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();ctx.fillStyle='#2d5230';ctx.beginPath();ctx.arc(x-r*.25,y-r*.25,r*.55,0,6.283);ctx.fill();}
function s6Ground(D,X,Y,Z,x0,x1,y0,y1){
  const z0=s6Zone(Math.max(0,x0)),bgc={forest:'#14231a',back:'#2a2a1a',ramp:'#22241f',hwy:'#1d1f22',base:'#26231c',croad:'#1d1c22',city:'#121318'};
  const zz=s6Zone(D.x),offT={forest:'dirt',back:'dirt',ramp:'dirt',hwy:'dirt',base:'conc',croad:'dirt',city:'asph'}[zz],offP=s6Pat(offT,X,Y,Z);
  ctx.fillStyle=bgc[zz];ctx.fillRect(0,0,WW,WH);if(offP){ctx.fillStyle=offP;ctx.fillRect(0,0,WW,WH);ctx.fillStyle={forest:'rgba(6,16,8,.72)',back:'rgba(10,14,6,.66)',base:'rgba(8,6,10,.5)',city:'rgba(6,6,10,.35)'}[zz]||'rgba(8,6,10,.66)';ctx.fillRect(0,0,WW,WH);}
  if(x0<X_CITY+200){// the road as a strip
    const st=16;ctx.beginPath();for(let x=Math.floor(x0/st)*st;x<=Math.min(x1,X_CITY+40);x+=st)ctx.lineTo(X(x),Y(cyAt(x)-hwAt(x)));for(let x=Math.min(x1,X_CITY+40);x>=Math.floor(x0/st)*st;x-=st)ctx.lineTo(X(x),Y(cyAt(x)+hwAt(x)));ctx.closePath();
    const zc=s6Zone((x0+x1)/2),rp=s6Pat(zc==='forest'||zc==='back'?'dirt':zc==='base'?'conc':'asph',X,Y,Z);ctx.fillStyle=rp||(zc==='forest'?'#5a4128':zc==='base'?'#4a4740':'#34363b');ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=6*Z;ctx.stroke();
    // lane markings
    ctx.strokeStyle='rgba(239,230,220,.55)';ctx.lineWidth=3*Z;ctx.setLineDash([26*Z,26*Z]);
    for(const off of (zc==='hwy'?[-115,0,115]:zc==='forest'?[]:[0])){ctx.beginPath();for(let x=Math.max(X_BACK,Math.floor(x0/st)*st);x<=Math.min(x1,X_CITY);x+=st)ctx.lineTo(X(x),Y(cyAt(x)+off*(hwAt(x)/230)));ctx.stroke();}ctx.setLineDash([]);
    // edges: trees in the forest, rails on the highway, fences at the base
    for(let x=Math.floor(x0/60)*60;x<=Math.min(x1,X_CITY);x+=60){const z=s6Zone(x),c=cyAt(x),h=hwAt(x);
      if(z==='forest'||z==='back'||z==='ramp'){const dense=z==='ramp'?1:3;for(const s of[-1,1])for(let k=0;k<dense;k++){const hh=hash3(x*7+s*13+k*31),yy=c+s*(h+34+k*60+hh*30);if(yy<y0-60||yy>y1+60)continue;const d=(64+hh*44)*Z;if(!s6Spr('tree'+Math.floor(hh*3*.999),X(x+hh*40),Y(yy),d))s6Tree(X(x+hh*40),Y(yy),d*.35);}}
      if(z==='hwy'||z==='ramp'||z==='croad'){if(Math.round(x/60)%2===0)for(const s of[-1,1]){const a=s6RoadA(x+60);if(!s6Spr('rail',X(x+60),Y(c+s*(h+8)),124*Z,a)){ctx.fillStyle='#8a94a6';ctx.fillRect(X(x),Y(c+s*(h+6))-2,120*Z+1,4);}}
        if(z==='hwy')for(const s of[-1,1]){const hh=hash3(x*3+s);if(hh<.12){const yy=c+s*(h+70+hh*400);if(!s6Spr(hh<.05?'cop':'car',X(x),Y(yy),80*Z,s6RoadA(x)+hh*20,hh<.06,.85)){ctx.fillStyle='#2a2d22';ctx.fillRect(X(x),Y(yy),50*Z,40*Z);}}
          else if(hh>.88){const d=(70+hh*30)*Z;s6Spr('tree'+Math.floor(hh*30)%3,X(x),Y(c+s*(h+90+hh*260)),d);}}}
      else if(z==='base'){if(Math.round(x/60)%2===0)for(const s of[-1,1]){if(!s6Spr('barrier',X(x),Y(c+s*(h+16)),62*Z,s6RoadA(x))){ctx.fillStyle='#6a6a5a';ctx.fillRect(X(x),Y(c+s*(h+12))-3,60*Z+1,6);}}
        for(const s of[-1,1]){const hh=hash3(x*5+s*7);if(hh<.3){const k=['tent','tower','crates','tank','tent','sand'][Math.floor(hh/.3*6)%6],w={tent:96,tower:66,crates:60,tank:150,sand:72}[k];s6Spr(k,X(x+10),Y(c+s*(h+80+hh*150)),w*Z);}}}}
    if(x0<X_BASE+40&&x1>X_BASE-40){for(const s of[-1,1]){ctx.fillStyle='#5a5a4a';ctx.fillRect(X(X_BASE-14),Y(cyAt(X_BASE)+s*(hwAt(X_BASE)+20)),28*Z,s*400*Z);}ctx.fillStyle='#ffc53d';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('FORT HOLDOUT',X(X_BASE),Y(cyAt(X_BASE)-hwAt(X_BASE)-30));}}
  if(x1>X_CITY-200){// city: streets and blocks
    const ap=s6Pat('asph',X,Y,Z);ctx.fillStyle=ap||'#1b1c21';for(let i=0;i<=6;i++){const x=X_CITY+i*CB;ctx.fillRect(X(x-CS),Y(-3*CB-CS),2*CS*Z,6*CB*Z+2*CS*Z);}
    for(let j=-3;j<=3;j++){ctx.fillRect(X(X_CITY-CS),Y(j*CB-CS),(6*CB+2*CS)*Z,2*CS*Z);}
    ctx.fillRect(X(X_CROAD+600),Y(-CS),(X_CITY-X_CROAD-600)*Z,2*CS*Z);
    for(let i=-1;i<=6;i++)for(let j=-4;j<=3;j++){const bx=X_CITY+i*CB+CS,by=j*CB+CS,w=CB-2*CS;if(bx+w<x0||bx>x1||by+w<y0||by>y1)continue;
      const frost=i===4&&j===-3,h=hash3(i*17+j*5);
      if(s6ok(S6SPR)&&S6M.roof0){ctx.fillStyle='#120c14';ctx.fillRect(X(bx),Y(by),w*Z,w*Z);
        if(frost){const r=S6M.helipad,hh=w*r[3]/r[2];s6Spr('helipad',X(bx+w/2),Y(by+w/2),w*Z);const hx=X(bx+w/2),hy=Y(by+w/2),g=ctx.createRadialGradient(hx,hy,4,hx,hy,200*Z);g.addColorStop(0,'rgba(199,120,255,'+(.22+.18*Math.sin(t*4))+')');g.addColorStop(1,'rgba(199,120,255,0)');ctx.fillStyle=g;ctx.fillRect(hx-200*Z,hy-200*Z,400*Z,400*Z);ctx.fillStyle='#9fe8ff';ctx.fillRect(X(S6_LOBBY[0])-40*Z,Y(by+w)-6,80*Z,6);}
        else s6Spr('roof'+Math.floor(h*4*.999),X(bx+w/2),Y(by+w/2),w*Z*1.02);continue;}
      ctx.fillStyle=frost?'#5a4070':['#4a4c58','#544a56','#45505a','#58524a'][Math.floor(h*4)];ctx.fillRect(X(bx),Y(by),w*Z,w*Z);
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(X(bx)+6,Y(by)+6,w*Z-12,w*Z-12);ctx.fillStyle=frost?'#6a4a80':'#3a3c46';ctx.fillRect(X(bx)+12,Y(by)+12,w*Z-24,w*Z-24);
      if(frost){const hx=X(bx+w/2),hy=Y(by+w/2);ctx.strokeStyle='#ffc53d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(hx,hy,90*Z,0,6.283);ctx.stroke();ctx.fillStyle='#ffc53d';ctx.font=(70*Z|0)+'px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('H',hx,hy+25*Z);
        const g=ctx.createRadialGradient(hx,hy,4,hx,hy,180*Z);g.addColorStop(0,'rgba(159,232,255,'+(.25+.2*Math.sin(t*4))+')');g.addColorStop(1,'rgba(159,232,255,0)');ctx.fillStyle=g;ctx.fillRect(hx-180*Z,hy-180*Z,360*Z,360*Z);
        ctx.fillStyle='#9fe8ff';ctx.fillRect(X(S6_LOBBY[0])-40*Z,Y(by+w)-6,80*Z,6);}
      else if(h<.5){ctx.fillStyle='#ff7a2e';ctx.globalAlpha=.35+.25*Math.sin(t*3+h*9);ctx.beginPath();ctx.arc(X(bx+w*h),Y(by+w*(1-h)),22*Z,0,6.283);ctx.fill();ctx.globalAlpha=1;}}
    ctx.strokeStyle='rgba(255,197,61,.35)';ctx.lineWidth=2;ctx.setLineDash([18*Z,18*Z]);for(let i=0;i<=6;i++){const x=X(X_CITY+i*CB);ctx.beginPath();ctx.moveTo(x,Y(-3*CB));ctx.lineTo(x,Y(3*CB));ctx.stroke();}for(let j=-3;j<=3;j++){const y=Y(j*CB);ctx.beginPath();ctx.moveTo(X(X_CROAD+600),y);ctx.lineTo(X(X_CITY+6*CB),y);ctx.stroke();}ctx.setLineDash([]);
    S6BR=S6BR||s6BarRects();for(const b of S6BR){if(s6ok(S6SPR)&&S6M.barrier){const w=b.w>b.h,L=w?b.w:b.h,n=Math.max(1,Math.round(L/60));for(let k=0;k<n;k++){const u=-L/2+(k+.5)*L/n;s6Spr(k%3===1?'sand':'barrier',X(b.x+(w?u:0)),Y(b.y+(w?0:u)),(k%3===1?66:60)*Z,w?0:Math.PI/2);}continue;}ctx.fillStyle='#4a3a2a';ctx.fillRect(X(b.x-b.w/2),Y(b.y-b.h/2),b.w*Z,b.h*Z);ctx.fillStyle='#ffc53d';for(let k=0;k<4;k++){const w=b.w>b.h;ctx.fillRect(X(b.x-b.w/2)+(w?k*b.w*Z/4:0),Y(b.y-b.h/2)+(w?0:k*b.h*Z/4),w?b.w*Z/8:b.w*Z,w?b.h*Z:b.h*Z/8);}}}}
function s6Prop(o,x,y,Z){if(s6Spr(o.k,x,y,S6_OBK[o.k].L*Z,o.k==='barrel'?0:o.a,o.fl))return;
  ctx.save();ctx.translate(x,y);ctx.rotate(o.a);
  if(o.k==='car'||o.k==='cop'){ctx.fillStyle='#000a';ctx.fillRect(-26*Z+3,-14*Z+3,52*Z,28*Z);ctx.fillStyle='#4a2a2a';ctx.fillRect(-26*Z,-14*Z,52*Z,28*Z);}
  else if(o.k==='truck'){ctx.fillStyle='#2e3a26';ctx.fillRect(-70*Z,-20*Z,140*Z,40*Z);}
  else{ctx.fillStyle='#6a5a3a';ctx.beginPath();ctx.arc(0,0,o.r*Z,0,6.283);ctx.fill();}
  ctx.restore();}
function s6Enemy(e,x,y,Z){
  if(S6M['z_'+e.type+'0']&&s6ok(S6SPR)){const D=R.s6,lf=D.x<e.x,near=Math.hypot(D.x-e.x,D.y-e.y)<e.r+40,fr=near?4:Math.floor(e.wob)%4,w=e.r*Z*(e.type==='brute'?2.3:e.type==='armored'?2.6:2.9);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y,e.r*Z*.9,e.r*Z*.4,0,0,6.283);ctx.fill();
    s6SprF('z_'+e.type+fr,x,y,w,lf);if(e.hitT>0){ctx.globalCompositeOperation='lighter';s6SprF('z_'+e.type+fr,x,y,w,lf,.5);ctx.globalCompositeOperation='source-over';}return;}
  const M=META[e.type];ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y,e.r*Z*1.1,e.r*Z*.5,0,0,6.283);ctx.fill();
  if(M&&atlasReady){const A=M.walk,fr=A[Math.floor(e.wob)%A.length],sc=Z*e.r*2.6/120*(e.type==='brute'?1.2:1);drawFrame(fr,x,y,sc,1);
    if(e.hitT>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,x,y,sc,.5);ctx.globalCompositeOperation='source-over';}}
  else{ctx.fillStyle='#5ee08a';ctx.beginPath();ctx.arc(x,y-10,e.r*Z,0,6.283);ctx.fill();}}
function s6WardDraw(W,x,y,Z){
  if(S6M.ww0&&s6ok(S6SPR)){const D=R.s6,lf=D.x<W.x,w=105*Z;let n;
    if(W.down>0)n='wd'+(Math.floor(t*2)%2);else if(W.slamT>1.1)n='ws'+Math.min(3,Math.floor((1.6-W.slamT)/.125));else if(W.roar>0)n='ws'+(1+Math.floor(t*6)%2);else n='ww'+(Math.floor(W.wob)%4);
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y,42*Z,18*Z,0,0,6.283);ctx.fill();
    s6SprF(n,x,y,w*(n[1]==='d'?1.2:1),lf);if(W.hitT>0){ctx.globalCompositeOperation='lighter';s6SprF(n,x,y,w,lf,.4);ctx.globalCompositeOperation='source-over';}return;}
const M=META.boss,fr=W.down>0?M.death[Math.min(M.death.length-1,6)]:W.roar>0?M.roar[Math.floor(t*6)%M.roar.length]:M.walk[Math.floor(W.wob)%M.walk.length],sc=Z*.95;
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(x,y,50*Z,20*Z,0,0,6.283);ctx.fill();if(atlasReady){drawFrame(fr,x,y,sc,1);if(W.hitT>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,x,y,sc,.4);ctx.globalCompositeOperation='source-over';}}}
function s6Jeep(D,x,y,Z){ctx.save();ctx.translate(x,y);ctx.rotate(D.a);const s=Z;
  const fr=D.dead?2:D.hp/D.max<.5?1:0,jr=S6M['jeep'+fr];
  if(jr&&s6ok(S6SPR)){const J=1.3,k=s*J*84/284;
    if(fr<2){const g=ctx.createRadialGradient(150*s,0,10*s,150*s,0,150*s);g.addColorStop(0,'rgba(255,233,160,.28)');g.addColorStop(1,'rgba(255,233,160,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(52*s,-16*s);ctx.lineTo(280*s,-95*s);ctx.lineTo(280*s,95*s);ctx.lineTo(52*s,16*s);ctx.closePath();ctx.fill();}
    if(D.dmgT>0)ctx.filter='brightness(1.6)';ctx.drawImage(S6SPR,jr[0],jr[1],jr[2],jr[3],-146*k,-127*k,jr[2]*k,jr[3]*k);ctx.filter='none';
    for(const st of S6_SEATS){const id=D.seats[st];if(!id)continue;const[f,r]=S6_POS[st],col=id==='cmd'?'#ffc53d':HEROES[id].color,px=f*s*J,py=r*s*J,rr=(st==='stand'?8.5:7.5)*s;
      if(S6M['r_'+id]&&s6ok(S6SPR)){s6Spr('r_'+id,px,py,rr*2.8,0);continue;}
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,rr+1.6*s,0,6.283);ctx.fill();const pi=POR[id];
      if(pi&&pi.complete&&pi.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(px,py,rr,0,6.283);ctx.clip();ctx.translate(px,py);ctx.rotate(-D.a);ctx.drawImage(pi,-rr,-rr,rr*2,rr*2);ctx.restore();}
      else{ctx.fillStyle='#0b0b0b';ctx.beginPath();ctx.arc(px,py,rr*.7,0,6.283);ctx.fill();}}
    if(D.seats.stand==='hex'){ctx.strokeStyle='rgba(182,242,58,'+(.25+.15*Math.sin(t*4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,70*s,42*s,0,0,6.283);ctx.stroke();}
    ctx.restore();return;}
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(-40*s+4,-21*s+5,80*s,42*s);
  ctx.fillStyle='#111';for(const[a,b]of[[22,-21],[22,15],[-24,-21],[-24,15]])ctx.fillRect(a*s-8*s,b*s,16*s,6*s);
  ctx.fillStyle=D.dmgT>0?'#7a6a3a':'#4f5e34';ctx.fillRect(-38*s,-18*s,76*s,36*s);ctx.fillStyle='#3e4a28';ctx.fillRect(22*s,-18*s,16*s,36*s);
  ctx.fillStyle='#9fc8d8';ctx.fillRect(18*s,-15*s,3*s,30*s);ctx.fillStyle='#ffe9a0';ctx.fillRect(37*s,-15*s,3*s,6*s);ctx.fillRect(37*s,9*s,3*s,6*s);
  for(const st of S6_SEATS){const id=D.seats[st];if(!id)continue;const[f,r]=S6_POS[st],col=id==='cmd'?'#ffc53d':HEROES[id].color;ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(f*s,r*s,7*s,0,6.283);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(f*s,r*s,5.2*s,0,6.283);ctx.fill();}
  if(D.seats.stand==='hex'){ctx.strokeStyle='rgba(182,242,58,'+(.25+.15*Math.sin(t*4))+')';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,52*s,32*s,0,0,6.283);ctx.stroke();}
  ctx.restore();}
function s6HUD(D){const hp=D.hp/D.max;ctx.fillStyle='#0d1016cc';ctx.fillRect(12,10,250,30);ctx.fillStyle='#efe6dc';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='left';ctx.fillText('JEEP',20,30);
  ctx.fillStyle='#2a1f33';ctx.fillRect(62,19,190,12);ctx.fillStyle=hp<.3&&(t%.5<.25)?'#ff4d5e':hp<.5?'#ffc53d':'#5ee08a';ctx.fillRect(62,19,190*hp,12);
  const sp=Math.round(Math.hypot(D.vx,D.vy)/5.2);ctx.fillStyle='#0d1016cc';ctx.fillRect(12,44,110,22);ctx.fillStyle='#efe6dc';ctx.fillText(sp+' MPH',20,60);
  // progress until the city, radar after
  if(D.x<X_CITY-CS){const p=Math.min(1,D.x/X_CITY);ctx.fillStyle='#0d1016cc';ctx.fillRect(WW/2-150,10,300,24);ctx.fillStyle='#2a1f33';ctx.fillRect(WW/2-140,25,280,4);
    for(const[xx,l]of[[X_BACK,''],[X_HWY,''],[X_BASE,''],[X_CROAD,'']]){ctx.fillStyle='#5a6070';ctx.fillRect(WW/2-140+280*xx/X_CITY-1,22,2,10);}
    ctx.fillStyle='#ffc53d';ctx.fillRect(WW/2-140,25,280*p,4);ctx.fillStyle='#efe6dc';ctx.textAlign='center';ctx.fillText(S6_ZNAME[s6Zone(D.x)],WW/2,21);}
  else{const dx=S6_LOBBY[0]-D.x,dy=S6_LOBBY[1]-D.y,a=Math.atan2(dy,dx),d=Math.round(Math.hypot(dx,dy)/10);ctx.fillStyle='#0d1016cc';ctx.beginPath();ctx.arc(WW/2,34,26,0,6.283);ctx.fill();
    ctx.save();ctx.translate(WW/2,34);ctx.rotate(a);ctx.fillStyle='#9fe8ff';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-8,-10);ctx.lineTo(-3,0);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle='#efe6dc';ctx.textAlign='center';ctx.fillText('FROST · '+d+'M',WW/2,76);}
  const W=D.ward;if(W){const bx=WW-262;ctx.fillStyle='#0d1016cc';ctx.fillRect(bx,44,250,24);ctx.fillStyle='#ff4d5e';ctx.textAlign='left';ctx.fillText(W.down>0?'THE WARD · DOWN':'THE WARD · '+Math.max(0,Math.round(-W.d/10))+'M',bx+8,60);
    ctx.fillStyle='#2a1f33';ctx.fillRect(bx+150,52,92,6);ctx.fillStyle=W.down>0?'#5a6070':'#ff4d5e';ctx.fillRect(bx+150,52,92*(W.down>0?1-W.down/6.5:W.stag/W.stagMax),6);}
  for(const k in S6B){const b=S6B[k],on=k!=='p'&&D.in[k];ctx.globalAlpha=on?.9:.55;ctx.fillStyle=on?'#ffc53d55':'#0d101688';ctx.strokeStyle='#ffc53d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x(),b.y(),b.r,0,6.283);ctx.fill();ctx.stroke();
    ctx.fillStyle='#efe6dc';ctx.font=(b.t.length>2?12:18)+'px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.t,b.x(),b.y()+6);}ctx.globalAlpha=1;
  if(R.banner){const b=R.banner;ctx.globalAlpha=Math.min(1,b.t*2);ctx.fillStyle=b.col||'#ffc53d';ctx.font='20px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.txt,WW/2,WH*.32);ctx.globalAlpha=1;}
  if(R.say)drawSay();}

const BLZM={"vm0": [0, 0, 326, 434], "vm1": [328, 0, 326, 434], "vm2": [656, 0, 326, 434], "vm3": [984, 0, 326, 434], "fl0": [1312, 0, 275, 371], "fl1": [1589, 0, 280, 374], "fl2": [0, 436, 281, 374], "fl3": [283, 436, 275, 372], "bz0": [560, 436, 167, 320], "bz1": [729, 436, 163, 287], "bz2": [894, 436, 153, 299], "bz3": [1049, 436, 180, 272], "bz4": [1231, 436, 176, 235], "bz5": [1409, 436, 155, 203], "bz6": [1566, 436, 188, 211]},BLZIMG=new Image();let blzReady=false;BLZIMG.onload=()=>{blzReady=true;};
function blzLoad(){if(!BLZIMG.src)BLZIMG.src="assets/blz.webp?v=f49993378e";}
const BZ_REACH=120,BZ_ZR=900,BZ_RANGE=1350;
function blazeStart(crew){blzLoad();state='blaze';camX=0;SX=0;
  R.en=[];R.bu=[];R.pa=[];R.dead=[];R.tx=[];R.cr=[];R.bolts=[];R.slashes=[];R.banner=null;R.civHide=1;
  const N=HORDE()?80:52;R.blz={ph:'ign',crew,fill:0,left:6,tapT:0,t:0,z:[],left2:N,aim:0,fire:false,dn:false,endT:0,lit:0};
  for(let i=0;i<14;i++)bzSpawn(900+Math.random()*520);
  ui();last=performance.now();}
function bzSpawn(z){const B=R.blz,fast=Math.random()<.18;B.left2--;const x0=(Math.random()*2-1)*560;B.z.push({x0,type:fast?'runner':'grunt',r:fast?53:64,x:x0,z:z||700+Math.random()*330,spd:fast?130+Math.random()*30:70+Math.random()*35,wob:Math.random()*6,hp:1,max:1,heat:0,burn:-1});}
function blazeUpdate(dt){const B=R.blz;if(!B)return;B.t+=dt;t+=dt;
  for(const p of R.pa){p.x+=(p.vx||0)*dt;p.z+=(p.vz||0)*dt;p.h+=(p.vh||0)*dt;p.t-=dt;}R.pa=R.pa.filter(p=>p.t>0);if(R.shake>0)R.shake-=dt;
  if(B.ph==='ign'){B.left-=dt;B.tapT-=dt;B.fill=Math.max(0,B.fill-.05*dt);for(const z of B.z){z.z=Math.max(300+z.wob*14,z.z-(z.type==='runner'?.55:.85)*z.spd*dt);z.x=z.x0*Math.min(1,z.z/BZ_ZR);}
    if(B.left<=0){blazeEnd(false);}return;}
  if(B.ph==='lit'){B.lit+=dt;if(B.lit>.9){B.ph='cut';startIntro(()=>{state='blaze';B.ph='sweep';B.t=0;ui();last=performance.now();},[TE.t8]);}return;}
  if(B.ph==='end'){B.endT+=dt;for(const z of B.z)if(z.burn>=0)z.burn+=dt;if(B.endT>1.6){B.ph='done';townEndFinish(B.won,B.crew);}return;}
  if(B.ph!=='sweep')return;
  if(B.left2>0&&Math.random()<dt*(HORDE()?4.3:3.1))bzSpawn();
  const A=B.aim;if(B.fire&&Math.random()<dt*40){const zz=200+Math.random()*900;R.pa.push({x:A*zz/BZ_ZR+(Math.random()-.5)*80,z:zz,h:20+Math.random()*60,vx:(Math.random()-.5)*40,vz:0,vh:60+Math.random()*90,t:.5,col:Math.random()<.5?'#ffb347':'#ff6a2b'});}
  for(const z of B.z){
    if(z.burn>=0){z.burn+=dt;if(z.burn<1.1)z.z-=z.spd*.18*dt;if(Math.random()<dt*10&&z.burn<1.6)R.pa.push({x:z.x+(Math.random()-.5)*30,z:z.z,h:30+Math.random()*80,vx:0,vz:0,vh:90,t:.45,col:Math.random()<.5?'#ffb347':'#ff6a2b'});continue;}
    z.z-=z.spd*dt;z.x=z.x0*Math.min(1,z.z/BZ_ZR);
    if(B.fire&&z.z<BZ_RANGE){const cx=A*z.z/BZ_ZR,w=75+z.z*.06;if(Math.abs(z.x-cx)<w){z.heat+=dt;if(z.heat>.26){z.burn=0;SND.groan((z.x/600)||0,.25);}}}
    if(z.z<BZ_REACH&&z.burn<0){blazeEnd(false);return;}}
  B.z=B.z.filter(z=>!(z.burn>3.4));
  if(B.left2<=0&&!B.z.some(z=>z.burn<0)){B.ph='end';B.won=true;SND.levelUp();}}
function blazeEnd(won){const B=R.blz;if(B.ph==='end'||B.ph==='done')return;B.fire=false;B.won=won;B.ph='end';B.endT=won?0:.6;R.shake=.5;if(!won){SND.explosion(.3);SND.groan(0,.9);}}
function blazeTap(gx){const B=R.blz;if(!B)return;
  if(B.ph==='ign'){B.fill=Math.min(1,B.fill+1/24);B.tapT=.12;SND.click();if(Math.random()<.5)R.pa.push({x:0,z:60,h:40,vx:(Math.random()-.5)*80,vz:0,vh:120,t:.3,col:'#ffe08a'});if(B.fill>=1){B.ph='lit';B.lit=0;SND.whoosh();}return;}
  if(B.ph==='sweep'){B.dn=true;B.fire=true;blazeAim(gx);}}
function blazeAim(gx){const B=R.blz;if(!B||B.ph!=='sweep')return;const k=K(BZ_ZR);B.aim=Math.max(-680,Math.min(680,(gx-WW/2)/k));}
function blazeUp(){const B=R.blz;if(!B)return;B.dn=false;B.fire=false;}
function bzRect(n){return BLZM[n];}
function bzDraw(n,x,y,h,anchor,alpha,rot){const r=BLZM[n];if(!r||!blzReady)return;const sc=h/r[3],w=r[2]*sc;ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.translate(x,y);if(rot)ctx.rotate(rot);
  const ax=anchor&&anchor[0]!=null?anchor[0]:.5,ay=anchor&&anchor[1]!=null?anchor[1]:1;const q=BLZIMG.naturalWidth/2048;ctx.drawImage(BLZIMG,r[0]*q,r[1]*q,r[2]*q,r[3]*q,-w*ax,-h*ay,w,h);ctx.restore();}
function drawBlaze(){const B=R.blz;if(!B)return;
  // zombies far to near
  const L=B.z.slice().sort((a,b)=>b.z-a.z);
  for(const z of L){const[sx,sy,k]=P(z.x,z.z);const fade=Math.max(0,Math.min(1,(2900-z.z)/400));
    if(z.burn<0){if(atlasReady&&META[z.type])drawEnemySprite(z,sx,sy,k,fade);continue;}
    const H=z.r*EH*k*1.25,f=z.burn<1.1?'bz'+(Math.floor(z.burn*8+z.wob)%4):z.burn<1.35?'bz4':z.burn<1.6?'bz5':'bz6',a=z.burn<2.4?1:Math.max(0,(3.4-z.burn));
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(sx,sy,z.r*1.1*k,z.r*.3*k,0,0,6.283);ctx.fill();
    bzDraw(f,sx,sy,H*BLZM[f][3]/BLZM.bz0[3],[.5,1],a);
    if(z.burn<1.6){ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(sx,sy-H*.5,0,sx,sy-H*.5,H*.8);g.addColorStop(0,'rgba(255,140,50,.35)');g.addColorStop(1,'rgba(255,140,50,0)');ctx.fillStyle=g;ctx.fillRect(sx-H,sy-H*1.3,H*2,H*1.6);ctx.globalCompositeOperation='source-over';}}
  for(const p of R.pa){const[x,y,k]=P(p.x,p.z,p.h);ctx.globalAlpha=Math.max(0,Math.min(1,p.t*2));ctx.fillStyle=p.col;const s=Math.max(1.5,6*k);ctx.fillRect(x-s/2,y-s/2,s,s);}ctx.globalAlpha=1;
  // viewmodel + flame
  const vmH=WH*.5,sway=B.ph==='sweep'?B.aim/680:0,bob=Math.sin(t*2.2)*2+(B.fire?Math.sin(t*40)*1.5:0),vx=WW/2+sway*70,vy=WH+6+bob;
  const fr=B.ph==='ign'?(B.tapT>0?'vm1':'vm0'):B.fire?'vm3':'vm2',rot=sway*.12;
  if(B.fire){const pf=[];for(let i=0;i<12;i++){const z=170+((i*110+t*900)%1260);pf.push(z);}pf.sort((a,b)=>b-a);
    ctx.globalCompositeOperation='lighter';for(const z of pf){const[px,py,k]=P(B.aim*z/BZ_ZR,z,40),h=Math.max(12,300*k),a=Math.min(1,(1500-z)/400);
      bzDraw('fl'+(Math.floor(t*14+z)%4),px,py+h*.5,h,[.5,1],a*.85,0);}ctx.globalCompositeOperation='source-over';}
  bzDraw(fr,vx,vy,vmH,[.5,1],1,rot);
  // HUD
  ctx.textAlign='center';
  if(B.ph==='ign'){const pu=.5+.5*Math.sin(B.t*10),sz=26+pu*8+(B.tapT>0?6:0);ctx.save();ctx.font=sz+'px Bungee, Impact, sans-serif';ctx.lineWidth=5;ctx.strokeStyle='#0d1016';ctx.fillStyle=B.tapT>0?'#ffffff':'#ffc53d';ctx.globalAlpha=.55+.45*pu;const ty=WH-vmH*.62;ctx.strokeText('TAP!',vx,ty);ctx.fillText('TAP!',vx,ty);ctx.restore();
    if(B.t<2.5){ctx.globalAlpha=Math.min(1,2.5-B.t);ctx.fillStyle='#efe6dc';ctx.font='12px Bungee, Impact, sans-serif';ctx.fillText('TAP FAST TO LIGHT THE FLAMETHROWER',WW/2,HOR+40);ctx.globalAlpha=1;}}
  if(B.ph==='ign'||B.ph==='lit'){const w=Math.min(300,WW*.5),x0=WW/2-w/2,y0=36;ctx.fillStyle='#0d1016cc';ctx.fillRect(x0-12,y0-26,w+24,58);
    ctx.fillStyle='#ffc53d';ctx.font='15px Bungee, Impact, sans-serif';ctx.fillText(B.ph==='lit'?'LIT!':'SPARK THE IGNITER! TAP!',WW/2,y0-6);
    ctx.fillStyle='#2a1f33';ctx.fillRect(x0,y0+4,w,12);ctx.fillStyle=B.ph==='lit'?'#b6f23a':'#ff6a2b';ctx.fillRect(x0,y0+4,w*B.fill,12);
    ctx.fillStyle='#efe6dc';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='right';ctx.fillText(Math.max(0,B.left).toFixed(1),x0+w+8,y0-6);ctx.textAlign='center';}
  if(B.ph==='sweep'){const n=B.z.filter(z=>z.burn<0).length+B.left2;ctx.fillStyle='#0d1016aa';ctx.fillRect(WW/2-90,10,180,26);ctx.fillStyle='#ffc53d';ctx.font='13px Bungee, Impact, sans-serif';ctx.fillText(n+' LEFT',WW/2,28);
    if(B.t<3.5&&!B.fire){ctx.globalAlpha=Math.min(1,(3.5-B.t));ctx.fillStyle='#efe6dc';ctx.font='15px Bungee, Impact, sans-serif';ctx.fillText('HOLD AND SLIDE TO BURN THEM',WW/2,HOR+20);ctx.globalAlpha=1;}}
}

/* ---------- ABILITIES & SUPERS ---------- */
const SUP_KILLS={cmd:40,bruno:45,rook:90,hex:40,blaze:60,volt:50,frost:50,nova:35},SUP_TRICKLE={rook:200};
const supOn=id=>pts(id).sup>0&&lvOf(id)>=25&&!!HSTAT[id];
function supV(id){save.sup=save.sup||{};return save.sup[id]||0;}
function supCharge(id,v){if(!HSTAT[id]||!supOn(id)||!SUP_KILLS[id])return;save.sup=save.sup||{};const was=save.sup[id]||0;save.sup[id]=Math.min(1,was+v);
  if(was<1&&save.sup[id]>=1&&R){const m=squad().find(q=>q.id===id);if(m){const[px,py]=P(m.x,m.z,CHAR_H+24);R.tx.push({x:px,y:py,txt:'SUPER READY',col:'#b6f23a',t:1.6});}SND.chime&&SND.chime();}}
function supUpdate(dt){if(R.cine)return;for(const m of squad())supCharge(m.id,dt/(SUP_TRICKLE[m.id]||90));if(R.rcT>0)R.rcT-=dt;}
function tapSuper(gx,gy){for(const m of squad()){if(!supOn(m.id)||supV(m.id)<1)continue;const[sx,sy,k]=P(m.x,m.z);if(Math.abs(gx-sx)<36*k+10&&gy<sy+10&&gy>sy-CHAR_H*k-16){fireSuper(m);return true;}}return false;}
const SUP_NAME={cmd:'RALLY CRY',bruno:'BULLDOZER',rook:'THOUSAND CUTS',hex:'BANISH'};
function fireSuper(m){const id=m.id;save.sup[id]=0;persist();R.shake=.5;SND.explosion(.6);R.banner={txt:(id==='cmd'?'COMMANDER':HEROES[id].name.toUpperCase())+': '+(SUP_NAME[id]||'SUPER'),t:2,col:'#b6f23a'};
  const S_=st(id),live=R.en.filter(e=>!e.dead&&e.z<ZFAR),big=e=>e.type==='boss'||e.type==='momma';
  if(id==='cmd'){R.rcT=8;healAll(.25);for(const q of squad())burst(q.x,q.z,40,'#5ee08a',18);}
  else if(id==='bruno'){for(const e of live){if(Math.abs(e.x-m.x)>110)continue;damage(e,S_.dmg*2,id,{cc:S_.crit/100,cm:'zone'});if(!e.dead&&!big(e)){e.stun=Math.max(e.stun||0,2);if(!e.nokb)e.z+=160;}burst(e.x,e.z,e.r,'#c9a46a',10);}
    for(let z=0;z<ZFAR;z+=90)burst(m.x+(Math.random()-.5)*60,z,10,'#8d7c58',5);}
  else if(id==='rook'){R.slashes=R.slashes||[];for(const e of live){damage(e,S_.sword*3,id,{cc:S_.crit/100,cm:S_.cm});R.slashes.push({x:e.x,z:e.z,t:0,dir:Math.random()<.5?1:-1});}SND.slash&&SND.slash(0);}
  else if(id==='hex'){for(const e of live){burst(e.x,e.z,e.r,'#b6f23a',10);if(big(e)){damage(e,S_.dmg*6,id,{cc:S_.crit/100,cm:S_.cm});continue;}e.x=(Math.random()*2-1)*(LANE_E-40);e.z=ZFAR+Math.random()*150;e.atk=undefined;e.tgt=null;e.ctgt=null;e.jeep=0;}}
}
function abilUpdate(dt){
  const r=save.heroes.rook,hx=save.heroes.hex;R.guardT=(R.guardT||0)-dt;R.markT=(R.markT||0)-dt;
  if(r&&r.lv>=20&&save.active.includes('rook')&&R.guardT<=0&&!stunned('rook')){const e=R.en.find(q=>!q.dead&&q.atk!==undefined&&q.tgt&&q.tgt!=='rook'&&q.type!=='boss'&&q.type!=='momma');
    if(e){R.guardT=2.5;const S_=st('rook');SQX.rook=[e.x+(e.x<0?40:-40),e.z-24];damage(e,S_.sword,'rook',{cc:S_.crit/100,cm:S_.cm});if(!e.dead&&!e.nokb)e.z+=36;
      R.slashes=R.slashes||[];R.slashes.push({x:e.x,z:e.z+20,t:0,dir:1});const st_=anim('rook');st_.a='slash';st_.t=0;SND.slash&&SND.slash(e.x/600);}}
  if(hx&&hx.lv>=20&&save.active.includes('hex')&&R.markT<=0){const e=R.en.find(q=>!q.dead&&q.atk!==undefined&&q.tgt==='hex'&&q.type!=='boss'&&q.type!=='momma');
    if(e){R.markT=1.2;burst(e.x,e.z,e.r,'#b6f23a',14);e.x=(Math.random()*2-1)*180;e.z=ZFAR*.55;e.atk=undefined;e.tgt=null;e.curse=1;SND.whoosh();burst(e.x,e.z,e.r,'#b6f23a',14);}}
}
function hitJail(d){const j=R.jail;if(!j)return;j.hp-=d;j.flash=.08;if(j.hp<=0)freeJail();}
function freeJail(){
  const j=R.jail;R.jail=null;SND.freed();SND.explosion(.35);
  burst(j.x,j.z,60,'#ffc53d',30);burst(j.x,j.z,60,HEROES[j.id].color,24);
  const act=addHero(j.id);
  R.banner={txt:(act?'FREED: ':'TO RESERVES: ')+HEROES[j.id].name.toUpperCase(),t:2.4,col:HEROES[j.id].color};
  persist();
}
const SPD=1.9;
function mkEnemy(type,x,z){
  const w=R.wave,hs=hpScale(w),ss=spdScale(w);
  const T={
    grunt:{hp:185/ENEMY_K,spd:42,r:32,gold:1,xp:4,col:'#7fcf4a',dmg:10,hd:7},
    runner:{hp:65/ENEMY_K,spd:42*2.8,r:26,gold:3,xp:3,col:'#b46bff',dmg:5,hd:3,zig:1},
    brute:{hp:1500/ENEMY_K,spd:26,r:50,gold:15,xp:11,col:'#e2483d',dmg:45,hd:30,nokb:1,thr:1},
    armored:{hp:500/ENEMY_K,spd:42*.7,r:38,gold:5,xp:8,col:'#8a94a6',dmg:20,hd:15,armor:5,nokb:1},
    splitter:{hp:45,spd:36,r:39,gold:10,xp:7,col:'#3fd6c6',dmg:12,split:1},
    screecher:{hp:80/ENEMY_K,spd:72,r:22,gold:4,xp:4,col:'#9aa08a',dmg:7,hd:5,scr:1},
  }[type];
  const e=Object.assign({type},T);
  e.hp*=hs*ENEMY_K;if(e.armor)e.armor*=ENEMY_K;e.spd*=ss*SPD;e.x=x;e.z=z;e.slow=0;e.burn=0;e.bdps=0;e.stun=0;e.wob=Math.random()*6;
  if(false){e.elite=1;e.hp*=3;e.r*=1.2;e.gold*=4;e.xp*=3;e.dmg*=2;}
  if(e.hd==null)e.hd=e.dmg*HURT_K;if(e.zig){e.zz=Math.random()<.5?-1:1;e.zzT=Math.random()*1.4;}
  e.max=e.hp;R.en.push(e);return e;
}
function spawnEnemy(){
  let type=R.queue&&R.queue.length?R.queue.shift():(R.stage===2?'runner':'grunt');
  mkEnemy(type,(Math.random()*2-1)*(LANE_E-20),ZFAR+Math.random()*120);
}

/* ---------- THE WARD: stage 1 boss, parks mid-road and hurls hospital junk ---------- */
const BOSS_Z=380,BOSS_VIS=1.35;
const PROJ={gurney:{set:'pgurney',dmg:15,rad:72,fx:'pimpact',hp:45,truck:15},wheel:{set:'pwheel',dmg:10,rad:58,fx:'pimpact',hp:25,truck:10},tank:{set:'ptank',dmg:25,rad:120,fx:'pblast',hp:35,truck:25},car:{set:'pcar',dmg:40,rad:110,fx:'pblast',hp:90,truck:40},gruntp:{set:null,dmg:10*.65,rad:60,fx:'pimpact',hp:30,truck:10},carry:{set:null,dmg:0,rad:60,fx:'pimpact',hp:30,truck:0}};
/* Brute: picks up a nearby enemy at 20% health or less and throws it at a hero */
function bruteAI(e,dt){e.thT=(e.thT==null?1.5:e.thT)-dt;if(e.thT>0||e.stun>0)return;e.thT=.5;const sq=squad();if(!sq.length)return;
  const q=R.en.find(o=>o!==e&&!o.dead&&!o.held&&o.type!=='brute'&&o.type!=='boss'&&o.type!=='momma'&&!o.onRoof&&o.hp<=o.max*.2&&Math.hypot(o.x-e.x,o.z-e.z)<e.r+o.r+70);if(!q)return;
  const m=sq[Math.floor(Math.random()*sq.length)],d=Math.hypot(m.x-e.x,m.z-e.z);q.held=1;q.atk=undefined;e.thT=3.5;
  R.proj=R.proj||[];R.proj.push({kind:'carry',en:q,hp:q.hp,x0:e.x,z0:e.z,h0:e.r*EH*.9,x1:m.x+(Math.random()-.5)*30,z1:m.z+10,t:0,T:.8+d/1400,peak:160+d*.12,x:e.x,z:e.z,h:0,spin:0});SND.whoosh();SND.groan((e.x/600)||0,.6);}
function bossAI(e,dt){
  R.proj=R.proj||[];
  if(e.thrT==null){e.thrT=2.2;e.roarT=6;e.act=null;R.banner={txt:'THE WARD APPROACHES',t:2.6,col:'#b6f23a'};SND.groan(0,.6);}
  let sp=e.spd;if(e.slow>0){e.slow-=dt;sp*=e.slowAmt;}
  if(R.stage===2&&!R.raged&&e.hp<=e.max*.5&&!e.act){startRook(e);return;}
  const bz=R.stage===2?(e.enraged?330:560):BOSS_Z;if(e.enraged)sp*=2.2;
  if(e.z>bz&&!e.act){e.z-=sp*dt;e.x+=(0-e.x)*.2*dt+Math.sin(t*.9)*10*dt;}
  if(e.act){e.at+=dt;
    if(e.act==='throw'&&!e.rel&&e.at>=.62){e.rel=1;bossThrow(e);}
    if(e.act==='roar'&&!e.rel&&e.at>=.4){e.rel=1;SND.groan(e.x/600,.6);SND.groan(-.3,.4);R.shake=.35;for(let k=0;k<3;k++){const m=mkEnemy(R.stage===2||k===1?'runner':'grunt',e.x+(k-1)*90,e.z-50);m.z=e.z-30;}}
    if(e.at>=(e.act==='throw'?.95:.85)){e.act=null;}
    return;}
  if(e.z>ZFAR)return;
  e.thrT-=dt;e.roarT-=dt;
  if(e.roarT<=0){e.roarT=11;e.act='roar';e.at=0;e.rel=0;}
  else if(e.thrT<=0){const r=Math.random();e.nextKind=e.enraged?(r<.4?'car':r<.75?'gruntp':'tank'):(r<.45?'gurney':r<.8?'wheel':'tank');e.thrT=e.enraged?1.25:e.hp/e.max<.5?1.8:2.6;e.act='throw';e.at=0;e.rel=0;}
}
function bossThrow(e){
  const sq=squad();if(!sq.length)return;const m=sq[Math.floor(Math.random()*sq.length)],r=Math.random();
  const kind=e.nextKind||'gurney';
  R.proj.push({kind,hp:PROJ[kind].hp*ENEMY_K,x0:e.x,z0:e.z,h0:e.r*EH*BOSS_VIS*.9,x1:m.x+(Math.random()-.5)*30,z1:m.z+10,t:0,T:1.4,peak:300,x:e.x,z:e.z,h:0,spin:Math.random()*4|0});
  SND.whoosh();
}
function projUpdate(dt){
  if(!R.proj)return;R.bfx=R.bfx||[];
  for(const p of R.proj){p.t+=dt;const q=Math.min(1,p.t/p.T);p.x=p.x0+(p.x1-p.x0)*q;p.z=p.z0+(p.z1-p.z0)*q;p.h=p.h0*(1-q)+Math.sin(Math.PI*q)*p.peak;
    if(q>=1&&!p.done){p.done=1;const P_=PROJ[p.kind];R.bfx.push({set:P_.fx,x:p.x,z:p.z,t:0});R.shake=p.kind==='tank'?.5:.3;
      SND.explosion(p.kind==='tank'?.9:.45);burst(p.x,p.z,20,p.kind==='tank'?'#b6f23a':'#c9a46a',p.kind==='tank'?24:14);
      const pd=p.en?p.en.hd:P_.dmg;for(const m of squad()){if(Math.hypot(m.x-p.x,(m.z-p.z)*1.6)<P_.rad)hurtMember(m.id,pd/HURT_K);}
      if(R.stage===2)hitWall(p.en?p.en.dmg:P_.truck,p.x);
      if(p.en){const q=p.en;q.held=0;q.x=p.x;q.z=Math.max(60,p.z+30);q.atk=undefined;q.tgt=null;q.stun=Math.max(q.stun||0,.6);R.en.push(q);}
      if(p.kind==='gruntp'){const g=mkEnemy('grunt',p.x+(Math.random()-.5)*40,p.z+40);g.onRoof=1;g.hp*=.7;g.max=g.hp;}}}
  R.proj=R.proj.filter(p=>!p.done);
  for(const f of R.bfx)f.t+=dt;R.bfx=R.bfx.filter(f=>f.t<.6);
}
function drawProj(p){
  if(!envReady)return;const[sx,sy,k]=P(p.x,p.z,p.h);if(p.flash>0){p.flash-=1/60;ctx.save();ctx.globalAlpha=.6;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy-20*k,30*k,0,6.283);ctx.fill();ctx.restore();}
  if(p.kind==='carry'){const q=p.en;if(atlasReady&&META[q.type]){ctx.save();ctx.translate(sx,sy);ctx.rotate(p.t*9);drawFrame(META[q.type].hit[1],0,40*k,k*q.r*EH/EBODY);ctx.restore();}return;}
  if(p.kind==='gruntp'){if(atlasReady){ctx.save();ctx.translate(sx,sy);ctx.rotate(p.t*9);drawFrame(META.grunt.hit[1],0,40*k,k*32*EH/EBODY);ctx.restore();}return;}
  const fr=EM[PROJ[p.kind].set];
  eDrawA(fr[(Math.floor(p.t*11)+p.spin)%fr.length],sx,sy,k*1.15*(1+Math.sin(Math.PI*Math.min(1,p.t/p.T))*.25));
}
function drawWarn(p){
  const[sx,sy,k]=P(p.x1,p.z1),q=Math.min(1,p.t/p.T),R_=PROJ[p.kind].rad,pl=.5+.5*Math.sin(t*18);
  ctx.strokeStyle='rgba(255,77,94,'+(.45+.45*pl)+')';ctx.lineWidth=2;ctx.fillStyle='rgba(255,77,94,'+(.08+q*.22)+')';
  ctx.beginPath();ctx.ellipse(sx,sy,R_*k*(.4+.6*q),R_*k*.32*(.4+.6*q),0,0,6.283);ctx.fill();ctx.stroke();
}
function drawBfx(f){if(!envReady)return;const[sx,sy,k]=P(f.x,f.z),fr=EM[f.set];eDrawA(fr[Math.min(fr.length-1,Math.floor(f.t*11))],sx,sy,k*(f.set==='pblast'?1.6:1.2));}
function drawBossBar(){
  const b=R.en.find(e=>(e.type==='boss'||e.type==='momma')&&e.z<ZFAR)||R.en.find(e=>e.type==='hexz'&&e.z<ZFAR);if(!b)return;
  const w=WW*.46,x=WW/2-w/2,y=66;ctx.fillStyle='#0b080ecc';ctx.fillRect(x-4,y-14,w+8,26);
  ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.type==='momma'?(b.reborn?'MOMMA, REBORN':'MOMMA'):b.type==='hexz'?'HEX':'THE WARD',WW/2,y-3);
  ctx.fillStyle='#2a1a22';ctx.fillRect(x,y+2,w,7);ctx.fillStyle='#ff2e63';ctx.fillRect(x,y+2,w*Math.max(0,b.hp/b.max),7);
}
function spawnBoss(){
  const hs=hpScale(R.wave);
  R.en.push({type:'boss',hp:2900*ENEMY_K,max:2900*ENEMY_K,spd:15*SPD,r:100,gold:50,xp:150,col:'#ff2e63',x:0,z:ZFAR+80,slow:0,burn:0,bdps:0,stun:0,wob:0,dmg:100,armor:1});
}
function spawnCrate(){
  const rw=nextReward(),hp=80+R.wave*48,lim=sxLimit();
  R.cr.push({x:(Math.random()*2-1)*lim,z:ZFAR,hp,max:hp,rw});
}

/* ---------- SQUAD ---------- */

/* ---------- SQUAD HEALTH, ACTIVE ROSTER, PERMADEATH ---------- */
const BASE_HP={cmd:150,bruno:120,rook:85,blaze:85,volt:75,frost:75,hex:70,nova:65};
const MAX_ACTIVE=3,WALL_MAX=400;
function maxHp(id){return Math.round(st(id).hp*Math.pow(1.02,lvOf(id)-1));}
function getHp(id){const m=maxHp(id);if(id==='cmd'){if(save.cmdHp==null||save.cmdHp>m)save.cmdHp=m;return save.cmdHp;}const s=save.heroes[id];if(s.hp==null||s.hp>m)s.hp=m;return s.hp;}
function setHp(id,v){if(id==='cmd')save.cmdHp=v;else save.heroes[id].hp=v;}
function healRecovery(){for(const id of['cmd',...save.active])if(id==='cmd'||save.heroes[id]){const m=maxHp(id),h=getHp(id);setHp(id,Math.min(m,h+m*st(id).rec/100));}}
function healAll(f){for(const id of['cmd',...save.active])setHp(id,Math.min(maxHp(id),getHp(id)+maxHp(id)*f));}
/* a hero who joins mid-stage is set aside at the stage start (keeping their level) and comes back when the story brings them in */
function stashHero(id){if(!save.heroes[id])return;save.away=save.away||{};save.away[id]=save.heroes[id];delete save.heroes[id];save.active=save.active.filter(h=>h!==id);persist();}
function addHero(id){story('hero_joined',{hero:id});
  if(save.away&&save.away[id]){save.heroes[id]=save.away[id];delete save.away[id];save.heroes[id].hp=null;}
  else save.heroes[id]={lv:JOIN_LV[id]||1,xp:0,hp:null};
  const act=save.active.length<MAX_ACTIVE;if(act)save.active.push(id);
  return act;
}
const HORDE=()=>save.mode==='horde';
const reviveCost=id=>20+30*((save.downed&&save.downed[id]&&save.downed[id].lv)||1);
function hurtMember(id,d){
  if(!R||R.over)return;d*=HURT_K;if(save.cmd>=15&&getHp('cmd')>maxHp('cmd')/2)d*=.85;if(HORDE())d*=1.15;
  const hp=getHp(id)-d;setHp(id,hp);SND.hurt(0);R.mflash=R.mflash||{};R.mflash[id]=.12;
  const m=squad().find(q=>q.id===id);if(m)burst(m.x,m.z,40,'#ff4d5e',6);
  if(hp>0)return;
  if(id==='cmd'){if(save.cmd>=20&&!R.sw){R.sw=1;setHp('cmd',1+maxHp('cmd')*.3);R.banner={txt:'SECOND WIND',t:2.2,col:'#5ee08a'};const m0=squad()[0];burst(m0.x,m0.z,40,'#5ee08a',24);SND.levelUp();return;}R.over=true;gameOver();return;}
  if(m){burst(m.x,m.z,40,HEROES[id].color,30);R.dead.push({hero:id,x:m.x,z:m.z,t:0,fr:heroFrame(id)});}
  if(!HORDE()){save.downed=save.downed||{};save.downed[id]={lv:save.heroes[id].lv,xp:save.heroes[id].xp};}
  story(HORDE()?'hero_died':'hero_down',{hero:id,level:save.heroes[id].lv});
  delete save.heroes[id];save.active=save.active.filter(h=>h!==id);if(!save.fallen.includes(id))save.fallen.push(id);
  for(const e of R.en)if(e.tgt===id){e.tgt=null;e.atk=undefined;}
  if(id==='hex'&&R.forest){R.over=true;R.hexDied=1;SND.gameOver();story('hex_fell_forest',{});legacyEnd('hex_fell');persist();state='over';ui();return;}
  SND.heroDown();R.banner={txt:HEROES[id].name.toUpperCase()+(HORDE()?' HAS FALLEN':' IS DOWN'),t:3,col:'#ff4d5e'};R.shake=.4;persist();
}
function hitWall(d,x){if(R.wall<=0)return;if(HORDE())d*=1.15;R.wall=Math.max(0,R.wall-d);SND.wallHit((x||0)/600);if(R.wall<=0)SND.wallBreak();R.shake=Math.max(R.shake||0,.18);if(R.wall<=0){R.banner={txt:R.stage===2?'THEY ARE ON THE TRUCK!':'THE WALL IS DOWN!',t:2.6,col:'#ff4d5e'};R.shake=.6;
  const kW=WALL_Z;for(let i=0;i<5;i++)burst((Math.random()*2-1)*ROAD,kW,20,'#8d7c58',14);}}
const OFFS=[-90,90,-180,180,-270,270,-360,360];
function squadTargets(){
  const lim=LANE_E+30,used=new Set(),out={};
  save.active.filter(h=>save.heroes[h]).forEach((h,i)=>{
    const pref=SLOTS[i][0];let best=null;
    for(const o of[pref,-pref,...OFFS]){if(used.has(o))continue;const x=SX+o;if(x>=-lim&&x<=lim){best=o;break;}}
    if(best==null)best=pref;used.add(best);out[h]=[SX+best,10+Math.abs(best)/90*16-16+10];});
  return out;
}
let SQX={};

/* ---------- LEGACY RECORD: a clean story log kept apart from gameplay numbers, for a future sequel ---------- */
const LEGACY_SCHEMA=1;
function legacy(){if(!save.legacy||save.legacy.schema!==LEGACY_SCHEMA)save.legacy={schema:LEGACY_SCHEMA,game:'holdout-squad-1',current:null,completed:[]};return save.legacy;}
function where(){return R?{stage:R.stage||1,wave:R.stage===2?null:R.wave}:{};}
function story(type,data){const L=legacy();if(!L.current)return;L.current.events.push(Object.assign({type,at:Date.now()},where(),data||{}));}
function legacySnapshot(result){
  const heroes={};for(const id of['cmd',...HERO_ORDER]){
    if(id==='cmd'){heroes.cmd={status:result==='commander_fell'?'fell':'alive',level:save.cmd};continue;}
    if(save.heroes[id])heroes[id]={status:'alive',level:save.heroes[id].lv,active:save.active.includes(id)};
    else if(save.fallen.includes(id))heroes[id]={status:HORDE()?'dead':'down'};}
  const kills={};for(const id in(save.runStats||{}))kills[id]=Object.values(save.runStats[id]).reduce((a,b)=>a+b,0);
  return{heroes,kills,gold:save.gold,stagesCleared:save.legacy.current.stagesCleared.slice()};
}
function legacyStart(mode){const L=legacy();if(L.current)legacyEnd('abandoned');
  L.current={id:Date.now().toString(36),mode,started:Date.now(),events:[],stagesCleared:[]};story('run_start',{mode});}
function legacyEnd(result){const L=legacy();if(!L.current)return;story('run_end',{result});
  L.current.result=result;L.current.ended=Date.now();L.current.final=legacySnapshot(result);
  L.completed.push(L.current);if(L.completed.length>20)L.completed.shift();L.current=null;}
function legacyStage(n){const L=legacy();if(!L.current)return;if(!L.current.stagesCleared.includes(n))L.current.stagesCleared.push(n);story('stage_clear',{stage:n,survivors:['cmd',...save.active]});}
function squad(){
  const out=[{id:'cmd',x:SX,z:0}],tg=squadTargets();
  for(const h in tg){const p=SQX[h]||(SQX[h]=[tg[h][0],tg[h][1]]);out.push({id:h,x:p[0],z:p[1]});}
  return out;
}
function squadStep(dt){const tg=squadTargets(),k=Math.min(1,dt*9);for(const h in tg){const p=SQX[h]||(SQX[h]=tg[h].slice());p[0]+=(tg[h][0]-p[0])*k;p[1]+=(tg[h][1]-p[1])*k;}}
const MZ_H=62;
function nearest(x,z,range,skip){
  let best=null,bd=range*range;
  for(const e of R.en){if(e.dead||e.z>ZFAR||e.z<z||(skip&&skip.has(e)))continue;const d=(e.x-x)**2+(e.z-z)**2;if(d<bd){bd=d;best=e;}}
  return best;
}
function shoot0(o){return shoot(o);}
function shoot(o){if(o.own&&HSTAT[o.own]&&o.cc==null){const S_=st(o.own);o.cc=S_.crit/100;o.cm=S_.cm;}R.bu.push(Object.assign({r:7,pierce:1,hit:new Set(),life:2,h:MZ_H},o));}
function aimAt(sx,sz,e,spd,spread=0){const a=Math.atan2(e.z-sz,e.x-sx)+(Math.random()-.5)*spread;return[Math.cos(a)*spd,Math.sin(a)*spd];}
function anim(id){if(!R.an[id])R.an[id]={a:'run',t:Math.random()*2,last:-9};return R.an[id];}
const SHOT_KIND={rook:'pistol',bruno:'shotgun',blaze:'flame',volt:'zap',frost:'ice',hex:'orb',nova:'sniper'};
function triggerShoot(id){{const m=squad().find(q=>q.id===id);SND.shot(id==='cmd'?({pistol:'rifle',smg:'smg',shotgun:'shotgun',rail:'rail',rocket:'rocket',minigun:'minigun'})[save.equip]:SHOT_KIND[id],m?m.x/600:0);}const st=anim(id);if(st.a==='shoot'&&(id==='blaze'||st.t<.12)){st.last=t;return;}st.a='shoot';st.t=0;st.last=t;}

function fireCmd(s){
  const W=WEAPONS[save.equip],d=st('cmd').dmg*W.dmg/RIFLE_BASE;R.cmdShots=(R.cmdShots||0)+1;const sure=save.cmd>=10&&R.cmdShots%10===0;const shoot=o=>shoot0(sure?Object.assign(o,{cc:1}):o);
  const gx=s.x+16,gz=s.z+10;
  triggerShoot('cmd');
  if(save.equip==='shotgun'){for(let i=0;i<W.pel;i++){const a=Math.PI/2+(i/(W.pel-1)-.5)*.5;shoot({x:gx,z:gz,vx:Math.cos(a)*1050,vz:Math.sin(a)*1050,dmg:d,own:'cmd',col:'#fff',life:.7});}}
  else if(save.equip==='rail')shoot({x:gx,z:gz,vx:0,vz:2600,dmg:d,own:'cmd',col:'#9ff',pierce:99,r:9,trail:1});
  else if(save.equip==='rocket')shoot({x:gx,z:gz,vx:0,vz:760,dmg:d,own:'cmd',col:'#ffb347',r:9,splash:W.splash,rocket:1});
  else{const sp=save.equip==='pistol'?0:.1;shoot({x:gx,z:gz,vx:(Math.random()-.5)*sp*1300,vz:1300,dmg:d,own:'cmd',col:'#fff8d0',trail:1});}
  return W.rate;
}
function fireHero(s){
  const id=s.id,H=HEROES[id],L=save.heroes[id].lv,S_=st(id),d=S_.dmg;
  let rate=H.rate;
  const reach=H.range+(id==='blaze'&&L>=15?140:0);
  const sx=s.x+18,sz=s.z+8;
  let e=nearest(sx,sz,reach);
  if(R.stage===2&&R.proj&&id!=='volt'){let bd=reach*reach;for(const q of R.proj){if(q.done||q.t/q.T>.85||q.t<.15)continue;const d=(q.x-sx)**2+(q.z-sz)**2;if(d<bd){bd=d;e=q;}}}
  if(!e)return .1;
  triggerShoot(id);
  switch(id){
   case'rook':{
     const near=R.en.filter(q=>!q.dead&&q.type!=='boss'&&Math.abs(q.z-s.z)<175+q.r*.5&&Math.abs(q.x-s.x)<150+q.r*.5);
     if(near.length&&(R.katCd||0)<=0){R.katCd=L>=10?.6:.85;const kd=S_.sword;
       for(const q of near){damage(q,kd,id,{cc:S_.crit/100,cm:S_.cm});if(!q.dead&&q.type!=='brute')q.z+=36;q.stun=Math.max(q.stun||0,.15);}
       {const st=anim('rook');st.a='slash';st.t=0;}R.slashes=R.slashes||[];R.slashes.push({x:s.x,z:s.z+120,t:0,dir:(R.slashN=(R.slashN||0)+1)%2?1:-1});SND.slash(s.x/600);R.shake=Math.max(R.shake||0,.1);return .3;}
     R.gunSide=-(R.gunSide||1);const gx=sx+R.gunSide*14;
     const[vx,vz]=aimAt(gx,sz,e,1400,.03);shoot({x:gx,z:sz,vx,vz,dmg:d,own:id,col:'#ffd27a',pierce:L>=10?3:1,crit:L>=15,trail:1});
     if(L>=5){const[vx2,vz2]=aimAt(sx-R.gunSide*14,sz,e,1400,.05);shoot({x:sx-R.gunSide*14,z:sz,vx:vx2,vz:vz2,dmg:d,own:id,col:'#ffd27a',pierce:L>=10?3:1,crit:L>=15,trail:1});}
     rate*=.62;break;}
   case'blaze':{for(let i=0;i<2;i++){const[vx,vz]=aimAt(sx,sz,e,560,L>=5?.7:.35);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:H.color,pierce:99,life:reach/560,flame:1,r:12,burn:d*2.2,burnT:L>=10?3.2:1.6});}break;}
   case'volt':{let chain=2+(L>=5?1:0)+(L>=10?2:0),cur=e,hit=new Set(),pts=[[sx,sz,MZ_H]];
     while(cur&&chain-->=0){hit.add(cur);pts.push([cur.x,cur.z,cur.r]);damage(cur,d,id);if(L>=15)cur.stun=Math.max(cur.stun,.45);cur=nearestTo(cur,210,hit);}
     R.bolts.push({pts,life:.2,col:'#bfe0ff'});break;}
   case'frost':{const[vx,vz]=aimAt(sx,sz,e,1000);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:H.color,r:9,slowAmt:L>=10?.3:.5,splash:L>=5?64:0,splashMul:.45,freeze:L>=15,glow:1});break;}
   case'hex':{const n=L>=5?2:1;for(let i=0;i<n;i++){const[vx,vz]=aimAt(sx,sz,e,440,1.0);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:H.color,r:L>=10?13:10,homing:L>=10?7:4,spd:L>=10?620:480,life:3.2,split:L>=15,glow:1,orb:1});}break;}
   case'bruno':{if(L>=20){R.bShots=(R.bShots||0)+1;if(R.bShots%4===0){const[vx,vz]=aimAt(sx,sz,e,1500,.01);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:'#ffe08a',pierce:99,r:10,trail:1,life:1.4});SND.explosion(.15);break;}}const n=5+(L>=5?2:0);const close=L>=15&&Math.hypot(e.x-sx,e.z-sz)<220;
     for(let i=0;i<n;i++){const[vx,vz]=aimAt(sx,sz,e,1100,n>5?.62:.4);shoot({x:sx,z:sz,vx,vz,dmg:(close?2:1)*d/n,own:id,col:'#ffb347',life:1.5,kb:L>=10?70:30,fall:1,ox:sx,oz:sz});}break;}
   case'nova':{if(L>=5)rate*=.75;const[vx,vz]=aimAt(sx,sz,e,2600);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:'#ff8a8a',r:8,pierce:L>=10?99:3,trail:1,slayer:L>=15});break;}
  }
  return rate;
}
function nearestTo(e0,range,skip){let best=null,bd=range*range;for(const e of R.en){if(e.dead||skip.has(e))continue;const d=(e.x-e0.x)**2+(e.z-e0.z)**2;if(d<bd){bd=d;best=e;}}return best;}

/* ---------- COMBAT ---------- */
function damage(e,d,own,b){
  if(e.dead)return;
  if(e.type==='boss'&&R.stage===2&&!R.raged&&e.hp-d<e.max*.5){e.hp=e.max*.5;e.flash=.06;return;}
  if(b&&b.cc&&Math.random()<b.cc){const m=b.cm==='zone'?ZONE_CM[Math.max(0,Math.min(4,Math.floor(e.z/(ZFAR/5))))]:b.cm;if(m>1){d*=m;if(R&&Math.random()<.5){const[px,py]=P(e.x,e.z,e.r*2.6);R.tx.push({x:px,y:py,txt:'CRIT',col:'#ffe066',t:.6});}}}
  if(b&&b.slayer&&(e.type==='brute'||e.type==='boss'||e.type==='momma'))d*=3;
  if(e.armor)d=Math.max(d*.15,d-e.armor);
  if(e.curse)d*=1.25;
  if(own==='rook'&&save.heroes.rook&&save.heroes.rook.lv>=15&&e.type!=='boss'&&e.type!=='momma'&&Math.random()<.02){d=Math.max(d,e.hp+1);if(R){const[px,py]=P(e.x,e.z,e.r*2.6);R.tx.push({x:px,y:py,txt:'DOUBLE TAP',col:'#ff8a3d',t:.8});}}
  e.hp-=d;e.flash=.06;if(!(e.hitT>0))e.hitT=.24;SND.hit(e.x/600);if(e.scr)screech(e);
  if(e.hp<=0){e.dead=1;kill(e,own);}
}

/* ---------- KILL STATS: per character, this run and all time ---------- */
const ENEMY_NAMES={grunt:'Grunt',runner:'Runner',armored:'Armored',brute:'Brute',splitter:'Splitter',screecher:'Screecher',boss:'The Ward',momma:'Momma',hexz:'Hex (turned)'};
function addKill(own,type){
  if(own!=='cmd'&&!HEROES[own])return;
  save.stats=save.stats||{};save.runStats=save.runStats||{};
  for(const S of[save.stats,save.runStats]){const s=S[own]||(S[own]={});s[type]=(s[type]||0)+1;}
}
function statHTML(id){
  const isC=id==='cmd',H=isC?{name:'The Commander',role:WEAPONS[save.equip].name}:HEROES[id];
  const all=(save.stats||{})[id]||{},run=(save.runStats||{})[id]||{};
  const tot=o=>Object.values(o).reduce((a,b)=>a+b,0);
  const lv=isC?save.cmd:(save.heroes[id]?save.heroes[id].lv:null),fallen=!isC&&save.fallen.includes(id);
  const types=Object.keys(ENEMY_NAMES).filter(k=>all[k]||run[k]);
  let rows=types.map(k=>`<div class="card srow"><div class="badge"><canvas width="96" height="96" data-enemy="${k}"></canvas></div>
    <div class="cname">${ENEMY_NAMES[k]}</div><div class="snum"><span>${run[k]||0}</span><span>${all[k]||0}</span></div></div>`).join('');
  if(!rows)rows='<p class="sub">No kills yet. Get them on the wall.</p>';
  return `<div class="shead"><div class="badge sbig"><canvas width="192" height="192" data-por="${id}" ${fallen?'data-st="fallen"':''}></canvas></div>
    <div class="sinfo"><h2>${H.name}</h2><div class="sub">${H.role}${lv?` · Level ${lv}`:''}${fallen?' · Fallen':''}</div></div></div>
    <div class="stripe"></div>${lv?buildHTML(id):''}
    <div class="row stot"><span class="sub">Total kills</span><span class="snum"><span><small>THIS RUN</small>${tot(run)}</span><span><small>ALL TIME</small>${tot(all)}</span></span></div>
    <h3>Kills by enemy</h3>${rows}
    <div class="btns"><button class="btn ghost" data-act="statback">Back</button></div>`;
}
function buildHTML(id){const S_=st(id),p=pts(id),free=ptsFree(id),lv=lvOf(id),b=HSTAT[id];
  const cmTxt=S_.cm==='zone'?'Crits hit harder up close: x10, x5, x3, x1, none at range':'Crits hit for x'+S_.cm;
  const val=(k,v,u)=>k==='hp'?maxHp(id)+' HP':v+u;
  let h=`<div class="row"><h3 style="margin:0">Points</h3><span class="big">${free} to spend</span></div><div class="sbuild">`;
  for(const[k,nm,per,u]of STAT_DEF){const n=p[k],cap=n>=STAT_CAP;
    h+=`<div class="srowb"><div class="sname">${nm}<small>${val(k,S_[k],u)}${k==='dmg'&&id==='rook'?' · blade '+S_.sword:''}${k==='dmg'&&id==='bruno'?' per shot':''}</small></div>
    <div class="pips">${Array.from({length:STAT_CAP},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>
    <button class="plus" data-act="pt" data-id="${id}" data-k="${k}" ${!free||cap?'disabled':''} aria-label="Add a point to ${nm}">+${per}${u}</button></div>`;}
  h+=`<div class="srowb"><div class="sname">Super ability<small>${p.sup?'Unlocked':lv>=25?'Ready to unlock':'Unlocks at level 25'}</small></div><div class="pips"><i class="${p.sup?'on':''}"></i></div>
    <button class="plus" data-act="pt" data-id="${id}" data-k="sup" ${p.sup||lv<25||!free?'disabled':''}>${p.sup?'Done':'Unlock'}</button></div></div>
    <p class="sub">${cmTxt}. Health also grows 2% every level.</p>
    `;
  return h;}
function drawEnemyThumbs(){
  if(!atlasReady)return;
  ov.querySelectorAll('canvas[data-enemy]').forEach(c=>{const M=META[c.dataset.enemy];if(!M)return;const fr=(M.walk||M.idle)[0],r=RECTS[fr],g=c.getContext('2d');
    const s=Math.min(c.width/r[2],c.height/r[3])*.95;g.clearRect(0,0,c.width,c.height);g.drawImage(ATL,r[0],r[1],r[2],r[3],(c.width-r[2]*s)/2,c.height-r[3]*s,r[2]*s,r[3]*s);});
}
function kill(e,own){addKill(own,e.type);supCharge(own,1/SUP_KILLS[own]);
  if(e.type==='momma'&&R.forest){R.spawnLeft=0;R.queue=[];R.claws=[];R.dag=[];R.swaves=[];if(R.hstun)R.hstun={};SND.explosion(.8);R.shake=.6;
    for(const o of R.en)if(o!==e&&!o.dead&&o.type!=='hexz'){o.dead=1;burst(o.x,o.z,o.r,o.col,8);if(META[o.type])R.dead.push({type:o.type,x:o.x,z:o.z,r:o.r,t:0});}
    R.banner={txt:'MOMMA IS DEAD',t:2.6,col:'#b6f23a'};}
  const hm=HORDE()&&e.type!=='boss'&&e.type!=='momma'?.5:1;save.gold+=Math.round(e.gold*10);SND.die(e.type,e.x/600);
  if(R.jail)hitJail(R.jail.max*.035);
  if(e.split){for(let k=-1;k<=1;k+=2){const m=mkEnemy('runner',e.x+k*26,e.z);m.gold=1;if(e.elite){m.hp*=2;m.max=m.hp;}}}
  /* XP: the killer gets it all, everyone else in the squad gets a 20% share */
  for(const id of['cmd',...save.active]){const x=e.xp*hm*(id===own?1:XP_SHARE);if(id==='cmd')cmdXp(x);else giveXp(id,x);}
  R.kills=(R.kills||0)+1;if(own==='cmd'){R.cmdKills=(R.cmdKills||0)+1;if(save.cmd>=5&&R.cmdKills%10===0)rally();}
  if(e.type==='hexz')s5HexDown(e);
  if(e.type==='boss')story('boss_defeated',{boss:'the_ward',by:own});
  if(e.type==='boss'&&R.stage===2){R.escapeT=3.2;R.spawnLeft=0;}
  if(e.type==='boss'){R.banner={txt:R.stage===2?'THE CONVOY BREAKS FREE':'THE WARD IS DOWN',t:3,col:'#b6f23a'};SND.explosion(.7);R.shake=.6;R.proj=[];}
  if(META[e.type]){R.dead.push({type:e.type,x:e.x,z:e.z,r:e.r,t:0,elite:e.elite,reborn:e.reborn});burst(e.x,e.z,e.r,e.col,5);}
  else burst(e.x,e.z,e.r,e.col,e.type==='boss'?40:12);
}
const CMD_PERKS=['Rally: heal squad 10% every 10 of his kills','Steady aim: every 10th shot crits','Hold the line: squad takes 15% less damage while he is above half health','Second wind: once per stage, survives a fatal hit','Super · Rally cry'];
function cmdXp(x){if(save.cmd>=MAXLV)return;save.cmdXp=(save.cmdXp||0)+x;
  while(save.cmd<MAXLV&&save.cmdXp>=xpNeed(save.cmd)){save.cmdXp-=xpNeed(save.cmd);save.cmd++;SND.levelUp();
    if(R){const[px,py]=P(SX,0,CHAR_H+14);R.tx.push({x:px,y:py,txt:'COMMANDER LV '+save.cmd,col:'#ffc53d',t:1.6});if(save.cmd===5)R.banner={txt:'COMMANDER: RALLY UNLOCKED',t:2.4,col:'#ffc53d'};}}}
function rally(){healAll(.1);SND.chime&&0;const[px,py]=P(SX,0,CHAR_H+30);R.tx.push({x:px,y:py,txt:'RALLY +10%',col:'#5ee08a',t:1.4});for(const m of squad())burst(m.x,m.z,30,'#5ee08a',8);}
function giveXp(h,x){
  const s=save.heroes[h];if(!s||s.lv>=MAXLV)return;
  s.xp+=x;
  while(s.lv<MAXLV&&s.xp>=xpNeed(s.lv)){s.xp-=xpNeed(s.lv);levelUp(h);}
}
function levelUp(h){
  const s=save.heroes[h];s.lv++;SND.levelUp();
  const pi=PERK_LV.indexOf(s.lv);
  const sq=squad().find(q=>q.id===h);
  if(R&&sq){const[px,py]=P(sq.x,sq.z,CHAR_H+14);R.tx.push({x:px,y:py,txt:HEROES[h].name.toUpperCase()+' LV '+s.lv,col:HEROES[h].color,t:1.6});}
  if(pi>=0&&R)R.banner={txt:HEROES[h].name+': '+perksOf(h)[pi],t:2,col:HEROES[h].color};
  if(s.lv>=MAXLV)s.xp=0;
}
function burst(x,z,h,col,n){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=60+Math.random()*220;R.pa.push({x,z,h,vx:Math.cos(a)*s,vz:Math.sin(a)*s*.6,vh:80+Math.random()*200,t:.5+Math.random()*.4,col});}}
function unlock(rw,x,z){
  burst(x,z,30,'#ffc53d',34);
  if(rw.type==='hero'){save.heroes[rw.id]={lv:1,xp:0};R.banner={txt:'NEW HERO: '+HEROES[rw.id].name.toUpperCase(),t:2.4,col:HEROES[rw.id].color};}
  else if(rw.type==='weapon'){save.weapons.push(rw.id);save.equip=rw.id;R.banner={txt:'NEW WEAPON: '+WEAPONS[rw.id].name.toUpperCase(),t:2.4,col:'#ffffff'};}
  else{Object.keys(save.heroes).forEach(h=>giveXp(h,60+R.wave*12));save.gold+=400;R.banner={txt:'SUPPLY DROP: SQUAD XP',t:2,col:'#ffc53d'};}
  persist();
}

/* ---------- UPDATE ---------- */
function update(dt){
  t+=dt;
  const lim=sxLimit();SX=Math.max(-lim,Math.min(lim,SX));
  const v=(SX-R.prevSX)/Math.max(dt,1e-3);R.prevSX=SX;R.vx+=(v-R.vx)*Math.min(1,dt*10);
  camX=0;
  if(R.banner){R.banner.t-=dt;if(R.banner.t<=0)R.banner=null;}
  for(const k in R.an)R.an[k].t+=dt;
  if(R.cinePending&&R.en.length===0)startCine();
  if(R.cine)cineUpdate(dt);
  hud.style.opacity=R.cine?'0':'1';
  if(R.spawnLeft>0&&!R.cinePending&&!R.cine){R.spawnT-=dt;if(R.spawnT<=0){
    R.spawnT=R.forest?spawnPaceF():R.cfb?spawnPaceCF():R.stage===3?spawnPace3():Math.max(.3,1.85-R.wave*.12)*(.7+Math.random()*.6);
    const pack=R.forest?Math.min(R.spawnLeft,packF()):R.cfb?Math.min(R.spawnLeft,1+Math.floor(Math.random()*2.2)):R.stage===3?Math.min(R.spawnLeft,R.wave===3?1+Math.floor(Math.random()*2.6):1):Math.min(R.spawnLeft,1+Math.floor(Math.random()*(R.wave/3)));
    for(let k=0;k<pack;k++){const idx=R.spawnTotal-R.spawnLeft;
    if(R.crateAt.includes(idx))spawnCrate();
    if(idx===R.jeepAt){R.cinePending=true;R.jeepAt=-1;break;}
    if(R.bossPending&&idx>=Math.floor(R.spawnTotal*.6)){spawnBoss();R.bossPending=false;}
    spawnEnemy();if(R.stage===2&&HORDE())spawnEnemy();R.spawnLeft--;}}}
  supUpdate(dt);abilUpdate(dt);R.saveT=(R.saveT||0)-dt;if(R.saveT<=0){R.saveT=4;persist();}
  if(R.cfb)cfbTick(dt);
  squadStep(dt);if(R.stage===3){civUpdate(dt);for(const d of R.dead)d.z-=WALK*dt;}if(R.forest){vanishUpdate(dt);swaveUpdate(dt);bossFxUpdate(dt);if(R.say){R.say.t-=dt;if(R.say.t<=0)R.say=null;}}jeepUpdate(dt);SND.engineSet(!!(R.jeep&&R.jeep.phase==='drive'));SND.ambient(dt,R.en);SND.intensity=R.stage===3?((R.en.length>14||civsAlive().length<5)?1:0):(R.wall/R.wallMax<.4||R.en.length>14)?1:0;
  const sq=squad();
  if(!R.cine)for(const s of sq){anim(s.id);if(stunned(s.id))continue;R.cd[s.id]=(R.cd[s.id]||0)-dt;if(R.cd[s.id]<=0)R.cd[s.id]=(s.id==='cmd'?fireCmd(s):fireHero(s))/(R.rcT>0?1.5:1);}
  for(const e of R.en){
    if(e.dead)continue;
    if(e.flash>0)e.flash-=dt;if(e.hitT>0)e.hitT-=dt;
    if(e.burn>0){e.burn-=dt;e.hp-=e.bdps*dt;if(Math.random()<dt*14)R.pa.push({x:e.x+(Math.random()-.5)*e.r,z:e.z,h:e.r*(1+Math.random()*1.2),vx:0,vz:0,vh:90,t:.45,col:Math.random()<.5?'#ffb347':'#ff5a1f',ng:1});if(e.hp<=0){e.dead=1;kill(e,e.burnOwn||'blaze');continue;}}
    if(e.scrCd>0)e.scrCd-=dt;if(e.scrT>0)e.scrT-=dt;
    if(e.held)continue;
    if(e.thr)bruteAI(e,dt);
    if(e.type==='hexz'){hexzAI(e,dt);continue;}
    if(e.type==='momma'){mommaAI(e,dt);continue;}
    if(e.atk!==undefined){
      if(e.ctgt){const c=e.ctgt;if(c.hp<=0||Math.hypot(c.x-e.x,c.z+12-e.z)>e.r+60){e.atk=undefined;e.ctgt=null;}}
      else if(!e.tgt&&R.wall<=0)e.atk=undefined;
      else if(e.tgt){const m=squad().find(q=>q.id===e.tgt);if(!m||Math.hypot(m.x-e.x,m.z+16-e.z)>e.r+60){e.atk=undefined;e.tgt=null;}}
      if(e.atk!==undefined){e.atk+=dt;const c=Math.floor(e.atk/1.1),ph=e.atk-c*1.1;
        if(ph>=.34&&e.hitC!==c){e.hitC=c;if(e.ctgt)hurtCiv(e.ctgt,e.dmg);else if(e.tgt)hurtMember(e.tgt,e.hd/HURT_K);else{hitWall(e.dmg,e.x);burst(e.x,WALL_Z,e.r,'#c9a46a',6);}}
        continue;}
    }
    if(e.type==='boss'){if(e.flash>0)e.flash-=dt;bossAI(e,dt);continue;}
    if(e.summon){e.sumT=(e.sumT||4)-dt;if(e.sumT<=0){e.sumT=4.5;for(let k=0;k<e.summon;k++)mkEnemy(Math.random()<.5?'runner':'grunt',e.x+(k-1)*70,e.z-40);}}
    if(e.stun>0){e.stun-=dt;if(e.type==='boss')e.stun=Math.min(e.stun,.15);continue;}
    let sp=e.spd;if(e.slow>0){e.slow-=dt;sp*=e.slowAmt;}
    if(e.cine)sp*=.25;
    const J=R.jeep;
    if(J&&J.phase==='down'&&e.type!=='boss'&&!e.jeep&&e.z>J.z-20&&Math.abs(e.x-J.x)<320)e.jeep=1;
    if(e.jeep){
      if(!J||J.phase!=='down'){e.jeep=0;e.jt=undefined;}
      else{const tx=J.x+(e.x<J.x?-1:1)*(JEEP_W*.55+e.r*.4),tz=J.z+8,dx=tx-e.x,dz=tz-e.z,dd=Math.hypot(dx,dz);
        if(dd>10){e.x+=dx/dd*sp*dt;e.z+=dz/dd*sp*dt;e.jt=undefined;}
        else{e.jcd=(e.jcd||0)-dt;if(e.jcd<=0){e.jcd=1.1;e.jt=0;e.jhit=0;}
          if(e.jt!==undefined){e.jt+=dt;if(!e.jhit&&e.jt>=.34){e.jhit=1;J.hp-=e.dmg*.8;burst(J.x,J.z,30,'#ffd27a',4);}}}
        continue;}
    }
    let zx=0;if(e.zig){e.zzT-=dt;if(e.zzT<=0){e.zzT=1.4;e.zz=Math.random()<.5?-1:1;}if(Math.abs(e.x)>LANE_E-30)e.zz=-Math.sign(e.x);zx=e.zz*sp*.55*dt;}
    e.z-=sp*dt;e.x+=Math.sin(t*1.6+e.wob)*18*dt+zx;
    e.x=Math.max(-LANE_E,Math.min(LANE_E,e.x));
    if(R.wall>0&&!e.onRoof){
      if(e.z<=WALL_Z+WALL_STOP+e.r*.5){e.z=WALL_Z+WALL_STOP+e.r*.5;e.atk=0;e.tgt=null;e.hitC=-1;}
    }else if(e.z<WALL_Z+260){
      let best=null,bd=1e9,civ=false;for(const m of squad()){const d=Math.hypot(m.x-e.x,m.z-e.z);if(d<bd){bd=d;best=m;civ=false;}}
      if(R.civ)for(const c of R.civ){if(c.hp<=0||c.safe)continue;const d=Math.hypot(c.x-e.x,c.z-e.z)*.9;if(d<bd){bd=d;best=c;civ=true;}}
      if(best){const tx=best.x+(e.x<best.x?-1:1)*e.r*.4,tz=best.z+(civ?12:16),dx=tx-e.x,dz=tz-e.z,dd=Math.hypot(dx,dz);
        e.z+=sp*dt;e.x-=Math.sin(t*1.6+e.wob)*18*dt+zx;
        if(dd>e.r+22){e.x+=dx/dd*sp*1.1*dt;e.z+=dz/dd*sp*1.1*dt;}else{e.atk=0;e.hitC=-1;if(civ){e.ctgt=best;e.tgt=null;}else{e.tgt=best.id;e.ctgt=null;}}}
    }
  }
  for(const c of R.cr)c.z-=95*dt;
  for(const b of R.bu){
    if(b.homing){const e=nearest(b.x,b.z-200,1400);if(e){const a=Math.atan2(e.z-b.z,e.x-b.x),ca=Math.atan2(b.vz,b.vx);let da=a-ca;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;const na=ca+Math.max(-b.homing*dt,Math.min(b.homing*dt,da));b.vx=Math.cos(na)*b.spd;b.vz=Math.sin(na)*b.spd;}}
    b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;b.h+=(26-b.h)*Math.min(1,dt*2.2);
    if(b.rocket&&Math.random()<.7)R.pa.push({x:b.x,z:b.z-10,h:b.h,vx:(Math.random()-.5)*40,vz:-80,vh:10,t:.35,col:'#ff9a3d',ng:1});
    for(const e of R.en){
      if(e.dead||b.hit.has(e))continue;
      if((e.x-b.x)**2+(e.z-b.z)**2<(e.r+b.r)**2){
        b.hit.add(e);
        if(b.splash){for(const o of R.en){if(!o.dead&&(o.x-b.x)**2+(o.z-b.z)**2<b.splash**2&&o!==e)damage(o,b.dmg*(b.splashMul||1),b.own,b);}burst(b.x,b.z,b.h,b.col,b.rocket?16:8);}
        if(b.slowAmt){e.slow=2;e.slowAmt=b.slowAmt;if(b.freeze&&Math.random()<.15)e.stun=1;}
        if(b.burn){e.burn=b.burnT;e.bdps=Math.max(e.bdps,b.burn);e.burnOwn=b.own;}
        const fm=b.fall?Math.max(.15,1.6-Math.hypot(b.x-b.ox,b.z-b.oz)/650):1;
        if(b.kb&&e.type!=='boss'&&e.type!=='momma'&&!e.nokb)e.z+=b.kb*Math.min(1,fm)*(e.type==='brute'?.4:1);
        damage(e,b.dmg*fm,b.own,b);
        if(b.split){for(let k=-1;k<=1;k+=2)shoot({x:b.x,z:b.z,h:b.h,vx:k*380,vz:200,dmg:b.dmg*.5,own:b.own,col:b.col,r:8,homing:6,spd:520,life:1.6,glow:1,orb:1});}
        if(--b.pierce<=0){b.life=0;break;}
      }
    }
    if(b.life>0&&R.stage===2&&R.proj)for(const q of R.proj){
      if(q.done||b.hit.has(q)||q.t/q.T>.92)continue;
      if((q.x-b.x)**2+(q.z-b.z)**2<(46+b.r)**2){b.hit.add(q);q.hp-=b.dmg;q.flash=.08;SND.hit(q.x/600);
        if(q.hp<=0){q.done=1;q.shot=1;if(q.en){q.en.held=0;q.en.hp=0;q.en.dead=1;kill(q.en,b.own||'cmd');}R.bfx=R.bfx||[];R.bfx.push({set:'pimpact',x:q.x,z:q.z,t:0});burst(q.x,q.z,q.h,'#c9a46a',14);SND.explosion(.25);save.gold+=20;const[px,py]=P(q.x,q.z,q.h+20);R.tx.push({x:px,y:py,txt:'+20',col:'#ffc53d',t:1});}
        if(--b.pierce<=0){b.life=0;break;}}}
    if(b.life>0&&!b.flame)for(const c of R.cr){
      if(c.dead||b.hit.has(c))continue;
      if(Math.abs(c.x-b.x)<34+b.r&&Math.abs(c.z-b.z)<34+b.r){b.hit.add(c);c.hp-=b.dmg;c.flash=.08;if(c.hp<=0){c.dead=1;unlock(c.rw,c.x,c.z);}if(--b.pierce<=0){b.life=0;break;}}
    }
    const j=R.jail;
    if(b.life>0&&!b.flame&&j&&!b.hit.has(j)&&Math.abs(j.x-b.x)<JAIL_W/2+b.r&&Math.abs(j.z-b.z)<40+b.r){b.hit.add(j);hitJail(b.dmg);if(--b.pierce<=0)b.life=0;}
    if(b.z>ZFAR+200||b.z<-40||Math.abs(b.x)>LANE+400)b.life=0;
  }
  for(const c of R.cr){if(c.flash>0)c.flash-=dt;if(c.z<WALL_Z+30){c.dead=1;burst(c.x,c.z,20,'#9a6c2e',12);}}
  projUpdate(dt);
  for(const p of R.pa){p.x+=p.vx*dt;p.z+=p.vz*dt;p.h+=p.vh*dt;if(!p.ng)p.vh-=600*dt;if(p.h<0){p.h=0;p.vh*=-.3;}p.vx*=.95;p.vz*=.95;p.t-=dt;}
  for(const b of R.bolts)b.life-=dt;
  for(const x of R.tx){x.t-=dt;x.y-=30*dt;}
  if(R.shake>0)R.shake-=dt;
  if(R.katCd>0)R.katCd-=dt;if(R.slashes){for(const s of R.slashes)s.t+=dt;R.slashes=R.slashes.filter(s=>s.t<.28);}
  for(const d of R.dead)d.t+=dt;R.dead=R.dead.filter(d=>d.t<1.6);
  if(R.jail&&R.jail.flash>0)R.jail.flash-=dt;
  R.en=R.en.filter(e=>!e.dead&&!e.held);R.bu=R.bu.filter(b=>b.life>0);R.cr=R.cr.filter(c=>!c.dead);
  R.pa=R.pa.filter(p=>p.t>0);R.bolts=R.bolts.filter(b=>b.life>0);R.tx=R.tx.filter(x=>x.t>0);
  if(R.over)return;
  if(R.escapeT!=null){R.escapeT-=dt;for(const e of R.en)if(!e.onRoof)e.z+=520*dt;R.en=R.en.filter(e=>e.z<ZFAR+200||e.onRoof);if(R.escapeT<=0){R.escapeT=null;save.cleared=Math.max(save.cleared||0,2);legacyStage(2);save.gold+=600;persist();startFork(()=>{save.ckpt={stage:save.route==='highway'?3:'3f',wave:1};persist();state='win2';ui();},true);return;}}
  R.scatter=R.wall<=0?R.scatter+dt:Math.max(0,R.scatter-dt*.4);
  if(R.mflash)for(const k in R.mflash)R.mflash[k]-=dt;
  if(R.spawnLeft<=0&&!R.bossPending&&R.en.length===0&&R.cr.length===0&&!R.cinePending&&!R.cine&&!(R.proj&&R.proj.length)&&!(R.jeep&&R.jeep.phase!=='lost'&&R.jeep.phase!=='freed'))waveClear();
  hudUpdate();
}

/* ---------- DRAW ---------- */
function drawWorld(){
  const dt=Math.max(0,Math.min(.1,t-SKY.lastT));SKY.lastT=t;
  ctx.fillStyle='#1a1026';ctx.fillRect(-20,-20,WW+40,WH+40);
  if(R&&R.stage===3){if(R.forest)drawForestWorld(dt);else if(R.cont)drawContWorld(dt);else drawTownWorld(dt);return;}
  if(R&&R.stage===2){}else if(plateReady){const pw=WW*1.06,ph=pw*PLATE.height/PLATE.width,px=WW/2-pw/2-camX*.04,py=HOR-PLATE_HZ*ph;ctx.drawImage(PLATE,px,py,pw,ph);}
  if(!(R&&R.stage===2)){const yb=HOR+CAMH*K(WALL_Z),gr=ctx.createLinearGradient(0,yb-6,0,WH);gr.addColorStop(0,'rgba(18,10,26,.55)');gr.addColorStop(1,'rgba(18,10,26,.35)');ctx.fillStyle=gr;ctx.fillRect(-20,yb-6,WW+40,WH-yb+30);}
  if(R&&R.stage===2){drawStage2World(dt);if(plate2Ready){const pw=WW*1.06,ph=pw*PLATE2.height/PLATE2.width,py=HOR-PLATE_HZ*ph;
    ctx.save();ctx.beginPath();const px0=WW/2-pw/2,TP=[[0,853],[0,787],[18,752],[95,640],[195,584],[312,560],[995,560],[1090,584],[1185,640],[1250,722],[1280,762],[1280,853]];TP.forEach(([x,y],i)=>{const X=px0+x/1280*pw,Y=py+Math.max(y,559)/853*ph;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.lineTo(px0+pw,WH+40);ctx.lineTo(px0,WH+40);ctx.closePath();ctx.clip();ctx.drawImage(PLATE2,px0,py,pw,ph);ctx.restore();}drawRoad2();if(envReady)drawSky(dt);return;}
  if(envReady){drawSky(dt);drawBeams();}
}
function drawFrame(idx,x,y,sc,alpha){const r=RECTS[idx];if(!r)return;if(alpha!==undefined)ctx.globalAlpha=alpha;ctx.drawImage(ATL,r[0],r[1],r[2],r[3],x-r[4]*sc,y-r[5]*sc,r[2]*sc,r[3]*sc);ctx.globalAlpha=1;}
function heroFrame(id){
  const M=META[id],st=anim(id);
  if(st.a==='slash'){if(M.slash){const f=Math.floor(st.t*20);if(f<M.slash.length)return M.slash[f];}st.a='run';st.t=0;}
  if(st.a==='shoot'&&R&&R.stage===3&&!R.cfb&&M.wshoot){if(t-st.last<.35)return M.wshoot[Math.floor(t*9+id.length)%M.wshoot.length];st.a='run';st.t=0;}
  if(st.a==='shoot'){
    const n=M.shoot.length;let f=Math.floor(st.t*14);
    if(f>=n){
      if(t-st.last<.3){f=id==='blaze'?2+((f-2)%(n-2)):1;}
      else{st.a='run';st.t=0;}
    }
    if(st.a==='shoot')return M.shoot[Math.min(f,n-1)];
  }
  const lean=R?Math.min(3,Math.abs(R.vx)/170):0;
  if(lean>=1){const arr=R.vx<0?M.leanL:M.leanR;return arr[Math.min(arr.length-1,Math.floor(lean)-1)];}
  if(R&&R.stage===3&&!R.cfb&&M.run)return M.run[Math.floor(st.t*9)%M.run.length];
  const n=M.idle.length,ki=Math.floor(st.t*6)%Math.max(1,2*n-2);return M.idle[ki<n?ki:2*n-2-ki];
}
/* waist line for walk+shoot compositing: where each frame's body centre sits at hip height */
const WAIST_PX=68,WX={};let WXD=null;
function waistX(fr){if(fr in WX)return WX[fr];const r=RECTS[fr];let v=0;
  try{if(!WXD){const c=document.createElement('canvas');c.width=ATL.naturalWidth;c.height=ATL.naturalHeight;const x=c.getContext('2d');x.drawImage(ATL,0,0);WXD=x.getImageData(0,0,c.width,c.height);}
    const y0=Math.round(r[1]+r[5]-WAIST_PX-6),y1=y0+12;let sum=0,n=0;
    for(let y=Math.max(r[1],y0);y<Math.min(r[1]+r[3],y1);y++)for(let x=r[0];x<r[0]+r[2];x++){if(WXD.data[(y*WXD.width+x)*4+3]>128){sum+=x;n++;}}
    v=n?sum/n-(r[0]+r[4]):0;}catch(e){v=0;}
  return WX[fr]=v;}
const EBODY=120,EH=2.6;
function drawCorpse(d){
  if(d.hero){const[sx,sy,k]=P(d.x,d.z);drawFrame(d.fr,sx,sy,k*CHAR_H/BODY_PX,Math.max(0,1-d.t/1.6));return;}
  const M=META[d.reborn&&META.momma2?'momma2':d.type],[sx,sy,k]=P(d.x,d.z),n=d.type==='splitter'?4:M.death.length,f=Math.min(n-1,Math.floor(d.t*11));
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(sx,sy,d.r*1.1*k,d.r*.3*k,0,0,6.283);ctx.fill();
  drawFrame(M.death[f],sx,sy,k*d.r*EH/EBODY*(d.type==='boss'?BOSS_VIS:d.type==='momma'?1.7:d.type==='hexz'?1.35:1),Math.max(0,Math.min(1,(1.6-d.t)/.5)));
}
function drawEnemySprite(e,sx,sy,k,fade){
  const M=META[e.type],sc=k*e.r*EH/EBODY*(e.type==='boss'?BOSS_VIS:e.type==='momma'?1.7:1);let fr;
  const M2=META.boss2;
  if(e.type==='momma')fr=mommaFrame(e);
  else if(e.scrT>0){const A=M.attack;fr=A[Math.min(A.length-1,Math.floor((.5-e.scrT)/.5*A.length))];}
  else if(e.type==='boss'&&e.enraged&&M2){if(e.act==='throw'&&e.nextKind==='car')fr=M2.throwcar[Math.min(5,Math.floor(e.at/.95*6))];else if(e.act==='throw')fr=M.throw[Math.min(5,Math.floor(e.at/.95*6))];else if(e.act==='roar')fr=M.roar[Math.min(3,Math.floor(e.at/.85*4))];else fr=M2.walk[Math.floor(t*11)%M2.walk.length];}
  else if(e.type==='boss'){if(e.act==='throw')fr=M.throw[Math.min(5,Math.floor(e.at/.95*6))];else if(e.act==='roar')fr=M.roar[Math.min(3,Math.floor(e.at/.85*4))];else fr=M.walk[Math.floor(t*(e.z>BOSS_Z+5?6:3))%M.walk.length];}
  else if(e.atk!==undefined){const A=M.attack||M.hit;fr=A[Math.min(A.length-1,Math.floor(e.atk*7))];}
  else if(e.jt!==undefined&&e.jt<.6){const A=M.attack||M.hit;fr=A[Math.min(A.length-1,Math.floor(e.jt*7))];}
  else if(e.stun>0)fr=M.hit[1];
  else if(e.hitT>0)fr=M.hit[Math.min(M.hit.length-1,Math.floor((.24-e.hitT)/.24*M.hit.length))];
  else{const fps=e.type==='runner'||e.type==='screecher'?15:e.type==='brute'?7:e.type==='armored'||e.type==='splitter'?8:10;fr=M.walk[Math.floor(t*fps*(e.slow>0?.5:1)+e.wob*3)%M.walk.length];}
  ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.05*k,e.r*.3*k,0,0,6.283);ctx.fill();
  if(e.elite){ctx.strokeStyle='#ffc53d';ctx.lineWidth=Math.max(1.5,3*k);ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.25*k,e.r*.38*k,0,0,6.283);ctx.stroke();}
  if(e.curse){ctx.strokeStyle='rgba(182,242,58,.8)';ctx.lineWidth=Math.max(1,2*k);ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.15*k,e.r*.34*k,0,0,6.283);ctx.stroke();}
  if(e.slow>0||e.stun>0){ctx.fillStyle='rgba(159,232,255,.35)';ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.2*k,e.r*.36*k,0,0,6.283);ctx.fill();}
  drawFrame(fr,sx,sy,sc,fade);
  if(e.flash>0||e.slow>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,sx,sy,sc,(e.flash>0?.55:.22)*fade);ctx.globalCompositeOperation='source-over';}
  const top=sy-e.r*EH*k-6;
  if(e.type!=='boss'&&e.type!=='momma'&&e.hp<e.max&&k>.25){const bw=e.r*1.6*k,bh=Math.max(2,4*k);ctx.fillStyle='#000a';ctx.fillRect(sx-bw/2,top,bw,bh);ctx.fillStyle=e.elite?'#ffc53d':'#ff4d5e';ctx.fillRect(sx-bw/2,top,bw*Math.max(0,e.hp/e.max),bh);}
}
function drawEnemy(e){if(e.type==='hexz'){drawHexZ(e);return;}
  if(atlasReady&&META[e.type]){const[sx,sy,k]=P(e.x,e.z);drawEnemySprite(e,sx,sy,k,Math.max(0,Math.min(1,(ZFAR+130-e.z)/160)));return;}
  const[sx,sy,k]=P(e.x,e.z);const r=e.r*k;
  const fade=Math.min(1,(ZFAR+130-e.z)/160);ctx.globalAlpha=Math.max(0,fade);
  const bob=Math.abs(Math.sin(t*7+e.wob))*4*k;
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(sx,sy,r*1.05,r*.3,0,0,6.283);ctx.fill();
  const cy=sy-r-bob;
  ctx.fillStyle=e.flash>0?'#ffffff':e.stun>0?'#cfefff':e.slow>0?'#7fb8d8':e.col;
  ctx.beginPath();ctx.ellipse(sx,cy,r,r*1.05,0,0,6.283);ctx.fill();
  // darker underside for volume
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(sx,cy+r*.35,r*.9,r*.6,0,0,Math.PI);ctx.fill();
  if(e.armor&&e.type!=='boss'){ctx.strokeStyle='#d7dde8';ctx.lineWidth=Math.max(1.5,3*k);ctx.beginPath();ctx.arc(sx,cy,r*.92,3.6,5.8);ctx.stroke();}
  if(e.elite){ctx.strokeStyle='#ffc53d';ctx.lineWidth=Math.max(1,2*k);ctx.beginPath();ctx.ellipse(sx,cy,r+3*k,r*1.05+3*k,0,0,6.283);ctx.stroke();}
  if(e.burn>0){ctx.fillStyle='rgba(255,122,46,.55)';ctx.beginPath();ctx.arc(sx,cy-r*.5,r*.55,0,6.283);ctx.fill();}
  // face the squad
  const ex=r*.36,ey=cy-r*.15;
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(sx-ex,ey,r*.2,0,6.283);ctx.arc(sx+ex,ey,r*.2,0,6.283);ctx.fill();
  ctx.fillStyle=e.type==='boss'?'#ff2020':'#ff3';ctx.beginPath();ctx.arc(sx-ex,ey+r*.03,r*.08,0,6.283);ctx.arc(sx+ex,ey+r*.03,r*.08,0,6.283);ctx.fill();
  ctx.fillStyle='#1a0d0d';ctx.beginPath();ctx.ellipse(sx,cy+r*.38,r*.32,r*.12,0,0,6.283);ctx.fill();
  if(e.hp<e.max&&r>5){ctx.fillStyle='#000a';ctx.fillRect(sx-r,cy-r*1.05-8*Math.max(.5,k),r*2,Math.max(2,4*k));ctx.fillStyle='#ff4d5e';ctx.fillRect(sx-r,cy-r*1.05-8*Math.max(.5,k),r*2*Math.max(0,e.hp/e.max),Math.max(2,4*k));}
  ctx.globalAlpha=1;
}
function drawCrate(c){
  const[sx,sy,k]=P(c.x,c.z);const s=56*k;
  ctx.globalAlpha=Math.max(0,Math.min(1,(ZFAR+60-c.z)/120));
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(sx,sy,s*.7,s*.18,0,0,6.283);ctx.fill();
  ctx.fillStyle=c.flash>0?'#fff':'#7a5524';ctx.fillRect(sx-s/2,sy-s,s,s);
  ctx.fillStyle=c.flash>0?'#fff':'#9a6c2e';ctx.beginPath();ctx.moveTo(sx-s/2,sy-s);ctx.lineTo(sx-s*.3,sy-s*1.18);ctx.lineTo(sx+s*.7,sy-s*1.18);ctx.lineTo(sx+s/2,sy-s);ctx.fill();
  ctx.strokeStyle='#ffc53d';ctx.lineWidth=Math.max(1,2*k);ctx.strokeRect(sx-s/2,sy-s,s,s);
  const lab=c.rw.type==='weapon'?'GUN':'XP';
  ctx.fillStyle='#ffc53d';ctx.font=Math.max(7,Math.round(13*k))+'px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(lab,sx,sy-s*.42);
  ctx.fillStyle='#000a';ctx.fillRect(sx-s/2,sy-s*1.35,s,Math.max(2,5*k));ctx.fillStyle='#ffc53d';ctx.fillRect(sx-s/2,sy-s*1.35,s*Math.max(0,c.hp/c.max),Math.max(2,5*k));
  ctx.globalAlpha=1;
}
function drawJail(j){
  const[sx,sy,k]=P(j.x,j.z);const w=JAIL_W*k,h=JAIL_H*k,fl=j.flash>0;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(sx,sy,w*.62,w*.16,0,0,6.283);ctx.fill();
  ctx.fillStyle='#1d1a26';ctx.fillRect(sx-w/2,sy-h,w,h);
  if(atlasReady&&META[j.id]){const M=META[j.id],n=M.idle.length,f=Math.floor(t*5)%Math.max(1,2*n-2);drawFrame(M.idle[f<n?f:2*n-2-f],sx,sy-4*k,k*CHAR_H/BODY_PX,.92);}
  ctx.strokeStyle=fl?'#ffffff':'#8d96a8';ctx.lineWidth=Math.max(1.5,4*k);
  for(let i=0;i<=6;i++){const x=sx-w/2+w*i/6;ctx.beginPath();ctx.moveTo(x,sy-h);ctx.lineTo(x,sy);ctx.stroke();}
  ctx.fillStyle=fl?'#ffffff':'#5b6274';ctx.fillRect(sx-w/2-3*k,sy-h-8*k,w+6*k,10*k);ctx.fillRect(sx-w/2-3*k,sy-6*k,w+6*k,8*k);
  ctx.fillStyle='#ffc53d';ctx.fillRect(sx-7*k,sy-h*.55,14*k,16*k);
  const bw=Math.max(60,w*1.1),by=sy-h-26*k-10;
  ctx.fillStyle='#000a';ctx.fillRect(sx-bw/2,by,bw,6);ctx.fillStyle=HEROES[j.id].color;ctx.fillRect(sx-bw/2,by,bw*Math.max(0,j.hp/j.max),6);
  ctx.fillStyle='#ffc53d';ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('FREE '+HEROES[j.id].name.toUpperCase(),sx,by-5);
}
function drawSlash(s){
  const[cx,cy,k]=P(s.x,s.z-6,34),q=s.t/.28,R0=180*k,a0=s.dir>0?-2.6:-.55,sweep=2.1*s.dir,a1=a0+sweep*Math.min(1,q*2.2);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(const[w,col,al]of[[16,'#ff6a2b',.35],[8,'#ffd9a8',.7],[3,'#ffffff',.95]]){ctx.strokeStyle=col;ctx.globalAlpha=al*(1-q);ctx.lineWidth=w*k*1.6;ctx.beginPath();ctx.ellipse(cx,cy,R0,R0*.42,0,Math.min(a0,a1),Math.max(a0,a1));ctx.stroke();}
  ctx.restore();ctx.globalAlpha=1;
}
function drawSquadMember(s){
  const[sx,sy,k]=P(s.x,s.z);
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(sx,sy,24*k,7*k,0,0,6.283);ctx.fill();
  if(s.id==='cmd'){ctx.strokeStyle='#ffc53d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,30*k,9*k,0,0,6.283);ctx.stroke();}
  if(atlasReady&&R&&R.stage===3&&!R.cfb&&anim(s.id).a==='shoot'&&META[s.id].run&&!META[s.id].wshoot){const sc=k*CHAR_H/BODY_PX,fr=heroFrame(s.id),M=META[s.id],rf=M.run[Math.floor(t*9+(s.id.length))%M.run.length],cut=sy-WAIST_PX*sc;
    const dx=(waistX(fr)-waistX(rf))*sc;
    ctx.save();ctx.beginPath();ctx.rect(sx-200*k,cut-2*sc,400*k,300*k);ctx.clip();drawFrame(rf,sx+dx,sy,sc);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(sx-200*k,cut-400*k,400*k,400*k+3*sc);ctx.clip();drawFrame(fr,sx,sy,sc);
    if(R.mflash&&R.mflash[s.id]>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,sx,sy,sc,.6);ctx.globalCompositeOperation='source-over';}ctx.restore();}
  else if(atlasReady){const sc=k*CHAR_H/BODY_PX,fr=heroFrame(s.id);drawFrame(fr,sx,sy,sc);if(R&&R.mflash&&R.mflash[s.id]>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,sx,sy,sc,.6);ctx.globalCompositeOperation='source-over';}}
  if(R){const f=Math.max(0,getHp(s.id)/maxHp(s.id)),bw=46*k,by=sy-CHAR_H*k-10;ctx.fillStyle='#000b';ctx.fillRect(sx-bw/2-1,by-1,bw+2,7);ctx.fillStyle=f<.3?'#ff4d5e':f<.6?'#ffc53d':'#5ee08a';ctx.fillRect(sx-bw/2,by,bw*f,5);}
  if(R&&supOn(s.id)){const v=supV(s.id),bw=46*k,by=sy-CHAR_H*k-3;ctx.fillStyle='#000b';ctx.fillRect(sx-bw/2-1,by-1,bw+2,4);ctx.fillStyle=v>=1?'#b6f23a':'#7b4bd6';ctx.fillRect(sx-bw/2,by,bw*v,2);
    if(v>=1){const pl=.5+.5*Math.sin(t*6);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(sx,sy-CHAR_H*k*.45,0,sx,sy-CHAR_H*k*.45,CHAR_H*k*.75);g.addColorStop(0,'rgba(182,242,58,'+(.15+.15*pl)+')');g.addColorStop(1,'rgba(182,242,58,0)');ctx.fillStyle=g;ctx.fillRect(sx-CHAR_H*k,sy-CHAR_H*k*1.3,CHAR_H*k*2,CHAR_H*k*1.4);ctx.restore();
      ctx.strokeStyle='rgba(182,242,58,'+(.5+.5*pl)+')';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,(32+4*pl)*k,(10+1.5*pl)*k,0,0,6.283);ctx.stroke();}}
}
function drawBullet(b){
  const[sx,sy,k]=P(b.x,b.z,b.h);
  if(b.flame){const a=Math.max(0,Math.min(1,b.life*3));ctx.globalAlpha=a;ctx.fillStyle=Math.random()<.5?'#ffb347':'#ff5a1f';ctx.beginPath();ctx.arc(sx,sy,(b.r+(1-b.life)*14)*k,0,6.283);ctx.fill();ctx.globalAlpha=1;return;}
  if(b.trail){const[tx,ty]=P(b.x-b.vx*.035,b.z-b.vz*.035,b.h);ctx.strokeStyle=b.col;ctx.lineWidth=Math.max(1,3*k);ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(tx,ty);ctx.stroke();}
  if(b.glow){ctx.fillStyle=b.col;ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(sx,sy,b.r*k*2.2,0,6.283);ctx.fill();ctx.globalAlpha=1;}
  ctx.fillStyle=b.orb?'#f0d8ff':b.col;ctx.beginPath();ctx.arc(sx,sy,Math.max(1.2,b.r*k*(b.orb?.8:.6)),0,6.283);ctx.fill();
}
function draw(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#0d1016';ctx.fillRect(0,0,cv.width,cv.height);
  ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*ox,dpr*oy);
  ctx.save();ctx.beginPath();ctx.rect(0,0,WW,WH);ctx.clip();
  if(R&&R.shake>0)ctx.translate((Math.random()-.5)*7,(Math.random()-.5)*7);
  if(R&&R.side&&R.side.on){drawSide();ctx.restore();return;}
  if(R&&R.s6&&R.s6.on){s6Draw();ctx.restore();return;}
  drawWorld();
  if(!R){ctx.restore();return;}
  // far to near
  const items=[];
  for(const e of R.en)items.push([e.z,0,e]);
  for(const c of R.cr)items.push([c.z,1,c]);
  for(const b of R.bu)items.push([b.z,2,b]);
  if(R.jail)items.push([R.jail.z,3,R.jail]);
  if(R.jeep)items.push([R.jeep.z,5,R.jeep]);
  for(const d of R.dead)items.push([d.z+.1,4,d]);
  if(R.proj)for(const p of R.proj){items.push([p.z,6,p]);items.push([p.z1+.2,7,p]);}
  if(R.bfx)for(const f of R.bfx)items.push([f.z-.1,8,f]);
  if(R.swaves)for(const w of R.swaves)items.push([w.z,11,w]);if(R.claws)for(const c of R.claws)items.push([c.z+40,12,c]);if(R.dag)for(const p of R.dag)items.push([p.z,13,p]);
  items.sort((a,b)=>b[0]-a[0]);
  const NZ=R.stage===3?1e9:WALL_Z,near=items.filter(i=>(i[1]===0||i[1]===4)&&i[0]<NZ);
  for(const[z,ty,o]of items){if((ty===0||ty===4)&&z<NZ)continue;if(ty===0)drawEnemy(o);else if(ty===1)drawCrate(o);else if(ty===3)drawJail(o);else if(ty===4)drawCorpse(o);else if(ty===5)drawJeep(o);else if(ty===6)drawProj(o);else if(ty===7)drawWarn(o);else if(ty===8)drawBfx(o);else if(ty===11)drawSWave(o);else if(ty===12)drawClaw(o);else if(ty===13)drawDag(o);else drawBullet(o);}
  if(R.stage===1||!R.stage)drawWall();else if(R.stage===2&&!plate2Ready)drawTruckRoof();
  for(const bo of R.bolts){if(bo.tr){const[a,b]=P(...bo.pts[0]),[c,d]=P(...bo.pts[1]);ctx.strokeStyle=bo.col;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();continue;}ctx.strokeStyle=bo.col;ctx.lineWidth=2.5;ctx.shadowColor='#6aa8ff';ctx.shadowBlur=10;ctx.beginPath();
    bo.pts.forEach((p,i)=>{const[x,y]=P(p[0],p[1],p[2]);if(!i)ctx.moveTo(x,y);else{const[qx,qy]=P(bo.pts[i-1][0],bo.pts[i-1][1],bo.pts[i-1][2]);ctx.lineTo((x+qx)/2+(Math.random()-.5)*18,(y+qy)/2+(Math.random()-.5)*18);ctx.lineTo(x,y);}});ctx.stroke();ctx.shadowBlur=0;}
  for(const p of R.pa){const[x,y,k]=P(p.x,p.z,p.h);ctx.globalAlpha=Math.max(0,p.t*2);ctx.fillStyle=p.col;const s=Math.max(1.5,5*k);ctx.fillRect(x-s/2,y-s/2,s,s);}ctx.globalAlpha=1;
  const lay=near.map(i=>[i[0],i[1],i[2]]);if(!R.blz&&!R.vmg)for(const s of squad())lay.push([s.z+16,9,s]);if(R.civ&&!R.civHide)for(const c of R.civ){if(c.hp>0)lay.push([c.z+12,10,c]);if(R.forest&&c.van!=null&&c.van<.9)lay.push([c.z+11,14,c]);}
  lay.sort((a,b)=>b[0]-a[0]);
  if(R.slashes)for(const s of R.slashes)drawSlash(s);
  for(const[,ty,o]of lay){if(ty===14)drawVanish(o);else if(ty===10)drawCiv(o);else if(ty===9)drawSquadMember(o);else if(ty===0)drawEnemy(o);else drawCorpse(o);}
  for(const x of R.tx){ctx.globalAlpha=Math.min(1,x.t);ctx.fillStyle=x.col;ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(x.txt,x.x,x.y);}ctx.globalAlpha=1;
  if(R.forest)drawStuns();
  if(R.s5)s5Draw();
  if(R.vmg)drawVoltMG();
  if(R.blz)drawBlaze();
  drawBossBar();
  if(R.cine)drawCine();
  if(R.banner&&!R.cine){const b=R.banner;ctx.globalAlpha=Math.min(1,b.t*2);ctx.fillStyle='#0d1016cc';ctx.fillRect(0,HOR+30,WW,44);
    ctx.fillStyle=b.col||'#ffc53d';ctx.font='18px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.txt,WW/2,HOR+59);ctx.globalAlpha=1;}
  if((R.forest||R.cfb)&&R.say)drawSay();
  ctx.restore();
}

/* ---------- LOOP ---------- */
let last=performance.now();
function loop(now){resizeCheck();
  const dt=Math.min(.033,(now-last)/1000);last=now;
  if(state==='play')update(dt);else if(state==='blaze')blazeUpdate(dt);else if(state==='volt')vmgUpdate(dt);else if(state==='side')sideUpdate(dt);else if(state==='drive')s6Update(dt);else{t+=dt*.3;}
  SND.setTrack(state==='intro'?'cine':(state==='play'||state==='blaze'||state==='volt'||state==='side'||state==='drive'||state==='pause'||state==='inter')?'combat':state==='over'?null:state==='win'?'title':'title');SND.setPause(state==='pause'||state==='inter');
  draw();requestAnimationFrame(loop);
}
function resize(){
  const r=stage.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);
  WW=r.width>r.height?Math.round(Math.max(600,Math.min(820,WH*r.width/r.height))):640;
  scale=Math.min(r.width/WW,r.height/WH);ox=(r.width-WW*scale)/2;oy=(r.height-WH*scale)/2;
  turn.hidden=!(r.height>r.width&&state==='play');
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>setTimeout(resize,250));if(window.visualViewport)visualViewport.addEventListener('resize',resize);
let rsW=0,rsH=0;function resizeCheck(){const w=stage.clientWidth,h=stage.clientHeight;const d=Math.min(2,window.devicePixelRatio||1);if(w!==rsW||h!==rsH||Math.abs(cv.width-Math.round(w*d))>2||Math.abs(cv.height-Math.round(h*d))>2){rsW=w;rsH=h;resize();}}

/* ---------- INPUT ---------- */
let drag=null,tap0=null;
cv.addEventListener('pointerdown',e=>{if(state==='drive'){s6Down(e);return;}if(state==='side'){sideDown(e);return;}if(state==='volt'){vmgDown();try{cv.setPointerCapture(e.pointerId);}catch(_){}return;}if(state==='blaze'){const rc=cv.getBoundingClientRect();blazeTap((e.clientX-rc.left-ox)/scale);try{cv.setPointerCapture(e.pointerId);}catch(_){}return;}if(state!=='play'||(R&&R.cine))return;const rc=cv.getBoundingClientRect();if(tapJeep((e.clientX-rc.left-ox)/scale,(e.clientY-rc.top-oy)/scale))return;tap0={x:e.clientX,y:e.clientY,t:performance.now(),gx:(e.clientX-rc.left-ox)/scale,gy:(e.clientY-rc.top-oy)/scale};drag=e.clientX;cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(state==='drive'){s6Move(e);return;}if(state==='side'){sideMove(e);return;}if(state==='blaze'){const rc=cv.getBoundingClientRect();blazeAim((e.clientX-rc.left-ox)/scale);return;}if(drag===null)return;if(stunned('cmd')){drag=e.clientX;return;}SX+=(e.clientX-drag)/scale*1.25;drag=e.clientX;const l=sxLimit();SX=Math.max(-l,Math.min(l,SX));});
const endDrag=()=>drag=null;cv.addEventListener('pointerup',e=>{if(tap0&&state==='play'&&Math.hypot(e.clientX-tap0.x,e.clientY-tap0.y)<14&&performance.now()-tap0.t<400)tapSuper(tap0.gx,tap0.gy);tap0=null;});cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointerup',e=>{if(state==='volt')vmgUp();if(R&&R.s6)s6Up(e);});cv.addEventListener('pointercancel',e=>{if(R&&R.s6)s6Up(e);});cv.addEventListener('pointercancel',()=>{if(state==='volt')vmgUp();});cv.addEventListener('pointerup',e=>{if(state==='blaze')blazeUp();if(state==='side')sideUp(e);});cv.addEventListener('pointercancel',e=>{if(state==='blaze')blazeUp();if(state==='side')sideUp(e);});cv.addEventListener('pointercancel',endDrag);
const keys={};
window.addEventListener('keydown',e=>{keys[e.key]=1;});window.addEventListener('keyup',e=>{keys[e.key]=0;});
setInterval(()=>{if(state!=='play'||stunned('cmd'))return;const l=sxLimit();if(keys.ArrowLeft)SX=Math.max(-l,SX-9);if(keys.ArrowRight)SX=Math.min(l,SX+9);},16);
document.getElementById('pauseBtn').onclick=()=>{if(state==='play'){state='pause';ui();}};

/* ---------- UI ---------- */
const hW=document.getElementById('hWave'),hH=document.getElementById('hHp'),hG=document.getElementById('hGold');
function hudUpdate(){const hb=hH.parentElement;if(hb)hb.style.display='';if(R.s5){hW.textContent=R.s5ph==='w1'?'STAGE 5 · WAVE 1':'THE RITUAL';const wl=document.querySelector('.wl');const left=R.spawnLeft+R.en.filter(e=>!e.dead).length;if(wl)wl.textContent=R.s5ph==='w1'?'ENEMIES '+left:'';hH.style.width=(R.spawnTotal?Math.max(0,1-R.kills/(R.spawnTotal+8))*100:0)+'%';hH.style.background='var(--blood)';hG.textContent=save.gold.toLocaleString();return;}if(R.cfa){hW.textContent='CONTAINMENT';const wl=document.querySelector('.wl'),n=R.en.filter(e=>e.type==='brute'&&e.hp>0).length;if(wl)wl.textContent='BRUTES '+n;hH.style.width=(n/10*100)+'%';hH.style.background='var(--blood)';hG.textContent=save.gold.toLocaleString();return;}if(R.cfb){hW.textContent='CYBER FUTURE';const wl=document.querySelector('.wl');if(wl)wl.textContent=R.cfLost?'BRUNO & BLAZE · LOST':'BRUNO & BLAZE '+fmtClock(R.clock);const f=R.clock/R.clock0;hH.style.width=(f*100)+'%';hH.style.background=R.clock<60?'var(--blood)':'var(--hazard)';hG.textContent=save.gold.toLocaleString();return;}if(R.forest){hW.textContent='WAVE '+R.wave+'/'+F_WAVES;const wl=document.querySelector('.wl'),mb=R.en.find(e=>e.type==='momma');if(wl)wl.textContent='SURVIVORS '+civsAlive().length;const f=civsAlive().length/CIV_N;hH.style.width=(f*100)+'%';hH.style.background=R.wave>1&&f<.4?'var(--blood)':'var(--hazard)';hG.textContent=save.gold.toLocaleString();return;}if(R.stage===3){hW.textContent='WAVE '+R.wave+'/'+S3_WAVES;const wl=document.querySelector('.wl');if(wl)wl.textContent='SURVIVORS '+civsAlive().length;const f=civsAlive().length/CIV_N;hH.style.width=(f*100)+'%';hH.style.background=f<.4?'var(--blood)':'var(--hazard)';hG.textContent=save.gold.toLocaleString();return;}hW.textContent=R.stage===2?'ESCAPE':'WAVE '+R.wave;const wl=document.querySelector('.wl');if(wl)wl.textContent=R.stage===2?'TRUCK':'WALL';const wf=R.wall/R.wallMax;hH.style.width=(wf*100)+'%';hH.style.background=wf<.3?'var(--blood)':'var(--hazard)';hG.textContent=save.gold.toLocaleString();}
function waveClear(){if(R.s5){s5WaveDone();return;}if(R.cfa){cfaVaultDone();return;}if(R.cfb){cfbYardDone();return;}if(R.stage===2)return;if(R.stage===3){if(R.forest)waveClearF();else waveClear3();return;}SND.waveClear();save.best=Math.max(save.best,R.wave);R.wall=Math.min(R.wallMax,R.wall+R.wallMax*.4);R.scatter=0;healRecovery();save.gold+=50+R.wave*20;persist();if(R.wave>=STAGE_WAVES){save.cleared=Math.max(save.cleared||0,1);legacyStage(1);persist();startIntro(()=>{save.ckpt={stage:2,wave:1};persist();state='win';ui();},SHOTS2);return;}state='inter';ui();}
function gameOver(){clearCkpt();SND.gameOver();story('commander_fell',{});legacyEnd('commander_fell');save.best=Math.max(save.best,R.wave-1);persist();state='over';ui();}
const STAGE_WAVES=5;
function freshSave(){legacy();const LG=save.legacy;save={legacy:LG,seen:save.seen,mode:save.mode||'normal',downed:{},heroes:{},weapons:['pistol'],equip:'pistol',gold:0,best:save.best,cleared:save.cleared,stats:save.stats||{},runStats:{},cmd:1,active:[],fallen:[]};persist();}
function rosterHTML(){
  let h='<h3>Commander</h3>';
  const cc=trainCost(save.cmd);
  h+=`<div class="cards"><div class="card"><div class="badge"><canvas width="128" height="128" data-por="cmd"></canvas></div><div class="cname">You<small>${WEAPONS[save.equip].name}</small></div><div class="lv">LV ${save.cmd}</div><div class="xp"><i style="width:${save.cmd>=MAXLV?100:Math.min(100,(save.cmdXp||0)/xpNeed(save.cmd)*100)}%"></i></div>
  <div class="perks">${CMD_PERKS.map((p,i)=>`<span class="perk ${save.cmd>=PERK_LV[i]?'on':''}">Lv${PERK_LV[i]} ${p}</span>`).join('')}</div>
  <button class="train" data-act="stat" data-id="cmd">${ptsFree('cmd')?'Stats · '+ptsFree('cmd')+' points to spend':'Stats & points'}</button></div></div>`;
  if(save.weapons.length>1)h+='<h3>Weapons · tap to equip</h3><div class="chips">'+WEAPON_ORDER.map(w=>save.weapons.includes(w)?`<button class="chip ${save.equip===w?'on':''}" data-act="eq" data-id="${w}">${WEAPONS[w].name}</button>`:`<span class="chip locked">Locked</span>`).join('')+'</div>';
  h+=`<h3>Squad · ${save.active.length}/${MAX_ACTIVE} heroes deployed with you</h3><div class="cards">`;
  const rk=id=>save.heroes[id]?0:save.away&&save.away[id]?1:save.fallen.includes(id)?2:3;
  for(const id of HERO_ORDER.slice().sort((a,b)=>rk(a)-rk(b))){
    const H=HEROES[id],s=save.heroes[id];
    if(!s&&save.away&&save.away[id]){h+=`<div class="card locked"><div class="badge"><canvas width="128" height="128" data-por="${id}"></canvas></div><div class="cname">${H.name}<small>Away</small></div><div class="lv">LV ${save.away[id].lv}</div><div class="xp"></div><div class="perks"><span class="perk">${id==='bruno'?'Gone ahead to Cyber Future':'Rejoins later in the story'}</span></div></div>`;continue;}
    if(!s&&save.fallen.includes(id)){h+=`<div class="card locked"><div class="badge"><canvas width="128" height="128" data-st="fallen" data-por="${id}"></canvas></div><div class="cname">${H.name}<small>${HORDE()?'Fallen':'Down'}</small></div><div class="lv">†</div><div class="xp"></div><div class="perks"><span class="perk">${HORDE()?'Lost for good. Horde mode has no revives.':(save.downed&&save.downed[id]?'Back at half health when the next stage starts.':'Lost for good.')}</span></div><button class="train" data-act="stat" data-id="${id}">Stats</button></div>`;continue;}
    if(!s){h+=`<div class="card locked"><div class="badge"><canvas width="128" height="128" data-st="locked" data-por="${id}"></canvas></div><div class="cname">Unknown hero</div><div class="lv"></div><div class="xp"></div><div class="perks"><span class="perk">Joins later in the story</span></div></div>`;continue;}
    const need=xpNeed(s.lv),cost=trainCost(s.lv),mx=s.lv>=MAXLV,act=save.active.includes(id),hpf=Math.max(0,getHp(id)/maxHp(id));
    h+=`<div class="card" style="${act?'border-color:var(--hazard)':''}"><div class="badge" style="box-shadow:inset 0 0 0 2px ${H.color}"><canvas width="128" height="128" data-por="${id}"></canvas></div><div class="cname">${H.name}<small>${H.role}</small></div><div class="lv">LV ${s.lv}</div>
    <div class="xp" style="grid-column:2/4"><i style="width:${hpf*100}%;background:${hpf<.3?'var(--blood)':'var(--good)'}"></i></div>
    <div class="xp"><i style="width:${mx?100:Math.min(100,s.xp/need*100)}%"></i></div>
    <div class="perks">${perksOf(id).map((p,i)=>`<span class="perk ${s.lv>=PERK_LV[i]?'on':''}">Lv${PERK_LV[i]} ${p}</span>`).join('')}</div>
    <button class="train" data-act="stat" data-id="${id}">${ptsFree(id)?'Stats · '+ptsFree(id)+' points to spend':'Stats & points'}</button>
    <button class="train" data-act="${act?'bench':'deploy'}" data-id="${id}" ${!act&&save.active.length>=MAX_ACTIVE?'disabled':''}>${act?'In squad · move to reserve':save.active.length>=MAX_ACTIVE?'Reserve · squad is full':'Reserve · add to squad'}</button></div>`;
  }
  return h+'</div>';
}
const POR_SRC={"cmd": "assets/por/cmd.webp?v=24461889cc", "bruno": "assets/por/bruno.webp?v=3744c0c01f", "rook": "assets/por/rook.webp?v=f5dac59da9", "blaze": "assets/por/blaze.webp?v=3594224621", "frost": "assets/por/frost.webp?v=6283bde2e7", "hex": "assets/por/hex.webp?v=38e4b79068", "volt": "assets/por/volt.webp?v=950712d37d", "nova": "assets/por/nova.webp?v=e9b3533ad0"},POR={};for(const k in POR_SRC){const im=new Image();im.onload=()=>{if(state!=='play')drawPortraits();};im.src=POR_SRC[k];POR[k]=im;}
function porReady(id){const im=POR[id];return im&&im.complete&&im.naturalWidth;}
let statId='cmd',statBack='roster',rosterBack='menu';
function drawPortraits(){drawEnemyThumbs();
  ov.querySelectorAll('canvas[data-por]').forEach(c=>{
    const id=c.dataset.por,g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
    if(porReady(id)){g.drawImage(POR[id],0,0,c.width,c.height);
      if(c.dataset.st==='fallen'){const d=g.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4){const v=(a[i]*.3+a[i+1]*.59+a[i+2]*.11)*.7;a[i]=a[i+1]=a[i+2]=v;}g.putImageData(d,0,0);
        g.strokeStyle='#ff4d5e';g.lineWidth=c.width*.07;g.lineCap='round';g.beginPath();g.moveTo(c.width*.2,c.height*.2);g.lineTo(c.width*.8,c.height*.8);g.moveTo(c.width*.8,c.height*.2);g.lineTo(c.width*.2,c.height*.8);g.stroke();}
      else if(c.dataset.st==='locked'){g.globalCompositeOperation='source-atop';g.fillStyle='#120c18';g.globalAlpha=.94;g.fillRect(0,0,c.width,c.height);g.globalAlpha=1;g.globalCompositeOperation='source-over';
        g.fillStyle='#5a2d7a';g.font='bold '+(c.width*.5)+'px Bungee, Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('?',c.width/2,c.height*.55);}
      return;}
    if(!atlasReady)return;
    if(META.por[id]!==undefined){const r=RECTS[META.por[id]];g.drawImage(ATL,r[0],r[1],r[2],r[3],0,0,104,104);}
    else{const r=RECTS[META[id].idle[0]];const s=Math.round(r[3]*.55);g.drawImage(ATL,r[0]+r[4]-s/2,r[1],s,s,0,0,104,104);}
  });
}
function ui(){
  hud.hidden=!(state==='play'||state==='pause')||!!(R&&R.s6);
  ov.hidden=state==='play'||state==='intro'||state==='blaze'||state==='volt'||state==='side'||state==='drive';
  resize();
  let html='';
  ov.classList.toggle('title-mode',state==='menu'||state==='splash');
  if(state==='splash'){ov.innerHTML=`<div class="mscreen" data-act="begin"><div class="mbg"></div><div class="mglow"></div><div class="mgrain"></div><div class="mvig" style="background:rgba(11,8,14,.55)"></div>
    <div class="msplash"><div class="mlogo"></div><button class="mbtn play" data-act="begin">Tap to start</button><div class="mrot"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 14a9 9 0 0 0 6 6M21 10a9 9 0 0 0-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Rotate your phone sideways for widescreen</div><div class="mbest">Sound on for the full experience</div></div></div>`;return;}
  ov.classList.toggle('paper',['inter','roster','load','options','credits','bye','over','win','win2','stat','modes','gallery','win3','win3f','pick4a','win4a','pick5','pick5s','guard5','win5','seat6','win6'].includes(state));
  if(state==='menu'){
    ov.innerHTML=`<div class="mscreen"><div class="mbg"></div><div class="mglow"></div>
      <div class="mgas g1"></div><div class="mgas g2"></div><div class="mgrain"></div><div class="mvig"></div>
      <div class="mside"><h1 class="mlogo"><span class="sr">Holdout Squad: The Zombie Chronicles</span></h1>
        <nav class="mnav" aria-label="Main menu">
          ${save.ckpt?`<button class="mbtn play" data-act="continue">Continue<small style="display:block;font-size:.5em;letter-spacing:.04em;opacity:.8">${ckptLabel(save.ckpt)}</small></button>`:''}
          <button class="mbtn ${save.ckpt?'':'play'}" data-act="modes">${save.ckpt?'New game':'Play'}</button>
          <button class="mbtn" data-act="load">Load</button>
          <button class="mbtn" data-act="options">Options</button>
          <button class="mbtn" data-act="credits">Credits</button>
          <button class="mbtn" data-act="bye">Quit</button>
        </nav>
      </div></div>`;
    if(R)hudUpdate();return;
  }
  if(state==='modes'){
    html=`<h2>Choose your mode</h2><div class="stripe"></div>
    <div class="card" style="grid-template-columns:1fr"><div class="cname">Normal<small>For the story</small></div>
      <div class="perks"><span class="perk on">Downed heroes return at half health when the next stage starts</span><span class="perk">Standard enemy numbers and damage</span></div>
      <button class="btn" data-act="pickmode" data-mode="normal">Play Normal</button></div>
    <div class="card" style="grid-template-columns:1fr"><div class="cname">Horde<small>No second chances</small></div>
      <div class="perks"><span class="perk" style="border-color:var(--blood);color:var(--blood)">Permadeath: fallen heroes are gone</span><span class="perk" style="border-color:var(--blood);color:var(--blood)">Enemies deal 15% more damage</span><span class="perk" style="border-color:var(--blood);color:var(--blood)">Twice as many enemies</span></div>
      <button class="btn" data-act="pickmode" data-mode="horde">Play Horde</button></div>
    <button class="btn ghost" data-act="menu">Back</button>`;
  }else if(state==='load'){
    html=loadHTML();
  }else if(state==='options'){
    html=`<h2>Options</h2><div class="stripe"></div>
    <h3>How to play</h3>
    <ul class="how"><li>Drag left and right to move the squad behind the wall</li><li>You fire straight down the road, so line up with your target</li><li>Heroes auto-target the horde</li><li>When Bruno's jeep flips, tap it fast to pull him out before the horde wrecks it</li><li>New heroes join as the story unfolds. If one falls, they are gone for the rest of the run</li><li>Hold for 5 waves to secure the Outskirts</li><li>Spend stat points between waves. Best played with your phone sideways</li></ul>
    <h3>Sound</h3>
    <div class="btns"><button class="btn ghost" data-act="mus">Music: ${SND.pref.music?'On':'Off'}</button><button class="btn ghost" data-act="sfx">Sound effects: ${SND.pref.sfx?'On':'Off'}</button></div>
    <h3>Story</h3>
    <div class="btns"><button class="btn ghost" data-act="intro">Watch the intro</button><button class="btn ghost" data-act="intro2">Watch Stage 1 ending</button>${(save.cleared||0)>=2?'<button class="btn ghost" data-act="intro3">Watch Rook arrives</button><button class="btn ghost" data-act="intro4">'+(save.route?'Watch the fork in the road':'Choose the road')+'</button>':''}</div>
    <div class="btns"><button class="btn ghost" data-act="gallery">Cutscene gallery</button></div>
    <h3>Progress</h3>
    <div class="btns"><button class="btn ghost" data-act="reset">Reset progress</button></div>
    <button class="btn ghost" data-act="menu">Back</button>`;
  }else if(state==='gallery'){
    const G=(k,t)=>`<button class="btn ghost" data-act="gal" data-k="${k}">${t}</button>`;
    const SEC=(k,title,note,btns)=>`<h3>${title}</h3>`+(cutIsSeen(k)?(note?`<p class="sub">${note}</p>`:'')+`<div class="btns">${btns}</div>`:`<p class="sub">Not seen yet.</p>`);
    html=`<h2>Cutscene gallery</h2><div class="stripe"></div>
    <p class="sub">Every cutscene you've seen, and every version of it. Watching here never changes your save.</p>
    ${SEC('intro','Opening','',G('intro','The intro'))}
    ${SEC('s1','Stage 1 ending','',G('s1','Whole squad')+G('s1b','Bruno fallen'))}
    ${SEC('s2','Rook arrives','',G('s2','Whole squad')+G('s2b','Bruno fallen'))}
    ${SEC('fork','The fork in the road','The first two pick a road at the choice.',G('f','Whole squad')+G('fr','Rook fallen')+G('fb','Bruno fallen')+G('fbr','Bruno and Rook fallen'))}
    ${SEC('fc1','The forest: something in the trees','Includes the Hex mini-game.',G('fc1','Whole squad')+G('fc1r','Rook fallen'))}
    ${SEC('fc2','The forest: screeches','',G('fc2','Screeches'))}
    ${SEC('fc3','The forest: Momma','',G('fc3','Momma'))}
    ${SEC('fe','The forest ending','The mini-game is skipped here and its result plays.',G('fe','Hex gets them in')+G('fexr','Same, Rook fallen')+G('fel','The spell fizzles')+G('fexrl','Same, Rook fallen')+G('fen','Hex never joined')+G('fenr','Same, Rook fallen'))}
    ${SEC('te','The town ending','The mini-game is skipped here and its result plays.',G('tw','Blaze makes it')+G('twr','Same, Rook fallen')+G('twb','Same, Bruno fallen')+G('twbr','Same, both fallen')+G('tl','Blaze is overrun')+G('tlr','Same, Rook fallen')+G('tlb','Same, Bruno fallen')+G('tlbr','Same, both fallen'))}
    ${SEC('fao','Stage 4 (town route): Cyber Future','',G('4ao:bruno,blaze,rook','Whole squad')+G('4ao:blaze,rook','Bruno fallen')+G('4ao:bruno,rook','Blaze lost')+G('4ao:bruno,blaze','Rook fallen')+G('4ao:','Commander alone'))}
    ${SEC('fae','Stage 4 (town route): the roof','',G('4ae:volt,bruno,blaze,rook','Whole squad')+G('4ae:bruno,blaze,rook','Volt not freed')+G('4ae:volt,bruno,blaze','Rook fallen')+G('4ae:blaze,volt','Blaze and Volt')+G('4ae:blaze,rook','Blaze and Rook')+G('4ae:rook','Rook only')+G('4ae:blaze','Blaze only')+G('4ae:','Commander alone'))}
    ${SEC('s5i','Stage 5: over the wall','',G('5i','The zip line'))}
    ${SEC('s5r','Stage 5: the ritual','The mini-game is skipped here and its result plays.',G('5r:hexv:w','Volt saves Hex')+G('5r:hexv:l','Hex is turned anyway')+G('5r:hext:-','Hex turned (no Volt)')+G('5r:mom:w','Volt fries the pool')+G('5r:mom:l','Momma rises'))}
    ${SEC('s5p','Stage 5: the ranger station','',G('5p:1','Bruno shoots the lock')+G('5p:0','No Bruno'))}
    ${SEC('s5e','Stage 5: the jeep','',G('5e','Out of the garage'))}
    ${SEC('s6i','Stage 6: wheels','',G('6i','Leaving the station'))}
    ${SEC('s6e','Stage 6: the lobby','',G('6e','Through the glass'))}
    ${SEC('vf','Stage 4 (forest route): Volt','',G('4bv','Volt behind the door'))}
    ${SEC('cfe','Stage 4 (forest route): the barricade','',G('4bs','Made it in time')+G('4bl','Too late'))}
    <button class="btn ghost" data-act="options">Back</button>`;
  }else if(state==='credits'){
    html=`<h2>Credits</h2><div class="stripe"></div>
    <div class="credits"><b>HOLDOUT SQUAD: THE ZOMBIE CHRONICLES</b></div>
    <div class="credits"><b>CREATED BY</b><span>Andrew</span></div>
    <div class="credits"><b>GAME DESIGN &amp; ART DIRECTION</b><span>Andrew</span></div>
    <div class="credits"><b>PROGRAMMING</b><span>Built with Claude</span></div>
    <button class="btn ghost" data-act="menu">Back</button>`;
  }else if(state==='bye'){
    html=`<h1 class="title" style="margin-top:10vh">SEE YOU ON<span>THE WALL</span></h1><div class="stripe"></div>
    <p class="sub">The squad holds until you get back, Commander. Close this tab or swipe the app away to leave.</p>
    <button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button>`;
  }else if(state==='inter'){
    html=`<div class="row"><h2>Wave ${R.wave} held</h2><span class="big"><small style="font-size:.55em;opacity:.7">SCORE </small>${save.gold.toLocaleString()}</span></div><div class="stripe"></div>${rosterHTML()}
    <div class="btns"><button class="btn" data-act="next">Next wave</button></div>`;
  }else if(state==='roster'){
    html=`<div class="row"><h2>Squad</h2><span class="big"><small style="font-size:.55em;opacity:.7">SCORE </small>${save.gold.toLocaleString()}</span></div><div class="stripe"></div>${rosterHTML()}<div class="btns"><button class="btn ghost" data-act="rosterback">Back</button></div>`;
  }else if(state==='pause'){
    html=`<h2 style="margin-top:6vh">Paused</h2><div class="btns"><button class="btn" data-act="resume">Resume</button><button class="btn ghost" data-act="quit">Quit to menu</button></div>`;
  }else if(state==='over'){
    html=`<h1 class="title" style="color:var(--blood)">OVERRUN</h1><div class="stripe"></div>
    ${R&&(R.cfa||R.s5||R.s6)?'':`<div class="row"><span class="sub">Reached wave</span><span class="big">${R.wave}</span></div>`}
    <p class="sub">${R&&R.s6Lost?'The jeep was destroyed.':R&&R.s5Swarm?'The horde swarmed the jeep before the key was found.':R&&R.s5NoOne?'No one was left to find the key.':R&&R.s5?'The Commander fell in the forest.':R&&R.sciFail?'Ten scientists were turned. There is no one left to save inside Cyber Future.':R&&R.cfb||R&&R.cfa?'The Commander fell inside Cyber Future.':R&&R.hexFail?'The spell fizzled at the walls of Cyber Future. The horde closed in.':R&&R.hexDied?'Hex fell. She has to survive the forest. Without her there is no way into Cyber Future.':R&&R.lostAll?(R.forest?'Every survivor is gone. The forest took them one by one.':'Every survivor is gone. The town swallowed them one by one.'):R&&R.forest?'The Commander fell in the forest.':R&&R.stage===3?'The Commander fell in the empty town.':'The Commander fell and the Outskirts are lost. Try again to retake the wall from wave 1.'}</p>
    <div class="btns"><button class="btn" data-act="${R&&R.s6?'s6retry':R&&R.s5?'s5retry':R&&R.cfa?'cfaretry':R&&R.cfb?'cfbretry':R&&R.hexFail?'fend':R&&R.forest?'stage3f':R&&R.stage===3?'stage3':R&&R.stage===2?'stage2':'retry'}">Try again</button><button class="btn ghost" data-act="menu">Menu</button></div>`;
  }else if(state==='win'){
    const alive=['cmd',...save.active].length,lost=save.fallen.length;
    html=`<h1 class="title">STAGE 1<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">The Outskirts base has fallen, but the convoy got out. The squad holds the road as the trucks head into the night.</p>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${alive}</span></div>
    ${lost?`<div class="row"><span class="sub">Fallen</span><span class="big" style="color:var(--blood)">${save.fallen.map(h=>HEROES[h].name).join(', ')}</span></div>`:''}
    <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
    <div class="btns"><button class="btn" data-act="stage2">Continue to Stage 2</button><button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button></div>`;
  }else if(state==='stat'){
    html=statHTML(statId);
  }else if(state==='win2'){
    html=`<h1 class="title">STAGE 2<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">The Ward went down in the road behind them. The convoy floors it into the night, with ${['cmd',...save.active].length===1?'the Commander alone':['cmd',...save.active].length+' fighters'} on the roof of the last truck.</p>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${['cmd',...save.active].length}</span></div>
    <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
    ${save.route?`<p class="sub">${save.route==='highway'?'The convoy stayed on the highway together.':(save.heroes.bruno?'The convoy took the backroad into the forest. Bruno went on alone toward Cyber Future.':'The convoy took the backroad into the forest.')}</p>`:''}
    <div class="btns"><button class="btn" data-act="${save.route==='highway'?'stage3':'stage3f'}">Continue to Stage 3</button><button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="stage2">Play Stage 2 again</button></div>`;
  }else if(state==='win4b'){const sv=!save.bbLost;
    html=`<h1 class="title">STAGE 4<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">${sv?'Bruno and Blaze made it. The squad is whole again, for now.':'The squad reached the third floor too late for Bruno and Blaze.'}${save.voltMet==='joined'?' Volt crackles at the back of the group.':''}</p>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${['cmd',...save.active].length}</span></div>
    <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
    <div class="btns"><button class="btn" data-act="s5">On to Stage 5</button><button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="cfb">Play Stage 4 again</button></div>`;
  }else if(state==='seat6'){html=s6SeatHTML();
  }else if(state==='win6'){html=s6WinHTML();
  }else if(state==='pick5s'){html=s5SquadHTML();
  }else if(state==='pick5'){html=s5PickHTML();
  }else if(state==='guard5'){html=s5GuardHTML();
  }else if(state==='win5'){html=s5WinHTML();
  }else if(state==='pick4a'){html=cfaPickHTML();
  }else if(state==='win4a'){html=cfaWinHTML();
  }else if(state==='win3f'){
    const hx=!!save.heroes.hex;
    html=`<h1 class="title">STAGE 3<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">Momma fell, and the forest finally went quiet. ${hx?'Hex walks with the squad now, whether she likes it or not.':'Whoever moved the survivors never showed their face again.'}</p>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${['cmd',...save.active].length}</span></div>
    <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
    <div class="btns"><button class="btn" data-act="cfb">On to Cyber Future</button><button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="stage3f">Play Stage 3 again</button></div>`;
  }else if(state==='win3'){
    const alive=['cmd',...save.active].length;
    html=`<h1 class="title">STAGE 3<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">The horde broke against the squad in the middle of main street. ${(save.townSaved||0)===CIV_N?'Every survivor made it through the town.':(save.townSaved||0)+' of '+CIV_N+' survivors made it through the town.'}</p>
    ${save.blaze==='joined'?'<p class="sub"><b>Blaze</b> torched the swarm and walked through the gates of Cyber Future with the squad.</p>':save.blaze==='lost'?'<p class="sub">Blaze was overrun in the street.'+(save.blazeBruno?' Bruno went in after her.':'')+'</p>':''}
    <div class="row"><span class="sub">Survivors saved</span><span class="big">${(save.townSaved||0)} / ${CIV_N}</span></div>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${alive}</span></div>
    <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
    <div class="btns"><button class="btn" data-act="cfa">On to Cyber Future</button><button class="btn ghost" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="stage3">Play Stage 3 again</button></div>`;
  }
  if(state!=='play'){ov.innerHTML='<div class="wrap">'+html+'</div>';drawPortraits();}
  if(R)hudUpdate();
}
ov.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;SND.init();SND.click();
  if(a==='mus'||a==='sfx'){SND.toggle(a==='mus'?'music':'sfx');ui();return;}
  if(a==='modes'){state='modes';ui();return;}
  if(a==='pickmode'){freshSave();save.mode=b.dataset.mode;legacyStart(save.mode);persist();SX=0;camX=0;startIntro(()=>{newRun(1);});return;}
  if(a==='revive'){const id=b.dataset.id,c=reviveCost(id),rec=save.downed&&save.downed[id];if(rec&&save.gold>=c){story('hero_revived',{hero:id,cost:c});save.gold-=c;save.heroes[id]={lv:rec.lv,xp:rec.xp};setHp(id,maxHp(id)*.5);delete save.downed[id];save.fallen=save.fallen.filter(h=>h!==id);if(save.active.length<MAX_ACTIVE)save.active.push(id);persist();SND.freed();ui();}return;}
  if(a==='start'){const w=+b.dataset.w;const go=()=>{SX=0;camX=0;newRun(w);};if(w===1){freshSave();startIntro(go);}else go();}
  else if(a==='begin'){state='menu';ui();return;}
  else if(a==='continue'){resumeCkpt();}
  else if(a==='retry'){freshSave();legacyStart(save.mode||'normal');SX=0;camX=0;newRun(1);}
  else if(a==='lr'){LSEL.route=b.dataset.r;const y=ov.scrollTop;ui();ov.scrollTop=y;return;}
  else if(a==='lb'){LSEL.k=b.dataset.k;const bb=BOARDS.find(x=>x.k===LSEL.k);LSEL.w=bb?bb.waves[0]:1;const y=ov.scrollTop;ui();ov.scrollTop=y;return;}
  else if(a==='lw'){const v=b.dataset.w;LSEL.w=isNaN(+v)?v:+v;const y=ov.scrollTop;ui();ov.scrollTop=y;return;}
  else if(a==='lh'){LSEL.h[b.dataset.id]=!LSEL.h[b.dataset.id];const y=ov.scrollTop;ui();ov.scrollTop=y;return;}
  else if(a==='lgo'){loadGo();return;}
  else if(a==='s6retry'){const at=R.s6at,hp=R.s6ckHp;SX=0;camX=0;R=null;s6Start(at,1);R.s6hp=hp;return;}
  else if(a==='s6'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:'6'});}SX=0;camX=0;s6Start('start');return;}
  else if(['s6seat','s6hero','s6auto','s6go'].includes(a)){s6SeatAct(a,b);return;}
  else if(a==='s5retry'){const at=save.reach&&R&&R.s5ph?(R.s5ph==='w1'?'w1':R.s5ph==='post'?'post':'rit'):'w1';SX=0;camX=0;R=null;s5Start(at,1);return;}
  else if(a==='s5'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:'5'});}SX=0;camX=0;s5Start('w1');return;}
  else if(a==='p5'||a==='p5go'||a==='g5'){s5PickAct(a,b);return;}
  else if(a==='p5s'||a==='p5sgo'){s5SquadAct(a,b);return;}
  else if(a==='cfaretry'){const at=R.cfaAt,tn=R.cfaTurned0;SX=0;camX=0;R=null;cfaStart(at,tn,1);return;}
  else if(a==='cfa'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:'4a'});}SX=0;camX=0;cfaStart('f1');return;}
  else if(a==='p4'||a==='p4go'){cfaPickAct(a,b);return;}
  else if(a==='cfbretry'){const at=R.cfbAt,cl=R.cfbClock;SX=0;camX=0;cfbStart(at,cl);return;}
  else if(a==='cfb'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:'4b'});}SX=0;camX=0;cfbStart(1);return;}
  else if(a==='fend'){R.over=false;R.hexFail=0;startForestEnd();return;}
  else if(a==='stage3f'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:3,route:'backroad'});}SX=0;camX=0;startForest();}
  else if(a==='stage3'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:3});}SX=0;camX=0;startStage3();}
  else if(a==='stage2'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:2});}SX=0;camX=0;startStage2();}
  else if(a==='gallery'){state='gallery';ui();return;}
  else if(a==='gal'){const k=b.dataset.k,back=()=>{CREW_VIEW=null;FA_VIEW=null;state='gallery';ui();};
    if(k.startsWith('4a')){FA_VIEW=k.split(':')[1].split(',').filter(Boolean);const L=k[2]==='o'?faOpenList():faEndList();cineLoad(L);startIntro(back,L);return;}
    if(k[0]==='6'){const L=k==='6i'?s6IntroList():s6EndView();cineLoad(L);startIntro(back,L);return;}
    if(k[0]==='5'){const p=k.split(':');let L;S5_VIEW={bruno:p[1]!=='0',volt:p[1]!=='hext',hex:p[0]!=='5r'||p[1]==='mom',town:p[1]!=='mom'};S5_VIEW.squad=S5_SQUAD.filter(id=>S5_VIEW[id]!==false);
      if(p[0]==='5i')L=s5IntroList();else if(p[0]==='5p')L=s5PostList();else if(p[0]==='5e')L=s5KeysList().concat(s5EndList());
      else{if(p[1]==='hext')S5_VIEW.volt=false;L=s5RitualList(p[1]);if(p[2]==='w')L=L.concat(s5WinList(p[1]));if(p[2]==='l')L=L.concat(s5LoseList(p[1]));}
      L=L.map(s=>s.mini?Object.assign({},s,{choiceAt:null,mini:null}):s);
      cineLoad(L);startIntro(()=>{S5_VIEW=null;back();},L);return;}
    if(k==='4bv'){cineLoad(VF);startIntro(back,VF);return;}
    if(k==='4bs'||k==='4bl'){const L=cfbEndShots(k==='4bs');cineLoad(L);startIntro(back,L);return;}
    CREW_VIEW={bruno:!/b/.test(k.slice(1)),rook:!/r/.test(k.slice(1))};
    if(k.startsWith('fe'))forestEndGallery(k,back);else if(k.startsWith('fc'))startForestCut(+k[2],back,false);else if(k[0]==='t')townEndGallery(k[1]==='w',back);else if(k==='intro')startIntro(back);else if(k[0]==='s'&&k[1]==='1')startIntro(back,SHOTS2);else if(k[0]==='s')startIntro(back,SHOTS3);else startFork(back,false);return;}
  else if(a==='intro4'){const rec=!save.route;startFork(()=>{state='options';ui();},rec);}
  else if(a==='intro3'){startIntro(()=>{state='options';ui();},SHOTS3);}
  else if(a==='intro2'){startIntro(()=>{state='options';ui();},SHOTS2);}
  else if(a==='intro'){startIntro(()=>{state='options';ui();});}
  else if(a==='next'){if(R.forest)forestNext();else if(R.stage===3)startWave3(R.wave+1);else startWave_(R.wave+1);}
  else if(a==='resume'){state=R&&R.s6&&R.s6.on?'drive':R&&R.side&&R.side.on?'side':'play';ui();last=performance.now();}
  else if(a==='quit'||a==='menu'){R=null;state='menu';ui();}
  else if(a==='roster'){rosterBack=state==='menu'?'menu':state;if(state==='menu')R=null;state='roster';ui();ov.scrollTop=0;}
  else if(a==='rosterback'){state=rosterBack||'menu';ui();}
  else if(a==='load'||a==='options'||a==='credits'||a==='bye'){state=a;ui();}
  else if(a==='reset'){if(b.dataset.armed){save={heroes:{},weapons:['pistol'],equip:'pistol',gold:0,best:0,cmd:1,active:[],fallen:[]};persist();ui();}else{b.dataset.armed='1';b.textContent='Tap again to erase everything';}}
  else if(a==='eq'){save.equip=b.dataset.id;persist();ui();}
  
  else if(a==='stat'){statId=b.dataset.id;statBack=state;state='stat';ui();ov.scrollTop=0;}
  else if(a==='pt'){const id=b.dataset.id,k=b.dataset.k,p=pts(id);if(ptsFree(id)>0&&(k==='sup'?(!p.sup&&lvOf(id)>=25):p[k]<STAT_CAP)){const hpOld=k==='hp'?maxHp(id):0;p[k]++;if(k==='hp'&&(id==='cmd'||save.heroes[id]))setHp(id,getHp(id)+maxHp(id)-hpOld);SND.click();persist();const y=ov.scrollTop;ui();ov.scrollTop=y;}}
  else if(a==='respec'){const id=b.dataset.id,c=respecCost(id);if(save.gold>=c&&ptsUsed(id)){save.gold-=c;save.pts[id]={hp:0,dmg:0,rec:0,crit:0,sup:0};persist();const y=ov.scrollTop;ui();ov.scrollTop=y;}}
  else if(a==='statback'){state=statBack||'roster';ui();}
  else if(a==='bench'){save.active=save.active.filter(h=>h!==b.dataset.id);persist();ui();}
  else if(a==='deploy'){if(save.active.length<MAX_ACTIVE&&!save.active.includes(b.dataset.id))save.active.push(b.dataset.id);persist();ui();}
  
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();if(state==='play'||state==='side'||state==='drive'){state='pause';ui();}}});window.addEventListener('pagehide',()=>persist());

/* ---------- INTRO CUTSCENE: riso-print panels with partial animation ---------- */
const CINE_META={"gas": {"n": 6, "fw": 330.4, "fh": 248.49999999999997}, "crowd": {"n": 6, "fw": 237.99999999999997, "fh": 239.39999999999998}, "arm": {"n": 6, "fw": 209.4, "fh": 288.0}, "shadow": {"n": 6, "fw": 268, "fh": 102.0}, "wave": {"n": 4, "fw": 411, "fh": 117.0}, "lift": {"n": 4, "fw": 402.0, "fh": 492.0}, "bike": {"n": 4, "fw": 332.0, "fh": 300.8}, "leap": {"n": 4, "fw": 247.20000000000002, "fh": 326.40000000000003}, "bikef": {"n": 4, "fw": 350.40000000000003, "fh": 324.0}, "c3horde": {"n": 8, "fw": 320.4, "fh": 175.79999999999998}, "c3truck": {"n": 8, "fw": 137.5, "fh": 128.0}, "c3smoke": {"n": 8, "fw": 164.4, "fh": 103.2}, "c3peek": {"n": 8, "fw": 164.4, "fh": 121.8}, "c3beam": {"n": 8, "fw": 191.79999999999998, "fh": 72.8}, "c3fog": {"n": 8, "fw": 411.20000000000005, "fh": 192.8}, "c3spark": {"n": 8, "fw": 306.0, "fh": 162.0}, "c3fire": {"n": 8, "fw": 175.5, "fh": 210.6}, "c3ember": {"n": 8, "fw": 156.0, "fh": 160.0}, "c3flash": {"n": 8, "fw": 175.5, "fh": 176.4}, "c4ring": {"n": 4, "fw": 389.75, "fh": 140}, "c4spark": {"n": 4, "fw": 389.75, "fh": 210}, "c4fog": {"n": 4, "fw": 389.75, "fh": 140}, "c4burst": {"n": 4, "fw": 389.75, "fh": 255}};
const CINE_SRC={"s1": "assets/cine/s1.webp?v=243c333768", "s2": "assets/cine/s2.webp?v=550e74da9a", "s3": "assets/cine/s3.webp?v=70cc779e19", "s4": "assets/cine/s4.webp?v=a7032a396c", "s5": "assets/cine/s5.webp?v=d9c16aae06", "s6": "assets/cine/s6.webp?v=7be0ebed55", "s7": "assets/cine/s7.webp?v=fc9f6ba24a", "s8": "assets/cine/s8.webp?v=1621073ea0", "gas": "assets/cine/gas.webp?v=315d27fe85", "crowd": "assets/cine/crowd.webp?v=63ce1e7073", "arm": "assets/cine/arm.webp?v=6bf76ce38f", "shadow": "assets/cine/shadow.webp?v=d6f37fc102", "wave": "assets/cine/wave.webp?v=23e8a4a53d", "w1": "assets/cine/w1.webp?v=c8f04b9c22", "w2": "assets/cine/w2.webp?v=0ed40fe71c", "w3": "assets/cine/w3.webp?v=70c8685020", "w4": "assets/cine/w4.webp?v=dbcff62397", "w5": "assets/cine/w5.webp?v=b5b30b1db7", "w6": "assets/cine/w6.webp?v=af200e06c2", "w7": "assets/cine/w7.webp?v=3950081f16", "w8": "assets/cine/w8.webp?v=f8d626832c", "lift": "assets/cine/lift.webp?v=370ce17c98", "r1": "assets/cine/r1.webp?v=3e4ef51c5c", "r2": "assets/cine/r2.webp?v=897e15e59c", "r3": "assets/cine/r3.webp?v=8a0a030f90", "r4": "assets/cine/r4.webp?v=a3521f3cb0", "r5": "assets/cine/r5.webp?v=97fb173298", "r6": "assets/cine/r6.webp?v=3ac4fdbb0d", "bike": "assets/cine/bike.webp?v=c67a4ad3e0", "leap": "assets/cine/leap.webp?v=970a293fe8", "bikef": "assets/cine/bikef.webp?v=ee94861b81", "b1": "assets/cine/b1.webp?v=ec2cd2723f", "b2": "assets/cine/b2.webp?v=01cf7f9c7b", "b6": "assets/cine/b6.webp?v=b63e26f414", "b7": "assets/cine/b7.webp?v=b6c3b43136", "b8": "assets/cine/b8.webp?v=f269e85dc3", "br1": "assets/cine/br1.webp?v=26cde8d39b", "x01": "assets/cine/x01.webp?v=57c1a8b59a", "x02": "assets/cine/x02.webp?v=278ed750fd", "xa3": "assets/cine/xa3.webp?v=63f1e488b3", "xa4": "assets/cine/xa4.webp?v=e283c3e464", "xa5": "assets/cine/xa5.webp?v=c231911ed0", "xa6": "assets/cine/xa6.webp?v=5d44e267c6", "xa7": "assets/cine/xa7.webp?v=d1a42b40c1", "xb3": "assets/cine/xb3.webp?v=759b78c0b1", "xb4": "assets/cine/xb4.webp?v=df36359644", "xb5": "assets/cine/xb5.webp?v=319fbf1c6f", "xb6": "assets/cine/xb6.webp?v=dc55f12004", "xb7": "assets/cine/xb7.webp?v=2603ef086d", "xb8": "assets/cine/xb8.webp?v=213337a3cb", "xv1": "assets/cine/xv1.webp?v=f0b1f7bc58", "xv2": "assets/cine/xv2.webp?v=f08c546b7d", "xv3": "assets/cine/xv3.webp?v=8dfbfd654f", "xv4": "assets/cine/xv4.webp?v=0519294f79", "xv5": "assets/cine/xv5.webp?v=2de26c5075", "xv6": "assets/cine/xv6.webp?v=8bdeb41aa8", "xv7": "assets/cine/xv7.webp?v=457158d6d8", "xf1": "assets/cine/xf1.webp?v=53c018c3db", "xf2": "assets/cine/xf2.webp?v=4ac30cc35b", "xf3": "assets/cine/xf3.webp?v=9db92f2352", "xf4": "assets/cine/xf4.webp?v=5b931210a4", "xf5": "assets/cine/xf5.webp?v=9d2c48c6dc", "xf6": "assets/cine/xf6.webp?v=5b89485ce3", "xw1": "assets/cine/xw1.webp?v=5768e46a45", "xw2": "assets/cine/xw2.webp?v=a02211f1a9", "xw3": "assets/cine/xw3.webp?v=e2a7715eca", "xl1": "assets/cine/xl1.webp?v=61a0c15c27", "xl2": "assets/cine/xl2.webp?v=26078fc2c4", "xrv1": "assets/cine/xrv1.webp?v=f284b5471c", "xrv2": "assets/cine/xrv2.webp?v=03d5736fe6", "xrv3": "assets/cine/xrv3.webp?v=5b2057f074", "xs1": "assets/cine/xs1.webp?v=bb79331e55", "xs2": "assets/cine/xs2.webp?v=f42fff5961", "xs2v": "assets/cine/xs2v.webp?v=17c61849a8", "xm1": "assets/cine/xm1.webp?v=9924e1689b", "c4ring": "assets/cine/c4ring.webp?v=4eac568207", "c4spark": "assets/cine/c4spark.webp?v=f398908cba", "c4fog": "assets/cine/c4fog.webp?v=1bac29ca7d", "c4burst": "assets/cine/c4burst.webp?v=c29024db4d", "c3horde": "assets/cine/c3horde.webp?v=51a1bcd882", "c3truck": "assets/cine/c3truck.webp?v=c3d079edb1", "c3smoke": "assets/cine/c3smoke.webp?v=104b4fcda5", "c3peek": "assets/cine/c3peek.webp?v=f5ee9d072a", "c3beam": "assets/cine/c3beam.webp?v=cf0d9e068c", "c3fog": "assets/cine/c3fog.webp?v=e27d3109d8", "c3spark": "assets/cine/c3spark.webp?v=8ec95a2788", "c3ember": "assets/cine/c3ember.webp?v=386f756069", "c3flash": "assets/cine/c3flash.webp?v=d9e65b2ea5", "vf_1": "assets/cine/vf_1.webp?v=ea41c3831b", "vf_2": "assets/cine/vf_2.webp?v=f3238d890d", "cfe_1": "assets/cine/cfe_1.webp?v=c23598f97d", "cfe_2": "assets/cine/cfe_2.webp?v=c588f8e618", "cfe_3": "assets/cine/cfe_3.webp?v=818bef84fc", "fa_o1": "assets/cine/fa_o1.webp?v=8a6421824d", "s5_i1": "assets/cine/s5_i1.webp?v=c1530b62ba", "s5_i2_all": "assets/cine/s5_i2_all.webp?v=c70cf3dd7d", "s5_i2_nv": "assets/cine/s5_i2_nv.webp?v=20c7110b00", "s5_i2_c": "assets/cine/s5_i2_c.webp?v=3dd3cea9b9", "s5_i3": "assets/cine/s5_i3.webp?v=2b44bf1bb9", "s5_i4_all": "assets/cine/s5_i4_all.webp?v=8d12393de4", "s5_i4_cbb": "assets/cine/s5_i4_cbb.webp?v=185b8f1242", "s5_i4_c": "assets/cine/s5_i4_c.webp?v=97fd1102ba", "s5_i5": "assets/cine/s5_i5.webp?v=87d5f76c8f", "s5_i6_all": "assets/cine/s5_i6_all.webp?v=51d53a0568", "s5_i6_r": "assets/cine/s5_i6_r.webp?v=ee86fe8e9b", "s5_i6_h": "assets/cine/s5_i6_h.webp?v=f5cc0c1e5f", "s5_i6_bb": "assets/cine/s5_i6_bb.webp?v=9faaafce4b", "s5_i6_b": "assets/cine/s5_i6_b.webp?v=f5a5109087", "s5_i6_c": "assets/cine/s5_i6_c.webp?v=501930d8e1", "s5_r1": "assets/cine/s5_r1.webp?v=2eb0245a05", "s5_r2": "assets/cine/s5_r2.webp?v=4d67efbcff", "s5_r3": "assets/cine/s5_r3.webp?v=9080fdc92e", "s5_h2": "assets/cine/s5_h2.webp?v=cd660508b0", "s5_v1": "assets/cine/s5_v1.webp?v=cee11150c2", "s5_v2": "assets/cine/s5_v2.webp?v=b6dbaa5598", "s5_w1": "assets/cine/s5_w1.webp?v=a58446eeeb", "s5_w2": "assets/cine/s5_w2.webp?v=e1b432e41f", "s5_w3": "assets/cine/s5_w3.webp?v=e285b9a4f9", "s5_w4": "assets/cine/s5_w4.webp?v=40c962405e", "s5_l2": "assets/cine/s5_l2.webp?v=5fc4b37a6a", "s5_p5_all": "assets/cine/s5_p5_all.webp?v=f39257db4c", "s5_p5_nv": "assets/cine/s5_p5_nv.webp?v=c12c32a989", "s5_p5_c": "assets/cine/s5_p5_c.webp?v=477f0e1625", "s5_p6": "assets/cine/s5_p6.webp?v=5a7dec1eb9", "s5_p2": "assets/cine/s5_p2.webp?v=525f20ff55", "s5_p7": "assets/cine/s5_p7.webp?v=3c5c6a258d", "s5_p8": "assets/cine/s5_p8.webp?v=0fb2fbaadd", "s5_p9": "assets/cine/s5_p9.webp?v=a96b1bbdf5", "s5_e0": "assets/cine/s5_e0.webp?v=9abdf1bcfc", "s5_e1": "assets/cine/s5_e1.webp?v=e912dcccd8", "s5_e2": "assets/cine/s5_e2.webp?v=ae0867e9d3", "s6_e0_blaze": "assets/cine/s6_e0_blaze.webp?v=5dc3306b8d", "s6_e0_rook": "assets/cine/s6_e0_rook.webp?v=30db9c8a72", "s6_e0_hex": "assets/cine/s6_e0_hex.webp?v=8cdab5c85d", "s6_e0_bruno": "assets/cine/s6_e0_bruno.webp?v=8d01a77af5", "s6_e0_volt": "assets/cine/s6_e0_volt.webp?v=e5d62bd1cd", "s6_e1_all_bruno": "assets/cine/s6_e1_all_bruno.webp?v=aed07432b4", "s6_e1_all_rook": "assets/cine/s6_e1_all_rook.webp?v=877c6a8901", "s6_e1_all_volt": "assets/cine/s6_e1_all_volt.webp?v=d6a864b5a4", "s6_e1_all_hex": "assets/cine/s6_e1_all_hex.webp?v=32e2a9ce7f", "s6_e1_all_blaze": "assets/cine/s6_e1_all_blaze.webp?v=3100dce3b7", "s6_e2_all_volt": "assets/cine/s6_e2_all_volt.webp?v=97e044f577", "s6_e2_all_blaze": "assets/cine/s6_e2_all_blaze.webp?v=2f6c18d6a8", "s6_e2_all_bruno": "assets/cine/s6_e2_all_bruno.webp?v=70eada57e4", "s6_e2_all_hex": "assets/cine/s6_e2_all_hex.webp?v=2ad198a073", "s6_i1": "assets/cine/s6_i1.webp?v=796b64e823", "s6_i2": "assets/cine/s6_i2.webp?v=82a3a2adde", "s6_i3": "assets/cine/s6_i3.webp?v=f5ab2909ef", "s6_e0": "assets/cine/s6_e0.webp?v=2e63806df7", "s6_e1_all": "assets/cine/s6_e1_all.webp?v=d67b6e7c35", "s6_e2": "assets/cine/s6_e2.webp?v=894d123673", "s6_e2_all": "assets/cine/s6_e2_all.webp?v=e145fda4e0", "s6_e3": "assets/cine/s6_e3.webp?v=1c51df6fd5", "s6_e3_all": "assets/cine/s6_e3_all.webp?v=5300815aaf", "fa_o1_br": "assets/cine/fa_o1_br.webp?v=37ebb90caf", "fa_o1_b": "assets/cine/fa_o1_b.webp?v=49067b53b2", "fa_o1_c": "assets/cine/fa_o1_c.webp?v=d12c251a27", "fa_o1_r": "assets/cine/fa_o1_r.webp?v=d29d274f59", "fa_o2": "assets/cine/fa_o2.webp?v=db89fe3998", "fa_o3": "assets/cine/fa_o3.webp?v=693bdddf63", "fa_o3b": "assets/cine/fa_o3b.webp?v=9eb34876bf", "fa_o4": "assets/cine/fa_o4.webp?v=57694ff55e", "fa_h_vbbr": "assets/cine/fa_h_vbbr.webp?v=60b70f9f7b", "fa_h_vbb": "assets/cine/fa_h_vbb.webp?v=9a70b164c6", "fa_h_r": "assets/cine/fa_h_r.webp?v=b0ffb1172b", "fa_h_b": "assets/cine/fa_h_b.webp?v=c648f372bd", "fa_h_bv": "assets/cine/fa_h_bv.webp?v=343a1b0cde", "fa_h_br": "assets/cine/fa_h_br.webp?v=7c0f07101b", "fa_h_bbr": "assets/cine/fa_h_bbr.webp?v=8cebd83f13", "fa_l_rook": "assets/cine/fa_l_rook.webp?v=c11ca82219", "fa_l_blaze": "assets/cine/fa_l_blaze.webp?v=ac303e4206", "fa_l_cmd": "assets/cine/fa_l_cmd.webp?v=c99355650f", "fa_roof": "assets/cine/fa_roof.webp?v=e32e2331b9", "fa_gate": "assets/cine/fa_gate.webp?v=624938a4d5", "fe_g1": "assets/cine/fe_g1.webp?v=fe0fbbe930", "fe_g2": "assets/cine/fe_g2.webp?v=9bc9371de9", "fe_g3": "assets/cine/fe_g3.webp?v=40f2869355", "fe_g4": "assets/cine/fe_g4.webp?v=bdf36722f2", "fe_g5": "assets/cine/fe_g5.webp?v=ef7f521978", "fe_g6": "assets/cine/fe_g6.webp?v=808d8f926c", "fe_g7": "assets/cine/fe_g7.webp?v=bdcb705c94", "fe_g8a": "assets/cine/fe_g8a.webp?v=761765d52c", "fe_g8b": "assets/cine/fe_g8b.webp?v=76e42e466a", "fe_g8c": "assets/cine/fe_g8c.webp?v=21a3e15754", "fe_g8d": "assets/cine/fe_g8d.webp?v=cc81d2e0ee", "fe_h1": "assets/cine/fe_h1.webp?v=73beca4a12", "fe_h2": "assets/cine/fe_h2.webp?v=8b7ff0a01b", "fe_h3": "assets/cine/fe_h3.webp?v=6305b20f31", "fe_w1a": "assets/cine/fe_w1a.webp?v=dd7349ffda", "fe_w1b": "assets/cine/fe_w1b.webp?v=8e85862c06", "fe_w1c": "assets/cine/fe_w1c.webp?v=ba2f531c3b", "fe_w1d": "assets/cine/fe_w1d.webp?v=3a94f8db5c", "fe_w2a": "assets/cine/fe_w2a.webp?v=aa1826e67f", "fe_w2b": "assets/cine/fe_w2b.webp?v=689e888fc6", "fe_w2c": "assets/cine/fe_w2c.webp?v=2de2a83355", "fe_w2d": "assets/cine/fe_w2d.webp?v=6a28284172", "fe_l1": "assets/cine/fe_l1.webp?v=4575ab6ef1", "fe_l2a": "assets/cine/fe_l2a.webp?v=1093ad83fc", "fe_l2b": "assets/cine/fe_l2b.webp?v=35bd80f539", "fe_n1c": "assets/cine/fe_n1c.webp?v=4658768862", "fe_n1d": "assets/cine/fe_n1d.webp?v=fa9ebcc55d", "fe_n2": "assets/cine/fe_n2.webp?v=0f687bda5c", "fe_n3c": "assets/cine/fe_n3c.webp?v=d4d05b60f8", "fe_n3d": "assets/cine/fe_n3d.webp?v=95e42af559", "fe_n4": "assets/cine/fe_n4.webp?v=31da651bcf", "te_t1": "assets/cine/te_t1.webp?v=584d2a9cfa", "te_t2a": "assets/cine/te_t2a.webp?v=fe492bd1ba", "te_t2b": "assets/cine/te_t2b.webp?v=8c05f539fc", "te_t2c": "assets/cine/te_t2c.webp?v=a11a51477b", "te_t2d": "assets/cine/te_t2d.webp?v=26beed7a3f", "te_t3": "assets/cine/te_t3.webp?v=817708c3de", "te_t4": "assets/cine/te_t4.webp?v=aa62671c0f", "te_t5a": "assets/cine/te_t5a.webp?v=5a6a434b7c", "te_t5b": "assets/cine/te_t5b.webp?v=67e35070ec", "te_t5c": "assets/cine/te_t5c.webp?v=d872d33a01", "te_t5d": "assets/cine/te_t5d.webp?v=566666704c", "te_t6": "assets/cine/te_t6.webp?v=c2e101c534", "te_t7": "assets/cine/te_t7.webp?v=9739b7ea64", "te_t8": "assets/cine/te_t8.webp?v=8713b55890", "te_w1": "assets/cine/te_w1.webp?v=753a7795e8", "te_w2a": "assets/cine/te_w2a.webp?v=54150808dc", "te_w2b": "assets/cine/te_w2b.webp?v=bef9b9aeb5", "te_w3": "assets/cine/te_w3.webp?v=cdb71249ca", "te_w4": "assets/cine/te_w4.webp?v=0f3149d82e", "te_w5": "assets/cine/te_w5.webp?v=63e3c99a0b", "te_l1": "assets/cine/te_l1.webp?v=8d2863cb46", "te_l2": "assets/cine/te_l2.webp?v=b3a97f8544", "te_l3": "assets/cine/te_l3.webp?v=3979192544", "te_l4a": "assets/cine/te_l4a.webp?v=b15dc704bb", "te_l4b": "assets/cine/te_l4b.webp?v=17f706673e", "te_e1": "assets/cine/te_e1.webp?v=5b8ed99e63", "te_e2": "assets/cine/te_e2.webp?v=81835e6d77"};
const CI={};const CINE_FILES=['s1','s2','s3','s4','s5','s6','s7','s8','gas','crowd','arm','shadow','wave','w1','w2','w3','w4','w5','w6','w7','w8','lift','r1','r2','r3','r4','r5','r6','bike','leap','bikef','b1','b2','b6','b7','b8','br1'];
const CINE_SHEETS=['gas','crowd','arm','shadow','wave','lift','bike','leap','bikef'];
function cineLoadKeys(keys){for(const k of keys){if(CI[k]||!CINE_SRC[k])continue;const im=new Image();im.decoding='async';im.src=CINE_SRC[k];CI[k]=im;}}
function cineLoad(list){if(!list){cineLoadKeys(CINE_SHEETS);return;}const ks=[];for(const s of list){ks.push(s.bg);if(s.bg2)ks.push(s.bg2);if(s.fb)ks.push(s.fb);if(typeof NOBRUNO!=='undefined'&&NOBRUNO[s.bg])ks.push(NOBRUNO[s.bg].bg);}cineLoadKeys(ks);}
const IW=1440,IH=810;
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
const lerp=(a,b,p)=>a+(b-a)*p;
const SHOTS=[
 {bg:'s1',d:7,vo:"2040. Biological weapons have spread beyond anyone's control.",cam:p=>({cx:.5,cy:lerp(.56,.5,p),z:lerp(1,1.12,p)}),
  fx(c,tt){for(const[u,v,w,st]of[[.53,.46,.11,1.2],[.47,.74,.1,2.4],[.78,.58,.08,3.4]]){const f=Math.min(5,Math.floor(Math.max(0,tt-st)*4));if(tt<st)continue;c.sheet('gas',f,u,v,w*(1+Math.min(1,(tt-st)/3)*.25),'mid');}}},
 {bg:'s2',d:8,vo:"A rogue group with no flag and no country called themselves humanity's saviors.",cam:p=>({cx:.5,cy:lerp(.66,.42,ease(p)),z:1.14}),
  fx(c,tt){c.flicker(tt,.32,2.2);}},
 {bg:'s3',d:8,vo:"They released their gas over the world's cities. It did not do what they promised.",cam:p=>({cx:lerp(.42,.56,ease(p)),cy:.5,z:1.1}),
  fx(c,tt){for(let k=0;k<5;k++){const st=.8+k*.9;if(tt<st)continue;const a=tt-st,q=Math.min(1,a/3.2);
    const u=lerp(.2,.32+k*.15,q),v=lerp(.22,.42+(k%2)*.12,q);c.sheet("gas",Math.min(5,Math.floor(a*3.2)),u,v,lerp(.07,.26,q),'mid',Math.min(1,a*2));}}},
 {bg:'s4',d:8,vo:"It did not cure the living. It woke the dead.",cam:p=>({cx:.5,cy:.56,z:lerp(1.04,1.14,p)}),
  fx(c,tt){for(const[u,v,w,st]of[[.13,.97,.08,1.4],[.62,.9,.07,2.6],[.86,1.0,.09,3.6],[.38,.86,.05,4.6]]){if(tt<st)continue;c.sheet('arm',Math.min(5,Math.floor((tt-st)*5)),u,v,w,'bottom');}
    c.rain(tt);}},
 {bg:'s5',d:8,vo:"The sick and the vulnerable did not die. They changed.",cam:p=>({cx:.52,cy:.5,z:lerp(1.04,1.1,p)}),
  fx(c,tt){const f=Math.min(5,Math.floor(Math.max(0,tt-1.5)*1.1));c.sheet('shadow',f,.6,.6,lerp(.12,.36,f/5),'bottom',.88);
    c.flicker(tt,.55,1.3);if(tt>6.6&&tt<7.1)c.shake=7;}},
 {bg:'s6',d:9,vo:"Mega City fell in a single night.",cam:p=>({cx:.5,cy:lerp(.5,.56,p),z:lerp(1,1.12,p)}),
  fx(c,tt){const f=Math.floor(tt*9)%6,q=Math.min(1,tt/8.5);
    c.sheet('crowd',(f+3)%6,.5,lerp(.74,.8,q),lerp(.08,.18,q),'bottom',Math.min(1,tt*1.5));
    c.sheet('crowd',f,.5,lerp(.8,1.12,q),lerp(.14,.52,q),'bottom',Math.min(1,tt*1.5));}},
 {bg:'s7',d:10,vo:"But outside the city, one light was still burning.",cam:p=>({cx:.55,cy:lerp(.52,.44,ease(p)),z:lerp(1,1.16,ease(p))}),
  fx(c,tt){c.glow(.585,.6,.12,.25+.12*Math.sin(tt*7)+.08*Math.sin(tt*17));
    const n=4,k=Math.floor(tt*4.5)%(2*n-2),f=k<n?k:2*n-2-k;c.sheet('wave',f,.587,.375,.25,'bottom',1,.84);}},
 {bg:'s8',d:9,vo:"Commander. Get them inside. Hold the wall until help arrives.",cam:p=>({cx:lerp(.55,.66,ease(p)),cy:lerp(.5,.42,ease(p)),z:lerp(1,1.14,ease(p))}),
  fx(c,tt){c.embers(tt);}},
];

const SHOTS2=[
 {bg:'w1',d:8,vo:"The Ward fell. For one night, the wall held.",cam:p=>({cx:.5,cy:lerp(.56,.44,ease(p)),z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){c.glow(.11,.06,.08,.25+.1*Math.sin(tt*5));c.glow(.91,.06,.08,.25+.1*Math.sin(tt*5+1));c.embers(tt);}},
 {bg:'w2',d:7,vo:"Bruno: \"Told you, boss. Nothing gets through this wall.\"",cam:p=>({cx:lerp(.42,.56,ease(p)),cy:.5,z:1.1}),
  fx(c,tt){c.glow(.13,.95,.16,.35+.15*Math.sin(tt*9)+.08*Math.sin(tt*23));c.embers(tt);}},
 {bg:'w3',d:8,vo:"Out in the road, something moved.",cam:p=>({cx:.52,cy:.5,z:lerp(1,1.16,p)}),snd:()=>SND.groan(0,.15),
  fx(c,tt){[[.41,.5,2.6],[.58,.45,3.6],[.36,.6,4.6]].forEach(([u,v,st])=>{if(tt>st){const a=Math.min(1,(tt-st)*3)*(.75+.25*Math.sin(tt*6+u*9));c.eye(u,v,a);}});
    if(tt>5.6&&tt<6.4)c.shake=6;}},
 {bg:'w4',d:7,vo:"The Ward was not finished.",cam:p=>({cx:.5,cy:lerp(.66,.42,ease(p)),z:1.12}),snd:()=>{SND.groan(0,.6);SND.groan(-.4,.4);},
  fx(c,tt){c.pulse('#b6f23a',.06+.05*Math.sin(tt*4));if(tt>5.4)c.shake=4;}},
 {bg:'w3',d:6,vo:"It tore a fuel tanker off the road and lifted it over its head.",cam:p=>({cx:.5,cy:.52,z:1.0}),
  fx(c,tt){c.dim(.55);const f=Math.min(3,Math.floor(tt/1.15));c.sheet('lift',f,.5,.98,.37,'bottom');if(f===3&&tt>4.6)c.shake=8;}},
 {bg:'w5',d:7,vo:"And hurled it at the front gate.",cam:p=>({cx:.5,cy:.48,z:lerp(1.18,1.05,ease(Math.min(1,p*3)))}),snd:()=>{SND.explosion(1);SND.wallBreak();},
  fx(c,tt){if(tt<.5)c.flash(1-tt/.5);if(tt<1.4)c.shake=12*(1-tt/1.4);c.debris(tt);}},
 {bg:'w6',d:9,vo:"Those caught in the blast did not stay down.",cam:p=>({cx:.5,cy:.55,z:lerp(1.02,1.14,p)}),snd:()=>SND.hiss(),
  fx(c,tt){for(let k=0;k<3;k++){const q=((tt*.06+k*.33)%1);c.sheet('gas',5,lerp(-.2,1.2,q),.62+.08*k,.42,'mid',.32);}c.embers(tt);}},
 {bg:'w7',d:7,vo:"Commander: \"Fall back! Get them to the trucks!\"",cam:p=>({cx:lerp(.42,.55,ease(p)),cy:.48,z:1.12}),
  fx(c,tt){if((tt%1.6)<.08)c.glow(.67,.2,.12,.8);if((tt%1.6)<.1)c.shake=4;c.embers(tt);}},
 {bg:'w8',d:9,vo:"The convoy rolled out. The squad would hold the road until the last truck was clear.",cam:p=>({cx:lerp(.5,.6,ease(p)),cy:.5,z:lerp(1.04,1.14,ease(p))}),
  fx(c,tt){if((tt%.9)<.06)c.glow(.04,.21,.08,.7);if(((tt+.45)%1.1)<.06)c.glow(.95,.6,.08,.7);c.embers(tt);}},
];

const SHOTS3=[
 {bg:'r1',d:6,vo:"The Ward was gaining on the convoy.",cam:p=>({cx:lerp(.45,.55,ease(p)),cy:.5,z:1.08}),snd:()=>SND.groan(0,.5),
  fx(c,tt){if((tt%.7)<.07)c.glow(.6,.06,.1,.8);if(((tt+.35)%.5)<.06)c.glow(.67,.72,.09,.8);c.embers(tt);}},
 {bg:'r2',d:7,vo:"Then a single headlight came tearing up the highway, passing truck after truck.",cam:p=>({cx:.5,cy:lerp(.5,.58,p),z:lerp(1,1.22,ease(p))}),snd:()=>SND.engineSet(true),
  fx(c,tt){const q=Math.min(1,tt/7),r=lerp(.012,.045,q*q),hide=(tt%1.7)>1.45||(tt>2.2&&tt<2.5)||(tt>4.6&&tt<4.85);
    if(!hide){const fl=.75+.25*Math.sin(tt*31)*Math.sin(tt*13);c.glow(.5,.625,r*2.6,.35*fl,'255,240,190');c.glow(.5,.625,r,.95*fl,'255,250,225');}
    c.rain(tt);}},
 {bg:'r3',d:7,vo:"Rook: \"Sorry I'm late. Traffic was murder.\"",cam:p=>({cx:lerp(.5,.52,p),cy:lerp(.52,.5,p),z:lerp(1.02,1.14,ease(p))}),snd:()=>{SND.engineSet(false);setTimeout(()=>SND.slash(.4),900);setTimeout(()=>SND.slash(-.3),3400);},
  fx(c,tt){const fl=.8+.2*Math.sin(tt*27);c.glow(.493,.585,.05,.55*fl,'200,255,90');
    const sl=d=>d>=0&&d<.35?1-d/.35:0,a=Math.max(sl(tt-.9),sl(tt-3.4));
    c.glow(.66,.45,.09,.35+.15*Math.sin(tt*9),'200,255,90');if(a>0){c.glow(.7,.45,.08,.55*a,'230,255,150');c.glow(.77,.45,.07,.7*a,'230,255,120');c.flash(.08*a);c.shake=3*a;}
    c.rain(tt);}},
 {bg:'r4',d:6,vo:"He hit a ramp of wreckage and launched into the air.",cam:p=>({cx:lerp(.44,.58,ease(p)),cy:.42,z:lerp(1.04,1.1,ease(p))}),
  snd:()=>{SND.engineSet(true);setTimeout(()=>SND.engineSet(false),1400);[1.2,1.5,1.8,2.6,2.9,3.2,4,4.3].forEach((t,k)=>setTimeout(()=>SND.shot(k%2?'shotgun':'rifle',k%2?.2:.5),t*1000));setTimeout(()=>SND.groan(.6,.6),3600);},
  fx(c,tt){const mz=(t0,per)=>((tt-t0)%per+per)%per<.07&&tt>t0;
    if(mz(1.2,.3))c.glow(.6,.377,.05,.95,'255,210,120');if(mz(1.35,.3))c.glow(.773,.468,.05,.95,'255,210,120');
    c.glow(.212,.781,.04,.6+.2*Math.sin(tt*23),'255,220,150');c.glow(.06,.19,.05,.3+.2*Math.sin(tt*11),'210,255,110');
    c.glow(.752,.19,.025,.5+.3*Math.sin(tt*7),'220,255,90');c.glow(.832,.255,.02,.5+.3*Math.sin(tt*7+1),'220,255,90');
    if(tt<.25)c.shake=4*(1-tt/.25);c.rain(tt);}},
 {bg:'r6',d:6,vo:"The Ward did not take that well.",cam:p=>({cx:.5,cy:lerp(.5,.42,p),z:lerp(1.04,1.16,p)}),snd:()=>{SND.groan(0,.7);SND.groan(.3,.5);SND.groan(-.3,.5);},
  fx(c,tt){c.pulse('#ff2e63',.08+.07*Math.sin(tt*9));if(tt>.8)c.shake=5;}},
];

/* ---------- STORY VARIANTS: shots swapped when a hero has fallen ---------- */
const NOBRUNO={
  w1:{bg:'b1',fx(c,tt){c.glow(.12,.08,.08,.25+.1*Math.sin(tt*5));c.glow(.91,.08,.08,.25+.1*Math.sin(tt*5+1));c.embers(tt);}},
  w2:{bg:'b2',vo:"Medic: \"We held, Commander. We actually held.\""},
  w6:{bg:'b6',vo:"Those caught in the blast did not stay down. Bruno among them.",snd:()=>{SND.hiss();setTimeout(()=>SND.groan(0,.6),900);},
      fx(c,tt){c.eye(.585,.37,.6+.4*Math.sin(tt*5));c.eye(.625,.37,.6+.4*Math.sin(tt*5+.4));c.embers(tt);if(tt>1&&tt<1.4)c.shake=4;}},
  w7:{bg:'b7',fx(c,tt){c.embers(tt);}},
  w8:{bg:'b8',vo:"The convoy rolled out. The Commander would hold the road alone until the last truck was clear.",fx(c,tt){if((tt%.6)<.06)c.glow(.96,.6,.09,.8);c.embers(tt);}},
  r1:{bg:'br1',fx(c,tt){if((tt%.55)<.06)c.glow(.63,.72,.1,.8);c.embers(tt);}},
};
let CREW_VIEW=null;/* gallery override: {bruno,rook} */
function storyCut(list){const brunoGone=CREW_VIEW?!CREW_VIEW.bruno:!save.heroes.bruno;return list.map(s=>brunoGone&&NOBRUNO[s.bg]&&!(s.vo||'').startsWith('It tore')?Object.assign({},s,NOBRUNO[s.bg]):s);}

/* ---------- CUTSCENE 3: THE FORK IN THE ROAD (first major choice, after Stage 2) ---------- */
const RED='255,50,40',ACID='190,245,60';
const smokeDrift=(c,tt,v,a)=>{for(let k=0;k<2;k++){const q=((tt*.035+k*.5)%1);c.sheet('c3smoke',Math.floor(tt*2+k*3)%8,lerp(-.15,1.15,q),v+k*.05,.45,'mid',a*Math.sin(Math.PI*q));}};
const fogLow=(c,tt,v,a,w)=>{for(let k=0;k<2;k++){const q=((tt*.03+k*.5)%1);c.sheet('c3fog',Math.floor(tt*1.5+k*4)%8,lerp(-.2,1.2,q),v,w||.7,'bottom',a*Math.sin(Math.PI*q));}};
const blinkEyes=(c,tt,pts,sz)=>pts.forEach(([u,v,st],i)=>{if(tt<st)return;const ph=(tt*1.3+i*.37)%3,a=ph<.12?0:Math.min(1,(tt-st)*2)*(.6+.3*Math.sin(tt*4+i)),r=sz||.007;c.glow(u,v,r*2.4,a*.5,ACID);c.glow(u,v,r*.6,a,'240,255,200');c.glow(u+r*1.7,v,r*2.4,a*.5,ACID);c.glow(u+r*1.7,v,r*.6,a,'240,255,200');});
const FORK={
 x01:{bg:'x01',d:7,vo:"Dawn never came. The convoy rolled to a stop where the highway split.",cam:p=>({cx:.5,cy:lerp(.46,.36,ease(p)),z:lerp(1.02,1.16,ease(p))}),snd:()=>SND.engineSet(false),
  fx(c,tt){smokeDrift(c,tt,.48,.55);for(const[u,v]of[[.03,.93],[.13,.93],[.33,.75],[.39,.75]])c.glow(u,v,.035,.5+.25*Math.sin(tt*6+u*20),RED);c.dim(Math.min(.3,tt*.04));}},
 xv1:{bg:'xv1',d:7,vo:"Dawn never came. The convoy rolled to a stop where the highway split.",cam:p=>({cx:.5,cy:lerp(.46,.38,ease(p)),z:lerp(1.02,1.14,ease(p))}),snd:()=>SND.groan(-.6,.4),
  fx(c,tt){smokeDrift(c,tt,.5,.45);blinkEyes(c,tt,[[.1,.5,1],[.2,.53,1.6],[.28,.49,2.3],[.16,.6,3],[.34,.57,3.6],[.06,.64,4.2],[.24,.66,4.6]],.005);c.dim(Math.min(.3,tt*.04));}},
 x02:{bg:'x02',d:9,choiceAt:5.3,vo:"Commander: \"Highway's faster, but it's crawling. The backroad's clear, but we'd lose the light. Your call.\"",cam:p=>({cx:.48,cy:lerp(.5,.6,ease(p)),z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){c.glow(.42,.6,.14,.22+.06*Math.sin(Date.now()/160),ACID);}},
 xv4:{bg:'xv4',d:9,choiceAt:5.3,vo:"Commander: \"Highway's faster, but it's crawling. The backroad's clear, but we'd lose the light. Your call.\"",cam:p=>({cx:.45,cy:lerp(.5,.6,ease(p)),z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){c.glow(.2,.88,.14,.25+.06*Math.sin(Date.now()/160),ACID);}},
 xv2:{bg:'xv2',d:7,vo:"Commander: \"Highway's dead. We take the backroad.\"",cam:p=>({cx:.45,cy:lerp(.5,.6,ease(p)),z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){c.glow(.33,.62,.14,.22+.06*Math.sin(tt*9),ACID);}},
 xv3:{bg:'xv3',d:7,vo:"Commander: \"Highway's dead. We take the backroad.\"",cam:p=>({cx:.45,cy:lerp(.5,.6,ease(p)),z:lerp(1.02,1.12,ease(p))}),
  fx(c,tt){c.glow(.1,.86,.12,.25+.06*Math.sin(tt*9),ACID);}},
 xa3:{bg:'xa3',d:6,vo:"They stayed on the highway.",cam:p=>({cx:lerp(.48,.56,ease(p)),cy:.5,z:lerp(1.04,1.14,p)}),snd:()=>SND.engineSet(true),
  fx(c,tt){smokeDrift(c,tt,.3,.5);for(const[u,v]of[[.6,.86],[.92,.86],[.49,.6],[.55,.6]])c.glow(u,v,.03,.55+.25*Math.sin(tt*8+u*30),RED);
    c.sheet('c3peek',Math.floor(tt*5)%8,.09,1.04,.26,'bottom',Math.min(1,tt*.8));}},
 xa4:{bg:'xa4',d:8,vo:"The dead were waiting. They poured over the lead trucks by the hundreds.",cam:p=>({cx:.5,cy:.5,z:lerp(1.16,1.0,ease(p))}),snd:()=>{SND.engineSet(false);SND.groan(0,.8);SND.groan(-.5,.6);setTimeout(()=>SND.groan(.5,.7),1200);},
  fx(c,tt){const st=(tt*7)%1<.5;c.glow(.25,.41,.06,st?.8:.2,'255,230,140');c.glow(.4,.41,.06,st?.25:.8,'255,230,140');
    const q=Math.min(1,tt/7.5);c.sheet('c3horde',Math.min(7,Math.floor(q*8)),lerp(.3,.22,q),lerp(.92,1.12,q),lerp(.3,.62,q),'bottom',Math.min(1,tt*.7));
    c.shake=3+4*Math.sin(tt*3)**2;}},
 xa5:{bg:'xa5',d:6,vo:"Only the last trucks broke free, swerving off toward the nearest town.",cam:p=>({cx:lerp(.44,.6,ease(p)),cy:.52,z:1.12}),snd:()=>SND.engineSet(true),
  fx(c,tt){const f=Math.floor(tt*14)%8;for(let k=0;k<2;k++){c.sheet('c3spark',f,.8,.64,.22,'mid',1,1,'lighter');c.sheet('c3spark',(f+4)%8,.76,.6,.15,'mid',1,1,'lighter');}c.glow(.8,.64,.05,(f>2&&f<6)?.7:.25,'255,220,120');{const q=Math.max(0,Math.min(1,(tt-1.2)/4.6)),e=q*q;if(q>0){const u=lerp(.19,.06,e),v=lerp(.6,1.18,e),w=lerp(.06,.3,e);c.sheet('c3truck',Math.floor(tt*10)%8,u,v,w,'bottom',Math.min(1,q*6));const hv=v-w*.62;c.glow(u-w*.25,hv,w*.22,.55,'255,230,140');c.glow(u+w*.25,hv,w*.22,.55,'255,230,140');}}
    for(const[u,v]of[[.2,.54],[.27,.54],[.36,.6],[.43,.6]])c.glow(u,v,.04,.6+.2*Math.sin(tt*11+u*9),'255,230,140');if(tt<.6)c.shake=5;}},
 xa6:{bg:'xa6',d:7,vo:"Commander: \"Road's blocked. Everybody out. We go on foot from here.\"",cam:p=>({cx:lerp(.42,.5,ease(p)),cy:.5,z:1.1}),snd:()=>{SND.engineSet(false);},
  fx(c,tt){const a=Math.max(.15,1-tt/6);c.sheet('c3beam',Math.floor(tt*3)%8,.6,.6,.36,'mid',a*.8,1,'lighter');c.sheet('c3beam',Math.floor(tt*3+3)%8,.68,.6,.3,'mid',a*.6,1,'lighter');
    fogLow(c,tt,.72,.45,.5);}},
 xa7:{bg:'xa7',d:9,vo:"The town was empty. Too empty.",cam:p=>({cx:.52,cy:lerp(.52,.44,p),z:lerp(1.02,1.18,p)}),snd:()=>setTimeout(()=>SND.groan(.7,.35),5400),
  fx(c,tt){const on=!(((tt%2.3)>1.9&&(tt%2.3)<2.0)||((tt%2.3)>2.1&&(tt%2.3)<2.15));c.glow(.605,.08,.08,on?.55:.05);c.glow(.635,.31,.04,on?.4:.3);fogLow(c,tt,.56,.55,.5);
    if(tt>5.2&&tt<5.9){const q=(tt-5.2)/.7;c.sheet('shadow',3,lerp(.84,.93,q),.47,.05,'bottom',.75*Math.sin(Math.PI*q));}}},
 xv7:{bg:'xv7',d:9,vo:"The town was empty. Too empty.",cam:p=>({cx:.52,cy:lerp(.52,.44,p),z:lerp(1.02,1.18,p)}),snd:()=>setTimeout(()=>SND.groan(.7,.35),5400),
  fx(c,tt){const on=!(((tt%2.3)>1.9&&(tt%2.3)<2.0)||((tt%2.3)>2.1&&(tt%2.3)<2.15));c.glow(.59,.08,.08,on?.55:.05);fogLow(c,tt,.56,.55,.5);
    if(tt>5.2&&tt<5.9){const q=(tt-5.2)/.7;c.sheet('shadow',3,lerp(.84,.93,q),.47,.05,'bottom',.75*Math.sin(Math.PI*q));}}},
 xb3:{bg:'xb3',d:8,vo:"Bruno: \"Cyber Future is twelve miles up that road. My wife is in there. I'm not taking the long way.\"",cam:p=>({cx:lerp(.5,.42,ease(p)),cy:lerp(.5,.36,ease(p)),z:lerp(1.02,1.2,ease(p))}),snd:()=>SND.engineSet(false),
  fx(c,tt){c.glow(.6,.5,.07,.5+.2*Math.sin(tt*5),'255,230,140');c.glow(.645,.5,.07,.5+.2*Math.sin(tt*5+1),'255,230,140');}},
 xb4:{bg:'xb4',d:7,vo:"He took one truck and two volunteers. Everyone else moved to the others.",cam:p=>({cx:lerp(.44,.56,ease(p)),cy:.5,z:1.1}),snd:()=>{setTimeout(()=>SND.wallHit&&SND.wallHit(),3800);},
  fx(c,tt){for(const[u,v]of[[.02,.42],[.07,.43],[.33,.46],[.44,.46]])c.glow(u,v,.03,.5+.15*Math.sin(tt*7+u*13),'255,230,140');if(tt>3.8&&tt<4)c.shake=4;}},
 xb5:{bg:'xb5',d:8,vo:"Rook: \"Give her our best, big man.\" Commander: \"We'll see you there. Don't make me come find you.\"",cam:p=>({cx:.5,cy:.5,z:lerp(1.02,1.1,p)}),snd:()=>{SND.engineSet(true);setTimeout(()=>SND.engineSet(false),3000);},
  fx(c,tt){const q=Math.min(1,tt/7);c.glow(.73,.53,lerp(.05,.012,q),.8*(1-q*.7),RED);c.glow(.77,.53,lerp(.05,.012,q),.8*(1-q*.7),RED);}},
 xv5:{bg:'xv5',d:7,vo:"Commander: \"We'll see you there. Don't make me come find you.\"",cam:p=>({cx:.5,cy:.5,z:lerp(1.02,1.1,p)}),snd:()=>{SND.engineSet(true);setTimeout(()=>SND.engineSet(false),3000);},
  fx(c,tt){const q=Math.min(1,tt/6);c.glow(.727,.55,lerp(.04,.01,q),.8*(1-q*.7),RED);c.glow(.753,.55,lerp(.04,.01,q),.8*(1-q*.7),RED);}},
 xb6:{bg:'xb6',d:6,vo:"The rest of the convoy took the backroad, into the trees.",cam:p=>({cx:lerp(.5,.58,ease(p)),cy:.52,z:lerp(1.04,1.16,p)}),snd:()=>SND.engineSet(true),
  fx(c,tt){for(const[u,v]of[[.02,.6],[.27,.67],[.36,.67],[.5,.64],[.58,.6]])c.glow(u,v,.03,.55+.2*Math.sin(tt*8+u*17),RED);fogLow(c,tt,.62,.45,.4);c.dim(Math.min(.35,tt*.06));}},
 xb7:{bg:'xb7',d:7,vo:"Half a mile in, the road was gone.",cam:p=>({cx:.52,cy:lerp(.5,.45,p),z:lerp(1.04,1.12,p)}),snd:()=>{SND.engineSet(false);setTimeout(()=>SND.explosion(.6),4400);},
  fx(c,tt){c.sheet('c3ember',Math.floor(tt*8)%8,.62,.5,.22,'bottom',.7,1,'lighter');c.sheet('c3ember',Math.floor(tt*8+4)%8,.36,.52,.18,'bottom',.6,1,'lighter');
    c.glow(.55,.4,.25,.18+.1*Math.sin(tt*13)+.06*Math.sin(tt*29));if(tt>4.4&&tt<4.7)c.flash(.35*(1-(tt-4.4)/.3));if(tt>4.4&&tt<5.2)c.shake=9*(1-(tt-4.4)/.8);c.embers(tt);}},
 xb8:{bg:'xb8',d:9,vo:"Commander: \"Grab what you can carry. We walk through the forest.\"",cam:p=>({cx:lerp(.5,.56,ease(p)),cy:.5,z:lerp(1.02,1.14,p)}),snd:()=>setTimeout(()=>SND.groan(.8,.3),6200),
  fx(c,tt){c.beam('c3flash',Math.floor(tt*4)%8,.785,.51,.2,.2+.16*Math.sin(tt*1.4),.45);fogLow(c,tt,1.02,.55,.8);c.sheet('c3ember',Math.floor(tt*6)%8,.12,.4,.2,'bottom',.6);
    blinkEyes(c,tt,[[.94,.33,6.2]],.005);}},
 xv6:{bg:'xv6',d:9,vo:"Commander: \"Grab what you can carry. We walk through the forest.\"",cam:p=>({cx:lerp(.5,.56,ease(p)),cy:.5,z:lerp(1.02,1.14,p)}),snd:()=>setTimeout(()=>SND.groan(.8,.3),6200),
  fx(c,tt){c.beam('c3flash',Math.floor(tt*4)%8,.855,.47,.18,.25+.16*Math.sin(tt*1.4),.45);fogLow(c,tt,1.02,.55,.8);c.sheet('c3ember',Math.floor(tt*6)%8,.12,.38,.18,'bottom',.6);
    blinkEyes(c,tt,[[.42,.3,6.2]],.005);}},
};
const FORK_SHEETS=['c3horde','c3truck','c3smoke','c3peek','c3beam','c3fog','c3spark','c3ember','c3flash'];
const FORK_KEYS=Object.keys(FORK).concat(FORK_SHEETS);
function forkCrew(){return CREW_VIEW?{bruno:CREW_VIEW.bruno,rook:CREW_VIEW.rook}:{bruno:!!save.heroes.bruno,rook:!!save.heroes.rook};}
function forkBranch(route){const{rook}=forkCrew(),F=FORK;
  if(route==='highway')return[F.xa3,F.xa4,F.xa5,F.xa6,rook?F.xa7:F.xv7];
  return[F.xb3,F.xb4,rook?F.xb5:F.xv5,F.xb6,F.xb7,rook?F.xb8:F.xv6];}
function forkList(){const{bruno,rook}=forkCrew(),F=FORK;
  if(!bruno){const B=forkBranch('backroad');return[F.xv1,rook?F.xv2:F.xv3,B[3],B[4],B[5]];}
  return[F.x01,rook?F.x02:F.xv4];}
/* record=true on the real run: saves the pick and logs it to the story record */
function startFork(done,record){cutSeen(['fork']);cineLoadKeys(FORK_KEYS);const forced=!forkCrew().bruno;
  startIntro(()=>{const route=cine0pick||'backroad';cine0pick=null;
    if(record){const crew=forkCrew();save.route=route;story('choice',{id:'fork_road',pick:route,forced,crew});
      if(route==='backroad'&&crew.bruno){story('hero_split',{hero:'bruno',to:'cyber_future_lab'});brunoLeaves();}persist();}
    done&&done(route);},forkList());
  if(forced)cine0pick='backroad';}
let cine0pick=null;
function forkPick(route){if(!cine||cine0pick)return;cine0pick=route;SND.click();
  cine.list=cine.list.slice(0,cine.i+1).concat(forkBranch(route));const el=clayer.querySelector('.cchoice');if(el)el.remove();}
function forkShowChoice(){if(clayer.querySelector('.cchoice'))return;const d=document.createElement('div');d.className='cchoice';
  d.innerHTML='<button type="button" data-r="highway"><b>Stay on the highway</b></button><button type="button" data-r="backroad"><b>Take the backroad</b></button>';
  d.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();forkPick(b.dataset.r);});
  d.addEventListener('pointerdown',e=>e.stopPropagation());clayer.appendChild(d);}
let cine=null;
function cineCtl(W,H,s,cam){
  const m=(u,v)=>[W/2+(u-cam.cx)*IW*s,H/2+(v-cam.cy)*IH*s];
  return{shake:0,
    sheet(k,f,u,v,w,anchor,alpha,clip,op){const im=CI[k],M=CINE_META[k];if(!im||!im.complete||!im.naturalWidth)return;
      const fw=im.naturalWidth/M.n,fh=im.naturalHeight*(clip||1),dw=w*IW*s,dh=dw*fh/fw,[x,y]=m(u,v);
      cctx.globalAlpha=alpha==null?1:Math.max(0,Math.min(1,alpha));if(op)cctx.globalCompositeOperation=op;
      cctx.drawImage(im,(f%M.n)*fw,0,fw,fh,x-dw/2,anchor==='bottom'?y-dh:y-dh/2,dw,dh);cctx.globalAlpha=1;cctx.globalCompositeOperation='source-over';},
    beam(k,f,u,v,w,rot,alpha){const im=CI[k],M=CINE_META[k];if(!im||!im.complete||!im.naturalWidth)return;const fw=im.naturalWidth/M.n,fh=im.naturalHeight,dw=w*IW*s,dh=dw*fh/fw,[x,y]=m(u,v);
      cctx.save();cctx.translate(x,y);cctx.rotate(rot||0);cctx.globalAlpha=Math.max(0,Math.min(1,alpha==null?1:alpha));cctx.globalCompositeOperation='lighter';cctx.drawImage(im,(f%M.n)*fw,0,fw,fh,-dw*.04,-dh/2,dw,dh);cctx.restore();},
    flicker(tt,amt,every){const ph=(tt%every)/every;const off=(ph>.82&&ph<.86)||(ph>.9&&ph<.93)||Math.random()<.02;
      cctx.fillStyle='rgba(8,4,12,'+(off?amt+.35:amt*.25*(.5+.5*Math.sin(tt*9)))+')';cctx.fillRect(0,0,W,H);},
    glow(u,v,r,a,rgb){rgb=rgb||'255,140,60';const[x,y]=m(u,v),R=r*IW*s,g=cctx.createRadialGradient(x,y,0,x,y,R);g.addColorStop(0,'rgba('+rgb+','+Math.max(0,a)+')');g.addColorStop(1,'rgba('+rgb+',0)');
      cctx.globalCompositeOperation='lighter';cctx.fillStyle=g;cctx.fillRect(x-R,y-R,R*2,R*2);cctx.globalCompositeOperation='source-over';},
    rain(tt){cctx.strokeStyle='rgba(205,245,140,.28)';cctx.lineWidth=Math.max(1,W/700);cctx.beginPath();
      for(let i=0;i<90;i++){const sx=((i*137.5)%1)*W*1.2-W*.1,sp=(i%7)/7,y=((tt*(900+sp*500)+i*97)%(H+80))-40,x=sx+((tt*120+i*31)%40);cctx.moveTo(x,y);cctx.lineTo(x-H*.012,y+H*.05);}
      cctx.stroke();},
    portrait(id,u,v,h){const im=typeof POR!=='undefined'&&POR[id];if(!im||!im.complete)return;const[x,y]=m(u,v),S_=h*H;cctx.drawImage(im,x-S_/2,y-S_/2,S_,S_);cctx.strokeStyle='#0b080e';cctx.lineWidth=S_*.02;cctx.strokeRect(x-S_/2,y-S_/2,S_,S_);},
    atlas(fr,u,v,hFrac,alpha){if(!atlasReady)return;const r=RECTS[fr];if(!r)return;const[x,y]=m(u,v),sc=hFrac*IH*s/120;cctx.globalAlpha=alpha==null?1:alpha;cctx.drawImage(ATL,r[0],r[1],r[2],r[3],x-r[4]*sc,y-r[5]*sc,r[2]*sc,r[3]*sc);cctx.globalAlpha=1;},
    sheetR(k,f,u,v,w,rot,alpha){const im=CI[k],M=CINE_META[k];if(!im||!im.complete||!im.naturalWidth)return;const fw=im.naturalWidth/M.n,fh=im.naturalHeight,dw=w*IW*s,dh=dw*fh/fw,[x,y]=m(u,v);
      cctx.save();cctx.translate(x,y);cctx.rotate(rot||0);cctx.globalAlpha=alpha==null?1:alpha;cctx.drawImage(im,f*fw,0,fw,fh,-dw/2,-dh,dw,dh);cctx.restore();cctx.globalAlpha=1;},
    eye(u,v,a){const[x,y]=m(u,v),R=IW*s*.012;cctx.globalCompositeOperation='lighter';const g=cctx.createRadialGradient(x,y,0,x,y,R*4);g.addColorStop(0,'rgba(182,242,58,'+a+')');g.addColorStop(1,'rgba(182,242,58,0)');cctx.fillStyle=g;cctx.fillRect(x-R*4,y-R*4,R*8,R*8);cctx.globalCompositeOperation='source-over';cctx.fillStyle='rgba(240,255,200,'+a+')';cctx.beginPath();cctx.ellipse(x,y,R,R*.55,0,0,6.283);cctx.fill();},
    pulse(col,a){cctx.globalCompositeOperation='lighter';cctx.globalAlpha=Math.max(0,a);cctx.fillStyle=col;cctx.fillRect(0,0,W,H);cctx.globalAlpha=1;cctx.globalCompositeOperation='source-over';},
    dim(a){cctx.fillStyle='rgba(11,8,14,'+a+')';cctx.fillRect(0,0,W,H);},
    flash(a){cctx.fillStyle='rgba(255,240,200,'+Math.max(0,a)+')';cctx.fillRect(0,0,W,H);},
    debris(tt){if(tt>3)return;for(let i=0;i<26;i++){const ang=(i*2.39)%6.283,sp=.25+(i%5)*.12,q=tt*sp,u=.5+Math.cos(ang)*q*.7,v=.5+Math.sin(ang)*q*.5+q*q*.6;const[x,y]=m(u,v),sz=(4+(i%4)*4)*W/900*(1+tt);
      cctx.fillStyle=i%3?'#2a1a24':'#c9a46a';cctx.save();cctx.translate(x,y);cctx.rotate(tt*(3+i%4));cctx.fillRect(-sz,-sz*.6,sz*2,sz*1.2);cctx.restore();}},
    embers(tt){for(let i=0;i<46;i++){const q=((tt*.12+i*.0618)%1),x=W*(1.05-q*1.2+.18*Math.sin(i*1.7+tt)),y=H*(1.05-q*1.1)+Math.sin(i+tt*2)*12;
      cctx.fillStyle=i%3?'rgba(255,120,50,'+(1-q)+')':'rgba(255,200,90,'+(1-q)+')';const r=Math.max(1.5,(i%4+1)*W/900);cctx.fillRect(x,y,r,r);}},
  };
}
let cctx=null,clayer=null,ccv=null,GRAIN=null;
function cineEl(){
  if(clayer)return;
  clayer=document.createElement('div');clayer.id='intro';clayer.hidden=true;
  clayer.innerHTML='<canvas></canvas><button type="button" class="cskip">Skip</button>';
  stage.appendChild(clayer);ccv=clayer.querySelector('canvas');cctx=ccv.getContext('2d');
  /* Skip: tap = next shot, hold 2s = skip the whole cutscene. A choice or mini-game is never skipped past. */
  const sk=clayer.querySelector('.cskip');let skT=null,skRaf=0,skDone=false;
  const skipAll=()=>{if(!cine)return;if(!cine0pick){const j=cine.list.findIndex((q,k)=>k>=cine.i&&q.choiceAt!=null);if(j>=0){if(j!==cine.i){cine.i=j;cine.lc=0;cine.snd=0;SND.whoosh();}cine.tt=Math.max(cine.tt,cine.list[j].choiceAt);return;}}endIntro();};
  const skipOne=()=>{if(!cine)return;const sh=cine.list[cine.i];if(sh.choiceAt!=null&&!cine0pick){cine.tt=Math.max(cine.tt,sh.choiceAt);return;}if(cine.tt<sh.d-.6)cine.tt=sh.d-.6;};
  const skReset=()=>{skT=null;cancelAnimationFrame(skRaf);sk.style.setProperty('--hold','0%');};
  sk.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();skDone=false;skT=performance.now();try{sk.setPointerCapture(e.pointerId);}catch(_){}
    const tick=()=>{if(skT==null)return;const q=Math.min(1,(performance.now()-skT)/2000);sk.style.setProperty('--hold',(q*100)+'%');if(q>=1){skDone=true;skReset();skipAll();return;}skRaf=requestAnimationFrame(tick);};tick();});
  sk.addEventListener('pointerup',e=>{e.stopPropagation();const held=skT!=null;skReset();if(held&&!skDone)skipOne();});
  sk.addEventListener('pointercancel',skReset);sk.addEventListener('click',e=>e.stopPropagation());
  GRAIN=document.createElement('canvas');GRAIN.width=GRAIN.height=180;const g=GRAIN.getContext('2d'),id=g.createImageData(180,180);
  for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=Math.random()<.5?40:0;}g.putImageData(id,0,0);
}
function cutKeysOf(list){if(!list||list===SHOTS)return['intro'];if(list===SHOTS2)return['s1'];if(list===SHOTS3)return['s2'];const out=new Set();
  for(const s of list){const b=(s&&s.bg)||'';if(b.startsWith('te_'))out.add('te');else if(b.startsWith('fe_'))out.add('fe');else if(b.startsWith('vf_'))out.add('vf');else if(b.startsWith('cfe_'))out.add('cfe');else if(b.startsWith('fa_o'))out.add('fao');else if(b.startsWith('s5_i'))out.add('s5i');else if(/^s5_[rhvwl]/.test(b))out.add('s5r');else if(b.startsWith('s5_p'))out.add('s5p');else if(b.startsWith('s5_e'))out.add('s5e');else if(b.startsWith('s6_i'))out.add('s6i');else if(b.startsWith('s6_e'))out.add('s6e');else if(/^fa_(h|l|roof|gate)/.test(b))out.add('fae');}return[...out];}
function cutSeen(keys){save.seen=save.seen||{};let ch=0;for(const k of keys)if(!save.seen[k]){save.seen[k]=1;ch=1;}if(ch)persist();}
function cutIsSeen(k){const s=save.seen||{};if(s[k])return true;const c=save.cleared||0;
  if(k==='intro')return true;if(k==='s1')return c>=1;if(k==='s2')return c>=2;if(k==='fork')return !!save.route;return false;}
function startIntro(done,list){cutSeen(cutKeysOf(list));cineEl();cineLoad();cineLoad(list||SHOTS);cine={i:0,tt:0,done,last:performance.now(),list:storyCut(list||SHOTS)};state='intro';ui();clayer.hidden=false;requestAnimationFrame(cineFrame);}
function endIntro(){if(!cine)return;const d=cine.done;cine=null;clayer.hidden=true;const ch=clayer.querySelector('.cchoice');if(ch)ch.remove();const cm=clayer.querySelector('.cmini');if(cm)cm.remove();SND.engineSet(false);d&&d();}
function cineFrame(now){
  if(!cine)return;
  const dt=Math.min(.05,(now-cine.last)/1000);cine.last=now;cine.tt+=dt;
  const L=cine.list,sh=L[cine.i];if(sh.choiceAt!=null&&!cine0pick&&cine.tt>=sh.choiceAt){cine.tt=sh.choiceAt;sh.mini?miniShow():forkShowChoice();}if(cine.mg)miniTick(dt);if(!cine.snd){cine.snd=1;SND.whoosh();sh.snd&&sh.snd();}if(cine.tt>=sh.d){cine.i++;cine.tt=0;if(cine.i>=L.length){endIntro();return;}SND.whoosh();L[cine.i].snd&&L[cine.i].snd();const k=L===SHOTS?cine.i:-1;if(k===2)SND.hiss();if(k===3)SND.thunder();if(k===4)SND.buzz();if(k===5)SND.explosion(.4);}
  const S=cine.list[cine.i],r=clayer.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  if(ccv.width!==Math.round(r.width*dpr)||ccv.height!==Math.round(r.height*dpr)){ccv.width=Math.round(r.width*dpr);ccv.height=Math.round(r.height*dpr);}
  const W=ccv.width,H=ccv.height,tt=cine.tt,p=tt/S.d,cam=S.cam(p),s=Math.max(W/IW,H/IH)*cam.z;
  cctx.setTransform(1,0,0,1,0,0);cctx.fillStyle='#0b080e';cctx.fillRect(0,0,W,H);
  const c=cineCtl(W,H,s,cam);
  let im=CI[S.bg];if(!(im&&im.complete&&im.naturalWidth)&&S.fb)im=CI[S.fb];
  if(im&&im.complete&&im.naturalWidth){cctx.save();
    const prev=c.shake;
    cctx.drawImage(im,W/2-cam.cx*IW*s,H/2-cam.cy*IH*s,IW*s,IH*s);
    if(S.bg2){const i2=CI[S.bg2];if(i2&&i2.complete&&i2.naturalWidth){cctx.globalAlpha=Math.max(0,Math.min(1,S.mix()));cctx.drawImage(i2,W/2-cam.cx*IW*s,H/2-cam.cy*IH*s,IW*s,IH*s);cctx.globalAlpha=1;}}
    S.fx(c,tt);
    cctx.restore();
    if(c.shake){const d=ccv.getContext('2d');d.drawImage(ccv,(Math.random()-.5)*c.shake*dpr,(Math.random()-.5)*c.shake*dpr);}}
  // grain + vignette
  cctx.globalAlpha=.55;const gp=cctx.createPattern(GRAIN,'repeat');cctx.save();cctx.translate(Math.random()*180,Math.random()*180);cctx.fillStyle=gp;cctx.fillRect(-180,-180,W+360,H+360);cctx.restore();cctx.globalAlpha=1;
  const vg=cctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');cctx.fillStyle=vg;cctx.fillRect(0,0,W,H);
  // narration
  const chars=Math.floor(Math.min(1,tt/(S.d*.55))*S.vo.length),txt=S.vo.slice(0,chars);if(chars!==cine.lc){if(chars>(cine.lc||0)&&S.vo[chars-1]!==' ')SND.type();cine.lc=chars;}
  const fs=Math.round(Math.max(15,Math.min(26,W/(38*dpr)))*dpr),pad=fs*1.1;
  cctx.font=fs+'px "Special Elite","Courier New",monospace';cctx.textAlign='center';cctx.textBaseline='alphabetic';
  const words=txt.split(' '),lines=[];let ln='';const maxW=W*.82;
  for(const w of words){const t2=ln?ln+' '+w:w;if(cctx.measureText(t2).width>maxW&&ln){lines.push(ln);ln=w;}else ln=t2;}if(ln)lines.push(ln);
  const bh=pad*2+fs*1.35*Math.max(1,lines.length),sb=parseFloat(getComputedStyle(document.documentElement).paddingBottom)||0;
  const bg=cctx.createLinearGradient(0,H-bh-fs*2,0,H);bg.addColorStop(0,'rgba(11,8,14,0)');bg.addColorStop(.45,'rgba(11,8,14,.82)');bg.addColorStop(1,'rgba(11,8,14,.92)');cctx.fillStyle=bg;cctx.fillRect(0,H-bh-fs*2,W,bh+fs*2);
  lines.forEach((l,i)=>{const y=H-pad-sb*dpr-(lines.length-1-i)*fs*1.35;cctx.fillStyle='#ff6a2b';cctx.fillText(l,W/2+1.5*dpr,y+1.5*dpr);cctx.fillStyle='#efe6dc';cctx.fillText(l,W/2,y);});
  // halftone dot transition in and out
  const tin=Math.max(0,1-tt/.55),tout=Math.max(0,(tt-(S.d-.6))/.6),k=Math.max(cine.i===0?tin:tin*.999,tout);
  if(k>0){const cell=Math.round(26*dpr),rad=k*cell*.75;cctx.fillStyle='#0b080e';
    if(k>.97)cctx.fillRect(0,0,W,H);else{cctx.beginPath();for(let y=0;y<H+cell;y+=cell)for(let x=(y/cell%2)*cell/2;x<W+cell;x+=cell){cctx.moveTo(x+rad,y);cctx.arc(x,y,rad,0,6.283);}cctx.fill();}}
  requestAnimationFrame(cineFrame);
}

(()=>{try{const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d'),d=x.createImageData(160,160);
for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=Math.random()<.5?46:0;}x.putImageData(d,0,0);
document.documentElement.style.setProperty('--grain','url('+c.toDataURL()+')');document.documentElement.style.setProperty('--gasimg','url('+CINE_SRC.gas+')');}catch(e){}})();
window.__canReload=()=>['splash','menu','options','credits','load','modes','bye','gallery'].includes(state);
ui();requestAnimationFrame(loop);setTimeout(()=>{cineLoad(SHOTS);cineLoad();},800);
})();
