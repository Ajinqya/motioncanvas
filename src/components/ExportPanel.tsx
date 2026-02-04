import { useState } from 'react';
import type { AnimationEntry, SimpleAnimationDefinition, AnimationDefinition } from '../runtime/types';
import { generateSimpleAnimationCode, isSimpleAnimation, generateExternalEditorCode } from '../runtime/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, CheckCircle2 } from 'lucide-react';

interface ExportPanelProps {
  entry: AnimationEntry;
  params: Record<string, unknown>;
}

export function ExportPanel({ entry, params }: ExportPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  
  // Get ID from either format
  const getDefinitionId = () => {
    if ('id' in entry.definition) {
      return entry.definition.id;
    }
    if ('name' in entry.definition && entry.definition.name) {
      return entry.definition.name.toLowerCase().replace(/\s+/g, '-');
    }
    return 'animation';
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    if (entry.source) {
      copyToClipboard(entry.source, 'code');
    }
  };

  const handleCopyParams = () => {
    copyToClipboard(JSON.stringify(params, null, 2), 'params');
  };

  const handleCopySimpleFormat = () => {
    const isSimple = isSimpleAnimation(entry.definition);
    
    let code: string;
    if (isSimple) {
      // Already in simple format - use old generator
      code = generateSimpleAnimationCode(entry.definition as SimpleAnimationDefinition);
    } else {
      // Use the new external editor format with source code for dependencies
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code = generateExternalEditorCode(entry.definition as AnimationDefinition<any>, params, entry.source);
    }
    copyToClipboard(code, 'simple');
  };

  const handleDownloadCode = () => {
    if (entry.source) {
      downloadFile(
        entry.source,
        `${getDefinitionId()}.ts`,
        'text/typescript'
      );
    }
  };

  const handleDownloadMeta = () => {
    if (entry.meta) {
      downloadFile(
        JSON.stringify(entry.meta, null, 2),
        'meta.json',
        'application/json'
      );
    }
  };

  const handleDownloadAll = async () => {
    // Use fflate to create a zip
    const { zipSync, strToU8 } = await import('fflate');

    const files: Record<string, Uint8Array> = {};

    if (entry.source) {
      files['index.ts'] = strToU8(entry.source);
    }

    if (entry.meta) {
      files['meta.json'] = strToU8(JSON.stringify(entry.meta, null, 2));
    }

    // Add current params
    files['params.json'] = strToU8(JSON.stringify(params, null, 2));

    const zipped = zipSync(files);
    // Ensure BlobPart typing is compatible across TS DOM libs
    // Copy into a new ArrayBuffer to avoid SharedArrayBuffer typing issues
    const zipBytes = new Uint8Array(zipped.byteLength);
    zipBytes.set(zipped);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getDefinitionId()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Copy</h4>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={handleCopyCode}
              disabled={!entry.source}
            >
              {copied === 'code' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={handleCopyParams}
            >
              {copied === 'params' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Params
                </>
              )}
            </Button>
            <Button
              size="sm"
              className="justify-start"
              onClick={handleCopySimpleFormat}
            >
              {copied === 'simple' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Simple Format
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Download</h4>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={handleDownloadCode}
              disabled={!entry.source}
            >
              <Download className="h-4 w-4" />
              Code (.ts)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={handleDownloadMeta}
              disabled={!entry.meta}
            >
              <Download className="h-4 w-4" />
              Meta (.json)
            </Button>
            <Button
              size="sm"
              className="justify-start"
              onClick={handleDownloadAll}
            >
              <Download className="h-4 w-4" />
              Download All (.zip)
            </Button>
          </div>
        </div>

        {entry.meta?.prompt && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Source Prompt</h4>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {entry.meta.prompt}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
