/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, Image as ImageIcon, Download, Loader2, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string);
      setResultImage(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = async () => {
    if (!sourceImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = sourceImage.split(',')[1];
      const mimeType = sourceImage.split(';')[0].split(':')[1];

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: 'Remove the background from this image and return only the subject with a transparent background. Output the result as an image.',
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const resultBase64 = part.inlineData.data;
          setResultImage(`data:image/png;base64,${resultBase64}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('Failed to generate a cutout. The model did not return an image.');
      }
    } catch (err: any) {
      console.error('Error removing background:', err);
      setError(err.message || 'An error occurred while processing the image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = 'purecut-result.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setSourceImage(null);
    setResultImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm shadow-emerald-200">
              <ImageIcon size={18} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">PureCut</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-black/40 uppercase tracking-widest">AI Background Remover</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Side: Controls & Upload */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <h2 className="text-3xl font-bold tracking-tight mb-3">Remove backgrounds instantly.</h2>
              <p className="text-black/60 leading-relaxed">
                Upload your image and let our AI handle the precision cutting. Perfect for products, portraits, and creative projects.
              </p>
            </section>

            {!sourceImage ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-black/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 bg-white hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all cursor-pointer"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-100 transition-transform duration-300">
                  <Upload className="text-black/40 group-hover:text-emerald-600 transition-colors" size={28} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-lg">Click or drag image</p>
                  <p className="text-sm text-black/40 mt-1">Supports PNG, JPG, WebP</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-black/5">
                      <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Image Loaded</p>
                      <p className="text-xs text-black/40">Ready for processing</p>
                    </div>
                  </div>
                  <button 
                    onClick={reset}
                    className="p-2 hover:bg-red-50 text-black/40 hover:text-red-500 rounded-xl transition-colors"
                    title="Remove image"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {!resultImage && !isProcessing && (
                  <button
                    onClick={removeBackground}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    Remove Background
                    <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                )}

                {isProcessing && (
                  <div className="w-full py-4 bg-black/5 text-black/40 font-semibold rounded-2xl flex items-center justify-center gap-3">
                    <Loader2 size={20} className="animate-spin" />
                    Processing with AI...
                  </div>
                )}

                {resultImage && (
                  <div className="space-y-3">
                    <button
                      onClick={downloadResult}
                      className="w-full py-4 bg-black text-white font-semibold rounded-2xl shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Download size={18} />
                      Download Result
                    </button>
                    <button
                      onClick={reset}
                      className="w-full py-4 bg-white border border-black/10 text-black/60 font-semibold rounded-2xl hover:bg-black/5 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} />
                      Start New
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm"
              >
                {error}
              </motion.div>
            )}
          </div>

          {/* Right Side: Preview Area */}
          <div className="lg:col-span-7">
            <div className="relative aspect-square lg:aspect-auto lg:h-[600px] bg-white border border-black/5 rounded-[32px] overflow-hidden shadow-xl shadow-black/5 flex items-center justify-center group">
              {/* Checkerboard Background for transparency preview */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              
              <AnimatePresence mode="wait">
                {!sourceImage ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-2 px-6"
                  >
                    <div className="w-20 h-20 bg-[#f8f9fa] rounded-full flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="text-black/10" size={40} />
                    </div>
                    <p className="text-black/30 font-medium">Preview will appear here</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full h-full p-8 flex items-center justify-center"
                  >
                    {/* Comparison Slider or simple toggle could go here, but let's stick to clean side-by-side or overlay */}
                    <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl">
                      <img 
                        src={resultImage || sourceImage} 
                        alt="Preview" 
                        className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${isProcessing ? 'opacity-50 grayscale' : 'opacity-100'}`}
                      />
                      
                      {isProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-black/5">
                            <Loader2 size={18} className="animate-spin text-emerald-500" />
                            <span className="text-sm font-medium">Analyzing Subject...</span>
                          </div>
                        </div>
                      )}

                      {resultImage && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg"
                        >
                          <CheckCircle2 size={14} />
                          BACKGROUND REMOVED
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-6 flex items-center justify-between px-4">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-black/40 font-bold">Engine</span>
                  <span className="text-xs font-medium">Gemini 2.5 Flash</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-black/40 font-bold">Output</span>
                  <span className="text-xs font-medium">Transparent PNG</span>
                </div>
              </div>
              <div className="text-[10px] text-black/20 font-mono">
                v1.0.0-STABLE
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-black/5 py-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-40 grayscale">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white">
              <ImageIcon size={14} />
            </div>
            <span className="text-sm font-bold tracking-tight">PureCut</span>
          </div>
          <p className="text-sm text-black/40">
            Powered by Gemini AI. No images are stored on our servers.
          </p>
          <div className="flex gap-6 text-sm font-medium text-black/40">
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Terms</a>
            <a href="#" className="hover:text-black transition-colors">API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
