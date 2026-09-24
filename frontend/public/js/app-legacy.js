
// ============================================================
// LIVE CLOCK
// ============================================================
function updateClock(){
  const now = new Date();
  const opts = {weekday:'long',year:'numeric',month:'long',day:'numeric'};
  const el = document.getElementById('live-datetime');
  if(el) el.textContent = now.toLocaleDateString('en-IN',opts) + ' · ' + now.toLocaleTimeString('en-IN');
  const h = now.getHours();
  const greet = h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening';
  const gel = document.getElementById('cc-greeting');
  if(gel) gel.textContent = greet + ', Managing Director';
}

// ============================================================
// AUTH (real backend JWT auth — see js/api.js)
// ============================================================
async function handleLogin(e){
  e.preventDefault();
  const slug  = document.getElementById('li-slug').value.trim().toLowerCase();
  const email = document.getElementById('li-email').value.trim();
  const pass  = document.getElementById('li-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  document.getElementById('login-btn-text').textContent='Signing in...';
  document.getElementById('login-spinner').style.display='inline-block';
  document.getElementById('login-btn').disabled=true;

  try {
    await MavixAPI.login(slug, email, pass);
    await doLogin();
  } catch (err) {
    errEl.textContent = err.message || 'Incorrect credentials. Please try again.';
    errEl.classList.remove('hidden');
  } finally {
    document.getElementById('login-btn-text').textContent='Sign In to Command Centre';
    document.getElementById('login-spinner').style.display='none';
    document.getElementById('login-btn').disabled=false;
  }
}
async function doLogin(){
  await loadState();
  document.getElementById('login-page').style.display='none';
  document.getElementById('main-app').style.display='flex';
  initApp();
  showToast('Welcome back, ' + state.user.name, 'success');
}
async function handleLogout(){
  if(!confirm('Sign out of MAVIX Estate Command?')) return;
  await MavixAPI.logout();
  document.getElementById('main-app').style.display='none';
  document.getElementById('login-page').style.display='flex';
  document.getElementById('login-btn').disabled=false;
  document.getElementById('login-btn-text').textContent='Sign In to Command Centre';
  document.getElementById('login-spinner').style.display='none';
  showToast('Signed out successfully','info');
  
}
function togglePass(){
  const f=document.getElementById('li-pass');
  f.type=f.type==='password'?'text':'password';
}

function openForgotPassword(){
  document.getElementById('forgot-password-step-1').classList.remove('hidden');
  document.getElementById('forgot-password-step-2').classList.add('hidden');
  openModal('forgot-password-modal');
}
async function submitForgotPassword(e){
  e.preventDefault();
  const tenantSlug=document.getElementById('fp-slug').value.trim().toLowerCase();
  const email=document.getElementById('fp-email').value.trim();
  try{
    await MavixAPI.post('/auth/forgot-password',{tenantSlug,email});
  }catch(err){ /* backend always returns success here to avoid leaking which accounts exist */ }
  document.getElementById('forgot-password-step-1').classList.add('hidden');
  document.getElementById('forgot-password-step-2').classList.remove('hidden');
}

// ============================================================
// NAVIGATION
// ============================================================
const PAGE_MAP = {command:'command',company:'company',construction:'construction',org:'org',sales:'sales',finance:'finance',ai:'ai'};
function navigateTo(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.mod-tab').forEach(t=>t.classList.remove('active'));
  const pg = document.getElementById('page-'+page);
  const tab = document.getElementById('tab-'+page);
  if(pg) pg.classList.add('active');
  if(tab) tab.classList.add('active');
  closeNotif(); closeProfileMenu();
  if(page==='finance') showFinance(state.finView||'landing');
  if(page==='construction') setConstrProject(state.constrProject||'site-a');
  window.scrollTo(0,0);
  setTimeout(()=>initChartsForPage(page), 80);
}

function switchInnerTab(group, tabId){
  // Find the tab container matching the group
  const tabContainer = document.getElementById(group+'-tabs') ||
                       document.getElementById('cf-tabs') ||
                       document.getElementById('cof-tabs') ||
                       document.getElementById('ai-tabs');
  // Search all inner-tabs within the page
  const page = document.getElementById('page-'+group) ||
               document.getElementById('finance-company') ||
               document.getElementById('finance-construction') ||
               document.getElementById('page-ai');
  if(!page) return;
  page.querySelectorAll('.inner-tab').forEach(t=>t.classList.remove('active'));
  page.querySelectorAll('.inner-content').forEach(c=>c.classList.remove('active'));
  // find clicked tab by onclick attr containing tabId
  const clickedTab = Array.from(page.querySelectorAll('.inner-tab'))
    .find(t=>(t.getAttribute('onclick')||'').includes("'"+tabId+"'"));
  if(clickedTab) clickedTab.classList.add('active');
  // find content: try group-tabId or tabId
  const content = document.getElementById(group+'-'+tabId) || document.getElementById(tabId);
  if(content) content.classList.add('active');
  setTimeout(()=>initChartsForPage(group+'_'+tabId), 80);
}

// ============================================================
// FINANCE
// ============================================================
function showFinance(view){
  state.finView = view;
  document.getElementById('finance-landing').classList.toggle('hidden', view!=='landing');
  document.getElementById('finance-company').classList.toggle('hidden', view!=='company');
  document.getElementById('finance-construction').classList.toggle('hidden', view!=='construction');
  if(view==='company'){ renderBankSummary(); renderTransactions(); setTimeout(initCFCharts,100); }
  if(view==='construction'){ renderRERAAccounts(); setTimeout(initCOFCharts,100); }
}

// ============================================================
// PROJECT FILTER
// ============================================================
function selectProject(pid){
  document.getElementById('hdr-project').value = pid;
  filterByProject(pid);
  showToast('Filtered: '+getProjectName(pid),'info');
}
function filterByProject(pid){
  state.constrProject = pid;
  const sel = document.getElementById('constr-project-sel');
  if(sel) sel.value = pid;
  updateConstructionKPIs(pid);
}
function getProjectName(pid){
  return {'all':'All Projects','site-a':'Aarohan Grande','site-b':'Business Bay','site-c':'Aarohan Serenity'}[pid]||pid;
}
function setConstrProject(pid){
  state.constrProject = pid;
  const sel = document.getElementById('constr-project-sel');
  if(sel) sel.value = pid;
  updateConstructionKPIs(pid);
}
const PROJ_KPIS = {
  'site-a':{physical:68,financial:71,manpower:284,delayed:8,safety:87,quality:91,contractors:18,issues:7},
  'site-b':{physical:52,financial:58,manpower:196,delayed:12,safety:82,quality:88,contractors:12,issues:11},
  'site-c':{physical:39,financial:43,manpower:143,delayed:5,safety:90,quality:85,contractors:9,issues:14},
  'all'   :{physical:57,financial:61,manpower:623,delayed:25,safety:86,quality:88,contractors:39,issues:32},
};
function updateConstructionKPIs(pid){
  const k = PROJ_KPIS[pid]||PROJ_KPIS['site-a'];
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  const p=(id,v)=>{const e=document.getElementById(id);if(e)e.style.width=v+'%';};
  s('ck-physical',k.physical+'%'); p('ck-physical-bar',k.physical);
  s('ck-financial',k.financial+'%'); p('ck-fin-bar',k.financial);
  s('ck-manpower',k.manpower); s('ck-delayed',k.delayed);
  s('ck-safety',k.safety); s('ck-quality',k.quality);
  s('ck-contractors',k.contractors); s('ck-issues',k.issues);
}

// ============================================================
// RENDER: APPROVALS
// ============================================================
function renderApprovals(){
  const list = document.getElementById('approvals-list');
  if(!list) return;
  const pending = state.approvals.filter(a=>a.status==='pending');
  const cnt = pending.length;
  ['appr-live-cnt','appr-tab-cnt','approval-count','kpi-approvals'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent=cnt;
  });
  const iconColors=['#E8F2FB','#FDF3DC','#E8F5F0','#FDEAEA','#EAF4FA','#FDF3DC','#E8EEF3'];
  list.innerHTML = pending.length ? pending.map((a,i)=>`
    <div class="approval-card" id="acard-${a.id}">
      <div class="approval-icon" style="background:${iconColors[i%7]};font-size:20px">${a.icon}</div>
      <div class="approval-info">
        <div class="approval-title">${a.type}</div>
        <div class="approval-meta">${a.desc} &nbsp;|&nbsp; ${a.project} &nbsp;|&nbsp; By: ${a.raised} &nbsp;|&nbsp; ${a.date}</div>
        <div class="approval-amount">&#8377;${a.amount}</div>
      </div>
      <div class="approval-actions">
        <button class="btn btn-success btn-sm" onclick="doApprove('${a.id}')">&#10003; Approve</button>
        <button class="btn btn-crit btn-sm" onclick="doReject('${a.id}')">&#10007; Reject</button>
        <button class="btn btn-outline btn-sm" onclick="showToast('Clarification requested','info')">? Clarify</button>
        <button class="btn btn-ghost btn-sm" onclick="showToast('${a.type}: ${a.desc}','info')">View</button>
      </div>
    </div>`).join('') :
    '<div class="empty-state"><div style="font-size:48px">&#10004;&#65039;</div><p>No pending approvals. All caught up!</p></div>';
}

let _pendingApprId='';
function doApprove(id){
  _pendingApprId=id;
  const a=state.approvals.find(x=>x.id===id);
  document.getElementById('approve-modal-title').textContent='Approve: '+a.type;
  document.getElementById('approve-modal-body').textContent='Confirm approval of '+a.desc+' for &#8377;'+a.amount+'?';
  document.getElementById('approve-confirm-btn').onclick=()=>confirmApprove(id);
  openModal('approve-modal');
}
function confirmApprove(id){
  const a=state.approvals.find(x=>x.id===id);
  closeModal('approve-modal');
  MavixAPI.post(`/approvals/${a._dbId}/approve`).then(()=>{
    if(a){ a.status='approved'; }
    renderApprovals();
    showToast((a?a.type:'Item')+' approved','success');
    addNotif('finance','Approved: '+(a?a.type:''),'Approval processed for &#8377;'+(a?a.amount:''));
    addAuditEntry('Approval','Approved '+(a?a.type:''),a?a.desc:'');
  }).catch(err=>showToast('Approve failed: '+err.message,'crit'));
}
function doReject(id){
  const a=state.approvals.find(x=>x.id===id);
  document.getElementById('reject-modal-body').textContent='Reject: '+(a?a.desc:'this item');
  document.getElementById('reject-confirm-btn').onclick=()=>confirmReject(id);
  openModal('reject-modal');
}
function confirmReject(id){
  const reason=document.getElementById('reject-reason').value;
  if(!reason){ showToast('Please enter rejection reason','warn'); return; }
  const a=state.approvals.find(x=>x.id===id);
  closeModal('reject-modal');
  document.getElementById('reject-reason').value='';
  MavixAPI.post(`/approvals/${a._dbId}/reject`).then(()=>{
    if(a){ a.status='rejected'; }
    renderApprovals();
    showToast('Rejected: '+(a?a.type:'Item'),'warn');
    addAuditEntry('Approval','Rejected '+(a?a.type:''),reason);
  }).catch(err=>showToast('Reject failed: '+err.message,'crit'));
}
function approveBill(id){ showToast('Bill '+id+' approved and queued for payment','success'); addAuditEntry('Construction','Bill Approved',id); }
function approveRERA(){ showToast('RERA compliance approved. Proceeding to Director sign-off.','success'); addAuditEntry('Finance','RERA Compliance Approved','Site A &#8377;4.85 Cr'); }

