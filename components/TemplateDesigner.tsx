

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Placeholder } from '../types';

interface TemplateDesignerProps {
  frameSrc: string | null;
  onTemplateConfirm: (placeholders: Placeholder[]) => void;
}

type InteractionMode = 'idle' | 'panning' | 'resizing';
type Handle = 'tl' | 'tr' | 'br' | 'bl' | 't' | 'r' | 'b' | 'l';
const HANDLE_SIZE = 10;
const ASPECT_RATIOS: Record<string, string | null> = {
    'Free': null,
    '1:1': '1:1',
    '4:3': '4:3',
    '3:2': '3:2',
    '3:4': '3:4',
    '16:9': '16:9',
    '9:16': '9:16'
};


const TemplateDesigner: React.FC<TemplateDesignerProps> = ({ frameSrc, onTemplateConfirm }) => {
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const interaction = useRef({
      mode: 'idle' as InteractionMode,
      activeHandle: null as Handle | null,
      startX: 0,
      startY: 0,
      startPlaceholder: null as Placeholder | null
  });

  const [cursor, setCursor] = useState('default');
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
  const [frameAspectRatio, setFrameAspectRatio] = useState('2 / 3');

  useEffect(() => {
    if (frameSrc) {
        const img = new Image();
        img.onload = () => {
            setFrameImage(img);
            if (img.width > 0 && img.height > 0) {
              setFrameAspectRatio(`${img.width} / ${img.height}`);
            }
        };
        img.src = frameSrc;
    }
  }, [frameSrc]);

  const removeSelectedPlaceholder = useCallback(() => {
    if (selectedPlaceholderId !== null) {
      setPlaceholders(prev => prev.filter(p => p.id !== selectedPlaceholderId));
      setSelectedPlaceholderId(null);
    }
  }, [selectedPlaceholderId]);

  // Keyboard shortcut for deleting placeholder
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (selectedPlaceholderId !== null && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            removeSelectedPlaceholder();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlaceholderId, removeSelectedPlaceholder]);

  const addPlaceholder = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newId = Date.now();
    const newPlaceholder: Placeholder = {
      id: newId,
      x: 0.1,
      y: 0.1,
      width: 0.25,
      height: 0.25 * (canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height) * (3/2),
      aspectRatio: null,
    };
    setPlaceholders(prev => [...prev, newPlaceholder]);
    setSelectedPlaceholderId(newId);
  };
  
  const handleSetAspectRatio = (ratio: string | null) => {
    if (selectedPlaceholderId === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPlaceholders(prev => prev.map(p => {
        if (p.id !== selectedPlaceholderId) return p;
        
        const newP = { ...p, aspectRatio: ratio };
        if (ratio) {
            const [w, h] = ratio.split(':').map(Number);
            const canvasRect = canvas.getBoundingClientRect();
            const canvasRatio = canvasRect.width / canvasRect.height;
            newP.height = newP.width * canvasRatio * (h / w);
        }
        return newP;
    }));
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const primaryRgb = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-rgb').trim();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (frameImage) {
      ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
    }
    
    const dpr = window.devicePixelRatio || 1;
    placeholders.forEach(p => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      const width = p.width * canvas.width;
      const height = p.height * canvas.height;

      ctx.fillStyle = `rgba(${primaryRgb}, 0.3)`;
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = `rgba(${primaryRgb}, 0.8)`;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(x, y, width, height);

      if (p.id === selectedPlaceholderId) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(x, y, width, height);
        
        const handleSize = HANDLE_SIZE * dpr;
        const handles = {
            tl: { x: x, y: y },
            tr: { x: x + width, y: y },
            br: { x: x + width, y: y + height },
            bl: { x: x, y: y + height },
            t: { x: x + width / 2, y: y },
            r: { x: x + width, y: y + height / 2 },
            b: { x: x + width / 2, y: y + height },
            l: { x: x, y: y + height / 2 },
        };
        Object.entries(handles).forEach(([key, h]) => {
            ctx.beginPath();
            if (['tl', 'tr', 'br', 'bl'].includes(key)) {
                ctx.fillStyle = 'white';
                ctx.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
            } else {
                ctx.fillStyle = `rgba(${primaryRgb}, 0.8)`;
                ctx.arc(h.x, h.y, handleSize / 2.2, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
      }
    });

  }, [frameImage, placeholders, selectedPlaceholderId]);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderLoop = () => {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = container.getBoundingClientRect();

        const newWidth = Math.round(width * dpr);
        const newHeight = Math.round(height * dpr);
        
        if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
        }

        draw();
        animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw]);

  const getMousePos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { 
        x: (e.clientX - rect.left) * dpr, 
        y: (e.clientY - rect.top) * dpr 
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const mouse = getMousePos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const selectedPlaceholder = placeholders.find(p => p.id === selectedPlaceholderId);

    if (selectedPlaceholder) {
        const p = selectedPlaceholder;
        const abs = { x: p.x * canvas.width, y: p.y * canvas.height, w: p.width * canvas.width, h: p.height * canvas.height };
        const handles = {
            tl: { x: abs.x, y: abs.y }, tr: { x: abs.x + abs.w, y: abs.y },
            br: { x: abs.x + abs.w, y: abs.y + abs.h }, bl: { x: abs.x, y: abs.y + abs.h },
            t: { x: abs.x + abs.w / 2, y: abs.y },
            r: { x: abs.x + abs.w, y: abs.y + abs.h / 2 },
            b: { x: abs.x + abs.w / 2, y: abs.y + abs.h },
            l: { x: abs.x, y: abs.y + abs.h / 2 },
        };
        for (const [key, pos] of Object.entries(handles)) {
            if (Math.hypot(mouse.x - pos.x, mouse.y - pos.y) < (HANDLE_SIZE * dpr)) {
                interaction.current.mode = 'resizing';
                interaction.current.activeHandle = key as Handle;
                interaction.current.startX = mouse.x;
                interaction.current.startY = mouse.y;
                interaction.current.startPlaceholder = { ...p };
                return;
            }
        }
    }

    let hit = false;
    for (let i = placeholders.length - 1; i >= 0; i--) {
        const p = placeholders[i];
        const abs = { x: p.x * canvas.width, y: p.y * canvas.height, w: p.width * canvas.width, h: p.height * canvas.height };
        if (mouse.x >= abs.x && mouse.x <= abs.x + abs.w && mouse.y >= abs.y && mouse.y <= abs.y + abs.h) {
            setSelectedPlaceholderId(p.id);
            interaction.current.mode = 'panning';
            interaction.current.startX = mouse.x;
            interaction.current.startY = mouse.y;
            interaction.current.startPlaceholder = { ...p };
            hit = true;
            break;
        }
    }
    if (!hit) setSelectedPlaceholderId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mouse = getMousePos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;

    if (interaction.current.mode === 'idle') {
        let newCursor = 'default';
        const p = placeholders.find(p => p.id === selectedPlaceholderId);
        if (p) {
            const abs = { x: p.x * canvas.width, y: p.y * canvas.height, w: p.width * canvas.width, h: p.height * canvas.height };
            const handles = {
                tl: { x: abs.x, y: abs.y }, tr: { x: abs.x + abs.w, y: abs.y },
                br: { x: abs.x + abs.w, y: abs.y + abs.h }, bl: { x: abs.x, y: abs.y + abs.h },
                t: { x: abs.x + abs.w / 2, y: abs.y }, r: { x: abs.x + abs.w, y: abs.y + abs.h / 2 },
                b: { x: abs.x + abs.w / 2, y: abs.y + abs.h }, l: { x: abs.x, y: abs.y + abs.h / 2 },
            };
            const handleSize = HANDLE_SIZE * dpr;
            if ((Math.hypot(mouse.x - handles.tl.x, mouse.y - handles.tl.y) < handleSize) || (Math.hypot(mouse.x - handles.br.x, mouse.y - handles.br.y) < handleSize)) {
                newCursor = 'nwse-resize';
            } else if ((Math.hypot(mouse.x - handles.tr.x, mouse.y - handles.tr.y) < handleSize) || (Math.hypot(mouse.x - handles.bl.x, mouse.y - handles.bl.y) < handleSize)) {
                newCursor = 'nesw-resize';
            } else if ((Math.hypot(mouse.x - handles.t.x, mouse.y - handles.t.y) < handleSize) || (Math.hypot(mouse.x - handles.b.x, mouse.y - handles.b.y) < handleSize)) {
                newCursor = 'ns-resize';
            } else if ((Math.hypot(mouse.x - handles.l.x, mouse.y - handles.l.y) < handleSize) || (Math.hypot(mouse.x - handles.r.x, mouse.y - handles.r.y) < handleSize)) {
                newCursor = 'ew-resize';
            } else if (mouse.x >= abs.x && mouse.x <= abs.x + abs.w && mouse.y >= abs.y && mouse.y <= abs.y + abs.h) {
                newCursor = 'grab';
            }
        }
        setCursor(newCursor);
    }


    if (interaction.current.mode === 'idle' || !interaction.current.startPlaceholder) return;
    
    const startP = interaction.current.startPlaceholder;
    const relDx = (mouse.x - interaction.current.startX) / canvas.width;
    const relDy = (mouse.y - interaction.current.startY) / canvas.height;

    if (interaction.current.mode === 'panning') {
        setCursor('grabbing');
        setPlaceholders(prev => prev.map(p => 
            p.id === startP.id ? { ...p, x: startP.x + relDx, y: startP.y + relDy } : p
        ));
    } else if (interaction.current.mode === 'resizing') {
        let newP = { ...placeholders.find(p => p.id === startP.id)! };

        switch(interaction.current.activeHandle) {
            case 'tl': newP = {...newP, x: startP.x + relDx, y: startP.y + relDy, width: startP.width - relDx, height: startP.height - relDy}; break;
            case 'tr': newP = {...newP, y: startP.y + relDy, width: startP.width + relDx, height: startP.height - relDy}; break;
            case 'br': newP = {...newP, width: startP.width + relDx, height: startP.height + relDy}; break;
            case 'bl': newP = {...newP, x: startP.x + relDx, width: startP.width - relDx, height: startP.height + relDy}; break;
            case 't': newP = {...newP, y: startP.y + relDy, height: startP.height - relDy}; break;
            case 'r': newP = {...newP, width: startP.width + relDx}; break;
            case 'b': newP = {...newP, height: startP.height + relDy}; break;
            case 'l': newP = {...newP, x: startP.x + relDx, width: startP.width - relDx}; break;
        }

        if (newP.aspectRatio) {
            const [w, h] = newP.aspectRatio.split(':').map(Number);
            const canvasRect = canvas.getBoundingClientRect();
            const canvasRatio = canvasRect.width / canvasRect.height;
            const placeholderAspectRatio = (w / h) / canvasRatio;
            
            const handle = interaction.current.activeHandle;

            if (handle === 't' || handle === 'b') {
                const oldWidth = newP.width;
                newP.width = newP.height * placeholderAspectRatio;
                newP.x = startP.x + (startP.width - newP.width) / 2;
            } else if (handle === 'l' || handle === 'r') {
                const oldHeight = newP.height;
                newP.height = newP.width / placeholderAspectRatio;
                newP.y = startP.y + (startP.height - newP.height) / 2;
            } else { // Corners
                const expectedHeight = newP.width / placeholderAspectRatio;
                if (handle === 'tl' || handle === 'tr') {
                    newP.y += newP.height - expectedHeight;
                }
                newP.height = expectedHeight;
            }
        }
        
        if (newP.width * canvas.width < (20 * dpr)) newP.width = (20 * dpr) / canvas.width;
        if (newP.height * canvas.height < (20 * dpr)) newP.height = (20 * dpr) / canvas.height;
        
        setPlaceholders(prev => prev.map(p => p.id === startP.id ? newP : p));
    }
  };

  const handleMouseUp = () => {
    interaction.current.mode = 'idle';
    interaction.current.activeHandle = null;
    interaction.current.startPlaceholder = null;
    setCursor('default');
  };

  const selectedPlaceholder = placeholders.find(p => p.id === selectedPlaceholderId);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-8 p-4">
        <div 
            ref={containerRef} 
            className="relative w-full max-w-md mx-auto bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-2xl touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: cursor, aspectRatio: frameAspectRatio }}
        >
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 mt-8 lg:mt-0">
            <div className="w-full text-center">
                <h2 className="text-2xl font-bold text-[var(--color-primary)]">Step 2: Design Layout</h2>
                <p className="opacity-70">Add and position slots for your photos.</p>
            </div>

            <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)] space-y-4">
                <button onClick={addPlaceholder} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Add Photo Slot</button>
                <button onClick={removeSelectedPlaceholder} disabled={selectedPlaceholderId === null} className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed">Remove Selected Slot</button>
            </div>

             {selectedPlaceholderId !== null && (
                <div className="w-full p-4 bg-[var(--color-panel)] rounded-lg border border-[var(--color-border)] space-y-3">
                    <h3 className="text-sm font-medium opacity-80">Selected Slot: Aspect Ratio</h3>
                     <div className="grid grid-cols-3 gap-2 text-xs">
                        {Object.entries(ASPECT_RATIOS).map(([label, ratio]) => (
                            <button
                                key={label}
                                onClick={() => handleSetAspectRatio(ratio)}
                                className={`py-2 rounded-md transition-colors ${selectedPlaceholder?.aspectRatio === ratio ? 'bg-[var(--color-primary)] text-white' : 'bg-black/20 hover:bg-black/30'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
             )}

            <div className="w-full mt-4">
                 <button onClick={() => onTemplateConfirm(placeholders)} disabled={placeholders.length === 0} className="w-full px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-lg shadow-md filter hover:brightness-110 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    Lock Layout & Continue ({placeholders.length} slot{placeholders.length !== 1 && 's'})
                 </button>
            </div>
        </div>
    </div>
  );
};

export default TemplateDesigner;