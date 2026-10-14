import { useState, useEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

// ── Design Tokens ──────────────────────────────────────────────────────────
const T = {
  bg:       "#0D1117", surface:  "#161B22", surface2: "#21262D",
  border:   "#30363D", text:     "#E6EDF3", muted:    "#8B949E",
  low:      "#3FB950", lowBg:    "#0F2D1A", medium:   "#E3B341",
  medBg:    "#2D200A", high:     "#F0883E", highBg:   "#2D1500",
  critical: "#F85149", critBg:   "#2D0A0A", blue:     "#58A6FF",
  blueBg:   "#0C2340", purple:   "#A371F7", purpleBg: "#1E1040",
  green:    "#3FB950",
};

const sevColor  = { LOW: T.low,      MEDIUM: T.medium,   HIGH: T.high,      CRITICAL: T.critical };
const sevBg     = { LOW: T.lowBg,    MEDIUM: T.medBg,    HIGH: T.highBg,    CRITICAL: T.critBg   };
const sevDot    = { LOW: "●",        MEDIUM: "●",        HIGH: "●",         CRITICAL: "◉"        };

// ── Mock Data ──────────────────────────────────────────────────────────────
const ATTACKS = ["SQLi","XSS","BruteForce","PathTraversal","Scanner"];
const COUNTRIES = ["🇨🇳 China","🇷🇺 Russia","🇺🇸 USA","🇩🇪 Germany","🇧🇷 Brazil","🇮🇳 India"];
const IPS = ["192.168.1.100","45.33.32.220","103.21.244.1","185.220.101.34","91.108.4.0","198.51.100.5"];

function randItem(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function genScore(type){
  if(type==="SQLi")         return randInt(72,96);
  if(type==="XSS")          return randInt(58,82);
  if(type==="BruteForce")   return randInt(60,90);
  if(type==="PathTraversal")return randInt(52,75);
  return randInt(28,48);
}
function scoreLevel(s){ return s>=85?"CRITICAL":s>=60?"HIGH":s>=30?"MEDIUM":"LOW"; }
function genEvent(){
  const type=randItem(ATTACKS), score=genScore(type);
  return { id:Date.now()+Math.random(), ip:randItem(IPS), country:randItem(COUNTRIES),
    type, score, level:scoreLevel(score),
    time:new Date().toLocaleTimeString("en-GB",{hour12:false}),
    path: randItem(["/login","/admin","/api/users","/search","/upload","/db"]),
    method: randItem(["POST","GET","POST","PUT"]) };
}

const INITIAL_EVENTS = Array.from({length:8},(_,i)=>{
  const e=genEvent();
  e.time=new Date(Date.now()-i*14000).toLocaleTimeString("en-GB",{hour12:false});
  return e;
});

const TIMELINE_DATA = Array.from({length:24},(_,i)=>({
  hour:`${String(i).padStart(2,"0")}:00`,
  LOW:randInt(0,12), MEDIUM:randInt(0,8), HIGH:randInt(0,5), CRITICAL:randInt(0,3)
}));

const PIE_DATA = [
  {name:"SQLi",     value:42, color:"#F85149"},
  {name:"XSS",      value:28, color:"#F0883E"},
  {name:"BruteForce",value:18,color:"#E3B341"},
  {name:"Scanner",  value:12, color:"#58A6FF"},
];

const TOP_IPS = [
  {ip:"192.168.1.100", country:"🇨🇳 China",   attacks:47, type:"SQLi",    level:"CRITICAL"},
  {ip:"45.33.32.220",  country:"🇷🇺 Russia",   attacks:31, type:"Scanner", level:"HIGH"},
  {ip:"103.21.244.1",  country:"🇧🇷 Brazil",   attacks:28, type:"XSS",    level:"HIGH"},
  {ip:"185.220.101.34",country:"🇩🇪 Germany",  attacks:19, type:"BruteForce",level:"MEDIUM"},
  {ip:"91.108.4.0",    country:"🇮🇳 India",    attacks:14, type:"PathTraversal",level:"MEDIUM"},
];

const ATTACKER = {
  ip:"192.168.1.100", country:"China", city:"Beijing", isp:"China Telecom",
  ua:"sqlmap/1.7.8#dev (https://sqlmap.org)", lang:"zh-CN",
  tools:["sqlmap","nikto"], first:"2026-06-01 09:14", last:"2026-06-07 10:31",
  total:47, sessions:3,
  recent: INITIAL_EVENTS.slice(0,5).map(e=>({...e, ip:"192.168.1.100", country:"🇨🇳 China"}))
};

// ── Shared UI Components ───────────────────────────────────────────────────
const s = (obj) => obj; // style passthrough

function Badge({level, small}){
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,
      padding:small?"2px 6px":"3px 10px",borderRadius:4,
      background:sevBg[level],border:`1px solid ${sevColor[level]}`,
      color:sevColor[level],fontSize:small?10:11,fontWeight:600,letterSpacing:"0.04em"}}>
      <span style={{fontSize:small?8:10}}>{sevDot[level]}</span>{level}
    </span>
  );
}