// ============================================================
// RENDER: VENDORS
// ============================================================
function renderVendors(){
  const tbody=document.getElementById('vendor-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.vendors.map(v=>`
    <tr>
      <td>${v.code}</td>
      <td><strong>${v.name}</strong></td>
      <td><span class="tag">${v.cat}</span></td>
      <td>${v.projects}</td>
      <td>&#8377;${v.value}</td>
      <td>&#8377;${v.outstanding}</td>
      <td><div class="flex fac gap8"><div class="progress-bar" style="width:50px"><div class="progress-fill ${v.quality>=90?'success':'warn'}" style="width:${v.quality}%"></div></div>${v.quality}</div></td>
      <td><span class="badge badge-${v.risk==='Low'?'success':v.risk==='Medium'?'warn':'crit'}">${v.risk}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="showVendorProfile('${v.code}')">Profile</button></td>
    </tr>`).join('');
}
function showVendorProfile(code){
  const v=state.vendors.find(x=>x.code===code);
  if(!v) return;
  showDetailModal('Vendor: '+v.name,`
    <div class="grid2">
      <div>
        <div class="info-row"><span class="lbl">Code</span><span class="val">${v.code}</span></div>
        <div class="info-row"><span class="lbl">Category</span><span class="val">${v.cat}</span></div>
        <div class="info-row"><span class="lbl">Contact</span><span class="val">${v.contact}</span></div>
        <div class="info-row"><span class="lbl">Projects</span><span class="val">${v.projects}</span></div>
      </div>
      <div>
        <div class="info-row"><span class="lbl">Total Value</span><span class="val">&#8377;${v.value}</span></div>
        <div class="info-row"><span class="lbl">Outstanding</span><span class="val">&#8377;${v.outstanding}</span></div>
        <div class="info-row"><span class="lbl">Quality Score</span><span class="val">${v.quality}/100</span></div>
        <div class="info-row"><span class="lbl">Delivery Score</span><span class="val">${v.delivery||85}/100</span></div>
        <div class="info-row"><span class="lbl">Risk Status</span><span class="val"><span class="badge badge-${v.risk==='Low'?'success':v.risk==='Medium'?'warn':'crit'}">${v.risk}</span></span></div>
      </div>
    </div>`);
}

// ============================================================
// RENDER: EMPLOYEES
// ============================================================
function renderEmployees(filter){
  const tbody=document.getElementById('emp-tbody');
  if(!tbody) return;
  let emps=state.employees;
  if(filter) emps=emps.filter(e=>e.dept.toLowerCase().includes(filter.toLowerCase()));
  tbody.innerHTML=emps.map(e=>`
    <tr>
      <td>${e.id}</td>
      <td><strong>${e.name}</strong></td>
      <td>${e.design}</td>
      <td>${e.dept}</td>
      <td><span class="badge badge-navy">${e.project}</span></td>
      <td><span class="badge badge-${e.tasks>15?'warn':'info'}">${e.tasks}</span></td>
      <td><div class="flex fac gap8"><div class="progress-bar" style="width:50px"><div class="progress-fill ${e.perf>=90?'success':e.perf>=80?'warn':'crit'}" style="width:${e.perf}%"></div></div>${e.perf}</div></td>
      <td><span class="badge badge-${e.status==='Present'?'success':e.status==='Leave'?'warn':'crit'}">${e.status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="showToast('${e.name} — ${e.design}','info')">View</button></td>
    </tr>`).join('');
}
function filterEmpByDept(dept){ renderEmployees(dept); }

// ============================================================
// RENDER: LEADS
// ============================================================
function renderLeads(stageFilter){
  const tbody=document.getElementById('leads-tbody');
  if(!tbody) return;
  const cols={New:'grey',Contacted:'info',Qualified:'blue','Site Visit':'warn',Negotiation:'warn',Booking:'success',Lost:'crit'};
  let leads=state.leads;
  if(stageFilter) leads=leads.filter(l=>l.stage===stageFilter);
  tbody.innerHTML=leads.map(l=>`
    <tr>
      <td>${l.id}</td>
      <td><strong>${l.name}</strong></td>
      <td>${l.phone}</td>
      <td><span class="tag">${l.source}</span></td>
      <td>${l.project}</td>
      <td>&#8377;${l.budget}</td>
      <td>${l.type}</td>
      <td><strong style="color:${l.score>=80?'var(--success)':l.score>=60?'var(--warn)':'var(--crit)'}">${l.score}</strong></td>
      <td>${l.exec}</td>
      <td><span class="badge badge-${cols[l.stage]||'grey'}">${l.stage}</span></td>
      <td>${l.next}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="showToast('Calling ${l.name}...','info')">&#128222;</button>
        <button class="btn btn-ghost btn-sm" onclick="advanceLeadStage('${l.id}')">Move &#8594;</button>
      </td>
    </tr>`).join('');
}
function advanceLeadStage(id){
  const stages=['New','Contacted','Qualified','Site Visit','Negotiation','Booking','Lost'];
  const l=state.leads.find(x=>x.id===id);
  if(!l) return;
  const i=stages.indexOf(l.stage);
  if(i<stages.length-2){
    MavixAPI.post(`/leads/${l._dbId}/advance-stage`).then(()=>{
      l.stage=stages[i+1]; renderLeads(); showToast(l.name+' moved to '+l.stage,'success');
    }).catch(err=>showToast('Failed: '+err.message,'crit'));
  }
}
function filterLeads(v){ renderLeads(v||null); }

// ============================================================
// RENDER: FOLLOW-UPS
// ============================================================
function renderFollowUps(){
  const tbody=document.getElementById('followup-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.followups.map(f=>`
    <tr>
      <td>${f.lead}</td>
      <td><strong>${f.customer}</strong></td>
      <td>${f.phone}</td>
      <td><span class="badge badge-info">${f.stage}</span></td>
      <td><strong>${f.date}</strong></td>
      <td><span class="tag">${f.type}</span></td>
      <td>${f.exec}</td>
      <td>${f.last}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="showToast('Calling ${f.customer}...','info')">&#128222; Call</button>
        <button class="btn btn-outline btn-sm" onclick="markFollowupDone('${f.customer}')">&#10003; Done</button>
      </td>
    </tr>`).join('');
}
function markFollowupDone(name){
  const f=state.followups.find(x=>x.customer===name);
  const after=()=>{ state.followups=state.followups.filter(x=>x.customer!==name); renderFollowUps(); showToast('Follow-up with '+name+' marked complete','success'); };
  if(f && f._dbId){ MavixAPI.post(`/followups/${f._dbId}/mark-done`).then(after).catch(err=>showToast('Failed: '+err.message,'crit')); }
  else after();
}

// ============================================================
// RENDER: CUSTOMERS
// ============================================================
function renderCustomers(){
  const tbody=document.getElementById('cust-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.customers.map(c=>`
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.unit}</td>
      <td>${c.project}</td>
      <td>&#8377;${(c.agreement/100000).toFixed(2)}L</td>
      <td style="color:var(--success)">&#8377;${(c.received/100000).toFixed(2)}L</td>
      <td style="color:var(--warn)">&#8377;${(c.pending/100000).toFixed(2)}L</td>
      <td>${c.nextDemand}</td>
      <td style="color:${c.overdue>0?'var(--crit)':'var(--success)'}">
        ${c.overdue>0?'&#8377;'+(c.overdue/100000).toFixed(2)+'L':'&#8212;'}
      </td>
      <td><span class="badge badge-${c.daysOD===0?'success':c.daysOD<30?'warn':'crit'}">
        ${c.daysOD===0?'Current':c.daysOD+' days OD'}
      </span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="sendReminder('${c.name}')">Remind</button>
        <button class="btn btn-ghost btn-sm" onclick="showToast('Ledger for ${c.name}','info')">Ledger</button>
      </td>
    </tr>`).join('');
}

// ============================================================
// RENDER: DUES
// ============================================================
function renderDues(){
  const tbody=document.getElementById('dues-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.customers.filter(c=>c.pending>0).map(c=>{
    const bucket=c.daysOD===0?'Not Due':c.daysOD<=30?'1-30 Days':c.daysOD<=60?'31-60 Days':c.daysOD<=90?'61-90 Days':'>90 Days';
    return `<tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.unit}</td>
      <td>&#8377;${(c.pending/100000).toFixed(2)}L</td>
      <td style="color:${c.overdue>0?'var(--crit)':''}">
        ${c.overdue>0?'&#8377;'+(c.overdue/100000).toFixed(2)+'L':'&#8212;'}
      </td>
      <td>${c.daysOD||'&#8212;'}</td>
      <td><span class="badge badge-${c.daysOD===0?'success':c.daysOD<=30?'warn':'crit'}">${bucket}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="sendReminder('${c.name}')">&#128241; Remind</button>
        <button class="btn btn-outline btn-sm" onclick="showToast('Calling ${c.name}...','info')">&#128222;</button>
        <button class="btn btn-ghost btn-sm" onclick="showToast('Payment plan created for ${c.name}','info')">Plan</button>
      </td>
    </tr>`;}).join('');
}
function sendReminder(name){ showToast('Reminder sent to '+name+' via WhatsApp & SMS','success'); addNotif('sales','Reminder Sent','Payment reminder sent to '+name); }
function sendBulkReminder(){
  MavixAPI.post('/collection-agent/run-followup').then(({data})=>{
    showToast(`Bulk reminders sent to ${data.remindersSent} overdue customers`,'success');
    addNotif('sales','Bulk Reminder','Campaign sent to all overdue customers');
  }).catch(()=>{
    showToast('Bulk reminders sent to all overdue customers','success');
    addNotif('sales','Bulk Reminder','Campaign sent to all overdue customers');
  });
}

// ============================================================
// RENDER: COLLECTIONS
// ============================================================
function renderCollections(){
  const tbody=document.getElementById('coll-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.collections.map(c=>`
    <tr>
      <td>${c.date}</td>
      <td><strong>${c.customer}</strong></td>
      <td>${c.unit}</td>
      <td>${c.project}</td>
      <td><span class="tag">${c.type}</span></td>
      <td style="color:var(--success)"><strong>&#8377;${(c.amount/100000).toFixed(2)}L</strong></td>
      <td>${c.mode}</td>
      <td>${c.ref}</td>
      <td><span class="badge badge-success">${c.status}</span></td>
    </tr>`).join('');
}

// ============================================================
// RENDER: TRANSACTIONS
// ============================================================
function renderTransactions(){
  const tbody=document.getElementById('txn-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.transactions.map(t=>`
    <tr>
      <td>${t.id}</td>
      <td>${t.date}</td>
      <td><span class="tag">${t.cat}</span></td>
      <td>${t.desc}</td>
      <td>${t.project}</td>
      <td>${t.party}</td>
      <td>${t.mode}</td>
      <td style="color:${t.debit>0?'var(--crit)':'var(--ts)'}">
        ${t.debit>0?'&#8377;'+(t.debit/100000).toFixed(2)+'L':'&#8212;'}
      </td>
      <td style="color:${t.credit>0?'var(--success)':'var(--ts)'}">
        ${t.credit>0?'&#8377;'+(t.credit/100000).toFixed(2)+'L':'&#8212;'}
      </td>
      <td><span class="badge badge-${t.status==='Verified'||t.status==='Approved'||t.status==='Processed'?'success':'warn'}">${t.status}</span></td>
      <td>${t.by}</td>
    </tr>`).join('');
}

// ============================================================
// RENDER: DPR
// ============================================================
function renderDPR(){
  const list=document.getElementById('dpr-list');
  if(!list) return;
  list.innerHTML=[...state.dprRecords].reverse().map(d=>`
    <div class="card mb8"><div class="card-body" style="padding:14px 16px">
      <div class="flex fsb fac mb8">
        <span class="bold">${d.date} &#8212; ${d.tower} / ${d.floor}</span>
        <span class="badge badge-success">${d.status}</span>
      </div>
      <div class="ts fs12">${d.activity} | ${d.contractor} | ${d.labour} workers | ${d.weather}</div>
      <div class="flex gap8 mt8" style="font-size:12px">
        <span>Planned: <strong>${d.planned}</strong></span>
        <span>Actual: <strong style="color:${d.actual>=d.planned?'var(--success)':'var(--warn)'}">${d.actual}</strong></span>
        <span>${Math.round(d.actual/Math.max(d.planned,1)*100)}%</span>
      </div>
    </div></div>`).join('');
}

// ============================================================
// RENDER: BOQ
// ============================================================
function renderBOQ(){
  const tbody=document.getElementById('boq-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.boqData.map(b=>`
    <tr>
      <td>${b.code}</td>
      <td><strong>${b.cat}</strong></td>
      <td>&#8377;${b.budget}L</td>
      <td>&#8377;${b.committed}L</td>
      <td>&#8377;${b.actual}L</td>
      <td>&#8377;${b.paid}L</td>
      <td style="color:${b.remaining<0?'var(--crit)':'var(--success)'}">&#8377;${b.remaining}L</td>
      <td style="color:${b.variance<0?'var(--crit)':b.variance>0?'var(--success)':'var(--ts)'}">&#8377;${b.variance}L</td>
      <td><span class="badge badge-${b.status==='Overrun'?'crit':b.status==='Complete'?'success':b.status==='Reserve'?'grey':'warn'}">${b.status}</span></td>
    </tr>`).join('');
}

// ============================================================
// RENDER: MATERIALS
// ============================================================
function renderMaterials(){
  const tbody=document.getElementById('material-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.materialData.map(m=>`
    <tr>
      <td><strong>${m.mat}</strong></td>
      <td>${m.unit}</td>
      <td>${m.opening}</td>
      <td>${m.received}</td>
      <td>${m.consumed}</td>
      <td><strong>${m.closing}</strong></td>
      <td>${m.min}</td>
      <td>&#8377;${m.value}L</td>
      <td>${m.alert==='crit'?'<span class="badge badge-crit">&#128308; Critical</span>':m.alert==='warn'?'<span class="badge badge-warn">&#9888; Low</span>':'<span class="badge badge-success">OK</span>'}</td>
    </tr>`).join('');
}
function showMaterialAlerts(){
  const crit=state.materialData.filter(m=>m.alert==='crit').map(m=>m.mat).join(', ');
  const warn=state.materialData.filter(m=>m.alert==='warn').map(m=>m.mat).join(', ');
  showDetailModal('Material Alerts',`
    <div class="ai-alert crit mb12"><div class="ai-alert-icon">&#128308;</div><div>
      <div class="ai-alert-title">Critical Stock (below minimum)</div>
      <div class="ai-alert-body">${crit||'None'}</div>
    </div></div>
    <div class="ai-alert warn"><div class="ai-alert-icon">&#9888;&#65039;</div><div>
      <div class="ai-alert-title">Low Stock Warning</div>
      <div class="ai-alert-body">${warn||'None'}</div>
    </div></div>`);
}

// ============================================================
// RENDER: PROGRESS TABLE
// ============================================================
function renderProgress(){
  const tbody=document.getElementById('progress-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.progressData.map(p=>`
    <tr>
      <td>${p.tower}</td><td>${p.floor}</td>
      <td><strong>${p.activity}</strong></td>
      <td>${p.contractor}</td>
      <td>${p.planned}%</td>
      <td>${p.actual}%</td>
      <td style="color:${p.delay>0?'var(--crit)':'var(--success)'}">
        ${p.delay>0?p.delay+' days':'On time'}
      </td>
      <td>${p.eng}</td>
      <td><span class="badge badge-${p.status==='Complete'?'success':p.status==='Critical'||p.status==='Delayed'?'crit':p.status==='Behind'?'warn':'info'}">${p.status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openModal('progress-modal')">Update</button></td>
    </tr>`).join('');
}

// ============================================================
// RENDER: ISSUES
// ============================================================
function renderIssues(){
  const list=document.getElementById('issues-list');
  if(!list) return;
  list.innerHTML=state.issues.map((iss,i)=>`
    <div class="approval-card">
      <div class="approval-icon" style="background:${iss.priority==='High'?'#FDEAEA':'#FDF3DC'};font-size:20px">
        ${iss.priority==='High'?'&#128308;':'&#9888;&#65039;'}
      </div>
      <div class="approval-info">
        <div class="approval-title">${iss.title}</div>
        <div class="approval-meta">${iss.project} | ${iss.type} | Owner: ${iss.owner} | Due: ${iss.due}</div>
        <div style="margin-top:4px;font-size:12px">
          ${iss.impact>0?'<span style="color:var(--crit)">&#128176; &#8377;'+iss.impact+'L impact</span>&nbsp;|&nbsp;':''}
          ${iss.delay>0?'<span style="color:var(--warn)">&#8987; '+iss.delay+' day delay</span>':''}
        </div>
      </div>
      <div class="approval-actions">
        <span class="badge badge-${iss.status==='Open'?'crit':iss.status==='Monitoring'?'warn':'info'}">${iss.status}</span>
        <button class="btn btn-primary btn-sm" onclick="resolveIssue(${i})">Resolve</button>
        <button class="btn btn-outline btn-sm" onclick="showToast('Issue escalated to Director','warn')">Escalate</button>
      </div>
    </div>`).join('');
}
function resolveIssue(i){
  const iss=state.issues[i];
  if(iss && iss._dbId){
    MavixAPI.post(`/issues/${iss._dbId}/resolve`).then(()=>{
      iss.status='Resolved'; renderIssues(); showToast('Issue marked resolved','success');
    }).catch(err=>showToast('Failed: '+err.message,'crit'));
  } else if(iss){
    iss.status='Resolved'; renderIssues(); showToast('Issue marked resolved','success');
  }
}

// ============================================================
// RENDER: DEPT CARDS
// ============================================================
function renderDeptCards(){
  const grid=document.getElementById('dept-grid');
  if(!grid) return;
  const depts=[
    {name:'Management Office',head:'Arvind Rao',emp:4,present:4,tasks:8,overdue:0,score:97,concern:''},
    {name:'Project Management',head:'Vikram Deshpande',emp:12,present:11,tasks:42,overdue:3,score:90,concern:'Site C delay'},
    {name:'Site Execution',head:'Rohan Kulkarni',emp:28,present:26,tasks:68,overdue:8,score:84,concern:'Labour shortage Site C'},
    {name:'QS & Billing',head:'Suresh Rao',emp:6,present:5,tasks:18,overdue:2,score:87,concern:'BOQ updates'},
    {name:'Procurement',head:'Sameer Khan',emp:8,present:8,tasks:22,overdue:1,score:89,concern:'Steel delivery Site B'},
    {name:'Quality Control',head:'Mohit Rathod',emp:6,present:6,tasks:14,overdue:3,score:88,concern:'Pending inspections'},
    {name:'Safety & EHS',head:'Priya Menon',emp:4,present:4,tasks:10,overdue:0,score:90,concern:''},
    {name:'Finance & Accounts',head:'Meera Shah',emp:10,present:10,tasks:28,overdue:1,score:94,concern:''},
    {name:'Sales',head:'Nisha Kapoor',emp:12,present:11,tasks:36,overdue:2,score:89,concern:'Follow-ups due today'},
    {name:'CRM & Customer Relations',head:'Pooja Iyer',emp:6,present:6,tasks:24,overdue:4,score:85,concern:'Overdue collections'},
    {name:'Legal & RERA Compliance',head:'Tanvi Mehta',emp:4,present:4,tasks:12,overdue:0,score:91,concern:'PMC renewal Site B'},
    {name:'HR & Administration',head:'Kavita Nair',emp:8,present:8,tasks:18,overdue:0,score:92,concern:''},
    {name:'Marketing',head:'Ananya Singh',emp:4,present:4,tasks:10,overdue:0,score:86,concern:''},
    {name:'MEP',head:'Sandeep Kumar',emp:8,present:7,tasks:20,overdue:2,score:86,concern:'Site B electrical'},
    {name:'Design & Architecture',head:'Deepa Kulkarni',emp:4,present:4,tasks:8,overdue:0,score:92,concern:''},
    {name:'IT & ERP',head:'Kiran Desai',emp:2,present:2,tasks:6,overdue:0,score:88,concern:''},
    {name:'Stores & Inventory',head:'Vikash Chauhan',emp:5,present:5,tasks:16,overdue:1,score:84,concern:'Stock monitoring'},
  ];
  grid.innerHTML=depts.map(d=>`
    <div class="dept-card">
      <div class="flex fsb fac mb8">
        <div class="bold" style="font-size:13px">${d.name}</div>
        <div style="font-size:22px;font-weight:800;color:${d.score>=90?'var(--success)':d.score>=80?'var(--blue)':'var(--warn)'}">${d.score}</div>
      </div>
      <div class="ts fs12 mb8">Head: ${d.head}</div>
      <div class="score-bar mb12"><div class="score-fill" style="width:${d.score}%"></div></div>
      <div class="grid2" style="gap:8px;margin-bottom:8px">
        <div style="text-align:center"><div class="bold">${d.emp}</div><div class="ts fs11">Employees</div></div>
        <div style="text-align:center"><div class="bold" style="color:var(--success)">${d.present}</div><div class="ts fs11">Present</div></div>
        <div style="text-align:center"><div class="bold" style="color:var(--info)">${d.tasks}</div><div class="ts fs11">Open Tasks</div></div>
        <div style="text-align:center"><div class="bold" style="color:${d.overdue>0?'var(--crit)':'var(--success)'}">${d.overdue}</div><div class="ts fs11">Overdue</div></div>
      </div>
      ${d.concern?'<div class="ai-alert warn" style="padding:8px 12px"><span style="font-size:11px">&#9888; '+d.concern+'</span></div>':''}
      <button class="btn btn-outline btn-sm w100 mt8" onclick="showToast('${d.name} dept details','info')">View Department &#8594;</button>
    </div>`).join('');
}

// ============================================================
// RENDER: TASKS
// ============================================================
function renderTasks(){
  const map={Assigned:'assigned','In Progress':'inprogress',Completed:'completed',Overdue:'overdue'};
  ['assigned','inprogress','completed','overdue'].forEach(k=>{
    const el=document.getElementById('tasks-'+k); if(el) el.innerHTML='';
  });
  state.tasks.forEach(t=>{
    const key=map[t.status]||'assigned';
    const el=document.getElementById('tasks-'+key);
    if(!el) return;
    el.innerHTML+=`<div class="task-card ${key}" onclick="showToast('${t.title}','info')">
      <div class="flex fsb fac mb4">
        <span class="bold fs13">${t.title}</span>
        <span class="badge badge-${t.priority==='High'?'crit':t.priority==='Medium'?'warn':'grey'}">${t.priority}</span>
      </div>
      <div class="ts fs12">${t.emp} | ${t.dept}</div>
      <div class="ts fs12">${t.project} | Due: ${t.due}</div>
      <div class="ts fs12 mt4">${t.update}</div>
      <div class="flex gap8 mt8">
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();markTaskDone('${t.id}')">&#10003; Done</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();showToast('Update logged','info')">+ Update</button>
      </div>
    </div>`;
  });
}
function markTaskDone(id){
  const t=state.tasks.find(x=>x.id===id);
  if(!t) return;
  const after=()=>{ t.status='Completed'; t.update='Completed &#8212; '+new Date().toLocaleDateString('en-IN'); renderTasks(); showToast('Task completed!','success'); };
  if(t._dbId){ MavixAPI.post(`/tasks/${t._dbId}/mark-done`).then(after).catch(err=>showToast('Failed: '+err.message,'crit')); }
  else after();
}

// ============================================================
// RENDER: NOTIFICATIONS
// ============================================================
function renderNotifications(){
  const list=document.getElementById('notif-list');
  if(!list) return;
  list.innerHTML=state.notifications.map(n=>`
    <div class="notif-item ${n.unread?'unread':''} ${n.cat}" onclick="markNotifRead('${n.id}')">
      <div class="notif-cat">${n.cat.toUpperCase()}</div>
      <div class="notif-title">${n.title}</div>
      <div class="notif-body">${n.body}</div>
      <div class="notif-time">${n.time}</div>
    </div>`).join('');
  const unread=state.notifications.filter(x=>x.unread).length;
  const nc=document.getElementById('notif-count'); if(nc) nc.textContent=unread;
  const nb=document.getElementById('notif-badge'); if(nb) nb.textContent=unread;
}
function markNotifRead(id){
  const n=state.notifications.find(x=>x.id===id);
  if(n){ n.unread=false; renderNotifications(); if(n._dbId) MavixAPI.post(`/notifications/${n._dbId}/mark-read`).catch(()=>{}); }
}
function markAllRead(){
  state.notifications.forEach(n=>n.unread=false);
  renderNotifications(); showToast('All notifications read','info');
  MavixAPI.post('/notifications/mark-all-read').catch(()=>{});
}
function filterNotif(cat,btn){
  document.querySelectorAll('#notif-filters .btn').forEach(b=>b.className='btn btn-sm btn-outline');
  if(btn) btn.className='btn btn-sm btn-primary';
  document.querySelectorAll('#notif-list .notif-item').forEach(item=>{
    item.style.display=(cat==='all'||item.classList.contains(cat))?'block':'none';
  });
}
function addNotif(cat,title,body){
  state.notifications.unshift({id:'N-'+Date.now(),cat,title,body,time:'Just now',unread:true});
  renderNotifications();
  MavixAPI.post('/notifications', {cat,title,body}).catch(()=>{});
}

// ============================================================
// RENDER: AUDIT
// ============================================================
function renderAudit(){
  const tbody=document.getElementById('audit-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.auditLog.map(a=>`
    <tr>
      <td>${a.dt}</td>
      <td><strong>${a.user}</strong></td>
      <td>${a.role}</td>
      <td>${a.module}</td>
      <td><span class="tag">${a.action}</span></td>
      <td>${a.desc}</td>
      <td>${a.ip}</td>
    </tr>`).join('');
}
function addAuditEntry(module,action,desc){
  state.auditLog.unshift({
    dt:new Date().toLocaleString('en-IN'),
    user:state.user.name, role:state.user.role,
    module, action, desc, ip:''
  });
  renderAudit();
  MavixAPI.post('/audit-logs', {user:state.user.name, role:state.user.role, module, action, desc}).catch(()=>{});
}

// ============================================================
// RENDER: BANK / RERA
// ============================================================
function renderBankSummary(){
  const banks=[
    {name:'HDFC Corporate Current',open:8.40,rec:14.28,pay:12.80,close:9.88},
    {name:'ICICI Collection Account',open:12.20,rec:8.46,pay:10.20,close:10.46},
    {name:'Axis Vendor Payment',open:4.80,rec:6.00,pay:7.40,close:3.40},
    {name:'Petty Cash Corporate',open:0.12,rec:0.20,pay:0.18,close:0.14},
  ];
  const rera=[
    {name:'Site A RERA Collection',bal:28.40},{name:'Site A RERA Separate',bal:14.20},
    {name:'Site B RERA Collection',bal:8.80},{name:'Site B RERA Separate',bal:5.60},
    {name:'Site C RERA Collection',bal:6.40},{name:'Site C RERA Separate',bal:2.87},
  ];
  const bs=document.getElementById('bank-summary');
  const rs=document.getElementById('rera-summary');
  if(bs) bs.innerHTML=banks.map(b=>`
    <div class="info-row">
      <span class="lbl">${b.name}</span>
      <span class="val" style="color:var(--navy)">&#8377;${b.close} Cr</span>
    </div>`).join('');
  if(rs) rs.innerHTML=rera.map(r=>`
    <div class="info-row">
      <span class="lbl">${r.name}</span>
      <span class="val" style="color:var(--blue)">&#8377;${r.bal} Cr</span>
    </div>`).join('');
}

function renderRERAAccounts(){
  const wrap=document.getElementById('rera-accounts');
  if(!wrap) return;
  const projs=[
    {name:'Site A &#8212; Aarohan Grande',col:28.40,sep:14.20,total:94.25,withdrawn:26.00,eligible:5.10,cert:'Pending',next:'30 Jun 2026'},
    {name:'Site B &#8212; Business Bay',col:8.80,sep:5.60,total:72.40,withdrawn:18.00,eligible:3.80,cert:'Complete',next:'01 Jul 2026'},
    {name:'Site C &#8212; Aarohan Serenity',col:6.40,sep:2.87,total:38.00,withdrawn:8.00,eligible:2.40,cert:'Pending',next:'30 Jun 2026'},
  ];
  wrap.innerHTML=projs.map(p=>`
    <div class="card"><div class="card-header"><div class="card-title">${p.name}</div></div>
    <div class="card-body">
      <div class="info-row"><span class="lbl">Collection Account</span><span class="val" style="color:var(--blue)">&#8377;${p.col} Cr</span></div>
      <div class="info-row"><span class="lbl">Separate Account</span><span class="val" style="color:var(--info)">&#8377;${p.sep} Cr</span></div>
      <div class="info-row"><span class="lbl">Total Collected</span><span class="val">&#8377;${p.total} Cr</span></div>
      <div class="info-row"><span class="lbl">Amount Withdrawn</span><span class="val">&#8377;${p.withdrawn} Cr</span></div>
      <div class="info-row"><span class="lbl">Eligible Withdrawal</span><span class="val" style="color:var(--success)">&#8377;${p.eligible} Cr</span></div>
      <div class="info-row"><span class="lbl">Certificate Status</span><span class="val"><span class="badge badge-${p.cert==='Complete'?'success':'warn'}">${p.cert}</span></span></div>
      <div class="info-row"><span class="lbl">Next Certification</span><span class="val">${p.next}</span></div>
      <button class="btn btn-primary btn-sm mt12 w100" onclick="showToast('RERA withdrawal initiated','info')">Initiate Withdrawal</button>
    </div></div>`).join('');
}

// ============================================================
// RENDER: COLLECTION AGENT
// ============================================================
function renderCollectionAgent(){
  const tbody=document.getElementById('collection-agent-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.collectionAgent.map(c=>`
    <tr>
      <td><strong>${c.customer}</strong></td>
      <td>${c.unit}</td>
      <td>&#8377;${(c.due/100000).toFixed(2)}L</td>
      <td><span class="badge badge-${c.days>90?'crit':c.days>60?'warn':'info'}">${c.days} days</span></td>
      <td>${c.last}</td>
      <td>${c.promise||'&#8212;'}</td>
      <td><span class="badge badge-${c.risk==='High'?'crit':c.risk==='Medium'?'warn':'success'}">${c.risk}</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="sendReminder('${c.customer}')">&#128241; Remind</button>
        <button class="btn btn-outline btn-sm" onclick="showToast('Calling ${c.customer}...','info')">&#128222;</button>
      </td>
    </tr>`).join('');
}
function runCollectionFollowup(){
  showToast('AI Collection Agent running...','info');
  MavixAPI.post('/collection-agent/run-followup').then(({data})=>{
    const c=document.getElementById('ai-contacted'); if(c) c.textContent=parseInt(c.textContent)+data.remindersSent;
    const r=document.getElementById('ai-reminders'); if(r) r.textContent=parseInt(r.textContent)+data.remindersSent;
    const p=document.getElementById('ai-promises'); if(p) p.textContent=parseInt(p.textContent)+Math.min(3,data.remindersSent);
    return MavixAPI.get('/ai-logs');
  }).then(({data})=>{
    state.aiLogs = normalizeAll(data);
    renderAILog();
    addNotif('ai','AI Collection Follow-Up Complete',`${state.aiLogs.length?state.aiLogs[0].result:'Reminders sent'}`);
    showToast('Follow-up complete','success');
  }).catch(err=>showToast('Follow-up failed: '+err.message,'crit'));
}

// ============================================================
// RENDER: AI LOG
// ============================================================
function renderAILog(){
  const tbody=document.getElementById('ai-log-tbody');
  if(!tbody) return;
  tbody.innerHTML=state.aiLogs.map(l=>`
    <tr>
      <td>${l.time}</td>
      <td><span class="tag">${l.module}</span></td>
      <td>${l.action}</td>
      <td>${l.entity}</td>
      <td>${l.result}</td>
      <td>${l.value}</td>
    </tr>`).join('');
}

// ============================================================
// UNIT INVENTORY
// ============================================================
function loadProjectUnits(){
  const proj=document.getElementById('bk-project').value;
  const units=state.units.filter(u=>u.project===proj&&u.status==='Available');
  const sel=document.getElementById('bk-unit');
  if(!sel) return;
  sel.innerHTML=units.map(u=>`<option value="${u.id}">${u.tower}-${u.unit} | ${u.type} | ${u.carpet}sqft | &#8377;${(u.base/100000).toFixed(1)}L</option>`).join('');
  if(units.length>0) document.getElementById('bk-price').value=units[0].base;
}
function renderUnitGrid(){
  const wrap=document.getElementById('unit-grid-wrap');
  if(!wrap) return;
  const pf=(document.getElementById('unit-project-filter')||{}).value||'';
  const sf=(document.getElementById('unit-status-filter')||{}).value||'';
  const units=state.units.filter(u=>(pf?u.project===pf:true)&&(sf?u.status===sf:true));
  if(!units.length){ wrap.innerHTML='<div class="empty-state"><p>No units match the selected filters.</p></div>'; return; }
  const byProj={};
  units.forEach(u=>{ if(!byProj[u.project]) byProj[u.project]=[]; byProj[u.project].push(u); });
  wrap.innerHTML=Object.entries(byProj).map(([pid,us])=>`
    <div class="mb16">
      <div class="bold mb8" style="font-size:15px">${getProjectName(pid)}</div>
      <div class="unit-grid">${us.map(u=>`
        <div class="unit-card ${u.status.toLowerCase().replace(/ /g,'')}" onclick="showUnitDetail('${u.id}')">
          <div class="unit-num">${u.tower}-${u.unit}</div>
          <div class="unit-type">${u.type}</div>
          <div class="unit-area">${u.carpet} sqft</div>
          <div class="unit-price">&#8377;${(u.base/100000).toFixed(1)}L</div>
          <div class="badge badge-${u.status==='Available'?'success':u.status==='Booked'?'warn':u.status==='Blocked'?'crit':'grey'}" style="font-size:9px;margin-top:4px">${u.status}</div>
        </div>`).join('')}
      </div>
    </div>`).join('');
}
function filterUnits(){ renderUnitGrid(); }
function filterUnitsByStatus(){ renderUnitGrid(); }
function showUnitDetail(id){
  const u=state.units.find(x=>x.id===id);
  if(!u) return;
  showDetailModal('Unit: '+u.id,`
    <div class="grid2">
      <div>
        <div class="info-row"><span class="lbl">Project</span><span class="val">${getProjectName(u.project)}</span></div>
        <div class="info-row"><span class="lbl">Tower / Unit</span><span class="val">${u.tower} / ${u.unit}</span></div>
        <div class="info-row"><span class="lbl">Type</span><span class="val">${u.type}</span></div>
        <div class="info-row"><span class="lbl">Carpet Area</span><span class="val">${u.carpet} sqft</span></div>
        <div class="info-row"><span class="lbl">Base Price</span><span class="val">&#8377;${(u.base/100000).toFixed(2)}L</span></div>
      </div>
      <div>
        <div class="info-row"><span class="lbl">Status</span><span class="val"><span class="badge badge-${u.status==='Available'?'success':'warn'}">${u.status}</span></span></div>
        <div class="info-row"><span class="lbl">Customer</span><span class="val">${u.customer||'&#8212;'}</span></div>
        <div class="info-row"><span class="lbl">Booking Date</span><span class="val">${u.bookDate||'&#8212;'}</span></div>
        ${u.status==='Available'?'<button class="btn btn-primary mt12" onclick="closeModal(\'project-modal\');navigateTo(\'sales\');switchInnerTab(\'sales\',\'bookings\')">Book This Unit</button>':''}
      </div>
    </div>`);
}

// ============================================================
// FORMS
// ============================================================
function submitDPR(e){
  e.preventDefault();
  const rec={
    date:document.getElementById('dpr-date').value||new Date().toLocaleDateString('en-IN'),
    tower:document.getElementById('dpr-tower').value,
    floor:document.getElementById('dpr-floor').value,
    activity:document.getElementById('dpr-activity').value,
    contractor:document.getElementById('dpr-contractor').value,
    planned:parseInt(document.getElementById('dpr-planned').value)||0,
    actual:parseInt(document.getElementById('dpr-actual').value)||0,
    labour:parseInt(document.getElementById('dpr-labour').value)||0,
    weather:document.getElementById('dpr-weather').value,
    status:'Submitted'
  };
  MavixAPI.post('/dpr', rec).then(({data})=>{
    state.dprRecords.unshift(normalize(data));
    addAuditEntry('Construction','DPR Submitted',rec.tower+' '+rec.floor+' — '+rec.activity);
    renderDPR();
    document.getElementById('dpr-form').reset();
    document.getElementById('dpr-date').value=new Date().toISOString().split('T')[0];
    showToast('DPR submitted: '+rec.tower+' '+rec.floor,'success');
    addNotif('construction','DPR Submitted',rec.tower+' '+rec.floor+' — '+rec.activity);
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

function submitBooking(e){
  e.preventDefault();
  const unitId=document.getElementById('bk-unit').value;
  const unit=state.units.find(u=>u.id===unitId);
  const customer=document.getElementById('bk-customer').value;
  const amount=parseInt(document.getElementById('bk-amount').value)||0;
  const project=document.getElementById('bk-project').value;
  const price=parseInt(document.getElementById('bk-price').value)||0;
  const exec=document.getElementById('bk-exec').value;
  const mode=document.getElementById('bk-mode').value;
  const bookDate=new Date().toLocaleDateString('en-IN');

  const unitPatch = unit && unit._dbId
    ? MavixAPI.patch(`/units/${unit._dbId}`, {status:'Booked', customer, bookDate})
    : Promise.resolve();

  Promise.all([
    unitPatch,
    MavixAPI.post('/bookings', {date:bookDate, customer, unit:unitId, project, value:(price/100000).toFixed(2)+' L', amount:(amount/100000).toFixed(2)+' L', exec, mode}),
    MavixAPI.post('/collections', {date:bookDate, customer, unit:unitId, project, type:'Booking Amount', amount, mode, ref:'BK-'+Date.now().toString().slice(-6), status:'Cleared'}),
  ]).then(([, bkRes, colRes])=>{
    if(unit){ unit.status='Booked'; unit.customer=customer; unit.bookDate=bookDate; }
    state.bookings.unshift(normalize(bkRes.data));
    state.collections.unshift(normalize(colRes.data));
    renderBookings(); renderUnitGrid(); renderCollections();
    document.getElementById('booking-form').reset(); loadProjectUnits();
    addAuditEntry('Sales','Booking Confirmed',customer+' &#8212; '+unitId);
    showToast('Booking confirmed: '+customer+' &#8212; '+unitId,'success');
  }).catch(err=>showToast('Booking failed: '+err.message,'crit'));
}

function renderBookings(){
  const list=document.getElementById('booking-list');
  if(!list) return;
  list.innerHTML=state.bookings.map(b=>`
    <div class="card mb8"><div class="card-body" style="padding:12px 16px">
      <div class="flex fsb fac">
        <div><div class="bold">${b.customer}</div><div class="ts fs12">${b.unit} | ${getProjectName(b.project)}</div></div>
        <div style="text-align:right"><div class="bold" style="color:var(--success)">&#8377;${b.value}</div><div class="ts fs12">${b.date}</div></div>
      </div>
      <div class="flex gap8 mt8 ts fs12">
        <span>Booking: &#8377;${b.amount}</span><span>|</span>
        <span>${b.exec}</span><span>|</span><span>${b.mode}</span>
      </div>
    </div></div>`).join('');
}

function submitTask(e){
  e.preventDefault();
  const task={code:'T-'+Date.now(),title:document.getElementById('t-title').value,emp:document.getElementById('t-emp').value,dept:document.getElementById('t-dept').value,project:document.getElementById('t-proj').value,due:document.getElementById('t-due').value,priority:document.getElementById('t-priority').value,status:'Assigned',update:'Task created'};
  MavixAPI.post('/tasks', task).then(({data})=>{
    state.tasks.push(normalize(data));
    closeModal('task-modal'); document.getElementById('task-form').reset();
    renderTasks();
    showToast('Task created: '+task.title,'success');
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

function submitLead(e){
  e.preventDefault();
  const lead={
    code:'LD-'+String(state.leads.length+1).padStart(3,'0'),
    name:document.getElementById('l-name').value,
    phone:document.getElementById('l-phone').value,
    email:document.getElementById('l-email').value,
    source:document.getElementById('l-source').value,
    project:document.getElementById('l-project').value,
    budget:document.getElementById('l-budget').value,
    type:document.getElementById('l-type').value,
    timeline:'3-6 months', score:Math.floor(Math.random()*35+55),
    exec:document.getElementById('l-exec').value,
    last:new Date().toLocaleDateString('en-IN'),
    next:new Date(Date.now()+3*86400000).toLocaleDateString('en-IN'),
    stage:'New', status:'Active'
  };
  MavixAPI.post('/leads', lead).then(({data})=>{
    state.leads.push(normalize(data));
    closeModal('add-lead-modal'); document.getElementById('lead-form').reset();
    renderLeads();
    showToast('Lead added: '+lead.name,'success');
    addAuditEntry('Sales','Lead Created',lead.name+' &#8212; '+lead.project);
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

function submitMaterialRequest(e){
  e.preventDefault();
  const mat=document.getElementById('mr-material').value;
  const qty=parseInt(document.getElementById('mr-qty').value)||0;
  const unit=document.getElementById('mr-unit').value;
  const req={material:mat,qty,unit,project:state.constrProject==='site-a'?'Site A':state.constrProject==='site-b'?'Site B':'Site C',requestedBy:state.user.name,status:'Pending'};
  MavixAPI.post('/material-requests', req).then(()=>{
    closeModal('material-request-modal');
    document.getElementById('material-request-form').reset();
    showToast('Material request created: '+mat+' '+qty+' '+unit,'success');
    addAuditEntry('Procurement','Material Request',mat+' '+qty+' '+unit);
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

function submitTransaction(e){
  e.preventDefault();
  const type=document.getElementById('txn-type').value;
  const amount=parseInt(document.getElementById('txn-amount').value)||0;
  const txn={
    code:'TXN-'+String(state.transactions.length+843),
    date:document.getElementById('txn-date').value||new Date().toLocaleDateString('en-IN'),
    cat:document.getElementById('txn-cat').value,
    desc:document.getElementById('txn-desc').value,
    project:document.getElementById('txn-proj').value,
    party:document.getElementById('txn-party').value,
    mode:document.getElementById('txn-mode').value,
    debit:type==='Debit'?amount:0,
    credit:type==='Credit'?amount:0,
    status:'Pending', enteredBy:state.user.name
  };
  MavixAPI.post('/transactions', txn).then(({data})=>{
    state.transactions.unshift(normalize(data));
    closeModal('txn-modal');
    renderTransactions();
    showToast('Transaction recorded: &#8377;'+(amount/100000).toFixed(2)+'L','success');
    addAuditEntry('Finance','Transaction Created',txn.desc);
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

function submitVendor(e){
  e.preventDefault();
  const v={code:'V-'+String(state.vendors.length+1).padStart(3,'0'),name:document.getElementById('v-name').value,cat:document.getElementById('v-cat').value,contact:document.getElementById('v-contact').value,projects:'&#8212;',value:'&#8377;0',outstanding:'&#8377;0',quality:85,delivery:80,risk:'Low'};
  MavixAPI.post('/vendors', v).then(({data})=>{
    state.vendors.push(normalize(data));
    closeModal('vendor-modal'); renderVendors();
    showToast('Vendor added: '+v.name,'success');
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

function submitIssue(e){
  e.preventDefault();
  const iss={title:document.getElementById('iss-title').value,priority:document.getElementById('iss-priority').value,project:state.constrProject==='site-a'?'Site A':state.constrProject==='site-b'?'Site B':'Site C',type:document.getElementById('iss-type').value,impact:parseInt(document.getElementById('iss-impact').value)||0,delay:parseInt(document.getElementById('iss-delay').value)||0,owner:state.user.name,due:new Date(Date.now()+7*86400000).toLocaleDateString('en-IN'),status:'Open'};
  MavixAPI.post('/issues', iss).then(({data})=>{
    state.issues.unshift(normalize(data));
    closeModal('issue-modal'); renderIssues();
    showToast('Issue logged: '+iss.title,'success');
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

function submitProgressUpdate(e){
  e.preventDefault();
  const rec={tower:document.getElementById('pu-tower').value,floor:document.getElementById('pu-floor').value,activity:document.getElementById('pu-activity').value,contractor:'BuildMax Contractors',planned:parseInt(document.getElementById('pu-planned').value)||0,actual:parseInt(document.getElementById('pu-actual').value)||0,delay:0,eng:state.user.name,status:'Updated'};
  MavixAPI.post('/progress', rec).then(({data})=>{
    state.progressData.unshift(normalize(data));
    closeModal('progress-modal'); renderProgress();
    showToast('Progress updated: '+rec.tower+' '+rec.floor,'success');
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}
function submitBill(e){
  e.preventDefault();
  const contr=document.getElementById('bill-contr').value;
  const amount=parseFloat(document.getElementById('bill-amount').value)||0;
  const work=document.getElementById('bill-work').value;
  const approval={
    code:'APR-'+Date.now().toString().slice(-6),
    type:'Contractor RA Bill',
    desc:contr+' — '+work,
    amount:amount.toFixed(2)+' Lakh',
    icon:'🏗',
    status:'pending',
    project:state.constrProject==='site-a'?'Site A':state.constrProject==='site-b'?'Site B':'Site C',
    raisedBy:state.user.name,
    date:new Date().toLocaleDateString('en-IN')
  };
  MavixAPI.post('/approvals', approval).then(({data})=>{
    state.approvals.unshift({...normalize(data),raised:data.raisedBy});
    state.approvalCounter=state.approvals.filter(a=>a.status==='pending').length;
    renderApprovals();
    closeModal('bill-modal');
    document.getElementById('bill-form').reset();
    showToast('RA Bill submitted for approval: '+contr,'success');
    addAuditEntry('Construction','RA Bill Submitted',contr+' — '+work);
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}
function submitEmployee(e){
  e.preventDefault();
  const emp={code:'EMP-'+String(state.employees.length+1).padStart(3,'0'),name:document.getElementById('ae-name').value,design:document.getElementById('ae-design').value,dept:document.getElementById('ae-dept').value,project:document.getElementById('ae-proj').value,tasks:0,perf:80,status:'Present'};
  MavixAPI.post('/employees', emp).then(({data})=>{
    state.employees.push(normalize(data));
    closeModal('add-emp-modal'); renderEmployees();
    showToast('Employee added: '+emp.name,'success');
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}
function submitFollowup(e){
  e.preventDefault();
  const fu={lead:'LD-NEW',customer:document.getElementById('fu-name').value,phone:'',stage:'Contacted',date:document.getElementById('fu-date').value,type:document.getElementById('fu-type').value,exec:document.getElementById('fu-exec').value,last:new Date().toLocaleDateString('en-IN')};
  MavixAPI.post('/followups', fu).then(({data})=>{
    state.followups.push(normalize(data));
    closeModal('followup-modal'); renderFollowUps();
    showToast('Follow-up scheduled: '+fu.customer,'success');
  }).catch(err=>showToast('Failed: '+err.message,'crit'));
}

// ============================================================
// MODALS
// ============================================================
function openModal(id){ const m=document.getElementById(id); if(m) m.classList.add('open'); }
function closeModal(id){ const m=document.getElementById(id); if(m) m.classList.remove('open'); }
document.addEventListener('click',e=>{ if(e.target.classList.contains('modal-overlay')) closeModal(e.target.id); });

// ============================================================
// NOTIFICATION PANEL
// ============================================================
function toggleNotif(){ document.getElementById('notif-panel').classList.toggle('open'); closeProfileMenu(); }
function closeNotif(){ document.getElementById('notif-panel').classList.remove('open'); }

// ============================================================
// PROFILE MENU
// ============================================================
function toggleProfileMenu(){ document.getElementById('profile-menu').classList.toggle('open'); closeNotif(); }
function closeProfileMenu(){ const pm=document.getElementById('profile-menu'); if(pm) pm.classList.remove('open'); }

// ============================================================
// TOAST
// ============================================================
function showToast(msg,type='info'){
  const wrap=document.getElementById('toast-wrap');
  const t=document.createElement('div');
  t.className='toast '+type;
  const icons={success:'&#10004;&#65039;',warn:'&#9888;&#65039;',crit:'&#10060;',info:'&#8505;&#65039;'};
  t.innerHTML='<span>'+(icons[type]||'&#8505;&#65039;')+'</span><span>'+msg+'</span>';
  wrap.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, 3800);
}

// ============================================================
// GLOBAL SEARCH
// ============================================================
function runSearch(query){
  const res=document.getElementById('search-results');
  if(!query||query.length<2){ res.classList.add('hidden'); return; }
  const q=query.toLowerCase();
  const results=[];
  state.units.filter(u=>(u.unit||'').includes(q)||(u.customer||'').toLowerCase().includes(q)||(u.type||'').toLowerCase().includes(q)).slice(0,3).forEach(u=>results.push({type:'Unit',name:u.id+' &#8212; '+u.type,sub:getProjectName(u.project)+' | '+u.status,fn:()=>{navigateTo('sales');switchInnerTab('sales','units');showUnitDetail(u.id);}}));
  state.leads.filter(l=>(l.name||'').toLowerCase().includes(q)||(l.phone||'').includes(q)).slice(0,3).forEach(l=>results.push({type:'Lead',name:l.name,sub:l.project+' | '+l.stage,fn:()=>{navigateTo('sales');switchInnerTab('sales','leads');}}));
  state.employees.filter(e=>(e.name||'').toLowerCase().includes(q)).slice(0,3).forEach(e=>results.push({type:'Employee',name:e.name,sub:e.design+' | '+e.dept,fn:()=>{navigateTo('org');switchInnerTab('org','employees');}}));
  state.vendors.filter(v=>(v.name||'').toLowerCase().includes(q)).slice(0,2).forEach(v=>results.push({type:'Vendor',name:v.name,sub:v.cat,fn:()=>{navigateTo('company');switchInnerTab('company','vendors');showVendorProfile(v.code);}}));
  state.customers.filter(c=>(c.name||'').toLowerCase().includes(q)).slice(0,2).forEach(c=>results.push({type:'Customer',name:c.name,sub:c.unit+' | &#8377;'+(c.pending/100000).toFixed(2)+'L pending',fn:()=>{navigateTo('sales');switchInnerTab('sales','customers');}}));
  if(!results.length){ res.innerHTML='<div class="search-item"><div style="color:var(--ts);font-size:13px">No results for "'+query+'"</div></div>'; }
  else { res.innerHTML=results.map((r,i)=>`<div class="search-item" onclick="window._sr[${i}].fn();closeSearch()"><div class="si-type">${r.type}</div><div><div class="si-name">${r.name}</div><div class="si-sub">${r.sub}</div></div></div>`).join(''); }
  window._sr=results;
  res.classList.remove('hidden');
}
function closeSearch(){ document.getElementById('search-results').classList.add('hidden'); document.getElementById('global-search').value=''; }
document.addEventListener('click',e=>{ if(!e.target.closest('.hdr-search')) closeSearch(); });

// ============================================================
// PROJECT DETAIL MODAL
// ============================================================
function showProjectDetail(pid){
  const P={'site-a':{name:'Aarohan Grande',loc:'Kharadi, Pune',type:'Premium Residential',towers:4,units:288,booked:214,avail:62,value:'218.60 Cr',cost:'139.40 Cr',collected:'94.25 Cr',physical:68,financial:71,pm:'Rohan Kulkarni',engineer:'Nikhil Patil',manpower:284,completion:'December 2027'},'site-b':{name:'Business Bay',loc:'Baner, Pune',type:'Commercial',towers:2,units:160,booked:103,avail:49,value:'174.80 Cr',cost:'111.25 Cr',collected:'72.40 Cr',physical:52,financial:58,pm:'Sneha Deshmukh',engineer:'Akash Shinde',manpower:196,completion:'June 2028'},'site-c':{name:'Aarohan Serenity',loc:'Wakad, Pune',type:'Mid-Premium Residential',towers:3,units:200,booked:104,avail:85,value:'93.00 Cr',cost:'62.10 Cr',collected:'38.00 Cr',physical:39,financial:43,pm:'Aditya Joshi',engineer:'Pratik More',manpower:143,completion:'March 2029'}};
  const p=P[pid]; if(!p) return;
  showDetailModal('Project: '+p.name,`
    <div class="grid2">
      <div>
        <div class="info-row"><span class="lbl">Location</span><span class="val">${p.loc}</span></div>
        <div class="info-row"><span class="lbl">Type</span><span class="val">${p.type}</span></div>
        <div class="info-row"><span class="lbl">Towers</span><span class="val">${p.towers}</span></div>
        <div class="info-row"><span class="lbl">Total / Booked / Available</span><span class="val">${p.units} / ${p.booked} / ${p.avail}</span></div>
        <div class="info-row"><span class="lbl">Expected Completion</span><span class="val">${p.completion}</span></div>
        <div class="info-row"><span class="lbl">Project Manager</span><span class="val">${p.pm}</span></div>
        <div class="info-row"><span class="lbl">Site Engineer</span><span class="val">${p.engineer}</span></div>
      </div>
      <div>
        <div class="info-row"><span class="lbl">Project Value</span><span class="val">&#8377;${p.value}</span></div>
        <div class="info-row"><span class="lbl">Construction Cost</span><span class="val">&#8377;${p.cost}</span></div>
        <div class="info-row"><span class="lbl">Amount Collected</span><span class="val" style="color:var(--success)">&#8377;${p.collected}</span></div>
        <div class="info-row"><span class="lbl">Physical Progress</span><span class="val">${p.physical}%</span></div>
        <div class="info-row"><span class="lbl">Financial Progress</span><span class="val">${p.financial}%</span></div>
        <div class="info-row"><span class="lbl">Current Manpower</span><span class="val">${p.manpower} workers</span></div>
      </div>
    </div>`);
}
function showDetailModal(title,html){
  document.getElementById('project-modal-title').textContent=title;
  document.getElementById('project-modal-body').innerHTML=html;
  openModal('project-modal');
}

// ============================================================
// REPORTS
// ============================================================
function showReportModal(title){
  document.getElementById('report-modal-title').textContent=title;
  document.getElementById('report-modal-body').innerHTML=`
    <div class="highlight-box mb16">
      <div class="bold">Report: ${title}</div>
      <div class="ts fs12">Generated: ${new Date().toLocaleString('en-IN')} | Company: Aarohan Realty & Infrastructure Ltd.</div>
    </div>
    <div class="grid3 mb16">
      <div class="kpi-card success"><div class="kpi-label">Portfolio Value</div><div class="kpi-value">&#8377;486.40 Cr</div></div>
      <div class="kpi-card"><div class="kpi-label">Amount Collected</div><div class="kpi-value">&#8377;204.65 Cr</div></div>
      <div class="kpi-card success"><div class="kpi-label">Projected Margin</div><div class="kpi-value">&#8377;93.15 Cr</div></div>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Project</th><th>Value</th><th>Collected</th><th>Progress</th><th>Status</th></tr></thead><tbody>
      <tr><td>Aarohan Grande</td><td>&#8377;218.60 Cr</td><td>&#8377;94.25 Cr</td><td>68%</td><td><span class="badge badge-success">On Track</span></td></tr>
      <tr><td>Business Bay</td><td>&#8377;174.80 Cr</td><td>&#8377;72.40 Cr</td><td>52%</td><td><span class="badge badge-warn">Attention</span></td></tr>
      <tr><td>Aarohan Serenity</td><td>&#8377;93.00 Cr</td><td>&#8377;38.00 Cr</td><td>39%</td><td><span class="badge badge-crit">Delayed</span></td></tr>
    </tbody></table></div>`;
  openModal('report-modal');
}
function printReport(){ window.print(); showToast('Print dialog opened','info'); }
function exportReport(){ showToast('Executive report exported to CSV','success'); }
function exportCSV(type){ showToast((type||'Data')+' exported successfully','success'); }

// ============================================================
// AI CHAT — ENQUIRY AGENT
// ============================================================
function sendEnqMsg(msg){
  const input=document.getElementById('enq-input');
  const m=msg||input.value.trim();
  if(!m) return;
  input.value='';
  addChatMsg('enq-messages','user',m);
  setTimeout(()=>addChatMsg('enq-messages','bot',getEnqResponse(m)),700);
}
function addChatMsg(cid,role,text){
  const wrap=document.getElementById(cid); if(!wrap) return;
  const time=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const div=document.createElement('div');
  div.className='ai-msg '+role;
  div.innerHTML='<div class="ai-bubble">'+text+'</div><div class="ai-time">'+time+'</div>';
  wrap.appendChild(div);
  wrap.scrollTop=wrap.scrollHeight;
}
function getEnqResponse(msg){
  const m=msg.toLowerCase();
  const logAILead=(lead)=>{
    MavixAPI.post('/leads', lead).then(({data})=>{ state.leads.push(normalize(data)); renderLeads(); })
      .catch(err=>console.error('AI lead capture failed', err));
  };
  if((m.includes('3 bhk')||m.includes('3bhk'))&&(m.includes('kharadi')||m.includes('grande'))){
    logAILead({code:'LD-AI-'+Date.now(),name:'AI Enquiry',phone:'',email:'',source:'AI Agent',project:'Aarohan Grande',budget:'1.20 Cr',type:'3 BHK',timeline:'Immediate',score:72,exec:'Rahul Sharma',last:new Date().toLocaleDateString('en-IN'),next:new Date(Date.now()+86400000).toLocaleDateString('en-IN'),stage:'New',status:'Active'});
    return 'Excellent! &#127968;<br><br><strong>3 BHK at Aarohan Grande, Kharadi:</strong><br><br>&#128205; Available Units:<br>&#8226; T1-0302: 980 sqft carpet &#8212; &#8377;99.60L<br>&#8226; T2-0102: 980 sqft carpet &#8212; &#8377;98.00L<br><br>&#128176; <strong>Booking Amount: &#8377;5 Lakh</strong><br>&#128197; Possession: December 2027<br>&#9989; RERA Registered | Prime Kharadi Location<br><br>Your enquiry has been logged! A sales executive will call you within 30 minutes.';
  }
  if(m.includes('office')||m.includes('commercial')||m.includes('baner')){
    return '&#127970; <strong>Premium Offices at Business Bay, Baner:</strong><br><br>&#128205; Available Office Units:<br>&#8226; T1-101: 820 sqft &#8212; &#8377;1.25 Cr<br>&#8226; T1-301: 820 sqft &#8212; &#8377;1.29 Cr<br>&#8226; T1-302: 640 sqft &#8212; &#8377;1.06 Cr<br><br>&#127970; Grade A Commercial | RERA Registered<br>&#128197; Possession: June 2028<br><br>Shall I book a site visit for you this week?';
  }
  if((m.includes('investment')||m.includes('under 90')||m.includes('80 lakh')||m.includes('90 lakh'))||((m.includes('2 bhk')||m.includes('2bhk'))&&(m.includes('wakad')||m.includes('serenity')))){
    return '&#128176; <strong>Investment Options at Aarohan Serenity, Wakad:</strong><br><br>&#128205; 2 BHK under &#8377;90L:<br>&#8226; C-T1-101: 625 sqft carpet &#8212; &#8377;62.00L &#9989;<br>&#8226; C-T1-201: 625 sqft carpet &#8212; &#8377;62.80L &#9989;<br>&#8226; C-T2-101: 625 sqft carpet &#8212; &#8377;62.00L &#9989;<br><br>&#128200; Wakad &#8212; High rental yield zone<br>&#128197; Possession: March 2029<br><br>Would you like the payment plan details?';
  }
  if(m.includes('site visit')||m.includes('visit')){
    return '&#128197; <strong>Schedule Your Site Visit!</strong><br><br>Available Slots:<br>&#8226; Tomorrow (23 Jun): 10:30 AM, 2:00 PM, 4:00 PM<br>&#8226; Friday (24 Jun): 11:00 AM, 3:00 PM<br>&#8226; Saturday (25 Jun): 10:00 AM, 12:00 PM<br><br>&#9989; Site visit confirmed! Our team will contact you to confirm the slot.<br>&#128222; Sales Team: 9876-543-200<br><br>Complimentary transport from Pune city centre available.';
  }
  if(m.includes('available')||m.includes('units')){
    return '<strong>&#127968; Available Units &#8212; All Projects:</strong><br><br>&#128994; <strong>Aarohan Grande (Kharadi):</strong> <strong>62 units</strong><br>&#8226; 2 BHK from &#8377;72L | 3 BHK from &#8377;98L<br><br>&#128994; <strong>Business Bay (Baner):</strong> <strong>49 units</strong><br>&#8226; Offices from &#8377;1.00 Cr<br><br>&#128994; <strong>Aarohan Serenity (Wakad):</strong> <strong>85 units</strong><br>&#8226; 2 BHK from &#8377;62L | 3 BHK from &#8377;82L<br><br>Which project interests you? I can provide detailed unit layouts!';
  }
  logAILead({code:'LD-AI-'+Date.now(),name:'New AI Enquiry',phone:'',email:'',source:'AI Agent',project:'Any',budget:'TBD',type:'TBD',timeline:'TBD',score:60,exec:'Rahul Sharma',last:new Date().toLocaleDateString('en-IN'),next:new Date(Date.now()+86400000).toLocaleDateString('en-IN'),stage:'New',status:'Active'});
  return 'Hello! &#128075; I am the <strong>MAVIX AI Real Estate Assistant</strong>.<br><br>I can help you with:<br>&#8226; 2 BHK / 3 BHK in Kharadi (from &#8377;72L)<br>&#8226; Premium offices in Baner (from &#8377;1 Cr)<br>&#8226; Investment properties in Wakad (from &#8377;62L)<br><br>&#9989; Your enquiry is logged! A sales executive will contact you in 30 minutes.<br><br>What type of property are you looking for?';
}

// ============================================================
// AI CHAT — EXECUTIVE ASSISTANT
// ============================================================
function sendExecMsg(msg){
  const input=document.getElementById('exec-input');
  const m=msg||input.value.trim();
  if(!m) return;
  input.value='';
  addChatMsg('exec-messages','user',m);
  setTimeout(()=>addChatMsg('exec-messages','bot',getExecResponse(m)),800);
}
function getExecResponse(q){
  const m=q.toLowerCase();
  if(m.includes('summary')||m.includes('today')){
    return '<strong>&#128202; Business Summary &#8212; '+new Date().toLocaleDateString('en-IN')+'</strong><br><br>&#128176; <strong>Finance:</strong> Inflow &#8377;18.74 Cr | Outflow &#8377;14.28 Cr | Net &#8377;4.46 Cr<br>&#127959; <strong>Construction:</strong> Site A 68% &#9989; | Site B 52% &#9888; | Site C 39% &#128308;<br>&#128222; <strong>Sales:</strong> 68 enquiries | 24 bookings | &#8377;18.65 Cr this month<br>&#9888; <strong>Alerts:</strong> 3 AI anomalies | '+state.approvals.filter(a=>a.status==='pending').length+' pending approvals<br>&#128101; <strong>Team:</strong> 171/186 present | 23 overdue tasks<br><br>&#128308; <strong>Priority:</strong> RERA compliance verification + Site C labour shortage';
  }
  if(m.includes('delay')||m.includes('delayed')){
    return '<strong>&#128308; Delayed Projects:</strong><br><br>1. <strong>Site C &#8212; Aarohan Serenity</strong> (Critical)<br>   Physical: 39% vs planned 45% | 12-day RCC delay risk<br>   Root cause: Labour shortage (143 vs 180 required)<br>   Impact: &#8377;1.20 Cr cost escalation<br><br>2. <strong>Site B &#8212; Business Bay</strong> (Attention Required)<br>   Physical: 52% vs planned 58.2% &#8212; 6.2% behind<br>   Electrical overrun: &#8377;24.60L above budget<br><br>&#127919; Recommend: Emergency labour mobilisation for Site C immediately';
  }
  if(m.includes('budget')||m.includes('overrun')){
    return '<strong>&#128202; Budget Performance:</strong><br><br>&#9989; <strong>Site A:</strong> Under budget by &#8377;3.65 Cr (CPI: 1.03)<br>&#9888; <strong>Site B:</strong> Overrun risk &#8377;2.85 Cr (CPI: 0.97)<br>   Electrical: &#8377;24.60L over budget &#8212; Budget revision pending<br>&#9888; <strong>Site C:</strong> Overrun risk &#8377;1.75 Cr (CPI: 0.97)<br><br>&#128161; Action: Approve Site B budget revision or identify savings elsewhere';
  }
  if(m.includes('due')||m.includes('collection')||m.includes('collect')){
    return '<strong>&#128176; Highest Pending Customer Dues:</strong><br><br>1. Snehal Rao &#8212; &#8377;29.64L &#8212; 92 days &#128308;<br>2. Kamla Desai &#8212; &#8377;25.30L &#8212; 62 days &#128308;<br>3. Suresh Pillai &#8212; &#8377;15.50L &#8212; 55 days &#9888;<br>4. Amit Patil &#8212; &#8377;18.40L &#8212; 45 days &#9888;<br>5. TechSpace Pvt Ltd &#8212; &#8377;15.88L &#8212; 38 days &#9888;<br><br>Total overdue >30 days: &#8377;24.80 Cr<br>&#9876; Recommend: Legal notice for 90+ day defaulters';
  }
  if(m.includes('material')||m.includes('stock')||m.includes('low')){
    return '<strong>&#128230; Material Shortage Alerts:</strong><br><br>&#128308; <strong>Critical:</strong><br>&#8226; OPC 53 Cement: 380 bags (min: 400) &#8212; Site A<br>&#8226; Waterproofing Chemical: 40 litres (min: 200) &#8212; Site C<br><br>&#9888; <strong>Low Stock:</strong><br>&#8226; TMT Steel Fe500D: 29 MT (min: 35) &#8212; Site B &#8212; 6 days remaining<br><br>PO-2026-0284 from Tata Steel due 25 Jun. Risk of 1-2 day gap.';
  }
  if(m.includes('approval')){
    const pending=state.approvals.filter(a=>a.status==='pending');
    return '<strong>&#9989; Pending Approvals ('+pending.length+' items):</strong><br><br>'+pending.slice(0,5).map((a,i)=>(i+1)+'. <strong>'+a.type+'</strong> &#8212; &#8377;'+a.amount+'<br>   '+a.desc).join('<br><br>')+'<br><br>&#9889; Click Approvals tab to action these.';
  }
  if(m.includes('unusual')||m.includes('anomal')||m.includes('fraud')){
    return '<strong>&#128680; AI Finance Anomalies:</strong><br><br>1. <strong>Duplicate Invoice</strong> &#8212; BM-4587 vs BM-4522<br>   BuildMax &#8212; &#8377;18.75L &#8212; Payment HELD<br><br>2. <strong>Vendor Bank Change</strong> &#8212; Elevate Systems<br>   Changed 2 days before &#8377;15L payment &#8212; HIGH RISK<br><br>3. <strong>Split Payments</strong> &#8212; Urban Landscape<br>   3 payments under &#8377;10L limit in 48hrs = &#8377;28.8L total<br><br>4. <strong>Unusual Expense</strong> &#8212; Site C Legal<br>   &#8377;12.50L vs avg &#8377;3.68L &#8212; 240% above average';
  }
  if(m.includes('site a')||m.includes('grande')){
    return '<strong>&#127959; Site A &#8212; Aarohan Grande Status:</strong><br><br>Physical Progress: <strong>68%</strong> | Financial: <strong>71%</strong><br>Stage: Superstructure &amp; MEP<br>&#128101; 284 workers | 18 contractors<br>&#128176; Expenditure: &#8377;76.15 Cr / &#8377;139.40 Cr budget<br>&#127968; 214/288 booked | 62 available<br>&#128181; Collected: &#8377;94.25 Cr | Pending: &#8377;48.80 Cr<br>&#128197; Completion: December 2027 &#8212; <strong>On Track &#9989;</strong>';
  }
  if(m.includes('attention')||m.includes('requires')||m.includes('priority')){
    return '<strong>&#127919; Priority Actions Required Now:</strong><br><br>&#128308; <strong>Critical:</strong><br>&#8226; Approve RERA compliance &#8212; Site A &#8377;4.85 Cr<br>&#8226; Site C labour mobilisation &#8212; 37 additional workers<br>&#8226; Verify Elevate Systems bank change before &#8377;15L payment<br><br>&#9888; <strong>Important:</strong><br>&#8226; Review Site B electrical budget revision &#8377;24.60L<br>&#8226; Follow up top 5 overdue customers &#8212; &#8377;24.80 Cr total<br>&#8226; '+state.approvals.filter(a=>a.status==='pending').length+' approvals pending action';
  }
  return 'I can answer questions about your business. Try asking:<br><br>&#8226; "Today\'s company summary"<br>&#8226; "Which project is delayed?"<br>&#8226; "Highest pending customer dues"<br>&#8226; "Budget overrun risk"<br>&#8226; "Low stock materials"<br>&#8226; "Pending approvals"<br>&#8226; "Unusual transactions"<br>&#8226; "Site A status"';
}

// ============================================================
// REFRESH
// ============================================================
function resetDemoData(){
  showToast('Refreshing data from server...','info');
  loadState().then(()=>{ initApp(); showToast('Data refreshed','success'); })
    .catch(err=>showToast('Refresh failed: '+err.message,'crit'));
}

// ============================================================
// CHARTS
// ============================================================
const CI={};
function dc(id){ if(CI[id]){ try{CI[id].destroy();}catch(e){} delete CI[id]; } }
function mc(id,type,data,opts){
  const canvas=document.getElementById(id); if(!canvas) return;
  dc(id);
  const baseOpts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='pie'||type==='doughnut',position:'bottom',labels:{font:{size:11},boxWidth:12}}},scales:(type==='bar'||type==='line')?{y:{beginAtZero:true,grid:{color:'#F0F4F7'},ticks:{font:{size:10}}},x:{grid:{display:false},ticks:{font:{size:10}}}}:{}};
  const merged=Object.assign({},baseOpts,opts||{});
  CI[id]=new Chart(canvas.getContext('2d'),{type,data,options:merged});
}

function initCommandCharts(){
  if(typeof Chart==='undefined') return;
  mc('chart-cashflow','bar',{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Inflow (Cr)',data:[14.2,15.8,16.4,17.2,16.8,18.74],backgroundColor:'rgba(21,128,93,.75)',borderRadius:4},{label:'Outflow (Cr)',data:[11.4,12.8,13.2,14.0,13.6,14.28],backgroundColor:'rgba(200,74,74,.65)',borderRadius:4}]});
  mc('chart-bookings','line',{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Bookings (Units)',data:[18,22,28,19,26,24],borderColor:'#1F6F9F',backgroundColor:'rgba(31,111,159,.1)',tension:.4,fill:true,pointRadius:4},{label:'Value (Cr)',data:[14.8,17.6,21.4,15.2,20.4,18.65],borderColor:'#15805D',backgroundColor:'rgba(21,128,93,.1)',tension:.4,fill:true,pointRadius:4}]});
  mc('chart-cost','bar',{labels:['Site A','Site B','Site C'],datasets:[{label:'Budget',data:[139.40,111.25,62.10],backgroundColor:'rgba(31,111,159,.5)',borderRadius:4},{label:'Actual Cost',data:[76.15,56.90,31.45],backgroundColor:'rgba(21,128,93,.8)',borderRadius:4},{label:'Committed',data:[112.80,86.20,44.60],backgroundColor:'rgba(216,148,20,.6)',borderRadius:4}]});
  mc('chart-progress','bar',{labels:['Site A','Site B','Site C'],datasets:[{label:'Physical %',data:[68,52,39],backgroundColor:'rgba(21,128,93,.8)',borderRadius:4},{label:'Financial %',data:[71,58,43],backgroundColor:'rgba(31,111,159,.6)',borderRadius:4}]});
  mc('chart-ageing','doughnut',{labels:['Not Due','1-30 Days','31-60 Days','61-90 Days','>90 Days'],datasets:[{data:[54.20,24.40,18.35,12.20,8.00],backgroundColor:['#15805D','#D89414','#E8831A','#C84A4A','#8B1A1A'],borderWidth:2}]});
  ['sp1','sp2','sp3','sp4','sp5','sp6','sp7','sp8'].forEach((id,i)=>{
    const canvas=document.getElementById(id); if(!canvas) return;
    const base=[40+i*5,45+i*4,50+i*3,55+i*4,60+i*3,65+i*4];
    const ctx=canvas.getContext('2d');
    new Chart(ctx,{type:'line',data:{labels:['','','','','',''],datasets:[{data:base,borderColor:'#1F6F9F',borderWidth:1.5,pointRadius:0,tension:.4,fill:false}]},options:{responsive:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});
  });
}

function initCFCharts(){
  if(typeof Chart==='undefined') return;
  mc('chart-cf-flow','line',{labels:['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Inflow',data:[10.2,11.8,12.4,13.8,14.2,15.6,14.8,16.2,15.4,17.2,16.8,18.74],borderColor:'#15805D',backgroundColor:'rgba(21,128,93,.1)',tension:.4,fill:true},{label:'Outflow',data:[8.4,9.2,10.4,11.8,12.2,13.0,11.6,12.8,12.4,14.0,13.6,14.28],borderColor:'#C84A4A',backgroundColor:'rgba(200,74,74,.1)',tension:.4,fill:true}]});
  mc('chart-cf-exp','doughnut',{labels:['Construction','Ops','Salary','Marketing','Finance','Admin'],datasets:[{data:[164.50,5.20,16.56,2.42,3.28,1.16],backgroundColor:['#123B5D','#1F6F9F','#2678B8','#15805D','#D89414','#C84A4A'],borderWidth:2}]});
  mc('chart-forecast','line',{labels:['22Jun','29Jun','6Jul','13Jul','20Jul','27Jul','3Aug'],datasets:[{label:'Expected Inflow',data:[0,8.40,6.20,9.80,7.60,8.20,10.40],borderColor:'#15805D',backgroundColor:'rgba(21,128,93,.1)',tension:.4,fill:true},{label:'Committed Outflow',data:[0,4.20,3.80,6.40,4.80,3.60,5.20],borderColor:'#C84A4A',backgroundColor:'rgba(200,74,74,.1)',tension:.4,fill:true}]});
  mc('chart-profit','bar',{labels:['Aarohan Grande','Business Bay','Aarohan Serenity'],datasets:[{label:'Sales Value',data:[218.60,174.80,93.00],backgroundColor:'rgba(31,111,159,.8)',borderRadius:4},{label:'Total Cost',data:[142.60,116.50,65.11],backgroundColor:'rgba(200,74,74,.6)',borderRadius:4},{label:'Gross Margin',data:[76.00,58.30,27.89],backgroundColor:'rgba(21,128,93,.8)',borderRadius:4}]});
  mc('chart-pl','bar',{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Revenue',data:[12.4,13.8,14.2,15.6,16.2,17.4],backgroundColor:'rgba(21,128,93,.8)',borderRadius:3},{label:'Expenses',data:[9.8,10.4,11.2,12.4,13.0,13.8],backgroundColor:'rgba(200,74,74,.6)',borderRadius:3}]});
}

function initCOFCharts(){
  if(typeof Chart==='undefined') return;
  mc('chart-bva','bar',{labels:['Civil','Masonry','Electrical','Plumbing','Fire','Flooring','Paint','Aluminium','External'],datasets:[{label:'Budget',data:[4200,840,650,420,280,380,180,560,320],backgroundColor:'rgba(31,111,159,.5)',borderRadius:4},{label:'Committed',data:[3840,720,750,380,260,280,80,520,120],backgroundColor:'rgba(216,148,20,.6)',borderRadius:4},{label:'Actual',data:[2850,480,480,240,160,120,20,280,40],backgroundColor:'rgba(21,128,93,.8)',borderRadius:4}]});
  mc('chart-cpi','line',{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Site A CPI',data:[1.02,1.01,1.02,1.03,1.02,1.03],borderColor:'#15805D',tension:.4,pointRadius:4},{label:'Site B CPI',data:[1.00,0.99,0.98,0.97,0.97,0.97],borderColor:'#D89414',tension:.4,pointRadius:4},{label:'Site C CPI',data:[1.01,1.00,0.99,0.98,0.97,0.97],borderColor:'#C84A4A',tension:.4,pointRadius:4}]},{plugins:{legend:{display:true}}});
}

function initOrgCharts(){
  if(typeof Chart==='undefined') return;
  mc('chart-attendance','line',{labels:['01','05','10','15','20','22'],datasets:[{label:'Present',data:[178,174,170,175,172,171],borderColor:'#15805D',fill:true,backgroundColor:'rgba(21,128,93,.1)',tension:.4},{label:'Leave/Absent',data:[8,12,16,11,14,15],borderColor:'#C84A4A',fill:true,backgroundColor:'rgba(200,74,74,.1)',tension:.4}]});
  mc('chart-dept-perf','bar',{labels:['Finance','Design','HR','Mgmt','Legal','Safety','PM','MEP','Sales','Procurement','QC','IT'],datasets:[{label:'Score',data:[94,92,92,97,91,90,90,86,89,89,88,88],backgroundColor:'rgba(31,111,159,.8)',borderRadius:4}]},{indexAxis:'y'});
  mc('chart-emp-perf','doughnut',{labels:['90-100 Excellent','80-89 Good','70-79 Average','<70 Needs Work'],datasets:[{data:[8,18,7,2],backgroundColor:['#15805D','#1F6F9F','#D89414','#C84A4A'],borderWidth:2}]});
}

function initSalesCharts(){
  if(typeof Chart==='undefined') return;
  mc('chart-sales-bar','bar',{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[{label:'Site A',data:[8,12,14,6,10,11],backgroundColor:'rgba(31,111,159,.8)',borderRadius:4},{label:'Site B',data:[5,6,8,8,10,8],backgroundColor:'rgba(21,128,93,.6)',borderRadius:4},{label:'Site C',data:[5,4,6,5,6,5],backgroundColor:'rgba(216,148,20,.6)',borderRadius:4}]});
  mc('chart-lead-src','doughnut',{labels:['Google Ads','Meta Ads','Referral','Channel Partner','Walk-In','Website','AI Agent'],datasets:[{data:[22,18,15,14,12,10,9],backgroundColor:['#123B5D','#1F6F9F','#15805D','#2678B8','#D89414','#C84A4A','#8B5CF6'],borderWidth:2}]});
}

function initProgressCharts(){
  if(typeof Chart==='undefined') return;
  mc('chart-progress-bar','bar',{labels:['Excavation','Foundation','RCC','Masonry','Plastering','MEP','Flooring','Facade'],datasets:[{label:'Planned %',data:[100,100,72,60,45,40,20,10],backgroundColor:'rgba(31,111,159,.4)',borderRadius:4},{label:'Actual %',data:[100,100,68,52,38,32,12,5],backgroundColor:'rgba(21,128,93,.8)',borderRadius:4}]});
  mc('chart-site-exp','doughnut',{labels:['Structural','MEP','Labour','Material','Site Estb','Admin'],datasets:[{data:[28.40,18.60,12.40,10.20,4.80,1.75],backgroundColor:['#123B5D','#1F6F9F','#15805D','#2678B8','#D89414','#C84A4A'],borderWidth:2}]});
}

function initChartsForPage(page){
  if(typeof Chart==='undefined') return;
  if(page==='command') initCommandCharts();
  if(page==='org'||page.includes('org')) initOrgCharts();
  if(page==='sales'||page.includes('sales')) initSalesCharts();
  if(page==='construction'||page.includes('constr')) initProgressCharts();
}

// ============================================================
// FILTER TABLES (client-side search)
// ============================================================
function filterTable(tableId, query){
  const table=document.getElementById(tableId); if(!table) return;
  const q=query.toLowerCase();
  table.querySelectorAll('tbody tr').forEach(row=>{
    row.style.display=row.textContent.toLowerCase().includes(q)?'':'none';
  });
}

// ============================================================
// APP INIT
// ============================================================
function initApp(){
  // header user info
  const u=state.user;
  const av=u.name.charAt(0).toUpperCase();
  ['hdr-avatar','pm-avatar'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=av; });
  const un=document.getElementById('hdr-user-name'); if(un) un.textContent=u.name;
  const ur=document.getElementById('hdr-user-role'); if(ur) ur.textContent=u.role;
  const pmn=document.getElementById('pm-name'); if(pmn) pmn.textContent=u.name;
  const pmr=document.getElementById('pm-role'); if(pmr) pmr.textContent=u.role;
  // init date
  document.getElementById('dpr-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('txn-date').value=new Date().toISOString().split('T')[0];
  // render all data
  renderApprovals();
  renderVendors();
  renderEmployees();
  renderLeads();
  renderFollowUps();
  renderCustomers();
  renderDues();
  renderCollections();
  renderTransactions();
  renderDPR();
  renderBOQ();
  renderMaterials();
  renderProgress();
  renderIssues();
  renderDeptCards();
  renderTasks();
  renderNotifications();
  renderAudit();
  renderBookings();
  renderCollectionAgent();
  renderAILog();
  renderUnitGrid();
  // load units for booking form
  loadProjectUnits();
  // clock
  updateClock();
  setInterval(updateClock, 1000);
  // charts
  setTimeout(initCommandCharts, 200);
  // greeting
  addChatMsg('enq-messages','bot','Hello! I am the <strong>MAVIX AI Enquiry Agent</strong>.<br>I can help you find the perfect property at Aarohan Realty projects.<br><br>Try one of the quick questions below, or type your enquiry!');
  addChatMsg('exec-messages','bot','Good day! I am your <strong>MAVIX AI Executive Assistant</strong>.<br>I have access to all your business data.<br><br>Ask me anything about your projects, finances, sales, or operations!');
}

// ============================================================
// STARTUP
// ============================================================
window.addEventListener('DOMContentLoaded', async ()=>{
  document.getElementById('loader').classList.add('gone');
  if(MavixAPI.isAuthenticated()){
    try{
      await loadState();
      document.getElementById('login-page').style.display='none';
      document.getElementById('main-app').style.display='flex';
      initApp();
    }catch(e){
      // token invalid/expired — fall back to login screen
      document.getElementById('login-page').style.display='flex';
    }
  }
});

// Extra utility functions
function openAIChat(){ navigateTo('ai'); switchInnerTab('ai','assistant'); }
function filterEmpByDept(dept){ renderEmployees(dept||''); }
function filterTable(id, q){
  const t=document.getElementById(id); if(!t) return;
  t.querySelectorAll('tbody tr').forEach(r=>{
    r.style.display=r.textContent.toLowerCase().includes(q.toLowerCase())?'':'none';
  });
}

