import { useState, useEffect, useCallback } from "react";
import {
  fetchClickUpTasks,
  fetchNotionCapacity,
  fetchNotionSkills,
  assignTaskInClickUp,
  unassignTaskInClickUp,
  API_READY,
} from "./api.js";

const B={
  magenta:"#ed2290",tangerine:"#faa41a",royalBlue:"#2e4ea2",black:"#0d0d0d",
  G:"linear-gradient(90deg,#ed2290 0%,#f4622a 50%,#faa41a 100%)",
  // Surfaces — noticeably lighter so cells are readable
  s1:"#161616",   // page background
  s2:"#1f1f1f",   // card/panel background
  s3:"#2a2a2a",   // elevated surface
  // Borders — visible but not heavy
  border:"#2e2e2e",
  b2:"#3a3a3a",
  // Text — much higher contrast throughout
  tp:"#f0ece8",   // primary text — near white
  ts:"#b0a8a0",   // secondary text — warm mid-grey (was #7a7a7a, almost invisible)
  tm:"#6e6560",   // muted text — still readable (was #3a3a3a, disappeared)
  green:"#22c55e",red:"#ef4444"
};
const G=B.G;
const CC={BBC:"#2e4ea2",BUNNINGS:"#22c55e","COMM BANK":"#faa41a",PROLOGICAL:"#f97316",TOGA:"#06b6d4","TWO BLIND MICE":"#8b5cf6",WARRIGAL:"#ec4899"};
const PC={urgent:"#ef4444",high:"#faa41a",normal:"#22c55e",low:"#4b5563"};
const RC={"Graphic Designer":"#ed2290","Motion Designer":"#2e4ea2","Content Producer":"#faa41a","Studio Manager":"#8b5cf6"};
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const DS=["MON","TUE","WED","THU","FRI"];
const SMAP={"Brand & Corporate":["Brand & Identity"],"Canva Solutions":["Canva Design"],"Content - Written":["Copywriting","Content Planning"],"Digital Ads":["Digital Ads"],"Print & Document":["Print & Document"],"Signage":["Graphic Design"],"Social Content":["Social Media","Content Planning"],"Video Production":["Video Editing","Motion & Animation"],"Web & Email":["Web & Email"]};

// Statuses EXCLUDED from unassigned view — brief required intentionally NOT in this list
// so forecasting tasks appear even before the brief is finalised
const EXCLUDED_STATUSES=["completed","approved - studio finalise"];

const SO=["brief required","prod action rq","prod in progress","internal review","external review","approved - studio finalise","blocked","completed"];

const OPS=[
  {icon:"📋",title:"Required ClickUp fields",color:"#ed2290",items:[
    {l:"Task Name",n:"Clear deliverable name — e.g. 'CommBank Product - HLPT Guide - Presentation'"},
    {l:"Time Estimate",n:"Must be set before a task appears correctly on the board. This drives capacity planning — tasks without it won't count against available hours."},
    {l:"Stage Deadline",n:"The final delivery date for this deliverable. Different from the Due Date (start date). Set this when briefing."},
    {l:"Client",n:"Select from the Client dropdown — required for filtering and colour-coding on the board."},
    {l:"Services",n:"Tag the type of work (e.g. Canva Solutions, Video Production) — used for skill matching to designers."},
    {l:"Status",n:"Keep status current. All statuses including 'Brief Required' show in the Unassigned tab so you can forecast and plan ahead."},
  ]},
  {icon:"👤",title:"How assignment works",color:"#faa41a",items:[
    {l:"Designer field",n:"Assigning from this board sets the Designer custom field in ClickUp — this is NOT the same as formally assigning the task to the freelancer."},
    {l:"Due Date = Start Date",n:"The date you set here becomes the ClickUp Due Date, which represents when the designer starts work — not when it's delivered."},
    {l:"Stage Deadline",n:"The Stage Deadline custom field = the actual delivery date. Always set this separately in ClickUp."},
    {l:"Formal assignment",n:"After scheduling here, go to ClickUp and formally assign the task to the freelancer once the brief is complete and ready to hand over."},
    {l:"Brief Required tasks",n:"You can assign a designer and start date to a 'Brief Required' task for forecasting purposes. Don't formally assign in ClickUp until the brief is finalised."},
  ]},
  {icon:"📅",title:"Daily workflow",color:"#2e4ea2",items:[
    {l:"1. Review unassigned",n:"Open the Unassigned tab — all tasks without a Designer field set are shown, including Brief Required tasks for forecasting."},
    {l:"2. Check capacity",n:"Switch to Board view to see who has hours available this week. Green = free capacity, amber = getting full, red = over-allocated."},
    {l:"3. Check skill match",n:"Expand any task card to see which designers are a ✓ MATCH, ~ PARTIAL, or ⚠ NOT SUITED based on the Services tags."},
    {l:"4. Assign",n:"Select designer + start date and click Assign. This updates the Designer field and Due Date in ClickUp immediately."},
    {l:"5. Click day cells",n:"On the Board, click any day cell to see exactly what's assigned and shuffle tasks if priorities change."},
    {l:"6. Confirm in ClickUp",n:"After scheduling, formally assign tasks to freelancers in ClickUp and progress statuses as work moves forward."},
  ]},
  {icon:"⚠️",title:"Common mistakes",color:"#ef4444",items:[
    {l:"No time estimate",n:"If a task has no Time Estimate it won't count against capacity. Always set this before scheduling, even for Brief Required tasks."},
    {l:"Designer ≠ Assignee",n:"The Designer custom field and the ClickUp task assignee are separate. The board sets the custom field — you still need to formally assign in ClickUp."},
    {l:"Over-allocating",n:"The board shows committed hours vs available hours but cannot block you from over-allocating. Watch for red capacity bars."},
    {l:"Missing from board",n:"If a task isn't showing: check it's in the Production Hub list, check the Designer field isn't already set (assigned tasks are hidden), and check your filters."},
    {l:"Tommie — no capacity",n:"Tommie has no entries in the Capacity Register yet. Add his availability in Notion before assigning tasks to him."},
  ]},
];

