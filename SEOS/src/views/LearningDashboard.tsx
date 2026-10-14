import React from 'react';

const LearningDashboard: React.FC = () => {
  const modules = [
    { icon: '📋', title: 'Requirements Engineering', desc: 'Learn how to elicit, analyze, specify, and manage requirements effectively.', progress: 85 },
    { icon: '🏗️', title: 'Design Patterns', desc: 'Explore reusable solutions to common problems in software design.', progress: 60 },
    { icon: '🔌', title: 'API Design Best Practices', desc: 'Understand the principles of designing robust and scalable APIs.', progress: 45 },
    { icon: '🗄️', title: 'Database Normalization', desc: 'Master the process of structuring relational databases to reduce redundancy.', progress: 70 },
    { icon: '☁️', title: 'Microservices Architecture', desc: 'Dive into designing systems as a collection of loosely coupled services.', progress: 90 },
    { icon: '🧪', title: 'Testing Strategies', desc: 'Learn various testing methodologies to ensure software quality and reliability.', progress: 30 },
  ];

  const books = [
    { title: 'Clean Architecture', author: 'Robert C. Martin', tag: 'Architecture' },
    { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', tag: 'Data Systems' },
    { title: 'Domain-Driven Design', author: 'Eric Evans', tag: 'Domain Modeling' },
    { title: 'Building Microservices', author: 'Sam Newman', tag: 'Microservices' },
  ];

  return (
    <div className="p-6 text-seos-text bg-seos-bg min-h-screen">
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-3xl font-medium tracking-tight mb-2">Learning Dashboard</h1>
        <p className="text-seos-text-2">Explore SE concepts grounded in your project context</p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 animate-fade-in">Your Modules</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {modules.map((mod, idx) => (
            <div key={idx} className="bg-seos-surface border border-seos-border rounded-xl p-6 shadow-md animate-fade-in hover:scale-[1.02] transition-transform duration-200">
              <div className="text-4xl mb-4">{mod.icon}</div>
              <h3 className="text-xl font-bold mb-2">{mod.title}</h3>
              <p className="text-seos-text-2 text-sm mb-6 h-10">{mod.desc}</p>
              
              <div className="mb-5">
                <div className="flex justify-between text-xs text-seos-text-3 mb-1">
                  <span>Progress</span>
                  <span>{mod.progress}%</span>
                </div>
                <div className="w-full bg-seos-surface-2 rounded-full h-2 overflow-hidden">
                  <div className="bg-seos-accent rounded-full h-2" style={{ width: `${mod.progress}%` }}></div>
                </div>
              </div>
              
              <button className="w-full bg-seos-surface-2 hover:bg-seos-accent/20 text-seos-accent border border-seos-accent font-semibold py-2 px-4 rounded transition-colors">
                {mod.progress > 0 ? 'Continue' : 'Start'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 animate-fade-in">Knowledge Graph</h2>
        <div className="bg-seos-surface border border-seos-border rounded-xl p-6 relative h-64 overflow-hidden animate-fade-in hover:scale-[1.02] transition-transform duration-200">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '100%', minHeight: '100%' }}>
            <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1.5" className="text-seos-border" />
            <line x1="50%" y1="50%" x2="80%" y2="40%" stroke="currentColor" strokeWidth="1.5" className="text-seos-border" />
            <line x1="50%" y1="50%" x2="30%" y2="70%" stroke="currentColor" strokeWidth="1.5" className="text-seos-border" />
            <line x1="30%" y1="70%" x2="60%" y2="80%" stroke="currentColor" strokeWidth="1.5" className="text-seos-border" />
            <line x1="80%" y1="40%" x2="70%" y2="70%" stroke="currentColor" strokeWidth="1.5" className="text-seos-border" />
            <line x1="80%" y1="40%" x2="85%" y2="20%" stroke="currentColor" strokeWidth="1.5" className="text-seos-border" />
            <line x1="20%" y1="30%" x2="35%" y2="15%" stroke="currentColor" strokeWidth="1.5" className="text-seos-border" />
          </svg>
          
          <div className="absolute top-[30%] left-[20%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">REST API</div>
          </div>
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">SOLID</div>
          </div>
          <div className="absolute top-[40%] left-[80%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">DDD</div>
          </div>
          <div className="absolute top-[70%] left-[30%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">Event Sourcing</div>
          </div>
          <div className="absolute top-[80%] left-[60%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">CQRS</div>
          </div>
          <div className="absolute top-[70%] left-[70%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">CI/CD</div>
          </div>
          <div className="absolute top-[15%] left-[35%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">TDD</div>
          </div>
          <div className="absolute top-[20%] left-[85%] transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-seos-bg/80 border border-seos-accent text-seos-accent text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">Clean Arch</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-6 animate-fade-in">Recommended Reading</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {books.map((book, idx) => (
            <div key={idx} className="bg-seos-surface border border-seos-border rounded-xl p-5 shadow-md flex flex-col animate-fade-in hover:scale-[1.02] transition-transform duration-200">
              <div className="text-3xl mb-3">📖</div>
              <h3 className="font-bold text-lg mb-1 leading-tight text-seos-text">{book.title}</h3>
              <p className="text-seos-text-2 text-sm mb-4">by {book.author}</p>
              <div className="mt-auto">
                <span className="inline-block bg-seos-surface-2 text-seos-text-3 border border-seos-border text-xs px-2 py-1 rounded">
                  {book.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LearningDashboard;