function ScoreBar({score,compact}){
  const color = score>=85?T.critical:score>=60?T.high:score>=30?T.medium:T.low;
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{flex:1,height:compact?4:6,background:T.surface2,borderRadius:3,overflow:"hidden",minWidth:compact?40:60}}>
        <div style={{width:`${score}%`,height:"100%",background:color,borderRadius:3,
          transition:"width 0.4s ease",
          boxShadow:score>=85?`0 0 6px ${color}40`:"none"}}/>
      </div>
      <span style={{color,fontWeight:700,fontSize:compact?11:13,minWidth:compact?22:28,fontFamily:"monospace"}}>{score}</span>
    </div>
  );
}

function Card({children,style,glow}){
  return (
    <div style={{background:T.surface,border:`1px solid ${glow?T.critical+"60":T.border}`,
      borderRadius:8,padding:"16px",overflow:"hidden",
      boxShadow:glow?`0 0 20px ${T.critical}15`:"none",...style}}>
      {children}
    </div>
  );
}

function PanelTitle({icon,title,right}){
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:13}}>{icon}</span>
        <span style={{color:T.text,fontWeight:600,fontSize:13,letterSpacing:"0.03em"}}>{title}</span>
      </div>
      {right && <span style={{color:T.muted,fontSize:11}}>{right}</span>}
    </div>
  );
}

function StatCard({icon,label,value,sub,color}){
  color=color||T.blue;
  return (
    <Card style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <div style={{color:T.muted,fontSize:11,fontWeight:500,letterSpacing:"0.05em",
            textTransform:"uppercase",marginBottom:6}}>{label}</div>
          <div style={{color,fontSize:30,fontWeight:700,lineHeight:1,fontFamily:"monospace"}}>{value}</div>
          <div style={{color:T.muted,fontSize:11,marginTop:5}}>{sub}</div>
        </div>
        <span style={{fontSize:20,opacity:0.6}}>{icon}</span>
      </div>
    </Card>
  );
}

function Btn({children,primary,danger,small,onClick,style}){
  const bg = primary?T.blue:danger?T.critical:T.surface2;
  const col = primary||danger?"#0D1117":T.blue;
  return (
    <button onClick={onClick} style={{padding:small?"4px 10px":"7px 14px",
      background:bg,color:col,border:`1px solid ${primary?T.blue:danger?T.critical:T.border}`,
      borderRadius:5,fontSize:small?11:12,fontWeight:600,cursor:"pointer",
      fontFamily:"inherit",transition:"all 0.15s",...style}}>
      {children}
    </button>
  );
}

