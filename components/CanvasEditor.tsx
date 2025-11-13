

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Photo, Transform } from '../types';

interface CanvasEditorProps {
  frameSrc: string | null;
  photos: Photo[];
  canvasRef: React.RefObject<HTMLCanvasElement>;
  frameOpacity: number;
  selectedPhotoIndex: number;
  onSelectPhoto: (index: number) => void;
  onPhotoUpdate: (index: number, updates: Partial<Photo>) => void;
  onReorderPhoto: (index: number, direction: 'forward' | 'backward') => void;
  globalPhotoScale: number;
}

type InteractionMode = 'idle' | 'crop_panning' | 'rotating';
const ROTATION_HANDLE_OFFSET = 25; // in pixels from the box edge
const ROTATION_HANDLE_SIZE = 8; // radius in pixels
const LAYER_BUTTON_SIZE = 24; // diameter in pixels
const LAYER_BUTTON_MARGIN = 10; // in pixels from the corner

const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
    frameSrc, 
    photos, 
    canvasRef, 
    frameOpacity,
    selectedPhotoIndex,
    onSelectPhoto,
    onPhotoUpdate,
    onReorderPhoto,
    globalPhotoScale,
}) => {
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const interaction = useRef({
      mode: 'idle' as InteractionMode,
      startX: 0,
      startY: 0,
      startPhoto: null as Photo | null,
      startAngle: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState('default');
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
  const [frameAspectRatio, setFrameAspectRatio] = useState('2 / 3');
  
  const transientPhotos = useRef<Photo[]>(photos);
  useEffect(() => {
    if (interaction.current.mode === 'idle') {
      transientPhotos.current = photos;
    }
  }, [photos]);

  useEffect(() => {
    if (frameSrc) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setFrameImage(img);
            if (img.width > 0 && img.height > 0) {
              setFrameAspectRatio(`${img.width} / ${img.height}`);
            }
        };
        img.src = frameSrc;
    }
  }, [frameSrc]);

  useEffect(() => {
    photos.forEach(p => {
        if (!p.src || loadedImages.has(p.src)) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => setLoadedImages(prev => new Map([...prev, [p.src, img]]));
        img.src = p.src;
    });
  }, [photos, loadedImages]);
  
  const toAbsolute = (transform: Transform, canvas: HTMLCanvasElement): {x: number, y: number, width: number, height: number} => ({
      x: transform.x * canvas.width,
      y: transform.y * canvas.height,
      width: transform.width * canvas.width,
      height: transform.height * canvas.height,
  });

  const draw = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const style = getComputedStyle(document.documentElement);
      const panelColor = style.getPropertyValue('--color-panel').trim();
      const primaryColor = style.getPropertyValue('--color-primary').trim();
      const primaryRgb = style.getPropertyValue('--color-primary-rgb').trim();

      ctx.fillStyle = panelColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const photosToDraw = transientPhotos.current;
      photosToDraw.forEach((photo) => {
        const img = loadedImages.get(photo.src);
        if (!img) return;
        
        const { x, y } = toAbsolute(photo.transform, canvas);
        let { width, height } = toAbsolute(photo.transform, canvas);
        width *= globalPhotoScale;
        height *= globalPhotoScale;

        const angle = photo.transform.rotation * Math.PI / 180;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(-width / 2, -height / 2, width, height);
        ctx.clip();
        
        const { crop } = photo;
        const imgAspectRatio = photo.originalWidth / photo.originalHeight;
        let displayWidth = width, displayHeight = height;

        if (imgAspectRatio > width / height) {
          displayHeight = height;
          displayWidth = displayHeight * imgAspectRatio;
        } else {
          displayWidth = width;
          displayHeight = displayWidth / imgAspectRatio;
        }
        displayWidth *= crop.scale;
        displayHeight *= crop.scale;
        
        ctx.drawImage(img, -displayWidth / 2 + crop.x, -displayHeight / 2 + crop.y, displayWidth, displayHeight);
        ctx.restore();
      });
      
      if (selectedPhotoIndex !== -1 && photosToDraw[selectedPhotoIndex]) {
          const photo = photosToDraw[selectedPhotoIndex];
          const { x, y } = toAbsolute(photo.transform, canvas);
          let { width, height } = toAbsolute(photo.transform, canvas);
          width *= globalPhotoScale;
          height *= globalPhotoScale;

          const angle = photo.transform.rotation * Math.PI / 180;
          const dpr = window.devicePixelRatio || 1;
          
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          
          // Bounding box
          ctx.strokeStyle = `rgba(${primaryRgb}, 0.9)`;
          ctx.lineWidth = 2 * dpr;
          ctx.strokeRect(-width / 2, -height / 2, width, height);
          
          // Rotation handle
          const handleY = -height / 2 - (ROTATION_HANDLE_OFFSET * dpr);
          ctx.beginPath();
          ctx.moveTo(0, -height / 2);
          ctx.lineTo(0, handleY);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1.5 * dpr;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, handleY, ROTATION_HANDLE_SIZE * dpr, 0, Math.PI * 2);
          ctx.fillStyle = primaryColor;
          ctx.fill();

           // Layering controls
           const isFirst = selectedPhotoIndex === 0;
           const isLast = selectedPhotoIndex === photos.length - 1;
           const btnSize = LAYER_BUTTON_SIZE * dpr;
           const btnMargin = LAYER_BUTTON_MARGIN * dpr;

           const drawArrowButton = (posX: number, posY: number, direction: 'up' | 'down') => {
               ctx.save();
               ctx.translate(posX, posY);
               ctx.beginPath();
               ctx.arc(0, 0, btnSize / 2, 0, Math.PI * 2);
               ctx.fillStyle = `rgba(${primaryRgb}, 0.9)`;
               ctx.fill();

               ctx.beginPath();
               const arrowSize = btnSize * 0.25;
               if (direction === 'down') {
                   ctx.moveTo(-arrowSize, -arrowSize/2);
                   ctx.lineTo(0, arrowSize/2);
                   ctx.lineTo(arrowSize, -arrowSize/2);
               } else { // up
                   ctx.moveTo(-arrowSize, arrowSize/2);
                   ctx.lineTo(0, -arrowSize/2);
                   ctx.lineTo(arrowSize, arrowSize/2);
               }
               ctx.strokeStyle = 'white';
               ctx.lineWidth = 1.5 * dpr;
               ctx.stroke();
               ctx.restore();
           };
           
           if (!isFirst) {
               drawArrowButton(-width/2 + btnMargin + btnSize/2, height/2 - btnMargin - btnSize/2, 'down');
           }
           if (!isLast) {
               drawArrowButton(width/2 - btnMargin - btnSize/2, height/2 - btnMargin - btnSize/2, 'up');
           }

          ctx.restore();
      }

      if (frameImage) {
        ctx.globalAlpha = frameOpacity;
        ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      }
  }, [loadedImages, selectedPhotoIndex, frameImage, frameOpacity, photos.length, globalPhotoScale]);

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
  
  const getMousePos = (e: React.MouseEvent | React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { 
        x: (e.clientX - rect.left) * dpr, 
        y: (e.clientY - rect.top) * dpr 
    };
  };

  const getHit = useCallback((mouse: {x: number, y: number}) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    
    for (let i = photos.length - 1; i >= 0; i--) {
        const photo = photos[i];
        const { x, y } = toAbsolute(photo.transform, canvas);
        let { width, height } = toAbsolute(photo.transform, canvas);
        width *= globalPhotoScale;
        height *= globalPhotoScale;

        const angle = photo.transform.rotation * Math.PI / 180;
        
        // Transform mouse to local photo coords to simplify checks
        const localX = (mouse.x - x) * Math.cos(-angle) - (mouse.y - y) * Math.sin(-angle);
        const localY = (mouse.x - x) * Math.sin(-angle) + (mouse.y - y) * Math.cos(-angle);

        if (i === selectedPhotoIndex) {
            const btnSize = LAYER_BUTTON_SIZE * dpr;
            const btnMargin = LAYER_BUTTON_MARGIN * dpr;
            
            // Check layer buttons first (bottom corners)
            const backwardBtnPos = { x: -width/2 + btnMargin + btnSize/2, y: height/2 - btnMargin - btnSize/2 };
            if (i > 0 && Math.hypot(localX - backwardBtnPos.x, localY - backwardBtnPos.y) < btnSize / 2 * 1.2) {
                 return { type: 'layer_backward' as const, index: i };
            }
            const forwardBtnPos = { x: width/2 - btnMargin - btnSize/2, y: height/2 - btnMargin - btnSize/2 };
             if (i < photos.length - 1 && Math.hypot(localX - forwardBtnPos.x, localY - forwardBtnPos.y) < btnSize / 2 * 1.2) {
                 return { type: 'layer_forward' as const, index: i };
            }
            
            // Then check rotation handle
            const handleCenterY = -height / 2 - (ROTATION_HANDLE_OFFSET * dpr);
            if (Math.hypot(localX, localY - handleCenterY) < ROTATION_HANDLE_SIZE * dpr * 1.5) {
                return { type: 'rotate' as const, index: i };
            }
        }
        
        // Finally check photo body
        if (Math.abs(localX) < width / 2 && Math.abs(localY) < height / 2) {
            return { type: 'body' as const, index: i };
        }
    }
    return null;
  }, [photos, selectedPhotoIndex, globalPhotoScale]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const mouse = getMousePos(e);
    const hit = getHit(mouse);
    
    interaction.current.startX = mouse.x;
    interaction.current.startY = mouse.y;
    
    if (hit) {
        if (hit.type === 'layer_backward') {
            onReorderPhoto(hit.index, 'backward');
            return;
        }
        if (hit.type === 'layer_forward') {
            onReorderPhoto(hit.index, 'forward');
            return;
        }

        onSelectPhoto(hit.index);
        const photo = photos[hit.index];
        const photoCenter = toAbsolute(photo.transform, canvasRef.current!);
        interaction.current.startPhoto = JSON.parse(JSON.stringify(photo));

        if (hit.type === 'rotate') {
            interaction.current.mode = 'rotating';
            const dx = mouse.x - photoCenter.x;
            const dy = mouse.y - photoCenter.y;
            interaction.current.startAngle = Math.atan2(dy, dx) - (photo.transform.rotation * Math.PI / 180);
        } else {
            interaction.current.mode = 'crop_panning';
        }
    } else {
        onSelectPhoto(-1);
        interaction.current.mode = 'idle';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    const mouse = getMousePos(e);
    
    if (interaction.current.mode === 'idle') {
        const hit = getHit(mouse);
        if (hit) {
            if (hit.type === 'rotate') setCursor('crosshair');
            else if (hit.type === 'body') setCursor('move');
            else if (hit.type.startsWith('layer')) setCursor('pointer');
            else setCursor('default');
        } else {
            setCursor('default');
        }
        return;
    }
    
    const { startPhoto } = interaction.current;
    if (!startPhoto || selectedPhotoIndex === -1) return;
    
    let updatedPhoto = JSON.parse(JSON.stringify(transientPhotos.current[selectedPhotoIndex]));
    
    if (interaction.current.mode === 'crop_panning') {
        setCursor('move');
        const dx = mouse.x - interaction.current.startX;
        const dy = mouse.y - interaction.current.startY;
        updatedPhoto.crop.x = startPhoto.crop.x + dx;
        updatedPhoto.crop.y = startPhoto.crop.y + dy;
    } else if (interaction.current.mode === 'rotating') {
        setCursor('crosshair');
        const photoCenter = toAbsolute(startPhoto.transform, canvasRef.current!);
        const dx = mouse.x - photoCenter.x;
        const dy = mouse.y - photoCenter.y;
        const currentAngle = Math.atan2(dy, dx);
        let newRotationDegrees = (currentAngle - interaction.current.startAngle) * (180 / Math.PI);
        updatedPhoto.transform.rotation = newRotationDegrees;
    }
    
    transientPhotos.current = transientPhotos.current.map((p, i) => i === selectedPhotoIndex ? updatedPhoto : p);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (interaction.current.mode !== 'idle' && selectedPhotoIndex !== -1) {
        onPhotoUpdate(selectedPhotoIndex, transientPhotos.current[selectedPhotoIndex]);
    }
    interaction.current.mode = 'idle';
  };
  
  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const mouse = getMousePos(e);
      const hit = getHit(mouse);
      
      if (selectedPhotoIndex !== -1 && (hit === null || hit.index === selectedPhotoIndex)) {
          const scaleDelta = -e.deltaY * 0.001;
          const photo = photos[selectedPhotoIndex];
          const currentScale = photo.crop.scale;
          const newScale = Math.max(0.1, currentScale + scaleDelta * currentScale);
          onPhotoUpdate(selectedPhotoIndex, { crop: {...photo.crop, scale: newScale }});
      }
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-full max-w-md mx-auto bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-2xl touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: cursor, aspectRatio: frameAspectRatio }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default CanvasEditor;