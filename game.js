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

const ATLAS_SRC="assets/atlas.webp?v=c10942d13f";
const ATL_DATA={"rects":[[0,0,90,151,45,149],[92,0,89,152,44,149],[183,0,88,152,44,151],[273,0,89,152,44,151],[364,0,88,151,44,149],[454,0,88,153,44,151],[544,0,108,167,53,164],[654,0,110,167,54,164],[766,0,108,165,53,163],[876,0,110,165,56,163],[988,0,110,165,54,163],[1100,0,112,165,56,163],[1214,0,113,165,57,163],[1329,0,113,165,57,163],[1444,0,115,168,57,165],[1561,0,132,168,52,165],[1695,0,163,165,54,163],[1860,0,177,173,53,171],[0,175,191,179,54,177],[193,175,186,172,61,170],[381,175,110,155,54,153],[493,175,110,152,54,149],[605,175,113,148,57,146],[720,175,100,153,50,151],[822,175,100,152,49,149],[924,175,104,147,51,145],[1030,175,87,151,43,150],[1119,175,88,151,44,150],[1209,175,87,151,43,150],[1298,175,90,151,45,150],[1390,175,89,151,44,150],[1481,175,71,149,36,148],[1554,175,75,146,37,147],[1631,175,76,147,38,148],[1709,175,81,145,40,146],[1792,175,75,144,37,145],[1869,175,79,146,39,147],[1950,175,74,144,36,145],[0,356,77,143,39,147],[79,356,80,142,41,143],[161,356,103,142,39,142],[266,356,131,142,39,144],[399,356,139,153,38,154],[540,356,117,142,39,142],[659,356,80,141,40,140],[741,356,75,115,37,114],[818,356,85,108,42,109],[905,356,91,108,45,109],[998,356,75,118,37,117],[1075,356,83,108,42,110],[1160,356,90,109,45,110],[1252,356,101,151,50,150],[1355,356,99,151,49,150],[1456,356,100,151,50,150],[1558,356,100,151,50,150],[1660,356,99,151,49,150],[1761,356,101,147,50,146],[1864,356,87,154,44,154],[1953,356,86,155,43,155],[0,513,84,155,42,155],[86,513,84,155,42,155],[172,513,85,155,42,155],[259,513,85,155,42,155],[346,513,86,155,43,155],[434,513,86,156,43,155],[522,513,97,154,48,153],[621,513,125,147,44,148],[748,513,142,165,45,165],[892,513,187,170,45,171],[1081,513,195,167,54,169],[1278,513,183,157,53,158],[1463,513,105,159,52,158],[1570,513,115,159,56,158],[1687,513,122,159,61,159],[1811,513,118,159,55,158],[1931,513,115,159,58,158],[0,685,116,159,58,158],[118,685,92,148,46,149],[212,685,90,149,45,150],[304,685,90,149,45,150],[396,685,87,151,43,150],[485,685,89,150,44,150],[576,685,87,149,44,148],[665,685,88,149,44,148],[755,685,90,148,45,148],[847,685,87,149,44,148],[936,685,86,147,43,148],[1024,685,86,146,43,147],[1112,685,89,149,45,148],[1203,685,89,148,45,148],[1294,685,115,152,54,152],[1411,685,96,152,40,152],[1509,685,118,152,39,152],[1629,685,136,151,41,150],[1767,685,127,152,41,151],[1896,685,99,152,42,152],[0,846,112,130,55,129],[114,846,122,129,61,129],[238,846,126,129,63,129],[366,846,109,132,54,132],[477,846,115,131,57,131],[594,846,122,132,61,131],[718,846,90,152,45,150],[810,846,89,152,45,150],[901,846,87,153,44,151],[990,846,84,152,42,150],[1076,846,89,152,45,150],[1167,846,84,149,42,147],[1253,846,77,162,38,160],[1332,846,82,162,41,160],[1416,846,77,164,38,162],[1495,846,81,161,40,159],[1578,846,83,157,41,163],[1663,846,82,165,41,163],[1747,846,81,165,41,163],[1830,846,77,165,38,163],[1909,846,105,156,52,155],[0,1013,108,155,45,153],[110,1013,152,155,41,153],[264,1013,192,156,46,155],[458,1013,201,159,52,157],[661,1013,161,155,55,153],[824,1013,119,168,59,167],[945,1013,125,168,63,166],[1072,1013,145,166,73,165],[1219,1013,115,168,56,166],[1336,1013,125,169,62,167],[1463,1013,122,169,61,167],[1587,1013,77,149,38,147],[1666,1013,77,151,38,150],[1745,1013,77,152,38,150],[1824,1013,77,152,38,150],[1903,1013,78,151,40,150],[0,1184,77,152,38,150],[79,1184,76,151,37,150],[157,1184,71,151,35,150],[230,1184,74,151,37,150],[306,1184,73,151,36,150],[381,1184,75,151,37,150],[458,1184,74,148,37,149],[534,1184,73,151,36,150],[609,1184,75,150,37,149],[686,1184,112,165,49,163],[800,1184,110,163,48,162],[912,1184,159,164,46,163],[1073,1184,172,165,51,163],[1247,1184,126,164,56,163],[1375,1184,114,164,46,163],[1491,1184,89,164,44,162],[1582,1184,108,157,54,155],[1692,1184,126,147,63,145],[1820,1184,89,165,44,163],[1911,1184,108,164,54,162],[0,1351,133,153,67,151],[135,1351,128,152,63,150],[265,1351,129,152,63,150],[396,1351,130,150,64,148],[528,1351,130,149,64,148],[660,1351,130,152,64,150],[792,1351,124,152,62,150],[918,1351,110,147,54,145],[1030,1351,103,149,51,148],[1135,1351,109,148,54,146],[1246,1351,107,146,54,144],[1355,1351,113,149,57,148],[1470,1351,106,143,54,141],[1578,1351,104,147,52,145],[1684,1351,106,149,53,148],[1792,1351,128,148,58,146],[0,1506,129,148,37,147],[131,1506,162,158,42,157],[295,1506,148,151,43,149],[445,1506,117,146,45,144],[564,1506,109,145,44,143],[675,1506,126,144,63,143],[803,1506,134,141,67,139],[939,1506,148,138,73,136],[1089,1506,124,145,62,143],[1215,1506,113,143,56,142],[1330,1506,142,140,71,138],[1474,1506,118,152,58,150],[1594,1506,115,152,57,150],[1711,1506,109,152,55,150],[1822,1506,108,152,54,150],[1932,1506,110,152,54,150],[0,1666,106,152,53,150],[108,1666,90,150,46,148],[200,1666,90,148,45,148],[292,1666,90,149,45,148],[384,1666,90,148,45,148],[476,1666,87,148,43,148],[565,1666,90,149,45,148],[657,1666,91,149,45,148],[750,1666,92,149,46,148],[844,1666,128,132,57,130],[974,1666,124,133,37,131],[1100,1666,143,132,41,130],[1245,1666,142,132,44,130],[1389,1666,116,132,46,130],[1507,1666,117,131,41,129],[1626,1666,120,146,59,144],[1748,1666,123,146,60,144],[1873,1666,128,146,63,144],[0,1820,123,148,61,146],[125,1820,124,147,62,145],[251,1820,124,146,61,144],[377,1820,65,123,32,121],[444,1820,66,121,33,120],[512,1820,65,120,32,119],[579,1820,67,120,33,119],[648,1820,66,122,33,121],[716,1820,70,122,35,121],[788,1820,68,121,33,120],[858,1820,70,120,35,119],[930,1820,82,124,41,123],[1014,1820,102,123,50,122],[1118,1820,112,127,56,125],[1232,1820,114,121,57,119],[1348,1820,81,125,41,123],[1431,1820,89,125,44,124],[1522,1820,100,118,50,117],[1624,1820,86,136,43,135],[1712,1820,91,116,45,115],[1805,1820,91,102,45,102],[1898,1820,101,83,50,82],[0,1970,122,64,61,63],[124,1970,138,46,69,45],[264,1970,66,117,33,115],[332,1970,72,119,36,118],[406,1970,67,121,33,121],[475,1970,71,120,35,119],[548,1970,71,121,35,121],[621,1970,69,122,34,121],[692,1970,69,122,34,121],[763,1970,71,118,35,117],[836,1970,88,117,44,115],[926,1970,108,126,54,125],[1036,1970,117,127,59,126],[1155,1970,103,100,51,98],[1260,1970,80,119,40,117],[1342,1970,102,127,51,126],[1446,1970,111,120,55,119],[1559,1970,89,121,44,122],[1650,1970,99,107,49,107],[1751,1970,102,87,51,87],[1855,1970,113,67,56,66],[0,2099,133,50,67,52],[135,2099,144,42,72,41],[281,2099,82,112,41,118],[365,2099,92,113,46,120],[459,2099,92,112,46,118],[553,2099,90,120,45,119],[645,2099,92,121,46,120],[739,2099,93,115,46,122],[834,2099,94,117,47,123],[930,2099,94,115,47,122],[1026,2099,124,117,62,116],[1152,2099,126,112,63,112],[1280,2099,122,122,61,122],[1404,2099,157,102,76,101],[1563,2099,121,121,60,120],[1686,2099,126,122,63,121],[1814,2099,134,118,67,117],[0,2223,115,127,57,126],[117,2223,112,111,56,110],[231,2223,110,99,55,98],[343,2223,117,86,58,85],[462,2223,132,69,66,68],[596,2223,145,56,71,55],[743,2223,77,120,38,119],[822,2223,80,122,40,120],[904,2223,80,122,40,120],[986,2223,77,122,38,121],[1065,2223,78,121,39,120],[1145,2223,79,121,39,120],[1226,2223,83,122,41,120],[1311,2223,84,121,42,120],[1397,2223,98,122,49,124],[1497,2223,109,119,54,120],[1608,2223,108,121,54,121],[1718,2223,154,117,74,116],[1874,2223,96,124,48,123],[0,2352,106,125,53,124],[108,2352,115,125,62,124],[225,2352,99,134,49,132],[326,2352,109,124,54,123],[437,2352,120,107,60,106],[559,2352,131,97,65,97],[692,2352,140,67,69,67],[834,2352,151,53,75,53],[987,2352,109,118,54,118],[1098,2352,106,120,53,119],[1206,2352,105,119,52,118],[1313,2352,105,123,52,122],[1420,2352,108,122,54,121],[1530,2352,109,125,55,125],[1641,2352,104,127,52,126],[1747,2352,109,120,55,118],[1858,2352,145,131,72,132],[0,2488,161,127,81,127],[163,2488,173,149,86,148],[338,2488,132,128,66,127],[472,2488,135,142,67,140],[609,2488,144,154,72,153],[755,2488,163,154,83,153],[920,2488,119,120,59,119],[1041,2488,116,121,58,120],[1159,2488,120,122,60,120],[1281,2488,131,122,65,120],[1414,2488,119,122,59,120],[1535,2488,119,122,59,120],[1656,2488,102,120,51,118],[1760,2488,90,120,45,118],[1852,2488,135,139,68,137],[0,2644,150,143,73,141],[152,2644,124,160,61,159],[278,2644,135,160,64,159],[415,2644,158,125,82,123],[575,2644,156,134,77,132],[733,2644,148,121,74,121],[883,2644,178,123,89,123],[1063,2644,207,134,103,133],[1272,2644,235,137,117,135],[1509,2644,126,122,63,120],[1637,2644,157,120,78,118],[1796,2644,168,122,84,120],[0,2806,110,137,55,136],[112,2806,110,129,55,128],[224,2806,113,123,56,122],[339,2806,123,116,61,114],[464,2806,134,101,66,100],[600,2806,135,99,66,97],[737,2806,139,89,69,87],[878,2806,136,88,68,86],[1016,2806,111,117,55,116],[1129,2806,102,120,51,119],[1233,2806,107,123,54,122],[1342,2806,104,124,52,123],[1448,2806,108,122,54,121],[1558,2806,103,120,51,120],[1663,2806,102,121,51,120],[1767,2806,91,116,45,115],[1860,2806,142,130,71,129],[0,2945,143,133,71,132],[145,2945,121,160,62,159],[268,2945,125,161,62,160],[395,2945,147,148,77,147],[544,2945,155,137,76,136],[701,2945,96,96,0,0],[799,2945,96,96,0,0],[897,2945,96,96,0,0],[995,2945,96,96,0,0],[1093,2945,96,96,0,0],[1191,2945,96,96,0,0],[1289,2945,96,96,0,0]],"meta":{"hex":{"idle":[0,1,2,3,4,5],"run":[6,7,8,9,10,11,12,13],"shoot":[14,15,16,17,18,19],"leanL":[20,21,22],"leanR":[23,24,25]},"frost":{"idle":[26,27,28,29,30],"run":[31,32,33,34,35,36,37,38],"shoot":[39,40,41,42,43,44],"leanL":[45,46,47],"leanR":[48,49,50]},"volt":{"idle":[51,52,53,54,55,56],"run":[57,58,59,60,61,62,63,64],"shoot":[65,66,67,68,69,70],"leanL":[71,72,73],"leanR":[74,75,76]},"cmd":{"idle":[77,78,79,80,81],"run":[82,83,84,85,86,87,88,89],"shoot":[90,91,92,93,94,95],"leanL":[96,97,98],"leanR":[99,100,101]},"blaze":{"idle":[102,103,104,105,106,107],"run":[108,109,110,111,112,113,114,115],"shoot":[116,117,118,119,120,121],"leanL":[122,123,124],"leanR":[125,126,127]},"rook":{"idle":[128,129,130,131,132,133],"run":[134,135,136,137,138,139,140,141],"shoot":[142,143,144,145,146,147],"leanL":[148,149,150],"leanR":[151,152,153]},"bruno":{"idle":[154,155,156,157,158,159],"run":[160,161,162,163,164,165,166,167],"shoot":[168,169,170,171,172,173],"leanL":[174,175,176],"leanR":[177,178,179]},"nova":{"idle":[180,181,182,183,184,185],"run":[186,187,188,189,190,191,192,193],"shoot":[194,195,196,197,198,199],"leanL":[200,201,202],"leanR":[203,204,205]},"grunt":{"walk":[206,207,208,209,210,211,212,213],"attack":[214,215,216,217],"hit":[218,219,220],"death":[221,222,223,224,225,226]},"runner":{"walk":[227,228,229,230,231,232,233,234],"attack":[235,236,237,238],"hit":[239,240,241],"death":[242,243,244,245,246,247]},"brute":{"walk":[248,249,250,251,252,253,254,255],"attack":[256,257,258,259],"hit":[260,261,262],"death":[263,264,265,266,267,268]},"armored":{"walk":[269,270,271,272,273,274,275,276],"attack":[277,278,279,280],"hit":[281,282,283],"death":[284,285,286,287,288,289]},"splitter":{"walk":[290,291,292,293,294,295,296,297],"hit":[298,299,300],"death":[301,302,303,304]},"boss":{"walk":[305,306,307,308,309,310,311,312],"throw":[313,314,315,316,317,318],"roar":[319,320,321,322],"hit":[323,324,325],"death":[326,327,328,329,330,331,332,333]},"boss2":{"walk":[334,335,336,337,338,339,340,341],"throwcar":[342,343,344,345,346,347]},"por":{"hex":348,"frost":349,"volt":350,"blaze":351,"rook":352,"bruno":353,"nova":354}}};
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
   perks:['Twin pistols','Faster blade','Critical strikes']},
 blaze:{name:'Blaze',role:'Flamer',color:'#ff7a2e',rate:.07,dmg:1.6,range:330,
   perks:['Wide cone','Long burn','Long reach']},
 volt:{name:'Volt',role:'Storm caller',color:'#a98bff',rate:1.0,dmg:15,range:800,
   perks:['+1 chain','+2 chains','Stun strike']},
 frost:{name:'Frost',role:'Cryo',color:'#9fe8ff',rate:.6,dmg:8,range:900,
   perks:['Shatter splash','Deep chill','Flash freeze']},
 hex:{name:'Hex',role:'Witch',color:'#c47bff',rate:.85,dmg:12,range:1050,
   perks:['Twin orbs','Hungry orbs','Splitting orbs']},
 bruno:{name:'Bruno',role:'Breacher',color:'#ffb347',rate:.9,dmg:7,range:1600,
   perks:['+2 pellets','Heavy knockback','Point blank']},
 nova:{name:'Nova',role:'Sniper',color:'#ff5a6a',rate:2.0,dmg:55,range:1500,
   perks:['Quick bolt','Pierce all','Giant slayer']},
};
const HERO_ORDER=['bruno','rook','blaze','volt','frost','hex','nova'];
const PERK_LV=[3,6,9];
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
const xpNeed=l=>45+40*l*(l-1);
const trainCost=l=>Math.round(35*Math.pow(l,1.85)+30);
const MAXLV=10;

