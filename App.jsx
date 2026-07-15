import { useState, useEffect, useCallback } from "react";
import {
  fetchClickUpTasks,
  fetchNotionCapacity,
  fetchNotionSkills,
  assignTaskInClickUp,
  unassignTaskInClickUp,
  saveTaskDetails,
  API_READY,
} from "./api.js";

const B={
  magenta:"#ed2290",tangerine:"#faa41a",royalBlue:"#2e4ea2",black:"#0d0d0d",
  G:"linear-gradient(90deg,#ed2290 0%,#f4622a 50%,#faa41a 100%)",
  // LIGHT THEME — clean white with warm neutral surfaces
  s1:"#ffffff",   // page background — white
  s2:"#faf9f7",   // card/panel background — warm off-white
  s3:"#f2f0ec",   // elevated surface
  // Borders — soft warm greys
  border:"#eae7e1",
  b2:"#d9d4cc",
  // Text — dark on light
  tp:"#1a1817",   // primary text — near black
  ts:"#5c564f",   // secondary text — warm dark grey
  tm:"#948d84",   // muted text — warm mid grey
  green:"#16a34a",red:"#dc2626"
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
  {icon:"🗓",title:"Multi-day bookings",color:"#2e4ea2",items:[
    {l:"What they are",n:"Production projects (e.g. 42h) can be split into bookings — X hours on date 1, X hours on date 2 — across one or more designers. Each booking blocks that designer's capacity on that day."},
    {l:"How to create",n:"Open any task (Task Details from a day cell, or 'Plan Multi-Day Bookings' on an unassigned card) and add booking rows: designer + date + hours. The bar shows booked vs total (Project Est) hours."},
    {l:"What saves to ClickUp",n:"Studio Bookings (board-owned JSON — don't hand-edit), Booking Summary (readable plan; Automation logs it as a comment), and the Designer field set to the first booking's designer (lead)."},
    {l:"Due date is YOURS",n:"The board never auto-moves the due date from bookings. Check the designer is OK to go each day, then set assignee + due date in Task Details to release the work."},
    {l:"Adjusting the plan",n:"Reopen Task Details anytime to move hours between days or designers — capacity is checked live per row. No need to go to ClickUp."},
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
function mon(date){
  // Always work from local noon to avoid DST/timezone boundary issues
  const d=new Date(date);
  d.setHours(12,0,0,0);
  const dw=d.getDay(); // 0=Sun,1=Mon...6=Sat
  const diff=dw===0?-6:1-dw; // shift to Monday
  d.setDate(d.getDate()+diff);
  d.setHours(12,0,0,0);
  return d;
}
function wdays(monday){return Array.from({length:5},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);d.setHours(12,0,0,0);return d;});}
function fs(d){return new Date(d).toLocaleDateString("en-AU",{day:"numeric",month:"short"});}
function ff(d){if(!d)return"—";return new Date(d instanceof Date?d:Number(d)).toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"});}
// Round ms to hours — avoid floating point by rounding to 1 decimal
function mh(ms){if(!ms)return 0;return Math.round(ms/360000)/10;}
function hl(h){if(!h)return"—";return`${Number.isInteger(h)?h:h.toFixed(1)}h`;}
function ini(n){return n.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();}

// ─── BOOKINGS ─────────────────────────────────────────────────
// A task's schedule = its Studio Bookings entries (multi-day / multi-designer
// production work). Tasks without bookings fall back to the classic model:
// one implicit booking on the due date for the Designer, using the estimate.
function bookingsFor(t){
  if(Array.isArray(t.bookings)&&t.bookings.length>0)
    return t.bookings.map(b=>({designerId:String(b.designerId),date:String(b.date).substring(0,10),hours:Number(b.hours)||0}));
  if(t.due_date&&t.assignedTo)
    return[{designerId:String(t.assignedTo),date:fd(new Date(Number(t.due_date))),hours:mh(t.time_estimate),implicit:true}];
  return[];
}
function bookedTotal(t){return Math.round(bookingsFor(t).reduce((s,b)=>s+b.hours,0)*10)/10;}
// Human-readable Booking Summary written back to ClickUp
function summaryText(bookings,designers){
  const nm=id=>designers.find(d=>d.clickupUserId===String(id))?.designer||`User ${id}`;
  const lines=bookings.map(b=>`${nm(b.designerId)} — ${ff(ld(b.date))} — ${hl(b.hours)}`);
  const tot=Math.round(bookings.reduce((s,b)=>s+b.hours,0)*10)/10;
  return lines.length?`${lines.join("\n")}\nTotal booked: ${hl(tot)}`:"";
}

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
      <text x="148" y="43" fontFamily="'Poppins',sans-serif" fontWeight="900" fontSize="50" fill="#0d0d0d">DESIGN</text>
    </svg>
  );
}