// ── Screen: Landing Page ───────────────────────────────────────────────────
function Landing({onNav}){
  const features = [
    {icon:"🤖", title:"Dual AI Engine",   desc:"Isolation Forest anomaly detection + Random Forest classifier. Catches attacks pattern matching misses."},
    {icon:"🍯", title:"Honeypot Trap",    desc:"CRITICAL threats get a convincing fake admin panel. Attackers think they're in — you're recording everything."},
    {icon:"📊", title:"Live Dashboard",   desc:"10 real-time panels. Threat feed, geo map, attacker profiles, attack timeline — all updating via WebSocket."},
    {icon:"🐍", title:"3-Line Python SDK",desc:"pip install cyber-guardian. Add 3 lines of middleware. Your app is protected in under 15 minutes."},
  ];
  return (
    <div style={{color:T.text,minHeight:"100vh"}}>
      {/* Nav */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:`${T.bg}ee`,
        backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.border}`,
        padding:"0 40px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🛡️</span>
          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:16,color:T.blue}}>AI Cyber Guardian</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          {["Docs","Pricing","About"].map(l=>(
            <span key={l} style={{color:T.muted,fontSize:13,cursor:"pointer"}}>{l}</span>
          ))}
          <Btn small onClick={()=>onNav("login")}>Login</Btn>
          <Btn small primary onClick={()=>onNav("login")}>Get Started →</Btn>
        </div>
      </nav>

      {/* Hero */}
      <div style={{maxWidth:900,margin:"0 auto",padding:"80px 40px 60px",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,
          background:T.surface2,border:`1px solid ${T.border}`,
          borderRadius:20,padding:"4px 12px",marginBottom:24}}>
          <span style={{width:6,height:6,background:T.low,borderRadius:"50%",display:"block"}}/>
          <span style={{color:T.muted,fontSize:12}}>Live on DigitalOcean — 99.9% uptime</span>
        </div>

        <h1 style={{fontSize:52,fontWeight:700,lineHeight:1.1,marginBottom:20,
          background:`linear-gradient(135deg, ${T.text} 60%, ${T.blue})`,
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Stop Web Attacks<br/>Before They Reach Your App.
        </h1>
        <p style={{fontSize:17,color:T.muted,maxWidth:520,margin:"0 auto 32px",lineHeight:1.7}}>
          AI-powered real-time detection, automatic blocking, and honeypot trapping — packaged in one Python SDK.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:52}}>
          <Btn primary onClick={()=>onNav("dashboard")} style={{padding:"10px 24px",fontSize:14}}>
            → View Live Dashboard
          </Btn>
          <button style={{padding:"10px 24px",background:"transparent",
            border:`1px solid ${T.border}`,color:T.text,borderRadius:5,
            fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
            ▶ Watch Demo
          </button>
        </div>

        {/* Code block */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,
          borderRadius:10,textAlign:"left",overflow:"hidden",maxWidth:560,margin:"0 auto"}}>
          <div style={{background:T.surface2,padding:"8px 16px",borderBottom:`1px solid ${T.border}`,
            display:"flex",alignItems:"center",gap:6}}>
            {["#F85149","#E3B341","#3FB950"].map(c=>(
              <span key={c} style={{width:10,height:10,background:c,borderRadius:"50%"}}/>
            ))}
            <span style={{color:T.muted,fontSize:11,marginLeft:6}}>terminal</span>
          </div>
          <div style={{padding:"16px 20px",fontFamily:"monospace",fontSize:13,lineHeight:2}}>
            <div><span style={{color:T.muted}}>$ </span><span style={{color:T.green}}>pip install cyber-guardian</span></div>
            <div style={{marginTop:8}}><span style={{color:T.purple}}>from</span><span style={{color:T.text}}> cyber_guardian </span><span style={{color:T.purple}}>import</span><span style={{color:T.text}}> Guardian</span></div>
            <div><span style={{color:T.text}}>guard = Guardian(site_id=</span><span style={{color:T.medium}}>"..."</span><span style={{color:T.text}}>, api_key=</span><span style={{color:T.medium}}>"..."</span><span style={{color:T.text}}>)</span></div>
            <div><span style={{color:T.text}}>result = </span><span style={{color:T.purple}}>await</span><span style={{color:T.text}}> guard.check(request)  </span><span style={{color:T.muted}}># ✓ protected</span></div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`,
        padding:"20px 40px",display:"flex",justifyContent:"center",gap:60,background:T.surface}}>
        {[["91.3%","Detection Accuracy"],["< 3s","Response Time"],["< 10%","False Positive Rate"],["6","Attack Types"]].map(([v,l])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:26,fontWeight:700,color:T.blue,fontFamily:"monospace"}}>{v}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{maxWidth:900,margin:"60px auto",padding:"0 40px"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <h2 style={{fontSize:28,fontWeight:700,color:T.text,marginBottom:8}}>Everything you need to protect your app</h2>
          <p style={{color:T.muted,fontSize:14}}>One platform. One SDK. Complete protection.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {features.map(f=>(
            <Card key={f.title} style={{padding:"20px 22px"}}>
              <div style={{fontSize:24,marginBottom:10}}>{f.icon}</div>
              <div style={{fontWeight:600,fontSize:15,color:T.text,marginBottom:6}}>{f.title}</div>
              <div style={{color:T.muted,fontSize:13,lineHeight:1.6}}>{f.desc}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{maxWidth:900,margin:"0 auto 60px",padding:"0 40px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <h2 style={{fontSize:26,fontWeight:700,color:T.text}}>Simple pricing</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          {[
            {name:"Free",price:"₹0",desc:"1 website · 1,000 checks/day · Community support",cta:"Get Started",primary:false},
            {name:"Pro",price:"₹999/mo",desc:"5 websites · 50,000 checks/day · Email support · PDF reports",cta:"Start Free Trial",primary:true},
            {name:"Enterprise",price:"Custom",desc:"Unlimited sites · Unlimited checks · 24/7 support · Custom rules",cta:"Contact Us",primary:false},
          ].map(p=>(
            <Card key={p.name} style={{padding:"22px",border:`1px solid ${p.primary?T.blue:T.border}`,
              boxShadow:p.primary?`0 0 20px ${T.blue}20`:undefined}}>
              <div style={{fontWeight:700,fontSize:16,color:p.primary?T.blue:T.text,marginBottom:4}}>{p.name}</div>
              <div style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:10,fontFamily:"monospace"}}>{p.price}</div>
              <div style={{color:T.muted,fontSize:12,lineHeight:1.7,marginBottom:16}}>{p.desc}</div>
              <Btn primary={p.primary} small style={{width:"100%",justifyContent:"center"}}>{p.cta}</Btn>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Screen: Login ──────────────────────────────────────────────────────────
function Login({onNav}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [loading,setLoading]=useState(false);
  const inputStyle={width:"100%",background:T.surface2,border:`1px solid ${T.border}`,
    color:T.text,borderRadius:5,padding:"9px 12px",fontSize:13,fontFamily:"inherit",outline:"none"};
  function submit(){
    setLoading(true);
    setTimeout(()=>onNav("dashboard"),900);
  }
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",
      background:`radial-gradient(ellipse at 50% 0%, ${T.surface} 0%, ${T.bg} 70%)`}}>
      <nav style={{padding:"16px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",
        borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>onNav("landing")}>
          <span>🛡️</span>
          <span style={{fontFamily:"monospace",fontWeight:700,color:T.blue}}>AI Cyber Guardian</span>
        </div>
        <span style={{color:T.muted,fontSize:12}}>← Back to home</span>
      </nav>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <Card style={{width:"100%",maxWidth:380,padding:"32px 30px"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <span style={{fontSize:32}}>🛡️</span>
            <h2 style={{fontSize:20,fontWeight:700,color:T.text,margin:"10px 0 4px"}}>Welcome back</h2>
            <p style={{color:T.muted,fontSize:13}}>Sign in to your account</p>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{color:T.muted,fontSize:12,display:"block",marginBottom:5}}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="your@email.com" style={inputStyle}/>
          </div>
          <div style={{marginBottom:8}}>
            <label style={{color:T.muted,fontSize:12,display:"block",marginBottom:5}}>Password</label>
            <input value={pass} onChange={e=>setPass(e.target.value)}
              type="password" placeholder="••••••••••" style={inputStyle}/>
          </div>
          <div style={{textAlign:"right",marginBottom:20}}>
            <span style={{color:T.blue,fontSize:11,cursor:"pointer"}}>Forgot password?</span>
          </div>
          <button onClick={submit} style={{width:"100%",padding:"10px",background:loading?T.surface2:T.blue,
            color:loading?T.muted:"#0D1117",border:"none",borderRadius:5,fontSize:13,
            fontWeight:600,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
            {loading?"Signing in...":"Sign In →"}
          </button>
          <p style={{textAlign:"center",color:T.muted,fontSize:12,marginTop:16}}>
            No account? <span style={{color:T.blue,cursor:"pointer"}}>Register</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

// ── Screen: Dashboard ──────────────────────────────────────────────────────
function Dashboard({onNav, onProfile}){
  const [events,setEvents]=useState(INITIAL_EVENTS);
  const [activeNav,setActiveNav]=useState("overview");
  const [newId,setNewId]=useState(null);

  useEffect(()=>{
    const t=setInterval(()=>{
      const e=genEvent();
      setNewId(e.id);
      setEvents(prev=>[e,...prev].slice(0,50));
      setTimeout(()=>setNewId(null),600);
    },3500);
    return ()=>clearInterval(t);
  },[]);

  const navItems=[
    {id:"overview",icon:"⚡",label:"Overview"},
    {id:"feed",icon:"📋",label:"Live Feed"},
    {id:"analytics",icon:"📊",label:"Analytics"},
    {id:"geo",icon:"🌍",label:"Geo Map"},
    {id:"blocked",icon:"🚫",label:"Blocked IPs"},
    {id:"honeypot",icon:"🍯",label:"Honeypot"},
    {id:"attackers",icon:"👤",label:"Attackers"},
  ];
  const total=events.length, blocked=events.filter(e=>e.level==="CRITICAL"||e.level==="HIGH").length;
  const critCount=events.filter(e=>e.level==="CRITICAL").length;

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,color:T.text,overflow:"hidden"}}>
      {/* Sidebar */}
      <div style={{width:220,background:T.surface,borderRight:`1px solid ${T.border}`,
        display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${T.border}`,
          display:"flex",alignItems:"center",gap:8}}>
          <span>🛡️</span>
          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:13,color:T.blue}}>AI CyberGuardian</span>
        </div>
        <div style={{padding:"8px 8px",flex:1,overflow:"auto"}}>
          {navItems.map(n=>(
            <div key={n.id} onClick={()=>setActiveNav(n.id)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
                borderRadius:5,cursor:"pointer",marginBottom:1,
                background:activeNav===n.id?"rgba(88,166,255,0.1)":undefined,
                borderLeft:`2px solid ${activeNav===n.id?T.blue:"transparent"}`,
                color:activeNav===n.id?T.blue:T.muted,fontSize:13,transition:"all 0.12s"}}>
              <span style={{fontSize:12}}>{n.icon}</span>{n.label}
            </div>
          ))}
          <div style={{borderTop:`1px solid ${T.border}`,margin:"8px 0"}}/>
          {[{id:"sites",icon:"🌐",label:"Sites"},{id:"reports",icon:"📄",label:"Reports"},{id:"settings",icon:"⚙️",label:"Settings"}].map(n=>(
            <div key={n.id} onClick={()=>setActiveNav(n.id)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
                borderRadius:5,cursor:"pointer",marginBottom:1,
                background:activeNav===n.id?"rgba(88,166,255,0.1)":undefined,
                color:activeNav===n.id?T.blue:T.muted,fontSize:13}}>
              <span style={{fontSize:12}}>{n.icon}</span>{n.label}
            </div>
          ))}
        </div>
        <div style={{padding:"12px 14px",borderTop:`1px solid ${T.border}`}}>
          <div style={{fontSize:11,color:T.muted}}>client@example.com</div>
          <div onClick={()=>onNav("landing")}
            style={{fontSize:11,color:T.blue,cursor:"pointer",marginTop:3}}>← Sign out</div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:52,borderBottom:`1px solid ${T.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"0 20px",flexShrink:0,background:T.surface}}>
          <div>
            <span style={{fontWeight:600,fontSize:15}}>Dashboard Overview</span>
            <span style={{color:T.muted,fontSize:11,marginLeft:10}}>
              <span style={{color:T.low}}>●</span> Live — updating every 3.5s
            </span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn small>Export PDF</Btn>
            <Btn small primary>+ Add Site</Btn>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:16}}>
          {/* Stat cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
            <StatCard icon="🛡️" label="Threats Today"     value={total}    sub="↑ 12% vs yesterday"  color={T.blue}/>
            <StatCard icon="🚫" label="IPs Blocked"        value={blocked}  sub="↑ 5% vs yesterday"   color={T.high}/>
            <StatCard icon="🍯" label="Honeypot Sessions"  value={3}        sub="3 active right now"   color={T.purple}/>
            <StatCard icon="✅" label="Detection Rate"     value="91.3%"    sub={`FP rate: 4.2%`}      color={T.low}/>
          </div>

          {/* Row 2: Feed + Pie */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:12,marginBottom:14}}>
            {/* Live Feed */}
            <Card>
              <PanelTitle icon="📋" title="LIVE THREAT FEED" right={`${events.length} events`}/>
              <div style={{maxHeight:240,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${T.border}`}}>
                      {["Time","IP","Country","Attack","Severity","Score"].map(h=>(
                        <th key={h} style={{color:T.muted,fontWeight:500,padding:"0 6px 6px",textAlign:"left",fontSize:11}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0,12).map((e,i)=>(
                      <tr key={e.id}
                        onClick={()=>e.ip==="192.168.1.100"&&onProfile()}
                        style={{borderBottom:`1px solid ${T.border}20`,cursor:"pointer",
                          background: e.id===newId&&i===0?"rgba(88,166,255,0.06)":"transparent",
                          transition:"background 0.4s",
                          animation: e.id===newId&&i===0?"slideIn 0.3s ease":"none"}}>
                        <td style={{padding:"6px 6px",color:T.muted,fontFamily:"monospace",fontSize:11}}>{e.time}</td>
                        <td style={{padding:"6px 6px",fontFamily:"monospace",fontSize:11,color:T.blue}}>{e.ip}</td>
                        <td style={{padding:"6px 6px",fontSize:11}}>{e.country}</td>
                        <td style={{padding:"6px 6px"}}>
                          <span style={{background:T.surface2,padding:"1px 6px",borderRadius:3,fontSize:11,color:T.text}}>{e.type}</span>
                        </td>
                        <td style={{padding:"6px 6px"}}><Badge level={e.level} small/></td>
                        <td style={{padding:"6px 6px",minWidth:80}}><ScoreBar score={e.score} compact/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pie Chart */}
            <Card>
              <PanelTitle icon="🥧" title="ATTACK TYPES"/>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                    dataKey="value" strokeWidth={0}>
                    {PIE_DATA.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:T.surface2,border:`1px solid ${T.border}`,
                    borderRadius:5,fontSize:11,color:T.text}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:8}}>
                {PIE_DATA.map(d=>(
                  <div key={d.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
                    <span style={{width:7,height:7,background:d.color,borderRadius:"50%",flexShrink:0}}/>
                    <span style={{color:T.muted}}>{d.name}</span>
                    <span style={{color:T.text,marginLeft:"auto",fontFamily:"monospace"}}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 3: Timeline + Top IPs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:12,marginBottom:14}}>
            {/* Timeline */}
            <Card>
              <PanelTitle icon="📈" title="THREATS OVER TIME" right="Last 24 hours"/>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={TIMELINE_DATA} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <XAxis dataKey="hour" tick={{fontSize:9,fill:T.muted}} interval={3} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:9,fill:T.muted}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:T.surface2,border:`1px solid ${T.border}`,
                    borderRadius:5,fontSize:11,color:T.text}} labelStyle={{color:T.muted}}/>
                  <Line dataKey="CRITICAL" stroke={T.critical} strokeWidth={1.5} dot={false}/>
                  <Line dataKey="HIGH"     stroke={T.high}     strokeWidth={1.5} dot={false}/>
                  <Line dataKey="MEDIUM"   stroke={T.medium}   strokeWidth={1.5} dot={false}/>
                  <Line dataKey="LOW"      stroke={T.low}      strokeWidth={1.5} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:12,marginTop:6}}>
                {["CRITICAL","HIGH","MEDIUM","LOW"].map(l=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}>
                    <span style={{width:10,height:2,background:sevColor[l],borderRadius:1}}/>
                    <span style={{color:T.muted}}>{l}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top IPs */}
            <Card>
              <PanelTitle icon="🏆" title="TOP ATTACKERS"/>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {TOP_IPS.map((ip,i)=>(
                  <div key={ip.ip} onClick={()=>ip.ip==="192.168.1.100"&&onProfile()}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                      borderRadius:5,cursor:"pointer",background:T.surface2}}>
                    <span style={{color:T.muted,fontSize:11,minWidth:14,fontFamily:"monospace"}}>#{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"monospace",fontSize:11,color:T.blue,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ip.ip}</div>
                      <div style={{fontSize:10,color:T.muted}}>{ip.country}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:sevColor[ip.level]}}>{ip.attacks}</div>
                      <Badge level={ip.level} small/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 4: Blocked IPs + Honeypot */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card>
              <PanelTitle icon="🚫" title="BLOCKED IPs" right={<Btn small>Manage</Btn>}/>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
                  {["IP","Reason","Blocked At","Action"].map(h=>(
                    <th key={h} style={{color:T.muted,padding:"0 6px 5px",textAlign:"left",fontWeight:500}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {events.filter(e=>e.level==="CRITICAL").slice(0,4).map((e,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${T.border}20`}}>
                      <td style={{padding:"5px 6px",fontFamily:"monospace",color:T.blue}}>{e.ip}</td>
                      <td style={{padding:"5px 6px",color:T.muted}}>{e.type} attack</td>
                      <td style={{padding:"5px 6px",color:T.muted,fontFamily:"monospace"}}>{e.time}</td>
                      <td style={{padding:"5px 6px"}}><Btn small danger>Unblock</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card glow={critCount>0}>
              <PanelTitle icon="🍯" title="HONEYPOT SESSIONS"
                right={<span style={{color:T.low,fontSize:11}}>● 3 active</span>}/>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {ip:"192.168.1.100",country:"🇨🇳 China",dur:"4m 12s",reqs:38,live:true},
                  {ip:"45.33.32.220",  country:"🇷🇺 Russia",dur:"1m 08s",reqs:14,live:true},
                  {ip:"103.21.244.1",  country:"🇧🇷 Brazil", dur:"0m 44s",reqs:7, live:false},
                ].map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",
                    background:T.surface2,borderRadius:5,cursor:"pointer"}}>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"monospace",fontSize:11,color:T.blue}}>{s.ip}</div>
                      <div style={{fontSize:10,color:T.muted}}>{s.country}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,color:T.text,fontFamily:"monospace"}}>{s.dur}</div>
                      <div style={{fontSize:10,color:T.muted}}>{s.reqs} requests</div>
                    </div>
                    <div style={{width:8,height:8,borderRadius:"50%",
                      background:s.live?T.low:T.muted,
                      boxShadow:s.live?`0 0 6px ${T.low}`:"none"}}/>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen: Attacker Profile ───────────────────────────────────────────────