/* ---------- SAVE ---------- */
const KEY='holdout-squad-v1';
let save={heroes:{},weapons:['pistol'],equip:'pistol',gold:0,best:0,cmd:1,active:[],fallen:[]};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.weapons){save=Object.assign(save,s);if(!Array.isArray(s.active))save.active=HERO_ORDER.filter(h=>save.heroes[h]).slice(0,3);}}catch(e){}
if(!Array.isArray(save.fallen))save.fallen=[];
save.active=save.active.filter(h=>save.heroes[h]);
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch(e){}}

/* ---------- RUN STATE ---------- */
let R=null,state='splash',SX=0,t=0;
const LANE_E=300;
function sxLimit(){return LANE_E;}
function newRun(startWave){setTimeout(()=>cineLoad(SHOTS2),20000);
  for(const id of['cmd',...Object.keys(save.heroes)])setHp(id,maxHp(id));
  R={wave:startWave,wall:WALL_MAX,wallMax:WALL_MAX,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:null,vx:0,prevSX:SX,dead:[]};
  startWave_(startWave);
}
function hpScale(w){return 1}
function spdScale(w){return .9}
function startWave_(w){
  R.wave=w;SND.alarm();
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
function startStage2(){setTimeout(()=>cineLoad(SHOTS3),8000);setTimeout(()=>cineLoadKeys(FORK_KEYS),20000);
  for(const id of['cmd',...Object.keys(save.heroes)])setHp(id,maxHp(id));
  R={stage:2,wave:5,wall:WALL_MAX,wallMax:WALL_MAX,scatter:0,en:[],bu:[],cr:[],pa:[],bolts:[],tx:[],cd:{},an:{},banner:{txt:'STAGE 2: THE ESCAPE',t:2.6,col:'#ffc53d'},vx:0,prevSX:SX,dead:[],
    queue:[],kills:0,spawnLeft:99999,spawnTotal:99999,spawnT:2.2,bossPending:false,crateAt:[],jeepAt:-1,proj:[]};
  SND.alarm();spawnBoss();const b=R.en[R.en.length-1];b.z=ZFAR+60;
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
    grunt:{hp:26,spd:42,r:32,gold:1,xp:4,col:'#7fcf4a',dmg:10},
    runner:{hp:12,spd:95,r:26,gold:3,xp:3,col:'#b46bff',dmg:7},
    brute:{hp:120,spd:26,r:50,gold:15,xp:11,col:'#e2483d',dmg:24},
    armored:{hp:55,spd:34,r:38,gold:5,xp:8,col:'#8a94a6',dmg:14,armor:5},
    splitter:{hp:45,spd:36,r:39,gold:10,xp:7,col:'#3fd6c6',dmg:12,split:1},
  }[type];
  const e=Object.assign({type},T);
  e.hp*=hs;e.spd*=ss*SPD;e.x=x;e.z=z;e.slow=0;e.burn=0;e.bdps=0;e.stun=0;e.wob=Math.random()*6;
  if(false){e.elite=1;e.hp*=3;e.r*=1.2;e.gold*=4;e.xp*=3;e.dmg*=2;}
  e.max=e.hp;R.en.push(e);return e;
}
function spawnEnemy(){
  let type=R.queue&&R.queue.length?R.queue.shift():(R.stage===2?'runner':'grunt');
  mkEnemy(type,(Math.random()*2-1)*(LANE_E-20),ZFAR+Math.random()*120);
}

/* ---------- THE WARD: stage 1 boss, parks mid-road and hurls hospital junk ---------- */
const BOSS_Z=380,BOSS_VIS=1.35;
const PROJ={gurney:{set:'pgurney',dmg:34,rad:72,fx:'pimpact'},wheel:{set:'pwheel',dmg:24,rad:58,fx:'pimpact'},tank:{set:'ptank',dmg:26,rad:120,fx:'pblast'},car:{set:'pcar',dmg:40,rad:110,fx:'pblast'},gruntp:{set:null,dmg:14,rad:60,fx:'pimpact'}};
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
  R.proj.push({kind,x0:e.x,z0:e.z,h0:e.r*EH*BOSS_VIS*.9,x1:m.x+(Math.random()-.5)*30,z1:m.z+10,t:0,T:1.4,peak:300,x:e.x,z:e.z,h:0,spin:Math.random()*4|0});
  SND.whoosh();
}
function projUpdate(dt){
  if(!R.proj)return;R.bfx=R.bfx||[];
  for(const p of R.proj){p.t+=dt;const q=Math.min(1,p.t/p.T);p.x=p.x0+(p.x1-p.x0)*q;p.z=p.z0+(p.z1-p.z0)*q;p.h=p.h0*(1-q)+Math.sin(Math.PI*q)*p.peak;
    if(q>=1&&!p.done){p.done=1;const P_=PROJ[p.kind];R.bfx.push({set:P_.fx,x:p.x,z:p.z,t:0});R.shake=p.kind==='tank'?.5:.3;
      SND.explosion(p.kind==='tank'?.9:.45);burst(p.x,p.z,20,p.kind==='tank'?'#b6f23a':'#c9a46a',p.kind==='tank'?24:14);
      for(const m of squad()){if(Math.hypot(m.x-p.x,(m.z-p.z)*1.6)<P_.rad)hurtMember(m.id,P_.dmg);}
      if(p.kind==='gruntp'){const g=mkEnemy('grunt',p.x+(Math.random()-.5)*40,p.z+40);g.onRoof=1;g.hp*=.7;g.max=g.hp;}}}
  R.proj=R.proj.filter(p=>!p.done);
  for(const f of R.bfx)f.t+=dt;R.bfx=R.bfx.filter(f=>f.t<.6);
}
function drawProj(p){
  if(!envReady)return;const[sx,sy,k]=P(p.x,p.z,p.h);
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
  const b=R.en.find(e=>e.type==='boss'&&e.z<ZFAR);if(!b)return;
  const w=WW*.46,x=WW/2-w/2,y=66;ctx.fillStyle='#0b080ecc';ctx.fillRect(x-4,y-14,w+8,26);
  ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText('THE WARD',WW/2,y-3);
  ctx.fillStyle='#2a1a22';ctx.fillRect(x,y+2,w,7);ctx.fillStyle='#ff2e63';ctx.fillRect(x,y+2,w*Math.max(0,b.hp/b.max),7);
}
function spawnBoss(){
  const hs=hpScale(R.wave);
  R.en.push({type:'boss',hp:2900,max:2900,spd:15*SPD,r:100,gold:50,xp:150,col:'#ff2e63',x:0,z:ZFAR+80,slow:0,burn:0,bdps:0,stun:0,wob:0,dmg:100,armor:1});
}
function spawnCrate(){
  const rw=nextReward(),hp=80+R.wave*48,lim=sxLimit();
  R.cr.push({x:(Math.random()*2-1)*lim,z:ZFAR,hp,max:hp,rw});
}