// ─── DATE HELPERS (local time — never UTC) ────────────────────
function ld(s){const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12,0,0);}
function lms(s){return ld(s).getTime();}
function fd(d){if(!d)return"";const dt=d instanceof Date?d:new Date(Number(d));return`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;}
function mon(date){const d=new Date(date),dw=d.getDay();d.setDate(d.getDate()+(dw===0?-6:1-dw));d.setHours(12,0,0,0);return d;}
function wdays(monday){return Array.from({length:5},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);d.setHours(12,0,0,0);return d;});}
function fs(d){return new Date(d).toLocaleDateString("en-AU",{day:"numeric",month:"short"});}
function ff(d){if(!d)return"—";return new Date(d instanceof Date?d:Number(d)).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"});}
function mh(ms){return ms?Math.round((ms/3600000)*10)/10:0;}
function hl(h){if(!h)return"—";return`${h%1===0?h:h.toFixed(1)}h`;}
function ini(n){return n.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();}

// ─── MOCK DATA ────────────────────────────────────────────────
const DESIGNERS=[
  {designer:"Agata",clickupUserId:"2783144",role:"Graphic Designer",skills:["Graphic Design","Canva Design","Video Editing","Digital Ads","Print & Document","Brand & Identity","Web & Email","Presentations"],skillNotes:"Advanced Canva. Better for shorter social edits than long-form video.",notSuitedFor:"Copywriting, content strategy"},
  {designer:"Matthew de Feudis",clickupUserId:"101028419",role:"Motion Designer",skills:["Graphic Design","Canva Design","Video Editing","Motion & Animation","Digital Ads","Print & Document","Brand & Identity"],skillNotes:"Strongest video editor. Less experienced Canva than Agata.",notSuitedFor:"Copywriting, written content"},
  {designer:"Tracy Thomas",clickupUserId:"88952655",role:"Studio Manager",skills:["Graphic Design","Presentations","Print & Document","Brand & Identity"],skillNotes:"Strong CommBank context. Well-suited to presentations and brand documents.",notSuitedFor:""},
  {designer:"Chris Urankar",clickupUserId:"100813714",role:"Content Producer",skills:["Copywriting","Content Planning","Social Media","Web & Email"],skillNotes:"Content producer only. First choice for all written/strategy work.",notSuitedFor:"Graphic design, Canva, video, motion"},
  {designer:"Tommie McSweeney",clickupUserId:"101010119",role:"Motion Designer",skills:["Video Editing","Motion & Animation"],skillNotes:"Update profile with strengths once known.",notSuitedFor:""},
];

const UINIT=[
  {id:"u1",name:"CommBank BB - ES Money Slide - Presentation",status:"approved - studio finalise",stage_deadline:String(lms("2026-05-01")),time_estimate:7200000,priority:{priority:"urgent"},client:"COMM BANK",services:["Presentations"]},
  {id:"u2",name:"CommBank Product - HLPT How Do I Guide",status:"internal review",stage_deadline:String(lms("2026-04-30")),time_estimate:14400000,priority:{priority:"high"},client:"COMM BANK",services:["Presentations","Print & Document"]},
  {id:"u3",name:"Lysaght New Dealer Lead Automation Video",status:"prod action rq",stage_deadline:String(lms("2026-04-29")),time_estimate:18000000,priority:{priority:"high"},client:"BUNNINGS",services:["Video Production"]},
  {id:"u4",name:"Fielders Automation Cheat Sheet - Layout",status:"prod action rq",stage_deadline:String(lms("2026-05-07")),time_estimate:10800000,priority:{priority:"normal"},client:"BUNNINGS",services:["Print & Document","Canva Solutions"]},
  {id:"u5",name:"FLDS - SEO - Carport Mistakes - Social Plan",status:"prod action rq",stage_deadline:String(lms("2026-05-01")),time_estimate:5400000,priority:{priority:"high"},client:"BUNNINGS",services:["Social Content","Content - Written"]},
  {id:"u6",name:"CommBank Product - CBA Brand Kit Creation",status:"prod in progress",stage_deadline:String(lms("2026-05-02")),time_estimate:21600000,priority:{priority:"urgent"},client:"COMM BANK",services:["Brand & Corporate","Canva Solutions"]},
  {id:"u7",name:"Fielders Centenary Dealer FAQs - Layout",status:"prod action rq",stage_deadline:String(lms("2026-04-29")),time_estimate:7200000,priority:{priority:"urgent"},client:"BUNNINGS",services:["Print & Document"]},
  {id:"u8",name:"LYS - ENSEAM Feature Blog - Copywriting",status:"internal review",stage_deadline:String(lms("2026-04-29")),time_estimate:3600000,priority:{priority:"normal"},client:"BUNNINGS",services:["Social Content","Content - Written"]},
  // Brief Required tasks — show for forecasting
  {id:"u9",name:"CommBank Marketing - CBA Agency Bulk Create",status:"brief required",stage_deadline:String(lms("2026-05-09")),time_estimate:14400000,priority:{priority:"urgent"},client:"COMM BANK",services:["Brand & Corporate","Canva Solutions"]},
  {id:"u10",name:"CommBank Product - Website Template",status:"brief required",stage_deadline:String(lms("2026-05-09")),time_estimate:21600000,priority:{priority:"urgent"},client:"COMM BANK",services:["Web & Email"]},
];

const AINIT={
  "2783144":[
    {id:"a1",name:"CommBank BB - Defence Proposition Pres. 01",status:"approved - studio finalise",due_date:String(lms("2026-04-29")),stage_deadline:String(lms("2026-05-02")),time_estimate:10800000,priority:{priority:"urgent"},client:"COMM BANK",services:["Presentations"],assignedTo:"2783144"},
    {id:"a2",name:"LYS - Carmel Village Blog Post",status:"external review",due_date:String(lms("2026-05-01")),stage_deadline:null,time_estimate:5400000,priority:{priority:"high"},client:"BUNNINGS",services:["Content - Written"],assignedTo:"2783144"},
  ],
  "101028419":[
    {id:"a3",name:"Lysaght Dealer Lead InfoGraphic",status:"internal review",due_date:String(lms("2026-04-29")),stage_deadline:String(lms("2026-05-06")),time_estimate:14400000,priority:{priority:"normal"},client:"BUNNINGS",services:["Print & Document","Canva Solutions"],assignedTo:"101028419"},
    {id:"a4",name:"Fielders Centenary Dealer Lead Video",status:"prod action rq",due_date:String(lms("2026-04-30")),stage_deadline:String(lms("2026-05-07")),time_estimate:18000000,priority:{priority:"high"},client:"BUNNINGS",services:["Video Production"],assignedTo:"101028419"},
  ],
  "100813714":[
    {id:"a5",name:"Fielders Social Media Community Mgmt",status:"prod in progress",due_date:String(lms("2026-04-29")),stage_deadline:String(lms("2026-04-30")),time_estimate:7200000,priority:{priority:"urgent"},client:"BUNNINGS",services:["Social Content"],assignedTo:"100813714"},
  ],
  "88952655":[
    {id:"a6",name:"CommBank BB - Defence Proposition Pres. 03",status:"approved - studio finalise",due_date:String(lms("2026-04-30")),stage_deadline:String(lms("2026-05-01")),time_estimate:10800000,priority:{priority:"urgent"},client:"COMM BANK",services:["Presentations"],assignedTo:"88952655"},
  ],
};

function buildCap(ws){
  const days=wdays(ws),isPH=fd(days[0])==="2026-04-28";
  const pat={"2783144":[0,8,0,0,8],"101028419":[isPH?0:8,8,8,8,8],"88952655":[isPH?0:4,4,4,3,0],"100813714":[isPH?0:4,8,0,8,4],"101010119":[0,0,0,0,0]};
  const sta={"2783144":["Unavailable","Available","Unavailable","Unavailable","Available"],"101028419":[isPH?"Public Holiday":"Available","Available","Available","Available","Available"],"88952655":[isPH?"Public Holiday":"Partially Available","Partially Available","Partially Available","Partially Available","Unavailable"],"100813714":[isPH?"Public Holiday":"Partially Available","Available","Unavailable","Available","Partially Available"],"101010119":["Unavailable","Unavailable","Unavailable","Unavailable","Unavailable"]};
  const not={"2783144":["","","","",""],"101028419":[isPH?"ANZAC Day":"","","","",""],"88952655":[isPH?"ANZAC Day":"15hrs/wk","15hrs/wk","15hrs/wk","15hrs/wk","No Fridays"],"100813714":[isPH?"ANZAC Day":"Half day","Full day","Unavail","Full day","Half day"],"101010119":["","","","",""]};
  const out=[];
  DESIGNERS.forEach(d=>{
    const p=pat[d.clickupUserId]||[0,0,0,0,0],s=sta[d.clickupUserId]||Array(5).fill("Unavailable"),n=not[d.clickupUserId]||Array(5).fill("");
    days.forEach((day,i)=>out.push({designer:d.designer,clickupUserId:d.clickupUserId,date:fd(day),dayOfWeek:DAYS[i],availableHours:p[i],status:s[i],notes:n[i]}));
  });
  return out;
}

// ─── UI ATOMS ─────────────────────────────────────────────────
const gt=(txt,sz=11,fw=700,sx={})=>(
  <span style={{fontSize:sz,fontWeight:fw,fontFamily:"'Poppins',sans-serif",background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",...sx}}>{txt}</span>
);

function Logo(){
  return(
    <svg width={116} height={20} viewBox="0 0 280 50" fill="none">
      <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ed2290"/><stop offset="50%" stopColor="#f4622a"/><stop offset="100%" stopColor="#faa41a"/></linearGradient></defs>
      <text x="0" y="43" fontFamily="'Poppins',sans-serif" fontWeight="900" fontSize="50" fill="url(#lg)">ZOO</text>
      <text x="148" y="43" fontFamily="'Poppins',sans-serif" fontWeight="900" fontSize="50" fill="white">DESIGN</text>
    </svg>
  );
}

function Av({name,role,size=32}){
  const rc=RC[role]||B.magenta;
  return(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"#111",border:`1.5px solid ${rc}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {gt(ini(name),size*0.3,800)}
    </div>
  );
}

