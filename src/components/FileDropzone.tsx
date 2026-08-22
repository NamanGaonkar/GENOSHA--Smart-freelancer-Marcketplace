import { useRef, useState } from 'react';
import { Upload, X, File, Image, Link2, Globe } from 'lucide-react';
import { uploadFile } from '../lib/api';

interface FileDropzoneProps {
  bucket: string;
  path: string;
  onUpload?: (url: string, fileName: string) => void;
  onFilesChange?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileDropzone({
  bucket,
  path,
  onUpload,
  onFilesChange,
  multiple = false,
  accept = '*',
  maxSizeMB = 10,
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);

    const fileArr = Array.from(files);

    // Validate size
    for (const f of fileArr) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        setError(`${f.name} exceeds ${maxSizeMB}MB limit`);
        setUploading(false);
        return;
      }
    }

    if (onFilesChange) {
      onFilesChange(fileArr);
      setUploading(false);
      return;
    }

    const results: { name: string; url: string }[] = [];

    for (const f of fileArr) {
      const timestamp = Date.now();
      const filePath = `${path}/${timestamp}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { url, error: uploadError } = await uploadFile(bucket, filePath, f);

      if (uploadError) {
        setError(`Failed to upload ${f.name}: ${uploadError}`);
        continue;
      }

      if (url) {
        results.push({ name: f.name, url });
        if (onUpload) onUpload(url, f.name);
      }
    }

    setUploadedFiles((prev) => [...prev, ...results]);
    setUploading(false);
  };

  const handleAddLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) return;
    // Validate URL
    try {
      new URL(trimmed);
    } catch {
      setError('Please enter a valid URL');
      return;
    }
    setError('');
    // Extract a name from the URL
    let name = trimmed;
    try {
      const urlObj = new URL(trimmed);
      // For Google Drive links, use a friendly name
      if (urlObj.hostname.includes('drive.google.com')) {
        const fileId = trimmed.match(/\/d\/([^/]+)/)?.[1];
        name = `Google Drive ${fileId ? fileId.substring(0, 8) + '...' : 'Link'}`;
      } else {
        name = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
        if (name.length > 50) name = name.substring(0, 47) + '...';
      }
    } catch {}

    setUploadedFiles((prev) => [...prev, { name, url: trimmed }]);
    if (onUpload) onUpload(trimmed, name);
    setLinkUrl('');
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  const isUrl = (url: string) => /^https?:\/\//i.test(url);

  return (
    <div>
      <div
        className={`gen-dropzone ${dragActive ? 'gen-dropzone-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
        <p style={{ fontSize: 13, color: 'var(--text-sec)' }}>
          {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Max {maxSizeMB}MB per file
        </p>
      </div>

      {/* Link input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Link2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
            placeholder="Paste Google Drive link or any URL..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 34px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
              color: 'var(--text)',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
        <button
          type="button"
          onClick={handleAddLink}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid var(--accent-border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-dim)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
        >
          <Globe size={13} />
          Add Link
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error}</p>
      )}

      {uploadedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {uploadedFiles.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                fontSize: 12,
              }}
            >
              {isUrl(f.url) && !isImageFile(f.name) ? (
                <Globe size={14} color="var(--accent)" />
              ) : isImageFile(f.name) ? (
                <Image size={14} color="var(--accent)" />
              ) : (
                <File size={14} color="var(--text-muted)" />
              )}
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gen-truncate"
                style={{ flex: 1, color: 'var(--text)', textDecoration: 'none', minWidth: 0 }}
              >
                {f.name}
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 4,
                  display: 'flex',
                  borderRadius: 6,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
