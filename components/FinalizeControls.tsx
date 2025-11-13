

import React, { useState } from 'react';
import { DownloadIcon, ResetIcon, ZoomInIcon, ZoomOutIcon, GoogleDriveIcon, UndoIcon, RedoIcon } from './icons';
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
  onReorderPhoto: (index: number, direction: 'forward' | 'backward') => void;
  onResetPhotoAdjustments: (index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isKioskMode: boolean;
}

type DriveModalStatus = 'idle' | 'connecting' | 'exporting' | 'success' | 'error';

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
    onReorderPhoto,
    onResetPhotoAdjustments,
    undo,
    redo,
    canUndo,
    canRedo,
    isKioskMode,
}) => {
  const selectedPhoto = selectedPhotoIndex !== -1 ? photos[selectedPhotoIndex] : null;
  const [driveModalState, setDriveModalState] = useState<{ open: boolean, status: DriveModalStatus }>({ open: false, status: 'idle' });

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
  
  const handleExportToDrive = async () => {
    setDriveModalState({ open: true, status: 'connecting' });
    await new Promise(res => setTimeout(res, 1500)); // Simulate API call
    
    setDriveModalState({ open: true, status: 'exporting' });
    const imageData = await onGetImageForExport();

    if (!imageData) {
        setDriveModalState({ open: true, status: 'error' });
        return;
    }

    await new Promise(res => setTimeout(res, 2000)); // Simulate upload
    setDriveModalState({ open: true, status: 'success' });
  };

  const handleExportAll = () => {
      onDownload();
      handleExportToDrive();
  };

  const closeDriveModal = () => {
      setDriveModalState({ open: false, status: 'idle' });
  }

  const renderDriveModal = () => {
    if (!driveModalState.open) return null;
    
    let content;
    switch(driveModalState.status) {
        case 'idle':
            content = (<>
                <h3 className="text-lg font-medium leading-6">Export to Google Drive</h3>
                <p className="mt-2 text-sm opacity-70">This is a simulated action. In a real application, this would connect to Google Drive to save the image.</p>
                <div className="mt-4">
                    <button onClick={handleExportToDrive} type="button" className="inline-flex justify-center rounded-md border border-transparent bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white filter hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2">Connect & Export</button>
                    <button onClick={closeDriveModal} type="button" className="ml-2 inline-flex justify-center rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium opacity-80 hover:bg-black/20">Cancel</button>
                </div>
            </>);
            break;
        case 'connecting':
        case 'exporting':
            content = (<>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 border-4 border-t-[var(--color-primary)] border-gray-600 rounded-full animate-spin"></div>
                    <div>
                        <h3 className="text-lg font-medium leading-6">{driveModalState.status === 'connecting' ? 'Connecting to Google...' : 'Exporting Image...'}</h3>
                        <p className="mt-1 text-sm opacity-70">Please wait.</p>
                    </div>
                </div>
            </>);
            break;
        case 'success':
            content = (<>
                <h3 className="text-lg font-medium leading-6 text-green-400">Success!</h3>
                <p className="mt-2 text-sm opacity-70">Your image has been saved to your Google Drive.</p>
                <div className="mt-4"><button onClick={closeDriveModal} type="button" className="inline-flex justify-center rounded-md border border-transparent bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white filter hover:brightness-110">Done</button></div>
            </>);
            break;
        case 'error':
             content = (<>
                <h3 className="text-lg font-medium leading-6 text-red-400">Error</h3>
                <p className="mt-2 text-sm opacity-70">Could not export the image. Please try again.</p>
                <div className="mt-4"><button onClick={closeDriveModal} type="button" className="inline-flex justify-center rounded-md border border-transparent bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white filter hover:brightness-110">Close</button></div>
            </>);
            break;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" aria-modal="true">
            <div className="relative transform overflow-hidden rounded-lg bg-[var(--color-panel)] border border-[var(--color-border)] text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg p-6">
                {content}
            </div>
        </div>
    );
  }


  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 mt-8 lg:mt-0">
      {renderDriveModal()}
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
          <h3 className="text-sm font-medium opacity-80">Photo Adjustments (Selected)</h3>
          <p className="text-xs text-gray-500 -mt-2">Drag photo to pan, scroll to zoom, use handle to rotate.</p>
          
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

           <div>
            <label className="block text-xs font-medium opacity-70 mb-1">Layering</label>
            <div className="flex items-center gap-3">
                <button onClick={() => onReorderPhoto(selectedPhotoIndex, 'backward')} className="w-full text-xs py-2 px-3 bg-black/20 hover:bg-black/30 rounded-md">Send Backward</button>
                <button onClick={() => onReorderPhoto(selectedPhotoIndex, 'forward')} className="w-full text-xs py-2 px-3 bg-black/20 hover:bg-black/30 rounded-md">Bring Forward</button>
            </div>
          </div>
         
          <button onClick={handleResetAdjustments} className="w-full text-xs py-2 px-3 bg-black/20 hover:bg-black/30 rounded-md flex items-center justify-center gap-2">
            <ResetIcon className="w-4 h-4" /> Reset All Adjustments
          </button>
        </div>
      )}
      
      <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)]">
        <label htmlFor="opacity-slider" className="text-sm font-medium opacity-80">Frame Transparency: <span className="font-bold text-[var(--color-primary)]">{Math.round(frameOpacity * 100)}%</span></label>
        <input id="opacity-slider" type="range" min="0" max="1" step="0.01" value={frameOpacity} onChange={(e) => onOpacityChange(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-2" />
      </div>

      <div className="w-full">
        <button onClick={handleExportAll} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400">
           Export All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-3">
        <button onClick={onDownload} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400">
          <DownloadIcon className="w-5 h-5" /> Download JPG
        </button>
         <button onClick={() => handleExportToDrive()} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <GoogleDriveIcon className="w-5 h-5 text-[#4285F4]" /> Export to Drive
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