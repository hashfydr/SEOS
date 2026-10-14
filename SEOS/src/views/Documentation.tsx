import React, { useState } from 'react';
import { useStore } from '../store';

const Documentation: React.FC = () => {
  const docs = useStore((s) => s.docs);
  const [activeTab, setActiveTab] = useState(docs[0]?.id || 'srs');

  const activeDoc = docs.find(d => d.id === activeTab) || docs[0];

  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let inTable = false;
    let codeContent: string[] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-seos-surface-3 rounded-lg p-4 font-mono text-sm text-seos-green my-4 overflow-x-auto">
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
        }
        inCodeBlock = !inCodeBlock;
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      if (line.trim().startsWith('# ')) {
        elements.push(<h1 key={index} className="font-display text-3xl font-medium tracking-tight text-seos-text mt-6 mb-3">{line.replace('# ', '')}</h1>);
      } else if (line.trim().startsWith('## ')) {
        elements.push(<h2 key={index} className="text-xl font-semibold text-seos-text mt-5 mb-2">{line.replace('## ', '')}</h2>);
      } else if (line.trim().startsWith('### ')) {
        elements.push(<h3 key={index} className="text-lg font-semibold text-seos-accent mt-4 mb-1">{line.replace('### ', '')}</h3>);
      } else if (line.trim().startsWith('- ')) {
        elements.push(<li key={index} className="ml-6 list-disc text-seos-text-2 my-1">{renderInlineText(line.replace('- ', ''))}</li>);
      } else if (line.trim() === '---') {
        elements.push(<hr key={index} className="border-t border-seos-border my-4" />);
      } else if (line.trim().startsWith('|')) {
        // Simple table rendering
        const cells = line.split('|').filter(c => c.trim() !== '');
        // Ignore separator row like |---|---|
        if (cells.every(c => c.trim().replace(/-/g, '') === '')) return;
        
        if (!inTable) {
          inTable = true;
          // We'll just render it as a row, a full table parser is more complex but this works for simple lines
        }
        
        elements.push(
          <div key={index} className="flex border-b border-seos-border last:border-0 bg-seos-surface-2 p-1">
            {cells.map((cell, i) => (
              <div key={i} className="flex-1 p-2 border-r border-seos-border last:border-0 text-sm">
                {renderInlineText(cell.trim())}
              </div>
            ))}
          </div>
        );
      } else if (line.trim() !== '') {
        inTable = false;
        elements.push(<p key={index} className="text-seos-text-2 my-2 leading-relaxed">{renderInlineText(line)}</p>);
      } else {
        inTable = false;
      }
    });

    return <div className="markdown-content">{elements}</div>;
  };

  const renderInlineText = (text: string) => {
    // Basic bold parsing
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-seos-text">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'srs': return 'bg-seos-accent/20 text-seos-accent border-seos-accent/30';
      case 'sdd': return 'bg-seos-amber/20 text-seos-amber border-seos-amber/30';
      case 'readme': return 'bg-seos-green/20 text-seos-green border-seos-green/30';
      default: return 'bg-seos-surface-3 text-seos-text border-seos-border';
    }
  };

  return (
    <div className="flex h-full bg-seos-bg text-seos-text">
      {/* Sidebar */}
      <div className="w-64 border-r border-seos-border flex flex-col">
        <div className="p-4 border-b border-seos-border">
          <h2 className="font-semibold text-lg">Documents</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveTab(doc.id)}
              className={`w-full text-left px-4 py-3 border-l-4 transition-colors ${
                activeTab === doc.id 
                  ? 'border-seos-accent bg-seos-surface-2 text-seos-text' 
                  : 'border-transparent text-seos-text-3 hover:bg-seos-surface hover:text-seos-text-2'
              }`}
            >
              <div className="font-medium">{doc.title}</div>
              <div className="text-xs mt-1 uppercase tracking-wider">{doc.type}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeDoc ? (
          <>
            <div className="p-6 border-b border-seos-border flex items-center gap-4 bg-seos-surface">
              <h1 className="font-display text-2xl font-medium tracking-tight">{activeDoc.title}</h1>
              <span className={`text-xs px-2 py-1 rounded-md border font-medium ${getBadgeColor(activeDoc.type)}`}>
                {activeDoc.type.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-seos-bg">
              <div className="max-w-4xl mx-auto">
                {renderMarkdown(activeDoc.content)}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-seos-text-3">
            Select a document to view
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentation;
