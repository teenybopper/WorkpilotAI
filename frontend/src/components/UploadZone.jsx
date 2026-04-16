import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

export default function UploadZone({ title, subtitle, icon: Icon, accept, onDrop, gradient, borderColor }) {
  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length) onDrop(acceptedFiles);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`glass-card p-8 text-center cursor-pointer transition-all ${
        isDragActive
          ? `bg-gradient-to-br ${gradient} ${borderColor} scale-[1.02]`
          : 'hover:border-surface-500'
      }`}
    >
      <input {...getInputProps()} />
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} border ${borderColor} flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-6 h-6 text-surface-800" />
      </div>
      <h3 className="font-semibold text-surface-950 mb-1">{title}</h3>
      <p className="text-sm text-surface-600 mb-3">{subtitle}</p>
      <div className="flex items-center justify-center gap-2 text-xs text-surface-500">
        <Upload className="w-3.5 h-3.5" />
        {isDragActive ? 'Drop files here...' : 'Drag & drop or click to browse'}
      </div>
    </div>
  );
}
