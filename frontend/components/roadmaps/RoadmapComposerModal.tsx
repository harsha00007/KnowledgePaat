'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import type { CareerCatalogItem } from '@/types/careerSkillGraph';
import type { ComposerPreview, ComposerResult } from '@/types/roadmapComposer';

export function RoadmapComposerModal({ isOpen, onClose, onGenerated }: { isOpen: boolean; onClose: () => void; onGenerated: () => void }) {
  const [careers,setCareers]=useState<CareerCatalogItem[]>([]);
  const [page,setPage]=useState(1); const [pages,setPages]=useState(1); const [search,setSearch]=useState('');
  const [careerId,setCareerId]=useState(''); const [preview,setPreview]=useState<ComposerPreview|null>(null);
  const [result,setResult]=useState<ComposerResult|null>(null); const [error,setError]=useState('');
  const [loading,setLoading]=useState(false); const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!isOpen)return; const controller=new AbortController();setLoading(true);setError('');
    fetch(`/api/admin/careers?status=published&limit=20&page=${page}&search=${encodeURIComponent(search)}`,{signal:controller.signal})
      .then(async res=>{const data=await res.json();if(!res.ok)throw Error(data.error||'Could not load careers.');return data;})
      .then(data=>{if(!controller.signal.aborted){setCareers(data.items);setPages(Math.max(data.totalPages,1));}})
      .catch(e=>{if(!controller.signal.aborted){setCareers([]);setError(e.message);}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[isOpen,page,search]);
  const reset=()=>{setPreview(null);setResult(null);setError('');};
  const perform=async(generate=false)=>{
    setBusy(true);setError('');
    try{
      const res=await fetch(`/api/admin/roadmaps/compose${generate?'':'/preview'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({careerId,...(generate?{fingerprint:preview?.fingerprint}:{})})});
      const data=await res.json();if(!res.ok)throw Error(data.error||'Composition failed.');
      if(generate){setResult(data);onGenerated();}else{setPreview(data);setResult(null);}
    }catch(e){setError(e instanceof Error?e.message:'Composition failed.'); if(generate)setPreview(null);}
    finally{setBusy(false);}
  };
  return <Modal isOpen={isOpen} onClose={()=>{if(!busy)onClose();}} title="Compose Career Roadmap" className="max-w-3xl">
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">Preview a curriculum from published canonical skills and prerequisites. Generation creates a draft for review in the existing builder.</p>
      <input aria-label="Search published careers" value={search} disabled={busy} onChange={e=>{setSearch(e.target.value);setPage(1);setCareerId('');reset();}} placeholder="Search published careers" className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
      <select aria-label="Career to compose" disabled={busy||loading} value={careerId} onChange={e=>{setCareerId(e.target.value);reset();}} className="w-full p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <option value="">{loading?'Loading careers…':'Select a published career'}</option>
        {careers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="flex items-center justify-between text-sm">
        <Button variant="secondary" size="sm" disabled={busy||loading||page<=1} onClick={()=>{setPage(p=>p-1);setCareerId('');reset();}}>Previous</Button>
        <span>Page {page} of {pages}</span>
        <Button variant="secondary" size="sm" disabled={busy||loading||page>=pages} onClick={()=>{setPage(p=>p+1);setCareerId('');reset();}}>Next</Button>
      </div>
      {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
      <Button variant="secondary" size="md" disabled={!careerId||busy||loading} onClick={()=>perform()} isLoading={busy&&!preview}>Preview Composition</Button>
      {preview&&<div className="space-y-3">
        <h3 className="font-semibold">{preview.roadmap.title}</h3>
        <p className="text-sm">{preview.counts.required} required mapped skills · {preview.counts.prerequisites} added prerequisites · {preview.counts.nodes} nodes · {preview.counts.resources} resource attachments</p>
        {preview.warnings.map(w=><p key={w} className="text-sm text-amber-600">{w}</p>)}
        <div className="max-h-80 overflow-y-auto space-y-4">
          {preview.sections.map(section=><section key={section.slug}><h4 className="font-semibold">{section.sequence}. {section.title}</h4><ol className="list-decimal pl-6 space-y-1 text-sm">
            {section.nodes.map(n=><li key={n.skillId}>{n.title} — {n.importance}{n.is_required?' · required':' · optional'}{n.proficiency_target?` · ${n.proficiency_target}`:''} · {n.resources.length} resources</li>)}
          </ol></section>)}
        </div>
        {!result&&<Button variant="primary" size="md" disabled={busy} isLoading={busy} onClick={()=>perform(true)}>Generate Draft</Button>}
      </div>}
      {result&&<div role="status" className="space-y-2 text-sm"><p>{result.status==='existing'?'Existing roadmap returned unchanged.':'Draft generated.'} {result.nodeCount} nodes; {result.resourceCount} resource attachments.</p>
        {result.warnings.map(w=><p key={w}>{w}</p>)}
        <Link className="underline font-semibold" href={`/admin/roadmaps/${result.roadmapId}`}>Open Roadmap Builder</Link>
      </div>}
    </div>
  </Modal>;
}