function AttackerProfile({onBack}){
  const a = ATTACKER;
  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text}}>
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"12px 24px",
        display:"flex",alignItems:"center",gap:12,background:T.surface}}>
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${T.border}`,
          color:T.muted,padding:"5px 12px",borderRadius:4,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
          ← Back
        </button>
        <span style={{fontWeight:600,fontSize:14}}>Attacker Profile</span>
        <Badge level="CRITICAL"/>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:24}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          {/* Identity */}
          <Card style={{padding:20}}>
            <PanelTitle icon="👤" title="IDENTITY"/>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
              <div style={{width:52,height:52,borderRadius:"50%",
                background:`linear-gradient(135deg,${T.critical},${T.purple})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,flexShrink:0}}>🤖</div>
              <div>
                <div style={{fontFamily:"monospace",fontSize:18,fontWeight:700,color:T.critical}}>{a.ip}</div>
                <div style={{color:T.muted,fontSize:12,marginTop:3}}>📍 {a.city}, {a.country}  ·  {a.isp}</div>
              </div>
            </div>
            {[
              ["Browser / OS", a.ua],
              ["Accept-Language", a.lang],
              ["First Seen", a.first],
              ["Last Seen", a.last],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",gap:12,padding:"7px 0",
                borderTop:`1px solid ${T.border}20`,alignItems:"flex-start"}}>
                <span style={{color:T.muted,fontSize:11,minWidth:110,flexShrink:0}}>{k}</span>
                <span style={{fontSize:11,color:T.text,fontFamily:"monospace",wordBreak:"break-all"}}>{v}</span>
              </div>
            ))}
          </Card>

          {/* Stats */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <StatCard icon="⚡" label="Total Attacks"    value={a.total}    sub="across all sessions" color={T.critical}/>
              <StatCard icon="🍯" label="Honeypot Sessions" value={a.sessions} sub="avg 4m 12s each"    color={T.purple}/>
            </div>
            <Card style={{padding:18}}>
              <PanelTitle icon="🔧" title="DETECTED TOOLS"/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {a.tools.map(t=>(
                  <span key={t} style={{background:T.critBg,border:`1px solid ${T.critical}60`,
                    color:T.critical,padding:"3px 10px",borderRadius:3,fontSize:12,fontFamily:"monospace"}}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{marginTop:12}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:6}}>Attack frequency (47 total)</div>
                <div style={{background:T.surface2,borderRadius:4,height:8,overflow:"hidden"}}>
                  <div style={{width:"94%",height:"100%",
                    background:`linear-gradient(90deg,${T.critical},${T.purple})`,borderRadius:4}}/>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent attacks */}
        <Card>
          <PanelTitle icon="🕐" title="RECENT ATTACKS"/>
          <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${T.border}`}}>
              {["Time","Method","Endpoint","Attack Type","Severity","Score","Action"].map(h=>(
                <th key={h} style={{color:T.muted,padding:"0 8px 8px",textAlign:"left",fontWeight:500,fontSize:11}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {a.recent.map((e,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}20`}}>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",color:T.muted,fontSize:11}}>{e.time}</td>
                  <td style={{padding:"7px 8px"}}>
                    <span style={{background:T.surface2,padding:"1px 6px",borderRadius:3,fontSize:10,color:T.blue,fontFamily:"monospace"}}>{e.method}</span>
                  </td>
                  <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:11,color:T.text}}>{e.path}</td>
                  <td style={{padding:"7px 8px"}}>
                    <span style={{background:T.surface2,padding:"1px 6px",borderRadius:3,fontSize:11}}>{e.type}</span>
                  </td>
                  <td style={{padding:"7px 8px"}}><Badge level={e.level} small/></td>
                  <td style={{padding:"7px 8px",minWidth:90}}><ScoreBar score={e.score} compact/></td>
                  <td style={{padding:"7px 8px"}}>
                    <span style={{fontSize:11,color:e.level==="CRITICAL"?T.purple:e.level==="HIGH"?T.critical:T.muted}}>
                      {e.level==="CRITICAL"?"honeypot":e.level==="HIGH"?"blocked":"logged"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn danger>Block IP Permanently</Btn>
            <Btn>View Honeypot Session</Btn>
            <Btn>Export Profile</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState("landing");
  const [showProfile,setShowProfile]=useState(false);

  useEffect(()=>{
    document.body.style.margin="0";
    document.body.style.padding="0";
    document.body.style.background=T.bg;
    document.body.style.fontFamily="'Inter',system-ui,-apple-system,sans-serif";
  },[]);

  // Screen nav bar
  const screens=[
    {id:"landing",  label:"🏠 Landing"},
    {id:"login",    label:"🔐 Login"},
    {id:"dashboard",label:"📊 Dashboard"},
  ];

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.text}}>
      {/* Screen switcher */}
      <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",
        zIndex:9999,display:"flex",gap:6,background:`${T.surface}ee`,
        backdropFilter:"blur(8px)",border:`1px solid ${T.border}`,
        borderRadius:30,padding:"6px 10px",boxShadow:"0 4px 24px #00000060"}}>
        {screens.map(s=>(
          <button key={s.id} onClick={()=>{setScreen(s.id);setShowProfile(false);}}
            style={{padding:"5px 14px",background:screen===s.id?T.blue:"transparent",
              color:screen===s.id?"#0D1117":T.muted,border:"none",
              borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:600,
              fontFamily:"inherit",transition:"all 0.15s"}}>
            {s.label}
          </button>
        ))}
        <div style={{width:1,background:T.border,margin:"2px 2px"}}/>
        <span style={{color:T.muted,fontSize:10,display:"flex",alignItems:"center",paddingRight:4}}>
          AI Cyber Guardian UI
        </span>
      </div>

      {screen==="landing" && !showProfile &&
        <Landing onNav={setScreen}/>}
      {screen==="login" && !showProfile &&
        <Login onNav={setScreen}/>}
      {screen==="dashboard" && !showProfile &&
        <Dashboard onNav={setScreen} onProfile={()=>setShowProfile(true)}/>}
      {showProfile &&
        <AttackerProfile onBack={()=>setShowProfile(false)}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
        input::placeholder{color:${T.muted}!important}
        input{color:${T.text}!important}
        @keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
      `}</style>
    </div>
  );
}
