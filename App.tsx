

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppStep, Photo, Placeholder, OrganizerSettings } from './types';
import FrameUploader from './components/FrameUploader';
import PhotoSelector, { useHistoryState } from './components/PhotoSelector';
import CanvasEditor from './components/CanvasEditor';
import FinalizeControls from './components/FinalizeControls';
import TemplateDesigner from './components/TemplateDesigner';
import StepIndicator from './components/StepIndicator';
import UiCustomizationPanel from './components/UiCustomizationPanel';
import { PaletteIcon } from './components/icons';

export interface UiConfig {
  title: string;
  description: string;
  footer: string;
  logoSrc: string | null;
  backgroundSrc: string | null;
  fontFamily: string;
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  panelColor: string;
  borderColor: string;
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.FRAME_UPLOAD);
  const [frameImage, setFrameImage] = useState<string | null>(null);
  const { 
    state: userPhotos, 
    setState: setUserPhotos, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    reset: resetUserPhotos 
  } = useHistoryState<Photo[]>([]);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [frameOpacity, setFrameOpacity] = useState(1);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(-1);
  const [organizerSettings, setOrganizerSettings] = useState<OrganizerSettings>({
      driveFolderUrl: '',
      localDownloadPath: '',
      kioskMode: false,
      autoResetTimer: 0,
  });
  const [uiConfig, setUiConfig] = useState<UiConfig>({
    title: 'UIT Media FrameFusion Photobooth',
    description: 'Test',
    footer: '© 2024 UIT Media. A simulated photobooth experience.',
    logoSrc: null,
    backgroundSrc: null,
    fontFamily: "'Roboto', sans-serif",
    primaryColor: '#6366F1', // indigo-500
    textColor: '#F9FAFB', // gray-50
    backgroundColor: '#111827', // gray-900
    panelColor: '#1F2937', // gray-800
    borderColor: '#4B5563', // gray-600
  });
  const [isUiPanelOpen, setIsUiPanelOpen] = useState(false);

  const inactivityTimerRef = useRef<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Effect to apply theme and font changes globally
  useEffect(() => {
    const root = document.documentElement;
    
    const hexToRgb = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '99, 102, 241'; // Default to indigo-500 RGB if parse fails
    };

    root.style.setProperty('--color-primary', uiConfig.primaryColor);
    root.style.setProperty('--color-primary-rgb', hexToRgb(uiConfig.primaryColor));
    root.style.setProperty('--color-text-primary', uiConfig.textColor);
    root.style.setProperty('--color-background', uiConfig.backgroundColor);
    root.style.setProperty('--color-panel', uiConfig.panelColor);
    root.style.setProperty('--color-border', uiConfig.borderColor);

    document.body.style.fontFamily = uiConfig.fontFamily;
  }, [uiConfig]);

  const handleReset = useCallback(() => {
    if (frameImage) URL.revokeObjectURL(frameImage);
    setFrameImage(null);
    resetUserPhotos([]);
    setPlaceholders([]);
    setFrameOpacity(1);
    setSelectedPhotoIndex(-1);
    setCurrentStep(AppStep.FRAME_UPLOAD);
  }, [frameImage, resetUserPhotos]);

  const handleCreateNew = useCallback(() => {
    resetUserPhotos([]);
    setSelectedPhotoIndex(-1);
    setCurrentStep(AppStep.PHOTO_UPLOAD);
  }, [resetUserPhotos]);
  
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
    }
    if (currentStep === AppStep.EDIT_AND_EXPORT && organizerSettings.autoResetTimer > 0) {
        inactivityTimerRef.current = window.setTimeout(() => {
            handleCreateNew();
        }, organizerSettings.autoResetTimer * 1000);
    }
  }, [currentStep, organizerSettings.autoResetTimer, handleCreateNew]);
  
  useEffect(() => {
    resetInactivityTimer();
    return () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer, userPhotos, selectedPhotoIndex, frameOpacity]);


  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        resetInactivityTimer();
        if (currentStep < AppStep.PHOTO_UPLOAD) return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key === 'z' && !e.shiftKey;
        const isRedo = (isMac ? e.metaKey : e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey));

        if (isUndo) {
            e.preventDefault();
            undo();
        } else if (isRedo) {
            e.preventDefault();
            redo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('mousedown', resetInactivityTimer);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('mousedown', resetInactivityTimer);
    }
  }, [currentStep, undo, redo, resetInactivityTimer]);


  const handleFrameSelect = (frameFile: File) => {
    const frameDataUrl = URL.createObjectURL(frameFile);
    setFrameImage(frameDataUrl);
    setCurrentStep(AppStep.TEMPLATE_DESIGN);
  };

  const handleTemplateConfirm = (confirmedPlaceholders: Placeholder[]) => {
    setPlaceholders(confirmedPlaceholders);
    setCurrentStep(AppStep.PHOTO_UPLOAD);
  };

  const handlePhotosSelect = async (photoDataUrls: string[]) => {
    const photos: Photo[] = await Promise.all(
      photoDataUrls.map(async (src, index): Promise<Photo> => {
        const placeholder = placeholders[index];
        const { originalWidth, originalHeight } = await new Promise<{originalWidth: number, originalHeight: number}>(resolve => {
            const img = new Image();
            img.onload = () => resolve({ originalWidth: img.width, originalHeight: img.height });
            img.src = src;
        });
        
        return {
          src,
          originalWidth,
          originalHeight,
          transform: {
            x: placeholder.x + placeholder.width / 2,
            y: placeholder.y + placeholder.height / 2,
            width: placeholder.width,
            height: placeholder.height,
            rotation: 0,
          },
          crop: {
            x: 0,
            y: 0,
            scale: 1,
          },
        };
      })
    );
    resetUserPhotos(photos);
    setSelectedPhotoIndex(photos.length > 0 ? 0 : -1);
    setCurrentStep(AppStep.EDIT_AND_EXPORT);
  };

  const handlePhotoUpdate = (index: number, updates: Partial<Photo>) => {
    setUserPhotos(currentPhotos =>
        currentPhotos.map((photo, i) =>
            i === index ? { ...photo, ...updates } : photo
        )
    );
  };

  const handleResetPhotoAdjustments = (index: number) => {
    if (index === -1) return;
    const photoToReset = userPhotos[index];
    const placeholder = placeholders[index];
    const updates: Partial<Photo> = {
        transform: {
            ...photoToReset.transform,
            rotation: 0
        },
        crop: { x: 0, y: 0, scale: 1 },
    };
    handlePhotoUpdate(index, updates);
  };

  const handleReorderPhoto = (index: number, direction: 'forward' | 'backward') => {
      setUserPhotos(currentPhotos => {
          if (index < 0 || index >= currentPhotos.length) return currentPhotos;
          const photoToMove = currentPhotos[index];
          const otherPhotos = currentPhotos.filter((_, i) => i !== index);
          
          let newIndex = index;
          if (direction === 'forward') {
              newIndex = Math.min(index + 1, otherPhotos.length);
          } else {
              newIndex = Math.max(index - 1, 0);
          }
          otherPhotos.splice(newIndex, 0, photoToMove);
          setSelectedPhotoIndex(newIndex);
          return otherPhotos;
      });
  };
  
  const handleDownload = useCallback(async () => {
    const originalCanvas = canvasRef.current;
    if (!originalCanvas || !frameImage) return;

    const frameImg = new Image();
    await new Promise(resolve => { frameImg.onload = resolve; frameImg.src = frameImage; });

    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    const EXPORT_RESOLUTION_WIDTH = frameImg.width;
    const EXPORT_RESOLUTION_HEIGHT = frameImg.height;

    exportCanvas.width = EXPORT_RESOLUTION_WIDTH;
    exportCanvas.height = EXPORT_RESOLUTION_HEIGHT;
    
    exportCtx.fillStyle = '#1f2937';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    const imageElements = await Promise.all(
        userPhotos.map(p => new Promise<HTMLImageElement>(resolve => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.src = p.src;
        }))
    );

    userPhotos.forEach((photo, index) => {
        const img = imageElements[index];
        if (!img) return;

        const { x, y, width, height, rotation } = photo.transform;
        
        const absX = x * exportCanvas.width;
        const absY = y * exportCanvas.height;
        const absWidth = width * exportCanvas.width;
        const absHeight = height * exportCanvas.height;
        const angle = rotation * Math.PI / 180;
        
        exportCtx.save();
        exportCtx.translate(absX, absY);
        exportCtx.rotate(angle);
        
        exportCtx.beginPath();
        exportCtx.rect(-absWidth / 2, -absHeight / 2, absWidth, absHeight);
        exportCtx.clip();
        
        const { crop } = photo;
        const imgAspectRatio = photo.originalWidth / photo.originalHeight;
        
        let displayWidth = absWidth;
        let displayHeight = absHeight;
        
        if (imgAspectRatio > absWidth / absHeight) {
          displayHeight = absHeight;
          displayWidth = displayHeight * imgAspectRatio;
        } else {
          displayWidth = absWidth;
          displayHeight = displayWidth / imgAspectRatio;
        }

        displayWidth *= crop.scale;
        displayHeight *= crop.scale;
        
        exportCtx.drawImage(
            img, 
            (-displayWidth / 2) + crop.x, 
            (-displayHeight / 2) + crop.y,
            displayWidth, 
            displayHeight
        );
        
        exportCtx.restore();
    });

    exportCtx.globalAlpha = frameOpacity;
    exportCtx.drawImage(frameImg, 0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.globalAlpha = 1.0;
    
    const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.98);
    return dataUrl;
  }, [userPhotos, frameImage, frameOpacity]);
  
  const triggerDownload = useCallback(async () => {
    const dataUrl = await handleDownload();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `photobooth-strip-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [handleDownload]);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case AppStep.FRAME_UPLOAD:
        return <FrameUploader onFrameSelect={handleFrameSelect} organizerSettings={organizerSettings} onSettingsChange={setOrganizerSettings} />;
      case AppStep.TEMPLATE_DESIGN:
        return <TemplateDesigner frameSrc={frameImage} onTemplateConfirm={handleTemplateConfirm} />;
      case AppStep.PHOTO_UPLOAD:
        return (
          <PhotoSelector 
            onPhotosSelect={handlePhotosSelect} 
            placeholders={placeholders}
            frameSrc={frameImage}
          />
        );
      case AppStep.EDIT_AND_EXPORT:
        return (
            <div className="flex flex-col lg:flex-row items-start justify-center gap-12">
                <CanvasEditor 
                    frameSrc={frameImage} 
                    photos={userPhotos} 
                    canvasRef={canvasRef} 
                    frameOpacity={frameOpacity}
                    selectedPhotoIndex={selectedPhotoIndex}
                    onSelectPhoto={setSelectedPhotoIndex}
                    onPhotoUpdate={handlePhotoUpdate}
                />
                <FinalizeControls
                    onDownload={triggerDownload} 
                    onGetImageForExport={handleDownload}
                    onReset={handleReset} 
                    onCreateNew={handleCreateNew}
                    frameOpacity={frameOpacity} 
                    onOpacityChange={setFrameOpacity} 
                    photos={userPhotos}
                    selectedPhotoIndex={selectedPhotoIndex}
                    onSelectPhoto={setSelectedPhotoIndex}
                    onPhotoUpdate={handlePhotoUpdate}
                    onReorderPhoto={handleReorderPhoto}
                    onResetPhotoAdjustments={handleResetPhotoAdjustments}
                    undo={undo}
                    redo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    isKioskMode={organizerSettings.kioskMode}
                />
            </div>
        );
      default:
        return <div>Error: Unknown step</div>;
    }
  };

  return (
    <div 
      className="min-h-screen p-4 sm:p-8 flex flex-col items-center transition-all duration-500 antialiased"
      style={{
        color: uiConfig.textColor,
        backgroundColor: uiConfig.backgroundColor,
        backgroundImage: uiConfig.backgroundSrc ? `url(${uiConfig.backgroundSrc})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {uiConfig.backgroundSrc && <div className="absolute inset-0 bg-black/70 backdrop-blur-sm -z-10" />}
      <UiCustomizationPanel
          isOpen={isUiPanelOpen}
          onClose={() => setIsUiPanelOpen(false)}
          config={uiConfig}
          onConfigChange={setUiConfig}
      />
      
      <header className="relative w-full text-center mb-8 z-10">
        <div className="flex items-center justify-center gap-4">
            {uiConfig.logoSrc && <img src={uiConfig.logoSrc} alt="Logo" className="h-12 sm:h-16 object-contain" />}
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-[var(--color-primary)]">
                {uiConfig.title}
              </h1>
            </div>
        </div>
        <p className="mt-2 text-lg opacity-80">{uiConfig.description}</p>
        <button 
            onClick={() => setIsUiPanelOpen(true)} 
            className="absolute top-0 right-0 p-2 opacity-70 hover:opacity-100 transition-colors"
            title="Customize UI"
        >
            <PaletteIcon className="w-6 h-6" />
        </button>
      </header>
      
      <div className="w-full max-w-5xl mx-auto mb-12 mt-4 h-20 flex justify-center items-center z-10">
         <StepIndicator currentStep={currentStep} />
      </div>
      
      <main className="w-full flex-grow flex items-center justify-center z-10">
        {renderCurrentStep()}
      </main>

      <footer className="text-center opacity-70 text-sm mt-12 z-10">
          <p>{uiConfig.footer}</p>
      </footer>
    </div>
  );
};

export default App;