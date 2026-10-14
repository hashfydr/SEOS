
import { useStore } from '../store';

const Architecture = () => {
  const MOCK_ARCH_RECOMMENDATION = useStore((s) => s.architecture);
  return (
    <div className="animate-fade-in p-6 bg-seos-bg text-seos-text min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display text-3xl font-medium tracking-tight">Architecture Recommendation</h1>
        <span className="px-3 py-1 bg-seos-accent/20 text-seos-accent rounded-full text-sm font-semibold border border-seos-accent/30">
          AI-Generated · Grounded via RAG
        </span>
      </div>

      <div className="bg-seos-surface rounded-xl p-6 mb-8 border border-seos-surface-2 shadow-lg">
        <h2 className="text-2xl font-bold text-seos-accent mb-4">
          {MOCK_ARCH_RECOMMENDATION.pattern}
        </h2>
        <p className="text-seos-text-2 leading-relaxed">
          {MOCK_ARCH_RECOMMENDATION.rationale || 'This pattern is recommended because it provides scalability and resilience for independent services.'}
        </p>
      </div>

      <div className="mb-10">
        <h3 className="text-xl font-bold mb-4">Components</h3>
        <div className="overflow-x-auto rounded-lg border border-seos-surface-2 shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-seos-accent/10 border-b border-seos-surface-2 text-seos-accent">
                <th className="p-4 font-semibold">Component</th>
                <th className="p-4 font-semibold">Technology</th>
                <th className="p-4 font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ARCH_RECOMMENDATION.components?.map((comp: any, index: number) => (
                <tr
                  key={index}
                  className={`border-b border-seos-surface-2 hover:bg-seos-surface-2/50 transition-colors ${index % 2 === 0 ? 'bg-seos-surface' : 'bg-seos-surface-2/30'}`}
                >
                  <td className="p-4 font-medium">{comp.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-seos-accent/10 text-seos-accent rounded text-sm">
                      {comp.tech}
                    </span>
                  </td>
                  <td className="p-4 text-seos-text-2">{comp.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xl font-bold mb-4">Trade-offs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-seos-green flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              Pros
            </h4>
            {MOCK_ARCH_RECOMMENDATION.tradeoffs.map((item, i: number) => (
              <div key={i} className="bg-seos-surface border-l-4 border-seos-green p-4 rounded shadow">
                <p className="text-sm">{item.pro}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-seos-amber flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
              Cons
            </h4>
            {MOCK_ARCH_RECOMMENDATION.tradeoffs.map((item, i: number) => (
              <div key={i} className="bg-seos-surface border-l-4 border-seos-amber p-4 rounded shadow">
                <p className="text-sm">{item.con}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">Architecture Diagram</h3>
        <div className="bg-seos-surface p-8 rounded-xl border border-seos-surface-2 shadow-lg flex flex-col items-center gap-4">
          
          <div className="w-full max-w-md bg-seos-cyan/20 border border-seos-cyan/50 text-seos-cyan p-4 rounded text-center font-bold">
            Client Apps
          </div>
          
          <div className="text-seos-text-2">
            <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </div>

          <div className="w-full max-w-md bg-seos-accent/20 border border-seos-accent/50 text-seos-accent p-4 rounded text-center font-bold">
            API Gateway
          </div>

          <div className="text-seos-text-2">
            <svg className="w-6 h-6 animate-bounce" style={{animationDelay: '0.2s'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </div>

          <div className="w-full max-w-md flex gap-4">
            <div className="flex-1 bg-seos-amber/20 border border-seos-amber/50 text-seos-amber p-4 rounded text-center font-bold text-sm">
              Microservices
            </div>
          </div>

          <div className="w-full max-w-md grid grid-cols-2 gap-4">
             <div className="flex justify-center text-seos-text-2">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
             </div>
             <div className="flex justify-center text-seos-text-2">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
             </div>
          </div>

          <div className="w-full max-w-md bg-amber-500/20 border border-amber-500/50 text-amber-400 p-3 rounded text-center font-bold text-sm">
            Message Broker
          </div>

          <div className="w-full max-w-md grid grid-cols-2 gap-4">
             <div className="flex justify-center text-seos-text-2">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
             </div>
             <div className="flex justify-center text-seos-text-2">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
             </div>
          </div>

          <div className="w-full max-w-md flex gap-4">
            <div className="flex-1 bg-orange-500/20 border border-orange-500/50 text-orange-400 p-4 rounded text-center font-bold text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
              Databases
            </div>
          </div>
          
        </div>
      </div>

    </div>
  );
};

export default Architecture;
