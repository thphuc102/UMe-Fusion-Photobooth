export type OrganizerSettings = {
  driveFolderId: string | null;
  driveFolderName: string;
  fileNameTemplate: string;
  hotFolderName: string;
  localDownloadPath?: string;
  autoResetTimer?: number;
  kioskMode?: boolean;
};

export enum AppStep {
  FRAME_UPLOAD = 1,
  TEMPLATE_DESIGN = 2,
  PHOTO_UPLOAD = 3, // Kept for consistency but will be the run step
  EDIT_AND_EXPORT = 4,
  RUN_PHOTOBOOTH = 3, // Alias for photo upload
}

export enum GuestScreenMode {
  ATTRACT = 'ATTRACT',
  LIVE_PREVIEW = 'LIVE_PREVIEW',
  COUNTDOWN = 'COUNTDOWN',
  REVIEW = 'REVIEW',
  DELIVERY = 'DELIVERY',
}

export interface Placeholder {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: string | null;
}

export interface Transform {
    x: number; // center x relative to canvas
    y: number; // center y relative to canvas
    width: number; // width relative to canvas
    height: number; // height relative to canvas
    rotation: number; // degrees
}

export interface Crop {
    x: number; // pan x in pixels
    y: number; // pan y in pixels
    scale: number; // zoom level
}

export interface Photo {
    src: string;
    transform: Transform;
    crop: Crop;
    originalWidth: number;
    originalHeight: number;
}


export interface GuestScreenState {
  mode: GuestScreenMode;
  frameSrc?: string | null;
  photos?: Photo[];
  qrCodeValue?: string | null;
  countdown?: number;
  placeholders?: Placeholder[];
}

export type InterWindowMessage = {
  type: 'SET_STATE';
  payload: GuestScreenState;
} | {
  type: 'GET_STATE';
};


export type PhotoboothSession = {
    isActive: boolean;
    photos: Photo[];
};

export type AppSettings = {
    frameSrc: string | null;
    hotFolderHandle: FileSystemDirectoryHandle | null;
    placeholders: Placeholder[];
} & OrganizerSettings;

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
