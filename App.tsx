import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppSettings, PhotoboothSession, AppStep, Placeholder, Photo, Transform, Crop, UiConfig, GuestScreenMode } from './types';
import FrameUploader from './components/FrameUploader';
import TemplateDesigner from './components/TemplateDesigner';
import PhotoSelector from './components/PhotoSelector';
import FinalizeControls from './components/FinalizeControls';
import CanvasEditor from './components/CanvasEditor';
import StepIndicator from './components/StepIndicator';
import SettingsPanel from './components/SettingsPanel';
import UiCustomizationPanel from './components/UiCustomizationPanel';
import { GoogleGenAI, Modality } from '@google/genai';

import { SettingsIcon, PaletteIcon } from './components/icons';
import { useGuestWindow } from './hooks/useGuestWindow';
import { useHotFolder } from './hooks/useHotFolder';

// Initialize Gemini AI Client.
// The API key is sourced from environment variables for security and flexibility.
const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
if (!apiKey) {
    console.warn("AI features are disabled: Gemini API key not found in environment variables (process.env.API_KEY).");
}

declare const google: any;
declare const gapi: any;

// Helper to create a new Photo object from a src and placeholder
const createPhotoFromPlaceholder = (src: string, placeholder: Placeholder, canvasSize: {width: number, height: number}, imageSize: {width: number, height: number}): Photo => {
    return {
        src,
        originalWidth: imageSize.width,
        originalHeight: imageSize.height,
        transform: {
            x: placeholder.x + placeholder.width / 2,
            y: placeholder.y + placeholder.height / 2,
            width: placeholder.width,
            height: placeholder.height,
            rotation: 0,
        },
        crop: { x: 0, y: 0, scale: 1 },
    };
};

const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
};

