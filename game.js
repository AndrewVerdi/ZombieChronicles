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

const ATLAS_SRC="assets/atlas.webp?v=5a324c8981";
const ATL_DATA={"rects":[[0,0,84,149,42,150],[86,0,86,150,43,150],[174,0,85,150,42,150],[261,0,91,150,45,150],[354,0,87,150,43,150],[443,0,83,150,41,150],[528,0,90,150,45,150],[620,0,90,144,45,150],[712,0,87,150,43,150],[801,0,85,148,42,150],[888,0,90,150,45,149],[980,0,89,148,44,149],[1071,0,89,144,44,148],[1162,0,87,143,43,148],[1251,0,83,145,36,145],[1336,0,81,145,36,145],[1419,0,110,154,32,154],[1531,0,105,154,36,154],[1638,0,90,147,39,146],[1730,0,85,147,39,146],[1817,0,89,145,44,145],[1908,0,110,141,55,141],[0,156,126,142,63,141],[128,156,89,141,44,144],[219,156,103,137,52,143],[324,156,117,137,58,140],[443,156,76,150,33,150],[521,156,78,150,32,150],[601,156,70,151,35,151],[673,156,69,150,29,151],[744,156,79,150,30,150],[825,156,73,150,35,150],[900,156,87,151,43,150],[989,156,88,151,44,150],[1079,156,87,151,43,150],[1168,156,90,151,45,150],[1260,156,89,151,44,150],[1351,156,71,149,36,148],[1424,156,75,146,37,147],[1501,156,76,147,38,148],[1579,156,81,145,40,146],[1662,156,75,144,37,145],[1739,156,79,146,39,147],[1820,156,74,144,36,145],[1896,156,77,143,39,147],[0,309,80,142,41,143],[82,309,103,142,39,142],[187,309,131,142,39,144],[320,309,139,153,38,154],[461,309,117,142,39,142],[580,309,80,141,40,140],[662,309,75,115,37,114],[739,309,85,108,42,109],[826,309,91,108,45,109],[919,309,75,118,37,117],[996,309,83,108,42,110],[1081,309,90,109,45,110],[1173,309,101,151,50,150],[1276,309,99,151,49,150],[1377,309,100,151,50,150],[1479,309,100,151,50,150],[1581,309,99,151,49,150],[1682,309,101,147,50,146],[1785,309,87,154,44,154],[1874,309,86,155,43,155],[1962,309,84,155,42,155],[0,466,84,155,42,155],[86,466,85,155,42,155],[173,466,85,155,42,155],[260,466,86,155,43,155],[348,466,86,156,43,155],[436,466,97,154,48,153],[535,466,125,147,44,148],[662,466,142,165,45,165],[806,466,187,170,45,171],[995,466,195,167,54,169],[1192,466,183,157,53,158],[1377,466,105,159,52,158],[1484,466,115,159,56,158],[1601,466,122,159,61,159],[1725,466,118,159,59,158],[1845,466,115,159,58,158],[0,638,116,159,58,158],[118,638,92,150,46,149],[212,638,92,152,46,151],[306,638,93,152,46,151],[401,638,91,154,46,153],[494,638,92,150,46,149],[588,638,92,148,46,147],[682,638,99,149,49,148],[783,638,90,149,45,149],[875,638,94,149,46,151],[971,638,89,149,44,149],[1062,638,94,149,46,149],[1158,638,93,146,46,149],[1253,638,96,150,47,150],[1351,638,87,151,43,151],[1440,638,99,151,41,150],[1541,638,83,151,35,151],[1626,638,102,152,36,151],[1730,638,82,151,36,150],[1814,638,83,147,37,146],[1899,638,95,151,40,150],[0,799,96,146,47,145],[98,799,96,144,47,143],[196,799,114,139,57,140],[312,799,94,148,46,147],[408,799,105,143,52,143],[515,799,127,141,63,141],[644,799,85,151,36,150],[731,799,101,150,37,150],[834,799,82,151,33,150],[918,799,82,154,35,153],[1002,799,99,152,35,151],[1103,799,82,153,34,152],[1187,799,90,152,45,150],[1279,799,89,152,45,150],[1370,799,87,153,44,151],[1459,799,84,152,42,150],[1545,799,89,152,45,150],[1636,799,84,149,42,147],[1722,799,77,162,38,160],[1801,799,82,162,41,160],[1885,799,77,164,38,162],[1964,799,81,161,40,159],[0,965,83,157,41,163],[85,965,82,165,41,163],[169,965,81,165,41,163],[252,965,77,165,38,163],[331,965,105,156,52,155],[438,965,108,155,45,153],[548,965,152,155,41,153],[702,965,192,156,46,155],[896,965,201,159,52,157],[1099,965,161,155,55,153],[1262,965,119,168,59,167],[1383,965,125,168,63,166],[1510,965,145,166,73,165],[1657,965,115,168,56,166],[1774,965,125,169,62,167],[1901,965,122,169,61,167],[0,1136,97,151,49,150],[99,1136,94,152,47,151],[195,1136,96,152,48,151],[293,1136,102,151,50,150],[397,1136,101,151,50,150],[500,1136,100,151,49,150],[602,1136,91,151,45,150],[695,1136,85,148,43,150],[782,1136,85,149,42,151],[869,1136,87,151,44,150],[958,1136,84,151,42,150],[1044,1136,86,151,43,150],[1132,1136,91,149,45,150],[1225,1136,85,148,42,150],[1312,1136,87,151,47,150],[1401,1136,76,149,38,148],[1479,1136,77,150,38,149],[1558,1136,91,150,38,149],[1651,1136,75,150,37,149],[1728,1136,75,150,37,149],[1805,1136,107,139,53,138],[1914,1136,118,137,59,136],[0,1290,142,135,71,134],[144,1290,116,128,58,127],[262,1290,130,126,64,124],[394,1290,133,125,67,123],[529,1290,87,151,41,150],[618,1290,90,153,48,152],[710,1290,88,153,46,152],[800,1290,90,156,49,155],[892,1290,101,156,45,155],[995,1290,88,156,48,155],[1085,1290,118,143,50,143],[1205,1290,101,142,46,142],[1308,1290,112,143,38,143],[1422,1290,143,142,40,142],[1567,1290,153,141,48,141],[1722,1290,149,143,64,142],[1873,1290,110,150,55,150],[0,1448,109,151,54,151],[111,1448,110,152,55,152],[223,1448,109,150,54,150],[334,1448,109,149,54,148],[445,1448,108,149,54,149],[555,1448,115,152,57,154],[672,1448,105,149,52,153],[779,1448,108,150,54,154],[889,1448,107,150,53,153],[998,1448,105,152,52,154],[1105,1448,110,150,56,154],[1217,1448,104,149,52,155],[1323,1448,106,155,53,157],[1431,1448,119,151,55,150],[1552,1448,90,149,38,148],[1644,1448,100,162,39,161],[1746,1448,88,150,38,149],[1836,1448,90,150,37,149],[1928,1448,99,151,38,150],[0,1612,117,141,58,140],[119,1612,123,139,61,139],[244,1612,143,138,72,138],[389,1612,115,143,57,142],[506,1612,113,139,56,140],[621,1612,135,139,67,140],[758,1612,100,144,50,144],[860,1612,92,156,37,156],[954,1612,86,145,37,145],[1042,1612,83,147,37,147],[1127,1612,90,157,34,156],[1219,1612,85,147,37,147],[1306,1612,118,152,54,150],[1426,1612,115,152,55,150],[1543,1612,109,152,55,150],[1654,1612,108,152,54,150],[1764,1612,110,152,54,150],[1876,1612,106,152,53,150],[0,1771,90,150,46,148],[92,1771,90,148,45,148],[184,1771,90,149,45,148],[276,1771,90,148,45,148],[368,1771,87,148,43,148],[457,1771,90,149,45,148],[549,1771,91,149,45,148],[642,1771,92,149,46,148],[736,1771,128,132,55,130],[866,1771,123,133,41,131],[991,1771,138,132,41,130],[1131,1771,136,132,43,130],[1269,1771,114,132,44,130],[1385,1771,117,131,41,129],[1504,1771,120,146,59,144],[1626,1771,123,146,60,144],[1751,1771,128,146,63,144],[1881,1771,123,148,61,146],[0,1923,124,147,62,145],[126,1923,124,146,61,144],[252,1923,98,116,48,119],[352,1923,84,122,42,121],[438,1923,102,120,51,119],[542,1923,93,122,46,122],[637,1923,105,115,52,114],[744,1923,99,122,49,121],[845,1923,96,118,48,117],[943,1923,94,122,47,121],[1039,1923,105,107,52,106],[1146,1923,131,119,65,118],[1279,1923,134,122,67,122],[1415,1923,136,142,68,142],[1553,1923,106,107,53,106],[1661,1923,110,107,55,106],[1773,1923,113,113,56,112],[1888,1923,94,113,47,112],[0,2072,106,97,53,97],[108,2072,112,75,55,75],[222,2072,120,59,60,58],[344,2072,119,92,59,92],[465,2072,118,62,61,62],[585,2072,76,121,38,120],[663,2072,75,121,37,120],[740,2072,75,121,38,120],[817,2072,75,121,38,120],[894,2072,74,121,37,120],[970,2072,78,121,39,120],[1050,2072,75,121,38,120],[1127,2072,75,121,37,120],[1204,2072,70,92,35,92],[1276,2072,94,93,47,93],[1372,2072,102,93,51,93],[1476,2072,113,94,56,94],[1591,2072,119,96,59,96],[1712,2072,100,82,49,82],[1814,2072,69,93,34,94],[1885,2072,69,92,29,93],[1956,2072,80,92,42,93],[0,2195,86,90,44,91],[88,2195,87,90,40,89],[177,2195,79,90,34,90],[258,2195,69,78,34,78],[329,2195,89,78,44,77],[420,2195,101,81,50,80],[523,2195,111,82,55,82],[636,2195,75,75,37,75],[713,2195,85,73,42,72],[800,2195,90,69,45,69],[892,2195,57,82,28,82],[951,2195,67,76,33,76],[1020,2195,72,65,36,65],[1094,2195,91,57,45,57],[1187,2195,98,84,48,85],[1287,2195,110,84,55,85],[1399,2195,111,65,55,65],[1512,2195,109,47,54,47],[1623,2195,65,123,32,121],[1690,2195,66,121,33,120],[1758,2195,65,120,32,119],[1825,2195,67,120,33,119],[1894,2195,66,122,33,121],[1962,2195,70,122,35,121],[0,2320,68,121,33,120],[70,2320,70,120,35,119],[142,2320,82,124,41,123],[226,2320,102,123,50,122],[330,2320,112,127,56,125],[444,2320,114,121,57,119],[560,2320,81,125,41,123],[643,2320,89,125,44,124],[734,2320,100,118,50,117],[836,2320,86,136,43,135],[924,2320,91,116,45,115],[1017,2320,91,102,45,102],[1110,2320,101,83,47,82],[1213,2320,122,64,58,63],[1337,2320,138,46,65,45],[1477,2320,66,117,33,115],[1545,2320,72,119,36,118],[1619,2320,67,121,33,121],[1688,2320,71,120,35,119],[1761,2320,71,121,35,121],[1834,2320,69,122,34,121],[1905,2320,69,122,34,121],[1976,2320,71,118,35,117],[0,2458,88,117,44,115],[90,2458,108,126,54,125],[200,2458,117,127,59,126],[319,2458,103,100,51,98],[424,2458,80,119,40,117],[506,2458,102,127,51,126],[610,2458,111,120,55,119],[723,2458,89,121,44,122],[814,2458,99,107,49,107],[915,2458,102,87,51,87],[1019,2458,113,67,56,66],[1134,2458,133,50,67,52],[1269,2458,144,42,72,41],[1415,2458,82,112,41,118],[1499,2458,92,113,46,120],[1593,2458,92,112,46,118],[1687,2458,90,120,45,119],[1779,2458,92,121,46,120],[1873,2458,93,115,46,122],[0,2587,94,117,47,123],[96,2587,94,115,47,122],[192,2587,124,117,62,116],[318,2587,126,112,63,112],[446,2587,122,122,61,122],[570,2587,157,102,76,101],[729,2587,121,121,60,120],[852,2587,126,122,63,121],[980,2587,134,118,67,117],[1116,2587,115,127,57,126],[1233,2587,112,111,56,110],[1347,2587,110,99,55,98],[1459,2587,117,86,58,85],[1578,2587,132,69,66,68],[1712,2587,145,56,71,55],[1859,2587,77,120,38,119],[1938,2587,80,122,40,120],[0,2716,80,122,40,120],[82,2716,77,122,38,121],[161,2716,78,121,39,120],[241,2716,79,121,39,120],[322,2716,83,122,41,120],[407,2716,84,121,42,120],[493,2716,98,122,49,124],[593,2716,109,119,54,120],[704,2716,108,121,54,121],[814,2716,154,117,77,116],[970,2716,96,124,48,123],[1068,2716,106,125,53,124],[1176,2716,115,125,58,124],[1293,2716,99,134,49,132],[1394,2716,109,124,51,123],[1505,2716,120,107,60,106],[1627,2716,131,97,65,97],[1760,2716,140,67,69,67],[0,2852,151,53,75,53],[153,2852,109,118,54,118],[264,2852,106,120,53,119],[372,2852,105,119,52,118],[479,2852,105,123,52,122],[586,2852,108,122,54,121],[696,2852,109,125,55,125],[807,2852,104,127,52,126],[913,2852,109,120,55,118],[1024,2852,145,131,72,132],[1171,2852,161,127,81,127],[1334,2852,173,149,86,148],[1509,2852,132,128,66,127],[1643,2852,135,142,67,140],[1780,2852,144,154,72,153],[0,3008,163,154,83,153],[165,3008,119,120,59,119],[286,3008,116,121,58,120],[404,3008,120,122,60,120],[526,3008,131,122,65,120],[659,3008,119,122,59,120],[780,3008,119,122,59,120],[901,3008,102,120,51,118],[1005,3008,90,120,45,118],[1097,3008,135,139,68,137],[1234,3008,150,143,76,141],[1386,3008,124,160,61,159],[1512,3008,135,160,64,159],[1649,3008,158,125,76,123],[1809,3008,156,134,77,132],[0,3170,148,121,74,121],[150,3170,178,123,89,123],[330,3170,207,134,103,133],[539,3170,235,137,117,135],[776,3170,126,122,63,120],[904,3170,157,120,78,118],[1063,3170,168,122,84,120],[1233,3170,110,137,55,136],[1345,3170,110,129,55,128],[1457,3170,113,123,56,122],[1572,3170,123,116,61,114],[1697,3170,134,101,66,100],[1833,3170,135,99,66,97],[0,3309,139,89,69,87],[141,3309,136,88,68,86],[279,3309,111,117,55,116],[392,3309,102,120,51,119],[496,3309,107,123,54,122],[605,3309,104,124,52,123],[711,3309,108,122,54,121],[821,3309,103,120,51,120],[926,3309,102,121,51,120],[1030,3309,91,116,45,115],[1123,3309,142,130,71,129],[1267,3309,143,133,71,132],[1412,3309,121,160,61,159],[1535,3309,125,161,62,160],[1662,3309,148,148,77,147],[1812,3309,155,137,76,136],[0,3472,96,96,0,0],[98,3472,96,96,0,0],[196,3472,96,96,0,0],[294,3472,96,96,0,0],[392,3472,96,96,0,0],[490,3472,96,96,0,0],[588,3472,96,96,0,0]],"meta":{"hex":{"idle":[0,1,2,3,4,5],"run":[6,7,8,9,10,11,12,13],"shoot":[14,15,16,17,18,19],"leanL":[20,21,22],"leanR":[23,24,25],"wshoot":[26,27,28,29,30,31]},"frost":{"idle":[32,33,34,35,36],"run":[37,38,39,40,41,42,43,44],"shoot":[45,46,47,48,49,50],"leanL":[51,52,53],"leanR":[54,55,56]},"volt":{"idle":[57,58,59,60,61,62],"run":[63,64,65,66,67,68,69,70],"shoot":[71,72,73,74,75,76],"leanL":[77,78,79],"leanR":[80,81,82]},"cmd":{"idle":[83,84,85,86,87,88],"run":[89,90,91,92,93,94,95,96],"shoot":[97,98,99,100,101,102],"leanL":[103,104,105],"leanR":[106,107,108],"wshoot":[109,110,111,112,113,114]},"blaze":{"idle":[115,116,117,118,119,120],"run":[121,122,123,124,125,126,127,128],"shoot":[129,130,131,132,133,134],"leanL":[135,136,137],"leanR":[138,139,140]},"rook":{"idle":[141,142,143,144,145,146],"run":[147,148,149,150,151,152,153,154],"shoot":[155,156,157,158,159,160],"leanL":[161,162,163],"leanR":[164,165,166],"wshoot":[167,168,169,170,171,172],"slash":[173,174,175,176,177,178]},"bruno":{"idle":[179,180,181,182,183,184],"run":[185,186,187,188,189,190,191,192],"shoot":[193,194,195,196,197,198],"leanL":[199,200,201],"leanR":[202,203,204],"wshoot":[205,206,207,208,209,210]},"nova":{"idle":[211,212,213,214,215,216],"run":[217,218,219,220,221,222,223,224],"shoot":[225,226,227,228,229,230],"leanL":[231,232,233],"leanR":[234,235,236]},"screecher":{"walk":[237,238,239,240,241,242,243,244],"attack":[245,246,247,248],"hit":[249,250,251],"death":[252,253,254,255,256,257]},"momma":{"walk":[258,259,260,261,262,263,264,265],"summon":[266,267,268,269,270,271],"throw":[272,273,274,275,276,277],"shriek":[278,279,280,281],"hit":[282,283,284],"death":[285,286,287,288,289,290,291,292]},"grunt":{"walk":[293,294,295,296,297,298,299,300],"attack":[301,302,303,304],"hit":[305,306,307],"death":[308,309,310,311,312,313]},"runner":{"walk":[314,315,316,317,318,319,320,321],"attack":[322,323,324,325],"hit":[326,327,328],"death":[329,330,331,332,333,334]},"brute":{"walk":[335,336,337,338,339,340,341,342],"attack":[343,344,345,346],"hit":[347,348,349],"death":[350,351,352,353,354,355]},"armored":{"walk":[356,357,358,359,360,361,362,363],"attack":[364,365,366,367],"hit":[368,369,370],"death":[371,372,373,374,375,376]},"splitter":{"walk":[377,378,379,380,381,382,383,384],"hit":[385,386,387],"death":[388,389,390,391]},"boss":{"walk":[392,393,394,395,396,397,398,399],"throw":[400,401,402,403,404,405],"roar":[406,407,408,409],"hit":[410,411,412],"death":[413,414,415,416,417,418,419,420]},"boss2":{"walk":[421,422,423,424,425,426,427,428],"throwcar":[429,430,431,432,433,434]},"por":{"hex":435,"frost":436,"volt":437,"blaze":438,"rook":439,"bruno":440,"nova":441}}};
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
const JOIN_LV={bruno:2,rook:4,hex:5};
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
function checkpoint(){if(!R)return;markReach(R.forest?'3f':String(R.stage||1),R.stage===2?1:R.wave);save.ckpt={stage:R.forest?'3f':(R.stage||1),wave:R.stage===2?1:R.wave,hex:!!save.heroes.hex};persist();}
function clearCkpt(){if(save.ckpt){delete save.ckpt;persist();}}
const ckptLabel=c=>c.stage===2?'Stage 2 · The Escape':c.stage===3?(c.wave==='end'?'Stage 3 · The Empty Town, ending':'Stage 3 · The Empty Town, wave '+c.wave):c.stage==='3f'?(c.wave==='end'?'Stage 3 · The Forest, ending':'Stage 3 · The Forest, wave '+c.wave):'Stage 1 · wave '+c.wave;
function resumeCkpt(){const c=save.ckpt;if(!c)return;if(!legacy().current)legacyStart(save.mode||'normal');SX=0;camX=0;
  if(c.stage===2)startStage2();
  else if(c.stage===3){startStage3();if(c.wave==='end'){R.wave=3;startTownEnd();}else if(c.wave>1)startWave3(c.wave);}
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
const TOWN_R={"house3": [0, 0, 362, 500], "shop4": [364, 0, 430, 480], "house4": [796, 0, 450, 478], "shop1": [1248, 0, 431, 473], "shop5": [0, 502, 428, 473], "house1": [430, 502, 328, 468], "house0": [760, 502, 456, 467], "shop2": [1218, 502, 427, 467], "shop0": [0, 977, 423, 465], "shop3": [425, 977, 415, 462], "house2": [842, 977, 505, 457], "house5": [1349, 977, 494, 449], "lampOn": [1845, 977, 166, 386], "lampOff": [0, 1444, 166, 386], "news": [168, 1444, 185, 296], "car1": [355, 1444, 329, 278], "mailbox": [686, 1444, 187, 276], "car2": [875, 1444, 340, 263], "car3": [1217, 1444, 341, 260], "car0": [1560, 1444, 339, 245], "trash": [0, 1832, 351, 241], "hydrant": [353, 1832, 156, 231], "barricade": [511, 1832, 310, 218], "bench": [823, 1832, 383, 207], "bike": [1208, 1832, 340, 207], "civ5_1": [1550, 1832, 95, 167], "civ5_2": [1647, 1832, 97, 167], "civ0_0": [1746, 1832, 92, 166], "civ0_1": [1840, 1832, 89, 166], "civ0_2": [1931, 1832, 93, 166], "civ0_4": [0, 2075, 89, 166], "civ0_5": [91, 2075, 84, 166], "civ5_0": [177, 2075, 96, 166], "civ5_3": [275, 2075, 96, 166], "civ0_3": [373, 2075, 90, 165], "civ4_0": [465, 2075, 101, 164], "civ4_2": [568, 2075, 103, 164], "civ5_4": [673, 2075, 94, 164], "civ2_2": [769, 2075, 95, 163], "civ2_0": [866, 2075, 91, 162], "civ2_4": [959, 2075, 88, 162], "civ2_5": [1049, 2075, 87, 162], "civ5_5": [1138, 2075, 92, 162], "civ2_1": [1232, 2075, 91, 161], "civ2_3": [1325, 2075, 96, 161], "civ4_1": [1423, 2075, 101, 161], "civ4_3": [1526, 2075, 103, 161], "civ5_7": [1631, 2075, 92, 161], "civ4_4": [1725, 2075, 101, 160], "civ4_5": [1828, 2075, 99, 160], "civ0_7": [1929, 2075, 94, 156], "civ2_7": [0, 2243, 89, 156], "civ3_0": [91, 2243, 114, 153], "civ3_1": [207, 2243, 112, 152], "civ3_7": [321, 2243, 112, 152], "civ4_7": [435, 2243, 104, 151], "civ3_2": [541, 2243, 111, 150], "civ3_4": [654, 2243, 112, 150], "civ3_3": [768, 2243, 110, 149], "civ3_5": [880, 2243, 109, 145], "civ1_0": [991, 2243, 102, 144], "civ1_1": [1095, 2243, 100, 144], "civ1_2": [1197, 2243, 101, 143], "civ1_4": [1300, 2243, 106, 143], "civ1_3": [1408, 2243, 103, 142], "civ1_5": [1513, 2243, 102, 142], "civ1_7": [1617, 2243, 106, 142], "civ0_6": [1725, 2243, 94, 141], "civ2_6": [1821, 2243, 95, 138], "civ4_6": [1918, 2243, 104, 137], "civ5_6": [0, 2401, 100, 135], "civ3_6": [102, 2401, 120, 129], "civ1_6": [224, 2401, 116, 120]};const TOWNIMG=new Image();let townReady=false;TOWNIMG.onload=()=>{townReady=true;};
const SKY3IMG=new Image();let sky3Ready=false;SKY3IMG.onload=()=>{sky3Ready=true;};const STREET3=new Image();let street3Ready=false;STREET3.onload=()=>{street3Ready=true;};
function townLoad(){if(TOWNIMG.src)return;TOWNIMG.src="assets/town.webp?v=b607b70880";SKY3IMG.src="assets/sky3.webp?v=c5b518ab42";STREET3.src="assets/street3.webp?v=1022fa651e";}
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
function drawFacadeSide(side){
  const X=side*BLD_X,tw=FACADES[0].width;
  const iA=Math.floor((20+roadScroll)/BLD_SEG),iB=Math.floor((3200+roadScroll)/BLD_SEG);
  ctx.imageSmoothingEnabled=false;
  for(let i=iB;i>=iA;i--){const h=hash3(i*3+(side>0?1:0)),gap=hash3(i*5+side)<.12;
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
  if(state==='play')roadScroll+=dt*WALK;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(sky3Ready){ctx.imageSmoothingEnabled=true;const sh=152,sw=sh*SKY3IMG.width/SKY3IMG.height;ctx.fillStyle='#120a1a';ctx.fillRect(-20,-20,WW+40,HOR+30);ctx.drawImage(SKY3IMG,WW/2-sw/2,HOR+5-sh,sw,sh);ctx.imageSmoothingEnabled=false;}
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
    if(kind==='lamp'&&townReady){const g=Math.floor((roadScroll+z)/620),dead=hash3(g*7)<.3,ph=(t*.9+hash3(i+g)*5)%3,on=!dead&&!(ph>2.6&&ph<2.68)&&!(ph>2.75&&ph<2.8);
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
  if(state==='play')roadScroll+=dt*WALK;
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
function drawSay(){const s=R.say;if(!s||R.cine)return;const a=Math.min(1,s.t*2),nm=s.who==='cmd'?'COMMANDER':HEROES[s.who].name.toUpperCase(),col=s.who==='cmd'?'#ffc53d':HEROES[s.who].color;
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
function bossFxUpdate(dt){
  if(R.claws){for(const c of R.claws){c.t+=dt;if(c.t>=1.2&&!c.hit){c.hit=1;R.shake=Math.max(R.shake||0,.25);SND.explosion(.35);burst(c.x,c.z,30,'#b6f23a',14);
      for(const m of squad())if(Math.abs(m.x-c.x)<62&&Math.abs(m.z-c.z)<44)hurtMember(m.id,20/HURT_K);}}R.claws=R.claws.filter(c=>c.t<2);}
  if(R.dag){for(const p of R.dag){p.t+=dt;const q=Math.max(0,Math.min(1,p.t/p.T));p.x=p.x0+(p.x1-p.x0)*q;p.z=p.z0+(p.z1-p.z0)*q;p.h=p.h0+(50-p.h0)*q;
      if(q>=1&&!p.done){p.done=1;burst(p.x,p.z,40,'#e8dcb0',8);for(const m of squad())if(Math.abs(m.x-p.x)<46&&Math.abs(m.z-p.z)<40)hurtMember(m.id,9/HURT_K);}}R.dag=R.dag.filter(p=>!p.done);}
}
function drawClaw(c){const[sx,sy,k]=P(c.x,c.z);if(c.t<1.2){const pl=.5+.5*Math.sin(t*16);ctx.fillStyle='rgba(182,242,58,'+(.12+.25*pl*Math.min(1,Math.max(0,c.t)*2))+')';ctx.strokeStyle='rgba(182,242,58,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,64*k,20*k,0,0,6.283);ctx.fill();ctx.stroke();}
  if(c.t<0)return;const f=c.t<1.2?Math.floor(c.t*4)%2:Math.min(7,2+Math.floor((c.t-1.2)*8));fSpr('claw'+f,c.x,c.z+4,.95);}
function drawDag(p){if(p.t<0)return;fSpr('dagger'+(Math.floor(p.t*14)%4),p.x,p.z,.55,{h:p.h,mid:1});}
function mommaFrame(e){const M=META.momma;if(e.act){const A=M[e.act],q=Math.min(.999,e.at/MACT[e.act].d);return A[Math.floor(q*A.length)];}return M.walk[Math.floor(t*(e.z>445?7:4))%M.walk.length];}

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
function miniShow(){if(clayer.querySelector('.cmini'))return;const cf=typeof cine.list[cine.i].mini==='object'?cine.list[cine.i].mini:{};cine.mg={fill:0,left:cf.time||6,cf,shT:1.2,shI:0};const d=document.createElement('div');d.className='cmini';
  d.innerHTML='<div class="mlab">'+(cf.label||'BREAK HER HOLD!')+'</div><div class="mbar"><i></i></div><div class="mtime">'+(cf.time||6).toFixed(1)+'</div><button type="button">TAP!</button>';
  const tap=e=>{e.preventDefault();e.stopPropagation();if(!cine||!cine.mg||cine.mg.res)return;cine.mg.fill=Math.min(1,cine.mg.fill+1/(cf.taps||28));SND.click();if(cine.mg.fill>=1){miniEnd(true);return;}const b=d.querySelector('button');b.classList.remove('hit');void b.offsetWidth;b.classList.add('hit');};
  d.addEventListener('pointerdown',tap);clayer.appendChild(d);}
function miniTick(dt){const g=cine.mg;if(!g||g.res)return;if(g.fill>=1){miniEnd(true);return;}g.left-=dt;g.fill=Math.max(0,g.fill-(g.cf.decay||.04)*dt);if(g.cf.shouts){g.shT-=dt;if(g.shT<=0){g.shT=2.1;feShout(g.shI++);}}const d=clayer.querySelector('.cmini');
  if(d){d.querySelector('.mbar i').style.width=(g.fill*100)+'%';d.querySelector('.mtime').textContent=Math.max(0,g.left).toFixed(1);}
  if(g.fill>=1)miniEnd(true);else if(g.left<=0)miniEnd(false);}
function feShout(i){const L=[['Commander','Hex, any time now!'],['Rook',"I'm running dry here!"],['Commander',"They're on top of us!"],['Rook','Whatever you are doing, do it faster!'],['Commander','HEX!']].filter(x=>x[0]!=='Rook'||(FECREW&&FECREW.rook));const x=L[i%L.length];let d=clayer.querySelector('.cshout');if(!d){d=document.createElement('div');d.className='cshout';d.style.cssText='position:absolute;left:50%;top:16%;transform:translateX(-50%) rotate(-2deg);background:#0d1016e6;border:2px solid #ffc53d;color:#efe6dc;font:15px Bungee,Impact,sans-serif;padding:6px 12px;pointer-events:none;white-space:nowrap;z-index:5';clayer.appendChild(d);}d.innerHTML='<span style="color:#ffc53d">'+x[0].toUpperCase()+':</span> '+x[1];d.style.top=(3+(i%3)*4)+'%';d.style.left=(i%2?62:38)+'%';SND.shot(x[0]==='Rook'?'pistol':'rifle',0);}
function miniEnd(won){const g=cine.mg;g.res=won?'won':'lost';cineLastMini=g.res;cine0pick='mini';const d=clayer.querySelector('.cmini');if(d)d.remove();
  if(won)SND.levelUp();else SND.explosion(.3);
  const sh=clayer.querySelector('.cshout');if(sh)sh.remove();
  if(g.cf&&g.cf.branch){cine.list=cine.list.slice(0,cine.i+1).concat(g.cf.branch(won));cine.tt=Math.max(cine.tt,cine.list[cine.i].d-.7);return;}
  const crew=cine.crew,C=FC,br=won?[C.w1,C.w2].concat(crew.rook?[C.w3,C.f6]:[C.rv3]):[C.l1,crew.rook?C.l2:C.rv2];
  cine.list=cine.list.slice(0,cine.i+1).concat(br);cine.tt=Math.max(cine.tt,cine.list[cine.i].d-.7);}
function startForestCut(n,done,record){cineLoadKeys(FCUT_KEYS);const crew={rook:!!save.heroes.rook&&save.active.includes('rook'),hex:!!save.heroes.hex&&save.active.includes('hex')};
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
 {k:'3f',name:'Stage 3 · The Forest',waves:[1,2,3,4,'end'],heroes:w=>w==='end'||w>1?['rook','hex']:['rook']}];
let LSEL=null,LOADSEL=null;
function reachOf(k){const R0=(save.reach&&save.reach[k])||0,c=save.cleared||0;
  if(k==='1')return Math.max(R0,c>=1?5:Math.min(5,(save.best||0)+1),1);
  if(k==='2')return Math.max(R0,c>=1?1:0);
  if(k==='3')return Math.max(R0,c>=2&&save.route==='highway'?1:0,c>=3&&save.route==='highway'?3:0);
  if(k==='3f')return Math.max(R0,c>=2&&save.route==='backroad'?1:0,save.forestDone?4:0);return 0;}
const reachEnd=()=>!!(save.reach&&save.reach['3e'])||((save.cleared||0)>=3&&save.route==='highway');
const waveOpen=(k,w)=>w==='end'?(k==='3f'?!!(save.reach&&save.reach['3fe'])||!!save.forestDone:reachEnd()):reachOf(k)>=w;
function markReach(k,w){save.reach=save.reach||{};if(w==='end'){save.reach[k==='3f'?'3fe':'3e']=1;return;}save.reach[k]=Math.max(save.reach[k]||0,w);}
function loadHTML(){const BUILD=(window.__VER||'artifact').slice(0,6);if(!LSEL){const b=BOARDS.find(b=>reachOf(b.k)>0)||BOARDS[0];LSEL={k:b.k,w:1,h:{bruno:1,rook:1,hex:1}};}
  let h=`<h2>Load</h2><div class="stripe"></div><p class="sub">Testing tool. Start any board you've reached, from any wave, with any squad that belongs there. Mode: ${HORDE()?'Horde':'Normal'}. Build ${BUILD}.</p>`;
  for(const b of BOARDS){const open=reachOf(b.k)>0,sel=LSEL.k===b.k;
    if(!open){h+=`<div class="card locked" style="grid-template-columns:1fr auto"><div class="cname">${b.name}<small>Not reached yet</small></div><div class="lv">LOCKED</div></div>`;continue;}
    h+=`<div class="card" style="grid-template-columns:1fr auto;cursor:pointer;${sel?'border-color:#ff6a2b':''}" data-act="lb" data-k="${b.k}"><div class="cname">${b.name}<small>${sel?'Selected':'Tap to choose'}</small></div><div class="lv">${sel?'●':''}</div></div>`;
    if(!sel)continue;
    h+=`<h3>Start from</h3><div class="chips">${b.waves.map(w=>{const ok=waveOpen(b.k,w);return `<button class="chip ${LSEL.w===w?'on':''}" data-act="lw" data-w="${w}" ${ok?'':'disabled style="opacity:.35"'}>${w==='end'?'Ending':b.waves.length>1?'Wave '+w:'Start'}</button>`;}).join('')}</div>`;
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
  const b=R.en.find(e=>(e.type==='boss'||e.type==='momma')&&e.z<ZFAR);if(!b)return;
  const w=WW*.46,x=WW/2-w/2,y=66;ctx.fillStyle='#0b080ecc';ctx.fillRect(x-4,y-14,w+8,26);
  ctx.fillStyle='#b6f23a';ctx.font='11px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.type==='momma'?'MOMMA':'THE WARD',WW/2,y-3);
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
const ENEMY_NAMES={grunt:'Grunt',runner:'Runner',armored:'Armored',brute:'Brute',splitter:'Splitter',screecher:'Screecher',boss:'The Ward',momma:'Momma'};
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
    for(const o of R.en)if(o!==e&&!o.dead){o.dead=1;burst(o.x,o.z,o.r,o.col,8);if(META[o.type])R.dead.push({type:o.type,x:o.x,z:o.z,r:o.r,t:0});}
    R.banner={txt:'MOMMA IS DEAD',t:2.6,col:'#b6f23a'};}
  const hm=HORDE()&&e.type!=='boss'&&e.type!=='momma'?.5:1;save.gold+=Math.round(e.gold*10);SND.die(e.type,e.x/600);
  if(R.jail)hitJail(R.jail.max*.035);
  if(e.split){for(let k=-1;k<=1;k+=2){const m=mkEnemy('runner',e.x+k*26,e.z);m.gold=1;if(e.elite){m.hp*=2;m.max=m.hp;}}}
  /* XP: the killer gets it all, everyone else in the squad gets a 20% share */
  for(const id of['cmd',...save.active]){const x=e.xp*hm*(id===own?1:XP_SHARE);if(id==='cmd')cmdXp(x);else giveXp(id,x);}
  R.kills=(R.kills||0)+1;if(own==='cmd'){R.cmdKills=(R.cmdKills||0)+1;if(save.cmd>=5&&R.cmdKills%10===0)rally();}
  if(e.type==='boss')story('boss_defeated',{boss:'the_ward',by:own});
  if(e.type==='boss'&&R.stage===2){R.escapeT=3.2;R.spawnLeft=0;}
  if(e.type==='boss'){R.banner={txt:R.stage===2?'THE CONVOY BREAKS FREE':'THE WARD IS DOWN',t:3,col:'#b6f23a'};SND.explosion(.7);R.shake=.6;R.proj=[];}
  if(META[e.type]){R.dead.push({type:e.type,x:e.x,z:e.z,r:e.r,t:0,elite:e.elite});burst(e.x,e.z,e.r,e.col,5);}
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
    R.spawnT=R.forest?spawnPaceF():R.stage===3?spawnPace3():Math.max(.3,1.85-R.wave*.12)*(.7+Math.random()*.6);
    const pack=R.forest?Math.min(R.spawnLeft,packF()):R.stage===3?Math.min(R.spawnLeft,R.wave===3?1+Math.floor(Math.random()*2.6):1):Math.min(R.spawnLeft,1+Math.floor(Math.random()*(R.wave/3)));
    for(let k=0;k<pack;k++){const idx=R.spawnTotal-R.spawnLeft;
    if(R.crateAt.includes(idx))spawnCrate();
    if(idx===R.jeepAt){R.cinePending=true;R.jeepAt=-1;break;}
    if(R.bossPending&&idx>=Math.floor(R.spawnTotal*.6)){spawnBoss();R.bossPending=false;}
    spawnEnemy();if(R.stage===2&&HORDE())spawnEnemy();R.spawnLeft--;}}}
  supUpdate(dt);abilUpdate(dt);R.saveT=(R.saveT||0)-dt;if(R.saveT<=0){R.saveT=4;persist();}
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
  if(R&&R.stage===3){if(R.forest)drawForestWorld(dt);else drawTownWorld(dt);return;}
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
  if(st.a==='shoot'&&R&&R.stage===3&&M.wshoot){if(t-st.last<.35)return M.wshoot[Math.floor(t*9+id.length)%M.wshoot.length];st.a='run';st.t=0;}
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
  if(R&&R.stage===3&&M.run)return M.run[Math.floor(st.t*9)%M.run.length];
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
  const M=META[d.type],[sx,sy,k]=P(d.x,d.z),n=d.type==='splitter'?4:M.death.length,f=Math.min(n-1,Math.floor(d.t*11));
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(sx,sy,d.r*1.1*k,d.r*.3*k,0,0,6.283);ctx.fill();
  drawFrame(M.death[f],sx,sy,k*d.r*EH/EBODY*(d.type==='boss'?BOSS_VIS:d.type==='momma'?1.7:1),Math.max(0,Math.min(1,(1.6-d.t)/.5)));
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
  if(atlasReady&&R&&R.stage===3&&anim(s.id).a==='shoot'&&META[s.id].run&&!META[s.id].wshoot){const sc=k*CHAR_H/BODY_PX,fr=heroFrame(s.id),M=META[s.id],rf=M.run[Math.floor(t*9+(s.id.length))%M.run.length],cut=sy-WAIST_PX*sc;
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
  const lay=near.map(i=>[i[0],i[1],i[2]]);if(!R.blz)for(const s of squad())lay.push([s.z+16,9,s]);if(R.civ&&!R.civHide)for(const c of R.civ){if(c.hp>0)lay.push([c.z+12,10,c]);if(R.forest&&c.van!=null&&c.van<.9)lay.push([c.z+11,14,c]);}
  lay.sort((a,b)=>b[0]-a[0]);
  if(R.slashes)for(const s of R.slashes)drawSlash(s);
  for(const[,ty,o]of lay){if(ty===14)drawVanish(o);else if(ty===10)drawCiv(o);else if(ty===9)drawSquadMember(o);else if(ty===0)drawEnemy(o);else drawCorpse(o);}
  for(const x of R.tx){ctx.globalAlpha=Math.min(1,x.t);ctx.fillStyle=x.col;ctx.font='12px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(x.txt,x.x,x.y);}ctx.globalAlpha=1;
  if(R.forest)drawStuns();
  if(R.blz)drawBlaze();
  drawBossBar();
  if(R.cine)drawCine();
  if(R.banner&&!R.cine){const b=R.banner;ctx.globalAlpha=Math.min(1,b.t*2);ctx.fillStyle='#0d1016cc';ctx.fillRect(0,HOR+30,WW,44);
    ctx.fillStyle=b.col||'#ffc53d';ctx.font='18px Bungee, Impact, sans-serif';ctx.textAlign='center';ctx.fillText(b.txt,WW/2,HOR+59);ctx.globalAlpha=1;}
  if(R.forest&&R.say)drawSay();
  ctx.restore();
}

/* ---------- LOOP ---------- */
let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  if(state==='play')update(dt);else if(state==='blaze')blazeUpdate(dt);else{t+=dt*.3;}
  SND.setTrack(state==='intro'?'cine':(state==='play'||state==='blaze'||state==='pause'||state==='inter')?'combat':state==='over'?null:state==='win'?'title':'title');SND.setPause(state==='pause'||state==='inter');
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
let drag=null,tap0=null;
cv.addEventListener('pointerdown',e=>{if(state==='blaze'){const rc=cv.getBoundingClientRect();blazeTap((e.clientX-rc.left-ox)/scale);try{cv.setPointerCapture(e.pointerId);}catch(_){}return;}if(state!=='play'||(R&&R.cine))return;const rc=cv.getBoundingClientRect();if(tapJeep((e.clientX-rc.left-ox)/scale,(e.clientY-rc.top-oy)/scale))return;tap0={x:e.clientX,y:e.clientY,t:performance.now(),gx:(e.clientX-rc.left-ox)/scale,gy:(e.clientY-rc.top-oy)/scale};drag=e.clientX;cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(state==='blaze'){const rc=cv.getBoundingClientRect();blazeAim((e.clientX-rc.left-ox)/scale);return;}if(drag===null)return;if(stunned('cmd')){drag=e.clientX;return;}SX+=(e.clientX-drag)/scale*1.25;drag=e.clientX;const l=sxLimit();SX=Math.max(-l,Math.min(l,SX));});
const endDrag=()=>drag=null;cv.addEventListener('pointerup',e=>{if(tap0&&state==='play'&&Math.hypot(e.clientX-tap0.x,e.clientY-tap0.y)<14&&performance.now()-tap0.t<400)tapSuper(tap0.gx,tap0.gy);tap0=null;});cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointerup',()=>{if(state==='blaze')blazeUp();});cv.addEventListener('pointercancel',()=>{if(state==='blaze')blazeUp();});cv.addEventListener('pointercancel',endDrag);
const keys={};
window.addEventListener('keydown',e=>{keys[e.key]=1;});window.addEventListener('keyup',e=>{keys[e.key]=0;});
setInterval(()=>{if(state!=='play'||stunned('cmd'))return;const l=sxLimit();if(keys.ArrowLeft)SX=Math.max(-l,SX-9);if(keys.ArrowRight)SX=Math.min(l,SX+9);},16);
document.getElementById('pauseBtn').onclick=()=>{if(state==='play'){state='pause';ui();}};

/* ---------- UI ---------- */
const hW=document.getElementById('hWave'),hH=document.getElementById('hHp'),hG=document.getElementById('hGold');
function hudUpdate(){const hb=hH.parentElement;if(hb)hb.style.display='';if(R.forest){hW.textContent='WAVE '+R.wave+'/'+F_WAVES;const wl=document.querySelector('.wl'),mb=R.en.find(e=>e.type==='momma');if(wl)wl.textContent='SURVIVORS '+civsAlive().length;const f=civsAlive().length/CIV_N;hH.style.width=(f*100)+'%';hH.style.background=R.wave>1&&f<.4?'var(--blood)':'var(--hazard)';hG.textContent=save.gold.toLocaleString();return;}if(R.stage===3){hW.textContent='WAVE '+R.wave+'/'+S3_WAVES;const wl=document.querySelector('.wl');if(wl)wl.textContent='SURVIVORS '+civsAlive().length;const f=civsAlive().length/CIV_N;hH.style.width=(f*100)+'%';hH.style.background=f<.4?'var(--blood)':'var(--hazard)';hG.textContent=save.gold.toLocaleString();return;}hW.textContent=R.stage===2?'ESCAPE':'WAVE '+R.wave;const wl=document.querySelector('.wl');if(wl)wl.textContent=R.stage===2?'TRUCK':'WALL';const wf=R.wall/R.wallMax;hH.style.width=(wf*100)+'%';hH.style.background=wf<.3?'var(--blood)':'var(--hazard)';hG.textContent=save.gold.toLocaleString();}
function waveClear(){if(R.stage===2)return;if(R.stage===3){if(R.forest)waveClearF();else waveClear3();return;}SND.waveClear();save.best=Math.max(save.best,R.wave);R.wall=Math.min(R.wallMax,R.wall+R.wallMax*.4);R.scatter=0;healRecovery();save.gold+=50+R.wave*20;persist();if(R.wave>=STAGE_WAVES){save.cleared=Math.max(save.cleared||0,1);legacyStage(1);persist();startIntro(()=>{save.ckpt={stage:2,wave:1};persist();state='win';ui();},SHOTS2);return;}state='inter';ui();}
function gameOver(){clearCkpt();SND.gameOver();story('commander_fell',{});legacyEnd('commander_fell');save.best=Math.max(save.best,R.wave-1);persist();state='over';ui();}
const STAGE_WAVES=5;
function freshSave(){legacy();const LG=save.legacy;save={legacy:LG,mode:save.mode||'normal',downed:{},heroes:{},weapons:['pistol'],equip:'pistol',gold:0,best:save.best,cleared:save.cleared,stats:save.stats||{},runStats:{},cmd:1,active:[],fallen:[]};persist();}
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
const POR_SRC={"cmd": "assets/por/cmd.webp?v=24461889cc", "bruno": "assets/por/bruno.webp?v=3744c0c01f", "rook": "assets/por/rook.webp?v=f5dac59da9", "blaze": "assets/por/blaze.webp?v=8a683f266f", "frost": "assets/por/frost.webp?v=09d4a6d3fb", "hex": "assets/por/hex.webp?v=38e4b79068", "volt": "assets/por/volt.webp?v=950712d37d", "nova": "assets/por/nova.webp?v=e9b3533ad0"},POR={};for(const k in POR_SRC){const im=new Image();im.onload=()=>{if(state!=='play')drawPortraits();};im.src=POR_SRC[k];POR[k]=im;}
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
  hud.hidden=!(state==='play'||state==='pause');
  ov.hidden=state==='play'||state==='intro'||state==='blaze';
  resize();
  let html='';
  ov.classList.toggle('title-mode',state==='menu'||state==='splash');
  if(state==='splash'){ov.innerHTML=`<div class="mscreen" data-act="begin"><div class="mbg"></div><div class="mglow"></div><div class="mgrain"></div><div class="mvig" style="background:rgba(11,8,14,.55)"></div>
    <div class="msplash"><div class="mlogo"></div><button class="mbtn play" data-act="begin">Tap to start</button><div class="mrot"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 14a9 9 0 0 0 6 6M21 10a9 9 0 0 0-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Rotate your phone sideways for widescreen</div><div class="mbest">Sound on for the full experience</div></div></div>`;return;}
  ov.classList.toggle('paper',['inter','roster','load','options','credits','bye','over','win','win2','stat','modes','gallery','win3','win3f'].includes(state));
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
    html=`<h2>Cutscene gallery</h2><div class="stripe"></div>
    <p class="sub">Every cutscene and every version of it. Watching here never changes your save.</p>
    <h3>Opening</h3><div class="btns">${G('intro','The intro')}</div>
    <h3>Stage 1 ending</h3><div class="btns">${G('s1','Whole squad')}${G('s1b','Bruno fallen')}</div>
    <h3>Rook arrives</h3><div class="btns">${G('s2','Whole squad')}${G('s2b','Bruno fallen')}</div>
    <h3>The fork in the road</h3><p class="sub">The first two pick a road at the choice.</p><div class="btns">${G('f','Whole squad')}${G('fr','Rook fallen')}${G('fb','Bruno fallen')}${G('fbr','Bruno and Rook fallen')}</div>
    <h3>The forest</h3><p class="sub">The first one includes the Hex mini-game.</p><div class="btns">${G('fc1','Something in the trees')}${G('fc1r','Same, Rook fallen')}${G('fc2','Screeches')}${G('fc3','Momma')}</div>
    <h3>The forest ending</h3><p class="sub">The mini-game is skipped here and its result plays.</p><div class="btns">${G('fe','Hex gets them in')}${G('fexr','Same, Rook fallen')}${G('fel','The spell fizzles')}${G('fexrl','Same, Rook fallen')}${G('fen','Hex never joined')}${G('fenr','Same, Rook fallen')}</div>
    <h3>The town ending</h3><p class="sub">The mini-game is skipped here and its result plays.</p><div class="btns">${G('tw','Blaze makes it')}${G('twr','Same, Rook fallen')}${G('twb','Same, Bruno fallen')}${G('twbr','Same, both fallen')}${G('tl','Blaze is overrun')}${G('tlr','Same, Rook fallen')}${G('tlb','Same, Bruno fallen')}${G('tlbr','Same, both fallen')}</div>
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
    <div class="row"><span class="sub">Reached wave</span><span class="big">${R.wave}</span></div>
    <p class="sub">${R&&R.hexFail?'The spell fizzled at the walls of Cyber Future. The horde closed in.':R&&R.hexDied?'Hex fell. She has to survive the forest. Without her there is no way into Cyber Future.':R&&R.lostAll?(R.forest?'Every survivor is gone. The forest took them one by one.':'Every survivor is gone. The town swallowed them one by one.'):R&&R.forest?'The Commander fell in the forest.':R&&R.stage===3?'The Commander fell in the empty town.':'The Commander fell and the Outskirts are lost. Try again to retake the wall from wave 1.'}</p>
    <div class="btns"><button class="btn" data-act="${R&&R.hexFail?'fend':R&&R.forest?'stage3f':R&&R.stage===3?'stage3':R&&R.stage===2?'stage2':'retry'}">Try again</button><button class="btn ghost" data-act="menu">Menu</button></div>`;
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
  }else if(state==='win3f'){
    const hx=!!save.heroes.hex;
    html=`<h1 class="title">STAGE 3<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">Momma fell, and the forest finally went quiet. ${hx?'Hex walks with the squad now, whether she likes it or not.':'Whoever moved the survivors never showed their face again.'}</p>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${['cmd',...save.active].length}</span></div>
    <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
    <p class="sub">Stage 4 is coming soon.</p>
    <div class="btns"><button class="btn" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="stage3f">Play Stage 3 again</button></div>`;
  }else if(state==='win3'){
    const alive=['cmd',...save.active].length;
    html=`<h1 class="title">STAGE 3<span>COMPLETE</span></h1><div class="stripe"></div>
    <p class="sub">The horde broke against the squad in the middle of main street. ${(save.townSaved||0)===CIV_N?'Every survivor made it through the town.':(save.townSaved||0)+' of '+CIV_N+' survivors made it through the town.'}</p>
    ${save.blaze==='joined'?'<p class="sub"><b>Blaze</b> torched the swarm and walked through the gates of Cyber Future with the squad.</p>':save.blaze==='lost'?'<p class="sub">Blaze was overrun in the street.'+(save.blazeBruno?' Bruno went in after her.':'')+'</p>':''}
    <div class="row"><span class="sub">Survivors saved</span><span class="big">${(save.townSaved||0)} / ${CIV_N}</span></div>
    <div class="row"><span class="sub">Squad standing</span><span class="big">${alive}</span></div>
    <div class="row"><span class="sub">Score</span><span class="big">${save.gold.toLocaleString()}</span></div>
    <p class="sub">Stage 4 is coming soon.</p>
    <div class="btns"><button class="btn" data-act="menu">Back to title</button><button class="btn ghost" data-act="roster">Squad &amp; stats</button><button class="btn ghost" data-act="stage3">Play Stage 3 again</button></div>`;
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
  else if(a==='lb'){LSEL.k=b.dataset.k;LSEL.w=1;const y=ov.scrollTop;ui();ov.scrollTop=y;return;}
  else if(a==='lw'){const v=b.dataset.w;LSEL.w=v==='end'?'end':+v;const y=ov.scrollTop;ui();ov.scrollTop=y;return;}
  else if(a==='lh'){LSEL.h[b.dataset.id]=!LSEL.h[b.dataset.id];const y=ov.scrollTop;ui();ov.scrollTop=y;return;}
  else if(a==='lgo'){loadGo();return;}
  else if(a==='fend'){R.over=false;R.hexFail=0;startForestEnd();return;}
  else if(a==='stage3f'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:3,route:'backroad'});}SX=0;camX=0;startForest();}
  else if(a==='stage3'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:3});}SX=0;camX=0;startStage3();}
  else if(a==='stage2'){if(!legacy().current){legacyStart(save.mode||'normal');story('started_at_stage',{stage:2});}SX=0;camX=0;startStage2();}
  else if(a==='gallery'){state='gallery';ui();return;}
  else if(a==='gal'){const k=b.dataset.k,back=()=>{CREW_VIEW=null;state='gallery';ui();};
    CREW_VIEW={bruno:!/b/.test(k.slice(1)),rook:!/r/.test(k.slice(1))};
    if(k.startsWith('fe'))forestEndGallery(k,back);else if(k.startsWith('fc'))startForestCut(+k[2],back,false);else if(k[0]==='t')townEndGallery(k[1]==='w',back);else if(k==='intro')startIntro(back);else if(k[0]==='s'&&k[1]==='1')startIntro(back,SHOTS2);else if(k[0]==='s')startIntro(back,SHOTS3);else startFork(back,false);return;}
  else if(a==='intro4'){const rec=!save.route;startFork(()=>{state='options';ui();},rec);}
  else if(a==='intro3'){startIntro(()=>{state='options';ui();},SHOTS3);}
  else if(a==='intro2'){startIntro(()=>{state='options';ui();},SHOTS2);}
  else if(a==='intro'){startIntro(()=>{state='options';ui();});}
  else if(a==='next'){if(R.forest)forestNext();else if(R.stage===3)startWave3(R.wave+1);else startWave_(R.wave+1);}
  else if(a==='resume'){state='play';ui();last=performance.now();}
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){persist();if(state==='play'){state='pause';ui();}}});window.addEventListener('pagehide',()=>persist());

