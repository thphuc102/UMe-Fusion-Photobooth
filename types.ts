export enum AppStep {
  FRAME_UPLOAD,
  TEMPLATE_DESIGN,
  PHOTO_UPLOAD,
  EDIT_AND_EXPORT,
}

export type Transform = {
  x: number; // center x (0-1 relative to canvas width)
  y: number; // center y (0-1 relative to canvas height)
  width: number; // (0-1 relative to canvas width)
  height: number; // (0-1 relative to canvas height)
  rotation: number; // in degrees
};

export type Placeholder = {
  id: number;
  x: number; // top-left x (0-1 relative to canvas width)
  y: number; // top-left y (0-1 relative to canvas height)
  width: number; // (0-1 relative to canvas width)
  height: number; // (0-1 relative to canvas height)
  aspectRatio: string | null;
};

export type Photo = {
  src: string;
  transform: Transform;
  crop: {
    x: number; // pan x (in pixels)
    y: number; // pan y (in pixels)
    scale: number; // zoom
  };
  originalWidth: number;
  originalHeight: number;
};

export type OrganizerSettings = {
  driveFolderUrl: string;
  localDownloadPath: string;
  kioskMode: boolean;
  autoResetTimer: number; // in seconds, 0 to disable
};
