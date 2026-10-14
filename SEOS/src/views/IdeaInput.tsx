import { useState, useEffect } from 'react';
import type { Requirement } from '../types';
import { useStore } from '../store';
import { runPipeline, clearProjectLayers, STAGE_LABEL } from '../lib/pipeline';

export default function IdeaInput() {
  const storeProductIdea = useStore((s) => s.productIdea);
  const setStoreProductIdea = useStore((s) => s.setProductIdea);
  const [idea, setIdea] = useState(storeProductIdea);
  const pipeline = useStore((s) => s.pipeline);
  const isGenerating = pipeline.running;
  const progress = pipeline.planned.length ? (pipeline.done.length / pipeline.planned.length) * 100 : 0;
  const stepText = pipeline.stage
    ? `${STAGE_LABEL[pipeline.stage]} · step ${pipeline.done.length + 1} of ${pipeline.planned.length}`
    : '';

  const requirements = useStore((s) => s.requirements);
  const setRequirements = useStore((s) => s.setRequirements);
  const addRequirementToStore = useStore((s) => s.addRequirement);
  const deleteRequirementFromStore = useStore((s) => s.deleteRequirement);
  const updateRequirementInStore = useStore((s) => s.updateRequirement);
  
  const [hasGenerated, setHasGenerated] = useState(requirements.length > 0);

  // Follow the stored idea, including when a new project clears it
  useEffect(() => {
    setIdea(storeProductIdea);
  }, [storeProductIdea]);

  useEffect(() => {
    if (requirements.length > 0 && !hasGenerated) {
      setHasGenerated(true);
    }
  }, [requirements, hasGenerated]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Requirement>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('Default');
  
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
    }, 3000);
  };

  // Generates every layer from the idea; the store fills in stage by stage
  const handleGenerate = async () => {
    clearProjectLayers();
    const ok = await runPipeline({ idea: idea.trim(), rename: true });
    if (ok) showToast('Project generated — every layer is ready');
  };

  // Approve every requirement, then derive user stories from the approved set
  const handleApproveAll = async () => {
    setIsApprovingAll(true);
    setRequirements(requirements.map((r) => ({ ...r, status: 'approved' as const })));
    const ok = await runPipeline({ stages: ['stories'] });
    setIsApprovingAll(false);
    if (ok) showToast('User stories generated from approved requirements');
  };

  const deleteReq = (id: string) => {
    if (window.confirm('Are you sure you want to delete this requirement?')) {
      deleteRequirementFromStore(id);
      showToast('Requirement deleted');
      setMenuOpenId(null);
    }
  };

  const startEdit = (req: Requirement) => {
    setEditingId(req.id);
    setEditForm(req);
    setMenuOpenId(null);
  };

  const saveEdit = () => {
    if (editingId) {
      updateRequirementInStore(editingId, editForm);
    }
    setEditingId(null);
    showToast('Requirement updated');
  };

  const cancelEdit = () => {
    if (editingId && editingId.startsWith('new-')) {
      deleteRequirementFromStore(editingId);
    }
    setEditingId(null);
  };

  const addRequirement = () => {
    const newId = `new-${Date.now()}`;
    const newReq: Requirement = {
      id: newId,
      description: '',
      type: 'Functional',
      priority: 'Medium',
      status: 'draft',
    };
    addRequirementToStore(newReq);
    setEditingId(newId);
    setEditForm(newReq);
  };

  const duplicateReq = (req: Requirement) => {
    const newReq = { ...req, id: `dup-${Date.now()}`, status: 'draft' as const };
    addRequirementToStore(newReq);
    showToast('Requirement duplicated');
    setMenuOpenId(null);
  };

  const changePriority = (id: string, priority: Requirement['priority']) => {
    updateRequirementInStore(id, { priority });
    showToast(`Priority changed to ${priority}`);
    setMenuOpenId(null);
  };

  const toggleApprove = (id: string) => {
    const req = requirements.find(r => r.id === id);
    if (req) {
      updateRequirementInStore(id, { status: req.status === 'approved' ? 'draft' : 'approved' });
    }
    showToast('Requirement status updated');
  };

  const moveReq = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === requirements.length - 1)) return;
    const newReqs = [...requirements];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newReqs[index], newReqs[swapIndex]] = [newReqs[swapIndex], newReqs[index]];
    setRequirements(newReqs);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500/20 text-seos-red border-red-500/30';
      case 'High': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Medium': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Low': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'Functional' 
      ? 'bg-seos-accent/20 text-seos-accent border-seos-accent/30' 
      : 'bg-seos-green/20 text-seos-green border-seos-green/30';
  };

  const filteredRequirements = requirements
    .filter(r => filterType === 'All' || 
                 (filterType === 'Functional' && r.type === 'Functional') || 
                 (filterType === 'Non-Functional' && r.type === 'Non-Functional') || 
                 (filterType === 'Approved' && r.status === 'approved') || 
                 (filterType === 'Draft' && r.status === 'draft'))
    .filter(r => r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'Default') return 0;
      const priorityWeights = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const weightA = priorityWeights[a.priority as keyof typeof priorityWeights] || 0;
      const weightB = priorityWeights[b.priority as keyof typeof priorityWeights] || 0;
      return sortBy === 'Priority: High→Low' ? weightB - weightA : weightA - weightB;
    });

  const stats = {
    total: requirements.length,
    functional: requirements.filter(r => r.type === 'Functional').length,
    nonFunctional: requirements.filter(r => r.type === 'Non-Functional').length,
    approved: requirements.filter(r => r.status === 'approved').length,
    draft: requirements.filter(r => (r.status || 'draft') === 'draft').length,
  };

  return (
    <div className="flex flex-col h-full bg-seos-background text-seos-text-primary p-6 overflow-y-auto relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-md shadow-lg bg-seos-surface border border-seos-border z-50 transition-opacity duration-300 ${toast.visible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-seos-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full space-y-8">
        
        {/* Header & Idea Input */}
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-medium tracking-tight text-seos-text-primary">Requirements Engineering</h1>
          <p className="text-seos-text-secondary text-sm">Enter your product idea or feature request to generate structured requirements.</p>
          
          <div className="bg-seos-surface border border-seos-border rounded-lg p-1 focus-within:border-seos-accent transition-colors">
            <textarea
              className="w-full bg-transparent text-seos-text-primary p-4 outline-none resize-none min-h-[120px] placeholder-seos-text-secondary/50"
              placeholder="Describe your idea, e.g. A judicial organizer for courts that schedules hearings, avoids conflicts and manages case filings."
              value={idea}
              onChange={(e) => {
                setIdea(e.target.value);
                setStoreProductIdea(e.target.value);
              }}
            />
            <div className="flex justify-end p-2 border-t border-seos-border/50 bg-seos-surface-hover rounded-b-lg">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !idea.trim()}
                className="px-4 py-2 bg-seos-accent text-white rounded-md font-medium disabled:opacity-50 hover:bg-seos-accent-hover transition-colors flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>Generate Requirements</span>
                )}
              </button>
            </div>
          </div>
          
          {/* Generation Progress */}
          {isGenerating && (
            <div className="space-y-2 mt-4 p-4 border border-seos-border rounded-lg bg-seos-surface">
              <div className="flex justify-between text-xs text-seos-text-secondary font-medium uppercase tracking-wider">
                <span>{stepText}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-seos-background rounded-full overflow-hidden">
                <div 
                  className="h-full bg-seos-accent transition-all duration-75 ease-linear rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Requirements Section */}
        {hasGenerated && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-seos-surface py-3 px-4 rounded-lg border border-seos-border text-sm">
              <div className="flex space-x-4 text-seos-text-secondary">
                <span className="font-medium text-seos-text-primary">{stats.total} Total</span>
                <span>•</span>
                <span className="text-seos-accent">{stats.functional} Functional</span>
                <span>•</span>
                <span className="text-seos-green">{stats.nonFunctional} Non-Functional</span>
                <span>•</span>
                <span className="text-seos-green">{stats.approved} Approved</span>
                <span>•</span>
                <span>{stats.draft} Draft</span>
              </div>
              <button 
                onClick={handleApproveAll}
                disabled={isApprovingAll || stats.approved === stats.total || stats.total === 0}
                className="px-4 py-1.5 bg-seos-green/20 text-seos-green border border-seos-green/30 rounded hover:bg-seos-green/30 transition-colors disabled:opacity-50 text-xs font-medium flex items-center space-x-2"
              >
                {isApprovingAll ? (
                  <svg className="animate-spin h-3 w-3 text-seos-green" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                )}
                <span>Approve All & Generate User Stories</span>
              </button>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-seos-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                  type="text" 
                  placeholder="Search requirements..." 
                  className="w-full bg-seos-surface border border-seos-border rounded-md py-2 pl-9 pr-4 text-sm text-seos-text-primary focus:border-seos-accent outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex bg-seos-surface border border-seos-border rounded-md p-0.5">
                  {['All', 'Functional', 'Non-Functional', 'Approved', 'Draft'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setFilterType(f)}
                      className={`px-3 py-1.5 rounded-sm transition-colors ${filterType === f ? 'bg-seos-surface-hover text-seos-text-primary shadow-sm' : 'text-seos-text-secondary hover:text-seos-text-primary'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                
                <select 
                  className="bg-seos-surface border border-seos-border rounded-md py-2 px-3 text-sm text-seos-text-primary focus:border-seos-accent outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option>Default</option>
                  <option>Priority: High→Low</option>
                  <option>Priority: Low→High</option>
                </select>
              </div>
            </div>

            {/* Requirements List */}
            <div className="space-y-3">
              {filteredRequirements.map((req, index) => (
                <div key={req.id} className={`group relative bg-seos-surface border ${req.status === 'approved' ? 'border-seos-green/30' : 'border-seos-border'} rounded-lg p-4 hover:border-seos-accent/50 transition-colors`}>
                  
                  {editingId === req.id ? (
                    <div className="space-y-4">
                      <textarea 
                        className="w-full bg-seos-background border border-seos-border rounded-md p-3 text-sm text-seos-text-primary focus:border-seos-accent outline-none resize-y min-h-[80px]"
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        placeholder="Requirement description..."
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-3">
                          <select 
                            className="bg-seos-background border border-seos-border rounded-md py-1.5 px-3 text-xs text-seos-text-primary outline-none focus:border-seos-accent"
                            value={editForm.type}
                            onChange={(e) => setEditForm({...editForm, type: e.target.value as any})}
                          >
                            <option value="Functional">Functional</option>
                            <option value="Non-Functional">Non-Functional</option>
                          </select>
                          <select 
                            className="bg-seos-background border border-seos-border rounded-md py-1.5 px-3 text-xs text-seos-text-primary outline-none focus:border-seos-accent"
                            value={editForm.priority}
                            onChange={(e) => setEditForm({...editForm, priority: e.target.value as any})}
                          >
                            <option value="Critical" className="text-seos-red">Critical</option>
                            <option value="High" className="text-amber-400">High</option>
                            <option value="Medium" className="text-cyan-400">Medium</option>
                            <option value="Low" className="text-gray-400">Low</option>
                          </select>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-seos-text-secondary hover:text-seos-text-primary hover:bg-seos-surface-hover rounded transition-colors">Cancel</button>
                          <button onClick={saveEdit} className="px-3 py-1.5 text-xs font-medium bg-seos-accent text-white rounded hover:bg-seos-accent-hover transition-colors">Save</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      {/* Drag / Reorder Controls */}
                      <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <button onClick={() => moveReq(index, 'up')} disabled={index === 0} className="text-seos-text-secondary hover:text-seos-text-primary disabled:opacity-30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                        </button>
                        <button onClick={() => moveReq(index, 'down')} disabled={index === requirements.length - 1} className="text-seos-text-secondary hover:text-seos-text-primary disabled:opacity-30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono text-seos-text-secondary bg-seos-background px-2 py-0.5 rounded border border-seos-border">{req.id}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(req.type)}`}>{req.type}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(req.priority)}`}>{req.priority}</span>
                            {req.status === 'approved' && (
                              <span className="text-xs px-2 py-0.5 rounded-full border border-seos-green/30 bg-seos-green/10 text-seos-green flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                <span>Approved</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={() => toggleApprove(req.id)}
                              className={`p-1.5 rounded-md transition-colors ${req.status === 'approved' ? 'text-seos-green hover:bg-seos-green/10' : 'text-seos-text-secondary hover:text-seos-text-primary hover:bg-seos-surface-hover'}`}
                              title={req.status === 'approved' ? "Revoke approval" : "Approve requirement"}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            <button onClick={() => startEdit(req)} className="p-1.5 text-seos-text-secondary hover:text-seos-text-primary hover:bg-seos-surface-hover rounded-md transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onClick={() => deleteReq(req.id)} className="p-1.5 text-seos-text-secondary hover:text-seos-red hover:bg-seos-red/10 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                            
                            {/* Overflow Menu */}
                            <div className="relative">
                              <button 
                                onClick={() => setMenuOpenId(menuOpenId === req.id ? null : req.id)}
                                className="p-1.5 text-seos-text-secondary hover:text-seos-text-primary hover:bg-seos-surface-hover rounded-md transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                              </button>
                              
                              {menuOpenId === req.id && (
                                <div className="absolute right-0 mt-1 w-40 bg-seos-surface border border-seos-border rounded-md shadow-lg py-1 z-10">
                                  <button onClick={() => startEdit(req)} className="w-full text-left px-4 py-2 text-sm text-seos-text-primary hover:bg-seos-surface-hover">Edit</button>
                                  <button onClick={() => duplicateReq(req)} className="w-full text-left px-4 py-2 text-sm text-seos-text-primary hover:bg-seos-surface-hover">Duplicate</button>
                                  <div className="relative group/submenu">
                                    <button className="w-full text-left px-4 py-2 text-sm text-seos-text-primary hover:bg-seos-surface-hover flex justify-between items-center">
                                      <span>Priority</span>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                    </button>
                                    <div className="absolute top-0 right-full mr-1 hidden group-hover/submenu:block w-32 bg-seos-surface border border-seos-border rounded-md shadow-lg py-1">
                                      {['Critical', 'High', 'Medium', 'Low'].map(p => (
                                        <button key={p} onClick={() => changePriority(req.id, p as any)} className={`w-full text-left px-4 py-1.5 text-sm hover:bg-seos-surface-hover ${getPriorityColor(p).split(' ')[1]}`}>{p}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="border-t border-seos-border my-1"></div>
                                  <button onClick={() => deleteReq(req.id)} className="w-full text-left px-4 py-2 text-sm text-seos-red hover:bg-seos-red/10">Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-seos-text-primary leading-relaxed">{req.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredRequirements.length === 0 && (
                <div className="py-12 text-center text-seos-text-secondary border-2 border-dashed border-seos-border rounded-lg">
                  <p>No requirements found matching your criteria.</p>
                </div>
              )}
            </div>

            <button 
              onClick={addRequirement}
              className="w-full py-3 border-2 border-dashed border-seos-border rounded-lg text-seos-text-secondary hover:text-seos-text-primary hover:border-seos-accent/50 hover:bg-seos-surface transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              <span>Add Requirement</span>
            </button>
            
          </div>
        )}
      </div>
    </div>
  );
}