function SPill({status}){
  const m={"brief required":{bg:"rgba(139,92,246,0.2)",c:"#a78bfa"},"prod action rq":{bg:"rgba(250,164,26,0.15)",c:B.tangerine},"prod in progress":{bg:"rgba(237,34,144,0.15)",c:B.magenta},"internal review":{bg:"rgba(34,197,94,0.12)",c:B.green},"external review":{bg:"rgba(34,197,94,0.12)",c:"#4ade80"},"approved - studio finalise":{bg:"rgba(255,255,255,0.06)",c:"#555"},"blocked":{bg:"rgba(239,68,68,0.15)",c:B.red}};
  const s=m[status]||{bg:"rgba(255,255,255,0.05)",c:"#444"};
  return <span style={{fontSize:9,padding:"2px 8px",borderRadius:20,background:s.bg,color:s.c,fontFamily:"'Poppins',sans-serif",fontWeight:600,textTransform:"uppercase",whiteSpace:"nowrap"}}>{status}</span>;
}

function CBar({available,committed}){
  const safe=Math.max(available,0.01),pct=Math.min((committed/safe)*100,110);
  const over=committed>available,warn=!over&&committed/available>=0.75;
  const barBg=over?B.red:warn?B.tangerine:G;
  const freeH=Math.max(available-committed,0);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:700,
          color:over?B.red:warn?B.tangerine:"#4ade80"}}>  {/* brighter green */}
          {over?`+${(committed-available).toFixed(1)}h over`:`${hl(freeH)} free`}
        </span>
        <span style={{fontSize:9,fontFamily:"'Poppins',sans-serif",color:"#888",fontWeight:500}}>
          {committed>0?`${committed}/${available}h`:`${available}h`}
        </span>
      </div>
      <div style={{height:4,background:"#2a2a2a",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:barBg,borderRadius:2,transition:"width 0.4s"}}/>
      </div>
    </div>
  );
}

