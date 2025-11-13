# UIT Media FrameFusion Photobooth

## Description

UIT Media FrameFusion is an elegant, powerful, and highly customizable web-based photobooth application. It's designed for event photographers and organizers who need a professional and flexible solution. Operators can upload a custom-branded frame, design a photo layout, and capture images through various methods, including a direct tethering "hot folder" workflow with software like Capture One.

The application features a dual-window interface: an operator control panel and a separate guest-facing display. Guests can see a live preview tailored for tethered shooting, review their photos, and instantly receive their final creation via a QR code. With advanced features like fine-grained photo adjustments, AI-powered editing, and complete UI theme customization, FrameFusion provides a seamless and engaging experience for both operators and guests.

## Key Features

- **Custom Frame Upload**: Start by uploading any transparent PNG file to serve as a branded overlay.
- **Dynamic Layout Designer**: Interactively add, move, and resize photo placeholders directly on the frame to create unique templates. Enforce specific aspect ratios for each photo slot.
- **Multiple Photo Sources**:
    - **Tethered "Hot Folder"**: Connect directly to your professional camera's output folder (e.g., Capture One's "Selects" folder) for an automated workflow.
    - **Manual Upload**: Drag and drop photos from your computer or use the file browser.
    - **Webcam Capture**: Use the built-in webcam as a backup or for simpler setups.
- **Dual-Window Experience**:
    - **Operator Console**: A comprehensive control panel for setup, design, and final adjustments.
    - **Guest Window**: A separate, clean interface for guests to see previews, review photos, and download their images.
- **Tethered Live Preview**: A guest-facing screen specifically designed for tethered shooting, showing the frame and photo outlines to help guests pose perfectly.
- **Advanced Photo Adjustments**: After photos are placed, operators can pan, zoom, and rotate each image individually to achieve the perfect composition.
- **AI-Powered Editing**: Leverage the Google Gemini API to apply creative edits using simple text prompts (e.g., "make the photo black and white," "add a vintage film look").
- **Full UI Customization**: An easy-to-use side panel allows you to change the application's colors, fonts, logo, and background image to match your event's branding.
- **QR Code Delivery**: Instantly generate and display a QR code on the guest screen for easy, touchless downloading of the final image to mobile devices.
- **Kiosk Mode**: An optional mode that simplifies the interface for unattended use, preventing guests from changing the core setup.

## Operator's Manual & Instructions

Follow these steps to set up and run your photobooth event.

### Step 1: Initial Configuration (Recommended)

Before starting, you can customize the photobooth's appearance and behavior.

1.  **Customize UI (Palette Icon 🎨)**: On any of the initial setup screens, click the palette icon in the top-right corner.
    - **Text**: Change the Title, Description, and Footer text.
    - **Branding**: Upload a logo and a background image.
    - **Theme**: Select a font and use the color pickers to adjust the Accent, Text, Background, Panel, and Border colors to match your event's theme.
2.  **Organizer Settings (Gear Icon ⚙️)**: On the very first screen ("Upload Your Frame"), click the gear icon.
    - **Google Drive**: Connect a Google account to save photos directly to a selected Drive folder (feature for future enhancements).
    - **Local Download Folder**: Set a folder on your computer for auto-saving images.
    - **File Name Template**: Define how final images are named using placeholders like `{timestamp}`.
    - **Auto-Reset Timer**: Set a countdown (in seconds) to automatically reset the booth after a session is complete. Set to `0` to disable.
    - **Kiosk Mode**: Enable this to hide the "Start New Session" button on the final screen, preventing guests from changing the frame.

### Step 2: Upload Your Frame

This is the first step of the main workflow.

1.  Click the "Upload" area or drag and drop a **transparent PNG file** to serve as the photo overlay.
2.  Once the preview appears, click **"Confirm Frame & Continue"**.

### Step 3: Design the Layout

Create the template where your photos will appear.

1.  Click the **"Add Photo Slot"** button to create a new placeholder.
2.  **Click and drag** the placeholder to move it.
3.  **Click and drag the handles** on the corners and edges of the selected placeholder to resize it.
4.  With a slot selected, choose a fixed **Aspect Ratio** from the control panel on the right to maintain consistency.
5.  Repeat until you have the desired number of photo slots.
6.  Click **"Lock Layout & Continue"**.

### Step 4: Add Photos

This screen is for capturing or importing the images for the current session. You have two primary methods:

**A) Manual Mode (Webcam / Local Files)**
1.  **Import**: Click "Import" to browse your computer for photos or simply drag and drop image files onto the window.
2.  **Webcam**: Click "Start Camera" to activate the webcam, then "Capture" to take a picture.
3.  **Place Photos**: Imported photos appear in the "Your Photos" tray. Click a photo in the tray, then click an empty slot on the canvas to place it. Alternatively, drag a photo from the tray and drop it onto a slot.
4.  Once all slots are filled, click **"Finalize Photos"**.

**B) Tethered Mode (Hot Folder)**
*Prerequisite: In the Operator Settings (gear icon on the Finalize screen), you must first select the "Hot Folder" that your tethering software (like Capture One) saves final images to.*

1.  Click the **"Use Hot Folder (Tethered)"** button.
2.  This will immediately take you to the Finalize screen and start monitoring the selected folder.
3.  As you take pictures with your camera, the images will automatically appear in the photo slots on the canvas.

### Step 5: Finalize & Export

This is the main operator screen during an event.

1.  **Open Guest Window**: Click this button to open the separate guest-facing display on a second monitor. During a tethered session, guests will see the "Tethered Preview" to help them pose.
2.  **Adjust Photos**: Click a photo on the canvas to select it.
    - **Pan**: Click and drag the photo to move it within its frame.
    - **Zoom**: Use your mouse scroll wheel while hovering over the photo.
    - **Rotate**: Click and drag the circular handle that appears above the selected photo.
3.  **AI Editing**:
    - Type a command into the "Edit with AI" text box (e.g., "make it black and white," "add party hats").
    - Click **"Generate"**. An AI-generated preview will appear.
    - Click **"Accept"** to apply the change or **"Discard"** to ignore it. *Note: Any manual adjustment will remove the AI edit.*
4.  **Global Adjustments**: Use the sliders in the control panel to adjust the overall scale of all photos or the transparency of the frame.
5.  **Undo/Redo**: Use the undo and redo buttons to step back and forth through your adjustments.

### Step 6: Deliver the Photo

1.  Once you are happy with the result, click **"Show QR Code on Guest Screen"**.
2.  The guest window will display a large QR code. Guests can scan this with their phones to download the final image.
3.  You can also click **"Download Your Creation"** to save the file directly to your computer.

### Step 7: Next Session

-   Click **"Create New (Keep Frame)"** to return to the "Add Photos" step for the next group of guests.
-   Click **"Start New Session"** (if not in Kiosk Mode) to go all the way back to the beginning and upload a new frame.
