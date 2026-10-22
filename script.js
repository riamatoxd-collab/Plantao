/* Plantão+ v1.2 — offline-first; sincronização autenticada opcional via Supabase */
'use strict';
const STORAGE_KEY = 'plantao_plus_versao_1'; // preserva cadastros e plantões anteriores
const STATIONS = [
  'Chapa','Linha / Montagem','McFritas','Produtos fritos','Balcão',
  'Drive-thru','Bebidas e sobremesas','Salão','Delivery','LOPE','Gerência','Apoio'
];
const PHASES = ['Pré-plantão','Durante o plantão','Pós-plantão'];
const PRESENCE_STATES = [
  {id:'disponivel',name:'Disponível'},
  {id:'em_atividade',name:'Em atividade'},
  {id:'em_break',name:'Em break'},
  {id:'ja_brekou',name:'Já brekou'},
  {id:'faltou',name:'Faltou'},
  {id:'folga',name:'Folga'}
];
const PRESENCE_NAMES = Object.fromEntries(PRESENCE_STATES.map(item => [item.id,item.name]));
const SUMMARY_STATES = ['em_atividade','em_break','ja_brekou','faltou','folga','disponivel'];
const TASK_TEMPLATE = [
  ['Pré-plantão','Conferir presenças e atrasos da equipe'],
  ['Pré-plantão','Distribuir colaboradores por estação'],
  ['Pré-plantão','Verificar equipamentos e condições de segurança'],
  ['Pré-plantão','Conferir estoque e itens críticos'],
  ['Durante o plantão','Acompanhar fluxo e desempenho das estações'],
  ['Durante o plantão','Verificar qualidade, organização e limpeza'],
  ['Durante o plantão','Monitorar pausas e remanejamentos'],
  ['Durante o plantão','Registrar ocorrências e imprevistos'],
  ['Pós-plantão','Conferir organização e limpeza final'],
  ['Pós-plantão','Registrar pendências para o próximo turno'],
  ['Pós-plantão','Fazer a passagem de plantão']
];
const TITLES = {
  dashboard:['Visão geral','Acompanhe tudo o que acontece na operação.'],
  escala:['Escala e posições','Posicione a equipe e organize as estações do plantão.'],
  equipe:['Colaboradores','Mantenha o cadastro da equipe organizado.'],
  checklist:['Checklist','Acompanhe as tarefas do início ao fim do plantão.'],
  passagem:['Passagem de plantão','Documente ocorrências e repasse informações importantes.'],
  relatorios:['Relatórios','Consulte o histórico e exporte os dados da operação.'],
  conexao:['Gerentes online','Conecte sua equipe para compartilhar o mesmo plantão com segurança.']
};
const PATHS = {
  layout:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  'check-square':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',
  repeat:'<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  chart:'<path d="M3 3v18h18M8 16v-4M13 16V8M18 16V5"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  moon:'<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  'arrow-right':'<path d="M5 12h14m-7-7 7 7-7 7"/>',
  'arrow-up-right':'<path d="M7 17 17 7M7 7h10v10"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  clipboard:'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M9 12h6M9 16h4"/>',
  alert:'<path d="m10.3 3.8-8.1 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.8-3.2l-8.1-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
  trash:'<path d="M3 6h18m-2 0-1 15H6L5 6m4 0V4h6v2m-5 4v7m4-7v7"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z M22 2 11 13"/>',
  save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM7 3v6h9V3M7 21v-8h10v8"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  coffee:'<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 1h2a3 3 0 0 1 0 6h-2M8 3v2m5-2v2"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>',
  cloud:'<path d="M20 17a4 4 0 0 0-1.2-7.8 6 6 0 0 0-11.6 1A3.5 3.5 0 0 0 8 17h12"/>',
  move:'<path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4m1-8 4 4-4 4"/>'
};
const $ = id => document.getElementById(id);
function icon(name){return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.layout}</svg>`;}
function esc(value){return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function uid(){return (typeof crypto!=='undefined' && crypto.randomUUID)?crypto.randomUUID():`id_${Date.now()}_${Math.random().toString(16).slice(2)}`;}
function localDay(dt=new Date()){return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;}
function addDays(delta){const d=new Date();d.setDate(d.getDate()+delta);return localDay(d);}
function humanDate(str,options={day:'2-digit',month:'short',year:'numeric'}){if(!str)return '—';const d=new Date(`${str}T12:00:00`);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('pt-BR',options).format(d);}
function dateTime(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
function timeOf(value){if(!value)return '—';return new Date(value).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function makeTasks(){return TASK_TEMPLATE.map(([phase,title])=>({id:uid(),phase,title,done:false,custom:false}));}
function seedState(){
 const names=[['Mariana Oliveira','Gerente'],['Ana Costa','Atendente'],['Bruno Lima','Atendente'],['Carla Ferreira','Treinadora'],['Diego Nunes','Atendente'],['Elisa Rocha','Líder de turno'],['Felipe Martins','Atendente'],['Gabriela Souza','Atendente'],['Henrique Alves','Atendente'],['Juliana Melo','Atendente']];
 const employees=names.map(([name,role])=>({id:uid(),name,role,active:true,skills:[]}));
 employees.find(e=>e.name==='Ana Costa').skills=['Balcão','Drive-thru','Salão'];
 employees.find(e=>e.name==='Carla Ferreira').skills=['Linha / Montagem','Chapa','McFritas'];
 employees.find(e=>e.name==='Diego Nunes').skills=['McFritas','Produtos fritos'];
 employees.find(e=>e.name==='Gabriela Souza').skills=['Chapa','Balcão'];
 const today={id:uid(),date:localDay(),period:'Intermediário',start:'10:00',end:'18:00',manager:'Mariana Oliveira',status:'em_andamento',createdAt:new Date().toISOString(),startedAt:new Date().toISOString(),tasks:makeTasks(),notes:'Reforçar o acompanhamento da equipe no horário de pico. Conferir os itens de reposição antes da troca de turno.'};
 today.tasks.slice(0,3).forEach(t=>t.done=true);
 const yesterday={id:uid(),date:addDays(-1),period:'Fechamento',start:'16:00',end:'00:00',manager:'Mariana Oliveira',status:'encerrado',createdAt:new Date(Date.now()-86400000).toISOString(),closedAt:new Date(Date.now()-86400000+28800000).toISOString(),tasks:makeTasks().map(t=>({...t,done:true})),notes:'Turno encerrado sem pendências críticas.'};
 const tomorrow={id:uid(),date:addDays(1),period:'Abertura',start:'06:00',end:'14:00',manager:'Elisa Rocha',status:'planejado',createdAt:new Date().toISOString(),tasks:makeTasks(),notes:''};
 const assignments=[['Ana Costa','Balcão'],['Bruno Lima','Chapa'],['Carla Ferreira','Linha / Montagem'],['Diego Nunes','McFritas'],['Elisa Rocha','Gerência'],['Felipe Martins','Drive-thru']].map(([name,station])=>({id:uid(),shiftId:today.id,employeeId:employees.find(e=>e.name===name).id,station}));
 return {version:3,breaks:[],demo:true,theme:'light',page:'dashboard',currentShiftId:today.id,employees,shifts:[today,yesterday,tomorrow],assignments,attendance:[{id:uid(),shiftId:today.id,employeeId:employees.find(e=>e.name==='Bruno Lima').id,status:'ja_brekou',updatedAt:new Date().toISOString()},{id:uid(),shiftId:today.id,employeeId:employees.find(e=>e.name==='Gabriela Souza').id,status:'em_break',updatedAt:new Date().toISOString()},{id:uid(),shiftId:today.id,employeeId:employees.find(e=>e.name==='Henrique Alves').id,status:'folga',updatedAt:new Date().toISOString()},{id:uid(),shiftId:today.id,employeeId:employees.find(e=>e.name==='Juliana Melo').id,status:'faltou',updatedAt:new Date().toISOString()}],events:[{id:uid(),shiftId:today.id,type:'Operação',text:'Conferência inicial de equipamentos concluída. Acompanhar reposição no horário de maior movimento.',createdAt:new Date().toISOString()}]};
}
function loadState(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(data&&Array.isArray(data.shifts)&&Array.isArray(data.employees)&&Array.isArray(data.assignments)&&Array.isArray(data.events)){data.attendance=Array.isArray(data.attendance)?data.attendance:[];data.breaks=Array.isArray(data.breaks)?data.breaks:[];data.employees.forEach(e=>{if(!Array.isArray(e.skills))e.skills=[];});return data;}}catch(err){console.warn('Falha ao carregar os dados locais.',err);}return seedState();}
let state=loadState();
let selectedPage=TITLES[state.page]?state.page:'dashboard';
let toastTimeout;
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(err){toast('Sem espaço no armazenamento local; faça um backup.');console.error(err);}}
function changed(){state.demo=false;persist();renderAll();window.PlantaoSync?.onLocalChange?.();}
function getShift(){return state.shifts.find(s=>s.id===state.currentShiftId)||state.shifts[0]||null;}
function shiftAssignments(shift=getShift()){return shift?state.assignments.filter(a=>a.shiftId===shift.id):[];}
function shiftEvents(shift=getShift()){return shift?state.events.filter(e=>e.shiftId===shift.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)):[];}
function getEmployee(id){return state.employees.find(e=>e.id===id);}
function presenceFor(shift,employeeId){
 if(!shift)return 'disponivel';
 const found=(state.attendance||[]).find(item=>item.shiftId===shift.id&&item.employeeId===employeeId);
 if(found&&PRESENCE_NAMES[found.status])return found.status;
 return shiftAssignments(shift).some(a=>a.employeeId===employeeId)?'em_atividade':'disponivel';
}
function presenceName(status){return PRESENCE_NAMES[status]||'Disponível';}
function presenceBadge(status){return `<span class="presence-badge presence-${esc(status)}"><span class="presence-badge-dot"></span>${esc(presenceName(status))}</span>`;}
function attendanceCounts(shift){
 const tally=Object.fromEntries(SUMMARY_STATES.map(id=>[id,0]));
 state.employees.filter(e=>e.active).forEach(e=>{const current=presenceFor(shift,e.id);tally[current]=(tally[current]||0)+1;});
 return tally;
}
function statusSummaryHtml(shift){
 const counts=attendanceCounts(shift);
 return SUMMARY_STATES.map(id=>`<div class="attendance-stat presence-${id}"><strong>${counts[id]||0}</strong><span>${esc(presenceName(id))}</span></div>`).join('');
}
function changePresenceSilently(s,employeeId,status){
 state.attendance=state.attendance||[];
 const record=state.attendance.find(item=>item.shiftId===s.id&&item.employeeId===employeeId);
 if(record){record.status=status;record.updatedAt=new Date().toISOString();}
 else state.attendance.push({id:uid(),shiftId:s.id,employeeId,status,updatedAt:new Date().toISOString()});
}
function changePresence(employeeId,status){
 const shift=getShift(),employee=getEmployee(employeeId);
 if(!shift||shift.status==='encerrado')return toast('Este plantão está encerrado.');
 if(!employee?.active||!PRESENCE_NAMES[status])return toast('Situação inválida.');
 const before=presenceFor(shift,employeeId),assignment=shiftAssignments(shift).find(a=>a.employeeId===employeeId);
 if(before===status){if(status==='em_break'&&!activeBreak(shift,employeeId))return startUntrackedBreak(employeeId);return;}
 if(status==='em_break'){
   if(before==='faltou'||before==='folga')return toast('Altere o status de ausência antes de iniciar o break.');
   const planned=Number(state.defaultBreakMinutes)||60;
   (state.breaks||(state.breaks=[])).push({id:uid(),shiftId:shift.id,employeeId,startAt:new Date().toISOString(),endAt:null,plannedMinutes:planned,station:assignment?.station||''});
   state.assignments=state.assignments.filter(a=>!(a.shiftId===shift.id&&a.employeeId===employeeId));
 } else if(before==='em_break'){
   const open=activeBreak(shift,employeeId);
   if(open)open.endAt=new Date().toISOString();
 }
 if(['faltou','folga','disponivel'].includes(status))state.assignments=state.assignments.filter(a=>!(a.shiftId===shift.id&&a.employeeId===employeeId));
 // Status alterado sem preencher a escala: impede pessoa aparecer posicionada indevidamente.
 changePresenceSilently(shift,employeeId,status);
 changed();toast(`${employee.name}: ${presenceName(status)}.`);
}
function renderAttendance(){
 const shift=getShift(),closed=shift.status==='encerrado',as=shiftAssignments(shift);
 $('attendanceSummary').innerHTML=statusSummaryHtml(shift);
 $('dashAttendanceSummary').innerHTML=statusSummaryHtml(shift);
 const active=state.employees.filter(e=>e.active).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 $('attendanceRoster').innerHTML=active.length?active.map(e=>{
   const status=presenceFor(shift,e.id),position=as.find(a=>a.employeeId===e.id),br=activeBreak(shift,e.id);
   const session=br?`<span class="break-clock" data-break-clock="${esc(br.id)}">${esc(breakClock(br))}</span>`:'';
   const breakButtons=!closed?(status==='em_break'?`${!br?`<button class="tiny-action" data-restart-break="${esc(e.id)}">Iniciar relógio agora</button>`:''}<button class="tiny-action action-yellow" data-end-break="${esc(e.id)}">✓ Finalizar break</button>`:!['faltou','folga'].includes(status)?`<button class="tiny-action" data-start-break="${esc(e.id)}">☕ Iniciar break</button>`:''):'';
   return `<div class="attendance-person"><span class="avatar-mini">${esc(initials(e.name))}</span><div class="attendance-person-info"><strong>${esc(e.name)}</strong><small>${esc(position?.station||e.role)}</small>${session}</div><div class="attendance-actions">${presenceBadge(status)}${breakButtons}</div><label class="attendance-select-label"><span class="sr-only">Situação de ${esc(e.name)}</span><select class="attendance-select" data-presence-employee="${esc(e.id)}" aria-label="Situação de ${esc(e.name)}" ${closed?'disabled':''}>${PRESENCE_STATES.map(o=>`<option value="${o.id}" ${status===o.id?'selected':''}>${esc(o.name)}</option>`).join('')}</select></label></div>`;
 }).join(''):'<div class="small-empty">Não há colaboradores ativos cadastrados.</div>';
}
// Histórico de pausas com horários persistidos (inclusive ao fechar o navegador).
function activeBreak(shift,employeeId){return (state.breaks||[]).filter(b=>b.shiftId===shift.id&&b.employeeId===employeeId&&!b.endAt).at(-1)||null;}
function lastBreak(shift,employeeId){return (state.breaks||[]).filter(b=>b.shiftId===shift.id&&b.employeeId===employeeId).at(-1)||null;}
function breakElapsedMinutes(br){return Math.max(0,Math.floor((new Date(br.endAt||Date.now())-new Date(br.startAt))/60000));}
function breakClock(br){const minutes=breakElapsedMinutes(br),limit=Number(br.plannedMinutes)||60;return `${minutes} min ${br.endAt?'concluídos':`decorridos · ${Math.max(0,limit-minutes)} min restantes`}${!br.endAt&&minutes>limit?' · ATRASADO':''}`;}
function breakClockRefresh(){document.querySelectorAll('[data-break-clock]').forEach(el=>{const br=(state.breaks||[]).find(b=>b.id===el.dataset.breakClock);if(!br)return;el.textContent=breakClock(br);el.classList.toggle('break-overdue',!br.endAt&&breakElapsedMinutes(br)>br.plannedMinutes);});}
function updatePlannedBreak(id,minutes){const br=(state.breaks||[]).find(b=>b.id===id),num=Number(minutes);if(!br||br.endAt||!Number.isInteger(num)||num<5||num>180)return toast('Informe um tempo entre 5 e 180 minutos.');br.plannedMinutes=num;changed();}
function finishBreak(id){changePresence(id,'ja_brekou');}
function startUntrackedBreak(employeeId){
 const shift=getShift();if(shift.status==='encerrado'||presenceFor(shift,employeeId)!=='em_break'||activeBreak(shift,employeeId))return;
 (state.breaks||(state.breaks=[])).push({id:uid(),shiftId:shift.id,employeeId,startAt:new Date().toISOString(),endAt:null,plannedMinutes:Number(state.defaultBreakMinutes)||60,station:''});
 changed();toast('Cronômetro iniciado agora. A hora de entrada anterior não estava registrada.');
}
function changeDefaultBreak(value){const n=Number(value);if(!Number.isInteger(n)||n<5||n>180)return;state.defaultBreakMinutes=n;changed();toast('Duração padrão atualizada.');}
function renderBreakCenter(){
 const shift=getShift(),isClosed=shift.status==='encerrado';
 const sessions=(state.breaks||[]).filter(b=>b.shiftId===shift.id).sort((a,b)=>String(b.startAt).localeCompare(String(a.startAt)));
 const running=sessions.filter(b=>!b.endAt);
 const untracked=state.employees.filter(e=>e.active&&presenceFor(shift,e.id)==='em_break'&&!activeBreak(shift,e.id));
 $('breakActiveCount').textContent=`${running.length+untracked.length} pausa(s) em andamento`;
 $('breakDefaultDuration').value=state.defaultBreakMinutes||60;
 $('breakGrid').innerHTML=running.length?running.map(br=>{
   const e=getEmployee(br.employeeId),min=breakElapsedMinutes(br),limit=br.plannedMinutes||60,pct=Math.min(100,Math.round(min/limit*100)),due=new Date(Date.parse(br.startAt)+limit*60000);
   return `<article class="break-session ${min>limit?'is-late':''}"><div class="break-session-title"><span class="avatar-mini">${esc(initials(e?.name))}</span><div><strong>${esc(e?.name||'Colaborador')}</strong><small>${esc(br.station||'Sem estação anterior')} · Início ${esc(timeOf(br.startAt))}</small></div>${min>limit?'<span class="late-pill">Atrasado</span>':''}</div><div class="break-session-clock" data-break-clock="${esc(br.id)}">${esc(breakClock(br))}</div><div class="progress-track"><span style="width:${pct}%;background:${min>limit?'#DC3529':'#f7b928'}"></span></div><div class="break-session-footer"><span>Retorno previsto: <strong>${esc(due.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</strong></span><label>Tempo <input type="number" min="5" max="180" data-break-minutes="${esc(br.id)}" value="${limit}" ${isClosed?'disabled':''}> min</label></div>${!isClosed?`<button class="btn btn-primary btn-small" data-end-break="${esc(br.employeeId)}">${icon('check')} Finalizar pausa</button>`:''}</article>`;
 }).join(''):'<div class="small-empty">Nenhuma pausa com cronômetro iniciada.</div>';
 if(untracked.length)$('breakGrid').innerHTML+=untracked.map(e=>`<article class="break-session"><strong>${esc(e.name)}</strong><p class="form-hint">Break informado na versão anterior, sem horário registrado.</p>${!isClosed?`<button class="btn btn-outline btn-small" data-restart-break="${esc(e.id)}">Começar contagem a partir de agora</button>`:''}</article>`).join('');
 $('breakHistory').innerHTML=sessions.length?sessions.slice(0,15).map(br=>{const e=getEmployee(br.employeeId);return `<div class="break-history-row"><strong>${esc(e?.name||'Colaborador')}</strong><span>${esc(timeOf(br.startAt))} → ${br.endAt?esc(timeOf(br.endAt)):'em andamento'}</span><span>${esc(breakClock(br))}</span></div>`;}).join(''):'<div class="small-empty">Nenhuma pausa registrada neste turno.</div>';
 renderCoverageSuggestions();
}
// Recomenda somente pessoal livre com habilidades verificadas no cadastro.
function coverageCandidates(station,shift){
 return state.employees.filter(e=>e.active&&!shiftAssignments(shift).some(a=>a.employeeId===e.id)&&!['em_break','faltou','folga'].includes(presenceFor(shift,e.id)))
  .sort((a,b)=>(Number((b.skills||[]).includes(station))-Number((a.skills||[]).includes(station)))||a.name.localeCompare(b.name,'pt-BR'));
}
function renderCoverageSuggestions(){
 const shift=getShift(),supply=(state.breaks||[]).filter(b=>b.shiftId===shift.id&&!b.endAt&&b.station);
 const targets=[...new Map(supply.map(b=>[b.station,b])).values()];
 $('coverageSuggestions').innerHTML=targets.length?targets.map(br=>{
   const trained=coverageCandidates(br.station,shift).filter(e=>(e.skills||[]).includes(br.station)),other=coverageCandidates(br.station,shift).filter(e=>!(e.skills||[]).includes(br.station));
   return `<div class="coverage-card"><div><strong>${icon('alert')} ${esc(br.station)}</strong><p>Cobertura para ${esc(getEmployee(br.employeeId)?.name||'o colaborador em break')} · ${shiftAssignments(shift).filter(a=>a.station===br.station).length} pessoa(s) já na estação</p></div>${trained.length?`<div class="coverage-choices">${trained.slice(0,4).map(e=>`<button class="cover-option" data-cover-employee="${esc(e.id)}" data-cover-station="${esc(br.station)}">${icon('check')} ${esc(e.name)} <small>Habilitado(a)</small></button>`).join('')}</div>`:`<p class="coverage-warning">Nenhuma pessoa livre com habilitação confirmada nessa estação.</p>`}${other.length?`<details><summary>${other.length} disponível(is) sem habilitação confirmada</summary><p>Confira o treinamento antes de posicionar.</p><div class="coverage-choices">${other.map(e=>`<button class="cover-option unverified" data-cover-employee="${esc(e.id)}" data-cover-station="${esc(br.station)}">${esc(e.name)} · Verificar</button>`).join('')}</div></details>`:''}</div>`;
 }).join(''):'<div class="small-empty">Nenhuma substituição pendente de break neste momento.</div>';
}
let pickedEmployee=null;
function selectPositionEmployee(id){const shift=getShift(),employee=getEmployee(id);if(shift.status==='encerrado'||!employee?.active||['em_break','faltou','folga'].includes(presenceFor(shift,id)))return toast('Pessoa indisponível para movimentação.');pickedEmployee=id;$('positionMoveHint').textContent=`${employee.name} selecionado(a). Toque numa estação para posicionar ou mover.`;$('positionMoveHint').classList.add('selection-active');document.querySelectorAll('[data-drag-employee]').forEach(el=>el.classList.toggle('picked',el.dataset.dragEmployee===id));}
function moveToStation(id,station,{checkSkill=false}={}){
 const shift=getShift(),person=getEmployee(id);if(shift.status==='encerrado'||!STATIONS.includes(station)||!person?.active)return toast('Movimentação não permitida.');if(['em_break','faltou','folga'].includes(presenceFor(shift,id)))return toast('Pessoa em break, ausente ou de folga.');
 if(checkSkill&&!(person.skills||[]).includes(station)&&!confirm(`${person.name} ainda não tem habilitação confirmada para ${station}. Você conferiu que pode cobrir esta estação?`))return;
 const existing=shiftAssignments(shift).find(a=>a.employeeId===id);
 if(existing)existing.station=station;else state.assignments.push({id:uid(),shiftId:shift.id,employeeId:id,station});
 if(presenceFor(shift,id)==='disponivel')changePresenceSilently(shift,id,'em_atividade');
 pickedEmployee=null;changed();$('positionMoveHint').textContent='Arraste uma pessoa para uma estação ou toque no nome e depois na estação.';$('positionMoveHint').classList.remove('selection-active');toast(`${person.name} → ${station}.`);
}

function progress(tasks=[]){const total=tasks.length,done=tasks.filter(t=>t.done).length;return {total,done,pending:total-done,pct:total?Math.round(done/total*100):0};}
function initials(name){return String(name||'?').trim().split(/\s+/).slice(0,2).map(w=>w.charAt(0)).join('').toUpperCase();}
function statusLabel(status){return {planejado:'Planejado',em_andamento:'Em andamento',encerrado:'Encerrado'}[status]||'Planejado';}
function statusChip(status){return `<span class="status-pill ${esc(status)}">${esc(statusLabel(status))}</span>`;}
function toast(message){const box=$('toast');box.textContent=message;box.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>box.classList.remove('visible'),3300);}
function stationIcon(station){return station==='Gerência'?'shield':station==='Bebidas e sobremesas'?'coffee':station==='LOPE'?'clipboard':station==='Apoio'?'users':'layout';}
function renderStaticIcons(){document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function formatShift(s){return `${humanDate(s.date,{day:'2-digit',month:'short'})} · ${s.period}`;}
function renderShiftPicker(){if(!state.shifts.some(s=>s.id===state.currentShiftId))state.currentShiftId=state.shifts[0]?.id||null;const sel=$('shiftSelect');sel.innerHTML=[...state.shifts].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<option value="${esc(s.id)}" ${s.id===state.currentShiftId?'selected':''}>${esc(formatShift(s))} (${esc(statusLabel(s.status))})</option>`).join('');}
function setPage(page){if(!TITLES[page])return;selectedPage=page;state.page=page;persist();document.querySelectorAll('.page').forEach(el=>el.classList.toggle('hidden',el.id!==`page-${page}`));document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));$('currentPageTitle').textContent=TITLES[page][0];$('mainTitle').textContent=TITLES[page][0];$('mainSubtitle').textContent=TITLES[page][1];closeSidebar();window.scrollTo({top:0,behavior:'smooth'});}
function renderAll(){renderShiftPicker();const s=getShift();if(!s){return;}const pending=progress(s.tasks||[]).pending;$('navPending').textContent=pending;$('heroShiftStatus').textContent=`${statusLabel(s.status)} · ${s.period}`;$('todayLabel').textContent=humanDate(localDay(),{weekday:'short',day:'2-digit',month:'short'});$('themeButton').innerHTML=icon(state.theme==='light'?'moon':'sun');$('handoffNotes').value=s.notes||'';renderDashboard();renderEscala();renderAttendance();renderBreakCenter();renderEmployees();renderChecklist();renderPassagem();renderReports();setPage(selectedPage);}
function metric(label,value,foot,ic){return `<div class="metric-card"><div class="metric-top"><span>${esc(label)}</span><span class="metric-icon">${icon(ic)}</span></div><div class="metric-value">${esc(value)}</div><div class="metric-foot">${foot}</div></div>`;}
function renderDashboard(){
 const s=getShift(),as=shiftAssignments(s),p=progress(s.tasks),events=shiftEvents(s),active=state.employees.filter(e=>e.active);
 const counts=attendanceCounts(s),working=as.filter(a=>!['em_break','faltou','folga'].includes(presenceFor(s,a.employeeId)));
 const unassigned=active.filter(e=>presenceFor(s,e.id)==='disponivel').length;
 $('dashboardMetrics').innerHTML=metric('Em posição',String(working.length),`<strong>${active.length}</strong> colaboradores ativos`,'users')+metric('Em break',String(counts.em_break),`${counts.ja_brekou} já brecou/brecaram`,'coffee')+metric('Faltas / folgas',String(counts.faltou+counts.folga),`${counts.faltou} falta(s) e ${counts.folga} folga(s)`,'alert')+metric('Checklist concluído',`${p.pct}%`,`${p.done} de ${p.total} tarefas`,'check-square');
 $('heroAssigned').textContent=`${working.length}/${active.length}`;$('heroTasks').textContent=p.pct+'%';$('heroProgressFill').style.width=p.pct+'%';
 $('dashPositions').innerHTML=as.length?as.slice(0,5).map(a=>{const e=getEmployee(a.employeeId),status=presenceFor(s,a.employeeId);return `<div class="position-line"><div class="station-dot">${icon(stationIcon(a.station))}</div><div class="person-text"><strong>${esc(e?.name||'Colaborador indisponível')}</strong><small>${esc(e?.role||'—')}</small></div>${status==='em_atividade'?`<span class="mini-tag">${esc(a.station)}</span>`:presenceBadge(status)}</div>`;}).join('')+(as.length>5?`<div class="small-empty">E mais ${as.length-5} pessoa(s) posicionada(s).</div>`:''):'<div class="small-empty">Nenhuma posição atribuída neste turno.</div>';
 $('dashChecklist').innerHTML=`<div class="mini-progress-top"><span>Progresso geral</span><strong>${p.pct}%</strong></div><div class="progress-track"><span style="width:${p.pct}%"></span></div>`+PHASES.map(phase=>{const q=progress(s.tasks.filter(t=>t.phase===phase));return `<div class="phase-progress-item"><div class="mini-progress-top"><span>${esc(phase)}</span><strong>${q.done}/${q.total}</strong></div><div class="progress-track"><span style="width:${q.pct}%"></span></div></div>`;}).join('')+`<p style="color:var(--muted);font-size:10px;margin:20px 0 0">${unassigned} pessoa(s) disponível(is) sem posição neste plantão.</p>`;
 $('dashEvents').innerHTML=events.length?events.slice(0,3).map(e=>`<div class="event-inline"><div class="event-title"><span>${esc(e.type)}</span><span>${esc(timeOf(e.createdAt))}</span></div><p>${esc(e.text)}</p></div>`).join(''):'<div class="small-empty" style="grid-column:1/-1">Sem ocorrências registradas.</div>';
}
function renderEscala(){
 const s=getShift(),as=shiftAssignments(s),closed=s.status==='encerrado';$('newAssignmentButton').disabled=closed;
 $('shiftDetails').innerHTML=`<div class="detail-card">${icon('calendar')}<div><strong>${esc(humanDate(s.date,{weekday:'long',day:'2-digit',month:'long'}))}</strong><small>${esc(s.period)}</small></div></div><div class="detail-card">${icon('clock')}<div><strong>${esc(s.start)} – ${esc(s.end)}</strong><small>Horário previsto</small></div></div><div class="detail-card">${icon('user')}<div><strong>${esc(s.manager)}</strong><small>Responsável</small></div></div><div class="detail-card">${statusChip(s.status)}</div><div class="detail-actions">${s.status==='planejado'?`<button class="btn btn-primary btn-small" data-start-shift="${esc(s.id)}">${icon('check')} Iniciar plantão</button>`:''}${s.status==='em_andamento'?`<button class="btn btn-outline btn-small" data-close-shift="${esc(s.id)}">${icon('archive')} Encerrar plantão</button>`:''}</div>`;
 const onStation=as.filter(a=>!['em_break','faltou','folga'].includes(presenceFor(s,a.employeeId)));
 $('stationsSubtitle').textContent=`${onStation.length} pessoa(s) em ${new Set(onStation.map(a=>a.station)).size} estações · ${attendanceCounts(s).em_break} em break`;
 $('stationGrid').innerHTML=STATIONS.map(station=>{
  const crew=as.filter(a=>a.station===station);
  return `<div class="station-card station-dropzone" data-drop-station="${esc(station)}" role="group" aria-label="Estação ${esc(station)}"><div class="station-card-head"><div class="station-dot">${icon(stationIcon(station))}</div><div><h4>${esc(station)}</h4><small>${crew.length} pessoa(s)</small></div></div>${crew.map(a=>{const e=getEmployee(a.employeeId),status=presenceFor(s,a.employeeId);return `<div class="station-person draggable-person" ${closed?'':`draggable="true" data-drag-employee="${esc(a.employeeId)}"`}><button type="button" class="person-picker" ${closed?'disabled':''} data-choose-employee="${esc(a.employeeId)}" title="Selecionar para mover"><span class="avatar-mini">${esc(initials(e?.name))}</span><div class="station-person-info"><span class="person-name">${esc(e?.name||'Indisponível')}</span>${status!=='em_atividade'?presenceBadge(status):''}</div></button>${!closed?`<button class="remove-assignment" data-remove-assignment="${esc(a.id)}" title="Retirar da posição" aria-label="Retirar ${esc(e?.name)} da posição">${icon('x')}</button>`:''}</div>`;}).join('')}${!closed?`<div class="station-add-row"><button class="add-station" data-add-station="${esc(station)}">${icon('plus')} Adicionar</button><button class="quick-drop" data-tap-station="${esc(station)}">${icon('move')} Posicionar selecionado</button></div>`:''}</div>`;
 }).join('');
 const free=state.employees.filter(e=>e.active&&!as.some(a=>a.employeeId===e.id)&&!['em_break','faltou','folga'].includes(presenceFor(s,e.id)));
 $('unassignedEmployees').innerHTML=free.length?free.map(e=>`<button class="people-chip draggable-person" ${closed?'disabled':''} ${closed?'':`draggable="true" data-drag-employee="${esc(e.id)}"`} data-choose-employee="${esc(e.id)}"><span class="avatar-mini">${esc(initials(e.name))}</span>${esc(e.name)}${presenceFor(s,e.id)==='ja_brekou'?presenceBadge('ja_brekou'):''}</button>`).join(''):'<span class="small-empty" style="width:100%">Ninguém disponível fora das posições.</span>';
}
function renderEmployees(){const term=$('employeeSearch').value.trim().toLocaleLowerCase('pt-BR'),filter=$('employeeStatusFilter').value;const list=state.employees.filter(e=>(filter==='todos'||(filter==='ativos'?e.active:!e.active))&&`${e.name} ${e.role}`.toLocaleLowerCase('pt-BR').includes(term)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));$('employeeCount').textContent=`${list.length} registro(s)`;$('employeeGrid').innerHTML=list.length?list.map(e=>`<article class="employee-card"><div class="employee-card-top"><span class="avatar-large">${esc(initials(e.name))}</span>${e.active?'<span class="status-pill andamento">Ativo</span>':'<span class="status-pill">Inativo</span>'}</div><h3>${esc(e.name)}</h3><p>${esc(e.role)}</p>${e.active?`<div class="employee-presence">${presenceBadge(presenceFor(getShift(),e.id))}</div>`:''}<div class="employee-card-foot"><span class="mini-tag">${state.assignments.filter(a=>a.employeeId===e.id).length} alocação(ões)</span><button data-edit-employee="${esc(e.id)}">${icon('edit')} Editar</button></div></article>`).join(''):'<div class="empty-state"><strong>Nenhum colaborador encontrado</strong>Altere a busca ou cadastre uma pessoa.</div>';
}
function renderChecklist(){const s=getShift(),p=progress(s.tasks),closed=s.status==='encerrado';$('newTaskButton').disabled=closed;$('checklistSummary').textContent=`${p.done} de ${p.total} atividades`;$('checklistProgressText').textContent=p.pending?`${p.pending} tarefa(s) ainda precisam de atenção.`:'Todas as tarefas foram concluídas.';$('progressRingText').textContent=p.pct+'%';$('progressRing').style.background=`conic-gradient(var(--mint) ${p.pct*3.6}deg,var(--surface3) ${p.pct*3.6}deg)`;$('mainProgressFill').style.width=p.pct+'%';
 $('checklistPhases').innerHTML=PHASES.map(phase=>{const tasks=s.tasks.filter(t=>t.phase===phase),q=progress(tasks);return `<div class="checklist-column"><div class="checklist-head"><h3>${esc(phase)}</h3><span class="checklist-count">${q.done}/${q.total} feitas</span></div>${tasks.map(t=>`<div class="task-item ${t.done?'done':''}"><input type="checkbox" id="task-${esc(t.id)}" data-task-id="${esc(t.id)}" ${t.done?'checked':''} ${closed?'disabled':''}><label for="task-${esc(t.id)}">${esc(t.title)}</label>${t.custom&&!closed?`<button class="delete-task" data-delete-task="${esc(t.id)}" title="Excluir tarefa">${icon('x')}</button>`:''}</div>`).join('')||'<div class="small-empty">Sem tarefas nesta fase.</div>'}</div>`;}).join('');
}
function buildHandoff(s){
 const a=shiftAssignments(s),p=progress(s.tasks),events=shiftEvents(s),pending=s.tasks.filter(t=>!t.done);
 const placed=a.map(item=>{const e=getEmployee(item.employeeId);return `• ${e?.name||'Colaborador'} — ${item.station} (${presenceName(presenceFor(s,item.employeeId))})`;});
 const statusLines=SUMMARY_STATES.filter(st=>!['em_atividade','disponivel'].includes(st)).map(st=>{
  const people=state.employees.filter(e=>e.active&&presenceFor(s,e.id)===st).map(e=>{const br=lastBreak(s,e.id);return e.name+(br&&['em_break','ja_brekou'].includes(st)?` [${br.startAt?timeOf(br.startAt):'—'}–${br.endAt?timeOf(br.endAt):'em andamento'}]`:'');});
  return `${presenceName(st)} (${people.length}): ${people.join(', ')||'Nenhum'}`;
 });
 return `PASSAGEM DE PLANTÃO — PLANTÃO+\n\nData: ${humanDate(s.date)}\nTurno: ${s.period} (${s.start} às ${s.end})\nResponsável: ${s.manager}\nSituação: ${statusLabel(s.status)}\n\nEQUIPE E POSICIONAMENTO (${a.length})\n${placed.join('\n')||'Nenhuma pessoa posicionada.'}\n\nBREAKS E PRESENÇAS\n${statusLines.join('\n')}\n\nCHECKLIST: ${p.done}/${p.total} (${p.pct}%)\nPENDÊNCIAS (${pending.length}):\n${pending.map(t=>`• [${t.phase}] ${t.title}`).join('\n')||'Nenhuma pendência.'}\n\nOCORRÊNCIAS (${events.length}):\n${events.map(e=>`• ${dateTime(e.createdAt)} | ${e.type}: ${e.text}`).join('\n')||'Nenhuma ocorrência registrada.'}\n\nORIENTAÇÕES PARA O PRÓXIMO TURNO:\n${s.notes?.trim()||'Sem observações adicionais.'}`;
}
function renderPassagem(){const s=getShift(),ev=shiftEvents(s),closed=s.status==='encerrado';$('eventForm').querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=closed);$('saveHandoffNotes').disabled=closed;$('handoffNotes').disabled=closed;
 $('eventTimeline').innerHTML=ev.length?ev.map(e=>`<div class="timeline-item"><div class="timeline-meta"><strong>${esc(e.type)}</strong>${esc(dateTime(e.createdAt))}</div><p>${esc(e.text)}</p></div>`).join(''):'<div class="small-empty">Nenhum registro neste plantão.</div>';$('handoffPreview').textContent=buildHandoff(s);
}
function renderReports(){const month=$('reportMonth').value||localDay().slice(0,7);const list=state.shifts.filter(s=>s.date.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date));const closed=list.filter(s=>s.status==='encerrado').length;const completion=list.length?Math.round(list.reduce((t,s)=>t+progress(s.tasks).pct,0)/list.length):0;const incidents=state.events.filter(e=>list.some(s=>s.id===e.shiftId)).length;
 $('reportMetrics').innerHTML=metric('Plantões no mês',list.length,'Registros no período','calendar')+metric('Plantões encerrados',closed,'Turnos finalizados','check')+metric('Checklist médio',completion+'%','Média das atividades','check-square')+metric('Ocorrências',incidents,'Anotações registradas','alert');
 $('reportRows').innerHTML=list.length?list.map(s=>{const a=shiftAssignments(s),p=progress(s.tasks);return `<tr><td>${esc(humanDate(s.date))}</td><td>${esc(s.period)}<br><span style="color:var(--muted)">${esc(s.start)}–${esc(s.end)}</span></td><td>${esc(s.manager)}</td><td>${a.length}</td><td>${p.pct}%</td><td>${statusChip(s.status)}</td><td><button class="text-action" data-open-shift="${esc(s.id)}">Abrir ${icon('arrow-right')}</button></td></tr>`;}).join(''):'<tr><td colspan="7"><div class="small-empty">Não há plantões neste mês.</div></td></tr>';
}
function closeSidebar(){$('sidebar').classList.remove('open');$('sidebarOverlay').classList.remove('visible');}
function openModal(title,subtitle,html,submit){$('modalTitle').textContent=title;$('modalEyebrow').textContent=subtitle;$('modalBody').innerHTML=html;$('modalBackdrop').classList.remove('hidden');const form=$('modalBody').querySelector('form');if(form&&submit)form.addEventListener('submit',event=>{event.preventDefault();submit(new FormData(form));});setTimeout(()=>form?.querySelector('input:not([type=hidden]),select,textarea')?.focus(),0);}
function closeModal(){$('modalBackdrop').classList.add('hidden');$('modalBody').innerHTML='';}
function formActions(text='Salvar'){return `<div class="modal-actions"><button class="btn btn-outline" type="button" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit">${icon('check')} ${esc(text)}</button></div>`;}
function openShiftModal(){const today=localDay();const managerOptions=state.employees.filter(e=>e.active).map(e=>`<option value="${esc(e.name)}">${esc(e.name)}</option>`).join('');openModal('Criar novo plantão','PLANEJAMENTO',`<form class="modal-form"><div class="form-row"><label>Data<input name="date" type="date" required value="${today}"></label><label>Tipo de turno<select name="period"><option>Abertura</option><option>Intermediário</option><option>Fechamento</option><option>Personalizado</option></select></label></div><div class="form-row"><label>Início<input name="start" type="time" required value="06:00"></label><label>Fim<input name="end" type="time" required value="14:00"></label></div><label>Responsável<input name="manager" type="text" maxlength="80" required placeholder="Nome do responsável" list="managerNames"></label><datalist id="managerNames">${managerOptions}</datalist><p class="form-hint">Cada plantão recebe automaticamente um checklist independente.</p>${formActions('Criar plantão')}</form>`,form=>{const date=form.get('date'),period=form.get('period'),start=form.get('start'),end=form.get('end'),manager=String(form.get('manager')).trim();if(!date||!manager||!start||!end)return toast('Preencha todos os campos.');if(state.shifts.some(s=>s.date===date&&s.period===period))return toast('Já existe um plantão desse tipo nesta data.');const s={id:uid(),date,period,start,end,manager,status:'planejado',createdAt:new Date().toISOString(),tasks:makeTasks(),notes:''};state.shifts.push(s);state.currentShiftId=s.id;closeModal();changed();setPage('escala');toast('Plantão criado com sucesso!');});}
function openEmployeeModal(id){
 const e=id?getEmployee(id):null;
 const skills=Array.isArray(e?.skills)?e.skills:[];
 const skillChecklist=STATIONS.map(st=>`<label class="skill-option"><input type="checkbox" name="skills" value="${esc(st)}" ${skills.includes(st)?'checked':''}><span>${esc(st)}</span></label>`).join('');
 openModal(e?'Editar colaborador':'Novo colaborador','GESTÃO DE EQUIPE',`<form class="modal-form"><label>Nome completo<input name="name" required maxlength="90" value="${esc(e?.name||'')}" placeholder="Ex.: Maria Silva"></label><label>Função / cargo<input name="role" required maxlength="70" value="${esc(e?.role||'')}" placeholder="Ex.: Atendente, Treinador(a), Gerente"></label>${e?`<label>Situação<select name="active"><option value="true" ${e.active?'selected':''}>Ativo</option><option value="false" ${!e.active?'selected':''}>Inativo</option></select></label>`:''}<fieldset class="skill-fieldset"><legend>Estações com treinamento confirmado</legend><p class="form-hint">Marque apenas estações em que a pessoa está habilitada. Isso alimenta as sugestões de cobertura.</p><div class="skill-grid">${skillChecklist}</div></fieldset>${formActions(e?'Atualizar cadastro':'Cadastrar pessoa')}</form>`,form=>{
 const name=String(form.get('name')||'').trim(),role=String(form.get('role')||'').trim();
 if(name.length<2||role.length<2)return toast('Informe nome e função válidos.');
 if(state.employees.some(x=>x.id!==id&&x.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))return toast('Já existe um colaborador com esse nome.');
 const newSkills=form.getAll('skills').filter(st=>STATIONS.includes(st));
 if(e){e.name=name;e.role=role;e.active=form.get('active')==='true';e.skills=newSkills;}else state.employees.push({id:uid(),name,role,active:true,skills:newSkills});
 closeModal();changed();toast(e?'Cadastro atualizado.':'Colaborador cadastrado.');
 });
}
function openAssignModal(station='',employeeId=''){const s=getShift();if(s.status==='encerrado')return toast('Este plantão já está encerrado.');const already=new Set(shiftAssignments(s).map(a=>a.employeeId));const available=state.employees.filter(e=>e.active&&!already.has(e.id)&&!['faltou','folga','em_break'].includes(presenceFor(s,e.id)));if(!available.length)return toast('Cadastre alguém ou libere uma pessoa já posicionada.');openModal('Posicionar colaborador','ESCALA OPERACIONAL',`<form class="modal-form"><label>Colaborador<select name="employeeId" required><option value="">Selecione uma pessoa</option>${available.map(e=>`<option value="${esc(e.id)}" ${employeeId===e.id?'selected':''}>${esc(e.name)} · ${esc(e.role)}</option>`).join('')}</select></label><label>Estação de trabalho<select name="station" required>${STATIONS.map(name=>`<option value="${esc(name)}" ${station===name?'selected':''}>${esc(name)}</option>`).join('')}</select></label><p class="form-hint">Uma mesma pessoa não pode ser atribuída a duas estações no mesmo plantão.</p>${formActions('Confirmar posição')}</form>`,form=>{const empId=form.get('employeeId'),st=form.get('station');if(!empId||!STATIONS.includes(st))return toast('Selecione a pessoa e a estação.');if(!getEmployee(empId)?.active)return toast('Pessoa indisponível.');if(shiftAssignments(s).some(a=>a.employeeId===empId))return toast('Essa pessoa já está posicionada neste turno.');if(['faltou','folga','em_break'].includes(presenceFor(s,empId)))return toast('Altere o status da pessoa antes de posicioná-la.');state.assignments.push({id:uid(),shiftId:s.id,employeeId:empId,station:st});if(presenceFor(s,empId)==='disponivel')changePresenceSilently(s,empId,'em_atividade');closeModal();changed();toast('Posicionamento registrado.');});}
function openTaskModal(){const s=getShift();if(s.status==='encerrado')return toast('O plantão está encerrado.');openModal('Adicionar tarefa','CHECKLIST',`<form class="modal-form"><label>Descrição<input name="title" required maxlength="160" placeholder="Ex.: verificar reposição da câmara"></label><label>Etapa<select name="phase">${PHASES.map(phase=>`<option value="${esc(phase)}">${esc(phase)}</option>`).join('')}</select></label>${formActions('Adicionar tarefa')}</form>`,form=>{const title=String(form.get('title')||'').trim(),phase=form.get('phase');if(!title||!PHASES.includes(phase))return toast('Descreva a tarefa.');s.tasks.push({id:uid(),phase,title,done:false,custom:true});closeModal();changed();toast('Tarefa adicionada.');});}
function startShift(id){const s=state.shifts.find(s=>s.id===id);if(!s||s.status!=='planejado')return;s.status='em_andamento';s.startedAt=new Date().toISOString();changed();toast('Plantão iniciado.');}
function finishShift(id){const s=state.shifts.find(s=>s.id===id);if(!s||s.status!=='em_andamento')return;const p=progress(s.tasks);const msg=p.pending?`Existem ${p.pending} tarefa(s) pendente(s). Deseja encerrar mesmo assim?`:'Encerrar este plantão? Os registros serão mantidos como histórico.';if(!confirm(msg))return;s.status='encerrado';s.closedAt=new Date().toISOString();changed();toast('Plantão encerrado e arquivado.');}
function reportCsv(){const rows=[['Data','Turno','Início','Fim','Responsável','Situação do turno','Colaborador','Cargo','Estação','Situação do colaborador','Checklist concluído (%)','Ocorrências','Break iniciado','Break finalizado','Duração do break (min)']];const month=$('reportMonth').value||localDay().slice(0,7);state.shifts.filter(s=>s.date.startsWith(month)).forEach(s=>{const p=progress(s.tasks),a=shiftAssignments(s);const people=state.employees.filter(e=>e.active||a.some(item=>item.employeeId===e.id)||(state.attendance||[]).some(item=>item.shiftId===s.id&&item.employeeId===e.id));(people.length?people:[null]).forEach(e=>{const item=e?a.find(item=>item.employeeId===e.id):null;rows.push([s.date,s.period,s.start,s.end,s.manager,statusLabel(s.status),e?.name||'',e?.role||'',item?.station||'',e?presenceName(presenceFor(s,e.id)):'',p.pct,shiftEvents(s).length,e?lastBreak(s,e.id)?.startAt||'':'',e?lastBreak(s,e.id)?.endAt||'':'',e&&lastBreak(s,e.id)?breakElapsedMinutes(lastBreak(s,e.id)):'']);});});const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');downloadFile(`plantao_relatorio_${month}.csv`,csv,'text/csv;charset=utf-8');toast('Relatório CSV gerado.');}
function reportBreakCsv(){
 const month=$('reportMonth').value||localDay().slice(0,7),byShift=new Map(state.shifts.map(s=>[s.id,s]));
 const rows=[['Data','Turno','Colaborador','Estação anterior','Início do break','Fim do break','Duração (minutos)','Tempo programado (minutos)','Situação']];
 (state.breaks||[]).forEach(b=>{const sh=byShift.get(b.shiftId),e=getEmployee(b.employeeId);if(!sh||!sh.date.startsWith(month))return;
  rows.push([sh.date,sh.period,e?.name||'—',b.station||'',b.startAt||'',b.endAt||'',breakElapsedMinutes(b),b.plannedMinutes||60,b.endAt?'Finalizado':'Em andamento']);
 });
 const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
 downloadFile(`plantao_breaks_${month}.csv`,csv,'text/csv;charset=utf-8');toast('Relatório de breaks exportado.');
}
function downloadFile(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function backup(){downloadFile(`plantao_backup_${localDay()}.json`,JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),'application/json');toast('Backup salvo em arquivo.');}
async function importBackup(file){if(!file)return;try{const raw=await file.text();if(raw.length>5_000_000)throw new Error('Arquivo muito grande.');const data=JSON.parse(raw);if(!data||!Array.isArray(data.employees)||!Array.isArray(data.shifts)||!Array.isArray(data.assignments)||!Array.isArray(data.events))throw new Error('Formato inválido.');if(!confirm('Importar este backup substituirá todos os dados salvos neste navegador. Continuar?'))return;
 // Normaliza o conteúdo importado; textos serão sempre escapados na interface.
 const slim=(v,max=250)=>String(v??'').slice(0,max);
 const employees=data.employees.slice(0,500).map(e=>({id:slim(e.id,100),name:slim(e.name,90),role:slim(e.role,70),active:e.active!==false,skills:(Array.isArray(e.skills)?e.skills:[]).filter(st=>STATIONS.includes(st))})).filter(e=>e.id&&e.name);
 const shifts=data.shifts.slice(0,3000).map(s=>({id:slim(s.id,100),date:slim(s.date,10),period:slim(s.period,60),start:slim(s.start,5),end:slim(s.end,5),manager:slim(s.manager,80),status:['planejado','em_andamento','encerrado'].includes(s.status)?s.status:'planejado',createdAt:slim(s.createdAt,40),startedAt:slim(s.startedAt,40),closedAt:slim(s.closedAt,40),notes:slim(s.notes,2000),tasks:(Array.isArray(s.tasks)?s.tasks:makeTasks()).slice(0,250).map(t=>({id:slim(t.id,100),phase:PHASES.includes(t.phase)?t.phase:PHASES[0],title:slim(t.title,160),done:Boolean(t.done),custom:Boolean(t.custom)})).filter(t=>t.id&&t.title)})).filter(s=>s.id&&/^\d{4}-\d{2}-\d{2}$/.test(s.date));
 if(!shifts.length)throw new Error('O backup não contém plantões válidos.');const validShiftIds=new Set(shifts.map(s=>s.id)),validEmpIds=new Set(employees.map(e=>e.id));const assignments=data.assignments.slice(0,30000).map(a=>({id:slim(a.id,100),shiftId:slim(a.shiftId,100),employeeId:slim(a.employeeId,100),station:slim(a.station,80)})).filter(a=>a.id&&validShiftIds.has(a.shiftId)&&validEmpIds.has(a.employeeId));const attendance=(Array.isArray(data.attendance)?data.attendance:[]).slice(0,30000).map(x=>({id:slim(x.id,100)||uid(),shiftId:slim(x.shiftId,100),employeeId:slim(x.employeeId,100),status:PRESENCE_NAMES[x.status]?x.status:'disponivel',updatedAt:slim(x.updatedAt,40)})).filter(x=>validShiftIds.has(x.shiftId)&&validEmpIds.has(x.employeeId));const breaks=(Array.isArray(data.breaks)?data.breaks:[]).slice(0,30000).map(b=>({id:slim(b.id,100)||uid(),shiftId:slim(b.shiftId,100),employeeId:slim(b.employeeId,100),startAt:slim(b.startAt,40),endAt:b.endAt?slim(b.endAt,40):null,plannedMinutes:Math.min(180,Math.max(5,Number(b.plannedMinutes)||60)),station:STATIONS.includes(b.station)?b.station:''})).filter(b=>validShiftIds.has(b.shiftId)&&validEmpIds.has(b.employeeId)&&!Number.isNaN(Date.parse(b.startAt)));const events=data.events.slice(0,30000).map(e=>({id:slim(e.id,100),shiftId:slim(e.shiftId,100),type:slim(e.type,80),text:slim(e.text,600),createdAt:slim(e.createdAt,40)})).filter(e=>e.id&&validShiftIds.has(e.shiftId));
 state={version:3,demo:false,theme:state.theme,page:'dashboard',currentShiftId:shifts[0].id,employees,shifts,assignments,attendance,breaks,defaultBreakMinutes:60,events};persist();$('employeeSearch').value='';closeModal();renderAll();toast('Backup importado com sucesso.');}catch(err){toast('Não foi possível importar: '+err.message);}finally{$('importJson').value='';}}
function buildCopiedMessage(){const s=getShift();return buildHandoff({...s,notes:$('handoffNotes').value});}
async function copyHandoff(){const text=buildCopiedMessage();try{if(!navigator.clipboard?.writeText)throw new Error('Indisponível');await navigator.clipboard.writeText(text);toast('Resumo copiado!');}catch(err){window.prompt('Copie o texto abaixo:',text);}}
function setupEvents(){
 document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>setPage(btn.dataset.page)));
 document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>setPage(btn.dataset.go)));
 $('shiftSelect').addEventListener('change',event=>{state.currentShiftId=event.target.value;persist();renderAll();});
 $('newShiftButton').addEventListener('click',openShiftModal);
 $('newAssignmentButton').addEventListener('click',()=>openAssignModal());
 $('newEmployeeButton').addEventListener('click',()=>openEmployeeModal());
 $('newTaskButton').addEventListener('click',openTaskModal);
 $('employeeSearch').addEventListener('input',renderEmployees);
 $('employeeStatusFilter').addEventListener('change',renderEmployees);
 $('reportMonth').addEventListener('change',renderReports);
 $('breakDefaultDuration').addEventListener('change',event=>changeDefaultBreak(event.target.value));
 document.addEventListener('change',event=>{if(event.target.matches('[data-break-minutes]'))updatePlannedBreak(event.target.dataset.breakMinutes,event.target.value);});
 document.addEventListener('dragstart',event=>{const item=event.target.closest('[data-drag-employee]');if(!item||getShift().status==='encerrado')return;event.dataTransfer.setData('text/plain',item.dataset.dragEmployee);event.dataTransfer.effectAllowed='move';});
 document.addEventListener('dragover',event=>{const zone=event.target.closest('[data-drop-station]');if(zone&&getShift().status!=='encerrado'){event.preventDefault();zone.classList.add('drag-over');}});
 document.addEventListener('dragleave',event=>{const zone=event.target.closest('[data-drop-station]');if(zone&&!zone.contains(event.relatedTarget))zone.classList.remove('drag-over');});
 document.addEventListener('drop',event=>{const zone=event.target.closest('[data-drop-station]');if(!zone)return;event.preventDefault();zone.classList.remove('drag-over');const id=event.dataTransfer.getData('text/plain');if(id)moveToStation(id,zone.dataset.dropStation);});
 document.addEventListener('dragend',()=>document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over')));
 $('eventForm').addEventListener('submit',event=>{event.preventDefault();const s=getShift();if(s.status==='encerrado')return toast('Plantão encerrado.');const form=new FormData(event.currentTarget),text=String(form.get('text')||'').trim();if(!text)return toast('Descreva a ocorrência.');state.events.push({id:uid(),shiftId:s.id,type:String(form.get('type')).slice(0,80),text:text.slice(0,600),createdAt:new Date().toISOString()});event.currentTarget.reset();changed();toast('Ocorrência registrada.');});
 $('saveHandoffNotes').addEventListener('click',()=>{const s=getShift();if(s.status==='encerrado')return;s.notes=$('handoffNotes').value.trim().slice(0,2000);changed();toast('Recado salvo.');});
 $('handoffNotes').addEventListener('input',()=>{$('handoffPreview').textContent=buildCopiedMessage();});
 $('copyHandoff').addEventListener('click',copyHandoff);$('copyHandoffTop').addEventListener('click',copyHandoff);
 $('shareWhatsapp').addEventListener('click',()=>window.open(`https://wa.me/?text=${encodeURIComponent(buildCopiedMessage())}`,'_blank','noopener,noreferrer'));
 $('exportCsv').addEventListener('click',reportCsv);$('exportBreakCsv').addEventListener('click',reportBreakCsv);$('backupJson').addEventListener('click',backup);$('importJson').addEventListener('change',event=>importBackup(event.target.files?.[0]));
 $('closeModal').addEventListener('click',closeModal);$('modalBackdrop').addEventListener('click',event=>{if(event.target===$('modalBackdrop'))closeModal();});
 $('mobileMenu').addEventListener('click',()=>{$('sidebar').classList.add('open');$('sidebarOverlay').classList.add('visible');});$('sidebarOverlay').addEventListener('click',closeSidebar);
 $('themeButton').addEventListener('click',()=>{state.theme=state.theme==='light'?'dark':'light';document.body.classList.toggle('light',state.theme==='light');persist();renderAll();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();closeSidebar();}});
 document.addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn)return;
  if(btn.hasAttribute('data-close-modal'))return closeModal();
  if(btn.dataset.addStation)return openAssignModal(btn.dataset.addStation);
  if(btn.dataset.assignEmployee)return openAssignModal('',btn.dataset.assignEmployee);
  if(btn.dataset.editEmployee)return openEmployeeModal(btn.dataset.editEmployee);
  if(btn.dataset.startBreak)return changePresence(btn.dataset.startBreak,'em_break');
  if(btn.dataset.restartBreak)return startUntrackedBreak(btn.dataset.restartBreak);
  if(btn.dataset.endBreak)return finishBreak(btn.dataset.endBreak);
  if(btn.dataset.chooseEmployee)return selectPositionEmployee(btn.dataset.chooseEmployee);
  if(btn.dataset.tapStation)return pickedEmployee?moveToStation(pickedEmployee,btn.dataset.tapStation):toast('Selecione primeiro uma pessoa na escala.');
  if(btn.dataset.coverEmployee)return moveToStation(btn.dataset.coverEmployee,btn.dataset.coverStation,{checkSkill:true});
  if(btn.dataset.removeAssignment){const s=getShift();if(s.status==='encerrado')return;const removed=state.assignments.find(a=>a.id===btn.dataset.removeAssignment);state.assignments=state.assignments.filter(a=>a.id!==btn.dataset.removeAssignment);if(removed&&presenceFor(s,removed.employeeId)==='em_atividade')changePresenceSilently(s,removed.employeeId,'disponivel');changed();toast('Pessoa retirada da posição.');return;}
  if(btn.dataset.deleteTask){const s=getShift();if(s.status==='encerrado')return;s.tasks=s.tasks.filter(t=>t.id!==btn.dataset.deleteTask||!t.custom);changed();toast('Tarefa removida.');return;}
  if(btn.dataset.startShift)return startShift(btn.dataset.startShift);
  if(btn.dataset.closeShift)return finishShift(btn.dataset.closeShift);
  if(btn.dataset.openShift){state.currentShiftId=btn.dataset.openShift;changed();setPage('escala');return;}
 });
 document.addEventListener('change',event=>{if(event.target.matches('[data-presence-employee]')){changePresence(event.target.dataset.presenceEmployee,event.target.value);return;}if(!event.target.matches('[data-task-id]'))return;const s=getShift();if(s.status==='encerrado')return;const task=s.tasks.find(t=>t.id===event.target.dataset.taskId);if(!task)return;task.done=event.target.checked;changed();});
}
function init(){setInterval(breakClockRefresh,15000);renderStaticIcons();$('reportMonth').value=localDay().slice(0,7);document.body.classList.toggle('light',state.theme==='light');setupEvents();renderAll();}
document.addEventListener('DOMContentLoaded',init);

// The optional sync module receives only domain data; page/theme settings remain private to each device.
window.PlantaoBridge={
 snapshot:()=>JSON.parse(JSON.stringify({employees:state.employees,shifts:state.shifts,assignments:state.assignments,attendance:state.attendance||[],breaks:state.breaks||[],defaultBreakMinutes:state.defaultBreakMinutes||60,events:state.events})),
 isDemo:()=>Boolean(state.demo),
 applySnapshot:(payload)=>{
  if(!payload||!Array.isArray(payload.employees)||!Array.isArray(payload.shifts)||!Array.isArray(payload.assignments)||!Array.isArray(payload.events))throw new Error('Dados remotos inválidos');
  if(JSON.stringify(payload).length>750000)throw new Error('Dados remotos acima do limite');
  state={...state,...payload,attendance:Array.isArray(payload.attendance)?payload.attendance:[],breaks:Array.isArray(payload.breaks)?payload.breaks:[],demo:false};
  state.employees.forEach(e=>{if(!Array.isArray(e.skills))e.skills=[];});
  persist();renderAll();
 },
 backup:backup,
 toast:toast,
 currentShift:()=>state.currentShiftId
};
