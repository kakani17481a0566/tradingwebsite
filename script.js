/* ====================================================================
   NSG TRADING CO. — script.js
   Intro box → opens → reveals site → graphs animate → auto-scroll to graphs
   ==================================================================== */
(function(){
  'use strict';

  /* ===================================================================
     INTRO BOX: click (or auto after delay) to open, then reveal site
     =================================================================== */
  const intro = document.getElementById('intro');
  const box   = document.getElementById('box');
  let opened = false;

  function openBox(){
    if(opened) return; opened = true;
    box.classList.add('open');
    // after the lid lifts + box scales away, fade the intro out
    setTimeout(()=>{
      intro.classList.add('hide');
      startCharts();                  // begin drawing the NIFTY graphs
      // gently scroll down to the live graphs so they "scroll" into view
      setTimeout(()=>{
        const markets = document.getElementById('markets');
        if(markets) markets.scrollIntoView({behavior:'smooth'});
      }, 900);
    }, 1100);
  }
  box.addEventListener('click', openBox);
  // auto-open after 2.4s if the user doesn't click
  setTimeout(openBox, 2400);

  /* ===================================================================
     NAV: shrink + progress + toTop
     =================================================================== */
  const nav = document.getElementById('nav');
  const toTop = document.getElementById('toTop');
  const progress = document.getElementById('progress');
  function onScroll(){
    const y = window.scrollY;
    nav.classList.toggle('shrink', y > 40);
    toTop.classList.toggle('show', y > 600);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h>0 ? (y/h*100) : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  window.scrollToTop = function(){ window.scrollTo({top:0,behavior:'smooth'}); };

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById('burger');
  const navlist = document.getElementById('navlist');
  burger.addEventListener('click', ()=> navlist.classList.toggle('open'));
  navlist.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> navlist.classList.remove('open')));

  /* ---------- Year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  }, {threshold:.15});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  /* ---------- Count-up stats ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      const el = e.target, target = +el.dataset.count;
      const pre = el.dataset.prefix||'', suf = el.dataset.suffix||'';
      let cur = 0; const steps = 60; const inc = target/steps;
      const t = setInterval(()=>{
        cur += inc;
        if(cur>=target){ cur=target; clearInterval(t); }
        el.textContent = pre + Math.floor(cur).toLocaleString('en-IN') + suf;
      }, 22);
      cio.unobserve(el);
    });
  }, {threshold:.6});
  counters.forEach(el=>cio.observe(el));

  /* ===================================================================
     LIVE TICKER
     =================================================================== */
  const stocks = [
    ['NIFTY 50','22,940.30',1.38],['SENSEX','75,418.04',1.21],['NIFTY 100','23,615.80',1.19],
    ['RELIANCE','2,945.60',0.84],['TCS','3,872.10',-0.42],['HDFC BANK','1,672.35',0.66],
    ['INFOSYS','1,540.90',1.05],['ICICI BANK','1,124.75',0.91],['SBIN','812.40',-0.33],
    ['BHARTIARTL','1,388.20',2.14],['ITC','438.55',0.27],['L&T','3,610.85',1.47]
  ];
  function tickerHTML(){
    return stocks.map(([s,v,c])=>{
      const up = c>=0;
      return '<span class="tk"><span class="sym">'+s+'</span><span class="val">'+v+'</span>'+
             '<span class="'+(up?'up':'down')+'">'+(up?'▲':'▼')+' '+Math.abs(c).toFixed(2)+'%</span></span>';
    }).join('');
  }
  document.getElementById('tickerTrack').innerHTML = tickerHTML() + tickerHTML();

  /* ===================================================================
     FLOWING LINE CHART ENGINE (canvas)
     =================================================================== */
  function makeSeries(n, base, vol, trend){
    const arr=[]; let v=base;
    for(let i=0;i<n;i++){ v += (Math.random()-.5)*vol + trend; arr.push(v); }
    return arr;
  }

  class FlowChart{
    constructor(canvas, color, glow){
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.color = color; this.glow = glow;
      this.data = makeSeries(60, 100, 6, 0.35);
      this.prog = 0; this.started = false;
      this.resize();
      window.addEventListener('resize', ()=>{ this.resize(); this.draw(); });
    }
    resize(){
      const r = this.c.getBoundingClientRect();
      const dpr = window.devicePixelRatio||1;
      this.w = r.width||600; this.h = r.height||200;
      this.c.width = this.w*dpr; this.c.height = this.h*dpr;
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    push(){
      this.data.shift();
      const last = this.data[this.data.length-1];
      this.data.push(last + (Math.random()-.48)*6 + 0.3);
    }
    draw(){
      const {ctx,w,h,data}=this;
      ctx.clearRect(0,0,w,h);
      const min=Math.min(...data), max=Math.max(...data), range=(max-min)||1;
      const pad=10;
      const X=i=> (i/(data.length-1))*w;
      const Y=v=> h-pad-((v-min)/range)*(h-pad*2);
      const count = Math.max(2, Math.floor(data.length*this.prog));
      const grad=ctx.createLinearGradient(0,0,0,h);
      grad.addColorStop(0, this.glow); grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.moveTo(X(0),Y(data[0]));
      for(let i=1;i<count;i++) ctx.lineTo(X(i),Y(data[i]));
      ctx.lineTo(X(count-1),h); ctx.lineTo(X(0),h); ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(X(0),Y(data[0]));
      for(let i=1;i<count;i++) ctx.lineTo(X(i),Y(data[i]));
      ctx.lineWidth=2.4; ctx.strokeStyle=this.color;
      ctx.shadowColor=this.color; ctx.shadowBlur=12; ctx.stroke(); ctx.shadowBlur=0;
      if(count>1){
        const i=count-1;
        ctx.beginPath(); ctx.arc(X(i),Y(data[i]),4,0,Math.PI*2); ctx.fillStyle=this.color; ctx.fill();
        ctx.beginPath(); ctx.arc(X(i),Y(data[i]),8,0,Math.PI*2);
        ctx.strokeStyle=this.color; ctx.globalAlpha=.4; ctx.stroke(); ctx.globalAlpha=1;
      }
    }
    animateIn(){
      if(this.started) return; this.started=true;
      this.resize();
      const step=()=>{
        this.prog=Math.min(1,this.prog+0.02); this.draw();
        if(this.prog<1) requestAnimationFrame(step); else this.live();
      };
      requestAnimationFrame(step);
    }
    live(){ setInterval(()=>{ this.push(); this.draw(); }, 1400); }
  }

  let fc50, fc100, chartsStarted=false;
  function startCharts(){
    if(chartsStarted) return; chartsStarted=true;
    fc50  = new FlowChart(document.getElementById('nifty50'),  '#f4e4a3','rgba(217,182,90,.25)');
    fc100 = new FlowChart(document.getElementById('nifty100'), '#6f9fc9','rgba(111,159,201,.25)');
    fc50.animateIn(); fc100.animateIn();
    flicker('n50price','n50chg',22940);
    flicker('n100price','n100chg',23615);
  }
  // Fallback: if intro is skipped/removed, start charts when markets scrolls into view
  const fallbackIO=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ startCharts(); fallbackIO.disconnect(); } });
  },{threshold:.2});
  fallbackIO.observe(document.getElementById('markets'));

  function flicker(priceId,chgId,base){
    const p=document.getElementById(priceId), c=document.getElementById(chgId);
    setInterval(()=>{
      const delta=(Math.random()-.45)*40;
      const val=base+delta, pct=(delta/base*100);
      p.textContent=val.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
      const up=delta>=0;
      c.className='chg '+(up?'up':'down');
      c.textContent=(up?'+':'')+delta.toFixed(2)+' ('+(up?'+':'')+pct.toFixed(2)+'%)';
    },1400);
  }

  /* ===================================================================
     HERO BACKGROUND — flowing market animation
     =================================================================== */
  const hc=document.getElementById('heroChart');
  const hctx=hc.getContext('2d');
  let HW,HH;
  function hResize(){
    const dpr=window.devicePixelRatio||1;
    HW=hc.clientWidth||window.innerWidth; HH=hc.clientHeight||window.innerHeight;
    hc.width=HW*dpr; hc.height=HH*dpr; hctx.setTransform(dpr,0,0,dpr,0,0);
  }
  hResize(); window.addEventListener('resize',hResize);
  const lines=[
    {data:makeSeries(120,HH*0.5,10,0.2),color:'rgba(217,182,90,.55)',off:0,speed:0.6},
    {data:makeSeries(120,HH*0.6,8,0.1),color:'rgba(111,159,201,.45)',off:40,speed:0.9},
    {data:makeSeries(120,HH*0.7,6,0.05),color:'rgba(195,198,203,.18)',off:80,speed:0.45}
  ];
  let phase=0;
  function drawHero(){
    hctx.clearRect(0,0,HW,HH);
    lines.forEach(L=>{
      const n=L.data.length;
      const min=Math.min(...L.data), max=Math.max(...L.data), range=(max-min)||1;
      hctx.beginPath();
      for(let i=0;i<n;i++){
        const x=(i/(n-1))*HW;
        const wobble=Math.sin((i*0.18)+phase*L.speed+L.off)*14;
        const y=HH-((L.data[i]-min)/range)*(HH*0.7)-HH*0.12+wobble;
        i===0?hctx.moveTo(x,y):hctx.lineTo(x,y);
      }
      hctx.lineWidth=2; hctx.strokeStyle=L.color;
      hctx.shadowColor=L.color; hctx.shadowBlur=10; hctx.stroke(); hctx.shadowBlur=0;
    });
    phase+=0.015; requestAnimationFrame(drawHero);
  }
  drawHero();
  setInterval(()=>{
    lines.forEach(L=>{ L.data.shift(); L.data.push(L.data[L.data.length-1]+(Math.random()-.45)*8+0.4); });
  },1600);

})();