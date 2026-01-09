
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-3-flash-preview for high performance and rate limit stability
const MODEL_NAME = "gemini-3-flash-preview";

// ============================================================================
// SYSTEM PROMPTS (THE ASSEMBLY LINE)
// ============================================================================

// STAGE 1: ARCHITECT (Pedagogical Blueprint)
const PROMPT_ARCHITECT = `
You are the **ESL Visual Lesson Architect**. Your goal is to create a comprehensive **Lesson Blueprint** based on the user's input.
The input may include text instructions, documents, images, video frames, or **audio files**.

**MULTIMODAL INSTRUCTIONS:**
- **Audio/Video:** If audio or video content is provided, transcribe the key points, identify the speaker's tone, and extract target vocabulary.
- **Visuals:** Analyze images/keyframes for setting and context.
- Use this extracted information to build Step 2 (Presentation) and Step 3 (Target Language).
- In Step 1 (Warm-up), reference the media provided to activate the student's schema (e.g., "In the audio you just heard..." or "Looking at the video clip...").

**STRICT PEDAGOGICAL STANDARDS (PPP Model):**
1. **Meta:** Title, Level (CEFR), Topic, Objectives.
2. **Hero Section:** Title text and an actionable goal.
3. **Step 1: Warm-up.** Introduce the context and engage learner schemas. Mention visual/audio details if provided.
4. **Step 2: Presentation.** Authentic dialogue or text model based on the input context.
5. **Step 3: Target Language.** 8-10 Vocab items + Grammar rationale.
6. **Step 4: Controlled Practice.** Interactive Gap-Fill, Cloze, and a 5-question Quiz.
7. **Step 5: Freer Practice.** Writing/Roleplay prompts for Gemini practice.

**VISUAL INSTRUCTION:**
For every visual element (Scene, Icon, Object), write a prompt in this format:
\`$$Image Prompt$$ : [Subject], [Action/Context], [Style], [Lighting/View].\`

**OUTPUT FORMAT:**
Return ONLY the structured Lesson Blueprint in Markdown. Do not write HTML.
`;

// STAGE 2: ASSET MANAGER (Images & Audio)
const PROMPT_ASSET_MANAGER = `
You are the **Asset Manager**. Analyze the Lesson Blueprint and generate the asset list.
**TASKS:**
1.  **Images:** Find all \`$$Image Prompt$$\` markers. Convert them into \`placehold.co\` URLs.
    -   Format: \`https://placehold.co/600x400/202020/FFF?text=[URL_Encoded_Prompt]\`
2.  **Audio (TTS):** Assign voices to the Dialogue speakers.
    -   **Male:** 'Guy', 'Eric'
    -   **Female:** 'Aria', 'Jenny'

**OUTPUT FORMAT:**
Return a JSON object:
\`\`\`json
{
  "images": { "hero": "...", "vocab_1": "..." },
  "voices": { "SpeakerA": "Male - Guy", "SpeakerB": "Female - Aria" }
}
\`\`\`
`;

// STAGE 3: FRONTEND DEV (The Shell)
const PROMPT_SHELL = `
You are the **Frontend Architect**. Write the **HTML Shell** for this lesson.
**TECHNICAL STANDARDS:**
1.  **Single File:** No external local imports.
2.  **CDNs:** Bootstrap 5.3, FontAwesome 6.4, AOS 2.3, Masonry 4.2, Google Fonts (Inter/Merriweather).
3.  **Styling:**
    -   Define CSS variables: \`--primary-blue: #0d6efd;\`, \`--gemini-gradient: linear-gradient(135deg, #1e4b8f 0%, #448aff 100%);\`.
    -   Include card-hover effects and smooth AOS transitions.
4.  **Structure:** Standard HTML structure with a \`<!-- CONTENT_PLACEHOLDER -->\` marker.

**OUTPUT:** Return ONLY HTML.
`;

// STAGE 4: UI BUILDER (The Content)
const PROMPT_CONTENT = `
You are the **UI Developer**. Generate the **Inner HTML Content Cards**.
**VISUAL STYLE:**
1.  **Cards:** \`col-12 mb-5\`. Shadowed, rounded-4, animated-on-scroll (AOS).
2.  **Components:** 
    - Parallax Hero.
    - Horizontal Vocab Swipe Deck.
    - WhatsApp-style chat bubbles with TTS buttons.
    - Interactive Quiz buttons with \`onclick="checkAnswer(...)"\`.

**OUTPUT:** Return ONLY the \`<div>\` cards.
`;

