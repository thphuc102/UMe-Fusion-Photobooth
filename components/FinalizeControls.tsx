
import React from 'react';
import { DownloadIcon, ResetIcon, ZoomInIcon, ZoomOutIcon, GoogleDriveIcon, UndoIcon, RedoIcon, SparklesIcon } from './icons';
import { Photo } from '../types';

interface FinalizeControlsProps {
  onDownload: () => void;
  onGetImageForExport: () => Promise<string | undefined>;
  onReset: () => void;
  onCreateNew: () => void;
  frameOpacity: number;
  onOpacityChange: (opacity: number) => void;
  photos: Photo[];
  selectedPhotoIndex: number;
  onSelectPhoto: (index: number) => void;
  onPhotoUpdate: (index: number, updates: Partial<Photo>) => void;
  onResetPhotoAdjustments: (index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isKioskMode: boolean;
  globalPhotoScale: number;
  onGlobalPhotoScaleChange: (scale: number) => void;
  // AI Props
  aiPrompt: string;
  onAiPromptChange: (prompt: string) => void;
  onAiGenerate: () => void;
  isAiLoading: boolean;
  aiError: string | null;
}

const FinalizeControls: React.FC<FinalizeControlsProps> = ({ 
    onDownload, 
    onGetImageForExport,
    onReset, 
    onCreateNew,
    frameOpacity, 
    onOpacityChange,
    photos,
    selectedPhotoIndex,
    onSelectPhoto,
    onPhotoUpdate,
    onResetPhotoAdjustments,
    undo,
    redo,
    canUndo,
    canRedo,
    isKioskMode,
    globalPhotoScale,
    onGlobalPhotoScaleChange,
    aiPrompt,
    onAiPromptChange,
    onAiGenerate,
    isAiLoading,
    aiError,
}) => {
  const selectedPhoto = selectedPhotoIndex !== -1 ? photos[selectedPhotoIndex] : null;

  const handleTransformChange = (prop: 'rotation', value: number) => {
    if (!selectedPhoto) return;
    const newTransform = { ...selectedPhoto.transform, [prop]: value };
    onPhotoUpdate(selectedPhotoIndex, { transform: newTransform });
  };

  const handleCropChange = (prop: 'x' | 'y' | 'scale', value: number) => {
    if (!selectedPhoto) return;
    const newCrop = { ...selectedPhoto.crop, [prop]: value };
    onPhotoUpdate(selectedPhotoIndex, { crop: newCrop });
  }

  const handleResetAdjustments = () => {
    if (selectedPhotoIndex === -1) return;
    onResetPhotoAdjustments(selectedPhotoIndex);
  };
  
  const getAspectRatio = (width: number, height: number): string => {
      if (!width || !height) return 'N/A';
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const commonDivisor = gcd(width, height);
      return `${width / commonDivisor}:${height / commonDivisor}`;
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 mt-8 lg:mt-0">
      <div className="w-full text-center">
        <h2 className="text-2xl font-bold text-[var(--color-primary)]">Step 4: Finalize & Export</h2>
        <p className="opacity-70">Adjust photos, set frame transparency, and download.</p>
      </div>
      
      <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)] flex justify-center items-center gap-4">
        <button onClick={undo} disabled={!canUndo} className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/30 transition-opacity">
          <UndoIcon /> Undo
        </button>
        <button onClick={redo} disabled={!canRedo} className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/30 transition-opacity">
          Redo <RedoIcon />
        </button>
      </div>
      
