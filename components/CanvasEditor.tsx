

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
}

type InteractionMode = 'idle' | 'crop_panning' | 'rotating';
const ROTATION_HANDLE_OFFSET = 25; // in pixels from the box edge
const ROTATION_HANDLE_SIZE = 8; // radius in pixels

const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
    frameSrc, 
    photos, 
    canvasRef, 
    frameOpacity,
    selectedPhotoIndex,
    onSelectPhoto,
    onPhotoUpdate,
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
        
        const { x, y, width, height } = toAbsolute(photo.transform, canvas);
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
          const { x, y, width, height } = toAbsolute(photo.transform, canvas);
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
          ctx.restore();
      }

      if (frameImage) {
        ctx.globalAlpha = frameOpacity;
        ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      }
  }, [loadedImages, selectedPhotoIndex, frameImage, frameOpacity]);

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
        const { x, y, width, height } = toAbsolute(photo.transform, canvas);
        const angle = photo.transform.rotation * Math.PI / 180;
        
        // Check rotation handle first, as it's outside the body
        if (i === selectedPhotoIndex) {
            const handleCenterY = -height / 2 - (ROTATION_HANDLE_OFFSET * dpr);
            const rotatedHandleX = x + handleCenterY * Math.sin(angle);
            const rotatedHandleY = y + handleCenterY * Math.cos(-angle);
            
            if (Math.hypot(mouse.x - rotatedHandleX, mouse.y - rotatedHandleY) < ROTATION_HANDLE_SIZE * dpr * 1.5) {
                return { type: 'rotate' as const, index: i };
            }
        }
        
        const localX = (mouse.x - x) * Math.cos(-angle) - (mouse.y - y) * Math.sin(-angle);
        const localY = (mouse.x - x) * Math.sin(-angle) + (mouse.y - y) * Math.cos(-angle);

        if (Math.abs(localX) < width / 2 && Math.abs(localY) < height / 2) {
            return { type: 'body' as const, index: i };
        }
    }
    return null;
  }, [photos, selectedPhotoIndex]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const mouse = getMousePos(e);
    const hit = getHit(mouse);
    
    interaction.current.startX = mouse.x;
    interaction.current.startY = mouse.y;
    
    if (hit) {
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
            setCursor(hit.type === 'rotate' ? 'crosshair' : 'move');
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