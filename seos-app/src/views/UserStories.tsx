import { useStore } from '../store';

function UserStories() {
  const stories = useStore((s) => s.userStories);
  const setStories = useStore((s) => s.setUserStories);

  const handleApprove = (id: string) => {
    setStories(stories.map(s => s.id === id ? { ...s, status: 'approved' as const } : s));
  };

  return (
    <div className="flex flex-col h-full bg-seos-bg text-seos-text p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-medium tracking-tight text-seos-text">User Stories Board</h1>
        <div className="bg-seos-surface-3 px-3 py-1 rounded-full text-seos-text-2 font-medium">
          {stories.length} Stories
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {stories.map((story, index) => (
          <div 
            key={story.id}
            className={`bg-seos-surface border border-seos-border rounded-xl p-5 flex flex-col gap-4 transition-all duration-300 animate-fade-in ${story.status === 'approved' ? 'border-l-4 border-l-seos-green' : ''}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm bg-seos-surface-3 px-2 py-1 rounded text-seos-accent">
                  {story.id}
                </span>
                <span className="text-xs bg-seos-surface-2 border border-seos-border-2 px-2 py-1 rounded text-seos-text-2">
                  Req: {story.reqId}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-semibold ${
                  story.status === 'approved' 
                    ? 'bg-seos-green/20 text-seos-green' 
                    : 'bg-seos-amber/20 text-seos-amber'
                }`}>
                  {story.status}
                </span>
                {story.status !== 'approved' && (
                  <button 
                    onClick={() => handleApprove(story.id)}
                    className="bg-seos-accent hover:bg-seos-accent-2 text-white text-xs px-3 py-1 rounded-md transition-colors"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
            
            <div className="text-lg font-medium">
              As a <span className="text-seos-accent font-semibold">{story.role}</span>, I want to <span className="text-seos-accent font-semibold">{story.action}</span>, so that <span className="text-seos-accent font-semibold">{story.benefit}</span>
            </div>
            
            <div className="bg-seos-surface-2 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-seos-text-2 mb-2 uppercase tracking-wider">Acceptance Criteria</h4>
              <ul className="list-disc list-inside space-y-1 text-seos-text-3">
                {story.criteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserStories;
