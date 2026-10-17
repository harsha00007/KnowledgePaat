// Real delivery readers against a row-limited Supabase mock: 1,201 nodes/progress/resources.
require('./run_test.cjs');const assert=require('node:assert/strict'),Module=require('node:module');
const uuid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const roadmap={id:uuid(8000),slug:'delivery-composer',is_active:true};
const section={id:uuid(8001),roadmap_id:roadmap.id,sequence:1,is_active:true};
const nodes=Array.from({length:1201},(_,i)=>({id:uuid(i+1),section_id:section.id,slug:'skill-'+i,sequence:i+1,is_active:true,career_roadmap_sections:{roadmap_id:roadmap.id,is_active:true}}));
const data={career_roadmaps:[roadmap],career_roadmap_sections:[section],career_roadmap_nodes:nodes,
 career_roadmap_node_topics:nodes.map(n=>({id:n.id,node_id:n.id,topic:'Topic',sequence:1})),
 career_roadmap_node_relationships:nodes.slice(0,-1).map((n,i)=>({id:n.id,source_node_id:n.id,target_node_id:nodes[i+1].id,relationship_type:'PREREQUISITE'})),
 career_roadmap_node_resources:nodes.map(n=>({id:n.id,node_id:n.id,resource_id:uuid(9000),priority:7,is_recommended:true,career_resources:{id:uuid(9000),title:'Curated',is_active:true}})),
 career_user_roadmap_progress:nodes.map(n=>({node_id:n.id,user_id:uuid(9999),status:'done',career_roadmap_nodes:{is_active:true,career_roadmap_sections:{roadmap_id:roadmap.id,is_active:true}}}))};
let requests=0,failResources=false;const value=(r,k)=>k.split('.').reduce((o,key)=>o?.[key],r);
const client={rpc:async()=>({data:[{slug:roadmap.slug,is_active:true}],error:null}),from(table){requests++;let rows=data[table]||[],range=[0,999],single=false;const q={select(){return q},eq(k,v){rows=rows.filter(r=>value(r,k)===v);return q},in(k,ids){assert(ids.length<=100,'REST ID batches must be bounded');rows=rows.filter(r=>ids.includes(value(r,k)));return q},order(){return q},range(a,b){range=[a,b];return q},maybeSingle(){single=true;return q},then(resolve,reject){return Promise.resolve({data:single?rows[0]||null:rows.slice(range[0],range[1]+1),error:failResources&&table==='career_roadmap_node_resources'?{code:'timeout'}:null}).then(resolve,reject)}};return q;}};
const original=Module._load;Module._load=function(r){if(r==='@/utils/supabase/server')return{createClient:async()=>client};return original.apply(this,arguments);};
const {getAdminRoadmapDetail,getPublicRoadmapBySlug}=require('../lib/roadmap.ts');const {getUserRoadmapProgress}=require('../lib/progress.ts');const {getNodesResourcesMap}=require('../lib/resource.ts');
(async()=>{
let passed=0;
const admin=await getAdminRoadmapDetail(roadmap.id);assert.equal(admin.stats.total_nodes,1201);assert.equal(admin.relationships.length,1200);assert.equal(admin.sections[0].nodes.at(-1).resources[0].resource_id,uuid(9000));console.log('PASS existing builder reads 1201 nodes, relationships and reused resources');passed++;
const publicDetail=await getPublicRoadmapBySlug(roadmap.slug);assert.equal(publicDetail.stats.total_nodes,1201);assert.equal(publicDetail.relationships.length,1200);console.log('PASS existing public viewer reads complete generated hierarchy');passed++;
const progress=await getUserRoadmapProgress(uuid(9999),roadmap.slug);assert.equal(Object.keys(progress).length,1201);assert.equal(progress[uuid(1201)],'done');console.log('PASS existing progress reader retains 1201 canonical node identities');passed++;
const all=await getUserRoadmapProgress(uuid(9999));assert.equal(Object.keys(all).length,1201);console.log('PASS all-user progress traverses REST row ceiling');passed++;
assert(requests<120,'Queries use bounded batches rather than one per node');console.log('PASS delivery queries remain bounded');passed++;
failResources=true;await assert.rejects(()=>getNodesResourcesMap([uuid(1)]));console.log('PASS resource query failure cannot masquerade as no resources');passed++;
console.log(`DELIVERY: ${passed} passed / 0 failed`);
})().catch(e=>{console.error(e);process.exitCode=1;});