      {/* AI Editing Panel */}
      <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)] space-y-3">
        <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-sm font-medium opacity-80">Edit with AI</h3>
        </div>
        <p className="text-xs text-gray-500">Describe a change, like "make it black and white" or "add party hats". Manual adjustments will clear the AI edit.</p>
        <textarea
            rows={2}
            value={aiPrompt}
            onChange={(e) => onAiPromptChange(e.target.value)}
            placeholder="e.g., Change background to a snowy mountain..."
            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-md p-2 text-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
        />
        {aiError && <p className="text-xs text-red-400">{aiError}</p>}
        <button onClick={onAiGenerate} disabled={isAiLoading || photos.length === 0} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white font-semibold rounded-lg shadow-md filter hover:brightness-110 disabled:bg-gray-500 disabled:cursor-not-allowed">
            {isAiLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </>
            ) : "Generate"}
        </button>
      </div>


      <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)]">
        <h3 className="text-sm font-medium opacity-80 mb-3">Select Photo to Adjust</h3>
        <p className="text-xs text-gray-500 mb-3">Click a photo on the canvas to select it.</p>
        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button 
              key={index} 
              onClick={() => onSelectPhoto(index)}
              className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${selectedPhotoIndex === index ? 'border-[var(--color-primary)] scale-110' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}
              aria-label={`Select photo ${index + 1}`}
            >
              <img src={photo.src} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {selectedPhoto && (
        <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)] space-y-4">
          <div className="flex justify-between items-baseline">
            <h3 className="text-sm font-medium opacity-80">Photo Adjustments</h3>
            <p className="text-xs text-gray-400">
                {selectedPhoto.originalWidth}&times;{selectedPhoto.originalHeight} ({getAspectRatio(selectedPhoto.originalWidth, selectedPhoto.originalHeight)})
            </p>
          </div>
          <p className="text-xs text-gray-500 -mt-3">Drag photo to pan, scroll to zoom, use handle to rotate.</p>
          
          <div>
            <label className="block text-xs font-medium opacity-70 mb-1">Crop Zoom</label>
            <div className="flex items-center gap-3">
              <ZoomOutIcon className="w-5 h-5 opacity-70" />
              <input type="range" min={0.5} max={5} step="0.01" value={selectedPhoto.crop.scale} onChange={(e) => handleCropChange('scale', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
              <ZoomInIcon className="w-5 h-5 opacity-70" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium opacity-70 mb-1">Rotation</label>
            <div className="flex items-center gap-3">
              <input type="range" min={-180} max={180} step="0.1" value={selectedPhoto.transform.rotation} onChange={(e) => handleTransformChange('rotation', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
              <input type="number" value={Math.round(selectedPhoto.transform.rotation)} onChange={(e) => handleTransformChange('rotation', parseFloat(e.target.value))} className="w-20 bg-[var(--color-background)] border border-[var(--color-border)] rounded-md p-1 text-center" />
            </div>
          </div>
         
          <button onClick={handleResetAdjustments} className="w-full text-xs py-2 px-3 bg-black/20 hover:bg-black/30 rounded-md flex items-center justify-center gap-2">
            <ResetIcon className="w-4 h-4" /> Reset All Adjustments
          </button>
        </div>
      )}

      <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)] space-y-4">
        <div>
          <h3 className="text-sm font-medium opacity-80 mb-2">Global Layout</h3>
          <label className="block text-xs font-medium opacity-70 mb-1">
              Overall Photo Scale: <span className="font-bold text-[var(--color-primary)]">{Math.round(globalPhotoScale * 100)}%</span>
          </label>
          <div className="flex items-center gap-3">
            <ZoomOutIcon className="w-5 h-5 opacity-70" />
            <input 
              type="range" 
              min={0.5} 
              max={1.5} 
              step="0.01" 
              value={globalPhotoScale} 
              onChange={(e) => onGlobalPhotoScaleChange(parseFloat(e.target.value))} 
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            <ZoomInIcon className="w-5 h-5 opacity-70" />
          </div>
        </div>
        <div>
          <label htmlFor="opacity-slider" className="text-sm font-medium opacity-80">Frame Transparency: <span className="font-bold text-[var(--color-primary)]">{Math.round(frameOpacity * 100)}%</span></label>
          <input id="opacity-slider" type="range" min="0" max="1" step="0.01" value={frameOpacity} onChange={(e) => onOpacityChange(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-2" />
        </div>
      </div>
      
      <div className="w-full mt-3">
        <button onClick={onDownload} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400">
          <DownloadIcon className="w-5 h-5" /> Download Your Creation
        </button>
      </div>
      
      <button onClick={onCreateNew} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg shadow-md filter hover:brightness-110 mt-3">
        Create New (Keep Frame)
      </button>

      {!isKioskMode && (
        <div className="w-full text-center mt-2">
          <button onClick={onReset} className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1 mx-auto">
              <ResetIcon className="w-3 h-3" /> Start New Session
          </button>
        </div>
      )}
    </div>
  );
};

export default FinalizeControls;
