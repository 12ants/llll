import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  /**
   * Generates ideas or content based on a prompt.
   */
  generateSuggestion: async (prompt: string, context?: string): Promise<string> => {
    try {
      const model = 'gemini-3-flash-preview';
      
      let fullPrompt = prompt;
      if (context) {
        fullPrompt = `Context: ${context}\n\nTask: ${prompt}`;
      }

      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
            systemInstruction: "You are a helpful and concise writing assistant for a CMS. Keep answers relevant to content creation.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } // prioritizing speed for UI interaction
        }
      });

      return response.text || "I couldn't generate a suggestion right now.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Error connecting to AI service. Please check your API key.";
    }
  },

  /**
   * Fixes grammar or improves style of selected text.
   */
  improveText: async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Improve the grammar, flow, and clarity of the following text. Maintain the original tone but make it more professional. Return ONLY the improved text, no explanations:\n\n"${text}"`,
        });
        return response.text || text;
    } catch (error) {
        console.error("Gemini Improve Error", error);
        return text;
    }
  },

  /**
   * Continues writing based on the current context.
   */
  continueWriting: async (currentContent: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Continue writing the following text naturally. Maintain the style and flow. Do not repeat the last sentence. Keep it to one paragraph unless the context demands more.\n\nTEXT:\n"${currentContent.slice(-2000)}"`, 
      });
      return response.text || "";
    } catch (error) {
      console.error("Gemini Continue Error", error);
      return "";
    }
  },

  /**
   * Generates a short excerpt/summary for a post.
   */
  generateExcerpt: async (content: string): Promise<string> => {
      try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write a compelling 1-2 sentence excerpt for the following blog post:\n\n${content.substring(0, 2000)}`,
        });
        return response.text || "";
      } catch (error) {
          return "";
      }
  }
};