function Av({name,role,size=32}){
  const rc=RC[role]||B.magenta;
  return(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"#f4f1ec",border:`1.5px solid ${rc}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {gt(ini(name),size*0.3,800)}
    </div>
  );
}

function SPill({status}){
  const m={"brief required":{bg:"rgba(124,58,237,0.09)",c:"#7c3aed"},"prod action rq":{bg:"rgba(250,164,26,0.14)",c:"#c77c00"},"prod in progress":{bg:"rgba(237,34,144,0.1)",c:B.magenta},"internal review":{bg:"rgba(22,163,74,0.1)",c:B.green},"external review":{bg:"rgba(22,163,74,0.1)",c:"#15803d"},"approved - studio finalise":{bg:"rgba(0,0,0,0.05)",c:"#948d84"},"blocked":{bg:"rgba(220,38,38,0.09)",c:B.red}};
  const s=m[status]||{bg:"rgba(0,0,0,0.04)",c:"#948d84"};
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
          color:over?B.red:warn?B.tangerine:"#16a34a"}}>  {/* brighter green */}
          {over?`+${(committed-available).toFixed(1)}h over`:`${hl(freeH)} free`}
        </span>
        <span style={{fontSize:9,fontFamily:"'Poppins',sans-serif",color:"#948d84",fontWeight:500}}>
          {committed>0?`${committed}/${available}h`:`${available}h`}
        </span>
      </div>
      <div style={{height:4,background:"#e8e5df",borderRadius:2,overflow:"hidden"}}>
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

  // Clear visual hierarchy: available = white, unavailable = grey/muted, today = tinted
  let bg="#f4f2ee"; // default unavailable — soft grey
  if(isPH) bg="#fdf6e3";                          // warm light amber tint
  else if(unavail) bg="#f0eeea";                  // greyed out — clearly off
  else if(isToday) bg="#fdf0f7";                  // magenta-tinted for today
  else if(partAvail) bg="#fdfaf2";                // slight warm tint for partial
  else bg="#ffffff";                              // available — clean white

  const bdr=hov&&!unavail
    ? B.magenta
    : isToday ? `${B.magenta}66`
    : over ? `${B.red}66`
    : !unavail&&!isPH ? "#ddd8d0"                 // available cells get a visible border
    : "#eceae5";                                  // unavailable cells recede

  // Day number colour — available = dark, unavailable = clearly dimmed
  const dayNumColor=unavail&&!isPH?"#c9c4bc":isToday?B.tp:!unavail?"#2a2624":"#b3ada4";
  const dayLabelColor=unavail&&!isPH?"#d4cfc7":isToday?B.magenta:!unavail?"#948d84":"#c9c4bc";

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
        <div style={{fontSize:11,color:"#b3ada4",fontFamily:"'Poppins',sans-serif",marginTop:6,textAlign:"center"}}>—</div>
      )}
    </div>
  );
}

function DTask({task,allD,curId,onR,onU,onOpen,idx}){
  const[exp,setExp]=useState(false),[nd,setNd]=useState(""),[ndate,setNdate]=useState("");
  const cc=CC[task.client]||B.magenta,sdl=task.stage_deadline?new Date(Number(task.stage_deadline)):null;
  const hasBookings=Array.isArray(task.bookings)&&task.bookings.length>0;
  const dayH=task._bh!==undefined?task._bh:mh(task.time_estimate);
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
            <span style={{fontSize:10,color:B.ts,fontFamily:"'Poppins',sans-serif"}}>{hl(dayH)}{hasBookings?" this day":""}</span>
            {hasBookings&&<><span style={{color:B.tm}}>·</span><span style={{fontSize:9,color:B.royalBlue,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>📅 {hl(bookedTotal(task))} total</span></>}
            {sdl&&<><span style={{color:B.tm}}>·</span><span style={{fontSize:9,color:B.tangerine,fontFamily:"'Poppins',sans-serif",fontWeight:600}}>DL {fs(sdl)}</span></>}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}><SPill status={task.status}/>{hasBookings&&<span style={{fontSize:8,color:B.royalBlue,background:"rgba(46,78,162,0.08)",border:`1px solid ${B.royalBlue}33`,padding:"2px 6px",borderRadius:10,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>MULTI-DAY</span>}{task.services?.map(s=><span key={s} style={{fontSize:8,color:B.tm,background:"rgba(0,0,0,0.04)",padding:"2px 5px",borderRadius:4,fontFamily:"'Poppins',sans-serif"}}>{s}</span>)}</div>
        </div>
        {exp&&(
          <div style={{padding:"10px 12px",borderTop:`1px solid ${B.border}`}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>onOpen(task)} style={{width:"100%",marginBottom:8,padding:"7px 0",background:"rgba(46,78,162,0.06)",color:B.royalBlue,border:`1px solid ${B.royalBlue}44`,borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:700,cursor:"pointer"}}>🔍 TASK DETAILS &amp; BOOKINGS</button>
            {hasBookings?(
              <p style={{fontSize:9,color:B.tm,margin:0,fontFamily:"'Poppins',sans-serif",textAlign:"center"}}>Multi-day production task — manage its bookings in Task Details above</p>
            ):(
              <>
                <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Reassign Task</div>
                <div style={{display:"flex",gap:5,marginBottom:5}}>
                  <select value={nd} onChange={e=>setNd(e.target.value)} style={{flex:1,background:"#fff",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"5px 7px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}>
                    <option value="">Move to…</option>
                    {allD.filter(d=>d.clickupUserId!==curId).map(d=><option key={d.clickupUserId} value={d.clickupUserId}>{d.designer}</option>)}
                  </select>
                  <input type="date" value={ndate} onChange={e=>setNdate(e.target.value)} style={{flex:1,background:"#fff",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"5px 7px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}/>
                </div>
                <div style={{display:"flex",gap:5}}>
                  <button onClick={()=>{if(nd&&ndate)onR(task,curId,nd,ndate);}} disabled={!nd||!ndate} style={{flex:1,padding:"6px 0",background:nd&&ndate?G:"#e8e5df",color:nd&&ndate?"#000":B.tm,border:"none",borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:700,cursor:nd&&ndate?"pointer":"not-allowed"}}>REASSIGN →</button>
                  <button onClick={()=>onU(task,curId)} style={{padding:"6px 10px",background:"rgba(239,68,68,0.1)",color:B.red,border:`1px solid ${B.red}44`,borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:600,cursor:"pointer"}}>REMOVE</button>
                </div>
                <p style={{fontSize:9,color:B.tm,margin:"4px 0 0",fontFamily:"'Poppins',sans-serif",textAlign:"center"}}>Formal reassignment still needed in ClickUp</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Drawer({open,designer,day,cap,tasks,designers,onClose,onReassign,onUnassign,onOpen}){
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};if(open)document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[open,onClose]);
  if(!open||!designer||!day)return null;
  const avail=cap?.availableHours||0,committed=Math.round(tasks.reduce((s,t)=>s+(t._bh!==undefined?t._bh:mh(t.time_estimate)),0)*10)/10;
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(30,25,20,0.35)",zIndex:200,backdropFilter:"blur(4px)"}}/>
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
              {tasks.map((task,idx)=><DTask key={task.id} task={task} allD={designers} curId={designer.clickupUserId} onR={onReassign} onU={onUnassign} onOpen={onOpen} idx={idx}/>)}
            </>
          )}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${B.border}`,background:B.s2}}>
          <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Skills</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{designer.skills?.map(s=><span key={s} style={{fontSize:9,background:"rgba(46,78,162,0.08)",color:"#2e4ea2",border:`1px solid ${B.royalBlue}44`,padding:"2px 7px",borderRadius:20,fontFamily:"'Poppins',sans-serif"}}>{s}</span>)}</div>
          {designer.notSuitedFor&&<div style={{marginTop:6,fontSize:9,color:B.red,fontFamily:"'Poppins',sans-serif"}}>⚠ Not suited for: {designer.notSuitedFor}</div>}
        </div>
      </div>
    </>
  );
}