const App: React.FC = () => {
    const [appStep, setAppStep] = useState<AppStep>(AppStep.FRAME_UPLOAD);
    const [settings, setSettings] = useState<AppSettings>({
        frameSrc: null,
        hotFolderHandle: null,
        placeholders: [],
        hotFolderName: '',
        driveFolderId: null,
        driveFolderName: '',
        fileNameTemplate: 'photobooth-{timestamp}',
    });
    const [session, setSession] = useState<PhotoboothSession>({
        isActive: false,
        photos: [],
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUiPanelOpen, setIsUiPanelOpen] = useState(false);
    
    // Finalize step state
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(-1);
    const [frameOpacity, setFrameOpacity] = useState(1);
    const [globalPhotoScale, setGlobalPhotoScale] = useState(1);
    const history = useRef<PhotoboothSession[]>([]);
    const historyIndex = useRef(0);
    
    // AI Editing State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiPreviewImage, setAiPreviewImage] = useState<string | null>(null);
    const [finalCompositeImage, setFinalCompositeImage] = useState<string | null>(null);
    
    // Google Drive State
    const [gapiAuthInstance, setGapiAuthInstance] = useState<any>(null);
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
    const tokenClientRef = useRef<any>(null);

    const { guestWindow, openGuestWindow, closeGuestWindow, sendMessage } = useGuestWindow();
    const finalCanvasRef = useRef<HTMLCanvasElement>(null);

    const [uiConfig, setUiConfig] = useState<UiConfig>({
        title: 'UIT Media FrameFusion Photobooth',
        description: 'An elegant photobooth experience for your special event.',
        footer: 'Powered by FrameFusion',
        logoSrc: null,
        backgroundSrc: null,
        fontFamily: "'Roboto', sans-serif",
        primaryColor: '#8b5cf6', // Indigo-500
        textColor: '#e5e7eb', // Gray-200
        backgroundColor: '#111827', // Gray-900
        panelColor: '#1f2937', // Gray-800
        borderColor: '#374151', // Gray-700
    });
    
    // Google API Initialization
    useEffect(() => {
        const gapiScript = document.querySelector<HTMLScriptElement>('script[src="https://apis.google.com/js/api.js"]');
        const gisScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

        const gapiLoaded = () => {
             gapi.load('client:picker', () => {
                 setPickerApiLoaded(true);
             });
        };
        
        const gisLoaded = () => {
            tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                client_id: process.env.GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        gapi.client.setToken(tokenResponse);
                        setIsSignedIn(true);
                        updateAuthInstance(tokenResponse.access_token);
                    }
                },
            });
            
            setGapiAuthInstance({
                signIn: () => tokenClientRef.current?.requestAccessToken({ prompt: '' }),
                signOut: () => {},
                currentUser: null,
                clientId: process.env.GOOGLE_CLIENT_ID,
            });

            setIsGapiReady(true);
        };

        const updateAuthInstance = async (accessToken: string) => {
            try {
                await gapi.client.load('drive', 'v3');
                const response = await gapi.client.drive.about.get({ fields: 'user' });
                const userEmail = response.result.user.emailAddress;
                
                setGapiAuthInstance((prev: any) => ({
                    ...prev,
                    signOut: () => {
                        google.accounts.oauth2.revoke(accessToken, () => {
                            gapi.client.setToken(null);
                            setIsSignedIn(false);
                            setGapiAuthInstance((p: any) => ({ ...p, currentUser: null }));
                        });
                    },
                    currentUser: {
                        get: () => ({
                            getBasicProfile: () => ({ getEmail: () => userEmail }),
                            getAuthResponse: () => ({ access_token: accessToken }),
                        }),
                    },
                }));

            } catch (e) {
                console.error("Error updating auth instance:", e);
            }
        };

        gapiScript!.onload = gapiLoaded;
        gisScript!.onload = gisLoaded;

    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', uiConfig.primaryColor);
        root.style.setProperty('--color-primary-rgb', hexToRgb(uiConfig.primaryColor));
        root.style.setProperty('--color-text-primary', uiConfig.textColor);
        root.style.setProperty('--color-background', uiConfig.backgroundColor);
        root.style.setProperty('--color-panel', uiConfig.panelColor);
        root.style.setProperty('--color-border', uiConfig.borderColor);
        root.style.fontFamily = uiConfig.fontFamily;
        if (uiConfig.backgroundSrc) {
            root.style.setProperty('--background-image', `url(${uiConfig.backgroundSrc})`);
        } else {
            root.style.setProperty('--background-image', 'none');
        }
    }, [uiConfig]);

    const invalidateAiImage = () => {
        if (finalCompositeImage) {
            setFinalCompositeImage(null);
        }
    };

    const handleNewPhotosFromHotFolder = useCallback(async (newPhotos: Map<string, string>) => {
        if (settings.placeholders.length === 0) return;

        const canvas = finalCanvasRef.current ?? document.createElement('canvas');
        const canvasSize = { width: canvas.width, height: canvas.height };
        
        const newPhotoObjects: Photo[] = [];
        const existingPhotoCount = session.photos.length;
        let placeholderIndex = existingPhotoCount;

        for (const [_, url] of newPhotos.entries()) {
            if (placeholderIndex >= settings.placeholders.length) break;
            
            const image = new Image();
            image.src = url;
            await new Promise(resolve => image.onload = resolve);

            const placeholder = settings.placeholders[placeholderIndex];
            const newPhoto = createPhotoFromPlaceholder(url, placeholder, canvasSize, {width: image.width, height: image.height});
            newPhotoObjects.push(newPhoto);
            placeholderIndex++;
        }
        
        setSession(prev => {
            const updatedPhotos = [...prev.photos, ...newPhotoObjects];
             sendMessage({
                mode: GuestScreenMode.REVIEW,
                photos: updatedPhotos,
                frameSrc: settings.frameSrc,
            });
            return { ...prev, photos: updatedPhotos };
        });
    }, [session.photos.length, settings.frameSrc, settings.placeholders, sendMessage]);
    
    const { startPolling, stopPolling } = useHotFolder(settings.hotFolderHandle, handleNewPhotosFromHotFolder) as { startPolling: () => void; stopPolling: () => void; };

    // Setup Flow Handlers
    const handleFrameSelect = (frameFile: File) => {
        const url = URL.createObjectURL(frameFile);
        setSettings(s => ({ ...s, frameSrc: url }));
        setAppStep(AppStep.TEMPLATE_DESIGN);
    };

    const handleTemplateConfirm = (placeholders: Placeholder[]) => {
        setSettings(s => ({ ...s, placeholders }));
        setAppStep(AppStep.PHOTO_UPLOAD);
    };
    
    const handlePhotosSelected = async (photoDataUrls: string[]) => {
      const canvas = finalCanvasRef.current ?? document.createElement('canvas');
      const canvasSize = { width: canvas.width, height: canvas.height };

      const newPhotoObjects: Photo[] = [];
      for (let i = 0; i < photoDataUrls.length; i++) {
        const url = photoDataUrls[i];
        const placeholder = settings.placeholders[i];
        if (!placeholder) continue;

        const image = new Image();
        image.src = url;
        await new Promise(resolve => { image.onload = resolve; });
        
        const newPhoto = createPhotoFromPlaceholder(url, placeholder, canvasSize, {width: image.width, height: image.height});
        newPhotoObjects.push(newPhoto);
      }

      const newSession = { isActive: true, photos: newPhotoObjects };
      setSession(newSession);
      history.current = [newSession];
      historyIndex.current = 0;
      setAppStep(AppStep.FINALIZE_AND_EXPORT);
    };
    
    const handleUseHotFolder = () => {
        if (!settings.hotFolderHandle) {
            alert("Please select a hot folder in the settings first.");
            setIsSettingsOpen(true);
            return;
        }
        const newSession = { isActive: true, photos: [] };
        setSession(newSession);
        history.current = [newSession];
        historyIndex.current = 0;
        startPolling();
        setAppStep(AppStep.FINALIZE_AND_EXPORT);
        sendMessage({ mode: GuestScreenMode.TETHER_PREVIEW, frameSrc: settings.frameSrc, placeholders: settings.placeholders });
    };

    const handleCreateNew = () => {
      stopPolling();
      setSession({ isActive: false, photos: [] });
      setSelectedPhotoIndex(-1);
      setFinalCompositeImage(null);
      setAiPreviewImage(null);
      setAiError(null);
      setAiPrompt('');
      setAppStep(AppStep.PHOTO_UPLOAD);
      sendMessage({ mode: GuestScreenMode.ATTRACT, frameSrc: settings.frameSrc });
    };

    const handleResetApp = () => {
        stopPolling();
        setAppStep(AppStep.FRAME_UPLOAD);
        setSettings(s => ({
            ...s,
            frameSrc: null,
            hotFolderHandle: null,
            placeholders: [],
            hotFolderName: '',
            driveFolderId: null,
            driveFolderName: '',
        }));
        setSession({ isActive: false, photos: [] });
        setSelectedPhotoIndex(-1);
        setFinalCompositeImage(null);
    };

    const handleGenerateQRCode = async () => {
        const image = await getImageForExport();
        if(!image) {
            alert("Could not generate final image.");
            return;
        }
        sendMessage({ mode: GuestScreenMode.DELIVERY, qrCodeValue: image, frameSrc: settings.frameSrc });
    };
    
    const getImageForExport = useCallback(async (): Promise<string | undefined> => {
        if (finalCompositeImage) {
            return finalCompositeImage;
        }
        const canvas = finalCanvasRef.current;
        if (!canvas) return;
        return canvas.toDataURL('image/png');
    }, [finalCompositeImage]);

    // History management for undo/redo
    const updateSessionWithHistory = (newSession: PhotoboothSession) => {
        const newHistory = history.current.slice(0, historyIndex.current + 1);
        newHistory.push(newSession);
        history.current = newHistory;
        historyIndex.current = newHistory.length - 1;
        setSession(newSession);
        sendMessage({ mode: GuestScreenMode.REVIEW, photos: newSession.photos, frameSrc: settings.frameSrc });
    };

    const undo = () => {
        if (historyIndex.current > 0) {
            invalidateAiImage();
            historyIndex.current--;
            setSession(history.current[historyIndex.current]);
            sendMessage({ mode: GuestScreenMode.REVIEW, photos: history.current[historyIndex.current].photos, frameSrc: settings.frameSrc });
        }
    };

    const redo = () => {
        if (historyIndex.current < history.current.length - 1) {
            invalidateAiImage();
            historyIndex.current++;
            setSession(history.current[historyIndex.current]);
            sendMessage({ mode: GuestScreenMode.REVIEW, photos: history.current[historyIndex.current].photos, frameSrc: settings.frameSrc });
        }
    };
    
    // Handlers for FinalizeControls
    const onPhotoUpdate = (index: number, updates: Partial<Photo>) => {
        invalidateAiImage();
        const newPhotos = [...session.photos];
        newPhotos[index] = { ...newPhotos[index], ...updates };
        updateSessionWithHistory({ ...session, photos: newPhotos });
    };
    
    const onReorderPhoto = (index: number, direction: 'forward' | 'backward') => {
        invalidateAiImage();
        const newPhotos = [...session.photos];
        const photoToMove = newPhotos[index];
        newPhotos.splice(index, 1);
        const newIndex = direction === 'forward' ? index + 1 : index - 1;
        newPhotos.splice(newIndex, 0, photoToMove);
        setSelectedPhotoIndex(newIndex);
        updateSessionWithHistory({ ...session, photos: newPhotos });
    };

    const handleOpacityChange = (opacity: number) => {
        invalidateAiImage();
        setFrameOpacity(opacity);
    };

    const handleGlobalScaleChange = (scale: number) => {
        invalidateAiImage();
        setGlobalPhotoScale(scale);
    };

    const handleAiGenerate = async () => {
        if (!ai) {
            setAiError("AI features are disabled. The API key is not configured by the administrator.");
            return;
        }

        if (!aiPrompt.trim()) {
            setAiError("Please enter a prompt to describe your edit.");
            return;
        }
        setAiError(null);
        setIsAiLoading(true);
        setAiPreviewImage(null);
    
        try {
            const imageForEdit = await getImageForExport();
            if (!imageForEdit) {
                throw new Error("Could not get the current image to edit.");
            }
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                data: imageForEdit.split(',')[1],
                                mimeType: 'image/png',
                            },
                        },
                        { text: aiPrompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
    
            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && firstPart.inlineData) {
                const resultBase64 = firstPart.inlineData.data;
                const resultUrl = `data:image/png;base64,${resultBase64}`;
                setAiPreviewImage(resultUrl);
            } else {
                const safetyFeedback = response.candidates?.[0]?.safetyRatings;
                if(safetyFeedback?.some(r => r.blocked)) {
                     throw new Error("The AI generation was blocked due to safety settings. Please try a different prompt.");
                }
                throw new Error("AI did not return an image. Please try again.");
            }
        } catch (err) {
            console.error("AI Generation Error:", err);
            setAiError((err as Error).message);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const handleAiAccept = () => {
        if (aiPreviewImage) {
            setFinalCompositeImage(aiPreviewImage);
            setAiPreviewImage(null);
        }
    };

    const handleAiDiscard = () => {
        setAiPreviewImage(null);
    };


    const renderFinalizeStep = () => {
        return (
            <div className="min-h-screen p-8 flex flex-col items-center">
                 <UiCustomizationPanel isOpen={isUiPanelOpen} onClose={() => setIsUiPanelOpen(false)} config={uiConfig} onConfigChange={setUiConfig} />
                <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSettingsChange={setSettings} />

                <header className="w-full max-w-7xl flex justify-between items-center mb-8">
                     <div>
                        <h1 className="text-4xl font-bold text-[var(--color-primary)]">{uiConfig.title}</h1>
                        <p className="opacity-70">{uiConfig.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsUiPanelOpen(true)} className="p-2 bg-[var(--color-panel)] rounded-lg hover:bg-black/20" title="Customize UI">
                            <PaletteIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-[var(--color-panel)] rounded-lg hover:bg-black/20" title="Settings"><SettingsIcon /></button>
                        {guestWindow ? (<button onClick={closeGuestWindow} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Close Guest Window</button>) : (<button onClick={openGuestWindow} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Open Guest Window</button>)}
                    </div>
                </header>

                <main className="w-full max-w-7xl flex-grow flex flex-col lg:flex-row gap-8">
                    <div className="w-full lg:w-2/3 relative">
                        <CanvasEditor 
                            canvasRef={finalCanvasRef}
                            frameSrc={settings.frameSrc}
                            photos={session.photos}
                            selectedPhotoIndex={selectedPhotoIndex}
                            onSelectPhoto={setSelectedPhotoIndex}
                            onPhotoUpdate={onPhotoUpdate}
                            frameOpacity={frameOpacity}
                            onReorderPhoto={onReorderPhoto}
                            globalPhotoScale={globalPhotoScale}
                        />
                        {finalCompositeImage && (
                            <div className="absolute inset-0 pointer-events-none">
                                <img src={finalCompositeImage} alt="Final Composite" className="w-full h-full object-contain" />
                            </div>
                        )}
                        {aiPreviewImage && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 p-4 z-20">
                                <img src={aiPreviewImage} alt="AI Preview" className="max-w-full max-h-[70%] object-contain rounded-lg border-2 border-[var(--color-primary)]" />
                                <div className="flex gap-4">
                                    <button onClick={handleAiAccept} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Accept</button>
                                    <button onClick={handleAiDiscard} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Discard</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="w-full lg:w-1/3">
                        <div className="flex flex-col gap-4">
                                <FinalizeControls
                                    onDownload={() => {}}
                                    onGetImageForExport={getImageForExport}
                                    onReset={handleResetApp}
                                    onCreateNew={handleCreateNew}
                                    frameOpacity={frameOpacity}
                                    onOpacityChange={handleOpacityChange}
                                    photos={session.photos}
                                    selectedPhotoIndex={selectedPhotoIndex}
                                    onSelectPhoto={setSelectedPhotoIndex}
                                    onPhotoUpdate={onPhotoUpdate}
                                    onResetPhotoAdjustments={() => {}}
                                    undo={undo} redo={redo}
                                    canUndo={historyIndex.current > 0} canRedo={historyIndex.current < history.current.length - 1}
                                    isKioskMode={false}
                                    globalPhotoScale={globalPhotoScale}
                                    onGlobalPhotoScaleChange={handleGlobalScaleChange}
                                    aiPrompt={aiPrompt}
                                    onAiPromptChange={setAiPrompt}
                                    onAiGenerate={handleAiGenerate}
                                    isAiLoading={isAiLoading}
                                    aiError={aiError}
                                />
                                <button onClick={handleGenerateQRCode} disabled={session.photos.length === 0} className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 disabled:bg-gray-600">
                                    Show QR Code on Guest Screen
                                </button>
                            </div>
                    </div>
                    </main>
            </div>
        );
    }
    
    const renderSetup = () => {
        const CurrentStepComponent = {
            [AppStep.FRAME_UPLOAD]: <FrameUploader onFrameSelect={handleFrameSelect} organizerSettings={settings} onSettingsChange={(newSettings) => setSettings(s => ({...s, ...newSettings}))} setDirectoryHandle={(handle) => {
                // This is for local download path, not the hot folder, so we don't set a handle here.
            }} gapiAuthInstance={gapiAuthInstance} isGapiReady={isGapiReady} isSignedIn={isSignedIn} pickerApiLoaded={pickerApiLoaded} />,
            [AppStep.TEMPLATE_DESIGN]: <TemplateDesigner frameSrc={settings.frameSrc} onTemplateConfirm={handleTemplateConfirm} />,
            [AppStep.PHOTO_UPLOAD]: <PhotoSelector 
                onPhotosSelect={handlePhotosSelected}
                onUseHotFolder={handleUseHotFolder}
                placeholders={settings.placeholders}
                frameSrc={settings.frameSrc}
            />,
        }[appStep];
        
        return (
            <div className="min-h-screen flex flex-col items-center p-4">
                <UiCustomizationPanel isOpen={isUiPanelOpen} onClose={() => setIsUiPanelOpen(false)} config={uiConfig} onConfigChange={setUiConfig} />
                <header className="w-full flex justify-center items-center absolute top-8 px-8">
                    <div className="flex-1">
                        {/* You can add a logo or title here later */}
                    </div>
                    <div className="flex-1 flex justify-center">
                        <StepIndicator currentStep={appStep} />
                    </div>
                    <div className="flex-1 flex justify-end">
                        <button onClick={() => setIsUiPanelOpen(true)} className="p-2 bg-[var(--color-panel)] rounded-lg hover:bg-black/20" title="Customize UI">
                            <PaletteIcon className="w-6 h-6" />
                        </button>
                    </div>
                </header>
                <div className="flex-grow flex items-center justify-center w-full">
                    {CurrentStepComponent}
                </div>
            </div>
        )
    };

    return (
        <div className="min-h-screen antialiased relative bg-[var(--color-background)] text-[var(--color-text-primary)]">
             <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: uiConfig.backgroundSrc ? `url(${uiConfig.backgroundSrc})` : 'none', opacity: 0.1}}></div>
             <div className="relative z-10">
                {appStep === AppStep.FINALIZE_AND_EXPORT ? renderFinalizeStep() : renderSetup()}
             </div>
        </div>
    );
};

export default App;