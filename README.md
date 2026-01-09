# ESL Visual Lesson Architect

**AI-Powered Interactive Lesson Generator**

The **ESL Visual Lesson Architect** is an advanced React application that uses Google's **Gemini 3.0 Pro** model to transform raw, text-based ESL lesson plans into high-fidelity, interactive HTML5 web pages ("Learning Objects"). 

It allows educators to create magazine-style, "Sway-like" digital lessons with zero coding knowledge.

## ✨ Key Features

-   **Zero-Code Generation:** Teachers paste text; the app builds a fully coded website.
-   **Single-File Export:** The output is a single `.html` file containing all CSS and JS, making it easy to share via email, LMS, or WhatsApp.
-   **Interactive Elements:**
    -   **WhatsApp-Style Dialogues:** Auto-generated chat UI with dual-voice Text-to-Speech (TTS).
    -   **Instant Quizzes:** Self-grading multiple-choice questions with immediate feedback.
    -   **Vocabulary Swipe Cards:** Horizontal scrolling cards for definitions.
    -   **AI Roleplay Integration:** Built-in prompts to let students practice the topic with Gemini.
-   **Smart Layouts:** Uses **Masonry.js** for dynamic grid layouts and **Parallax** effects for visual depth.
-   **Dynamic File Naming:** Automatically names downloaded files based on the lesson title and current date (e.g., `Lesson-Topic-sway-11.21.25.html`).

---

## 🧠 How It Works (The Multi-Agent Workflow)

Unlike simple chatbots, this application uses a **Two-Step Agentic Workflow** to ensure high-quality output:

### 1. The Architect Agent (Content Expansion)
First, the AI acts as an Instructional Designer. It analyzes the raw input (which is often brief) and:
*   Detects the CEFR Level (A1-C2).
*   Expands examples (e.g., turning 2 vocab words into 10).
*   Adds teacher tips, grammar notes, and scaffolding.
*   Creates a comprehensive "Lesson Blueprint."

### 2. The Developer Agent (Technical Implementation)
Second, the AI acts as a Senior Web Developer. It takes the Blueprint and:
*   Writes valid HTML5/CSS/JS.
*   Enforces visual strictness (Bootstrap 5, margins, padding, shadows).
*   Implements the Javascript logic for TTS and Quizzes.
*   Ensures the output is a single, self-contained file.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js installed.
*   A Google Cloud Project with the **Gemini API** enabled.
*   A valid API Key.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/esl-visual-architect.git
    cd esl-visual-architect
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Set Environment Variables**
    You must set your Gemini API key. 
    *   *Note: In this demo environment, the key is handled via `process.env.API_KEY` injected by the runner.*
    *   For local dev, create a `.env` file:
        ```
        VITE_API_KEY=your_google_api_key_here
        ```
        (You may need to update `geminiService.ts` to use `import.meta.env.VITE_API_KEY` if running locally with Vite).

4.  **Run the App**
    ```bash
    npm run dev
    ```

---

## 📖 Usage Guide

1.  **Input:** Paste your lesson plan into the text area.
    *   *Example:* "Topic: Job Interviews. Level: B2. Include a dialogue about strengths and weaknesses."
2.  **Generate:** Click **"Generate Interactive Lesson"**. The Architect will expand the content, and the Developer will code it.
3.  **Refine (Chat):** Use the chat panel on the left to tweak the result.
    *   *Example:* "Make the quiz harder," "Change the color scheme to purple," or "Replace the TTS audio with this MP3 link: [url]."
4.  **Export:** Click **"Export HTML"**. The file will download automatically.
5.  **Distribute:** Send the HTML file to students, or upload it to a WordPress media library/LMS.

---

## 🛠 Tech Stack

**Frontend Application:**
*   **React 19**
*   **Tailwind CSS** (for the app UI)
*   **Lucide React** (Icons)
*   **Google GenAI SDK** (`@google/genai`)

**Generated Lesson Output (The "Sway" Stack):**
*   **Bootstrap 5** (CDN)
*   **Masonry.js** (CDN)
*   **AOS (Animate On Scroll)** (CDN)
*   **FontAwesome** (CDN)
*   **Google Fonts** (Merriweather & Inter)
*   **Native JS** (SpeechSynthesis API, DOM manipulation)

---

## 📦 Output Specifications

The generated HTML file includes a specific **"Practice with AI"** footer card. This feature allows students to click a button, copy a specific prompt related to their lesson topic, and immediately open Google Gemini to roleplay the scenario they just learned, bridging the gap between static learning and active practice.