/* ---------- SQUAD ---------- */

/* ---------- SQUAD HEALTH, ACTIVE ROSTER, PERMADEATH ---------- */
const BASE_HP={cmd:150,bruno:120,rook:85,blaze:85,volt:75,frost:75,hex:70,nova:65};
const MAX_ACTIVE=3,WALL_MAX=400;
function maxHp(id){return id==='cmd'?BASE_HP.cmd+15*(save.cmd-1):BASE_HP[id]+14*((save.heroes[id]||{lv:1}).lv-1);}
function getHp(id){if(id==='cmd'){if(save.cmdHp==null)save.cmdHp=maxHp('cmd');return save.cmdHp;}const s=save.heroes[id];if(s.hp==null)s.hp=maxHp(id);return s.hp;}
function setHp(id,v){if(id==='cmd')save.cmdHp=v;else save.heroes[id].hp=v;}
function healAll(f){for(const id of['cmd',...save.active])setHp(id,Math.min(maxHp(id),getHp(id)+maxHp(id)*f));}
function addHero(id){story('hero_joined',{hero:id});
  save.heroes[id]={lv:1,xp:0,hp:BASE_HP[id]};
  const act=save.active.length<MAX_ACTIVE;if(act)save.active.push(id);
  return act;
}
const HORDE=()=>save.mode==='horde';
const reviveCost=id=>20+30*((save.downed&&save.downed[id]&&save.downed[id].lv)||1);
function hurtMember(id,d){
  if(!R||R.over)return;if(HORDE())d*=1.15;
  const hp=getHp(id)-d;setHp(id,hp);SND.hurt(0);R.mflash=R.mflash||{};R.mflash[id]=.12;
  const m=squad().find(q=>q.id===id);if(m)burst(m.x,m.z,40,'#ff4d5e',6);
  if(hp>0)return;
  if(id==='cmd'){R.over=true;gameOver();return;}
  if(m){burst(m.x,m.z,40,HEROES[id].color,30);R.dead.push({hero:id,x:m.x,z:m.z,t:0,fr:heroFrame(id)});}
  if(!HORDE()){save.downed=save.downed||{};save.downed[id]={lv:save.heroes[id].lv,xp:save.heroes[id].xp};}
  story(HORDE()?'hero_died':'hero_down',{hero:id,level:save.heroes[id].lv});
  delete save.heroes[id];save.active=save.active.filter(h=>h!==id);if(!save.fallen.includes(id))save.fallen.push(id);
  for(const e of R.en)if(e.tgt===id){e.tgt=null;e.atk=undefined;}
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
function shoot(o){R.bu.push(Object.assign({r:7,pierce:1,hit:new Set(),life:2,h:MZ_H},o));}
function aimAt(sx,sz,e,spd,spread=0){const a=Math.atan2(e.z-sz,e.x-sx)+(Math.random()-.5)*spread;return[Math.cos(a)*spd,Math.sin(a)*spd];}
function anim(id){if(!R.an[id])R.an[id]={a:'run',t:Math.random()*2,last:-9};return R.an[id];}
const SHOT_KIND={rook:'pistol',bruno:'shotgun',blaze:'flame',volt:'zap',frost:'ice',hex:'orb',nova:'sniper'};
function triggerShoot(id){{const m=squad().find(q=>q.id===id);SND.shot(id==='cmd'?({pistol:'rifle',smg:'smg',shotgun:'shotgun',rail:'rail',rocket:'rocket',minigun:'minigun'})[save.equip]:SHOT_KIND[id],m?m.x/600:0);}const st=anim(id);if(st.a==='shoot'&&(id==='blaze'||st.t<.12)){st.last=t;return;}st.a='shoot';st.t=0;st.last=t;}

function fireCmd(s){
  const W=WEAPONS[save.equip],m=Math.pow(1.12,save.cmd-1),d=W.dmg*m;
  const gx=s.x+16,gz=s.z+10;
  triggerShoot('cmd');
  if(save.equip==='shotgun'){for(let i=0;i<W.pel;i++){const a=Math.PI/2+(i/(W.pel-1)-.5)*.5;shoot({x:gx,z:gz,vx:Math.cos(a)*1050,vz:Math.sin(a)*1050,dmg:d,own:'cmd',col:'#fff',life:.7});}}
  else if(save.equip==='rail')shoot({x:gx,z:gz,vx:0,vz:2600,dmg:d,own:'cmd',col:'#9ff',pierce:99,r:9,trail:1});
  else if(save.equip==='rocket')shoot({x:gx,z:gz,vx:0,vz:760,dmg:d,own:'cmd',col:'#ffb347',r:9,splash:W.splash,rocket:1});
  else{const sp=save.equip==='pistol'?0:.1;shoot({x:gx,z:gz,vx:(Math.random()-.5)*sp*1300,vz:1300,dmg:d,own:'cmd',col:'#fff8d0',trail:1});}
  return W.rate;
}
function fireHero(s){
  const id=s.id,H=HEROES[id],L=save.heroes[id].lv,d=H.dmg*Math.pow(1.13,L-1);
  let rate=H.rate*Math.pow(.975,L-1);
  const reach=H.range+(id==='blaze'&&L>=9?140:0);
  const sx=s.x+18,sz=s.z+8;
  const e=nearest(sx,sz,reach);
  if(!e)return .1;
  triggerShoot(id);
  switch(id){
   case'rook':{
     const near=R.en.filter(q=>!q.dead&&q.type!=='boss'&&Math.abs(q.z-s.z)<175+q.r*.5&&Math.abs(q.x-s.x)<150+q.r*.5);
     if(near.length&&(R.katCd||0)<=0){R.katCd=L>=6?.6:.85;const kd=42*Math.pow(1.13,L-1);
       for(const q of near){damage(q,kd*(L>=9&&Math.random()<.25?2.5:1),id);if(!q.dead&&q.type!=='brute')q.z+=36;q.stun=Math.max(q.stun||0,.15);}
       R.slashes=R.slashes||[];R.slashes.push({x:s.x,z:s.z+120,t:0,dir:(R.slashN=(R.slashN||0)+1)%2?1:-1});SND.slash(s.x/600);R.shake=Math.max(R.shake||0,.1);return .3;}
     R.gunSide=-(R.gunSide||1);const gx=sx+R.gunSide*14;
     const[vx,vz]=aimAt(gx,sz,e,1400,.03);shoot({x:gx,z:sz,vx,vz,dmg:d*.6,own:id,col:'#ffd27a',pierce:L>=6?3:1,crit:L>=9,trail:1});
     if(L>=3){const[vx2,vz2]=aimAt(sx-R.gunSide*14,sz,e,1400,.05);shoot({x:sx-R.gunSide*14,z:sz,vx:vx2,vz:vz2,dmg:d*.6,own:id,col:'#ffd27a',pierce:L>=6?3:1,crit:L>=9,trail:1});}
     rate*=.62;break;}
   case'blaze':{for(let i=0;i<2;i++){const[vx,vz]=aimAt(sx,sz,e,560,L>=3?.7:.35);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:H.color,pierce:99,life:reach/560,flame:1,r:12,burn:d*2.2,burnT:L>=6?3.2:1.6});}break;}
   case'volt':{let chain=2+(L>=3?1:0)+(L>=6?2:0),cur=e,hit=new Set(),pts=[[sx,sz,MZ_H]];
     while(cur&&chain-->=0){hit.add(cur);pts.push([cur.x,cur.z,cur.r]);damage(cur,d,id);if(L>=9)cur.stun=Math.max(cur.stun,.45);cur=nearestTo(cur,210,hit);}
     R.bolts.push({pts,life:.2,col:'#bfe0ff'});break;}
   case'frost':{const[vx,vz]=aimAt(sx,sz,e,1000);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:H.color,r:9,slowAmt:L>=6?.3:.5,splash:L>=3?64:0,splashMul:.45,freeze:L>=9,glow:1});break;}
   case'hex':{const n=L>=3?2:1;for(let i=0;i<n;i++){const[vx,vz]=aimAt(sx,sz,e,440,1.0);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:H.color,r:L>=6?13:10,homing:L>=6?7:4,spd:L>=6?620:480,life:3.2,split:L>=9,glow:1,orb:1});}break;}
   case'bruno':{const n=5+(L>=3?2:0);const close=L>=9&&Math.hypot(e.x-sx,e.z-sz)<220;
     for(let i=0;i<n;i++){const[vx,vz]=aimAt(sx,sz,e,1100,.4);shoot({x:sx,z:sz,vx,vz,dmg:close?d*2:d,own:id,col:'#ffb347',life:1.5,kb:L>=6?70:30,fall:1,ox:sx,oz:sz});}break;}
   case'nova':{if(L>=3)rate*=.75;const[vx,vz]=aimAt(sx,sz,e,2600);shoot({x:sx,z:sz,vx,vz,dmg:d,own:id,col:'#ff8a8a',r:8,pierce:L>=6?99:3,trail:1,slayer:L>=9});break;}
  }
  return rate;
}
function nearestTo(e0,range,skip){let best=null,bd=range*range;for(const e of R.en){if(e.dead||skip.has(e))continue;const d=(e.x-e0.x)**2+(e.z-e0.z)**2;if(d<bd){bd=d;best=e;}}return best;}

/* ---------- COMBAT ---------- */
function damage(e,d,own,b){
  if(e.dead)return;
  if(e.type==='boss'&&R.stage===2&&!R.raged&&e.hp-d<e.max*.5){e.hp=e.max*.5;e.flash=.06;return;}
  if(b&&b.crit&&Math.random()<.25)d*=2.5;
  if(b&&b.slayer&&(e.type==='brute'||e.type==='boss'))d*=3;
  if(e.armor)d=Math.max(d*.15,d-e.armor);
  e.hp-=d;e.flash=.06;if(!(e.hitT>0))e.hitT=.24;SND.hit(e.x/600);
  if(e.hp<=0){e.dead=1;kill(e,own);}
}

