// Dedicated local cluster only. Direct SQL plus real TypeScript planner against SQL snapshots.
require('./run_test.cjs');
const {spawn,spawnSync}=require('node:child_process'); const {randomUUID}=require('node:crypto');
const path=require('node:path'); const assert=require('node:assert/strict');
const {buildComposerPlan}=require('../lib/roadmapComposerPlan.ts');
const connection=process.env.PHASE_A_TEST_DATABASE_URL;
if(!connection){console.log('BLOCKED: PHASE_A_TEST_DATABASE_URL missing');process.exit(2);}
const url=new URL(connection);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/knowledgepaat_phase_a_test')throw Error('Dedicated local test database required');
const env={...process.env,PGDATABASE:url.pathname.slice(1),PGHOST:url.hostname.replace(/^\[|\]$/g,''),PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password)};
if(spawnSync('psql',['--version'],{env}).error){console.log('BLOCKED: psql unavailable');process.exit(2);}
let passed=0;const literal=s=>"'"+String(s).replace(/'/g,"''")+"'";
function sql(source){return new Promise((resolve,reject)=>{const p=spawn('psql',['-X','-w','-q','-t','-A','-v','ON_ERROR_STOP=1'],{env});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>resolve({code,out,err}));p.stdin.end(source);});}
async function ok(source){const r=await sql(source);assert.equal(r.code,0,r.err);return r.out;}
const json=out=>JSON.parse(out.trim().split(/\r?\n/).filter(l=>l.startsWith('{')).at(-1));
(async()=>{
 const result=spawnSync('psql',['-X','-w','-v','ON_ERROR_STOP=1','-f',path.resolve(__dirname,'../../supabase/tests/phase_b_composer.sql')],{env,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);const groups=(result.stderr.match(/NOTICE:  PASS /g)||[]).length;passed+=groups;console.log(result.stderr.split(/\r?\n/).filter(l=>l.includes('PASS')).join('\n'));
 const admin=randomUUID();await ok(`INSERT INTO auth.users(id,email) VALUES('${admin}','${admin}@example.test'); UPDATE public.profiles SET role='admin' WHERE id='${admin}';`);
 const auth=`SELECT set_config('request.jwt.claim.sub','${admin}',false); SET ROLE authenticated;`;
 try{
  for(const n of [1,5,50,1201]){
   const career=randomUUID(),ids=Array.from({length:n},()=>randomUUID()),prefix='composer-test-'+career;
   try{
    const skills=ids.map((id,i)=>`('${id}','${prefix}-${i}','Skill ${String(i).padStart(4,'0')}','published',${i})`).join(',');
    const roots=n===1201?[ids.at(-1)]:ids;
    const mappings=roots.map((id,i)=>`('${career}','${id}','required',${i})`).join(',');
    const edges=n===1201?`INSERT INTO public.skill_relationships(source_skill_id,target_skill_id) VALUES ${ids.slice(0,-1).map((id,i)=>`('${id}','${ids[i+1]}')`).join(',')};`:'';
    await ok(`BEGIN; INSERT INTO public.skill_catalog(id,slug,name,status,display_order) VALUES ${skills}; INSERT INTO public.career_catalog(id,slug,name,short_description) VALUES('${career}','${prefix}','Composer Test Career','A meaningful test career description'); INSERT INTO public.career_skill_map(career_id,skill_id,importance,display_order) VALUES ${mappings}; ${edges} UPDATE public.career_catalog SET status='published' WHERE id='${career}'; COMMIT;`);
    const envelope=json(await ok(`${auth} SELECT public.phase_b_composer_snapshot('${career}');`));
    const plan=buildComposerPlan(envelope.snapshot,envelope.fingerprint);assert.equal(plan.counts.nodes,n);
    const invoke=`${auth} SELECT public.phase_b_compose_roadmap('${career}','${plan.fingerprint}',ARRAY[${plan.orderedSkillIds.map(literal).join(',')}]::uuid[]);`;
    const responses=await Promise.all([sql(invoke),sql(invoke)]);responses.forEach(r=>assert.equal(r.code,0,r.err));
    const results=responses.map(r=>json(r.out));assert.equal(results.filter(r=>r.status==='created').length,1);assert.equal(results.filter(r=>r.status==='existing').length,1);assert.equal(results[0].roadmapId,results[1].roadmapId);
    const stored=JSON.parse((await ok(`SELECT jsonb_agg(jsonb_build_object('slug',n.slug,'title',n.title,'description',n.description,'sequence',n.sequence,'estimated_minutes',n.estimated_minutes,'is_required',n.is_required,'difficulty',n.difficulty,'node_type',n.node_type) ORDER BY s.sequence,n.sequence) FROM public.career_roadmap_nodes n JOIN public.career_roadmap_sections s ON s.id=n.section_id WHERE s.roadmap_id='${results[0].roadmapId}';`)).trim());
    assert.deepEqual(stored,plan.sections.flatMap(s=>s.nodes.map(({slug,title,description,sequence,estimated_minutes,is_required,difficulty,node_type})=>({slug,title,description,sequence,estimated_minutes,is_required,difficulty,node_type}))));
    const hidden=json(await ok(`SET ROLE anon; SELECT jsonb_build_object('roadmaps',(SELECT count(*) FROM public.career_roadmaps WHERE id='${results[0].roadmapId}'),'sections',(SELECT count(*) FROM public.career_roadmap_sections WHERE roadmap_id='${results[0].roadmapId}'));`));
    assert.deepEqual(hidden,{roadmaps:0,sections:0},'Generated draft and sections must remain hidden publicly');
    passed++;console.log(`PASS ${n} skills: actual snapshot/planner/RPC ordering and concurrent composition identity`);
   }finally{
    await ok(`DELETE FROM public.career_roadmaps WHERE composer_career_id='${career}'; DELETE FROM public.career_catalog WHERE id='${career}'; DELETE FROM public.skill_catalog WHERE id IN (${ids.map(literal).join(',')});`);
   }
  }
 }finally{await ok(`DELETE FROM auth.users WHERE id='${admin}';`);}
 console.log(`DATABASE COMPOSER: ${passed} groups passed / 0 failed / 0 blocked locally`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
