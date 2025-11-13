import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InterWindowMessage, GuestScreenState, GuestScreenMode, Placeholder, Photo } from '../types';
import QRCode from 'qrcode.react';

const AttractMode: React.FC<{ frameSrc: string | null }> = ({ frameSrc }) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-black">
        {frameSrc ? (
            <img src={frameSrc} alt="Photobooth Frame" className="max-w-md max-h-[60vh] object-contain mb-8" />
        ) : (
            <h1 className="text-8xl font-bold text-indigo-400 mb-8">Photobooth</h1>
        )}
        <p className="text-5xl font-semibold text-white animate-pulse">Step Right Up!</p>
    </div>
);

const TetherPreviewMode: React.FC<{ frameSrc: string | null; placeholders: Placeholder[] }> = ({ frameSrc, placeholders }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use a standard high-resolution canvas size and let CSS scale it.
        // This maintains a consistent aspect ratio for drawing placeholders.
        canvas.width = 1920;
        canvas.height = 1080;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (placeholders && placeholders.length > 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                placeholders.forEach(p => {
                    ctx.strokeRect(p.x * canvas.width, p.y * canvas.height, p.width * canvas.width, p.height * canvas.height);
                });
            }
        }
    }, [placeholders]);

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center text-center text-white">
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain"></canvas>
            {frameSrc && <img src={frameSrc} alt="Overlay" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" />}
            <div className="relative z-10 p-8 bg-black/50 rounded-2xl">
                <h1 className="text-8xl font-bold">Look at the Camera!</h1>
                <p className="text-4xl mt-4 animate-pulse">Strike a Pose!</p>
            </div>
        </div>
    );
};


const LivePreviewMode: React.FC<{ frameSrc: string | null; placeholders: Placeholder[] }> = ({ frameSrc, placeholders }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError("Camera not available. Please check permissions.");
            }
        };
        startCamera();
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);
    
    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        let animationFrameId: number;

        const renderLoop = () => {
            const ctx = canvas.getContext('2d');
            if(ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                // Flip context to mirror video
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Flip back for drawing overlays
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                
                // Draw placeholder outlines
                if(placeholders && placeholders.length > 0) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.lineWidth = 4;
                    ctx.setLineDash([15, 10]);
                    placeholders.forEach(p => {
                        ctx.strokeRect(p.x * canvas.width, p.y * canvas.height, p.width * canvas.width, p.height * canvas.height);
                    });
                }
            }
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        video.onplay = () => {
            renderLoop();
        };

        return () => {
            cancelAnimationFrame(animationFrameId);
        }

    }, [placeholders]);

    if (error) {
        return <div className="w-full h-full flex items-center justify-center bg-black text-red-500 text-3xl">{error}</div>;
    }

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            <video ref={videoRef} autoPlay muted playsInline className="absolute top-0 left-0 w-full h-full object-cover hidden"></video>
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain"></canvas>
            {frameSrc && <img src={frameSrc} alt="Overlay" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" />}
        </div>
    );
};

const CountdownMode: React.FC<{ count: number }> = ({ count }) => (
    <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-white font-bold text-[40rem] leading-none animate-ping">{count}</div>
    </div>
);

