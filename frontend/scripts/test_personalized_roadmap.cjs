require('./run_test.cjs');
const assert=require('node:assert/strict'),Module=require('node:module'),fs=require('node:fs'),path=require('node:path');
let client,resourceRows=[],resourceCalls=[],resourceFailure=false;
const original=Module._load;
Module._load=function(name,parent,...rest){
  if(name==='server-only')return {};
  if(name.includes('utils/supabase/server'))return {createClient:async()=>client};
  if(name==='./resource'&&parent.filename.endsWith('studentPersonalizedRoadmap.ts'))return {getNodesResourcesMap:async(ids,active)=>{resourceCalls.push({ids,active});if(resourceFailure)throw Error('private resource detail');const map={};for(const row of resourceRows.filter(r=>!active||r.is_active)){(map[row.node_id]??=[]).push(row);}return map;}};
  return original.call(this,name,parent,...rest);
};
const {projectPersonalizedRoadmap}=require('../lib/personalizedRoadmapProjection.ts');
const {serializeStudentSnapshot}=require('../lib/studentCareerSnapshot.ts');
const {deriveSkillGapSemantics}=require('../lib/skillGapSemantics.ts');
const {GET}=require('../app/api/student/personalized-roadmap/route.ts');
const {NextRequest}=require('next/server');
const id=n=>`c0000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const raw=()=>({career:{id:id(10),slug:'career',name:'Career',status:'published'},skills:[1,2,3].map(n=>({id:id(n),slug:'skill-'+n,name:'Skill '+n,status:'published',display_order:n})),mappings:[2,3].map(n=>({skill_id:id(n),importance:n===2?'required':'recommended',proficiency_target:'working',is_core:n===2,display_order:n})),edges:[{source_skill_id:id(1),target_skill_id:id(2),relationship_type:'prerequisite'}]});
const curriculum=()=>({roadmap:{id:id(20),title:'Existing Roadmap',composer_career_id:id(10),composer_version:1,is_active:true},sections:[{id:id(21),roadmap_id:id(20),title:'Skills',sequence:1,is_active:true}],nodes:[1,2,3].map(n=>({id:id(30+n),section_id:id(21),title:'Skill '+n,slug:'skill-'+n,node_type:'SKILL',sequence:n,is_active:true})),topics:[],resources:[],progress:[]});
function project(c=curriculum(),authoritative=[]){const s=serializeStudentSnapshot(raw(),id(10));return projectPersonalizedRoadmap(s,deriveSkillGapSemantics(s,[],authoritative),c);}
function mock(options={}){
 const c=options.curriculum||curriculum(),calls=[];
 const tables={career_roadmap_sections:c.sections,career_roadmap_nodes:c.nodes,career_roadmap_node_topics:c.topics,career_user_roadmap_progress:c.progress,career_plan_tasks:[],student_test_attempts:[]};
 return {calls,auth:{getUser:async()=>({data:{user:options.anonymous?null:{id:id(options.user||100)}},error:null})},rpc:async(...args)=>{calls.push({rpc:args});return {data:options.raw||raw(),error:options.rpcError||null};},from(table){let from=0,to=199;const filters=[];const q={select(columns){calls.push({table,select:columns});return q;},eq(column,value){filters.push([column,value]);calls.push({table,column,value});return q;},order(){return q;},range(a,b){from=a;to=b;return q;},maybeSingle:async()=>({data:table==='profiles'?{role:options.role||'student',target_career_id:options.noTarget?null:id(10),skills:[]}:options.noRoadmap?null:c.roadmap,error:options.errorTable===table?{message:'private detail'}:null}),then(resolve,reject){let rows=tables[table]||[];const own=filters.find(f=>f[0]==='user_id');if(own)rows=rows.filter(r=>!r.owner||r.owner===own[1]);if(table==='career_user_roadmap_progress'&&calls.filter(x=>x.table===table&&x.select).length===1)rows=[];return Promise.resolve({data:rows.slice(from,to+1),error:options.errorTable===table?{message:'private detail'}:null}).then(resolve,reject);}};return q;}};
}
async function run(options={},query=''){resourceRows=options.resources||[];resourceFailure=!!options.resourceFailure;resourceCalls=[];client=mock(options);const response=await GET(new NextRequest('http://localhost/api/student/personalized-roadmap'+query));return {response,body:await response.json(),calls:client.calls};}
const all=p=>p.roadmap.flatMap(s=>s.nodes);
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('anonymous 401 no reads',async()=>{const r=await run({anonymous:true});assert.equal(r.response.status,401);assert.equal(r.calls.length,0);});
 await test('nonstudent 403',async()=>assert.equal((await run({role:'admin'})).response.status,403));
 await test('missing target controlled 400',async()=>assert.equal((await run({noTarget:true})).body.code,'TARGET_CAREER_REQUIRED'));
 await test('published target success',async()=>{const r=await run();assert.equal(r.response.status,200);assert.equal(r.body.sourceRoadmap.id,id(20));assert.equal(r.response.headers.get('Cache-Control'),'private, no-store');});
 await test('missing roadmap 404 no invented fallback',async()=>{const r=await run({noRoadmap:true});assert.equal(r.response.status,404);assert.equal(r.body.code,'ROADMAP_UNAVAILABLE');});
 await test('required gap preserved blocked',()=>{const p=project(),n=all(p).find(n=>n.skillId===id(2));assert.equal(n.gap.status,'GAP');assert.equal(n.state,'BLOCKED');assert.deepEqual(n.gap.blockedBy,[id(1)]);});
 await test('foundation blocks dependent and is next',()=>{const p=project();assert.equal(p.nextAction.skillId,id(1));assert.equal(p.nextAction.state,'SUPPORTING_PREREQUISITE');});
 await test('resolved prerequisite makes required node next; synthetic fact only',()=>{const p=project(curriculum(),[{skillId:id(1),sourceId:'synthetic',proficiency:'working'}]);assert.equal(p.nextAction.skillId,id(2));assert.equal(all(p).find(n=>n.skillId===id(1)).state,'SATISFIED');});
 await test('completed activity excluded without satisfying prerequisite',()=>{const c=curriculum();c.progress=[{node_id:id(31),status:'done'}];const p=project(c);assert.equal(all(p).find(n=>n.nodeId===id(31)).state,'COMPLETED');assert.notEqual(p.nextAction?.nodeId,id(31));assert.equal(all(p).find(n=>n.nodeId===id(32)).gap.blocked,true);assert.equal(all(p).find(n=>n.nodeId===id(31)).gap.currentProficiency,null);});
 await test('learning progress preserved actionable',()=>{const c=curriculum();c.progress=[{node_id:id(31),status:'learning'}];const p=project(c);assert.equal(p.nextAction.nodeId,id(31));assert.equal(p.summary.inProgressNodes,1);});
 await test('skip no proficiency remains eligible',()=>{const c=curriculum();c.progress=[{node_id:id(31),status:'skip'}];const p=project(c);assert.equal(p.nextAction.nodeId,id(31));assert.equal(all(p)[0].gap.currentProficiency,null);});
 await test('blocked node never next or upcoming',()=>{const p=project();assert.notEqual(p.nextAction.nodeId,id(32));assert(!p.upcoming.includes(id(32)));});
 await test('same input same output no mutation',()=>{const c=curriculum(),before=JSON.stringify(c);assert.deepEqual(project(c),project(c));assert.equal(JSON.stringify(c),before);});
 await test('source order stable',()=>{const c=curriculum(),p=project(c);c.nodes.reverse();assert.deepEqual(project(c),p);});
 await test('UUID tie breaker stable',()=>{const c=curriculum();c.nodes.push({...c.nodes[2],id:id(39),slug:'unmapped-a',sequence:3});c.nodes.push({...c.nodes[2],id:id(38),slug:'unmapped-b',sequence:3});const p=project(c);assert.deepEqual(all(p).filter(n=>!n.skillId).map(n=>n.nodeId),[id(38),id(39)]);});
 await test('missing curriculum preserves gap and warning',()=>{const c=curriculum();c.nodes=c.nodes.filter(n=>n.slug!=='skill-2');const p=project(c);assert(p.skills.some(s=>s.skillId===id(2)));assert(p.warnings.some(w=>w.skillId===id(2)&&w.code==='NO_CURRICULUM_MAPPING'));});
 await test('ambiguous mapping not selected',()=>{const c=curriculum();c.nodes.push({...c.nodes[0],id:id(39)});const p=project(c);assert(p.warnings.some(w=>w.code==='AMBIGUOUS_CURRICULUM_MAPPING'));assert.notEqual(p.nextAction?.skillId,id(1));});
 await test('inactive resources hidden and existing rank preserved',()=>{const c=curriculum();c.resources=[{node_id:id(31),resource_id:id(51),is_active:true},{node_id:id(31),resource_id:id(50),is_active:true},{node_id:id(31),resource_id:id(52),is_active:false}];assert.deepEqual(all(project(c))[0].resources,[{resourceId:id(51)},{resourceId:id(50)}]);});
 await test('topics existing IDs preserved',()=>{const c=curriculum();c.topics=[{id:id(61),node_id:id(31),topic:'Existing',sequence:1}];assert.equal(all(project(c))[0].topics[0].id,id(61));});
 await test('bounded projection fails safely',()=>{const c=curriculum();c.nodes=Array(5001).fill(c.nodes[0]);assert.throws(()=>project(c),e=>e.code==='CURRICULUM_LIMIT_EXCEEDED');});
 await test('foreign career rejected',()=>{const c=curriculum();c.roadmap.composer_career_id=id(11);assert.throws(()=>project(c),e=>e.code==='CURRICULUM_INVALID');});
 await test('inactive roadmap rejected',()=>{const c=curriculum();c.roadmap.is_active=false;assert.throws(()=>project(c));});
 await test('wrong progress node rejected',()=>{const c=curriculum();c.progress=[{node_id:id(999),status:'done'}];assert.throws(()=>project(c));});
 await test('unknown content not actionable',()=>{const c=curriculum();c.nodes.push({...c.nodes[0],id:id(39),node_type:'TOPIC'});const n=all(project(c)).find(n=>n.nodeId===id(39));assert.equal(n.state,'NOT_YET_RELEVANT');assert.equal(n.skillId,null);});
 await test('bounded upcoming at most ten',()=>assert(project().upcoming.length<=10));
 for(const table of ['career_roadmaps','career_roadmap_sections','career_roadmap_nodes','career_roadmap_node_topics'])await test(table+' DB error not empty success',async()=>{const r=await run({errorTable:table});assert.equal(r.response.status,500);assert(!r.body.roadmap);assert(!JSON.stringify(r.body).includes('private'));});
 for(const key of ['studentId','userId','careerId'])await test('IDOR selector rejected '+key,async()=>assert.equal((await run({},'?'+key+'='+id(200))).response.status,400));
 await test('own progress and career filters',async()=>{const r=await run();assert(r.calls.some(c=>c.column==='user_id'&&c.value===id(100)));assert(r.calls.some(c=>c.table==='career_roadmaps'&&c.column==='composer_career_id'&&c.value===id(10)));assert.deepEqual(r.calls.filter(c=>c.rpc).map(c=>c.rpc),[['phase_c_student_skill_snapshot']]);});
 await test('student B progress excluded',async()=>{const c=curriculum();c.progress=[{node_id:id(31),status:'done',owner:id(200)}];assert.equal((await run({curriculum:c})).body.summary.completedNodes,0);});
 await test('batch resources once no per node queries',async()=>{const r=await run();assert.equal(resourceCalls.length,1);assert.equal(resourceCalls[0].active,true);assert.deepEqual(resourceCalls[0].ids,[id(31),id(32),id(33)]);assert.equal(r.calls.filter(c=>c.table==='career_roadmap_nodes'&&c.select).length,1);});
 await test('resource failure controlled not empty success',async()=>{const r=await run({resourceFailure:true});assert.equal(r.response.status,500);assert(!JSON.stringify(r.body).includes('private'));});
 await test('service node bound no silent truncation',async()=>{const c=curriculum();c.nodes=Array(5001).fill(c.nodes[0]);const r=await run({curriculum:c});assert.equal(r.response.status,422);assert.equal(r.body.code,'CURRICULUM_LIMIT_EXCEEDED');});
 await test('fifty nodes still one resource batch invocation',async()=>{const c=curriculum();c.nodes=Array.from({length:50},(_,n)=>({...c.nodes[0],id:id(1000+n),slug:'unmapped-'+n}));const r=await run({curriculum:c});assert.equal(r.response.status,200);assert.equal(resourceCalls.length,1);assert.equal(resourceCalls[0].ids.length,50);assert.equal(r.calls.filter(c=>c.table==='career_roadmap_nodes'&&c.select).length,1);});
 await test('C1 role denial enforced',async()=>assert.equal((await run({rpcError:{message:'FORBIDDEN'}})).response.status,403));
 await test('unpublished C1 career rejected',async()=>{const s=raw();s.career.status='draft';assert.equal((await run({raw:s})).response.status,422);});
 await test('server-only no service role or admin RPC',()=>{const source=fs.readFileSync(path.resolve(__dirname,'../lib/studentPersonalizedRoadmap.ts'),'utf8');assert(source.includes("import 'server-only'"));assert(!/SERVICE_ROLE|phase_b_composer_snapshot|phase_b_compose_roadmap/.test(source));});
 console.log(`PERSONALIZED ROADMAP: ${passed} passed / 0 failed (pure/service/API fixtures; remote gate separate)`);
})().catch(e=>{console.error(e);process.exitCode=1;});