/* ---------- INTRO CUTSCENE: riso-print panels with partial animation ---------- */
const CINE_META={"gas": {"n": 6, "fw": 330.4, "fh": 248.49999999999997}, "crowd": {"n": 6, "fw": 237.99999999999997, "fh": 239.39999999999998}, "arm": {"n": 6, "fw": 209.4, "fh": 288.0}, "shadow": {"n": 6, "fw": 268, "fh": 102.0}, "wave": {"n": 4, "fw": 411, "fh": 117.0}, "lift": {"n": 4, "fw": 402.0, "fh": 492.0}, "bike": {"n": 4, "fw": 332.0, "fh": 300.8}, "leap": {"n": 4, "fw": 247.20000000000002, "fh": 326.40000000000003}, "bikef": {"n": 4, "fw": 350.40000000000003, "fh": 324.0}, "c3horde": {"n": 8, "fw": 320.4, "fh": 175.79999999999998}, "c3truck": {"n": 8, "fw": 137.5, "fh": 128.0}, "c3smoke": {"n": 8, "fw": 164.4, "fh": 103.2}, "c3peek": {"n": 8, "fw": 164.4, "fh": 121.8}, "c3beam": {"n": 8, "fw": 191.79999999999998, "fh": 72.8}, "c3fog": {"n": 8, "fw": 411.20000000000005, "fh": 192.8}, "c3spark": {"n": 8, "fw": 306.0, "fh": 162.0}, "c3fire": {"n": 8, "fw": 175.5, "fh": 210.6}, "c3ember": {"n": 8, "fw": 156.0, "fh": 160.0}, "c3flash": {"n": 8, "fw": 175.5, "fh": 176.4}, "c4ring": {"n": 4, "fw": 389.75, "fh": 140}, "c4spark": {"n": 4, "fw": 389.75, "fh": 210}, "c4fog": {"n": 4, "fw": 389.75, "fh": 140}, "c4burst": {"n": 4, "fw": 389.75, "fh": 255}};
const CINE_SRC={"s1": "assets/cine/s1.webp?v=243c333768", "s2": "assets/cine/s2.webp?v=550e74da9a", "s3": "assets/cine/s3.webp?v=70cc779e19", "s4": "assets/cine/s4.webp?v=a7032a396c", "s5": "assets/cine/s5.webp?v=d9c16aae06", "s6": "assets/cine/s6.webp?v=7be0ebed55", "s7": "assets/cine/s7.webp?v=fc9f6ba24a", "s8": "assets/cine/s8.webp?v=1621073ea0", "gas": "assets/cine/gas.webp?v=315d27fe85", "crowd": "assets/cine/crowd.webp?v=63ce1e7073", "arm": "assets/cine/arm.webp?v=6bf76ce38f", "shadow": "assets/cine/shadow.webp?v=d6f37fc102", "wave": "assets/cine/wave.webp?v=23e8a4a53d", "w1": "assets/cine/w1.webp?v=c8f04b9c22", "w2": "assets/cine/w2.webp?v=0ed40fe71c", "w3": "assets/cine/w3.webp?v=70c8685020", "w4": "assets/cine/w4.webp?v=dbcff62397", "w5": "assets/cine/w5.webp?v=b5b30b1db7", "w6": "assets/cine/w6.webp?v=af200e06c2", "w7": "assets/cine/w7.webp?v=3950081f16", "w8": "assets/cine/w8.webp?v=f8d626832c", "lift": "assets/cine/lift.webp?v=370ce17c98", "r1": "assets/cine/r1.webp?v=3e4ef51c5c", "r2": "assets/cine/r2.webp?v=897e15e59c", "r3": "assets/cine/r3.webp?v=8a0a030f90", "r4": "assets/cine/r4.webp?v=a3521f3cb0", "r5": "assets/cine/r5.webp?v=97fb173298", "r6": "assets/cine/r6.webp?v=3ac4fdbb0d", "bike": "assets/cine/bike.webp?v=c67a4ad3e0", "leap": "assets/cine/leap.webp?v=970a293fe8", "bikef": "assets/cine/bikef.webp?v=ee94861b81", "b1": "assets/cine/b1.webp?v=ec2cd2723f", "b2": "assets/cine/b2.webp?v=01cf7f9c7b", "b6": "assets/cine/b6.webp?v=b63e26f414", "b7": "assets/cine/b7.webp?v=b6c3b43136", "b8": "assets/cine/b8.webp?v=f269e85dc3", "br1": "assets/cine/br1.webp?v=26cde8d39b", "x01": "assets/cine/x01.webp?v=57c1a8b59a", "x02": "assets/cine/x02.webp?v=278ed750fd", "xa3": "assets/cine/xa3.webp?v=63f1e488b3", "xa4": "assets/cine/xa4.webp?v=e283c3e464", "xa5": "assets/cine/xa5.webp?v=c231911ed0", "xa6": "assets/cine/xa6.webp?v=5d44e267c6", "xa7": "assets/cine/xa7.webp?v=d1a42b40c1", "xb3": "assets/cine/xb3.webp?v=759b78c0b1", "xb4": "assets/cine/xb4.webp?v=df36359644", "xb5": "assets/cine/xb5.webp?v=319fbf1c6f", "xb6": "assets/cine/xb6.webp?v=dc55f12004", "xb7": "assets/cine/xb7.webp?v=2603ef086d", "xb8": "assets/cine/xb8.webp?v=213337a3cb", "xv1": "assets/cine/xv1.webp?v=f0b1f7bc58", "xv2": "assets/cine/xv2.webp?v=f08c546b7d", "xv3": "assets/cine/xv3.webp?v=8dfbfd654f", "xv4": "assets/cine/xv4.webp?v=0519294f79", "xv5": "assets/cine/xv5.webp?v=2de26c5075", "xv6": "assets/cine/xv6.webp?v=8bdeb41aa8", "xv7": "assets/cine/xv7.webp?v=457158d6d8", "xf1": "assets/cine/xf1.webp?v=53c018c3db", "xf2": "assets/cine/xf2.webp?v=4ac30cc35b", "xf3": "assets/cine/xf3.webp?v=9db92f2352", "xf4": "assets/cine/xf4.webp?v=5b931210a4", "xf5": "assets/cine/xf5.webp?v=9d2c48c6dc", "xf6": "assets/cine/xf6.webp?v=5b89485ce3", "xw1": "assets/cine/xw1.webp?v=5768e46a45", "xw2": "assets/cine/xw2.webp?v=a02211f1a9", "xw3": "assets/cine/xw3.webp?v=e2a7715eca", "xl1": "assets/cine/xl1.webp?v=61a0c15c27", "xl2": "assets/cine/xl2.webp?v=26078fc2c4", "xrv1": "assets/cine/xrv1.webp?v=f284b5471c", "xrv2": "assets/cine/xrv2.webp?v=03d5736fe6", "xrv3": "assets/cine/xrv3.webp?v=5b2057f074", "xs1": "assets/cine/xs1.webp?v=bb79331e55", "xs2": "assets/cine/xs2.webp?v=f42fff5961", "xs2v": "assets/cine/xs2v.webp?v=17c61849a8", "xm1": "assets/cine/xm1.webp?v=9924e1689b", "c4ring": "assets/cine/c4ring.webp?v=4eac568207", "c4spark": "assets/cine/c4spark.webp?v=f398908cba", "c4fog": "assets/cine/c4fog.webp?v=1bac29ca7d", "c4burst": "assets/cine/c4burst.webp?v=c29024db4d", "c3horde": "assets/cine/c3horde.webp?v=51a1bcd882", "c3truck": "assets/cine/c3truck.webp?v=c3d079edb1", "c3smoke": "assets/cine/c3smoke.webp?v=104b4fcda5", "c3peek": "assets/cine/c3peek.webp?v=f5ee9d072a", "c3beam": "assets/cine/c3beam.webp?v=cf0d9e068c", "c3fog": "assets/cine/c3fog.webp?v=e27d3109d8", "c3spark": "assets/cine/c3spark.webp?v=8ec95a2788", "c3ember": "assets/cine/c3ember.webp?v=386f756069", "c3flash": "assets/cine/c3flash.webp?v=d9e65b2ea5", "fe_g1": "assets/cine/fe_g1.webp?v=fe0fbbe930", "fe_g2": "assets/cine/fe_g2.webp?v=9bc9371de9", "fe_g3": "assets/cine/fe_g3.webp?v=40f2869355", "fe_g4": "assets/cine/fe_g4.webp?v=bdf36722f2", "fe_g5": "assets/cine/fe_g5.webp?v=ef7f521978", "fe_g6": "assets/cine/fe_g6.webp?v=808d8f926c", "fe_g7": "assets/cine/fe_g7.webp?v=bdcb705c94", "fe_g8a": "assets/cine/fe_g8a.webp?v=761765d52c", "fe_g8b": "assets/cine/fe_g8b.webp?v=76e42e466a", "fe_g8c": "assets/cine/fe_g8c.webp?v=21a3e15754", "fe_g8d": "assets/cine/fe_g8d.webp?v=cc81d2e0ee", "fe_h1": "assets/cine/fe_h1.webp?v=73beca4a12", "fe_h2": "assets/cine/fe_h2.webp?v=8b7ff0a01b", "fe_h3": "assets/cine/fe_h3.webp?v=6305b20f31", "fe_w1a": "assets/cine/fe_w1a.webp?v=dd7349ffda", "fe_w1b": "assets/cine/fe_w1b.webp?v=8e85862c06", "fe_w1c": "assets/cine/fe_w1c.webp?v=ba2f531c3b", "fe_w1d": "assets/cine/fe_w1d.webp?v=3a94f8db5c", "fe_w2a": "assets/cine/fe_w2a.webp?v=aa1826e67f", "fe_w2b": "assets/cine/fe_w2b.webp?v=689e888fc6", "fe_w2c": "assets/cine/fe_w2c.webp?v=2de2a83355", "fe_w2d": "assets/cine/fe_w2d.webp?v=6a28284172", "fe_l1": "assets/cine/fe_l1.webp?v=4575ab6ef1", "fe_l2a": "assets/cine/fe_l2a.webp?v=1093ad83fc", "fe_l2b": "assets/cine/fe_l2b.webp?v=35bd80f539", "fe_n1c": "assets/cine/fe_n1c.webp?v=4658768862", "fe_n1d": "assets/cine/fe_n1d.webp?v=fa9ebcc55d", "fe_n2": "assets/cine/fe_n2.webp?v=0f687bda5c", "fe_n3c": "assets/cine/fe_n3c.webp?v=d4d05b60f8", "fe_n3d": "assets/cine/fe_n3d.webp?v=95e42af559", "fe_n4": "assets/cine/fe_n4.webp?v=31da651bcf", "te_t1": "assets/cine/te_t1.webp?v=584d2a9cfa", "te_t2a": "assets/cine/te_t2a.webp?v=fe492bd1ba", "te_t2b": "assets/cine/te_t2b.webp?v=8c05f539fc", "te_t2c": "assets/cine/te_t2c.webp?v=a11a51477b", "te_t2d": "assets/cine/te_t2d.webp?v=26beed7a3f", "te_t3": "assets/cine/te_t3.webp?v=817708c3de", "te_t4": "assets/cine/te_t4.webp?v=aa62671c0f", "te_t5a": "assets/cine/te_t5a.webp?v=5a6a434b7c", "te_t5b": "assets/cine/te_t5b.webp?v=67e35070ec", "te_t5c": "assets/cine/te_t5c.webp?v=d872d33a01", "te_t5d": "assets/cine/te_t5d.webp?v=566666704c", "te_t6": "assets/cine/te_t6.webp?v=c2e101c534", "te_t7": "assets/cine/te_t7.webp?v=9739b7ea64", "te_t8": "assets/cine/te_t8.webp?v=8713b55890", "te_w1": "assets/cine/te_w1.webp?v=753a7795e8", "te_w2a": "assets/cine/te_w2a.webp?v=54150808dc", "te_w2b": "assets/cine/te_w2b.webp?v=bef9b9aeb5", "te_w3": "assets/cine/te_w3.webp?v=cdb71249ca", "te_w4": "assets/cine/te_w4.webp?v=0f3149d82e", "te_w5": "assets/cine/te_w5.webp?v=63e3c99a0b", "te_l1": "assets/cine/te_l1.webp?v=8d2863cb46", "te_l2": "assets/cine/te_l2.webp?v=b3a97f8544", "te_l3": "assets/cine/te_l3.webp?v=3979192544", "te_l4a": "assets/cine/te_l4a.webp?v=b15dc704bb", "te_l4b": "assets/cine/te_l4b.webp?v=17f706673e", "te_e1": "assets/cine/te_e1.webp?v=5b8ed99e63", "te_e2": "assets/cine/te_e2.webp?v=81835e6d77"};
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
function startFork(done,record){cineLoadKeys(FORK_KEYS);const forced=!forkCrew().bruno;
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
function startIntro(done,list){cineEl();cineLoad();cineLoad(list||SHOTS);cine={i:0,tt:0,done,last:performance.now(),list:storyCut(list||SHOTS)};state='intro';ui();clayer.hidden=false;requestAnimationFrame(cineFrame);}
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
