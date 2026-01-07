import { GoogleGenAI } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string suitable for the API.
 */
const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        // Remove the Data-URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a base64 Data URI string to the API format.
 */
const base64ToPart = (base64String: string): { inlineData: { data: string; mimeType: string } } => {
  // Regex to capture mime type and base64 data: data:image/png;base64,.....
  const match = base64String.match(/^data:([^;]+);base64,(.+)$/);
  
  if (!match || match.length !== 3) {
    throw new Error("Invalid image data format");
  }

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
};

/**
 * Fetches an image from a URL and converts it to a Base64 Data URI string.
 */
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    throw error;
  }
};

/**
 * Generates a landscape transformation based on an uploaded image (File) or existing image (base64 string or URL) and a text prompt.
 */
export const generateLandscapeVisualization = async (
  imageSource: File | string,
  instruction: string
): Promise<string> => {
  try {
    let imagePart;
    
    if (imageSource instanceof File) {
      imagePart = await fileToPart(imageSource);
    } else {
      // It's a string (Base64 or URL)
      let base64Data = imageSource;
      
      // If it's a URL (from Firebase Storage), fetch and convert it first
      if (imageSource.startsWith('http')) {
        base64Data = await urlToBase64(imageSource);
      }
      
      imagePart = base64ToPart(base64Data);
    }

    // Enhanced prompt to ensure high-quality landscape visualization
    const enhancedPrompt = `
      Act as a professional landscape architect and architectural visualizer.
      Edit the provided image of a property to show the following landscaping changes: ${instruction}.
      
      Maintain the perspective, lighting, and structural integrity of the house/building in the original photo.
      Ensure the new landscaping elements (plants, hardscape, pools, etc.) look photorealistic and naturally integrated into the scene.
      High resolution, detailed, professional quality.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          imagePart,
          { text: enhancedPrompt },
        ],
      },
      // No responseMimeType or responseSchema for this model type
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No content generated");
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};