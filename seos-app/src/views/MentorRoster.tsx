import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api, type Classroom, type ClassroomRoster } from '../lib/api';

export const MentorRoster: React.FC = () => {
  const currentUser = useStore((s) => s.currentUser);
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [roster, setRoster] = useState<ClassroomRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New classroom state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      const data = await api.listClassrooms();
      setClassrooms(data);
      if (data.length > 0 && !selectedClassId) {
        setSelectedClassId(data[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load classrooms from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async (classId: string) => {
    try {
      setLoading(true);
      const data = await api.getClassroomRoster(classId);
      setRoster(data);
    } catch (err: any) {
      console.warn('Failed to load roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadRoster(selectedClassId);
    }
  }, [selectedClassId]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const created = await api.createClassroom({
        name: newClassName.trim(),
        custom_code: newClassCode.trim() ? newClassCode.trim().toUpperCase() : undefined,
        description: newClassDesc.trim(),
      });
      setShowCreateModal(false);
      setNewClassName('');
      setNewClassCode('');
      setNewClassDesc('');
      await loadClassrooms();
      setSelectedClassId(created.id);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create classroom.');
    }
  };

  if (!currentUser || currentUser.role !== 'mentor') {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-seos-bg text-center">
        <div className="max-w-md p-8 rounded-2xl bg-seos-surface border border-seos-border shadow-xl">
          <div className="font-mono text-xs text-seos-cyan font-bold mb-2">:: MENTOR AUDIT VIEW ::</div>
          <h2 className="text-xl font-bold mb-3 text-seos-text">Faculty & Mentor Access Only</h2>
          <p className="text-sm text-seos-text-3 mb-6">
            The Cohort Roster allows mentors to create classrooms, generate 6-character join codes, and audit live student engineering projects.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="py-2.5 px-6 rounded-xl bg-seos-accent text-seos-bg font-mono text-xs font-semibold uppercase tracking-wider shadow"
          >
            Switch to Mentor Account
          </button>
        </div>
      </div>
    );
  }

  const activeClassroom = classrooms.find((c) => c.id === selectedClassId);

  return (
    <div className="p-6 lg:px-10 lg:py-8 text-seos-text bg-seos-bg h-full overflow-y-auto pb-24 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-seos-cyan/15 text-seos-cyan border border-seos-cyan/30">
              [MENTOR AUDIT ROSTER]
            </span>
            <span className="text-xs text-seos-text-3 font-mono">
              Faculty: {currentUser.name}
            </span>
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight">Classrooms & Student Roster</h1>
          <p className="text-sm text-seos-text-2 mt-1">
            Manage course cohorts, distribute join codes, and inspect student artifact integrity.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="py-2.5 px-4 rounded-xl bg-seos-accent text-seos-bg font-mono text-xs font-semibold tracking-wider uppercase shadow hover:opacity-95 transition-opacity flex items-center gap-2"
        >
          <span>[+]</span>
          <span>CREATE CLASSROOM</span>
        </button>
      </div>

      {/* Classrooms Selector Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {classrooms.map((c) => {
          const isSelected = c.id === selectedClassId;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-seos-surface border-seos-accent shadow-md ring-1 ring-seos-accent/30'
                  : 'bg-seos-surface/60 border-seos-border hover:border-seos-accent/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-seos-text truncate flex-1 mr-2">{c.name}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-seos-surface-2 border border-seos-border font-semibold">
                  {c.student_count} Students
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-seos-border/50">
                <span className="text-[11px] text-seos-text-3 font-mono">Join Code:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyCode(c.code);
                  }}
                  className="font-mono text-xs font-bold px-2 py-1 rounded bg-seos-accent/15 text-seos-accent border border-seos-accent/30 hover:bg-seos-accent/25 transition-colors"
                  title="Click to copy join code for students"
                >
                  {copiedCode === c.code ? '[COPIED! ✓]' : `[ ${c.code} ]`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Classroom Roster Table */}
      {activeClassroom && (
        <div className="bg-seos-surface border border-seos-border rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-seos-border flex flex-wrap items-center justify-between gap-2 bg-seos-surface-2/40">
            <div>
              <h2 className="text-base font-bold text-seos-text">
                Enrolled Students in {activeClassroom.name}
              </h2>
              <p className="text-xs text-seos-text-3 font-mono mt-0.5">
                Cohort Code: <strong className="text-seos-accent">{activeClassroom.code}</strong> • {roster?.students.length || 0} enrolled
              </p>
            </div>
            <button
              onClick={() => loadRoster(activeClassroom.id)}
              disabled={loading}
              className="font-mono text-xs text-seos-text-3 hover:text-seos-text px-2 py-1 rounded border border-seos-border hover:bg-seos-surface-2 transition-colors disabled:opacity-50"
            >
              {loading ? '[REFRESHING...]' : '[REFRESH ROSTER]'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-seos-border/60 bg-seos-surface-2/30 font-mono text-seos-text-3 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Active Project</th>
                  <th className="py-3 px-4">Artifact Coverage</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-seos-border/40 font-mono">
                {roster?.students.length ? (
                  roster.students.map((student) => {
                    const project = student.projects[0];
                    const completedArtifacts = project
                      ? [
                          project.requirements_count > 0,
                          project.stories_count > 0,
                          project.has_model,
                          project.has_architecture,
                          project.has_api,
                          project.has_docs,
                        ].filter(Boolean).length
                      : 0;

                    return (
                      <tr key={student.id} className="hover:bg-seos-surface-2/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-seos-text font-sans">
                          {student.name}
                        </td>
                        <td className="py-3 px-4 text-seos-text-3">
                          {student.email}
                        </td>
                        <td className="py-3 px-4">
                          {project ? (
                            <span className="font-semibold text-seos-accent font-sans">
                              {project.title} (v{project.version})
                            </span>
                          ) : (
                            <span className="text-seos-text-3 italic font-sans">No project yet</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {project ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-seos-text">
                                [{completedArtifacts}/6]
                              </span>
                              <div className="w-16 bg-seos-surface-3 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-seos-accent h-1.5 rounded-full"
                                  style={{ width: `${(completedArtifacts / 6) * 100}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-seos-text-3">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {project ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-seos-green/15 text-seos-green border border-seos-green/30">
                              {project.status.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-seos-text-3">[PENDING]</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              alert(`Audit view for ${student.name}'s project will be loaded into workspace.`);
                            }}
                            className="font-mono text-xs px-2.5 py-1 rounded border border-seos-border bg-seos-surface hover:border-seos-accent/40 text-seos-text transition-colors"
                          >
                            [AUDIT]
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-seos-text-3">
                      No students have joined with code <strong className="text-seos-accent">{activeClassroom.code}</strong> yet.
                      <div className="mt-2 text-xs">Share this code with your class during lab or lecture.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-seos-surface border border-seos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 cursor-default"
          >
            <div className="flex items-center justify-between mb-4 border-b border-seos-border pb-3">
              <h3 className="text-base font-bold text-seos-text font-mono">
                :: CREATE COURSE COHORT ::
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-seos-text-3 hover:text-seos-text font-mono"
              >
                [X]
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-2.5 rounded bg-seos-red/15 border border-seos-red/30 text-seos-red text-xs font-mono">
                [ERROR] {createError}
              </div>
            )}

            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-seos-text-2 mb-1">
                  Classroom / Course Name:
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. UCS 503 Software Engineering"
                  className="w-full px-3 py-2 rounded-lg bg-seos-surface-2 border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-seos-text-2 mb-1">
                  Custom Join Code (Optional, 4–20 chars):
                </label>
                <input
                  type="text"
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SEOS-503L2 (leave blank to auto-generate)"
                  className="w-full px-3 py-2 uppercase font-mono tracking-wider rounded-lg bg-seos-surface-2 border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-seos-text-2 mb-1">
                  Batch / Description:
                </label>
                <textarea
                  rows={2}
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  placeholder="e.g. Group L2[3P12], Fall Semester 2026"
                  className="w-full px-3 py-2 rounded-lg bg-seos-surface-2 border border-seos-border text-sm text-seos-text focus:outline-none focus:border-seos-accent"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2 rounded-lg border border-seos-border text-xs font-mono text-seos-text-3 hover:text-seos-text"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-seos-accent text-seos-bg text-xs font-mono font-semibold uppercase tracking-wider"
                >
                  CREATE COHORT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MentorRoster;
