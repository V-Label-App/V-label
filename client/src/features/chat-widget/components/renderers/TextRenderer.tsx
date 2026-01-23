import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TextRendererProps {
    content: string;
}

/**
 * TextRenderer - Renders plain text/markdown content
 */
export function TextRenderer({ content }: TextRendererProps) {
    return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
