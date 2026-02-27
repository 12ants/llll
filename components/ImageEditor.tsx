import React, { useRef, useState, useEffect } from 'react';
import { Save, X, RotateCw, Crop, Sliders, Check, Undo, Image as ImageIcon, BoxSelect } from 'lucide-react';

interface ImageEditorProps {
  file: File;
  onSave: (processedFile: File) => void;
  onCancel: () => void;
}

type AspectRatio = 'free' | 1 | 1.7777 | 1.3333 | 1.5 | 0.8; // Free, 1:1, 16:9, 4:3, 3:2, 4:5

const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
    { label: 'Original', value: 'free' },
    { label: 'Square (1:1)', value: 1 },
    { label: 'Wide (16:9)', value: 1.7777 },
    { label: 'Standard (4:3)', value: 1.3333 },
    { label: 'Classic (3:2)', value: 1.5 },
    { label: 'Portrait (4:5)', value: 0.8 },
];

const ImageEditor: React.FC<ImageEditorProps> = ({ file, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [grayscale, setGrayscale] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
        };
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;
    drawCanvas();
  }, [originalImage, rotation, brightness, contrast, saturation, grayscale, aspectRatio]);

  const drawCanvas = () => {
    if (!originalImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Determine dimensions of the rotated image
    let rotatedW = originalImage.naturalWidth;
    let rotatedH = originalImage.naturalHeight;

    // If rotating 90 or 270, dimensions swap relative to the screen
    if (rotation % 180 !== 0) {
      [rotatedW, rotatedH] = [rotatedH, rotatedW];
    }

    // 2. Determine Crop Dimensions based on Aspect Ratio
    let cropW = rotatedW;
    let cropH = rotatedH;

    if (aspectRatio !== 'free') {
        const targetRatio = aspectRatio as number;
        const currentRatio = rotatedW / rotatedH;
        
        if (currentRatio > targetRatio) {
            // Image is wider than target -> Crop Width
            cropH = rotatedH;
            cropW = rotatedH * targetRatio;
        } else {
            // Image is taller than target -> Crop Height
            cropW = rotatedW;
            cropH = rotatedW / targetRatio;
        }
    }

    // 3. Set Canvas Size to Crop Size
    canvas.width = cropW;
    canvas.height = cropH;

    // 4. Apply Filters
    const filterString = [
        `brightness(${brightness}%)`,
        `contrast(${contrast}%)`,
        `saturate(${saturation}%)`,
        grayscale ? 'grayscale(100%)' : ''
    ].filter(Boolean).join(' ');
    
    ctx.filter = filterString;

    // 5. Draw
    ctx.translate(cropW / 2, cropH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
        originalImage, 
        -originalImage.naturalWidth / 2, 
        -originalImage.naturalHeight / 2
    );
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
        if (blob) {
            const newFile = new File([blob], file.name, { type: 'image/jpeg' });
            onSave(newFile);
        }
    }, 'image/jpeg', 0.95);
  };

  const resetAll = () => {
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setGrayscale(false);
      setAspectRatio('free');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-in fade-in duration-200">
        {/* Header */}
        <div className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-gray-900">
             <h3 className="text-white font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                 <Sliders size={16} /> <span className="hidden sm:inline">Binary Manipulator</span><span className="sm:hidden">Editor</span>
             </h3>
             <div className="flex items-center gap-2 md:gap-4">
                 <button onClick={onCancel} className="text-gray-400 hover:text-white px-2 py-1 uppercase text-[10px] md:text-xs font-bold tracking-wider">Cancel</button>
                 <button 
                    onClick={handleSave} 
                    className="bg-white text-black px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-gray-200 flex items-center gap-2"
                >
                     <Save size={14} /> Commit
                 </button>
             </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Canvas Area */}
            <div className="flex-1 bg-black flex items-center justify-center p-4 md:p-8 overflow-auto relative">
                 <canvas 
                    ref={canvasRef} 
                    className="max-w-full max-h-full shadow-2xl border border-white/10"
                    style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '15px 15px' }} 
                 />
            </div>

            {/* Sidebar Controls */}
            <div className="w-full md:w-80 h-1/2 md:h-full shrink-0 bg-gray-900 border-t md:border-t-0 md:border-l border-white/10 p-5 md:p-6 flex flex-col gap-6 md:gap-8 overflow-y-auto no-scrollbar">
                 
                 {/* Transformations */}
                 <div>
                     <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4 block flex items-center gap-2">
                        <Crop size={12} /> Frame Geometry
                     </label>
                     <div className="space-y-4">
                         <button 
                            onClick={() => setRotation(r => (r + 90) % 360)}
                            className="w-full bg-gray-800 text-white p-3 flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-gray-500"
                        >
                             <RotateCw size={14} />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Rotate 90°</span>
                         </button>

                         <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                             {ASPECT_RATIOS.map(ratio => (
                                 <button
                                    key={String(ratio.value)}
                                    onClick={() => setAspectRatio(ratio.value)}
                                    className={`p-2 text-[8px] md:text-[9px] font-bold uppercase border transition-colors truncate ${aspectRatio === ratio.value ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}
                                 >
                                     {ratio.label}
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>

                 {/* Adjustments */}
                 <div>
                     <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4 block flex items-center gap-2">
                        <Sliders size={12} /> Color Mapping
                     </label>
                     
                     <div className="space-y-5">
                         <div>
                             <div className="flex justify-between mb-2">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Brightness</span>
                                <span className="text-[10px] font-mono text-gray-600">{brightness}%</span>
                             </div>
                             <input 
                                type="range" min="0" max="200" value={brightness} 
                                onChange={(e) => setBrightness(Number(e.target.value))}
                                className="w-full accent-white h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                             />
                         </div>
                         
                         <div>
                             <div className="flex justify-between mb-2">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Contrast</span>
                                <span className="text-[10px] font-mono text-gray-600">{contrast}%</span>
                             </div>
                             <input 
                                type="range" min="0" max="200" value={contrast} 
                                onChange={(e) => setContrast(Number(e.target.value))}
                                className="w-full accent-white h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                             />
                         </div>

                         <div>
                             <div className="flex justify-between mb-2">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Saturation</span>
                                <span className="text-[10px] font-mono text-gray-600">{saturation}%</span>
                             </div>
                             <input 
                                type="range" min="0" max="200" value={saturation} 
                                onChange={(e) => setSaturation(Number(e.target.value))}
                                className="w-full accent-white h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                             />
                         </div>

                         <button 
                            onClick={() => setGrayscale(!grayscale)}
                            className={`w-full p-2.5 flex items-center justify-between border transition-colors ${grayscale ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}
                        >
                             <span className="text-[10px] font-bold uppercase tracking-widest">Grayscale Mode</span>
                             {grayscale && <Check size={14} />}
                         </button>
                     </div>
                 </div>

                 <div className="mt-auto pt-6 border-t border-white/10 hidden md:block">
                     <button 
                        onClick={resetAll}
                        className="w-full py-3 flex items-center justify-center gap-2 text-gray-500 hover:text-white uppercase text-[10px] font-bold tracking-[0.2em] transition-colors"
                     >
                         <Undo size={14} /> Factory Reset
                     </button>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default ImageEditor;