function DayCell({day,cap,committed,taskCount,isToday,onClick}){
  const avail=cap?.availableHours??0,status=cap?.status??"Unavailable";
  const isPH=status==="Public Holiday",unavail=status==="Unavailable"||avail===0;
  const partAvail=status==="Partially Available";
  const over=committed>avail&&avail>0;
  const[hov,setHov]=useState(false);

  // Clear visual hierarchy: available = noticeably lighter, unavailable = dark/muted, today = tinted
  let bg="#1a1a1a"; // default unavailable — dark but not black
  if(isPH) bg="#1c1506";                          // warm dark amber tint
  else if(unavail) bg="#111";                     // darkest — clearly off
  else if(isToday) bg="#1e0d18";                  // magenta-tinted for today
  else if(partAvail) bg="#1c1a14";                // slight warm tint for partial
  else bg="#1e2018";                              // available — slightly lifted warm green-tinted dark

  const bdr=hov&&!unavail
    ? B.magenta
    : isToday ? `${B.magenta}88`
    : over ? `${B.red}88`
    : !unavail&&!isPH ? "#3a3a3a"                 // available cells get a visible border
    : "#202020";                                  // unavailable cells recede

  // Day number colour — available = warm white, unavailable = clearly dimmed
  const dayNumColor=unavail&&!isPH?"#333":isToday?"#fff":!unavail?"#d4cfc9":"#555";
  const dayLabelColor=unavail&&!isPH?"#2a2a2a":isToday?B.magenta:!unavail?"#7a7268":"#333";

  return(
    <div onClick={()=>{if(!unavail||isPH)onClick();}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:bg,borderRadius:6,padding:"8px 9px",minHeight:82,border:`1px solid ${bdr}`,cursor:unavail&&!isPH?"default":"pointer",transition:"border-color 0.15s,background 0.15s",position:"relative",overflow:"hidden"}}>
      {isToday&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:G}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,marginTop:isToday?4:0}}>
        <div>
          <div style={{fontSize:8,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",color:dayLabelColor}}>{DS[(day.getDay()+6)%7]}</div>
          <div style={{fontSize:15,fontFamily:"'Poppins',sans-serif",fontWeight:800,lineHeight:1,
            ...(isToday?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:dayNumColor})
          }}>{day.getDate()}</div>
        </div>
        {isPH
          ? <span style={{fontSize:7,color:B.tangerine,background:"rgba(250,164,26,0.15)",border:`1px solid ${B.tangerine}66`,padding:"1px 5px",borderRadius:10,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>PH</span>
          : !unavail&&<span style={{fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:700,color:over?B.red:"#a09890"}}>{avail}h</span>}
      </div>
      {!unavail&&!isPH&&avail>0&&<CBar available={avail} committed={committed}/>}
      {taskCount>0&&(
        <div style={{marginTop:5,display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:over?B.red:B.magenta}}/>
          <span style={{fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:600,color:over?B.red:B.magenta}}>
            {taskCount} task{taskCount!==1?"s":""}
          </span>
        </div>
      )}
      {unavail&&!isPH&&(
        <div style={{fontSize:11,color:"#2a2a2a",fontFamily:"'Poppins',sans-serif",marginTop:6,textAlign:"center"}}>—</div>
      )}
    </div>
  );
}

function DTask({task,allD,curId,onR,onU,idx}){
  const[exp,setExp]=useState(false),[nd,setNd]=useState(""),[ndate,setNdate]=useState("");
  const cc=CC[task.client]||B.magenta,sdl=task.stage_deadline?new Date(Number(task.stage_deadline)):null;
  return(
    <div style={{marginBottom:8,animation:`fU 0.18s ease ${idx*0.06}s both`}}>
      <div style={{background:B.s2,border:`1px solid ${B.b2}`,borderLeft:`3px solid ${cc}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"10px 12px",cursor:"pointer"}} onClick={()=>setExp(!exp)}>
          <div style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
            <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,marginTop:3,background:PC[task.priority?.priority]||"#4b5563"}}/>
            <span style={{fontSize:12,color:B.tp,fontFamily:"'Poppins',sans-serif",fontWeight:500,lineHeight:1.35,flex:1}}>{task.name}</span>
            <span style={{color:B.tm,fontSize:10}}>{exp?"▲":"▼"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
            <span style={{fontSize:10,color:cc,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>{task.client}</span>
            <span style={{color:B.tm}}>·</span>
            <span style={{fontSize:10,color:B.ts,fontFamily:"'Poppins',sans-serif"}}>{hl(mh(task.time_estimate))}</span>
            {sdl&&<><span style={{color:B.tm}}>·</span><span style={{fontSize:9,color:B.tangerine,fontFamily:"'Poppins',sans-serif",fontWeight:600}}>DL {fs(sdl)}</span></>}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}><SPill status={task.status}/>{task.services?.map(s=><span key={s} style={{fontSize:8,color:B.tm,background:"rgba(255,255,255,0.04)",padding:"2px 5px",borderRadius:4,fontFamily:"'Poppins',sans-serif"}}>{s}</span>)}</div>
        </div>
        {exp&&(
          <div style={{padding:"10px 12px",borderTop:`1px solid ${B.border}`}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Reassign Task</div>
            <div style={{display:"flex",gap:5,marginBottom:5}}>
              <select value={nd} onChange={e=>setNd(e.target.value)} style={{flex:1,background:"#0a0a0a",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"5px 7px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}>
                <option value="">Move to…</option>
                {allD.filter(d=>d.clickupUserId!==curId).map(d=><option key={d.clickupUserId} value={d.clickupUserId}>{d.designer}</option>)}
              </select>
              <input type="date" value={ndate} onChange={e=>setNdate(e.target.value)} style={{flex:1,background:"#0a0a0a",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"5px 7px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}/>
            </div>
            <div style={{display:"flex",gap:5}}>
              <button onClick={()=>{if(nd&&ndate)onR(task,curId,nd,ndate);}} disabled={!nd||!ndate} style={{flex:1,padding:"6px 0",background:nd&&ndate?G:"#1a1a1a",color:nd&&ndate?"#000":B.tm,border:"none",borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:700,cursor:nd&&ndate?"pointer":"not-allowed"}}>REASSIGN →</button>
              <button onClick={()=>onU(task,curId)} style={{padding:"6px 10px",background:"rgba(239,68,68,0.1)",color:B.red,border:`1px solid ${B.red}44`,borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:600,cursor:"pointer"}}>REMOVE</button>
            </div>
            <p style={{fontSize:9,color:B.tm,margin:"4px 0 0",fontFamily:"'Poppins',sans-serif",textAlign:"center"}}>Formal reassignment still needed in ClickUp</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Drawer({open,designer,day,cap,tasks,designers,onClose,onReassign,onUnassign}){
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};if(open)document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[open,onClose]);
  if(!open||!designer||!day)return null;
  const avail=cap?.availableHours||0,committed=tasks.reduce((s,t)=>s+mh(t.time_estimate),0);
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:200,backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:420,background:B.s1,borderLeft:`1px solid ${B.b2}`,zIndex:201,overflowY:"auto",display:"flex",flexDirection:"column",animation:"sIR 0.25s cubic-bezier(0.16,1,0.3,1)"}}>
        <div style={{height:3,background:G,flexShrink:0}}/>
        <div style={{padding:"18px 20px",borderBottom:`1px solid ${B.border}`,position:"sticky",top:0,background:B.s1,zIndex:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Av name={designer.designer} role={designer.role} size={40}/>
              <div>
                <div style={{fontSize:15,color:B.tp,fontFamily:"'Poppins',sans-serif",fontWeight:800}}>{designer.designer}</div>
                <div style={{fontSize:10,color:B.tm,fontFamily:"'Poppins',sans-serif"}}>{ff(day)}</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:"none",border:`1px solid ${B.b2}`,color:B.tm,cursor:"pointer",fontSize:13,width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=B.magenta;e.currentTarget.style.color=B.magenta;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=B.b2;e.currentTarget.style.color=B.tm;}}>✕</button>
          </div>
          <div style={{marginTop:12,padding:"10px 12px",background:B.s2,borderRadius:8,border:`1px solid ${B.border}`}}>
            {avail===0?<div style={{fontSize:11,color:B.tm,fontFamily:"'Poppins',sans-serif",textAlign:"center"}}>{cap?.status==="Public Holiday"?`🗓 Public Holiday${cap.notes?" — "+cap.notes:""}` :"Unavailable this day"}</div>:<CBar available={avail} committed={committed}/>}
            {cap?.notes&&avail>0&&<div style={{fontSize:10,color:B.tm,fontFamily:"'Poppins',sans-serif",marginTop:5,fontStyle:"italic"}}>{cap.notes}</div>}
          </div>
        </div>
        <div style={{padding:"16px 20px",flex:1}}>
          {tasks.length===0?<div style={{textAlign:"center",padding:"50px 0"}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:12,color:B.tm,fontFamily:"'Poppins',sans-serif"}}>No tasks assigned this day</div></div>:(
            <>
              <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>{tasks.length} Task{tasks.length!==1?"s":""} · {hl(committed)} committed</div>
              {tasks.map((task,idx)=><DTask key={task.id} task={task} allD={designers} curId={designer.clickupUserId} onR={onReassign} onU={onUnassign} idx={idx}/>)}
            </>
          )}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${B.border}`,background:B.s2}}>
          <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Skills</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{designer.skills?.map(s=><span key={s} style={{fontSize:9,background:"rgba(46,78,162,0.15)",color:"#5b7fd4",border:`1px solid ${B.royalBlue}44`,padding:"2px 7px",borderRadius:20,fontFamily:"'Poppins',sans-serif"}}>{s}</span>)}</div>
          {designer.notSuitedFor&&<div style={{marginTop:6,fontSize:9,color:B.red,fontFamily:"'Poppins',sans-serif"}}>⚠ Not suited for: {designer.notSuitedFor}</div>}
        </div>
      </div>
    </>
  );
}

function TCard({task,designers,onAssign,isAssigning}){
  const[exp,setExp]=useState(false),[sd,setSd]=useState(""),[sdate,setSdate]=useState("");
  const cc=CC[task.client]||B.magenta,sdl=task.stage_deadline?new Date(Number(task.stage_deadline)):null;
  const dlU=sdl&&(sdl-Date.now())<3*24*3600*1000;
  const isBriefReq=task.status==="brief required";
  const sm=d=>{const req=(task.services||[]).flatMap(s=>SMAP[s]||[]);if(!req.length)return"none";const ns=d.notSuitedFor&&task.services.some(s=>d.notSuitedFor.toLowerCase().includes(s.toLowerCase().replace(" & ","").split(" ")[0]));if(ns)return"blocked";const m=req.filter(r=>d.skills?.includes(r));return m.length===req.length?"full":m.length>0?"partial":"none";};
  const MB={full:{l:"✓ MATCH",c:B.green,bg:"rgba(34,197,94,0.1)"},partial:{l:"~ PARTIAL",c:B.tangerine,bg:"rgba(250,164,26,0.1)"},blocked:{l:"⚠ NOT SUITED",c:B.red,bg:"rgba(239,68,68,0.1)"},none:{l:"— NO MATCH",c:B.tm,bg:"transparent"}};
  return(
    <div style={{background:B.s2,border:`1px solid ${B.b2}`,borderLeft:`3px solid ${cc}`,borderRadius:8,overflow:"hidden"}}>
      <div style={{padding:"12px 13px",cursor:"pointer"}} onClick={()=>setExp(!exp)}>
        <div style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,marginTop:3,background:PC[task.priority?.priority]||"#4b5563"}}/>
          <span style={{fontSize:12,color:B.tp,fontFamily:"'Poppins',sans-serif",fontWeight:500,lineHeight:1.35,flex:1}}>{task.name}</span>
          <span style={{color:B.tm,fontSize:10}}>{exp?"▲":"▼"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
          <span style={{fontSize:10,color:cc,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>{task.client}</span>
          <span style={{color:B.tm}}>·</span>
          <span style={{fontSize:10,color:B.ts,fontFamily:"'Poppins',sans-serif"}}>{hl(mh(task.time_estimate))}</span>
        </div>
        {sdl&&(
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:dlU?"rgba(239,68,68,0.1)":"rgba(250,164,26,0.08)",border:`1px solid ${dlU?B.red+"55":B.tangerine+"44"}`,borderRadius:20,padding:"3px 10px",marginBottom:7}}>
            <span style={{fontSize:8,color:dlU?B.red:B.tangerine,fontFamily:"'Poppins',sans-serif",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Stage Deadline</span>
            <span style={{fontSize:10,color:dlU?B.red:B.tangerine,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>{ff(sdl)}</span>
          </div>
        )}
        <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
          <SPill status={task.status}/>
          {isBriefReq&&<span style={{fontSize:8,color:"#a78bfa",background:"rgba(139,92,246,0.1)",padding:"2px 7px",borderRadius:10,fontFamily:"'Poppins',sans-serif",fontWeight:600}}>Forecast only</span>}
          {task.services?.map(s=><span key={s} style={{fontSize:8,color:B.tm,background:"rgba(255,255,255,0.04)",padding:"2px 6px",borderRadius:4,fontFamily:"'Poppins',sans-serif"}}>{s}</span>)}
        </div>
      </div>
      {exp&&(
        <div style={{padding:"13px",borderTop:`1px solid ${B.border}`}} onClick={e=>e.stopPropagation()}>
          {isBriefReq&&<div style={{padding:"8px 10px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.25)",borderRadius:6,marginBottom:10,fontSize:10,color:"#a78bfa",fontFamily:"'Poppins',sans-serif",lineHeight:1.5}}>📝 Brief not yet finalised — you can assign a designer for forecasting. Don't formally assign in ClickUp until the brief is ready.</div>}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Skill Match</div>
            {designers.map(d=>{const match=sm(d),badge=MB[match],rc=RC[d.role]||B.magenta;return(
              <div key={d.clickupUserId} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${B.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#111",border:`1px solid ${rc}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>{gt(ini(d.designer),7,800)}</div>
                  <span style={{fontSize:11,color:B.ts,fontFamily:"'Poppins',sans-serif"}}>{d.designer}</span>
                </div>
                <span style={{fontSize:9,color:badge.c,background:badge.bg,padding:"2px 7px",borderRadius:20,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>{badge.l}</span>
              </div>
            );})}
          </div>
          <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Assign Task</div>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <select value={sd} onChange={e=>setSd(e.target.value)} style={{flex:1,background:"#0a0a0a",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"6px 8px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}>
              <option value="">Select designer…</option>
              {designers.map(d=><option key={d.clickupUserId} value={d.clickupUserId}>{d.designer}</option>)}
            </select>
            <div style={{flex:1}}>
              <input type="date" value={sdate} onChange={e=>setSdate(e.target.value)} style={{width:"100%",background:"#0a0a0a",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"6px 8px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}/>
              <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",marginTop:2}}>Sets ClickUp due date</div>
            </div>
          </div>
          <button onClick={()=>{if(sd&&sdate){const d=designers.find(x=>x.clickupUserId===sd);onAssign(task.id,sd,sdate,d?.designer);}}} disabled={!sd||!sdate||isAssigning}
            style={{width:"100%",padding:"9px 0",background:sd&&sdate?G:"#1a1a1a",color:sd&&sdate?"#000":B.tm,border:"none",borderRadius:6,fontSize:11,fontFamily:"'Poppins',sans-serif",fontWeight:800,cursor:sd&&sdate?"pointer":"not-allowed"}}>
            {isAssigning?"ASSIGNING…":"ASSIGN IN CLICKUP →"}
          </button>
          <p style={{fontSize:9,color:B.tm,margin:"4px 0 0",fontFamily:"'Poppins',sans-serif",textAlign:"center"}}>Sets Designer field + due date · Formal assignment still needed in ClickUp</p>
        </div>
      )}
    </div>
  );
}

function OpsGuide({onClose}){
  const[sec,setSec]=useState(0);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[onClose]);
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:300,backdropFilter:"blur(6px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:700,maxHeight:"80vh",background:B.s1,borderRadius:12,border:`1px solid ${B.b2}`,zIndex:301,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.9)"}}>
        <div style={{height:3,background:G,flexShrink:0}}/>
        <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${B.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>{gt("Studio Board — Operations Guide",15,800)}<div style={{fontSize:11,color:B.tm,fontFamily:"'Poppins',sans-serif",marginTop:2}}>Reference guide for daily scheduling</div></div>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${B.b2}`,color:B.tm,cursor:"pointer",width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}} onMouseEnter={e=>{e.currentTarget.style.borderColor=B.magenta;e.currentTarget.style.color=B.magenta;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=B.b2;e.currentTarget.style.color=B.tm;}}>✕</button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${B.border}`,flexShrink:0,overflowX:"auto"}}>
          {OPS.map((s,i)=>(
            <button key={i} onClick={()=>setSec(i)} style={{padding:"9px 16px",background:sec===i?B.s2:"none",border:"none",borderBottom:sec===i?`2px solid ${s.color}`:"2px solid transparent",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:11,fontWeight:sec===i?700:500,color:sec===i?B.tp:B.tm,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
              <span>{s.icon}</span>{s.title}
            </button>
          ))}
        </div>
        <div style={{padding:"18px 22px",overflowY:"auto",flex:1}}>
          {OPS[sec].items.map((item,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"11px 13px",background:B.s2,borderRadius:8,border:`1px solid ${B.border}`,borderLeft:`3px solid ${OPS[sec].color}`,marginBottom:6}}>
              <div style={{minWidth:150,flexShrink:0}}><span style={{fontSize:11,color:OPS[sec].color,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>{item.l}</span></div>
              <div style={{fontSize:12,color:B.ts,fontFamily:"'Poppins',sans-serif",lineHeight:1.55}}>{item.n}</div>
            </div>
          ))}
        </div>
        <div style={{padding:"10px 22px",borderTop:`1px solid ${B.border}`,background:B.s2,display:"flex",justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose} style={{background:G,border:"none",color:"#000",padding:"7px 18px",borderRadius:6,fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer"}}>Got it ✓</button>
        </div>
      </div>
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App(){
  // Week state — default to current week's Monday
  const[ws,setWs]=useState(()=>mon(new Date()));
  // Task data
  const[ua,setUa]=useState([]);           // unassigned tasks (Designer field empty)
  const[asgn,setAsgn]=useState({});       // assigned tasks keyed by clickupUserId
  // Capacity + designers from Notion
  const[cap,setCap]=useState([]);
  const[designers,setDesigners]=useState(DESIGNERS); // starts with hardcoded, replaced by Notion
  // UI state
  const[aId,setAId]=useState(null);
  const[loading,setLoading]=useState(false);
  const[loadError,setLoadError]=useState(null);
  const[toast,setToast]=useState(null);
  const[fSt,setFSt]=useState("all");
  const[fCl,setFCl]=useState("all");
  const[srch,setSrch]=useState("");
  const[tab,setTab]=useState("board");
  const[drawer,setDrawer]=useState({open:false,designer:null,day:null});
  const[ops,setOps]=useState(false);

  const wd=wdays(ws);
  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),5000);};

  // ── LOAD ALL DATA ──────────────────────────────────────────
  const loadData=useCallback(async()=>{
    setLoading(true);
    setLoadError(null);
    try {
      if(API_READY){
        // ── LIVE MODE ──────────────────────────────────────
        const weekStart=fd(wd[0]);
        const weekEnd=fd(wd[4]);

        // Fetch all three sources in parallel
        const[taskData, capData, skillData]=await Promise.all([
          fetchClickUpTasks(),
          fetchNotionCapacity(weekStart, weekEnd),
          fetchNotionSkills(),
        ]);

        // Update designers from Notion skills (Option C — Notion controls who's schedulable)
        if(skillData.length>0) setDesigners(skillData);

        // Set unassigned tasks
        setUa(taskData.unassigned);

        // Convert assigned tasks array into object keyed by clickupUserId
        const asgnMap={};
        taskData.assigned.forEach(t=>{
          const uid=t.designerUserId;
          if(!uid)return;
          if(!asgnMap[uid])asgnMap[uid]=[];
          asgnMap[uid].push(t);
        });
        setAsgn(asgnMap);

        // Set capacity
        setCap(capData);

      } else {
        // ── DEMO MODE (Notion token not yet configured) ────
        setCap(buildCap(ws));
        setUa(UINIT);
        setAsgn(AINIT);
        setDesigners(DESIGNERS);
        if(toast===null){
          // Show one-time notice that demo data is being used
          showToast("Running in demo mode — add your Notion token to api.js to load live data","warn");
        }
      }
    } catch(err){
      console.error("Board load error:", err);
      setLoadError(err.message);
      showToast(`Load failed: ${err.message}`,"error");
      // Fall back to demo data so the board stays usable
      setCap(buildCap(ws));
      if(ua.length===0){setUa(UINIT);setAsgn(AINIT);}
    } finally {
      setLoading(false);
    }
  },[ws]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load on mount and whenever the week changes
  useEffect(()=>{loadData();},[loadData]);

  // ── ASSIGN ─────────────────────────────────────────────────
  const doAssign=async(tid,uid,dateStr,dName)=>{
    setAId(tid);
    const task=ua.find(t=>t.id===tid);
    if(!task){setAId(null);return;}
    const dm=String(lms(dateStr));

    // Optimistic update — move task immediately so UI feels instant
    setUa(p=>p.filter(t=>t.id!==tid));
    setAsgn(p=>({...p,[uid]:[...(p[uid]||[]),{...task,due_date:dm,assignedTo:uid}]}));

    if(API_READY){
      try{
        await assignTaskInClickUp(tid, uid, Number(dm));
        showToast(`✓ ${dName} assigned in ClickUp — complete formal task assignment there too.`);
      } catch(err){
        // Roll back optimistic update on failure
        setUa(p=>[task,...p]);
        setAsgn(p=>({...p,[uid]:(p[uid]||[]).filter(t=>t.id!==tid)}));
        showToast(`Assignment failed: ${err.message}`,"error");
      }
    } else {
      showToast(`✓ ${dName} assigned (demo mode — not saved to ClickUp).`);
    }
    setAId(null);
  };

  // ── REASSIGN ───────────────────────────────────────────────
  const doReassign=async(task,from,to,dateStr)=>{
    const dm=String(lms(dateStr));
    const toName=designers.find(d=>d.clickupUserId===to)?.designer;

    // Optimistic update
    setAsgn(p=>{
      const n={...p};
      n[from]=(n[from]||[]).filter(t=>t.id!==task.id);
      n[to]=[...(n[to]||[]),{...task,due_date:dm,assignedTo:to}];
      return n;
    });

    if(API_READY){
      try{
        // Unset old designer, set new one + new due date
        await unassignTaskInClickUp(task.id, from);
        await assignTaskInClickUp(task.id, to, Number(dm));
        showToast(`↔ Reassigned to ${toName} in ClickUp.`);
      } catch(err){
        // Roll back
        setAsgn(p=>{
          const n={...p};
          n[from]=[...(n[from]||[]),task];
          n[to]=(n[to]||[]).filter(t=>t.id!==task.id);
          return n;
        });
        showToast(`Reassign failed: ${err.message}`,"error");
      }
    } else {
      showToast(`↔ Reassigned to ${toName} (demo mode).`);
    }
    setDrawer({open:false,designer:null,day:null});
  };

  // ── UNASSIGN ───────────────────────────────────────────────
  const doUnassign=async(task,from)=>{
    // Optimistic update
    setAsgn(p=>({...p,[from]:(p[from]||[]).filter(t=>t.id!==task.id)}));
    setUa(p=>[{...task,due_date:null,assignedTo:undefined},...p]);

    if(API_READY){
      try{
        await unassignTaskInClickUp(task.id, from);
        showToast("Task unassigned. Remove the Designer field in ClickUp too.","warn");
      } catch(err){
        // Roll back
        setAsgn(p=>({...p,[from]:[...(p[from]||[]),task]}));
        setUa(p=>p.filter(t=>t.id!==task.id));
        showToast(`Unassign failed: ${err.message}`,"error");
      }
    } else {
      showToast("Task returned to Unassigned (demo mode).","warn");
    }
    setDrawer({open:false,designer:null,day:null});
  };

  // Filter unassigned — exclude completed and approved only
  const filt=ua.filter(t=>{
    if(EXCLUDED_STATUSES.includes(t.status))return false;
    if(fSt!=="all"&&t.status!==fSt)return false;
    if(fCl!=="all"&&t.client!==fCl)return false;
    if(srch&&!t.name.toLowerCase().includes(srch.toLowerCase()))return false;
    return true;
  });

  const allCl=[...new Set(ua.filter(t=>!EXCLUDED_STATUSES.includes(t.status)).map(t=>t.client).filter(Boolean))];
  const allSt=[...new Set(ua.filter(t=>!EXCLUDED_STATUSES.includes(t.status)).map(t=>t.status))].sort((a,b)=>SO.indexOf(a)-SO.indexOf(b));
  const navW=dir=>{const d=new Date(ws);d.setDate(d.getDate()+dir*7);setWs(d);};
  const ph=ua.filter(t=>!EXCLUDED_STATUSES.includes(t.status)).reduce((s,t)=>s+mh(t.time_estimate),0);

  const dTasks=drawer.open&&drawer.designer&&drawer.day?(asgn[drawer.designer.clickupUserId]||[]).filter(t=>t.due_date&&fd(new Date(Number(t.due_date)))===fd(drawer.day)):[];
  const dCap=drawer.open&&drawer.designer&&drawer.day?cap.find(c=>c.clickupUserId===drawer.designer?.clickupUserId&&c.date===fd(drawer.day)):null;

  const selSx={background:"#0d0d0d",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"5px 9px",fontSize:10,fontFamily:"'Poppins',sans-serif",cursor:"pointer"};
  const navBtn={background:"#111",border:`1px solid ${B.b2}`,color:B.tm,width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"};

  return(
    <div style={{height:"100vh",background:B.black,color:B.tp,fontFamily:"'Poppins',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px;}
        select,input,button{outline:none;}
        select option{background:#111;color:#f5f0ef;}
        @keyframes sIR{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fU{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes tIn{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes loadBar{0%{opacity:0.4;transform:scaleX(0.3);transform-origin:left}50%{opacity:1;transform:scaleX(1);transform-origin:left}100%{opacity:0.4;transform:scaleX(0.3);transform-origin:right}}
      `}</style>

      {toast&&(
        <div style={{position:"fixed",top:16,right:16,zIndex:500,
          background:toast.type==="warn"?"#1a0f00":toast.type==="error"?"#1a0000":"#001a0a",
          border:`1px solid ${toast.type==="warn"?B.tangerine+"55":toast.type==="error"?B.red+"55":B.green+"55"}`,
          color:toast.type==="warn"?B.tangerine:toast.type==="error"?B.red:B.green,
          padding:"11px 18px",borderRadius:8,fontSize:12,fontFamily:"'Poppins',sans-serif",
          fontWeight:500,maxWidth:420,boxShadow:"0 12px 40px rgba(0,0,0,0.8)",animation:"tIn 0.2s ease"}}>
          {toast.msg}
        </div>
      )}
      {/* Loading bar across top of page */}
      {loading&&<div style={{position:"fixed",top:0,left:0,right:0,height:2,zIndex:999,background:G,animation:"loadBar 1.5s ease-in-out infinite"}}/>}

      {/* HEADER */}
      <div style={{borderBottom:`1px solid ${B.border}`,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:B.black,flexShrink:0,height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Logo/>
          <div style={{width:1,height:26,background:B.border}}/>
          <div>
            <div style={{fontSize:9,color:"#888",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>Studio Board</div>
            <div style={{fontSize:8,color:"#666",fontFamily:"'Poppins',sans-serif"}}>{filt.length} unassigned · {ph.toFixed(1)}h pending</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            {["‹","›"].map((ch,i)=>(
              <button key={ch} onClick={()=>navW(i===0?-1:1)} style={navBtn}
                onMouseEnter={e=>{e.currentTarget.style.background=G;e.currentTarget.style.color="#000";e.currentTarget.style.borderColor="transparent";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#111";e.currentTarget.style.color=B.tm;e.currentTarget.style.borderColor=B.b2;}}>{ch}</button>
            ))}
            <span style={{fontSize:11,color:B.ts,fontFamily:"'Poppins',sans-serif",fontWeight:600,minWidth:138,textAlign:"center"}}>{fs(wd[0])} — {fs(wd[4])} 2026</span>
          </div>
          <div style={{width:1,height:20,background:B.border}}/>
          <div style={{display:"flex",background:"#0d0d0d",borderRadius:8,padding:3,gap:2}}>
            {["board","unassigned"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?G:"none",border:"none",cursor:"pointer",padding:"5px 13px",borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:700,color:tab===t?"#000":B.tm,transition:"all 0.15s"}}>
                {t==="unassigned"?<>UNASSIGNED{filt.length>0&&<span style={{background:tab==="unassigned"?"rgba(0,0,0,0.2)":"rgba(237,34,144,0.2)",color:tab==="unassigned"?"#000":B.magenta,borderRadius:10,padding:"0 6px",marginLeft:4,fontSize:9,fontWeight:800}}>{filt.length}</span>}</>:"BOARD"}
              </button>
            ))}
          </div>
          <button onClick={()=>setOps(true)} style={{background:"#111",border:`1px solid ${B.b2}`,color:B.tm,padding:"5px 11px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:4,transition:"all 0.12s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=B.tangerine;e.currentTarget.style.color=B.tangerine;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=B.b2;e.currentTarget.style.color=B.tm;}}>📋 OPS GUIDE</button>
          <button style={{background:"#111",border:`1px solid ${B.b2}`,color:loading?B.magenta:B.tm,padding:"5px 11px",borderRadius:6,cursor:loading?"not-allowed":"pointer",fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.06em",transition:"all 0.12s",opacity:loading?0.7:1}} onClick={()=>{if(!loading)loadData();}} onMouseEnter={e=>{if(!loading){e.currentTarget.style.borderColor=B.magenta;e.currentTarget.style.color=B.magenta;}}} onMouseLeave={e=>{e.currentTarget.style.borderColor=B.b2;e.currentTarget.style.color=B.tm;}}>{loading?"⟳ LOADING…":"↻ REFRESH"}</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {tab==="board"&&(
          <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
            <div style={{display:"grid",gridTemplateColumns:"192px repeat(5,1fr)",gap:4,marginBottom:7}}>
              <div/>
              {wd.map((day,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>{DS[i]}</div>
                  <div style={{fontSize:11,fontFamily:"'Poppins',sans-serif",fontWeight:800,...(fd(day)===fd(new Date())?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#2a2a2a"})}}>{fs(day)}</div>
                </div>
              ))}
            </div>
            {designers.map(designer=>{
              const dCp=cap.filter(c=>c.clickupUserId===designer.clickupUserId);
              const dAs=asgn[designer.clickupUserId]||[];
              const wkT=dCp.reduce((s,c)=>s+(c.availableHours||0),0);
              return(
                <div key={designer.clickupUserId} style={{display:"grid",gridTemplateColumns:"192px repeat(5,1fr)",gap:4,marginBottom:5,alignItems:"start"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,paddingRight:8,paddingTop:4}}>
                    <Av name={designer.designer} role={designer.role} size={32}/>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:11,color:"#f0ece8",fontFamily:"'Poppins',sans-serif",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{designer.designer}</div>
                      <div style={{fontSize:8,color:"#888",fontFamily:"'Poppins',sans-serif",fontWeight:500}}>{designer.role}</div>
                      <div style={{fontSize:8,fontFamily:"'Poppins',sans-serif",fontWeight:700,marginTop:1,...(wkT>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#555"})}}>{wkT}h this week</div>
                    </div>
                  </div>
                  {wd.map((day,i)=>{
                    const cp=dCp.find(c=>c.date===fd(day));
                    const dt=dAs.filter(t=>t.due_date&&fd(new Date(Number(t.due_date)))===fd(day));
                    const cm=dt.reduce((s,t)=>s+mh(t.time_estimate),0);
                    return <DayCell key={i} day={day} cap={cp} committed={cm} taskCount={dt.length} isToday={fd(day)===fd(new Date())} onClick={()=>setDrawer({open:true,designer,day})}/>;
                  })}
                </div>
              );
            })}
            <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${B.border}`}}>
              <div style={{display:"grid",gridTemplateColumns:"192px repeat(5,1fr)",gap:4}}>
                <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,paddingTop:5,textAlign:"right",paddingRight:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Studio Total</div>
                {wd.map((day,i)=>{
                  const tot=designers.reduce((s,d)=>{const c=cap.find(x=>x.clickupUserId===d.clickupUserId&&x.date===fd(day));return s+(c?.availableHours||0);},0);
                  const bk=designers.reduce((s,d)=>{const dt=(asgn[d.clickupUserId]||[]).filter(t=>t.due_date&&fd(new Date(Number(t.due_date)))===fd(day));return s+dt.reduce((x,t)=>x+mh(t.time_estimate),0);},0);
                  return(
                    <div key={i} style={{textAlign:"center",padding:"4px 0"}}>
                      <div style={{fontSize:13,fontFamily:"'Poppins',sans-serif",fontWeight:800,...(tot>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:B.tm})}}>{tot}h</div>
                      {bk>0&&<div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif"}}>{bk}h booked</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab==="unassigned"&&(
          <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
            <div style={{display:"flex",gap:7,marginBottom:11,flexWrap:"wrap",alignItems:"center"}}>
              <input type="text" placeholder="Search tasks…" value={srch} onChange={e=>setSrch(e.target.value)} style={{background:"#0d0d0d",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"6px 10px",fontSize:11,fontFamily:"'Poppins',sans-serif",width:190}}/>
              <select value={fCl} onChange={e=>setFCl(e.target.value)} style={selSx}><option value="all">All clients</option>{allCl.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <select value={fSt} onChange={e=>setFSt(e.target.value)} style={selSx}><option value="all">All statuses</option>{allSt.map(s=><option key={s} value={s}>{s}</option>)}</select>
              <span style={{marginLeft:"auto",fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{filt.length} tasks · {ph.toFixed(1)}h</span>
            </div>
            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
              {Object.entries(filt.flatMap(t=>t.services||[]).reduce((a,s)=>({...a,[s]:(a[s]||0)+1}),{})).sort((a,b)=>b[1]-a[1]).map(([svc,cnt])=>(
                <span key={svc} style={{fontSize:9,color:B.tm,background:"rgba(255,255,255,0.04)",border:`1px solid ${B.border}`,padding:"3px 9px",borderRadius:20,fontFamily:"'Poppins',sans-serif"}}>{svc} {cnt}</span>
              ))}
            </div>
            {filt.length===0?<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:34,marginBottom:8}}>🎉</div>{gt("All tasks assigned!",15,800)}</div>:(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:8}}>
                {filt.map(t=><TCard key={t.id} task={t} designers={designers} onAssign={doAssign} isAssigning={aId===t.id}/>)}
              </div>
            )}
          </div>
        )}

        {/* SIDEBAR */}
        <div style={{width:186,borderLeft:`1px solid ${B.border}`,padding:"14px 13px",overflowY:"auto",flexShrink:0,background:"#141414"}}>
          <div style={{height:2,background:G,borderRadius:1,marginBottom:12}}/>
          <div style={{fontSize:8,color:"#888",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Week Overview</div>
          {designers.map(d=>{
            const dCp=cap.filter(c=>c.clickupUserId===d.clickupUserId);
            const totH=dCp.reduce((s,c)=>s+(c.availableHours||0),0);
            const bkH=(asgn[d.clickupUserId]||[]).reduce((s,t)=>s+mh(t.time_estimate),0);
            const pct=totH>0?Math.min((bkH/totH)*100,100):0;
            return(
              <div key={d.clickupUserId} style={{marginBottom:11,paddingBottom:11,borderBottom:`1px solid #2a2a2a`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <Av name={d.designer} role={d.role} size={20}/>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:10,color:"#e8e2dc",fontFamily:"'Poppins',sans-serif",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.designer.split(" ")[0]}</div>
                    <div style={{fontSize:7,color:"#777",fontFamily:"'Poppins',sans-serif",fontWeight:500}}>{d.role}</div>
                  </div>
                  <div style={{fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:800,flexShrink:0,...(totH>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#444"})}}>{totH}h</div>
                </div>
                <div style={{height:3,background:"#2a2a2a",borderRadius:2,overflow:"hidden",marginBottom:bkH>0?3:0}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>80?B.tangerine:G,borderRadius:2,transition:"width 0.4s"}}/>
                </div>
                {bkH>0&&<div style={{fontSize:8,color:"#888",fontFamily:"'Poppins',sans-serif",fontWeight:500}}>{bkH}h booked</div>}
              </div>
            );
          })}
          <div style={{marginTop:5,paddingTop:10,borderTop:`1px solid #2a2a2a`}}>
            <div style={{fontSize:8,color:"#888",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>Unassigned</div>
            <div style={{fontSize:28,fontFamily:"'Poppins',sans-serif",fontWeight:900,lineHeight:1,...(filt.length>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#444"})}}>{filt.length}</div>
            <div style={{fontSize:9,color:"#888",fontFamily:"'Poppins',sans-serif",marginTop:2}}>{ph.toFixed(1)}h pending</div>
          </div>
          <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid #2a2a2a`}}>
            <div style={{fontSize:8,color:"#888",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>Priority</div>
            {["urgent","high","normal"].map(p=>{
              const cnt=filt.filter(t=>t.priority?.priority===p).length;
              if(!cnt)return null;
              return(
                <div key={p} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:PC[p]}}/><span style={{fontSize:9,color:"#999",fontFamily:"'Poppins',sans-serif",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{p}</span></div>
                  <span style={{fontSize:12,color:PC[p],fontFamily:"'Poppins',sans-serif",fontWeight:800}}>{cnt}</span>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid #2a2a2a`}}>
            <button onClick={()=>setOps(true)} style={{width:"100%",padding:"7px 0",background:"rgba(237,34,144,0.08)",border:`1px solid ${B.magenta}44`,borderRadius:6,cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:9,fontWeight:700,color:B.magenta,letterSpacing:"0.06em",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(237,34,144,0.2)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(237,34,144,0.08)";}}>📋 OPS GUIDE</button>
          </div>
        </div>
      </div>

      <Drawer open={drawer.open} designer={drawer.designer} day={drawer.day} cap={dCap} tasks={dTasks} designers={designers} onClose={()=>setDrawer({open:false,designer:null,day:null})} onReassign={doReassign} onUnassign={doUnassign}/>
      {ops&&<OpsGuide onClose={()=>setOps(false)}/>}
    </div>
  );
}
