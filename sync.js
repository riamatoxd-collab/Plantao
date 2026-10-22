/* Plantão+ 1.2 — sincronização opcional, autenticação Supabase, RLS e detecção de conflitos */
'use strict';
(() => {
 const CONFIG_KEY='plantao_plus_cloud_config_v12';
 const TEAM_KEY='plantao_plus_cloud_team_v12';
 const $=id=>document.getElementById(id);
 let client=null,user=null,team=null,revision=null,channel=null,poller=null,pushTimer=null;
 let dirty=false,pushing=false,decisionPending=false,conflict=false,changeSequence=0,loading=false;
 const bridge=window.PlantaoBridge;
 const config=()=>{try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'null');}catch{return null;}};
 function message(id,text,error=false){const el=$(id);if(!el)return;el.textContent=text||'';el.classList.toggle('error',error);el.classList.toggle('success',!error&&Boolean(text));}
 function indicator(text,mode='local'){$('cloudIndicator').textContent='● '+text;$('cloudIndicator').className='cloud-pill'+(mode==='online'?' online':mode==='error'?' error':'');$('profileSyncStatus').textContent=text;$('sidebarSyncStatus').textContent='● '+text;}
 function setViews(){
  $('cloudLoggedOut').classList.toggle('hidden',Boolean(user));
  $('cloudLoggedIn').classList.toggle('hidden',!user);
  $('cloudTeamDisabled').classList.toggle('hidden',Boolean(user));
  $('cloudTeamActions').classList.toggle('hidden',!user);
  $('cloudConnectedPanel').classList.toggle('hidden',!team);
  if(user)$('cloudUserName').textContent=user.email||user.id;
  if(team)$('cloudActiveTeam').textContent=team.name;
 }
 function status(s,error=false){
  message('cloudTeamMessage',s,error);
  if(error)indicator('Atenção à sincronização','error');
  else if(team&&decisionPending)indicator('Equipe · aguardando escolha');
  else if(team)indicator('Online · '+team.name,'online');
  else indicator(user?'Gerente autenticado':'Modo local');
 }
 function ensureClient(){if(!client)throw new Error('Salve a conexão e faça login primeiro.');return client;}
 function resetTeam(){
  clearInterval(poller);clearTimeout(pushTimer);if(channel&&client)client.removeChannel(channel).catch(()=>{});
  channel=null;poller=null;team=null;revision=null;dirty=false;conflict=false;decisionPending=false;
  localStorage.removeItem(TEAM_KEY);setViews();status('Sem equipe conectada. Seus dados continuam salvos neste navegador.');
 }
 async function initClient(){
  const conf=config();if(!conf)return;
  if(!window.supabase?.createClient){message('cloudConfigMessage','Biblioteca Supabase indisponível. Verifique a conexão à internet.',true);return;}
  try{
   if(!/^https:\/\/[a-z0-9.-]+\/?$/i.test(conf.url))throw new Error('A URL precisa usar HTTPS.');
   client=window.supabase.createClient(conf.url.replace(/\/$/,''),conf.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   message('cloudConfigMessage','Servidor configurado neste aparelho.');
   const session=await client.auth.getSession();user=session.data.session?.user||null;setViews();
   client.auth.onAuthStateChange((evt,s)=>{const next=s?.user||null;const oldId=user?.id;user=next;setViews();if(next&&oldId!==next.id){setTimeout(()=>afterLogin().catch(e=>status(e.message,true)),0);}if(!next){resetTeam();}});
   if(user)await afterLogin();
  }catch(e){message('cloudConfigMessage',`Falha na configuração: ${e.message}`,true);}
 }
 async function afterLogin(){await listTeams();const preferred=localStorage.getItem(TEAM_KEY);if(preferred){const found=await membership(preferred);if(found)await chooseTeam(found);}}
 async function membership(id){const {data,error}=await ensureClient().from('plantao_team_members').select('team_id,role').eq('team_id',id).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!data)return null;const r=await client.from('plantao_teams').select('id,name').eq('id',id).single();if(r.error)throw r.error;return {...r.data,role:data.role};}
 async function listTeams(){if(!user)return;const r=await ensureClient().from('plantao_team_members').select('team_id,role').eq('user_id',user.id);if(r.error)throw r.error;const ids=(r.data||[]).map(m=>m.team_id),out=$('cloudTeamList');if(!ids.length){out.innerHTML='<p class="form-hint">Você ainda não participa de nenhuma equipe.</p>';return;}
  const t=await client.from('plantao_teams').select('id,name').in('id',ids);if(t.error)throw t.error;
  out.innerHTML=t.data.map(x=>{const row=r.data.find(m=>m.team_id===x.id);return `<div class="cloud-team-item"><div><strong>${escapeHtml(x.name)}</strong><small>${row.role==='owner'?'Administrador':'Gerente'} · ${escapeHtml(x.id.slice(0,8))}</small></div><button class="btn btn-outline btn-small" data-connect-team="${escapeHtml(x.id)}">Conectar</button></div>`;}).join('');
 }
 function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 async function chooseTeam(t){resetTeam();team=t;localStorage.setItem(TEAM_KEY,t.id);setViews();status('Equipe escolhida. Conferindo a versão online...');
  await readCloud(true);
  channel=client.channel('plantao_updates_'+t.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'plantao_snapshots',filter:'team_id=eq.'+t.id},()=>{if(!decisionPending&&!dirty&&!conflict)readCloud(false).catch(e=>status(e.message,true));}).subscribe();
  poller=setInterval(()=>{if(!decisionPending&&!dirty&&!conflict)readCloud(false).catch(e=>status(e.message,true));},12000);
 }
 async function readCloud(initial=false,force=false){
  if(!team||loading||pushing)return;loading=true;
  try{const r=await client.from('plantao_snapshots').select('payload,revision,updated_at').eq('team_id',team.id).single();if(r.error)throw r.error;
   const newRev=Number(r.data.revision);const payload=r.data.payload||{};const hasData=Array.isArray(payload.employees)&&Array.isArray(payload.shifts);
   if(initial){revision=newRev;decisionPending=true;status(hasData?'Equipe online encontrada. Escolha “Baixar dados da equipe” ou “Enviar meus dados”. Seus dados locais não serão substituídos sem autorização.':'A equipe foi criada sem dados. Escolha “Enviar meus dados” para iniciar o compartilhamento.');return;}
   if(revision===newRev)return;
   if(dirty||conflict){conflict=true;status('Conflito: houve alterações online enquanto este aparelho possui mudanças locais. Faça backup e escolha qual versão manter.',true);return;}
   if(!hasData){revision=newRev;return;}
   if(document.getElementById('modalBackdrop')&&!document.getElementById('modalBackdrop').classList.contains('hidden'))return;
   if(document.activeElement?.matches('input,textarea,select'))return;
   if(force||!decisionPending){bridge.applySnapshot(payload);revision=newRev;status('Atualizado com as alterações dos demais gerentes.');$('cloudLastSync').textContent='Última atualização: '+new Date().toLocaleTimeString('pt-BR');}
  }finally{loading=false;}
 }
 async function manualDownload(){if(!team)return;
  if(!confirm('Isso substituirá os dados deste navegador pelos dados atuais da equipe. Deseja continuar? Um backup local será baixado antes.'))return;
  try{bridge.backup();const r=await client.from('plantao_snapshots').select('payload,revision').eq('team_id',team.id).single();if(r.error)throw r.error;if(!Array.isArray(r.data.payload?.shifts)){status('Equipe online sem dados. Use “Enviar meus dados”.');return;}
   bridge.applySnapshot(r.data.payload);revision=Number(r.data.revision);dirty=false;conflict=false;decisionPending=false;status('Dados da equipe carregados neste aparelho. Sincronização ativa.');$('cloudLastSync').textContent='Sincronizado às '+new Date().toLocaleTimeString('pt-BR');
  }catch(e){status('Falha ao baixar: '+e.message,true);}
 }
 async function manualUpload(){if(!team)return;
  if(!confirm('Enviar os dados DESTE aparelho para a equipe? Isso poderá substituir o conteúdo atual da nuvem, inclusive dados dos outros gerentes.'))return;
  try{const r=await client.from('plantao_snapshots').select('revision').eq('team_id',team.id).single();if(r.error)throw r.error;revision=Number(r.data.revision);decisionPending=false;conflict=false;dirty=true;changeSequence++;await pushCloud();}
  catch(e){status('Falha ao enviar: '+e.message,true);}
 }
 function onLocalChange(){if(!team||!user)return;dirty=true;changeSequence++;if(decisionPending||conflict){status('Mudanças locais pendentes. Escolha baixar ou enviar os dados.',true);return;}clearTimeout(pushTimer);pushTimer=setTimeout(pushCloud,700);}
 async function pushCloud(){if(!team||!user||pushing||decisionPending||conflict||!dirty)return;pushing=true;clearTimeout(pushTimer);const seq=changeSequence;
  try{
   const result=await client.rpc('plantao_update_snapshot',{p_team:team.id,p_expected_revision:revision,p_payload:bridge.snapshot()});
   if(result.error)throw result.error;
   const updated=Number(result.data);
   if(updated<0){conflict=true;status('Edição simultânea detectada. Ninguém foi sobrescrito. Faça backup e escolha entre baixar a versão online ou enviar a local.',true);return;}
   revision=updated;dirty=changeSequence!==seq;status('Alterações sincronizadas com a equipe.');$('cloudLastSync').textContent='Enviado às '+new Date().toLocaleTimeString('pt-BR');
  }catch(e){dirty=true;status('Falha ao sincronizar: '+e.message+'. Os dados continuam salvos localmente.',true);}
  finally{pushing=false;if(dirty&&!conflict&&!decisionPending){clearTimeout(pushTimer);pushTimer=setTimeout(pushCloud,2000);}}
 }
 async function createTeam(){const name=$('cloudTeamName').value.trim();if(name.length<2)throw new Error('Digite o nome da unidade.');const result=await ensureClient().rpc('plantao_create_team',{p_name:name});if(result.error)throw result.error;const newTeam=result.data;
  await listTeams();message('cloudTeamMessage',`Equipe criada! CÓDIGO DE CONVITE (copie e guarde): ${newTeam.invite_code}\nAtenção: o código não aparecerá novamente.`,false);
  const found=await membership(newTeam.team_id);if(found)await chooseTeam(found);
  message('cloudTeamMessage',`Equipe criada. Guarde o código de convite antes de sair desta tela: ${newTeam.invite_code}\nAgora escolha enviar os dados ou baixar uma versão da nuvem.`,false);
 }
 async function joinTeam(){const code=$('cloudInviteInput').value.trim();if(code.length<15)throw new Error('Informe o código completo de convite.');const r=await ensureClient().rpc('plantao_join_team',{p_code:code});if(r.error)throw r.error;await listTeams();const found=await membership(r.data);if(found)await chooseTeam(found);$('cloudInviteInput').value='';}
 function setup(){
  const conf=config();if(conf){$('cloudUrl').value=conf.url;$('cloudKey').value=conf.key;}
  $('cloudConfigForm').addEventListener('submit',e=>{e.preventDefault();const url=$('cloudUrl').value.trim().replace(/\/$/,''),key=$('cloudKey').value.trim();if(!url.startsWith('https://')||key.length<20)return message('cloudConfigMessage','Confira a URL HTTPS e a chave pública.',true);localStorage.setItem(CONFIG_KEY,JSON.stringify({url,key}));location.reload();});
  $('cloudLoginForm').addEventListener('submit',async e=>{e.preventDefault();try{const email=$('cloudEmail').value.trim();const redirect=location.origin==='null'?undefined:location.origin+location.pathname;const options=redirect?{emailRedirectTo:redirect}:undefined;const r=await ensureClient().auth.signInWithOtp({email,options});if(r.error)throw r.error;message('cloudAuthMessage','Enviamos o link de acesso para seu e-mail. Abra o link no mesmo navegador.');}catch(err){message('cloudAuthMessage',err.message,true);}});
  $('cloudLogout').addEventListener('click',async()=>{if(client)await client.auth.signOut();resetTeam();user=null;setViews();});
  $('cloudCreateTeamForm').addEventListener('submit',async e=>{e.preventDefault();try{await createTeam();}catch(err){status('Falha ao criar equipe: '+err.message,true);}});
  $('cloudJoinTeamForm').addEventListener('submit',async e=>{e.preventDefault();try{await joinTeam();}catch(err){status('Falha ao entrar na equipe: '+err.message,true);}});
  $('cloudDownload').addEventListener('click',manualDownload);
  $('cloudUpload').addEventListener('click',manualUpload);
  $('cloudDetach').addEventListener('click',resetTeam);
  $('cloudTeamList').addEventListener('click',async e=>{const btn=e.target.closest('[data-connect-team]');if(!btn)return;try{const found=await membership(btn.dataset.connectTeam);if(found)await chooseTeam(found);}catch(err){status(err.message,true);}});
  setViews();initClient();
 }
 window.PlantaoSync={onLocalChange};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
