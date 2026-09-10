import React from 'react';
import ReactMarkdown from 'react-markdown';

interface PolicyRendererProps {
  content: string;
}

export const PolicyRenderer: React.FC<PolicyRendererProps> = ({ content }) => {
  return (
    <div className="bg-surface p-8 md:p-12 rounded-2xl shadow-sm border border-border">
      <ReactMarkdown
        components={{
          h2: ({ node, ...props }) => {
            // Generate an id from the text for anchor linking if needed
            let id = '';
            if (props.children) {
              const text = Array.isArray(props.children) ? props.children.join('') : String(props.children);
              id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            return (
              <>
                <h2 
                  id={id}
                  className="font-headline-md text-2xl text-accent mb-6 mt-12 first:mt-0 tracking-wide scroll-mt-24 md:scroll-mt-32" 
                  {...props} 
                />
              </>
            );
          },
          h3: ({ node, ...props }) => (
            <h3 
              className="font-headline-md text-xl text-ink mb-4 mt-8 tracking-wide scroll-mt-24 md:scroll-mt-32" 
              {...props} 
            />
          ),
          p: ({ node, ...props }) => (
            <p 
              className="text-text font-body-md leading-relaxed font-light mb-4 last:mb-0" 
              {...props} 
            />
          ),
          ul: ({ node, ...props }) => (
            <ul 
              className="list-disc pl-5 space-y-2 text-text font-body-md leading-relaxed font-light mb-4" 
              {...props} 
            />
          ),
          ol: ({ node, ...props }) => (
            <ol 
              className="list-decimal pl-5 space-y-2 text-text font-body-md leading-relaxed font-light mb-4" 
              {...props} 
            />
          ),
          li: ({ node, ...props }) => (
            <li {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-t border-border my-12" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-ink" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-accent hover:underline font-medium" {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
