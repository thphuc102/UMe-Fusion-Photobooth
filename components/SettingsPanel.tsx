import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '../types';
import { GoogleDriveIcon, UploadIcon } from './icons';

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite';
    }): Promise<FileSystemDirectoryHandle>;
  }
}

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
    const [localSettings, setLocalSettings] = useState(settings);
    const frameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSettingsChange(localSettings);
        onClose();
    };
    
    const handleSettingChange = (field: keyof AppSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSelectHotFolder = async () => {
        try {
            if (!('showDirectoryPicker' in window)) {
                alert('Your browser does not support local folder access. Please use a modern browser like Chrome or Edge.');
                return;
            }
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setLocalSettings(prev => ({ ...prev, hotFolderHandle: handle, hotFolderName: handle.name }));
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              console.error('Error selecting directory:', err);
            }
        }
    };
    
    const handleFrameFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'image/png') {
            const url = URL.createObjectURL(file);
            handleSettingChange('frameSrc', url);
        } else {
            alert('Please select a valid PNG file.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" aria-modal="true">
            <div className="relative transform overflow-hidden rounded-lg bg-gray-800 border border-gray-700 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg p-6 space-y-6">
                <h3 className="text-lg font-medium leading-6 text-gray-100">Operator Settings</h3>
                
                {/* Frame Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Frame Overlay (PNG)</label>
                    <input type="file" ref={frameInputRef} onChange={handleFrameFileChange} accept="image/png" className="hidden" />
                     <div className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-900/50">
                        {localSettings.frameSrc ? (
                            <div className="relative group p-2">
                                <img src={localSettings.frameSrc} alt="Frame Preview" className="max-h-28 max-w-full object-contain" />
                                <button onClick={() => frameInputRef.current?.click()} className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    Change
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => frameInputRef.current?.click()} className="text-center text-gray-500 hover:text-indigo-400">
                                <UploadIcon className="mx-auto h-8 w-8" />
                                <p className="text-xs mt-1">Upload Frame</p>
                            </button>
                        )}
                    </div>
                </div>

                {/* Hot Folder Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300">Capture One Hot Folder</label>
                    <p className="text-xs text-gray-500 mb-2">Select the folder C1 saves images to (e.g., the 'Selects' folder).</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="text" readOnly value={localSettings.hotFolderName || "No folder selected"} className="block w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-gray-300" />
                      <button onClick={handleSelectHotFolder} className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-md hover:bg-indigo-600 flex-shrink-0">Select Folder...</button>
                    </div>
                </div>
                
                {/* File Naming */}
                 <div>
                    <label htmlFor="fileNameTemplate" className="block text-sm font-medium text-gray-300">File Name Template</label>
                    <input type="text" id="fileNameTemplate" value={localSettings.fileNameTemplate} onChange={(e) => handleSettingChange('fileNameTemplate', e.target.value)} className="mt-1 block w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-gray-200" />
                    <p className="text-xs text-gray-500 mt-1">Placeholders: <code className="bg-black/20 px-1 rounded">{`{timestamp}`}</code></p>
                </div>

                {/* Buttons */}
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="inline-flex justify-center rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700">Cancel</button>
                    <button type="button" onClick={handleSave} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600">Save Settings</button>
                </div>
            </div>
        </div>
    );
}

export default SettingsPanel;