/* ---------- KILL STATS: per character, this run and all time ---------- */
const ENEMY_NAMES={grunt:'Grunt',runner:'Runner',armored:'Armored',brute:'Brute',splitter:'Splitter',boss:'The Ward'};
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
    <div class="stripe"></div>
    <div class="row stot"><span class="sub">Total kills</span><span class="snum"><span><small>THIS RUN</small>${tot(run)}</span><span><small>ALL TIME</small>${tot(all)}</span></span></div>
    <h3>Kills by enemy</h3>${rows}
    <div class="btns"><button class="btn ghost" data-act="statback">Back</button></div>`;
}
function drawEnemyThumbs(){
  if(!atlasReady)return;
  ov.querySelectorAll('canvas[data-enemy]').forEach(c=>{const M=META[c.dataset.enemy];if(!M)return;const fr=(M.walk||M.idle)[0],r=RECTS[fr],g=c.getContext('2d');
    const s=Math.min(c.width/r[2],c.height/r[3])*.95;g.clearRect(0,0,c.width,c.height);g.drawImage(ATL,r[0],r[1],r[2],r[3],(c.width-r[2]*s)/2,c.height-r[3]*s,r[2]*s,r[3]*s);});
}
function kill(e,own){addKill(own,e.type);
  save.gold+=e.gold;SND.die(e.type,e.x/600);
  if(R.jail)hitJail(R.jail.max*.035);
  if(e.split){for(let k=-1;k<=1;k+=2){const m=mkEnemy('runner',e.x+k*26,e.z);m.gold=1;if(e.elite){m.hp*=2;m.max=m.hp;}}}
  if(own==='cmd'){cmdXp(e.xp);const hs=save.active.slice();hs.forEach(h=>giveXp(h,e.xp*.3/Math.max(1,hs.length)));}
  if(e.type!=='boss'||1){R.kills=(R.kills||0)+1;if(save.cmd>=3&&R.kills%10===0)rally();}
  else giveXp(own,e.xp);
  if(e.type==='boss')story('boss_defeated',{boss:'the_ward',by:own});
  if(e.type==='boss'&&R.stage===2){R.escapeT=3.2;R.spawnLeft=0;}
  if(e.type==='boss'){R.banner={txt:R.stage===2?'THE CONVOY BREAKS FREE':'THE WARD IS DOWN',t:3,col:'#b6f23a'};SND.explosion(.7);R.shake=.6;R.proj=[];}
  if(META[e.type]){R.dead.push({type:e.type,x:e.x,z:e.z,r:e.r,t:0,elite:e.elite});burst(e.x,e.z,e.r,e.col,5);}
  else burst(e.x,e.z,e.r,e.col,e.type==='boss'?40:12);
}
const CMD_PERKS=['Rally: heal squad 10% every 10 kills','Locked: to be revealed','Locked: to be revealed'];
function cmdXp(x){if(save.cmd>=MAXLV)return;save.cmdXp=(save.cmdXp||0)+x;
  while(save.cmd<MAXLV&&save.cmdXp>=xpNeed(save.cmd)){save.cmdXp-=xpNeed(save.cmd);save.cmd++;SND.levelUp();
    if(R){const[px,py]=P(SX,0,CHAR_H+14);R.tx.push({x:px,y:py,txt:'COMMANDER LV '+save.cmd,col:'#ffc53d',t:1.6});if(save.cmd===3)R.banner={txt:'COMMANDER: RALLY UNLOCKED',t:2.4,col:'#ffc53d'};}}}
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
  if(pi>=0&&R)R.banner={txt:HEROES[h].name+': '+HEROES[h].perks[pi],t:2,col:HEROES[h].color};
  if(s.lv>=MAXLV)s.xp=0;
}
function burst(x,z,h,col,n){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=60+Math.random()*220;R.pa.push({x,z,h,vx:Math.cos(a)*s,vz:Math.sin(a)*s*.6,vh:80+Math.random()*200,t:.5+Math.random()*.4,col});}}
function unlock(rw,x,z){
  burst(x,z,30,'#ffc53d',34);
  if(rw.type==='hero'){save.heroes[rw.id]={lv:1,xp:0};R.banner={txt:'NEW HERO: '+HEROES[rw.id].name.toUpperCase(),t:2.4,col:HEROES[rw.id].color};}
  else if(rw.type==='weapon'){save.weapons.push(rw.id);save.equip=rw.id;R.banner={txt:'NEW WEAPON: '+WEAPONS[rw.id].name.toUpperCase(),t:2.4,col:'#ffffff'};}
  else{Object.keys(save.heroes).forEach(h=>giveXp(h,60+R.wave*12));save.gold+=40;R.banner={txt:'SUPPLY DROP: SQUAD XP',t:2,col:'#ffc53d'};}
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
    R.spawnT=Math.max(.3,1.85-R.wave*.12)*(.7+Math.random()*.6);
    const pack=Math.min(R.spawnLeft,1+Math.floor(Math.random()*(R.wave/3)));
    for(let k=0;k<pack;k++){const idx=R.spawnTotal-R.spawnLeft;
    if(R.crateAt.includes(idx))spawnCrate();
    if(idx===R.jeepAt){R.cinePending=true;R.jeepAt=-1;break;}
    if(R.bossPending&&idx>=Math.floor(R.spawnTotal*.6)){spawnBoss();R.bossPending=false;}
    spawnEnemy();if(R.stage===2&&HORDE())spawnEnemy();R.spawnLeft--;}}}
  squadStep(dt);jeepUpdate(dt);SND.engineSet(!!(R.jeep&&R.jeep.phase==='drive'));SND.ambient(dt,R.en);SND.intensity=(R.wall/R.wallMax<.4||R.en.length>14)?1:0;
  const sq=squad();
  if(!R.cine)for(const s of sq){anim(s.id);R.cd[s.id]=(R.cd[s.id]||0)-dt;if(R.cd[s.id]<=0)R.cd[s.id]=s.id==='cmd'?fireCmd(s):fireHero(s);}
  for(const e of R.en){
    if(e.dead)continue;
    if(e.flash>0)e.flash-=dt;if(e.hitT>0)e.hitT-=dt;
    if(e.burn>0){e.burn-=dt;e.hp-=e.bdps*dt;if(Math.random()<dt*14)R.pa.push({x:e.x+(Math.random()-.5)*e.r,z:e.z,h:e.r*(1+Math.random()*1.2),vx:0,vz:0,vh:90,t:.45,col:Math.random()<.5?'#ffb347':'#ff5a1f',ng:1});if(e.hp<=0){e.dead=1;kill(e,e.burnOwn||'blaze');continue;}}
    if(e.atk!==undefined){
      if(!e.tgt&&R.wall<=0)e.atk=undefined;
      else if(e.tgt){const m=squad().find(q=>q.id===e.tgt);if(!m||Math.hypot(m.x-e.x,m.z+16-e.z)>e.r+60){e.atk=undefined;e.tgt=null;}}
      if(e.atk!==undefined){e.atk+=dt;const c=Math.floor(e.atk/1.1),ph=e.atk-c*1.1;
        if(ph>=.34&&e.hitC!==c){e.hitC=c;if(e.tgt)hurtMember(e.tgt,e.dmg);else{hitWall(e.dmg,e.x);burst(e.x,WALL_Z,e.r,'#c9a46a',6);}}
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
    e.z-=sp*dt;e.x+=Math.sin(t*1.6+e.wob)*18*dt;
    e.x=Math.max(-LANE_E,Math.min(LANE_E,e.x));
    if(R.wall>0&&!e.onRoof){
      if(e.z<=WALL_Z+WALL_STOP+e.r*.5){e.z=WALL_Z+WALL_STOP+e.r*.5;e.atk=0;e.tgt=null;e.hitC=-1;}
    }else if(e.z<WALL_Z+260){
      let best=null,bd=1e9;for(const m of squad()){const d=Math.hypot(m.x-e.x,m.z-e.z);if(d<bd){bd=d;best=m;}}
      if(best){const tx=best.x+(e.x<best.x?-1:1)*e.r*.4,tz=best.z+16,dx=tx-e.x,dz=tz-e.z,dd=Math.hypot(dx,dz);
        e.z+=sp*dt;e.x-=Math.sin(t*1.6+e.wob)*18*dt;
        if(dd>e.r+22){e.x+=dx/dd*sp*1.1*dt;e.z+=dz/dd*sp*1.1*dt;}else{e.atk=0;e.tgt=best.id;e.hitC=-1;}}
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
        if(b.kb&&e.type!=='boss')e.z+=b.kb*Math.min(1,fm)*(e.type==='brute'?.4:1);
        damage(e,b.dmg*fm,b.own,b);
        if(b.split){for(let k=-1;k<=1;k+=2)shoot({x:b.x,z:b.z,h:b.h,vx:k*380,vz:200,dmg:b.dmg*.5,own:b.own,col:b.col,r:8,homing:6,spd:520,life:1.6,glow:1,orb:1});}
        if(--b.pierce<=0){b.life=0;break;}
      }
    }
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
  R.en=R.en.filter(e=>!e.dead);R.bu=R.bu.filter(b=>b.life>0);R.cr=R.cr.filter(c=>!c.dead);
  R.pa=R.pa.filter(p=>p.t>0);R.bolts=R.bolts.filter(b=>b.life>0);R.tx=R.tx.filter(x=>x.t>0);
  if(R.over)return;
  if(R.escapeT!=null){R.escapeT-=dt;for(const e of R.en)if(!e.onRoof)e.z+=520*dt;R.en=R.en.filter(e=>e.z<ZFAR+200||e.onRoof);if(R.escapeT<=0){R.escapeT=null;save.cleared=Math.max(save.cleared||0,2);legacyStage(2);save.gold+=60;persist();startFork(()=>{legacyEnd('cleared_stage_2');persist();state='win2';ui();},true);return;}}
  R.scatter=R.wall<=0?R.scatter+dt:Math.max(0,R.scatter-dt*.4);
  if(R.mflash)for(const k in R.mflash)R.mflash[k]-=dt;
  if(R.spawnLeft<=0&&!R.bossPending&&R.en.length===0&&R.cr.length===0&&!R.cinePending&&!R.cine&&!(R.proj&&R.proj.length)&&!(R.jeep&&R.jeep.phase!=='lost'&&R.jeep.phase!=='freed'))waveClear();
  hudUpdate();
}

/* ---------- DRAW ---------- */
function drawWorld(){
  const dt=Math.max(0,Math.min(.1,t-SKY.lastT));SKY.lastT=t;
  ctx.fillStyle='#1a1026';ctx.fillRect(-20,-20,WW+40,WH+40);
  if(R&&R.stage===2){}else if(plateReady){const pw=WW*1.06,ph=pw*PLATE.height/PLATE.width,px=WW/2-pw/2-camX*.04,py=HOR-PLATE_HZ*ph;ctx.drawImage(PLATE,px,py,pw,ph);}
  if(!(R&&R.stage===2)){const yb=HOR+CAMH*K(WALL_Z),gr=ctx.createLinearGradient(0,yb-6,0,WH);gr.addColorStop(0,'rgba(18,10,26,.55)');gr.addColorStop(1,'rgba(18,10,26,.35)');ctx.fillStyle=gr;ctx.fillRect(-20,yb-6,WW+40,WH-yb+30);}
  if(R&&R.stage===2){drawStage2World(dt);if(plate2Ready){const pw=WW*1.06,ph=pw*PLATE2.height/PLATE2.width,py=HOR-PLATE_HZ*ph;
    ctx.save();ctx.beginPath();ctx.rect(-20,py+ph*.655,WW+40,WH);ctx.clip();ctx.drawImage(PLATE2,WW/2-pw/2,py,pw,ph);ctx.restore();}drawRoad2();if(envReady)drawSky(dt);return;}
  if(envReady){drawSky(dt);drawBeams();}
}
function drawFrame(idx,x,y,sc,alpha){const r=RECTS[idx];if(!r)return;if(alpha!==undefined)ctx.globalAlpha=alpha;ctx.drawImage(ATL,r[0],r[1],r[2],r[3],x-r[4]*sc,y-r[5]*sc,r[2]*sc,r[3]*sc);ctx.globalAlpha=1;}
function heroFrame(id){
  const M=META[id],st=anim(id);
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
  const n=M.idle.length,ki=Math.floor(st.t*6)%Math.max(1,2*n-2);return M.idle[ki<n?ki:2*n-2-ki];
}
const EBODY=120,EH=2.6;
function drawCorpse(d){
  if(d.hero){const[sx,sy,k]=P(d.x,d.z);drawFrame(d.fr,sx,sy,k*CHAR_H/BODY_PX,Math.max(0,1-d.t/1.6));return;}
  const M=META[d.type],[sx,sy,k]=P(d.x,d.z),n=d.type==='splitter'?4:M.death.length,f=Math.min(n-1,Math.floor(d.t*11));
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(sx,sy,d.r*1.1*k,d.r*.3*k,0,0,6.283);ctx.fill();
  drawFrame(M.death[f],sx,sy,k*d.r*EH/EBODY*(d.type==='boss'?BOSS_VIS:1),Math.max(0,Math.min(1,(1.6-d.t)/.5)));
}
function drawEnemySprite(e,sx,sy,k,fade){
  const M=META[e.type],sc=k*e.r*EH/EBODY*(e.type==='boss'?BOSS_VIS:1);let fr;
  const M2=META.boss2;
  if(e.type==='boss'&&e.enraged&&M2){if(e.act==='throw'&&e.nextKind==='car')fr=M2.throwcar[Math.min(5,Math.floor(e.at/.95*6))];else if(e.act==='throw')fr=M.throw[Math.min(5,Math.floor(e.at/.95*6))];else if(e.act==='roar')fr=M.roar[Math.min(3,Math.floor(e.at/.85*4))];else fr=M2.walk[Math.floor(t*11)%M2.walk.length];}
  else if(e.type==='boss'){if(e.act==='throw')fr=M.throw[Math.min(5,Math.floor(e.at/.95*6))];else if(e.act==='roar')fr=M.roar[Math.min(3,Math.floor(e.at/.85*4))];else fr=M.walk[Math.floor(t*(e.z>BOSS_Z+5?6:3))%M.walk.length];}
  else if(e.atk!==undefined){const A=M.attack||M.hit;fr=A[Math.min(A.length-1,Math.floor(e.atk*7))];}
  else if(e.jt!==undefined&&e.jt<.6){const A=M.attack||M.hit;fr=A[Math.min(A.length-1,Math.floor(e.jt*7))];}
  else if(e.stun>0)fr=M.hit[1];
  else if(e.hitT>0)fr=M.hit[Math.min(M.hit.length-1,Math.floor((.24-e.hitT)/.24*M.hit.length))];
  else{const fps=e.type==='runner'?15:e.type==='brute'?7:e.type==='armored'||e.type==='splitter'?8:10;fr=M.walk[Math.floor(t*fps*(e.slow>0?.5:1)+e.wob*3)%M.walk.length];}
  ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.05*k,e.r*.3*k,0,0,6.283);ctx.fill();
  if(e.elite){ctx.strokeStyle='#ffc53d';ctx.lineWidth=Math.max(1.5,3*k);ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.25*k,e.r*.38*k,0,0,6.283);ctx.stroke();}
  if(e.slow>0||e.stun>0){ctx.fillStyle='rgba(159,232,255,.35)';ctx.beginPath();ctx.ellipse(sx,sy,e.r*1.2*k,e.r*.36*k,0,0,6.283);ctx.fill();}
  drawFrame(fr,sx,sy,sc,fade);
  if(e.flash>0||e.slow>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,sx,sy,sc,(e.flash>0?.55:.22)*fade);ctx.globalCompositeOperation='source-over';}
  const top=sy-e.r*EH*k-6;
  if(e.type!=='boss'&&e.hp<e.max&&k>.25){const bw=e.r*1.6*k,bh=Math.max(2,4*k);ctx.fillStyle='#000a';ctx.fillRect(sx-bw/2,top,bw,bh);ctx.fillStyle=e.elite?'#ffc53d':'#ff4d5e';ctx.fillRect(sx-bw/2,top,bw*Math.max(0,e.hp/e.max),bh);}
}
function drawEnemy(e){
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
  if(atlasReady){const sc=k*CHAR_H/BODY_PX,fr=heroFrame(s.id);drawFrame(fr,sx,sy,sc);if(R&&R.mflash&&R.mflash[s.id]>0){ctx.globalCompositeOperation='lighter';drawFrame(fr,sx,sy,sc,.6);ctx.globalCompositeOperation='source-over';}}
  if(R){const f=Math.max(0,getHp(s.id)/maxHp(s.id)),bw=46*k,by=sy-CHAR_H*k-10;ctx.fillStyle='#000b';ctx.fillRect(sx-bw/2-1,by-1,bw+2,7);ctx.fillStyle=f<.3?'#ff4d5e':f<.6?'#ffc53d':'#5ee08a';ctx.fillRect(sx-bw/2,by,bw*f,5);}
  if(s.id!=='cmd'){ctx.fillStyle='#0d1016cc';ctx.fillRect(sx-9,sy+3,18,12);ctx.fillStyle='#ffc53d';ctx.font='700 10px "Chakra Petch", sans-serif';ctx.textAlign='center';ctx.fillText(save.heroes[s.id].lv,sx,sy+13);}
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
  items.sort((a,b)=>b[0]-a[0]);
  const near=items.filter(i=>(i[1]===0||i[1]===4)&&i[0]<WALL_Z);
  for(const[z,ty,o]of items){if((ty===0||ty===4)&&z<WALL_Z)continue;if(ty===0)drawEnemy(o);else if(ty===1)drawCrate(o);else if(ty===3)drawJail(o);else if(ty===4)drawCorpse(o);else if(ty===5)drawJeep(o);else if(ty===6)drawProj(o);else if(ty===7)drawWarn(o);else if(ty===8)drawBfx(o);else drawBullet(o);}
  if(R.stage!==2)drawWall();else if(!plate2Ready)drawTruckRoof();
  for(const bo of R.bolts){if(bo.tr){const[a,b]=P(...bo.pts[0]),[c,d]=P(...bo.pts[1]);ctx.strokeStyle=bo.col;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();continue;}ctx.strokeStyle=bo.col;ctx.lineWidth=2.5;ctx.shadowColor='#6aa8ff';ctx.shadowBlur=10;ctx.beginPath();
    bo.pts.forEach((p,i)=>{const[x,y]=P(p[0],p[1],p[2]);if(!i)ctx.moveTo(x,y);else{const[qx,qy]=P(bo.pts[i-1][0],bo.pts[i-1][1],bo.pts[i-1][2]);ctx.lineTo((x+qx)/2+(Math.random()-.5)*18,(y+qy)/2+(Math.random()-.5)*18);ctx.lineTo(x,y);}});ctx.stroke();ctx.shadowBlur=0;}
  for(const p of R.pa){const[x,y,k]=P(p.x,p.z,p.h);ctx.globalAlpha=Math.max(0,p.t*2);ctx.fillStyle=p.col;const s=Math.max(1.5,5*k);ctx.fillRect(x-s/2,y-s/2,s,s);}ctx.globalAlpha=1;
  const lay=near.map(i=>[i[0],i[1],i[2]]);for(const s of squad())lay.push([s.z+16,9,s]);
  lay.sort((a,b)=>b[0]-a[0]);
  if(R.slashes)for(const s of R.slashes)drawSlash(s);
  for(const[,ty,o]of lay){if(ty===9)drawSquadMember(o);else if(ty===0)drawEnemy(o);else drawCorpse(o);}
  for(const x of R.tx){ctx.globalAlpha=Math.min(1,x.t);ctx.fillStyle=x.col;ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(x.txt,x.x,x.y);}ctx.globalAlpha=1;
  drawBossBar();
  if(R.cine)drawCine();
  if(R.banner&&!R.cine){const b=R.banner;ctx.globalAlpha=Math.min(1,b.t*2);ctx.fillStyle='#0d1016cc';ctx.fillRect(0,HOR+30,WW,44);
    ctx.fillStyle=b.col||'#ffc53d';ctx.font='18px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.txt,WW/2,HOR+59);ctx.globalAlpha=1;}
  ctx.restore();
}

/* ---------- LOOP ---------- */
let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  if(state==='play')update(dt);else{t+=dt*.3;}
  SND.setTrack(state==='intro'?'cine':(state==='play'||state==='pause'||state==='inter')?'combat':state==='over'?null:state==='win'?'title':'title');SND.setPause(state==='pause'||state==='inter');
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

/* ---------- INPUT ---------- */
let drag=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||(R&&R.cine))return;const rc=cv.getBoundingClientRect();if(tapJeep((e.clientX-rc.left-ox)/scale,(e.clientY-rc.top-oy)/scale))return;drag=e.clientX;cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(drag===null)return;SX+=(e.clientX-drag)/scale*1.25;drag=e.clientX;const l=sxLimit();SX=Math.max(-l,Math.min(l,SX));});
const endDrag=()=>drag=null;cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
const keys={};
window.addEventListener('keydown',e=>{keys[e.key]=1;});window.addEventListener('keyup',e=>{keys[e.key]=0;});
setInterval(()=>{if(state!=='play')return;const l=sxLimit();if(keys.ArrowLeft)SX=Math.max(-l,SX-9);if(keys.ArrowRight)SX=Math.min(l,SX+9);},16);
document.getElementById('pauseBtn').onclick=()=>{if(state==='play'){state='pause';ui();}};

/* ---------- UI ---------- */
const hW=document.getElementById('hWave'),hH=document.getElementById('hHp'),hG=document.getElementById('hGold');
function hudUpdate(){hW.textContent=R.stage===2?'ESCAPE':'WAVE '+R.wave;const wl=document.querySelector('.wl');if(wl)wl.textContent=R.stage===2?'TRUCK':'WALL';const wf=R.wall/R.wallMax;hH.style.width=(wf*100)+'%';hH.style.background=wf<.3?'var(--blood)':'var(--hazard)';hG.textContent=save.gold+'g';}
function waveClear(){if(R.stage===2)return;SND.waveClear();save.best=Math.max(save.best,R.wave);R.wall=Math.min(R.wallMax,R.wall+R.wallMax*.4);R.scatter=0;healAll(.3);save.gold+=5+R.wave*2;persist();if(R.wave>=STAGE_WAVES){save.cleared=Math.max(save.cleared||0,1);legacyStage(1);persist();startIntro(()=>{state='win';ui();},SHOTS2);return;}state='inter';ui();}
function gameOver(){SND.gameOver();story('commander_fell',{});legacyEnd('commander_fell');save.best=Math.max(save.best,R.wave-1);persist();state='over';ui();}
const STAGE_WAVES=5;
function freshSave(){legacy();const LG=save.legacy;save={legacy:LG,mode:save.mode||'normal',downed:{},heroes:{},weapons:['pistol'],equip:'pistol',gold:0,best:save.best,cleared:save.cleared,stats:save.stats||{},runStats:{},cmd:1,active:[],fallen:[]};persist();}
function rosterHTML(){
  let h='<h3>Commander</h3>';
  const cc=trainCost(save.cmd);
  h+=`<div class="cards"><div class="card"><div class="badge"><canvas width="128" height="128" data-por="cmd"></canvas></div><div class="cname">You<small>${WEAPONS[save.equip].name}</small></div><div class="lv">LV ${save.cmd}</div><div class="xp"><i style="width:${save.cmd>=MAXLV?100:Math.min(100,(save.cmdXp||0)/xpNeed(save.cmd)*100)}%"></i></div>
  <div class="perks">${CMD_PERKS.map((p,i)=>`<span class="perk ${save.cmd>=PERK_LV[i]?'on':''}">Lv${PERK_LV[i]} ${p}</span>`).join('')}</div>
  <button class="train" data-act="stat" data-id="cmd">Stats</button>
  <button class="train" data-act="cmd" ${save.cmd>=MAXLV||save.gold<cc?'disabled':''}>${save.cmd>=MAXLV?'Max level':'Train to Lv '+(save.cmd+1)+' · '+cc+'g'}</button></div></div>`;
  if(save.weapons.length>1)h+='<h3>Weapons · tap to equip</h3><div class="chips">'+WEAPON_ORDER.map(w=>save.weapons.includes(w)?`<button class="chip ${save.equip===w?'on':''}" data-act="eq" data-id="${w}">${WEAPONS[w].name}</button>`:`<span class="chip locked">Locked</span>`).join('')+'</div>';
  h+=`<h3>Squad · ${save.active.length}/${MAX_ACTIVE} heroes deployed with you</h3><div class="cards">`;
  for(const id of HERO_ORDER){
    const H=HEROES[id],s=save.heroes[id];
    if(!s&&save.fallen.includes(id)){h+=`<div class="card locked"><div class="badge"><canvas width="128" height="128" data-st="fallen" data-por="${id}"></canvas></div><div class="cname">${H.name}<small>${HORDE()?'Fallen':'Down'}</small></div><div class="lv">†</div><div class="xp"></div><div class="perks"><span class="perk">${HORDE()?'Lost for good. Horde mode has no revives.':'Revive for gold to bring them back at half health.'}</span></div>${!HORDE()&&save.downed&&save.downed[id]?`<button class="train" data-act="revive" data-id="${id}" ${save.gold<reviveCost(id)?'disabled':''}>Revive · ${reviveCost(id)}g</button>`:''}<button class="train" data-act="stat" data-id="${id}">Stats</button></div>`;continue;}
    if(!s){h+=`<div class="card locked"><div class="badge"><canvas width="128" height="128" data-st="locked" data-por="${id}"></canvas></div><div class="cname">Unknown hero</div><div class="lv"></div><div class="xp"></div><div class="perks"><span class="perk">Joins later in the story</span></div></div>`;continue;}
    const need=xpNeed(s.lv),cost=trainCost(s.lv),mx=s.lv>=MAXLV,act=save.active.includes(id),hpf=Math.max(0,getHp(id)/maxHp(id));
    h+=`<div class="card" style="${act?'border-color:var(--hazard)':''}"><div class="badge" style="box-shadow:inset 0 0 0 2px ${H.color}"><canvas width="128" height="128" data-por="${id}"></canvas></div><div class="cname">${H.name}<small>${H.role}</small></div><div class="lv">LV ${s.lv}</div>
    <div class="xp" style="grid-column:2/4"><i style="width:${hpf*100}%;background:${hpf<.3?'var(--blood)':'var(--good)'}"></i></div>
    <div class="xp"><i style="width:${mx?100:Math.min(100,s.xp/need*100)}%"></i></div>
    <div class="perks">${H.perks.map((p,i)=>`<span class="perk ${s.lv>=PERK_LV[i]?'on':''}">Lv${PERK_LV[i]} ${p}</span>`).join('')}</div>
    <button class="train" data-act="stat" data-id="${id}">Stats</button>
    <button class="train" data-act="${act?'bench':'deploy'}" data-id="${id}" ${!act&&save.active.length>=MAX_ACTIVE?'disabled':''}>${act?'In squad · move to reserve':save.active.length>=MAX_ACTIVE?'Reserve · squad is full':'Reserve · add to squad'}</button>
    <button class="train" data-act="train" data-id="${id}" ${mx||save.gold<cost?'disabled':''}>${mx?'Max level':'Train to Lv '+(s.lv+1)+' · '+cost+'g'}</button></div>`;
  }
  return h+'</div>';
}
const POR_SRC={"cmd": "assets/por/cmd.webp?v=24461889cc", "bruno": "assets/por/bruno.webp?v=3744c0c01f", "rook": "assets/por/rook.webp?v=f5dac59da9", "blaze": "assets/por/blaze.webp?v=8a683f266f", "frost": "assets/por/frost.webp?v=09d4a6d3fb", "hex": "assets/por/hex.webp?v=38e4b79068", "volt": "assets/por/volt.webp?v=950712d37d", "nova": "assets/por/nova.webp?v=e9b3533ad0"},POR={};for(const k in POR_SRC){const im=new Image();im.onload=()=>{if(state!=='play')drawPortraits();};im.src=POR_SRC[k];POR[k]=im;}
function porReady(id){const im=POR[id];return im&&im.complete&&im.naturalWidth;}
let statId='cmd',statBack='roster';
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
  hud.hidden=!(state==='play'||state==='pause');
  ov.hidden=state==='play'||state==='intro';
  resize();
  let html='';
  ov.classList.toggle('title-mode',state==='menu'||state==='splash');
  if(state==='splash'){ov.innerHTML=`<div class="mscreen" data-act="begin"><div class="mbg"></div><div class="mglow"></div><div class="mgrain"></div><div class="mvig" style="background:rgba(11,8,14,.55)"></div>
    <div class="msplash"><div class="mlogo"></div><button class="mbtn play" data-act="begin">Tap to start</button><div class="mrot"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 14a9 9 0 0 0 6 6M21 10a9 9 0 0 0-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Rotate your phone sideways for widescreen</div><div class="mbest">Sound on for the full experience</div></div></div>`;return;}
  ov.classList.toggle('paper',['inter','roster','load','options','credits','bye','over','win','win2','stat','modes'].includes(state));
  if(state==='menu'){
    ov.innerHTML=`<div class="mscreen"><div class="mbg"></div><div class="mglow"></div>
      <div class="mgas g1"></div><div class="mgas g2"></div><div class="mgrain"></div><div class="mvig"></div>
      <div class="mside"><h1 class="mlogo"><span class="sr">Holdout Squad: The Zombie Chronicles</span></h1>
        <nav class="mnav" aria-label="Main menu">
          <button class="mbtn play" data-act="modes">Play</button>
          <button class="mbtn" data-act="load">Load</button>
          <button class="mbtn" data-act="options">Options</button>
          <button class="mbtn" data-act="credits">Credits</button>
          <button class="mbtn" data-act="bye">Quit</button>
        </nav>
        ${save.best?`<div class="mbest">Best wave ${save.best}</div>`:''}
      </div></div>`;
    if(R)hudUpdate();return;
  }
  if(state==='modes'){
    html=`<h2>Choose your mode</h2><div class="stripe"></div>
    <div class="card" style="grid-template-columns:1fr"><div class="cname">Normal<small>For the story</small></div>
      <div class="perks"><span class="perk on">Fallen heroes can be revived with gold</span><span class="perk">Standard enemy numbers and damage</span></div>
      <button class="btn" data-act="pickmode" data-mode="normal">Play Normal</button></div>
    <div class="card" style="grid-template-columns:1fr"><div class="cname">Horde<small>No second chances</small></div>
      <div class="perks"><span class="perk" style="border-color:var(--blood);color:var(--blood)">Permadeath: fallen heroes are gone</span><span class="perk" style="border-color:var(--blood);color:var(--blood)">Enemies deal 15% more damage</span><span class="perk" style="border-color:var(--blood);color:var(--blood)">Twice as many enemies</span></div>
      <button class="btn" data-act="pickmode" data-mode="horde">Play Horde</button></div>
    <button class="btn ghost" data-act="menu">Back</button>`;
  }else if(state==='load'){
    html=`<h2>Stages</h2><div class="stripe"></div><p class="sub">Mode: ${HORDE()?'Horde':'Normal'}</p>
    <div class="card" style="grid-template-columns:1fr auto"><div class="cname">Stage 1 · The Outskirts<small>${STAGE_WAVES} waves</small></div><div class="lv">${save.best>=STAGE_WAVES?'CLEARED':save.best?'BEST: WAVE '+save.best:'NEW'}</div></div>
    <div class="btns"><button class="btn" data-act="retry">Play Stage 1 (skip intro)</button></div>
    ${(save.cleared||0)>=1?`<div class="card" style="grid-template-columns:1fr auto"><div class="cname">Stage 2 · The Escape<small>Convoy chase</small></div><div class="lv">${(save.cleared||0)>=2?'CLEARED':'OPEN'}</div></div><div class="btns"><button class="btn" data-act="stage2">Play Stage 2</button></div>`:`<div class="card locked" style="grid-template-columns:1fr auto"><div class="cname">Stage 2 · The Escape<small>Clear Stage 1 to unlock</small></div><div class="lv">LOCKED</div></div>`}
    <button class="btn ghost" data-act="menu">Back</button>`;
  }else if(state==='options'){
    html=`<h2>Options</h2><div class="stripe"></div>
    <h3>How to play</h3>
    <ul class="how"><li>Drag left and right to move the squad behind the wall</li><li>You fire straight down the road, so line up with your target</li><li>Heroes auto-target the horde</li><li>When Bruno's jeep flips, tap it fast to pull him out before the horde wrecks it</li><li>New heroes join as the story unfolds. If one falls, they are gone for the rest of the run</li><li>Hold for 5 waves to secure the Outskirts</li><li>Spend gold between waves to train. Best played with your phone sideways</li></ul>
    <h3>Sound</h3>
    <div class="btns"><button class="btn ghost" data-act="mus">Music: ${SND.pref.music?'On':'Off'}</button><button class="btn ghost" data-act="sfx">Sound effects: ${SND.pref.sfx?'On':'Off'}</button></div>
    <h3>Story</h3>
    <div class="btns"><button class="btn ghost" data-act="intro">Watch the intro</button><button class="btn ghost" data-act="intro2">Watch Stage 1 ending</button>${(save.cleared||0)>=2?'<button class="btn ghost" data-act="intro3">Watch Rook arrives</button><button class="btn ghost" data-act="intro4">'+(save.route?'Watch the fork in the road':'Choose the road')+'</button>':''}</div>
    <h3>Progress</h3>
    <div class="btns"><button class="btn ghost" data-act="reset">Reset progress</button></div>
    <button class="btn ghost" data-act="menu">Back</button>`;
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
    <button class="btn ghost" data-act="menu">Back to title</button>`;
  }else if(state==='inter'){
    html=`<div class="row"><h2>Wave ${R.wave} held</h2><span class="big">${save.gold}g</span></div><div class="stripe"></div>${rosterHTML()}
    <div class="btns"><button class="btn" data-act="next">Next wave</button></div>`;
  }else if(state==='roster'){
    html=`<div class="row"><h2>Squad</h2><span class="big">${save.gold}g</span></div><div class="stripe"></div>${rosterHTML()}<div class="btns"><button class="btn ghost" data-act="menu">Back</button></div>`;
  }else if(state==='pause'){
    html=`<h2 style="margin-top:6vh">Paused</h2><div class="btns"><button class="btn" data-act="resume">Resume</button><button class="btn ghost" data-act="quit">Quit to menu</button></div>`;
  }else if(state==='over'){
    html=`<h1 class="title" style="color:var(--blood)">OVERRUN</h1><div class="stripe"></div>
    <div class="row"><span class="sub">Reached wave</span><span class="big">${R.wave}</span></div>
    <p class="sub">The Commander fell and the Outskirts are lost. Try again to retake the wall from wave 1.</p>
    <div class="btns"><button class="btn" data-act="${R&&R.stage===2?'stage2':'retry'}">Try again</button><button class="btn ghost" data-act="menu">Menu</button></div>`;
  }else if(state==='win'){
    const alive=['cmd',...save.active].length,lost=save.fallen.length;
    html=`<h1 class="title">STAGE 1<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">The Outskirts base has fallen, but the convoy got out. The squad holds the road as the trucks head into the night.</p>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${alive}</span></div>
    ${lost?`<div class="row"><span class="sub">Fallen</span><span class="big" style="color:var(--blood)">${save.fallen.map(h=>HEROES[h].name).join(', ')}</span></div>`:''}
    <div class="row"><span class="sub">Gold earned</span><span class="big">${save.gold}g</span></div>
    <div class="btns"><button class="btn" data-act="stage2">Continue to Stage 2</button><button class="btn ghost" data-act="menu">Back to title</button></div>`;
  }else if(state==='stat'){
    html=statHTML(statId);
  }else if(state==='win2'){
    html=`<h1 class="title">STAGE 2<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">The Ward went down in the road behind them. The convoy floors it into the night, with ${['cmd',...save.active].length===1?'the Commander alone':['cmd',...save.active].length+' fighters'} on the roof of the last truck.</p>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${['cmd',...save.active].length}</span></div>
    <div class="row"><span class="sub">Gold</span><span class="big">${save.gold}g</span></div>
    ${save.route?`<p class="sub">${save.route==='highway'?'The convoy stayed on the highway together.':(save.heroes.bruno?'The convoy took the backroad into the forest. Bruno went on alone toward Cyber Future.':'The convoy took the backroad into the forest.')}</p>`:''}
    <p class="sub">Stage 3 is coming soon.</p>
    <div class="btns"><button class="btn" data-act="menu">Back to title</button><button class="btn ghost" data-act="stage2">Play Stage 2 again</button></div>`;
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
  else if(a==='retry'){freshSave();legacyStart(save.mode||'normal');SX=0;camX=0;newRun(1);}
  else if(a==='stage2'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:2});}SX=0;camX=0;startStage2();}
  else if(a==='intro4'){const rec=!save.route;startFork(()=>{state='options';ui();},rec);}
  else if(a==='intro3'){startIntro(()=>{state='options';ui();},SHOTS3);}
  else if(a==='intro2'){startIntro(()=>{state='options';ui();},SHOTS2);}
  else if(a==='intro'){startIntro(()=>{state='options';ui();});}
  else if(a==='next'){startWave_(R.wave+1);}
  else if(a==='resume'){state='play';ui();last=performance.now();}
  else if(a==='quit'||a==='menu'){R=null;state='menu';ui();}
  else if(a==='roster'){R=null;state='roster';ui();}
  else if(a==='load'||a==='options'||a==='credits'||a==='bye'){state=a;ui();}
  else if(a==='reset'){if(b.dataset.armed){save={heroes:{},weapons:['pistol'],equip:'pistol',gold:0,best:0,cmd:1,active:[],fallen:[]};persist();ui();}else{b.dataset.armed='1';b.textContent='Tap again to erase everything';}}
  else if(a==='eq'){save.equip=b.dataset.id;persist();ui();}
  else if(a==='cmd'){const c=trainCost(save.cmd);if(save.gold>=c&&save.cmd<MAXLV){save.gold-=c;save.cmd++;save.cmdXp=0;persist();ui();}}
  else if(a==='stat'){statId=b.dataset.id;statBack=state;state='stat';ui();ov.scrollTop=0;}
  else if(a==='statback'){state=statBack||'roster';ui();}
  else if(a==='bench'){save.active=save.active.filter(h=>h!==b.dataset.id);persist();ui();}
  else if(a==='deploy'){if(save.active.length<MAX_ACTIVE&&!save.active.includes(b.dataset.id))save.active.push(b.dataset.id);persist();ui();}
  else if(a==='train'){const s=save.heroes[b.dataset.id],c=trainCost(s.lv);if(save.gold>=c&&s.lv<MAXLV){save.gold-=c;s.xp=0;s.lv++;persist();ui();}}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'){state='pause';ui();}});

