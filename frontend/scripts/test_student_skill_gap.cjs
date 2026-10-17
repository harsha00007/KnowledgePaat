require('./run_test.cjs');
const assert = require('node:assert/strict'), Module = require('node:module'), fs = require('node:fs'), path = require('node:path');
let client;
const original = Module._load;
Module._load = function(name,parent,...rest) {
  if (name === 'server-only') return {};
  if (name.includes('utils/supabase/server')) return {createClient:async()=>client};
  return original.call(this,name,parent,...rest);
};
const {handleStudentSkillGap,adaptStudentEvidence,skillGapResponse} = require('../lib/studentSkillGap.ts');
const {serializeStudentSnapshot} = require('../lib/studentCareerSnapshot.ts');
const {deriveSkillGapSemantics} = require('../lib/skillGapSemantics.ts');
const {GET} = require('../app/api/student/skill-gap/route.ts');
const {NextRequest} = require('next/server');
const id = n => `c0000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const raw = () => ({career:{id:id(10),slug:'career',name:'Career',status:'published'},skills:[1,2].map(n=>({id:id(n),slug:'skill-'+n,name:'Skill '+n,status:'published',display_order:n})),mappings:[{skill_id:id(2),importance:'required',proficiency_target:'working',is_core:true,display_order:1}],edges:[{source_skill_id:id(1),target_skill_id:id(2),relationship_type:'prerequisite'}]});
function mock(options={}) {
  const calls=[];
  return {calls,auth:{getUser:async()=>({data:{user:options.anonymous?null:{id:id(options.user||100)}},error:null})},
    rpc:async(...args)=>{calls.push({rpc:args});return {data:options.raw||raw(),error:options.rpcError||null};},
    from(table) {
      const filters=[]; let range=[0,199];
      const q={select(columns){calls.push({table,select:columns});return q;},eq(column,value){filters.push([column,value]);calls.push({table,column,value});return q;},order(column){calls.push({table,order:column});return q;},range(from,to){range=[from,to];calls.push({table,range});return q;},
        maybeSingle:async()=>({data:{role:options.role||'student',target_career_id:options.noTarget?null:id(10),skills:options.claims||[]},error:options.errorTable==='profiles'?{message:'private DB detail'}:null}),
        then(resolve,reject) {
          let rows=options[table]||[];
          const owner=filters.find(([column])=>column==='student_id'||column==='user_id');
          if(owner) rows=rows.filter(row=>!row.owner||row.owner===owner[1]);
          return Promise.resolve({data:rows.slice(range[0],range[1]+1),error:options.errorTable===table?{message:'private DB detail'}:null}).then(resolve,reject);
        }};
      return q;
    }};
}
const request=query=>new NextRequest('http://localhost/api/student/skill-gap'+(query||''));
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
async function run(options={},query=''){client=mock(options);const response=await GET(request(query));return {response,body:await response.json(),calls:client.calls};}
(async()=>{
  await test('anonymous 401 without reads',async()=>{const r=await run({anonymous:true});assert.equal(r.response.status,401);assert.equal(r.calls.length,0);});
  await test('nonstudent 403',async()=>assert.equal((await run({role:'admin'})).response.status,403));
  await test('missing career controlled error not empty success',async()=>{const r=await run({noTarget:true});assert.equal(r.response.status,400);assert.equal(r.body.code,'TARGET_CAREER_REQUIRED');assert(!r.body.skills);});
  await test('student success via exported GET',async()=>{const r=await run();assert.equal(r.response.status,200);assert.equal(r.body.skills.length,2);assert.equal(r.response.headers.get('Cache-Control'),'private, no-store');});
  await test('handler rejects request body',async()=>{client=mock();const req=new NextRequest('http://localhost/api/student/skill-gap',{method:'POST',body:JSON.stringify({userId:id(200)})});assert.equal((await handleStudentSkillGap(req)).status,400);assert(!client.calls.some(c=>c.rpc));});
  for(const key of ['userId','studentId','role','admin','targetUserId','careerId']) await test('reject client selector '+key,async()=>{const r=await run({},'?'+key+'='+id(200));assert.equal(r.response.status,400);assert(!r.calls.some(c=>c.rpc));});
  await test('own evidence and defense in depth filters',async()=>{
    const r=await run({student_test_attempts:[{id:id(50),owner:id(100)},{id:id(51),owner:id(200)}]});
    assert.deepEqual(r.body.unassignedAssessmentSourceIds,[id(50)]);
    for(const [table,column] of [['profiles','id'],['career_user_roadmap_progress','user_id'],['career_plan_tasks','student_id'],['student_test_attempts','student_id']]) assert(r.calls.some(c=>c.table===table&&c.column===column&&c.value===id(100)));
    assert(r.calls.some(c=>c.column==='career_improvement_plans.student_id'&&c.value===id(100)));
  });
  await test('student B session scoped independently',async()=>{const r=await run({user:200,student_test_attempts:[{id:id(50),owner:id(100)},{id:id(51),owner:id(200)}]});assert.deepEqual(r.body.unassignedAssessmentSourceIds,[id(51)]);});
  await test('C1 RPC no identity arguments or admin RPC',async()=>assert.deepEqual((await run()).calls.filter(c=>c.rpc).map(c=>c.rpc),[['phase_c_student_skill_snapshot']]));
  await test('C1 authorization error enforced',async()=>assert.equal((await run({rpcError:{message:'FORBIDDEN'}})).response.status,403));
  await test('unavailable career 404',async()=>assert.equal((await run({rpcError:{message:'TARGET_CAREER_UNAVAILABLE'}})).response.status,404));
  await test('draft snapshot rejected',async()=>{const s=raw();s.career.status='draft';assert.equal((await run({raw:s})).response.status,422);});
  await test('target race rejected',async()=>{const s=raw();s.career.id=id(11);assert.equal((await run({raw:s})).response.status,409);});
  await test('profile claims no proficiency',async()=>{const r=await run({claims:['Skill 2']});assert.equal(r.body.skills.find(s=>s.skillId===id(2)).evidenceState,'CLAIMED');assert.equal(r.body.skills.find(s=>s.skillId===id(2)).currentProficiency,null);});
  for(const status of ['learning','done','skip']) await test('roadmap '+status+' never mastery',async()=>{const r=await run({career_user_roadmap_progress:[{node_id:id(30),status,career_roadmap_nodes:{slug:'skill-2'}}]});const s=r.body.skills.find(s=>s.skillId===id(2));assert.equal(s.evidenceState,status==='skip'?'UNKNOWN':'ACTIVITY');assert.equal(s.skipped,status==='skip');assert.equal(s.currentProficiency,null);});
  await test('task completion activity only',async()=>{const r=await run({career_plan_tasks:[{id:id(40),related_skill:'Skill 2',status:'completed'}]});assert.equal(r.body.skills.find(s=>s.skillId===id(2)).evidenceState,'ACTIVITY');assert(r.body.skills.every(s=>!s.verified));});
  await test('unmapped assessments remain unassigned activity',async()=>{const r=await run({student_test_attempts:[{id:id(50)}]});assert.deepEqual(r.body.unassignedAssessmentSourceIds,[id(50)]);assert(r.body.skills.every(s=>!s.assessmentPresent&&!s.verified));});
  await test('no evidence unknown required gap and prerequisite target null',async()=>{const r=await run();const p=r.body.skills.find(s=>s.skillId===id(1)),s=r.body.skills.find(s=>s.skillId===id(2));assert.equal(p.targetProficiency,null);assert.equal(p.status,'PREREQUISITE_UNVERIFIED');assert.equal(s.status,'GAP');assert.equal(s.currentProficiency,null);assert.deepEqual(s.blockedBy,[id(1)]);assert(!s.actionable);});
  await test('resolved prerequisite domain projection actionable; synthetic authoritative fact only',()=>{const s=serializeStudentSnapshot(raw(),id(10));const result=skillGapResponse(deriveSkillGapSemantics(s,[],[{skillId:id(1),sourceId:'synthetic-authority',proficiency:'working'}]));assert.equal(result.topGaps[0].skillId,id(2));assert(result.topGaps[0].actionable);});
  await test('summary derived from semantic rows',async()=>assert.deepEqual((await run()).body.summary,{requiredSkills:1,gaps:1,satisfied:0,blocked:1}));
  await test('same input deterministic response',async()=>assert.deepEqual((await run({claims:['Skill 2']})).body,(await run({claims:['Skill 2']})).body));
  await test('source order does not affect priorities',async()=>{const s=raw(),a=(await run({raw:s})).body;s.skills.reverse();assert.deepEqual((await run({raw:s})).body,a);});
  for(const table of ['profiles','career_user_roadmap_progress','career_plan_tasks','student_test_attempts']) await test(table+' database error controlled 500',async()=>{const r=await run({errorTable:table});assert.equal(r.response.status,500);assert(!r.body.skills);assert(!JSON.stringify(r.body).includes('private'));});
  await test('unknown RPC failure controlled 500',async()=>assert.equal((await run({rpcError:{message:'private DB detail'}})).response.status,500));
  await test('invalid graph controlled 422',async()=>{const s=raw();s.edges[0].source_skill_id=id(99);assert.equal((await run({raw:s})).response.status,422);});
  await test('pagination complete beyond API default batch',async()=>{const r=await run({student_test_attempts:Array.from({length:201},(_,n)=>({id:id(1000+n)}))});assert.equal(r.body.unassignedAssessmentSourceIds.length,201);assert.equal(r.calls.filter(c=>c.table==='student_test_attempts'&&c.range).length,2);});
  await test('exact ambiguous labels not guessed',()=>{const s=serializeStudentSnapshot(raw(),id(10));s.skills[1].name=s.skills[0].name;assert.equal(adaptStudentEvidence(s,['Skill 1'],[],[],[]).length,0);});
  await test('malformed evidence fails closed',async()=>assert.equal((await run({claims:{bad:true}})).response.status,500));
  await test('progress scoped to active target composed roadmap',async()=>{const r=await run();assert(r.calls.some(c=>c.column?.endsWith('composer_career_id')&&c.value===id(10)));assert(r.calls.some(c=>c.column==='career_roadmap_nodes.node_type'&&c.value==='SKILL'));assert.equal(r.calls.filter(c=>c.column?.endsWith('is_active')).length,3);});
  await test('server-only API has no service role or admin operation',()=>{const source=fs.readFileSync(path.resolve(__dirname,'../lib/studentSkillGap.ts'),'utf8');assert(source.includes("import 'server-only'"));assert(!/SERVICE_ROLE|phase_b_composer|phase_b_compose/.test(source));});
  await test('Phase B RPC security definition unchanged and explicit admin gate',()=>{const sql=fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/roadmap_composer_phase_b.sql'),'utf8');assert(/is_admin\(\)/.test(sql));assert(/REVOKE/.test(sql));});
  console.log(`STUDENT SKILL GAP: ${passed} passed / 0 failed (local service/API fixtures, not remote Supabase)`);
})().catch(error=>{console.error(error);process.exitCode=1;});
