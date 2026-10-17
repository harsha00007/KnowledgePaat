// Requires a dedicated local PostgreSQL/Supabase test database; never production.
const {spawn, spawnSync}=require('node:child_process');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const connection=process.env.PHASE_A_TEST_DATABASE_URL;
if(!connection){console.log('BLOCKED: PHASE_A_TEST_DATABASE_URL unavailable');process.exit(2)}
const url=new URL(connection);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/knowledgepaat_phase_a_test') throw new Error('Dedicated local test database required');
// libpq does not parse a connection URI supplied through PGDATABASE.
// Keep credentials in child environment variables, never command arguments.
const env={...process.env,PGDATABASE:url.pathname.slice(1),PGHOST:url.hostname.replace(/^\[|\]$/g,''),PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)};
if(spawnSync('psql',['--version'],{env}).error){console.log('BLOCKED: psql unavailable');process.exit(2)}
function sql(text){return new Promise((resolve,reject)=>{const p=spawn('psql',['-X','-v','ON_ERROR_STOP=1','-q','-A','-t'],{env});let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);p.on('error',reject);p.on('close',code=>resolve({code,out}));p.stdin.end(text)})}
(async()=>{
 for(const name of ['phase_a_hardening.sql','phase_a_final_verification.sql']){
   const file=path.resolve(__dirname,'../../supabase/tests',name);
   const result=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1','-f',file],{env,encoding:'utf8'});
   assert.equal(result.status,0,result.stderr);console.log(result.stdout,result.stderr);
 }
 const a=randomUUID(),b=randomUUID();
 const setup=await sql(`INSERT INTO public.skill_catalog(id,slug,name,status) VALUES ('${a}','${a}','Concurrency A','published'),('${b}','${b}','Concurrency B','published');`);
 assert.equal(setup.code,0,setup.out);
 try{
   const results=await Promise.all([
     sql(`BEGIN; INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES('${a}','${b}'); SELECT pg_sleep(1); COMMIT;`),
     sql(`BEGIN; INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES('${b}','${a}'); COMMIT;`)
   ]);
   assert.equal(results.filter(r=>r.code===0).length,1,'Exactly one opposing transaction must commit');
   assert(results.some(r=>r.out.includes('cycle')),'Loser must be rejected for a cycle');
   const verified=await sql(`SELECT count(*) FROM public.skill_relationships WHERE source_skill_id IN ('${a}','${b}') AND target_skill_id IN ('${a}','${b}');`);
   assert.equal(verified.code,0,verified.out);assert.equal(verified.out.trim(),'1','Only one edge remains after the race');
   console.log('PASS concurrent opposing prerequisite writes');
   const locked=await Promise.all([
     sql('BEGIN; SELECT pg_advisory_xact_lock(73104,1); SELECT pg_sleep(1); COMMIT;'),
     sql(`SELECT pg_sleep(0.1); SET lock_timeout='100ms'; INSERT INTO public.skill_catalog(slug,name) VALUES('verification-lock-timeout','Must not persist');`)
   ]);
   assert.equal(locked[0].code,0,locked[0].out);assert.notEqual(locked[1].code,0);assert(locked[1].out.includes('lock timeout'));
   const absent=await sql("SELECT count(*) FROM public.skill_catalog WHERE slug='verification-lock-timeout';");assert.equal(absent.code,0,absent.out);assert.equal(absent.out.trim(),'0');
   console.log('PASS serialized mutation blocks and database timeout leaves no inserted row');
 }finally{const cleaned=await sql(`DELETE FROM public.skill_catalog WHERE id IN ('${a}','${b}');`);assert.equal(cleaned.code,0,cleaned.out)}
})().catch(e=>{console.error(e.message);process.exitCode=1});