// STAGE 5: JS LOGICIAN (The Script & Data Layer)
const PROMPT_LOGIC = `
You are the **JavaScript Developer**. Write the complete \`<script>\` block.
**REQUIREMENTS:**
1.  **Init:** AOS.init(), Masonry init.
2.  **TTS:** \`window.speechSynthesis\` logic for assigned voices.
3.  **Quiz:** Validation, feedback (green/red), and score tracking.
4.  **AI Integration:** \`practiceWithGemini\` logic for the footer button.
5.  **DATA LAYER (CRITICAL):** 
    - Include a hidden \`<script id="lesson-metadata" type="application/json">\` at the end of the script block.
    - The JSON must contain: { "topic": "...", "level": "...", "vocabulary": ["list"], "grammar": "summary", "lessonId": "generated_uuid", "version": "2.0" }.
    - This allows for future integration with a global Dashboard or Spaced Repetition System (SRS).

**OUTPUT:** Return ONLY the \`<script>\`... \`</script>\` block.
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 5): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message?.toLowerCase() || "";
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || error?.status === 429;
      
      if (isRateLimit) {
        const delay = Math.pow(2, i) * 5000;
        console.warn(`Rate limit. Attempt ${i + 1}. Waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function callGemini(systemPrompt: string, userContent: string | any[]): Promise<string> {
  const contents = Array.isArray(userContent) 
    ? { parts: userContent }
    : { parts: [{ text: userContent }] };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    config: { systemInstruction: systemPrompt, temperature: 0.7 },
    contents: [contents]
  });
  return response.text || "";
}

const cooldown = () => new Promise(r => setTimeout(r, 1500));

// ============================================================================
// MAIN GENERATION PIPELINE
// ============================================================================

export const generateLessonPlan = async (
  userInput: string,
  attachments?: Array<{ mimeType: string; data: string }>,
  onStatusUpdate?: (status: string) => void
): Promise<string> => {
  try {
    const updateStatus = (msg: string) => onStatusUpdate && onStatusUpdate(msg);

    // 1. ARCHITECT
    updateStatus("🏗️ Designing Lesson Blueprint...");
    
    const parts: any[] = [{ text: userInput }];
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }

    const blueprint = await withRetry(() => callGemini(PROMPT_ARCHITECT, parts));
    await cooldown();

    // 2. ASSET MANAGER
    updateStatus("🎨 Mapping Visual & Audio Assets...");
    const assets = await withRetry(() => callGemini(PROMPT_ASSET_MANAGER, blueprint));
    await cooldown();

    // 3. SHELL
    updateStatus("🔧 Constructing HTML Framework...");
    const shell = await withRetry(() => callGemini(PROMPT_SHELL, "Create shell for topic based on blueprint content."));
    await cooldown();

    // 4. CONTENT
    updateStatus("📝 Coding Interactive Cards...");
    const contentHtml = await withRetry(() => callGemini(PROMPT_CONTENT, `BLUEPRINT:\n${blueprint}\n\nASSETS:\n${assets}`));
    await cooldown();

    // 5. LOGIC & DATA LAYER
    updateStatus("⚡ Embedding Data Layer & JS Logic...");
    const script = await withRetry(() => callGemini(PROMPT_LOGIC, `BLUEPRINT:\n${blueprint}\n\nASSETS:\n${assets}`));

    // ASSEMBLY
    updateStatus("🚀 Finalizing Export Build...");
    let finalHtml = shell.replace(/```html/g, '').replace(/```/g, '');
    const cleanContent = contentHtml.replace(/```html/g, '').replace(/```/g, '');
    const cleanScript = script.replace(/```javascript/g, '').replace(/```/g, '');

    if (finalHtml.includes("<!-- CONTENT_PLACEHOLDER -->")) {
        finalHtml = finalHtml.replace("<!-- CONTENT_PLACEHOLDER -->", cleanContent);
    } else {
        finalHtml = finalHtml.replace("</body>", `<div class="container py-5"><div class="row">${cleanContent}</div></div></body>`);
    }
    finalHtml = finalHtml.replace("</body>", `${cleanScript}</body>`);

    return finalHtml;

  } catch (error) {
    console.error("Pipeline Error:", error);
    throw error;
  }
};

export const refineLessonPlan = async (currentHtml: string, userRequest: string): Promise<string> => {
  return await withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: "You are a Web Developer. Update the existing HTML. Preserve the JSON metadata script if present. Return FULL HTML.",
        temperature: 0.5,
      },
      contents: [{ role: "user", parts: [{ text: `HTML: ${currentHtml}\n\nREQUEST: ${userRequest}` }] }]
    });
    return response.text?.replace(/^```html/, '').replace(/```$/, '') || currentHtml;
  });
};
