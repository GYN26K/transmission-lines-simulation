import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, BookOpen, Calculator, ChevronRight, CircleHelp, Gauge,
  Home, Info, Pause, Play, RadioTower, RotateCcw, Settings2, Waves,
  Zap, ArrowDown, ArrowUpRight, Github, ExternalLink
} from 'lucide-react';
import { calculateLine, sampleLine } from './calculations/transmissionLine.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (n, digits = 3) => Number.isFinite(n) ? Number(n).toFixed(digits) : '∞';
function calculate(p) { return calculateLine(p); }

function sampleWaves(p, time, count = 360) { return sampleLine(p, time, count); }

function linePath(xs, ys, width, height, yMax) {
  const left=48,right=12,top=12,bottom=32;
  const w=width-left-right, h=height-top-bottom;
  return ys.map((y,i)=>`${i?'L':'M'} ${(left+(xs[i]/xs[xs.length-1])*w).toFixed(2)} ${(top+(h/2)-(y/yMax)*(h/2)).toFixed(2)}`).join(' ');
}

function WaveChart({ title, subtitle, series, yLabel='Voltage (V)', yMax, height=230, markerX, markerLabel, showZero=true }) {
  const width=760;
  const all=series.flatMap(s=>s.values);
  const limit=yMax || Math.max(0.1,...all.map(Math.abs))*1.18;
  const xs=series[0]?.xs || [0,1];
  const left=48,right=12,top=12,bottom=32,w=width-left-right,h=height-top-bottom;
  const xAt=x=>left+(x/xs[xs.length-1])*w;
  const yAt=y=>top+h/2-(y/limit)*(h/2);
  return <section className="chart-card">
    <div className="chart-head"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="chart-unit">{yLabel}</span></div>
    <div className="chart-scroll"><svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label={title}>
      {[0,1,2,3,4].map(i=><g key={i}><line x1={left} x2={width-right} y1={top+i*h/4} y2={top+i*h/4} className="gridline"/><text x={left-8} y={top+i*h/4+4} textAnchor="end" className="axis-text">{fmt(limit-(2*limit*i/4),1)}</text></g>)}
      {showZero&&<line x1={left} x2={width-right} y1={yAt(0)} y2={yAt(0)} className="zero-line"/>}
      {series.map(s=><path key={s.name} d={s.values.map((y,i)=>`${i?'L':'M'} ${xAt(xs[i]).toFixed(2)} ${yAt(y).toFixed(2)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={s.width||2.4} strokeDasharray={s.dash||'none'} strokeLinecap="round" strokeLinejoin="round"/>)}
      {markerX!==undefined&&<g><line x1={xAt(markerX)} x2={xAt(markerX)} y1={top} y2={top+h} className="marker-line"/><text x={clamp(xAt(markerX)+6,left+4,width-100)} y={top+12} className="marker-text">{markerLabel||'Probe'}</text></g>}
      <text x={left} y={height-7} className="axis-text">Load · 0 m</text><text x={width-right} y={height-7} textAnchor="end" className="axis-text">Generator · {fmt(xs[xs.length-1],2)} m</text>
    </svg></div>
    <div className="legend">{series.map(s=><span key={s.name}><i style={{background:s.color}}/>{s.name}</span>)}</div>
  </section>;
}

function EnvelopeChart({ title, subtitle, xs, upper, lower, color, unit }) {
  const width=760,height=230,left=48,right=12,top=12,bottom=32,w=width-left-right,h=height-top-bottom;
  const max=Math.max(0.01,...upper)*1.16;
  const xAt=x=>left+x/xs[xs.length-1]*w;
  const yAt=y=>top+h-(y/max)*h;
  const path=ys=>ys.map((y,i)=>`${i?'L':'M'} ${xAt(xs[i]).toFixed(2)} ${yAt(y).toFixed(2)}`).join(' ');
  return <section className="chart-card">
    <div className="chart-head"><div><h3>{title}</h3><p>{subtitle}</p></div><span className="chart-unit">{unit}</span></div>
    <div className="chart-scroll"><svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {[0,1,2,3,4].map(i=><g key={i}><line x1={left} x2={width-right} y1={top+i*h/4} y2={top+i*h/4} className="gridline"/><text x={left-8} y={top+i*h/4+4} textAnchor="end" className="axis-text">{fmt(max*(1-i/4),2)}</text></g>)}
      <path d={path(upper)} fill="none" stroke={color} strokeWidth="2.6"/>
      <path d={path(lower)} fill="none" stroke={color} strokeWidth="2.6" strokeDasharray="6 5" opacity=".75"/>
      <text x={left} y={height-7} className="axis-text">Load · 0 m</text><text x={width-right} y={height-7} textAnchor="end" className="axis-text">Generator · {fmt(xs[xs.length-1],2)} m</text>
    </svg></div>
    <div className="legend"><span><i style={{background:color}}/>Upper envelope</span><span><i className="dash-legend" style={{borderColor:color}}/>Lower envelope</span></div>
  </section>;
}

const initial = {mode:'lossless',z0:50,rl:100,xl:0,frequency:100e6,velocity:2e8,length:10,v0:1,R:0.5,L:250e-9,G:1e-5,C:100e-12};

export default function App() {
  const [page,setPage]=useState('simulator');
  const [p,setP]=useState(initial);
  const [time,setTime]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [probe,setProbe]=useState(.5);
  const [showIncident,setShowIncident]=useState(true);
  const [showReflected,setShowReflected]=useState(true);
  const [showResult,setShowResult]=useState(true);
  const [preset,setPreset]=useState('custom');
  const [calcFrequency,setCalcFrequency]=useState('100');
  const anim=useRef(null);
  const last=useRef(null);
  const data=useMemo(()=>sampleWaves(p,time,360),[p,time]);
  const q=data.q;
  const probeX=probe*p.length;
  const probeIndex=Math.round(probe*360);
  const probeValue=data.vt[probeIndex];
  const period=1/p.frequency;

  useEffect(()=>{
    if(!playing) { if(anim.current) cancelAnimationFrame(anim.current); last.current=null; return; }
    const tick=now=>{
      if(last.current===null) last.current=now;
      const dt=Math.min((now-last.current)/1000,.05); last.current=now;
      setTime(t=>((t + dt * period * 0.5) % period));
      anim.current=requestAnimationFrame(tick);
    };
    anim.current=requestAnimationFrame(tick);
    return ()=>{if(anim.current)cancelAnimationFrame(anim.current);};
  },[playing,period]);

  const setField=(key,value)=>setP(prev=>({...prev,[key]:value}));
  const updatePreset=name=>{
    setPreset(name);
    const presets={
      matched:{...p,rl:p.mode==='lossless'?p.z0:q.z0.re,xl:p.mode==='lossless'?0:q.z0.im},
      open:{...p,rl:1e9,xl:0},
      short:{...p,rl:0,xl:0},
      mismatch:{...p,rl:100,xl:0},
      reactive:{...p,rl:50,xl:50}
    };
    if(presets[name]) setP(presets[name]);
  };
  const updateTimeDegrees=deg=>setTime((deg/360)*period);
  const setPresetFromLoad=()=>{setP({...p,rl:p.mode==='lossless'?p.z0:q.z0.re,xl:p.mode==='lossless'?0:q.z0.im});setPreset('matched');};
  const reset=()=>{setP(initial);setTime(0);setProbe(.5);setPreset('custom');setPlaying(false);};

  const metrics=[
    {label:'Reflection coefficient',value:fmt(q.gm,4),sub:`${(q.gm*100).toFixed(1)}% reflected voltage`,icon:Activity},
    {label:'VSWR',value:fmt(q.vswr,3),sub:q.vswr===1?'Perfect impedance match':'Voltage standing-wave ratio',icon:Gauge},
    {label:'Wavelength',value:`${fmt(q.lambda,3)} m`,sub:`β = ${fmt(q.beta,3)} rad/m`,icon:Waves},
    {label:'Load phase',value:`${fmt(q.gammaPhase*180/Math.PI,1)}°`,sub:'Reflection coefficient phase',icon:Zap}
  ];

  const waveSeries=[];
  if(showIncident)waveSeries.push({name:'Incident',values:data.vi,xs:data.xs,color:'#39b8ff'});
  if(showReflected)waveSeries.push({name:'Reflected',values:data.vr,xs:data.xs,color:'#b28aff'});
  if(showResult)waveSeries.push({name:'Resultant',values:data.vt,xs:data.xs,color:'#39d6a2',width:3});

  const nav=[
    {id:'home',label:'Overview',icon:Home},
    {id:'simulator',label:'Wave simulator',icon:Waves},
    {id:'calculator',label:'Line calculator',icon:Calculator},
    {id:'learn',label:'Learn the theory',icon:BookOpen}
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><RadioTower size={21}/></div><div><strong>WaveLab</strong><small>TRANSMISSION LINES</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}><Icon size={18}/><span>{item.label}</span>{page===item.id&&<ChevronRight size={15} className="nav-arrow"/>}</button>;})}</nav>
      <div className="sidebar-bottom"><div className="status-dot"/> <span>Simulation engine ready</span><div className="version">v1.0</div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Engineering tools <ChevronRight size={14}/> <b>{nav.find(n=>n.id===page)?.label}</b></div><div className="top-actions"><span className="top-chip"><span className="live-dot"/> LIVE MODEL</span><button className="icon-button" title="Reset simulation" onClick={reset}><RotateCcw size={17}/></button></div></header>

      {page==='simulator'&&<>
        <section className="page-heading"><div><div className="eyebrow">INTERACTIVE LAB / 01</div><h1>Transmission line <span>simulator</span></h1><p>Explore wave propagation, impedance mismatch, reflections and standing-wave patterns.</p></div><div className="heading-badge"><Waves size={16}/> {p.mode==='lossless'?'Lossless line':p.mode==='lowloss'?'Low-loss line':'General lossy line'}</div></section>

        <section className="metric-grid">{metrics.map(m=>{const Icon=m.icon;return <div className="metric-card" key={m.label}><div className="metric-top"><span>{m.label}</span><Icon size={17}/></div><div className="metric-value">{m.value}</div><div className="metric-sub">{m.sub}</div></div>;})}</section>

        <div className="main-grid">
          <aside className="control-panel">
            <div className="panel-title"><div><Settings2 size={17}/><h2>Line parameters</h2></div><span className="tiny-tag">INPUT</span></div>
            <div className="field-group"><label>Transmission-line model</label><div className="mode-switch">{[['lossless','Lossless'],['lowloss','Low-loss'],['lossy','General lossy']].map(([id,label])=><button key={id} className={p.mode===id?'selected':''} onClick={()=>setField('mode',id)}>{label}</button>)}</div></div>
            <div className="field-group"><label>Load impedance <span>ZL = RL + jXL</span></label><div className="input-pair"><div className="input-wrap"><input type="number" value={p.rl} onChange={e=>{setField('rl',Number(e.target.value));setPreset('custom');}}/><small>R (Ω)</small></div><div className="input-wrap"><input type="number" value={p.xl} onChange={e=>{setField('xl',Number(e.target.value));setPreset('custom');}}/><small>X (Ω)</small></div></div></div>
            {p.mode==='lossless'&&<div className="field-group"><label>Characteristic impedance</label><div className="unit-input"><input type="number" min="0.01" value={p.z0} onChange={e=>setField('z0',Math.max(.01,Number(e.target.value)))}/><span>Ω</span></div></div>}
            <div className="field-group"><label>Frequency</label><div className="unit-input"><input type="number" min="0.000001" value={p.frequency/1e6} onChange={e=>setField('frequency',Math.max(.000001,Number(e.target.value))*1e6)}/><span>MHz</span></div></div>
            {p.mode==='lossless'&&<div className="field-group"><label>Propagation velocity</label><div className="unit-input"><input type="number" min="1" value={p.velocity/1e8} onChange={e=>setField('velocity',Math.max(.000001,Number(e.target.value))*1e8)}/><span>× 10⁸ m/s</span></div></div>}
            {p.mode!=='lossless'&&<div className="distributed-panel"><div className="distributed-title">Distributed parameters <small>per metre</small></div>
              <div className="field-group"><label>Series resistance R</label><div className="unit-input"><input type="number" min="0" step="0.01" value={p.R} onChange={e=>setField('R',Math.max(0,Number(e.target.value)))}/><span>Ω/m</span></div></div>
              <div className="field-group"><label>Series inductance L</label><div className="unit-input"><input type="number" min="0.000001" step="0.1" value={p.L*1e9} onChange={e=>setField('L',Math.max(1e-15,Number(e.target.value))*1e-9)}/><span>nH/m</span></div></div>
              <div className="field-group"><label>Shunt conductance G</label><div className="unit-input"><input type="number" min="0" step="0.000001" value={p.G} onChange={e=>setField('G',Math.max(0,Number(e.target.value)))}/><span>S/m</span></div></div>
              <div className="field-group"><label>Shunt capacitance C</label><div className="unit-input"><input type="number" min="0.000001" step="0.1" value={p.C*1e12} onChange={e=>setField('C',Math.max(1e-18,Number(e.target.value))*1e-12)}/><span>pF/m</span></div></div>
              <p className="parameter-hint">Z₀ = {fmt(q.z0.re,3)} {q.z0.im>=0?'+':'−'} j{fmt(Math.abs(q.z0.im),3)} Ω. γ = {fmt(q.alpha,5)} + j{fmt(q.beta,5)} m⁻¹.</p>
            </div>}
            <div className="field-group"><label>Line length</label><div className="unit-input"><input type="number" min="0.01" value={p.length} onChange={e=>setField('length',Math.max(.01,Number(e.target.value)))}/><span>m</span></div></div>
            <div className="field-group"><label>Incident voltage amplitude</label><div className="unit-input"><input type="number" min="0" value={p.v0} onChange={e=>setField('v0',Math.max(0,Number(e.target.value)))}/><span>V peak</span></div></div>
            <div className="field-group"><label>Quick load presets</label><div className="preset-grid">{[['matched','Matched'],['open','Open'],['short','Short'],['mismatch','100 Ω'],['reactive','50+j50']].map(([id,label])=><button key={id} className={preset===id?'selected':''} onClick={()=>updatePreset(id)}>{label}</button>)}</div></div>
            <button className="match-button" onClick={setPresetFromLoad}><Zap size={15}/> Match load to Z₀</button>
            <div className="direction-note"><Info size={15}/><span>Position is measured from the load (0 m) back towards the generator.</span></div>
          </aside>

          <section className="visualization-column">
            <div className="visual-card wave-stage">
              <div className="visual-card-head"><div><div className="eyebrow">LIVE VISUALIZATION</div><h2>Wave behaviour</h2><p>Instantaneous voltage along the transmission line</p></div><span className={`classification ${q.gm<1e-8?'matched':q.gm>1-1e-8?'standing':'partial'}`}>{q.classification}</span></div>
              <div className="wave-controls"><button className="play-button" onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}{playing?'Pause':'Play animation'}</button><button className="reset-button" onClick={()=>{setTime(0);setPlaying(false);}}><RotateCcw size={14}/> Reset time</button><div className="time-readout">t = <b>{fmt(time*1e9,2)} ns</b></div></div>
              <div className="slider-line"><span>Time</span><input type="range" min="0" max="360" step="1" value={time/period*360} onChange={e=>setTime(Number(e.target.value)/360*period)} style={{'--progress':`${time/period*100}%`}}/><span>1 period</span></div>
              <div className="wave-stage-svg"><WaveChart title="" subtitle="" series={[{name:'Resultant voltage',values:data.vt,xs:data.xs,color:'#3dd6ad',width:3}]} height={205} yLabel="V"/></div>
              <div className="wave-legend-row"><span><i className="legend-cyan"/> Voltage profile</span><span><i className="legend-green"/> Load at left</span><span><i className="legend-dash"/> Generator end</span></div>
            </div>

            <div className="chart-grid"><WaveChart title="Wave components" subtitle="Incident and reflected waves combine at every point." series={waveSeries.length?waveSeries:[{name:'No series selected',values:data.vt.map(()=>0),xs:data.xs,color:'#536078'}]} height={245}/><EnvelopeChart title="Voltage envelope" subtitle="Upper and lower magnitude bounds along the line." xs={data.xs} upper={data.vEnv} lower={data.vMinEnv} color="#39d6a2" unit="V peak"/></div>
            <div className="chart-grid"><EnvelopeChart title="Current envelope" subtitle="Upper and lower magnitude bounds along the line." xs={data.xs} upper={data.iEnv} lower={data.iMinEnv} color="#b28aff" unit="A peak"/><WaveChart title="Current at this instant" subtitle="Current is defined positive towards the load." series={[{name:'Line current',values:data.it,xs:data.xs,color:'#ffb45e'}]} height={245} yLabel="A"/></div>
            {p.mode!=='lossless'&&<>
              <div className="chart-grid"><WaveChart title="Travelling-wave attenuation" subtitle="Relative amplitude of a wave after travelling distance d from its point of launch." series={[{name:'e⁻αd',values:data.xs.map(x=>Math.exp(-q.alpha*x)),xs:data.xs,color:'#56c7ee'}]} height={235} yLabel="Relative amplitude" yMax={1}/><WaveChart title="Local VSWR" subtitle="The local reflection magnitude decreases towards the generator." series={[{name:'VSWR(x)',values:data.localVswr.map(v=>Number.isFinite(v)?Math.min(v,25):25),xs:data.xs,color:'#ffb45e'}]} height={235} yLabel="VSWR"/></div>
              <div className="chart-grid"><WaveChart title="Average power flow" subtitle="Positive power is defined towards the load; peak phasors are used." series={[{name:'Pavg(x)',values:data.power,xs:data.xs,color:'#39d6a2'}]} height={235} yLabel="W"/><WaveChart title="Power dissipated per metre" subtitle="Conductor and dielectric losses: ½R|I|² + ½G|V|²." series={[{name:'Loss per metre',values:data.lossPerM,xs:data.xs,color:'#ff8f78'}]} height={235} yLabel="W/m"/></div>
              <div className="loss-summary"><div><small>ATTENUATION</small><b>{fmt(q.attenuationDbPerM,5)} dB/m</b></div><div><small>LINE POWER LOSS</small><b>{fmt(data.integratedLoss,5)} W</b></div><div><small>LOAD POWER</small><b>{fmt(data.loadPower,5)} W</b></div><div><small>POWER BALANCE ERROR</small><b>{fmt(data.powerBalanceError,6)} W</b></div></div>
            </>}

            <div className="probe-card"><div className="probe-head"><div><div className="eyebrow">POINT MEASUREMENT</div><h3>Observe voltage at a position</h3><p>Move the probe along the line and watch the instantaneous voltage.</p></div><div className="probe-value"><small>INSTANTANEOUS V</small><strong>{fmt(probeValue,4)} V</strong></div></div><div className="probe-slider"><span>Load · 0 m</span><input type="range" min="0" max="1" step="0.001" value={probe} onChange={e=>setProbe(Number(e.target.value))}/><span>Generator · {fmt(p.length,2)} m</span></div><div className="probe-position">Probe position: <b>{fmt(probeX,3)} m</b> <span>({(probe*100).toFixed(1)}% of line length)</span></div></div>
          </section>
        </div>

        <section className="insight-strip"><div className="insight-icon"><Info size={19}/></div><div><b>How to read this simulation</b><p>A matched load has ΓL = 0, so no reflected wave exists. In a lossy line, both travelling waves attenuate along their propagation directions. The voltage and current envelopes therefore vary with position, and the local reflection coefficient magnitude decreases towards the generator.</p></div></section>
      </>}

      {page==='home'&&<section className="content-page"><div className="eyebrow">WELCOME TO THE LAB</div><h1>See transmission lines <span>in motion.</span></h1><p className="lead">A hands-on engineering workspace for understanding travelling waves, reflections, standing waves and impedance matching.</p><div className="home-cards"><button onClick={()=>setPage('simulator')} className="home-card featured"><Waves size={25}/><h2>Open wave simulator</h2><p>Change load impedance and watch incident, reflected and resultant waves evolve.</p><span>Launch simulator <ArrowUpRight size={16}/></span></button><button onClick={()=>setPage('calculator')} className="home-card"><Calculator size={25}/><h2>Line calculator</h2><p>Calculate reflection coefficient, VSWR, wavelength and phase constant.</p><span>Open calculator <ArrowUpRight size={16}/></span></button><button onClick={()=>setPage('learn')} className="home-card"><BookOpen size={25}/><h2>Learn the theory</h2><p>Review the equations and physical meaning behind each plot.</p><span>Explore concepts <ArrowUpRight size={16}/></span></button></div><div className="content-note"><Info size={17}/><p><b>Model scope:</b> Sinusoidal steady-state lossless, low-loss and general lossy distributed RLCG models are supported. Transient pulse reflections and frequency-dependent material models are not included.</p></div></section>}

      {page==='calculator'&&<section className="content-page"><div className="eyebrow">ENGINEERING TOOL / 02</div><h1>Transmission line <span>calculator</span></h1><p className="lead">Live calculations use the same load and line parameters as the simulator.</p><div className="calculator-layout"><div className="calc-main"><h2>Calculated quantities</h2><div className="calc-table">{[
        ['Load impedance',`${fmt(p.rl,2)} ${p.xl>=0?'+':'−'} j${fmt(Math.abs(p.xl),2)} Ω`],
        ['Reflection coefficient Γ',`${fmt(q.gamma.re,4)} ${q.gamma.im>=0?'+':'−'} j${fmt(Math.abs(q.gamma.im),4)}`],
        ['Magnitude |Γ|',fmt(q.gm,5)],['Reflection phase',`${fmt(q.gammaPhase*180/Math.PI,2)}°`],
        ['Characteristic impedance Z₀',`${fmt(q.z0.re,4)} ${q.z0.im>=0?'+':'−'} j${fmt(Math.abs(q.z0.im),4)} Ω`],
        ['Propagation constant γ',`${fmt(q.alpha,5)} + j${fmt(q.beta,5)} per m`],
        ['Attenuation constant α',`${fmt(q.alpha,6)} Np/m`],['Attenuation',`${fmt(q.attenuationDbPerM,4)} dB/m`],
        ['Wavelength λ',`${fmt(q.lambda,5)} m`],['Phase velocity',`${fmt(q.velocity,4)} m/s`],
        ['Input impedance Zin',`${fmt(q.zin.re,4)} ${q.zin.im>=0?'+':'−'} j${fmt(Math.abs(q.zin.im),4)} Ω`],
        ['Input reflection |Γin|',fmt(Math.hypot(q.gammaIn.re,q.gammaIn.im),5)],
        ['VSWR at load',fmt(q.vswr,4)],['Return loss at load',q.gm===0?'∞ dB':`${fmt(-20*Math.log10(q.gm),3)} dB`],
        ['Power delivered at load',`${fmt(data.loadPower,5)} W`],['Power dissipated in line',`${fmt(data.integratedLoss,5)} W`],
        ['Power balance residual',`${fmt(data.powerBalanceError,7)} W`]
      ].map(([k,v])=><div className="calc-row" key={k}><span>{k}</span><b>{v}</b></div>)}</div><button className="primary-button" onClick={()=>setPage('simulator')}>View wave plots <ChevronRight size={16}/></button></div><div className="formula-panel"><div className="eyebrow">CORE EQUATIONS</div><h3>Reflection coefficient</h3><div className="formula">Γ<sub>L</sub> = <span className="fraction"><i>Z<sub>L</sub> − Z<sub>0</sub></i><i>Z<sub>L</sub> + Z<sub>0</sub></i></span></div><h3>Standing-wave ratio</h3><div className="formula">VSWR = <span className="fraction"><i>1 + |Γ|</i><i>1 − |Γ|</i></span></div><h3>Wavelength</h3><div className="formula">λ = <span>v / f</span></div><h3>Phase constant</h3><div className="formula">β = <span>2π / λ</span></div></div></div></section>}

      {page==='learn'&&<section className="content-page"><div className="eyebrow">CONCEPTS / 03</div><h1>Understand the <span>waves.</span></h1><p className="lead">The key ideas behind what you are seeing in the simulator.</p><div className="lesson-list">
        <article className="lesson"><div className="lesson-number">01</div><div><h2>Travelling waves</h2><p>A travelling wave transports energy along the transmission line. The incident wave moves from the generator towards the load. Distance x is measured from the load back towards the generator. In a lossy line its phasor includes exp(αx) under this coordinate convention, because the incident wave is being observed backwards from its load-plane reference.</p><div className="equation">v<sub>i</sub>(x,t) = V<sub>0</sub><sup>+</sup> cos(ωt + βx)</div></div></article>
        <article className="lesson"><div className="lesson-number">02</div><div><h2>Reflections at the load</h2><p>When the load impedance differs from the characteristic impedance, part of the incident wave is reflected. The complex reflection coefficient describes both its magnitude and phase.</p><div className="equation">Γ<sub>L</sub> = (Z<sub>L</sub> − Z<sub>0</sub>) / (Z<sub>L</sub> + Z<sub>0</sub>)</div></div></article>
        <article className="lesson"><div className="lesson-number">03</div><div><h2>Standing waves</h2><p>The incident and reflected waves travel in opposite directions. Their superposition creates a position-dependent amplitude pattern. A perfect standing wave occurs for total reflection, when |Γ| = 1.</p><div className="equation">VSWR = (1 + |Γ|) / (1 − |Γ|)</div></div></article>
        <article className="lesson"><div className="lesson-number">04</div><div><h2>Lossy transmission lines</h2><p>Conductor resistance and dielectric leakage cause wave amplitude to decay exponentially. With γ = α + jβ, α controls attenuation and β controls phase progression. Since x is measured from the load towards the generator, the incident-wave phasor contains exp(+γx), while the reflected wave contains exp(−γx).</p><div className="equation">γ = √[(R + jωL)(G + jωC)]</div></div></article>
        <article className="lesson"><div className="lesson-number">05</div><div><h2>Impedance matching</h2><p>When ZL = Z0, Γ = 0. There is no reflected wave, and the voltage magnitude is uniform along an ideal lossless line.</p><button className="text-button" onClick={()=>{setPresetFromLoad();setPage('simulator');}}>Try a matched load <ChevronRight size={15}/></button></div></article>
      </div><div className="content-note"><CircleHelp size={17}/><p><b>Sign convention:</b> The voltage phasor is represented using e<sup>jωt</sup>. With x measured from the load towards the generator, the incident voltage phasor varies as e<sup>+jβx</sup> and the reflected voltage phasor as Γe<sup>−jβx</sup>.</p></div></section>}

      <footer className="footer"><span>WaveLab · Transmission Line Laboratory</span><span>Built for learning electrical engineering</span></footer>
    </main>
  </div>;
}
