import { get, set, del } from 'idb-keyval';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { SavedDesign, AutoSaveState, DesignIteration } from '../types';

const DRAFT_KEY = 'landscape-vision-autosave';

/**
 * Uploads a Base64 image string to Firebase Storage and returns the download URL.
 * If the string is already a URL (e.g. from a previous save), it returns it as is.
 */
const uploadImageToStorage = async (path: string, imageString: string): Promise<string> => {
  if (!imageString || imageString.startsWith('http')) {
    return imageString;
  }

  try {
    const storageRef = ref(storage, path);
    // uploadString automatically detects 'data_url' format (e.g. data:image/png;base64,...)
    await uploadString(storageRef, imageString, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error("Failed to upload image to cloud storage");
  }
};

export const getSavedDesigns = async (userId?: string): Promise<SavedDesign[]> => {
  if (!userId) return [];
  
  try {
    const designsRef = collection(db, 'designs');
    // We removed orderBy('timestamp', 'desc') to avoid needing a manual composite index in Firestore console.
    // We will sort the results in memory instead.
    const q = query(
      designsRef, 
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const designs: SavedDesign[] = [];
    
    querySnapshot.forEach((doc) => {
      designs.push(doc.data() as SavedDesign);
    });
    
    // Client-side sort: newest first
    return designs.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error("Failed to load designs from Cloud", e);
    return [];
  }
};

export const saveDesign = async (design: SavedDesign, userId: string): Promise<boolean> => {
  try {
    // 1. Upload the main Original Image
    const originalUrl = await uploadImageToStorage(
      `users/${userId}/${design.id}/original.png`, 
      design.originalImage
    );

    // 2. Upload the main Generated Image
    const generatedUrl = await uploadImageToStorage(
      `users/${userId}/${design.id}/generated.png`, 
      design.generatedImage
    );

    // 3. Upload all iteration images (History)
    // We process these in parallel for speed
    let processedIterations: DesignIteration[] = [];
    if (design.iterations && design.iterations.length > 0) {
      processedIterations = await Promise.all(
        design.iterations.map(async (iter) => {
          const iterUrl = await uploadImageToStorage(
            `users/${userId}/${design.id}/iterations/${iter.id}.png`,
            iter.image
          );
          return { ...iter, image: iterUrl };
        })
      );
    }

    // 4. Construct the lightweight object with URLs instead of huge base64 strings
    const designToSave: SavedDesign = {
      ...design,
      userId,
      originalImage: originalUrl,
      generatedImage: generatedUrl,
      iterations: processedIterations
    };
    
    // 5. Save metadata to Firestore
    await setDoc(doc(db, 'designs', design.id), designToSave);
    
    return true;
  } catch (e) {
    console.error("Failed to save design to Cloud", e);
    return false;
  }
};

export const deleteDesign = async (id: string, userId: string): Promise<SavedDesign[]> => {
  try {
    const docRef = doc(db, 'designs', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const design = docSnap.data() as SavedDesign;
      
      // Cleanup Storage
      const deletePromises: Promise<void>[] = [];
      
      // Helper to try delete but ignore "not found" errors
      const safeDelete = (path: string) => {
         const refToDelete = ref(storage, path);
         return deleteObject(refToDelete).catch(err => {
             // Ignore 'object-not-found' errors
             if (err.code !== 'storage/object-not-found') console.error(err);
         });
      };

      // 1. Original
      if (design.originalImage && design.originalImage.includes('firebasestorage')) {
         deletePromises.push(safeDelete(`users/${userId}/${id}/original.png`));
      }

      // 2. Generated
      if (design.generatedImage && design.generatedImage.includes('firebasestorage')) {
         deletePromises.push(safeDelete(`users/${userId}/${id}/generated.png`));
      }

      // 3. Iterations
      if (design.iterations) {
         design.iterations.forEach(iter => {
            if (iter.image && iter.image.includes('firebasestorage')) {
               deletePromises.push(safeDelete(`users/${userId}/${id}/iterations/${iter.id}.png`));
            }
         });
      }

      await Promise.all(deletePromises);
    }

    // Delete the database entry
    await deleteDoc(docRef);
    
    // Return updated list for the UI
    return await getSavedDesigns(userId);
  } catch (e) {
    console.error("Failed to delete design", e);
    return [];
  }
};

// Auto-save / Draft functions 
export const saveDraft = async (state: AutoSaveState): Promise<void> => {
  try {
    await set(DRAFT_KEY, state);
  } catch (e) {
    console.error("Failed to save draft", e);
  }
};

export const getDraft = async (): Promise<AutoSaveState | undefined> => {
  try {
    return await get<AutoSaveState>(DRAFT_KEY);
  } catch (e) {
    console.error("Failed to load draft", e);
    return undefined;
  }
};

export const clearDraft = async (): Promise<void> => {
  try {
    await del(DRAFT_KEY);
  } catch (e) {
    console.error("Failed to clear draft", e);
  }
};