const ReviewMode: React.FC<{ photos: Photo[]; frameSrc: string | null }> = ({ photos, frameSrc }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
    const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);

     useEffect(() => {
        if (frameSrc) {
            const img = new Image();
            img.src = frameSrc;
            img.onload = () => setFrameImage(img);
        }
    }, [frameSrc]);

    useEffect(() => {
        photos.forEach(p => {
            if (!p.src || loadedImages.has(p.src)) return;
            const img = new Image();
            img.src = p.src;
            img.onload = () => setLoadedImages(prev => new Map(new Map(prev).set(p.src, img)));
        });
    }, [photos, loadedImages]);
    
     const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        if (frameImage) {
            canvas.width = frameImage.naturalWidth;
            canvas.height = frameImage.naturalHeight;
        } else if (photos.length > 0 && loadedImages.has(photos[0].src)){
            const firstImg = loadedImages.get(photos[0].src)!;
            canvas.width = firstImg.naturalWidth;
            canvas.height = firstImg.naturalHeight;
        } else {
             canvas.width = 1080;
             canvas.height = 1920;
        }


        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        photos.forEach((photo) => {
            const img = loadedImages.get(photo.src);
            if (!img) return;

            const transform = {
                 x: photo.transform.x * canvas.width,
                 y: photo.transform.y * canvas.height,
                 width: photo.transform.width * canvas.width,
                 height: photo.transform.height * canvas.height,
            };

            const angle = photo.transform.rotation * Math.PI / 180;
            ctx.save();
            ctx.translate(transform.x, transform.y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.rect(-transform.width / 2, -transform.height / 2, transform.width, transform.height);
            ctx.clip();

            const { crop } = photo;
            const imgAspectRatio = img.width / img.height;
            let displayWidth = transform.width, displayHeight = transform.height;

            if (imgAspectRatio > transform.width / transform.height) {
                displayHeight = transform.height;
                displayWidth = displayHeight * imgAspectRatio;
            } else {
                displayWidth = transform.width;
                displayHeight = displayWidth / imgAspectRatio;
            }
            displayWidth *= crop.scale;
            displayHeight *= crop.scale;
            
            ctx.drawImage(img, -displayWidth / 2 + crop.x, -displayHeight / 2 + crop.y, displayWidth, displayHeight);
            ctx.restore();
        });

        if (frameImage) {
            ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
        }
    }, [photos, frameImage, loadedImages]);

    useEffect(() => {
        draw();
    }, [draw]);


    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black p-8">
            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
        </div>
    );
};

const DeliveryMode: React.FC<{ qrCodeValue: string }> = ({ qrCodeValue }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white p-12">
        <h2 className="text-6xl font-bold text-black mb-12">Scan to Get Your Photo!</h2>
        <div className="bg-white p-6 rounded-lg shadow-2xl border-4 border-black">
            <QRCode value={qrCodeValue} size={512} level="L" />
        </div>
    </div>
);

const GuestWindow: React.FC = () => {
    const [state, setState] = useState<GuestScreenState>({ mode: GuestScreenMode.ATTRACT });
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.cursor = 'none';

        const channel = new BroadcastChannel('photobooth_channel');
        channelRef.current = channel;

        const handleMessage = (event: MessageEvent<InterWindowMessage>) => {
            if (event.data.type === 'SET_STATE') {
                setState(event.data.payload);
            }
        };

        channel.addEventListener('message', handleMessage);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
            document.documentElement.style.cursor = 'default';
        };
    }, []);

    const renderContent = () => {
        switch (state.mode) {
            case GuestScreenMode.TETHER_PREVIEW:
                return <TetherPreviewMode frameSrc={state.frameSrc || null} placeholders={state.placeholders || []}/>;
            case GuestScreenMode.LIVE_PREVIEW:
                return <LivePreviewMode frameSrc={state.frameSrc || null} placeholders={state.placeholders || []}/>;
            case GuestScreenMode.COUNTDOWN:
                return <CountdownMode count={state.countdown || 3} />;
            case GuestScreenMode.REVIEW:
                return <ReviewMode photos={state.photos || []} frameSrc={state.frameSrc || null} />;
            case GuestScreenMode.DELIVERY:
                return state.qrCodeValue ? <DeliveryMode qrCodeValue={state.qrCodeValue} /> : <AttractMode frameSrc={state.frameSrc || null}/>;
            case GuestScreenMode.ATTRACT:
            default:
                return <AttractMode frameSrc={state.frameSrc || null} />;
        }
    };

    return (
        <div className="w-screen h-screen overflow-hidden">
            {renderContent()}
        </div>
    );
};

export default GuestWindow;