/* ---------- INTRO CUTSCENE: riso-print panels with partial animation ---------- */
const CINE_META={"gas": {"n": 6, "fw": 330.4, "fh": 248.49999999999997}, "crowd": {"n": 6, "fw": 237.99999999999997, "fh": 239.39999999999998}, "arm": {"n": 6, "fw": 209.4, "fh": 288.0}, "shadow": {"n": 6, "fw": 268, "fh": 102.0}, "wave": {"n": 4, "fw": 411, "fh": 117.0}, "lift": {"n": 4, "fw": 402.0, "fh": 492.0}, "bike": {"n": 4, "fw": 332.0, "fh": 300.8}, "leap": {"n": 4, "fw": 247.20000000000002, "fh": 326.40000000000003}, "bikef": {"n": 4, "fw": 350.40000000000003, "fh": 324.0}, "c3horde": {"n": 8, "fw": 320.4, "fh": 175.79999999999998}, "c3truck": {"n": 8, "fw": 137.5, "fh": 128.0}, "c3smoke": {"n": 8, "fw": 164.4, "fh": 103.2}, "c3peek": {"n": 8, "fw": 164.4, "fh": 121.8}, "c3beam": {"n": 8, "fw": 191.79999999999998, "fh": 72.8}, "c3fog": {"n": 8, "fw": 411.20000000000005, "fh": 192.8}, "c3spark": {"n": 8, "fw": 306.0, "fh": 162.0}, "c3fire": {"n": 8, "fw": 175.5, "fh": 210.6}, "c3ember": {"n": 8, "fw": 156.0, "fh": 160.0}, "c3flash": {"n": 8, "fw": 175.5, "fh": 176.4}};
const CINE_SRC={"s1": "assets/cine/s1.webp?v=243c333768", "s2": "assets/cine/s2.webp?v=550e74da9a", "s3": "assets/cine/s3.webp?v=70cc779e19", "s4": "assets/cine/s4.webp?v=a7032a396c", "s5": "assets/cine/s5.webp?v=d9c16aae06", "s6": "assets/cine/s6.webp?v=7be0ebed55", "s7": "assets/cine/s7.webp?v=fc9f6ba24a", "s8": "assets/cine/s8.webp?v=1621073ea0", "gas": "assets/cine/gas.webp?v=315d27fe85", "crowd": "assets/cine/crowd.webp?v=63ce1e7073", "arm": "assets/cine/arm.webp?v=6bf76ce38f", "shadow": "assets/cine/shadow.webp?v=d6f37fc102", "wave": "assets/cine/wave.webp?v=23e8a4a53d", "w1": "assets/cine/w1.webp?v=c8f04b9c22", "w2": "assets/cine/w2.webp?v=0ed40fe71c", "w3": "assets/cine/w3.webp?v=70c8685020", "w4": "assets/cine/w4.webp?v=dbcff62397", "w5": "assets/cine/w5.webp?v=b5b30b1db7", "w6": "assets/cine/w6.webp?v=af200e06c2", "w7": "assets/cine/w7.webp?v=3950081f16", "w8": "assets/cine/w8.webp?v=f8d626832c", "lift": "assets/cine/lift.webp?v=370ce17c98", "r1": "assets/cine/r1.webp?v=3e4ef51c5c", "r2": "assets/cine/r2.webp?v=897e15e59c", "r3": "assets/cine/r3.webp?v=a15a18c818", "r4": "assets/cine/r4.webp?v=77c15a6004", "r5": "assets/cine/r5.webp?v=97fb173298", "r6": "assets/cine/r6.webp?v=3ac4fdbb0d", "bike": "assets/cine/bike.webp?v=c67a4ad3e0", "leap": "assets/cine/leap.webp?v=970a293fe8", "bikef": "assets/cine/bikef.webp?v=ee94861b81", "b1": "assets/cine/b1.webp?v=ec2cd2723f", "b2": "assets/cine/b2.webp?v=01cf7f9c7b", "b6": "assets/cine/b6.webp?v=b63e26f414", "b7": "assets/cine/b7.webp?v=b6c3b43136", "b8": "assets/cine/b8.webp?v=f269e85dc3", "br1": "assets/cine/br1.webp?v=26cde8d39b", "x01": "assets/cine/x01.webp?v=57c1a8b59a", "x02": "assets/cine/x02.webp?v=278ed750fd", "xa3": "assets/cine/xa3.webp?v=63f1e488b3", "xa4": "assets/cine/xa4.webp?v=e283c3e464", "xa5": "assets/cine/xa5.webp?v=c231911ed0", "xa6": "assets/cine/xa6.webp?v=5d44e267c6", "xa7": "assets/cine/xa7.webp?v=b3f5f31b96", "xb3": "assets/cine/xb3.webp?v=759b78c0b1", "xb4": "assets/cine/xb4.webp?v=df36359644", "xb5": "assets/cine/xb5.webp?v=319fbf1c6f", "xb6": "assets/cine/xb6.webp?v=dc55f12004", "xb7": "assets/cine/xb7.webp?v=2603ef086d", "xb8": "assets/cine/xb8.webp?v=213337a3cb", "xv1": "assets/cine/xv1.webp?v=f0b1f7bc58", "xv2": "assets/cine/xv2.webp?v=f08c546b7d", "xv3": "assets/cine/xv3.webp?v=8dfbfd654f", "xv4": "assets/cine/xv4.webp?v=0519294f79", "xv5": "assets/cine/xv5.webp?v=2de26c5075", "xv6": "assets/cine/xv6.webp?v=8bdeb41aa8", "xv7": "assets/cine/xv7.webp?v=457158d6d8", "c3horde": "assets/cine/c3horde.webp?v=51a1bcd882", "c3truck": "assets/cine/c3truck.webp?v=c3d079edb1", "c3smoke": "assets/cine/c3smoke.webp?v=104b4fcda5", "c3peek": "assets/cine/c3peek.webp?v=f5ee9d072a", "c3beam": "assets/cine/c3beam.webp?v=cf0d9e068c", "c3fog": "assets/cine/c3fog.webp?v=e27d3109d8", "c3spark": "assets/cine/c3spark.webp?v=8ec95a2788", "c3ember": "assets/cine/c3ember.webp?v=386f756069", "c3flash": "assets/cine/c3flash.webp?v=d9e65b2ea5"};
const CI={};const CINE_FILES=['s1','s2','s3','s4','s5','s6','s7','s8','gas','crowd','arm','shadow','wave','w1','w2','w3','w4','w5','w6','w7','w8','lift','r1','r2','r3','r4','r5','r6','bike','leap','bikef','b1','b2','b6','b7','b8','br1'];
const CINE_SHEETS=['gas','crowd','arm','shadow','wave','lift','bike','leap','bikef'];
function cineLoadKeys(keys){for(const k of keys){if(CI[k]||!CINE_SRC[k])continue;const im=new Image();im.decoding='async';im.src=CINE_SRC[k];CI[k]=im;}}
function cineLoad(list){if(!list){cineLoadKeys(CINE_SHEETS);return;}const ks=[];for(const s of list){ks.push(s.bg);if(typeof NOBRUNO!=='undefined'&&NOBRUNO[s.bg])ks.push(NOBRUNO[s.bg].bg);}cineLoadKeys(ks);}
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
 {bg:'r2',d:7,vo:"Then a single headlight came tearing up the highway, passing truck after truck.",cam:p=>({cx:.5,cy:lerp(.5,.6,p),z:lerp(1,1.25,ease(p))}),snd:()=>SND.engineSet(true),
  fx(c,tt){const B=x=>{const q=Math.min(1,x/6.5),e=q*q;return{v:lerp(.67,1.02,e),w:lerp(.075,.34,e)};},b=B(tt);
    const KS=[[2.9,-1],[4.1,1],[5.2,-1],[6.0,1]];let f=0;
    for(const[tk]of KS){const d=tt-tk;if(d>-.18&&d<0)f=1;else if(d>=0&&d<.22)f=2;else if(d>=.22&&d<.4)f=3;}
    const rs=[];for(const[tk,side]of KS){const bk=B(tk),u=.5+side*bk.w*.62,rh=bk.w*1.25,d=tt-tk;if(d<-2.2)continue;
      if(d<0){const M=META.runner;rs.push([bk.v,()=>c.atlas(M.walk[Math.floor(tt*12+tk*5)%M.walk.length],u,bk.v-.005,rh)]);}
      else if(d<1.1){const M=META.runner,n=M.death.length;rs.push([bk.v,()=>c.atlas(M.death[Math.min(n-1,Math.floor(d*9))],u+side*d*.03,bk.v,rh,Math.max(0,1-(d-.6)/.5))]);}}
    rs.sort((a,b2)=>a[0]-b2[0]).forEach(r=>{if(r[0]<b.v)r[1]();});
    c.sheet('bikef',f,.5,b.v,b.w,'bottom');{const hv=b.v-b.w*IW/IH*CINE_META.bikef.fh/CINE_META.bikef.fw*.36;c.glow(.5,hv,b.w*.35,.75+.2*Math.sin(tt*20));}
    rs.forEach(r=>{if(r[0]>=b.v)r[1]();});
    if(f===2)c.flash(.12);}},
 {bg:'r3',d:7,vo:"Rook: \"Sorry I'm late. Traffic was murder.\"",cam:p=>({cx:.5,cy:.52,z:1.04}),snd:()=>{SND.engineSet(false);setTimeout(()=>SND.slash(-.4),1500);setTimeout(()=>SND.slash(.4),3200);setTimeout(()=>SND.slash(-.4),4800);},
  fx(c,tt){const P_=x=>{const q=ease(Math.min(1,x/6));return{u:lerp(.3,.37,q),v:lerp(1.12,.98,q),w:lerp(.5,.4,q)};},b=P_(tt);
    const KS=[[1.5,-1],[3.2,1],[4.8,-1]];let f=0;
    for(const[tk]of KS){const d=tt-tk;if(d>-.2&&d<0)f=1;else if(d>=0&&d<.24)f=2;else if(d>=.24&&d<.42)f=3;}
    const rs=[];for(const[tk,side]of KS){const bk=P_(tk),d=tt-tk,u=bk.u+side*bk.w*.38,rv=bk.v-.07,rh=bk.w*.62;if(d<-1.6)continue;
      if(d<0){const M=META.runner;rs.push(()=>c.atlas(M.walk[Math.floor(tt*13+tk*5)%M.walk.length],u+side*(-d)*.02,rv,rh,Math.min(1,(1.6+d)*3)));}
      else if(d<1.1){const M=META.runner,n=M.death.length;rs.push(()=>c.atlas(M.death[Math.min(n-1,Math.floor(d*9))],u+side*d*.05,rv,rh,Math.max(0,1-(d-.6)/.5)));}}
    rs.forEach(r=>r());c.sheet('bike',f,b.u,b.v,b.w,'bottom');if(f===2)c.flash(.1);}},
 {bg:'r4',d:6,vo:"He hit a ramp of wreckage and launched into the air.",cam:p=>({cx:.5,cy:.5,z:1.04}),snd:()=>SND.engineSet(true),
  fx(c,tt){const T1=2.6,T2=3.6;if(tt>T2+.4){SND.engineSet(false);return;}
    const ang=-.42;let u,v,w,rot;
    if(tt<T1){const q=ease(Math.min(1,tt/T1));u=lerp(.36,.71,q);v=lerp(.93,.63,q);w=lerp(.17,.13,q);rot=ang*Math.min(1,q*3);}
    else{const q=(tt-T1)/(T2-T1);u=lerp(.71,1.12,q);v=lerp(.63,-.12,q)-Math.sin(Math.PI*q)*.06;w=lerp(.13,.11,q);rot=ang-q*.35;}
    c.sheetR('bikef',0,u,v,w*1.25,rot);if(tt>T1&&tt<T1+.12)c.shake=4;}},
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
function storyCut(list){const brunoGone=!save.heroes.bruno;return list.map(s=>brunoGone&&NOBRUNO[s.bg]&&!(s.vo||'').startsWith('It tore')?Object.assign({},s,NOBRUNO[s.bg]):s);}

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
  fx(c,tt){const on=!(((tt%2.3)>1.9&&(tt%2.3)<2.0)||((tt%2.3)>2.1&&(tt%2.3)<2.15));c.glow(.3,.11,.08,on?.55:.05);fogLow(c,tt,.72,.6,.55);
    if(tt>5.2&&tt<5.9){const q=(tt-5.2)/.7;c.sheet('shadow',3,lerp(.82,.98,q),.66,.07,'bottom',.75*Math.sin(Math.PI*q));}}},
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
function forkCrew(){return{bruno:!!save.heroes.bruno,rook:!!save.heroes.rook};}
function forkBranch(route){const{rook}=forkCrew(),F=FORK;
  if(route==='highway')return[F.xa3,F.xa4,F.xa5,F.xa6,rook?F.xa7:F.xv7];
  return[F.xb3,F.xb4,rook?F.xb5:F.xv5,F.xb6,F.xb7,rook?F.xb8:F.xv6];}