function TCard({task,designers,onAssign,isAssigning,onOpen}){
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
          {isBriefReq&&<span style={{fontSize:8,color:"#7c3aed",background:"rgba(139,92,246,0.1)",padding:"2px 7px",borderRadius:10,fontFamily:"'Poppins',sans-serif",fontWeight:600}}>Forecast only</span>}
          {task.services?.map(s=><span key={s} style={{fontSize:8,color:B.tm,background:"rgba(0,0,0,0.04)",padding:"2px 6px",borderRadius:4,fontFamily:"'Poppins',sans-serif"}}>{s}</span>)}
        </div>
      </div>
      {exp&&(
        <div style={{padding:"13px",borderTop:`1px solid ${B.border}`}} onClick={e=>e.stopPropagation()}>
          {isBriefReq&&<div style={{padding:"8px 10px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.25)",borderRadius:6,marginBottom:10,fontSize:10,color:"#7c3aed",fontFamily:"'Poppins',sans-serif",lineHeight:1.5}}>📝 Brief not yet finalised — you can assign a designer for forecasting. Don't formally assign in ClickUp until the brief is ready.</div>}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Skill Match</div>
            {designers.map(d=>{const match=sm(d),badge=MB[match],rc=RC[d.role]||B.magenta;return(
              <div key={d.clickupUserId} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${B.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#f4f1ec",border:`1px solid ${rc}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>{gt(ini(d.designer),7,800)}</div>
                  <span style={{fontSize:11,color:B.ts,fontFamily:"'Poppins',sans-serif"}}>{d.designer}</span>
                </div>
                <span style={{fontSize:9,color:badge.c,background:badge.bg,padding:"2px 7px",borderRadius:20,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>{badge.l}</span>
              </div>
            );})}
          </div>
          <div style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Assign Task</div>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <select value={sd} onChange={e=>setSd(e.target.value)} style={{flex:1,background:"#fff",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"6px 8px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}>
              <option value="">Select designer…</option>
              {designers.map(d=><option key={d.clickupUserId} value={d.clickupUserId}>{d.designer}</option>)}
            </select>
            <div style={{flex:1}}>
              <input type="date" value={sdate} onChange={e=>setSdate(e.target.value)} style={{width:"100%",background:"#fff",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"6px 8px",fontSize:11,fontFamily:"'Poppins',sans-serif",cursor:"pointer"}}/>
              <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",marginTop:2}}>Sets ClickUp due date</div>
            </div>
          </div>
          <button onClick={()=>{if(sd&&sdate){const d=designers.find(x=>x.clickupUserId===sd);onAssign(task.id,sd,sdate,d?.designer);}}} disabled={!sd||!sdate||isAssigning}
            style={{width:"100%",padding:"9px 0",background:sd&&sdate?G:"#e8e5df",color:sd&&sdate?"#000":B.tm,border:"none",borderRadius:6,fontSize:11,fontFamily:"'Poppins',sans-serif",fontWeight:800,cursor:sd&&sdate?"pointer":"not-allowed"}}>
            {isAssigning?"ASSIGNING…":"ASSIGN IN CLICKUP →"}
          </button>
          <p style={{fontSize:9,color:B.tm,margin:"4px 0 0",fontFamily:"'Poppins',sans-serif",textAlign:"center"}}>Sets Designer field + due date · Formal assignment still needed in ClickUp</p>
          <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0 8px"}}>
            <div style={{flex:1,height:1,background:B.border}}/>
            <span style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em"}}>OR</span>
            <div style={{flex:1,height:1,background:B.border}}/>
          </div>
          <button onClick={()=>onOpen(task)} style={{width:"100%",padding:"8px 0",background:"rgba(46,78,162,0.06)",color:B.royalBlue,border:`1px solid ${B.royalBlue}44`,borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:700,cursor:"pointer"}}>📅 PLAN MULTI-DAY BOOKINGS</button>
          <p style={{fontSize:9,color:B.tm,margin:"4px 0 0",fontFamily:"'Poppins',sans-serif",textAlign:"center"}}>Split hours across dates &amp; designers for production projects</p>
        </div>
      )}
    </div>
  );
}

// ─── TASK DETAIL MODAL ────────────────────────────────────────
// Full task view: status, ZOO WIP Update, description preview, editable
// assignee + due date, editable multi-day bookings with live capacity
// check, time tracked (read-only), and a direct ClickUp link.
function TaskModal({task,designers,cap,flatTasks,onClose,onSave,saving}){
  const cc=CC[task.client]||B.magenta;
  const sdl=task.stage_deadline?new Date(Number(task.stage_deadline)):null;
  const nm=id=>designers.find(d=>d.clickupUserId===String(id))?.designer||`User ${id}`;

  // Editable state
  const initRows=bookingsFor(task).map(b=>({designerId:b.designerId,date:b.date,hours:b.hours}));
  const[rows,setRows]=useState(initRows);
  const[due,setDue]=useState(task.due_date?fd(new Date(Number(task.due_date))):"");
  const curAssignee=task.assignees?.[0]?.id||"";
  const[assignee,setAssignee]=useState(curAssignee);
  const[descExp,setDescExp]=useState(false);

  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[onClose]);

  const totalTarget=task.projectEstHours||mh(task.time_estimate)||0;
  const bookedH=Math.round(rows.reduce((s,r)=>s+(Number(r.hours)||0),0)*10)/10;
  const tracked=mh(task.time_spent);

  // Capacity check for a row: available hours minus everything else booked
  // for that designer on that date (other tasks + other rows in this editor).
  const rowCheck=(row,idx)=>{
    if(!row.designerId||!row.date||!(Number(row.hours)>0))return null;
    const capEntry=cap.find(c=>c.clickupUserId===String(row.designerId)&&c.date===row.date);
    if(!capEntry)return{type:"unknown",msg:"No capacity data for this date (outside loaded week)"};
    const others=flatTasks.filter(t=>t.id!==task.id).reduce((s,t)=>s+bookingsFor(t).filter(b=>b.designerId===String(row.designerId)&&b.date===row.date).reduce((x,b)=>x+b.hours,0),0);
    const siblings=rows.reduce((s,r,i)=>i!==idx&&r.designerId===row.designerId&&r.date===row.date?s+(Number(r.hours)||0):s,0);
    const free=Math.round((capEntry.availableHours-others-siblings)*10)/10;
    if(capEntry.availableHours===0)return{type:"over",msg:`${nm(row.designerId)} is unavailable on this date`};
    if(Number(row.hours)>free)return{type:"over",msg:`Over capacity — only ${hl(Math.max(free,0))} free (${capEntry.availableHours}h avail)`};
    return{type:"ok",msg:`${hl(free-Number(row.hours))} still free after this booking`};
  };

  const setRow=(idx,patch)=>setRows(p=>p.map((r,i)=>i===idx?{...r,...patch}:r));
  const validRows=rows.filter(r=>r.designerId&&r.date&&Number(r.hours)>0);
  const rowsValid=rows.length===validRows.length;
  const firstDate=validRows.length?[...validRows].sort((a,b)=>a.date.localeCompare(b.date))[0].date:null;
  const dueMismatch=due&&firstDate&&due!==firstDate;

  const doSave=()=>{
    if(!rowsValid)return;
    const sorted=[...validRows].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({designerId:String(r.designerId),date:r.date,hours:Math.round(Number(r.hours)*10)/10}));
    const newLead=sorted[0]?.designerId||null;
    const payload={
      taskId:task.id,
      bookings:sorted,
      summary:summaryText(sorted,designers),
    };
    if(newLead&&newLead!==String(task.assignedTo||"")){
      payload.leadAdd=newLead;
      if(task.assignedTo)payload.leadRem=String(task.assignedTo);
    }
    const origDue=task.due_date?fd(new Date(Number(task.due_date))):"";
    if(due&&due!==origDue)payload.dueDateMs=lms(due);
    if(assignee!==curAssignee){
      if(assignee)payload.assigneeAdd=assignee;
      const rem=(task.assignees||[]).map(a=>a.id).filter(id=>id!==assignee);
      if(rem.length)payload.assigneeRem=rem;
    }
    onSave(payload);
  };

  const lbl={fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6};
  const inpSx={background:"#fff",border:`1px solid ${B.b2}`,color:B.tp,borderRadius:6,padding:"6px 8px",fontSize:11,fontFamily:"'Poppins',sans-serif"};

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(30,25,20,0.4)",zIndex:400,backdropFilter:"blur(6px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:640,maxHeight:"88vh",background:B.s1,borderRadius:12,border:`1px solid ${B.b2}`,zIndex:401,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.18)"}}>
        <div style={{height:3,background:G,flexShrink:0}}/>

        {/* HEADER */}
        <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${B.border}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <SPill status={task.status}/>
                <span style={{fontSize:10,color:cc,fontFamily:"'Poppins',sans-serif",fontWeight:700}}>{task.client}</span>
                {task.services?.map(s=><span key={s} style={{fontSize:8,color:B.tm,background:"rgba(0,0,0,0.04)",padding:"2px 6px",borderRadius:4,fontFamily:"'Poppins',sans-serif"}}>{s}</span>)}
              </div>
              <div style={{fontSize:15,color:B.tp,fontFamily:"'Poppins',sans-serif",fontWeight:700,lineHeight:1.35}}>{task.name}</div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <a href={task.url||`https://app.clickup.com/t/${task.id}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:4,padding:"6px 11px",background:"rgba(46,78,162,0.06)",border:`1px solid ${B.royalBlue}44`,borderRadius:6,fontSize:10,color:B.royalBlue,fontFamily:"'Poppins',sans-serif",fontWeight:700,textDecoration:"none"}}>Open in ClickUp ↗</a>
              <button onClick={onClose} style={{background:"none",border:`1px solid ${B.b2}`,color:B.tm,cursor:"pointer",width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✕</button>
            </div>
          </div>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"14px 20px"}}>
          {/* KEY FACTS */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
            {[
              {l:"Time Estimate",v:hl(mh(task.time_estimate))},
              {l:"Project Est (Total)",v:task.projectEstHours?hl(task.projectEstHours):"—"},
              {l:"Time Tracked",v:tracked?hl(tracked):"—",note:"from ClickUp"},
              {l:"Stage Deadline",v:sdl?fs(sdl):"—",warn:sdl&&(sdl-Date.now())<3*24*3600*1000},
            ].map(f=>(
              <div key={f.l} style={{background:B.s2,border:`1px solid ${B.border}`,borderRadius:8,padding:"8px 10px"}}>
                <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase"}}>{f.l}</div>
                <div style={{fontSize:13,color:f.warn?B.red:B.tp,fontFamily:"'Poppins',sans-serif",fontWeight:800,marginTop:2}}>{f.v}</div>
                {f.note&&<div style={{fontSize:7,color:B.tm,fontFamily:"'Poppins',sans-serif"}}>{f.note}</div>}
              </div>
            ))}
          </div>

          {/* ZOO WIP UPDATE */}
          <div style={{marginBottom:14}}>
            <div style={lbl}>ZOO WIP Update</div>
            <div style={{background:"rgba(250,164,26,0.07)",border:`1px solid ${B.tangerine}44`,borderRadius:8,padding:"9px 12px",fontSize:11,color:task.zooWip?B.ts:B.tm,fontFamily:"'Poppins',sans-serif",lineHeight:1.5,whiteSpace:"pre-wrap",fontStyle:task.zooWip?"normal":"italic"}}>
              {task.zooWip||"No WIP update recorded"}
            </div>
          </div>

          {/* DESCRIPTION PREVIEW */}
          {task.description?(
            <div style={{marginBottom:14}}>
              <div style={lbl}>Description</div>
              <div onClick={()=>setDescExp(!descExp)} style={{background:B.s2,border:`1px solid ${B.border}`,borderRadius:8,padding:"9px 12px",fontSize:11,color:B.ts,fontFamily:"'Poppins',sans-serif",lineHeight:1.55,whiteSpace:"pre-wrap",cursor:"pointer",maxHeight:descExp?"none":54,overflow:"hidden",position:"relative"}}>
                {task.description}
                {!descExp&&task.description.length>160&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:22,background:`linear-gradient(transparent,${B.s2})`}}/>}
              </div>
              {task.description.length>160&&<button onClick={()=>setDescExp(!descExp)} style={{background:"none",border:"none",color:B.royalBlue,fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:700,cursor:"pointer",padding:"3px 0"}}>{descExp?"▲ Show less":"▼ Show more"}</button>}
            </div>
          ):null}

          {/* ASSIGNMENT — assignee + due date (studio manager controlled) */}
          <div style={{background:B.s2,border:`1px solid ${B.border}`,borderRadius:8,padding:"12px 14px",marginBottom:14}}>
            <div style={lbl}>ClickUp Assignment — controls what the designer sees</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:600,marginBottom:3}}>Assignee (formal ClickUp assignment)</div>
                <select value={assignee} onChange={e=>setAssignee(e.target.value)} style={{...inpSx,width:"100%",cursor:"pointer"}}>
                  <option value="">— Not assigned —</option>
                  {designers.map(d=><option key={d.clickupUserId} value={d.clickupUserId}>{d.designer}</option>)}
                  {task.assignees?.filter(a=>!designers.some(d=>d.clickupUserId===a.id)).map(a=><option key={a.id} value={a.id}>{a.username}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:600,marginBottom:3}}>Due Date (when it appears for the designer)</div>
                <input type="date" value={due} onChange={e=>setDue(e.target.value)} style={{...inpSx,width:"100%",cursor:"pointer"}}/>
              </div>
            </div>
            {dueMismatch&&<div style={{marginTop:8,fontSize:9,color:"#c77c00",fontFamily:"'Poppins',sans-serif",background:"rgba(250,164,26,0.1)",border:`1px solid ${B.tangerine}44`,borderRadius:6,padding:"5px 9px"}}>💡 Due date ({fs(ld(due))}) differs from first booking ({fs(ld(firstDate))}). The board never auto-syncs these — align them when you're ready to release the work.</div>}
            {!dueMismatch&&<div style={{marginTop:8,fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif"}}>Assignee + due date make the task live for the designer in ClickUp. Bookings below are the studio plan — check each day is OK to go before releasing.</div>}
          </div>

          {/* BOOKINGS EDITOR */}
          <div style={{background:B.s2,border:`1px solid ${B.border}`,borderRadius:8,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{...lbl,marginBottom:0}}>Production Bookings</div>
              <div style={{fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:800,color:totalTarget&&bookedH<totalTarget?"#c77c00":totalTarget&&bookedH>totalTarget?B.red:B.green}}>
                {hl(bookedH)}{totalTarget?` / ${hl(totalTarget)} booked`:" booked"}
              </div>
            </div>
            {totalTarget>0&&(
              <div style={{height:4,background:"#e8e5df",borderRadius:2,overflow:"hidden",marginBottom:10}}>
                <div style={{height:"100%",width:`${Math.min((bookedH/totalTarget)*100,100)}%`,background:bookedH>totalTarget?B.red:G,borderRadius:2,transition:"width 0.3s"}}/>
              </div>
            )}
            {rows.length===0&&<div style={{fontSize:10,color:B.tm,fontFamily:"'Poppins',sans-serif",fontStyle:"italic",marginBottom:8}}>No bookings yet — add days below to build the production schedule.</div>}
            {rows.map((r,idx)=>{
              const chk=rowCheck(r,idx);
              return(
                <div key={idx} style={{marginBottom:8}}>
                  <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr 64px 26px",gap:6,alignItems:"center"}}>
                    <select value={r.designerId} onChange={e=>setRow(idx,{designerId:e.target.value})} style={{...inpSx,cursor:"pointer"}}>
                      <option value="">Designer…</option>
                      {designers.map(d=><option key={d.clickupUserId} value={d.clickupUserId}>{d.designer}</option>)}
                    </select>
                    <input type="date" value={r.date} onChange={e=>setRow(idx,{date:e.target.value})} style={{...inpSx,cursor:"pointer"}}/>
                    <input type="number" min="0.5" step="0.5" value={r.hours} onChange={e=>setRow(idx,{hours:e.target.value})} placeholder="hrs" style={{...inpSx,textAlign:"center"}}/>
                    <button onClick={()=>setRows(p=>p.filter((_,i)=>i!==idx))} title="Remove booking" style={{width:26,height:26,background:"rgba(220,38,38,0.07)",color:B.red,border:`1px solid ${B.red}33`,borderRadius:6,fontSize:11,cursor:"pointer"}}>✕</button>
                  </div>
                  {chk&&<div style={{fontSize:8,fontFamily:"'Poppins',sans-serif",fontWeight:600,marginTop:2,color:chk.type==="over"?B.red:chk.type==="unknown"?B.tm:B.green}}>{chk.type==="over"?"⚠ ":""}{chk.msg}</div>}
                </div>
              );
            })}
            <button onClick={()=>setRows(p=>[...p,{designerId:"",date:"",hours:""}])} style={{width:"100%",padding:"7px 0",background:"none",border:`1px dashed ${B.b2}`,borderRadius:6,fontSize:10,color:B.ts,fontFamily:"'Poppins',sans-serif",fontWeight:700,cursor:"pointer"}}>+ ADD BOOKING</button>
            <div style={{marginTop:8,fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",lineHeight:1.5}}>Saving writes Studio Bookings + Booking Summary to ClickUp and sets the Designer field to the first booking's designer (lead). Your ClickUp Automation logs the summary as a comment.</div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{padding:"12px 20px",borderTop:`1px solid ${B.border}`,background:B.s2,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif"}}>{rowsValid?"":"Complete or remove incomplete booking rows to save"}</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"8px 16px",background:"none",border:`1px solid ${B.b2}`,borderRadius:6,fontSize:10,color:B.ts,fontFamily:"'Poppins',sans-serif",fontWeight:700,cursor:"pointer"}}>CANCEL</button>
            <button onClick={doSave} disabled={!rowsValid||saving} style={{padding:"8px 20px",background:rowsValid&&!saving?G:"#e8e5df",color:rowsValid&&!saving?"#000":B.tm,border:"none",borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:800,cursor:rowsValid&&!saving?"pointer":"not-allowed"}}>{saving?"SAVING…":"SAVE TO CLICKUP →"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

function OpsGuide({onClose}){
  const[sec,setSec]=useState(0);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[onClose]);
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(30,25,20,0.4)",zIndex:300,backdropFilter:"blur(6px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:700,maxHeight:"80vh",background:B.s1,borderRadius:12,border:`1px solid ${B.b2}`,zIndex:301,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.15)"}}>
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

// ─── PASSWORD GATE ────────────────────────────────────────────
function PasswordGate({onUnlock}){
  const[pw,setPw]=useState("");
  const[err,setErr]=useState(false);
  const[shake,setShake]=useState(false);
  const expected=import.meta.env.VITE_BOARD_PASSWORD;

  const submit=(e)=>{
    e.preventDefault();
    if(pw===expected&&expected){
      try{localStorage.setItem("zd_board_auth","1");}catch{}
      onUnlock();
    }else{
      setErr(true);
      setShake(true);
      setTimeout(()=>setShake(false),400);
    }
  };

  return(
    <div style={{height:"100vh",width:"100vw",background:B.s1,color:B.tp,fontFamily:"'Poppins',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes gateShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        @keyframes gateFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{width:380,padding:"36px 34px",background:B.s2,border:`1px solid ${B.border}`,borderRadius:14,animation:shake?"gateShake 0.4s":"gateFade 0.4s ease-out",boxShadow:"0 20px 60px rgba(0,0,0,0.1)"}}>
        <div style={{height:3,background:G,borderRadius:2,marginBottom:22}}/>
        <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:4}}>
          <span style={{fontSize:22,fontFamily:"'Poppins',sans-serif",fontWeight:900,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",letterSpacing:"-0.02em"}}>ZOO</span>
          <span style={{fontSize:22,fontFamily:"'Poppins',sans-serif",fontWeight:900,color:B.tp,letterSpacing:"-0.02em"}}>DESIGN</span>
        </div>
        <div style={{fontSize:10,color:B.ts,fontFamily:"'Poppins',sans-serif",fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:26}}>Studio Board</div>
        <form onSubmit={submit}>
          <label style={{display:"block",fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:7}}>Access Password</label>
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={e=>{setPw(e.target.value);setErr(false);}}
            style={{width:"100%",background:"#fff",border:`1px solid ${err?B.red:B.b2}`,color:B.tp,borderRadius:8,padding:"11px 13px",fontSize:13,fontFamily:"'Poppins',sans-serif",fontWeight:500,letterSpacing:"0.05em",transition:"border 0.15s"}}
            onFocus={e=>{if(!err)e.currentTarget.style.borderColor=B.magenta+"88";}}
            onBlur={e=>{if(!err)e.currentTarget.style.borderColor=B.b2;}}
          />
          {err&&<div style={{fontSize:10,color:B.red,fontFamily:"'Poppins',sans-serif",fontWeight:600,marginTop:7}}>Incorrect password</div>}
          <button
            type="submit"
            style={{width:"100%",marginTop:18,padding:"11px 0",background:G,border:"none",color:"#000",borderRadius:8,fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",transition:"transform 0.1s"}}
            onMouseDown={e=>e.currentTarget.style.transform="scale(0.98)"}
            onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
          >Unlock Board</button>
        </form>
        <div style={{marginTop:22,paddingTop:16,borderTop:`1px solid ${B.border}`,fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",textAlign:"center",lineHeight:1.5}}>Internal tool · ZOODESIGN Studio</div>
      </div>
    </div>
  );
}

// ─── APP ROOT (auth wrapper) ──────────────────────────────────
export default function App(){
  const[authed,setAuthed]=useState(()=>{
    try{return localStorage.getItem("zd_board_auth")==="1";}catch{return false;}
  });
  if(!authed)return <PasswordGate onUnlock={()=>setAuthed(true)}/>;
  return <StudioBoard/>;
}

// ─── MAIN APP ─────────────────────────────────────────────────
function StudioBoard(){
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
  const[modalTask,setModalTask]=useState(null);   // task detail modal
  const[savingDetails,setSavingDetails]=useState(false);

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

  // ── SAVE TASK DETAILS (bookings / assignee / due date) ─────
  const doSaveDetails=async(payload)=>{
    if(!API_READY){
      showToast("Demo mode — changes not saved to ClickUp","warn");
      setModalTask(null);
      return;
    }
    setSavingDetails(true);
    try{
      await saveTaskDetails(payload);
      showToast("✓ Saved to ClickUp — bookings, summary & assignment updated.");
      setModalTask(null);
      await loadData();  // reload so board reflects the new bookings everywhere
    }catch(err){
      showToast(`Save failed: ${err.message}`,"error");
    }finally{
      setSavingDetails(false);
    }
  };

  // All assigned tasks as a flat list — a multi-day task appears on EVERY
  // booked designer's row, not just the lead's, so compute from bookings.
  const flatA=Object.values(asgn).flat();

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

  // Drawer tasks: any task with a booking for this designer on this day
  // (bookings-aware — includes multi-day tasks led by another designer).
  // _bh = hours booked for THIS day, shown instead of the full estimate.
  const dTasks=drawer.open&&drawer.designer&&drawer.day?flatA.flatMap(t=>{
    const h=bookingsFor(t).filter(b=>b.designerId===drawer.designer.clickupUserId&&b.date===fd(drawer.day)).reduce((s,b)=>s+b.hours,0);
    return h>0?[{...t,_bh:Math.round(h*10)/10}]:[];
  }):[];
  const dCap=drawer.open&&drawer.designer&&drawer.day?cap.find(c=>c.clickupUserId===drawer.designer?.clickupUserId&&c.date===fd(drawer.day)):null;

  const selSx={background:"#fff",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"5px 9px",fontSize:10,fontFamily:"'Poppins',sans-serif",cursor:"pointer"};
  const navBtn={background:"#f4f1ec",border:`1px solid ${B.b2}`,color:B.tm,width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s"};

  return(
    <div style={{height:"100vh",background:B.s1,color:B.tp,fontFamily:"'Poppins',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#e8e5df;border-radius:2px;}
        select,input,button{outline:none;}
        select option{background:#fff;color:#1a1817;}
        @keyframes sIR{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fU{from{transform:translateY(6px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes tIn{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes loadBar{0%{opacity:0.4;transform:scaleX(0.3);transform-origin:left}50%{opacity:1;transform:scaleX(1);transform-origin:left}100%{opacity:0.4;transform:scaleX(0.3);transform-origin:right}}
      `}</style>

      {toast&&(
        <div style={{position:"fixed",top:16,right:16,zIndex:500,
          background:toast.type==="warn"?"#fff8ea":toast.type==="error"?"#fdf1f0":"#effaf3",
          border:`1px solid ${toast.type==="warn"?B.tangerine+"55":toast.type==="error"?B.red+"55":B.green+"55"}`,
          color:toast.type==="warn"?B.tangerine:toast.type==="error"?B.red:B.green,
          padding:"11px 18px",borderRadius:8,fontSize:12,fontFamily:"'Poppins',sans-serif",
          fontWeight:500,maxWidth:420,boxShadow:"0 12px 40px rgba(0,0,0,0.12)",animation:"tIn 0.2s ease"}}>
          {toast.msg}
        </div>
      )}
      {/* Loading bar across top of page */}
      {loading&&<div style={{position:"fixed",top:0,left:0,right:0,height:2,zIndex:999,background:G,animation:"loadBar 1.5s ease-in-out infinite"}}/>}

      {/* HEADER */}
      <div style={{borderBottom:`1px solid ${B.border}`,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:B.s1,flexShrink:0,height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Logo/>
          <div style={{width:1,height:26,background:B.border}}/>
          <div>
            <div style={{fontSize:9,color:"#948d84",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>Studio Board</div>
            <div style={{fontSize:8,color:"#a39c93",fontFamily:"'Poppins',sans-serif"}}>{filt.length} unassigned · {ph.toFixed(1)}h pending</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            {["‹","›"].map((ch,i)=>(
              <button key={ch} onClick={()=>navW(i===0?-1:1)} style={navBtn}
                onMouseEnter={e=>{e.currentTarget.style.background=G;e.currentTarget.style.color="#000";e.currentTarget.style.borderColor="transparent";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#f4f1ec";e.currentTarget.style.color=B.tm;e.currentTarget.style.borderColor=B.b2;}}>{ch}</button>
            ))}
            <span style={{fontSize:11,color:B.ts,fontFamily:"'Poppins',sans-serif",fontWeight:600,minWidth:138,textAlign:"center"}}>{fs(wd[0])} — {fs(wd[4])} 2026</span>
          </div>
          <div style={{width:1,height:20,background:B.border}}/>
          <div style={{display:"flex",background:"#fff",borderRadius:8,padding:3,gap:2}}>
            {["board","unassigned"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?G:"none",border:"none",cursor:"pointer",padding:"5px 13px",borderRadius:6,fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:700,color:tab===t?"#000":B.tm,transition:"all 0.15s"}}>
                {t==="unassigned"?<>UNASSIGNED{filt.length>0&&<span style={{background:tab==="unassigned"?"rgba(0,0,0,0.2)":"rgba(237,34,144,0.2)",color:tab==="unassigned"?"#000":B.magenta,borderRadius:10,padding:"0 6px",marginLeft:4,fontSize:9,fontWeight:800}}>{filt.length}</span>}</>:"BOARD"}
              </button>
            ))}
          </div>
          <button onClick={()=>setOps(true)} style={{background:"#f4f1ec",border:`1px solid ${B.b2}`,color:B.tm,padding:"5px 11px",borderRadius:6,cursor:"pointer",fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:4,transition:"all 0.12s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=B.tangerine;e.currentTarget.style.color=B.tangerine;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=B.b2;e.currentTarget.style.color=B.tm;}}>📋 OPS GUIDE</button>
          <button style={{background:"#f4f1ec",border:`1px solid ${B.b2}`,color:loading?B.magenta:B.tm,padding:"5px 11px",borderRadius:6,cursor:loading?"not-allowed":"pointer",fontSize:9,fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.06em",transition:"all 0.12s",opacity:loading?0.7:1}} onClick={()=>{if(!loading)loadData();}} onMouseEnter={e=>{if(!loading){e.currentTarget.style.borderColor=B.magenta;e.currentTarget.style.color=B.magenta;}}} onMouseLeave={e=>{e.currentTarget.style.borderColor=B.b2;e.currentTarget.style.color=B.tm;}}>{loading?"⟳ LOADING…":"↻ REFRESH"}</button>
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
                  <div style={{fontSize:11,fontFamily:"'Poppins',sans-serif",fontWeight:800,...(fd(day)===fd(new Date())?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#b3ada4"})}}>{fs(day)}</div>
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
                      <div style={{fontSize:11,color:"#1a1817",fontFamily:"'Poppins',sans-serif",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{designer.designer}</div>
                      <div style={{fontSize:8,color:"#948d84",fontFamily:"'Poppins',sans-serif",fontWeight:500}}>{designer.role}</div>
                      <div style={{fontSize:8,fontFamily:"'Poppins',sans-serif",fontWeight:700,marginTop:1,...(wkT>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#b3ada4"})}}>{wkT}h this week</div>
                    </div>
                  </div>
                  {wd.map((day,i)=>{
                    const cp=dCp.find(c=>c.date===fd(day));
                    // Bookings-aware: sum hours booked for this designer/day across ALL tasks
                    const entries=flatA.map(t=>{
                      const h=bookingsFor(t).filter(b=>b.designerId===designer.clickupUserId&&b.date===fd(day)).reduce((s,b)=>s+b.hours,0);
                      return h>0?h:null;
                    }).filter(h=>h!==null);
                    const cm=Math.round(entries.reduce((s,h)=>s+h,0)*10)/10;
                    return <DayCell key={i} day={day} cap={cp} committed={cm} taskCount={entries.length} isToday={fd(day)===fd(new Date())} onClick={()=>setDrawer({open:true,designer,day})}/>;
                  })}
                </div>
              );
            })}
            <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${B.border}`}}>
              <div style={{display:"grid",gridTemplateColumns:"192px repeat(5,1fr)",gap:4}}>
                <div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,paddingTop:5,textAlign:"right",paddingRight:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Studio Total</div>
                {wd.map((day,i)=>{
                  const tot=designers.reduce((s,d)=>{const c=cap.find(x=>x.clickupUserId===d.clickupUserId&&x.date===fd(day));return s+(c?.availableHours||0);},0);
                  const bk=flatA.reduce((s,t)=>s+bookingsFor(t).filter(b=>b.date===fd(day)).reduce((x,b)=>x+b.hours,0),0);
                  return(
                    <div key={i} style={{textAlign:"center",padding:"4px 0"}}>
                      <div style={{fontSize:13,fontFamily:"'Poppins',sans-serif",fontWeight:800,...(tot>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:B.tm})}}>{tot}h</div>
                      {bk>0&&<div style={{fontSize:8,color:B.tm,fontFamily:"'Poppins',sans-serif"}}>{hl(Math.round(bk*10)/10)} booked</div>}
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
              <input type="text" placeholder="Search tasks…" value={srch} onChange={e=>setSrch(e.target.value)} style={{background:"#fff",border:`1px solid ${B.b2}`,color:B.ts,borderRadius:6,padding:"6px 10px",fontSize:11,fontFamily:"'Poppins',sans-serif",width:190}}/>
              <select value={fCl} onChange={e=>setFCl(e.target.value)} style={selSx}><option value="all">All clients</option>{allCl.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <select value={fSt} onChange={e=>setFSt(e.target.value)} style={selSx}><option value="all">All statuses</option>{allSt.map(s=><option key={s} value={s}>{s}</option>)}</select>
              <span style={{marginLeft:"auto",fontSize:9,color:B.tm,fontFamily:"'Poppins',sans-serif",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{filt.length} tasks · {ph.toFixed(1)}h</span>
            </div>
            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
              {Object.entries(filt.flatMap(t=>t.services||[]).reduce((a,s)=>({...a,[s]:(a[s]||0)+1}),{})).sort((a,b)=>b[1]-a[1]).map(([svc,cnt])=>(
                <span key={svc} style={{fontSize:9,color:B.tm,background:"rgba(0,0,0,0.04)",border:`1px solid ${B.border}`,padding:"3px 9px",borderRadius:20,fontFamily:"'Poppins',sans-serif"}}>{svc} {cnt}</span>
              ))}
            </div>
            {filt.length===0?<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:34,marginBottom:8}}>🎉</div>{gt("All tasks assigned!",15,800)}</div>:(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:8}}>
                {filt.map(t=><TCard key={t.id} task={t} designers={designers} onAssign={doAssign} isAssigning={aId===t.id} onOpen={setModalTask}/>)}
              </div>
            )}
          </div>
        )}

        {/* SIDEBAR */}
        <div style={{width:186,borderLeft:`1px solid ${B.border}`,padding:"14px 13px",overflowY:"auto",flexShrink:0,background:"#faf9f7"}}>
          <div style={{height:2,background:G,borderRadius:1,marginBottom:12}}/>
          <div style={{fontSize:8,color:"#948d84",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Week Overview</div>
          {designers.map(d=>{
            const dCp=cap.filter(c=>c.clickupUserId===d.clickupUserId);
            const totH=dCp.reduce((s,c)=>s+(c.availableHours||0),0);
            const wkDates=wd.map(fd);
            const bkH=flatA.reduce((s,t)=>s+bookingsFor(t).filter(b=>b.designerId===d.clickupUserId&&wkDates.includes(b.date)).reduce((x,b)=>x+b.hours,0),0);
            const pct=totH>0?Math.min((bkH/totH)*100,100):0;
            return(
              <div key={d.clickupUserId} style={{marginBottom:11,paddingBottom:11,borderBottom:`1px solid #e8e5df`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <Av name={d.designer} role={d.role} size={20}/>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:10,color:"#1a1817",fontFamily:"'Poppins',sans-serif",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.designer.split(" ")[0]}</div>
                    <div style={{fontSize:7,color:"#9a938a",fontFamily:"'Poppins',sans-serif",fontWeight:500}}>{d.role}</div>
                  </div>
                  <div style={{fontSize:10,fontFamily:"'Poppins',sans-serif",fontWeight:800,flexShrink:0,...(totH>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#c9c4bc"})}}>{totH}h</div>
                </div>
                <div style={{height:3,background:"#e8e5df",borderRadius:2,overflow:"hidden",marginBottom:bkH>0?3:0}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>80?B.tangerine:G,borderRadius:2,transition:"width 0.4s"}}/>
                </div>
                {bkH>0&&<div style={{fontSize:8,color:"#948d84",fontFamily:"'Poppins',sans-serif",fontWeight:500}}>{hl(Math.round(bkH*10)/10)} booked</div>}
              </div>
            );
          })}
          <div style={{marginTop:5,paddingTop:10,borderTop:`1px solid #e8e5df`}}>
            <div style={{fontSize:8,color:"#948d84",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>Unassigned</div>
            <div style={{fontSize:28,fontFamily:"'Poppins',sans-serif",fontWeight:900,lineHeight:1,...(filt.length>0?{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}:{color:"#c9c4bc"})}}>{filt.length}</div>
            <div style={{fontSize:9,color:"#948d84",fontFamily:"'Poppins',sans-serif",marginTop:2}}>{ph.toFixed(1)}h pending</div>
          </div>
          <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid #e8e5df`}}>
            <div style={{fontSize:8,color:"#948d84",fontFamily:"'Poppins',sans-serif",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>Priority</div>
            {["urgent","high","normal"].map(p=>{
              const cnt=filt.filter(t=>t.priority?.priority===p).length;
              if(!cnt)return null;
              return(
                <div key={p} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:PC[p]}}/><span style={{fontSize:9,color:"#8d867e",fontFamily:"'Poppins',sans-serif",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{p}</span></div>
                  <span style={{fontSize:12,color:PC[p],fontFamily:"'Poppins',sans-serif",fontWeight:800}}>{cnt}</span>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid #e8e5df`}}>
            <button onClick={()=>setOps(true)} style={{width:"100%",padding:"7px 0",background:"rgba(237,34,144,0.08)",border:`1px solid ${B.magenta}44`,borderRadius:6,cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:9,fontWeight:700,color:B.magenta,letterSpacing:"0.06em",transition:"all 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(237,34,144,0.2)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(237,34,144,0.08)";}}>📋 OPS GUIDE</button>
          </div>
        </div>
      </div>

      <Drawer open={drawer.open} designer={drawer.designer} day={drawer.day} cap={dCap} tasks={dTasks} designers={designers} onClose={()=>setDrawer({open:false,designer:null,day:null})} onReassign={doReassign} onUnassign={doUnassign} onOpen={t=>setModalTask(t)}/>
      {modalTask&&<TaskModal key={modalTask.id} task={modalTask} designers={designers} cap={cap} flatTasks={flatA} onClose={()=>setModalTask(null)} onSave={doSaveDetails} saving={savingDetails}/>}
      {ops&&<OpsGuide onClose={()=>setOps(false)}/>}
    </div>
  );
}
