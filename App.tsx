import React, { useState, useRef, useEffect } from 'react';
import { generateLandscapeVisualization } from './services/geminiService';
import { getSavedDesigns, saveDesign, deleteDesign, saveDraft, getDraft, clearDraft } from './services/storageService';
import { Button } from './components/Button';
import { ResultComparison } from './components/ResultComparison';
import { SavedDesignsGallery } from './components/SavedDesignsGallery';
import { LoadingState } from './components/LoadingState';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { AuthModal } from './components/AuthModal';
import { AppState, SavedDesign, DesignIteration, AutoSaveState } from './types';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useAuth } from './contexts/AuthContext';

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // The current working input (can be original or previous generation)
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // The absolute original start image
  const [originalImageRef, setOriginalImageRef] = useState<string | null>(null);
  
  // The current result
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // History of completed iterations
  const [pastIterations, setPastIterations] = useState<DesignIteration[]>([]);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  
  // Auto-save status
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null);

  // Auth Context
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Replaced simple useState with custom hook
  const { 
    value: prompt, 
    updateValue: setPrompt, 
    commit, 
    setAndSave: setPromptAndSave, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndoRedo('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved designs and check for draft on mount
  useEffect(() => {
    const init = async () => {
      // Load saved portfolio if user is logged in
      if (user) {
        const designs = await getSavedDesigns(user.id);
        setSavedDesigns(designs);
      } else {
        setSavedDesigns([]);
      }

      // Check for auto-saved draft
      const draft = await getDraft();
      if (draft && draft.timestamp) {
        // Only restore if we are in clean state
        if (!selectedFile && !imagePreview && !prompt) {
           console.log("Restoring draft from", new Date(draft.timestamp));
           setPromptAndSave(draft.prompt);
           setImagePreview(draft.imagePreview);
           setGeneratedImage(draft.generatedImage);
           setPastIterations(draft.pastIterations);
           setOriginalImageRef(draft.originalImageRef);
           setAppState(draft.appState);
           setLastAutoSave(draft.timestamp);
        }
      }
    };
    init();
  }, [user]); // Re-run when user changes

  // Auto-save Interval (every 30s)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only save if there is meaningful content
      if (imagePreview || prompt) {
        const currentState: AutoSaveState = {
          timestamp: Date.now(),
          prompt,
          imagePreview,
          generatedImage,
          pastIterations,
          originalImageRef,
          appState
        };
        await saveDraft(currentState);
        setLastAutoSave(Date.now());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [prompt, imagePreview, generatedImage, pastIterations, originalImageRef, appState]);

  // Debounce save for prompt typing
  useEffect(() => {
    const timer = setTimeout(() => {
      commit();
    }, 1000);
    return () => clearTimeout(timer);
  }, [prompt, commit]);

  const processFile = (file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please upload a valid image file (JPG, PNG).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
         setErrorMsg('Image size should be less than 10MB.');
         return;
      }

      setSelectedFile(file);
      setErrorMsg(null);
      setGeneratedImage(null); // Clear previous results if any
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setOriginalImageRef(result); // Set the root original
        setPastIterations([]); // Reset history
      };
      reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      processFile(event.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we are actually leaving the container (and not just entering a child element)
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    // Allows generation if we have a file OR if we have an existing preview (from load/refine)
    if ((!selectedFile && !imagePreview) || !prompt.trim()) return;

    setAppState(AppState.LOADING);
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // Use selectedFile if available, otherwise use imagePreview (which is a base64 string)
      const inputSource = selectedFile || imagePreview!;
      
      const resultImage = await generateLandscapeVisualization(inputSource, prompt);
      setGeneratedImage(resultImage);
      setAppState(AppState.SUCCESS);
      
      // Save draft immediately after success
      await saveDraft({
        timestamp: Date.now(),
        prompt,
        imagePreview,
        generatedImage: resultImage,
        pastIterations,
        originalImageRef,
        appState: AppState.SUCCESS
      });
      setLastAutoSave(Date.now());

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred while generating the vision.');
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = async () => {
    setAppState(AppState.IDLE);
    setSelectedFile(null);
    setImagePreview(null);
    setOriginalImageRef(null);
    setGeneratedImage(null);
    setPastIterations([]);
    setPromptAndSave(''); // Reset prompt
    setErrorMsg(null);
    setLastAutoSave(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    await clearDraft();
  };

  // Allows user to go back to editing the prompt for the SAME input image
  const handleRetry = () => {
    setGeneratedImage(null);
    setAppState(AppState.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefine = () => {
    if (!generatedImage) return;

    // Save the current completed step to history
    const iteration: DesignIteration = {
      id: crypto.randomUUID(),
      prompt: prompt,
      image: generatedImage,
      timestamp: Date.now()
    };
    
    setPastIterations([...pastIterations, iteration]);

    // Use the generated image as the new input for the next iteration
    setImagePreview(generatedImage);
    // Clear the result state to go back to "Edit" mode
    setGeneratedImage(null);
    // We are now operating on a derived image, not the original file
    setSelectedFile(null);
    
    // Clear the prompt so user can describe the *next* step of changes
    setPromptAndSave('');
    
    setAppState(AppState.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCropUpdate = (newImage: string) => {
    setGeneratedImage(newImage);
  };

  const handleSaveClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowSaveDialog(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setShowSaveDialog(true);
  };

  const confirmSaveDesign = async () => {
    if (!generatedImage || !imagePreview || !user) return;

    setIsSaving(true);
    
    // Capture the current state as the latest iteration
    const currentIteration: DesignIteration = {
      id: crypto.randomUUID(),
      prompt: prompt,
      image: generatedImage,
      timestamp: Date.now()
    };

    // Combine past history with current result
    const allIterations = [...pastIterations, currentIteration];

    const newDesign: SavedDesign = {
      id: crypto.randomUUID(),
      userId: user.id, // Associate with user
      timestamp: Date.now(),
      // Ensure we always save the root original image
      originalImage: originalImageRef || imagePreview, 
      generatedImage: generatedImage,
      prompt: prompt,
      iterations: allIterations
    };

    const success = await saveDesign(newDesign, user.id);
    
    if (success) {
      const updatedDesigns = await getSavedDesigns(user.id);
      setSavedDesigns(updatedDesigns);
      // Clear the draft since we have formally saved the project
      await clearDraft();
      setLastAutoSave(null);
      
      setTimeout(() => {
        setIsSaving(false);
        setShowSaveDialog(false);
      }, 500);
    } else {
      setIsSaving(false);
      setShowSaveDialog(false);
      setErrorMsg("Failed to save. Storage limit reached.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
    // 1. Set the root original image
    setOriginalImageRef(design.originalImage);
    
    let iterations = design.iterations || [];
    
    // Backward compatibility for designs saved before history support
    if (iterations.length === 0 && design.generatedImage) {
      iterations = [{
        id: 'legacy',
        prompt: design.prompt,
        image: design.generatedImage,
        timestamp: design.timestamp
      }];
    }

    if (iterations.length > 0) {
      const lastIteration = iterations[iterations.length - 1];
      const previousIterations = iterations.slice(0, -1);
      
      // Restore history leading up to the result
      setPastIterations(previousIterations);
      
      // The input for the current result is either the previous iteration or the original
      const inputImage = previousIterations.length > 0 
        ? previousIterations[previousIterations.length - 1].image 
        : design.originalImage;
        
      setImagePreview(inputImage);
      setGeneratedImage(lastIteration.image);
      setPromptAndSave(lastIteration.prompt);
    } else {
       // Fallback for empty state (shouldn't happen with valid data)
       setImagePreview(design.originalImage);
       setGeneratedImage(design.generatedImage);
       setPromptAndSave(design.prompt);
    }

    setSelectedFile(null); 
    setAppState(AppState.SUCCESS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditDesign = (design: SavedDesign) => {
    // When editing, we essentially 'load' the project but clear the final result
    // to let the user re-generate or modify the prompt for that step.
    
    setOriginalImageRef(design.originalImage);
    
    // If we have history, we load up to the latest input point
    if (design.iterations && design.iterations.length > 0) {
      const lastIteration = design.iterations[design.iterations.length - 1];
      const previousIterations = design.iterations.slice(0, -1);
      
      // Input is the previous result
      const inputImage = previousIterations.length > 0 
         ? previousIterations[previousIterations.length - 1].image 
         : design.originalImage;

      setPastIterations(previousIterations);
      setImagePreview(inputImage);
      setPromptAndSave(lastIteration.prompt);
    } else {
      setImagePreview(design.originalImage);
      setPromptAndSave(design.prompt);
      setPastIterations([]);
    }

    setGeneratedImage(null); 
    setSelectedFile(null); 
    setAppState(AppState.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDesign = async (id: string) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this design? This action cannot be undone.")) {
      const updated = await deleteDesign(id, user.id);
      setSavedDesigns(updated);
    }
  };

  const scrollToSaved = () => {
    const el = document.getElementById('saved-designs-gallery');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
              <svg className="h-8 w-8 text-leaf-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22H22L12 2Z" fill="currentColor" fillOpacity="0.2" />
                <path d="M12 6L4 22H20L12 6Z" fill="currentColor" />
              </svg>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">
                Landscape<span className="text-leaf-600">Vision</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
               {lastAutoSave && (
                 <div className="hidden sm:flex items-center text-xs text-gray-400 gap-1 animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Auto-saved
                 </div>
               )}
               
               {user ? (
                 <div className="flex items-center gap-4">
                    <div className="text-right">
                       <p className="text-sm font-bold text-gray-800">{user.name}</p>
                       <p className="text-xs text-gray-500 cursor-pointer hover:text-red-600" onClick={logout}>Sign Out</p>
                    </div>
                    {savedDesigns.length > 0 && (
                      <button 
                        onClick={scrollToSaved}
                        className="text-sm font-medium text-leaf-600 hover:text-leaf-700 transition-colors bg-leaf-50 px-3 py-1 rounded-full"
                      >
                        {savedDesigns.length} Projects
                      </button>
                    )}
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                   <button 
                      onClick={() => setShowAuthModal(true)}
                      className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                   >
                     Sign In
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        {appState === AppState.LOADING ? (
           <LoadingState imagePreview={imagePreview} />
        ) : appState === AppState.SUCCESS && generatedImage && imagePreview ? (
          <>
            <ResultComparison 
              originalImage={imagePreview} 
              generatedImage={generatedImage} 
              onReset={handleReset} 
              onRetry={handleRetry}
              onSave={handleSaveClick}
              onRefine={handleRefine}
              onCrop={handleCropUpdate}
              isSaving={isSaving}
            />
            
            <ConfirmationDialog 
              isOpen={showSaveDialog}
              title="Save Project"
              message={
                <div className="space-y-3">
                   <p>Save this design to your local portfolio? You can come back and edit it later.</p>
                   <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Design Stage:</span>
                        <span className="font-medium text-gray-900">
                          {pastIterations.length === 0 ? 'Initial Concept' : `Refinement ${pastIterations.length}`}
                        </span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Total Iterations:</span>
                        <span className="font-medium text-gray-900">{pastIterations.length + 1}</span>
                      </div>
                      <div className="flex justify-between items-start mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-500 whitespace-nowrap">Latest Prompt:</span>
                        <span className="font-medium text-gray-900 text-right truncate ml-2 max-w-[180px]" title={prompt}>
                          "{prompt}"
                        </span>
                      </div>
                   </div>
                </div>
              }
              onConfirm={confirmSaveDesign}
              onCancel={() => setShowSaveDialog(false)}
              isLoading={isSaving}
              confirmText="Save Project"
            />
          </>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            
            {/* Hero Text */}
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                Visualize your dream property
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload a photo of your current yard, describe your vision, and let our AI architect show you the possibilities.
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md animate-fade-in">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{errorMsg}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              
              {/* Step 1: Upload */}
              <div className="p-6 sm:p-8 border-b border-gray-100">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 bg-leaf-100 rounded-full p-2">
                    <span className="text-leaf-700 font-bold text-lg w-6 h-6 flex items-center justify-center">1</span>
                  </div>
                  <h3 className="ml-4 text-lg font-medium text-gray-900">
                    {pastIterations.length > 0 ? 'Current View (Iteration ' + (pastIterations.length) + ')' : 'Upload current photo'}
                  </h3>
                </div>

                {!imagePreview ? (
                  <div 
                    className={`mt-2 flex justify-center px-6 pt-10 pb-12 border-2 border-dashed rounded-xl transition-all cursor-pointer relative overflow-hidden
                      ${isDragging 
                        ? 'border-leaf-500 bg-leaf-50 scale-[1.01]' 
                        : 'border-gray-300 hover:border-leaf-400 hover:bg-leaf-50'
                      }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {isDragging && (
                       <div className="absolute inset-0 bg-leaf-50/95 flex flex-col items-center justify-center z-10 animate-fade-in">
                          <svg className="w-16 h-16 text-leaf-500 animate-bounce mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-xl font-bold text-leaf-700">Drop your photo here</p>
                       </div>
                    )}

                    <div className="space-y-2 text-center pointer-events-none">
                      <svg className={`mx-auto h-12 w-12 ${isDragging ? 'text-leaf-600' : 'text-gray-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label className="relative cursor-pointer rounded-md font-medium text-leaf-600 hover:text-leaf-500 focus-within:outline-none">
                          <span>Upload a file</span>
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                     <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover" />
                     {pastIterations.length === 0 && (
                       <button 
                        onClick={() => {
                          setImagePreview(null);
                          setOriginalImageRef(null);
                          setSelectedFile(null);
                          setGeneratedImage(null);
                        }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-gray-600 hover:text-red-500 shadow-sm transition-colors"
                        title="Clear image"
                       >
                         <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                       </button>
                     )}
                     {pastIterations.length > 0 && (
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                          Using output from previous step
                        </div>
                     )}
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                />
              </div>

              {/* Step 2: Instructions */}
              <div className="p-6 sm:p-8 bg-gray-50/50">
                 <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-leaf-100 rounded-full p-2">
                      <span className="text-leaf-700 font-bold text-lg w-6 h-6 flex items-center justify-center">2</span>
                    </div>
                    <h3 className="ml-4 text-lg font-medium text-gray-900">
                      {pastIterations.length > 0 ? 'Add further changes' : 'Describe the changes'}
                    </h3>
                  </div>
                  {/* Undo/Redo Controls */}
                  <div className="flex space-x-1">
                    <button 
                      onClick={undo} 
                      disabled={!canUndo}
                      className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Undo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                      </svg>
                    </button>
                    <button 
                      onClick={redo} 
                      disabled={!canRedo}
                      className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Redo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="mt-2">
                  <textarea
                    rows={4}
                    className="shadow-sm block w-full focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm border border-gray-300 rounded-md p-3"
                    placeholder="E.g., Replace the grass with a modern stone patio, add a fire pit in the center, and plant lavender bushes along the fence."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                    <span className="text-xs text-gray-500 uppercase font-semibold flex-shrink-0 py-1">Try:</span>
                    {[
                      'Luxury Outdoor Kitchen with Pergola', 
                      'Modern Xeriscape with Native Plants', 
                      'Japanese Zen Garden with Water Feature', 
                      'English Cottage Garden with Stone Paths',
                      'Contemporary Patio with Fire Pit',
                      'Sustainable Meadow with Wildflowers'
                    ].map(s => (
                      <button 
                        key={s}
                        onClick={() => setPromptAndSave(s)}
                        className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600 hover:border-leaf-400 hover:text-leaf-600 transition-colors whitespace-nowrap"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <Button 
                  onClick={handleGenerate}
                  disabled={(!selectedFile && !imagePreview) || !prompt.trim()}
                  className="w-full sm:w-auto text-lg px-8 py-3"
                >
                  Generate Vision
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Saved Gallery */}
        <div className="max-w-7xl mx-auto">
          {user && (
            <SavedDesignsGallery 
              designs={savedDesigns} 
              onLoad={handleLoadDesign} 
              onEdit={handleEditDesign}
              onDelete={handleDeleteDesign} 
            />
          )}
        </div>
        
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />

      </main>
    </div>
  );
}

export default App;