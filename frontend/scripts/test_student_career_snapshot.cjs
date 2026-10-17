require('./run_test.cjs');
const assert=require('node:assert/strict'),Module=require('node:module'),fs=require('node:fs'),path=require('node:path');
let client;
const original=Module._load;
Module._load=function(name,parent,...rest){if(name.includes('utils/supabase/server'))return {createClient:async()=>client};return original.call(this,name,parent,...rest);};
const {serializeStudentSnapshot,handleStudentCareerRequest}=require('../lib/studentCareerSnapshot.ts');
const {NextRequest}=require('next/server');
const id=n=>`c0000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const snapshot=()=>({career:{id:id(10),slug:'test-career',name:'Test Career',status:'published'},skills:[1,2].map(n=>({id:id(n),slug:'skill-'+n,name:'Skill '+n,status:'published',display_order:n})),mappings:[{skill_id:id(2),importance:'required',proficiency_target:'working',is_core:true,display_order:1}],edges:[{source_skill_id:id(1),target_skill_id:id(2),relationship_type:'prerequisite'}]});
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
const bad=(s,code)=>assert.throws(()=>serializeStudentSnapshot(s,id(10)),e=>e.code===code);
function mock({user={id:id(100)},role='student',target=id(10),dbError=null,rpcError=null,rpc=snapshot(),career=true}={}){
 const calls=[];
 return {calls,auth:{getUser:async()=>({data:{user},error:null})},from(table){let update;
   const query={select(){return query;},eq(column,value){calls.push({table,column,value});return query;},update(value){update=value;calls.push({table,update});return query;},maybeSingle:async()=>({data:table==='profiles'?(update?{target_career_id:update.target_career_id}:{role,target_career_id:target}):career?{id:id(10)}:null,error:dbError})};return query;},rpc:async(...args)=>{calls.push({rpc:args});return {data:rpc,error:rpcError};}};
}
function request(body,query=''){return new NextRequest('http://localhost/api/student/target-career'+query,body===undefined?{}:{method:'PUT',body:JSON.stringify(body)});}
(async()=>{
 await test('minimal deterministic own-career projection',()=>{const s=snapshot(),p=serializeStudentSnapshot(s,id(10));assert.deepEqual(p.skills.map(s=>s.id),[id(1),id(2)]);assert.equal(p.careerSkillMappings[0].proficiency,'working');assert.deepEqual(Object.keys(p.career),['id','slug','name']);s.skills.reverse();assert.deepEqual(serializeStudentSnapshot(s,id(10)),p);});
 await test('optional mapping preserved',()=>{const s=snapshot();s.mappings.push({skill_id:id(1),importance:'optional',proficiency_target:'beginner',is_core:false,display_order:2});assert.equal(serializeStudentSnapshot(s,id(10)).careerSkillMappings[0].importance,'optional');});
 await test('draft career rejected',()=>{const s=snapshot();s.career.status='draft';bad(s,'SKILL_GRAPH_INVALID');});
 await test('wrong target rejected',()=>{const s=snapshot();s.career.id=id(11);bad(s,'SKILL_GRAPH_INVALID');});
 await test('unpublished skill rejected',()=>{const s=snapshot();s.skills[0].status='draft';bad(s,'SKILL_GRAPH_INVALID');});
 await test('invalid graph fails closed',()=>{const s=snapshot();s.edges[0].source_skill_id=id(99);bad(s,'SKILL_GRAPH_INVALID');});
 await test('cycle rejected',()=>{const s=snapshot();s.edges.push({source_skill_id:id(2),target_skill_id:id(1),relationship_type:'prerequisite'});bad(s,'SKILL_GRAPH_CYCLE');});
 await test('empty requirements rejected',()=>{const s=snapshot();s.mappings=[];bad(s,'NO_PUBLISHED_REQUIREMENTS');});
 await test('node bound enforced',()=>{const s=snapshot();s.skills=Array(5001).fill(s.skills[0]);bad(s,'GRAPH_LIMIT_EXCEEDED');});
 await test('edge bound enforced',()=>{const s=snapshot();s.edges=Array(20001).fill(s.edges[0]);bad(s,'GRAPH_LIMIT_EXCEEDED');});
 await test('malformed snapshot rejected',()=>bad(null,'SKILL_GRAPH_INVALID'));
 await test('admin metadata cannot pass through',()=>{const s=snapshot();s.career.secret='hidden';bad(s,'SKILL_GRAPH_INVALID');});
 await test('duplicate mappings rejected',()=>{const s=snapshot();s.mappings.push({...s.mappings[0]});bad(s,'SKILL_GRAPH_INVALID');});
 await test('invalid proficiency rejected',()=>{const s=snapshot();s.mappings[0].proficiency_target='expert';bad(s,'SKILL_GRAPH_INVALID');});
 await test('anonymous API returns 401',async()=>{client=mock({user:null});assert.equal((await handleStudentCareerRequest(request())).status,401);assert.equal(client.calls.length,0);});
 await test('admin API returns 403',async()=>{client=mock({role:'admin'});assert.equal((await handleStudentCareerRequest(request())).status,403);});
 await test('missing target returns controlled 400',async()=>{client=mock({target:null});assert.equal((await handleStudentCareerRequest(request())).status,400);});
 await test('own snapshot RPC has no client identity arguments',async()=>{client=mock();const res=await handleStudentCareerRequest(request());assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(client.calls.find(c=>c.rpc).rpc,['phase_c_student_skill_snapshot']);assert(client.calls.some(c=>c.column==='id'&&c.value===id(100)));});
 for(const key of ['userId','studentId','role','admin','serviceRole','targetUserId','careerId'])await test('reject query '+key,async()=>{client=mock();assert.equal((await handleStudentCareerRequest(request(undefined,'?'+key+'='+id(999)))).status,400);assert(!client.calls.some(c=>c.rpc));});
 await test('DB failure is 503, never empty graph',async()=>{client=mock({rpcError:{message:'SQL internal private detail'}});const res=await handleStudentCareerRequest(request());assert.equal(res.status,503);assert(!(await res.text()).includes('SQL internal'));});
 await test('profile query failure fails closed',async()=>{client=mock({dbError:{message:'database unavailable'}});assert.equal((await handleStudentCareerRequest(request())).status,503);});
 await test('unavailable target maps to 404',async()=>{client=mock({rpcError:{message:'TARGET_CAREER_UNAVAILABLE'}});assert.equal((await handleStudentCareerRequest(request())).status,404);});
 await test('target selection updates own profile only',async()=>{client=mock();assert.equal((await handleStudentCareerRequest(request({targetCareerId:id(10)}),true)).status,200);assert.deepEqual(client.calls.find(c=>c.update).update,{target_career_id:id(10)});assert(client.calls.some(c=>c.table==='profiles'&&c.column==='id'&&c.value===id(100)));});
 await test('target selection rejects unavailable career',async()=>{client=mock({career:false});assert.equal((await handleStudentCareerRequest(request({targetCareerId:id(10)}),true)).status,404);assert(!client.calls.some(c=>c.update));});
 await test('target selection rejects role and user payloads',async()=>{client=mock();assert.equal((await handleStudentCareerRequest(request({targetCareerId:id(10),role:'admin',user_id:id(200)}),true)).status,400);assert(!client.calls.some(c=>c.update));});
 await test('target selection can clear target',async()=>{client=mock();const res=await handleStudentCareerRequest(request({targetCareerId:null}),true);assert.equal(res.status,200);assert.equal((await res.json()).targetCareerId,null);});
 await test('client components contain no service-role access',()=>{for(const root of ['../components','../app/student']){function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())scan(file);else if(/\.tsx?$/.test(file))assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(fs.readFileSync(file,'utf8')),file);}}scan(path.resolve(__dirname,root));}});
 console.log(`STUDENT SNAPSHOT: ${passed} passed / 0 failed (unit/API mocks; real SQL verified separately)`);
})().catch(e=>{console.error(e);process.exitCode=1;});