function forkList(){const{bruno,rook}=forkCrew(),F=FORK;
  if(!bruno){const B=forkBranch('backroad');return[F.xv1,rook?F.xv2:F.xv3,B[3],B[4],B[5]];}
  return[F.x01,rook?F.x02:F.xv4];}
/* record=true on the real run: saves the pick and logs it to the story record */
function startFork(done,record){cineLoadKeys(FORK_KEYS);const forced=!forkCrew().bruno;
  startIntro(()=>{const route=cine0pick||'backroad';cine0pick=null;
    if(record){const crew=forkCrew();save.route=route;story('choice',{id:'fork_road',pick:route,forced,crew});
      if(route==='backroad'&&crew.bruno)story('hero_split',{hero:'bruno',to:'cyber_future_lab'});persist();}
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
  clayer.querySelector('.cskip').addEventListener('click',e=>{e.stopPropagation();if(cine&&!cine0pick){const j=cine.list.findIndex((q,k)=>k>=cine.i&&q.choiceAt!=null);if(j>=0){if(j!==cine.i){cine.i=j;cine.lc=0;SND.whoosh();}cine.tt=Math.max(cine.tt,cine.list[j].choiceAt);return;}}endIntro();});
  ccv.addEventListener('pointerdown',()=>{if(!cine)return;const sh=cine.list[cine.i];if(sh.choiceAt!=null&&!cine0pick){cine.tt=Math.max(cine.tt,sh.choiceAt);return;}if(cine.tt<sh.d-.8)cine.tt=sh.d-.8;});
  GRAIN=document.createElement('canvas');GRAIN.width=GRAIN.height=180;const g=GRAIN.getContext('2d'),id=g.createImageData(180,180);
  for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=Math.random()<.5?40:0;}g.putImageData(id,0,0);
}
function startIntro(done,list){cineEl();cineLoad();cineLoad(list||SHOTS);cine={i:0,tt:0,done,last:performance.now(),list:storyCut(list||SHOTS)};state='intro';ui();clayer.hidden=false;requestAnimationFrame(cineFrame);}
function endIntro(){if(!cine)return;const d=cine.done;cine=null;clayer.hidden=true;const ch=clayer.querySelector('.cchoice');if(ch)ch.remove();SND.engineSet(false);d&&d();}
function cineFrame(now){
  if(!cine)return;
  const dt=Math.min(.05,(now-cine.last)/1000);cine.last=now;cine.tt+=dt;
  const L=cine.list,sh=L[cine.i];if(sh.choiceAt!=null&&!cine0pick&&cine.tt>=sh.choiceAt){cine.tt=sh.choiceAt;forkShowChoice();}if(!cine.snd){cine.snd=1;SND.whoosh();sh.snd&&sh.snd();}if(cine.tt>=sh.d){cine.i++;cine.tt=0;if(cine.i>=L.length){endIntro();return;}SND.whoosh();L[cine.i].snd&&L[cine.i].snd();const k=L===SHOTS?cine.i:-1;if(k===2)SND.hiss();if(k===3)SND.thunder();if(k===4)SND.buzz();if(k===5)SND.explosion(.4);}
  const S=cine.list[cine.i],r=clayer.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  if(ccv.width!==Math.round(r.width*dpr)||ccv.height!==Math.round(r.height*dpr)){ccv.width=Math.round(r.width*dpr);ccv.height=Math.round(r.height*dpr);}
  const W=ccv.width,H=ccv.height,tt=cine.tt,p=tt/S.d,cam=S.cam(p),s=Math.max(W/IW,H/IH)*cam.z;
  cctx.setTransform(1,0,0,1,0,0);cctx.fillStyle='#0b080e';cctx.fillRect(0,0,W,H);
  const c=cineCtl(W,H,s,cam);
  const im=CI[S.bg];
  if(im&&im.complete&&im.naturalWidth){cctx.save();
    const prev=c.shake;
    cctx.drawImage(im,W/2-cam.cx*IW*s,H/2-cam.cy*IH*s,IW*s,IH*s);
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
window.__canReload=()=>['splash','menu','options','credits','load','modes','bye'].includes(state);
ui();requestAnimationFrame(loop);setTimeout(()=>{cineLoad(SHOTS);cineLoad();},800);
})();
