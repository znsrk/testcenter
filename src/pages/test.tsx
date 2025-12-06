// test.tsx - Complete Olympiad-Style English Test Generator with Essay Evaluation

import { useEffect, useRef } from 'react';

// ============== TYPES ==============
interface TrueFalseQuestion {
  id: number;
  type: 'true-false';
  statement: string;
  correctAnswer: 'TRUE' | 'FALSE' | 'NOT GIVEN';
}

interface MultipleChoiceQuestion {
  id: number;
  type: 'multiple-choice';
  question: string;
  options: string[];
  correctAnswer: number;
}

interface TextInputQuestion {
  id: number;
  type: 'text-input';
  question: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
}


interface ShortText {
  id: number;
  text: string;
  questions: MultipleChoiceQuestion[];
}

interface ReadingTask {
  type: 'reading';
  title: string;
  section1: {
    passage: string;
    part1: { instructions: string; questions: TrueFalseQuestion[] };
    part2: { instructions: string; questions: MultipleChoiceQuestion[] };
  };
  section2: {
    instructions: string;
    texts: ShortText[];
  };
}

interface UseOfEnglishTask {
  type: 'use-of-english';
  title: string;
  task1: {
    instructions: string;
    passage: string;
    questions: MultipleChoiceQuestion[];
  };
  task2: {
    instructions: string;
    sentences: TextInputQuestion[];
  };
  task3: {
    instructions: string;
    questions: TextInputQuestion[];
  };
}

// Essay Types
interface EssayTopic {
  id: number;
  type: 'article' | 'report' | 'letter' | 'review' | 'essay';
  title: string;
  prompt: string;
}

interface GrammarMistake {
  original: string;
  correction: string;
  explanation: string;
}

interface EssayEvaluation {
  totalScore: number;
  categories: {
    content: { score: number; feedback: string };
    communicativeAchievement: { score: number; feedback: string };
    organisation: { score: number; feedback: string };
    language: { score: number; feedback: string };
  };
  grammarMistakes: GrammarMistake[];
  spellingMistakes: GrammarMistake[];
  punctuationMistakes: GrammarMistake[];
  vocabularyAdvice: string[];
  structureAdvice: string[];
}

type Task = ReadingTask | UseOfEnglishTask;

// ============== CONFIG ==============
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
const STORAGE_KEY = 'english_test_state';
const ESSAY_STORAGE_KEY = 'essay_draft_state';

// ============== ESSAY TOPICS ==============
const ESSAY_TOPICS: EssayTopic[] = [
  {
    id: 1,
    type: 'article',
    title: 'The Importance of Titles',
    prompt: 'Write an article for a college magazine discussing how effective and appropriate titles are for books and films. Consider how titles must both reflect the contents of the story and catch the interest of potential readers or viewers.'
  },
  {
    id: 2,
    type: 'article',
    title: 'I Was There',
    prompt: 'Write an article describing a historical event as if you had been present at it. Describe the event you have chosen and what your impressions would have been if you had witnessed it.'
  },
  {
    id: 3,
    type: 'report',
    title: 'Student Facilities Report',
    prompt: 'As a student representative, write a report on what facilities and forms of entertainment students would like to see introduced at your school. Explain how you gathered opinions and make recommendations about what should be introduced and the benefits that would result.'
  },
  {
    id: 4,
    type: 'letter',
    title: 'Letter of Complaint',
    prompt: 'You attended a film showing at your school that was advertised as a family-friendly event, but you were disappointed with the experience. Write a letter to the school outlining the reasons why you were disappointed and suggesting what should be done.'
  },
  {
    id: 5,
    type: 'letter',
    title: 'Job Application',
    prompt: 'You have seen an advertisement in an international magazine looking for writers to cover local news and community issues. Write a letter of application explaining why you are suitable for the role and describing two or three important issues in your local community.'
  },
  {
    id: 6,
    type: 'essay',
    title: 'Technology and Society',
    prompt: 'Some people believe that technology has made our lives easier, while others argue it has created new problems. Discuss both views and give your own opinion.'
  },
  {
    id: 7,
    type: 'review',
    title: 'Book or Film Review',
    prompt: 'Write a review of a book you have read or a film you have seen recently. Include information about the plot, characters, and your overall opinion. Would you recommend it to others?'
  },
  {
    id: 8,
    type: 'essay',
    title: 'Environmental Responsibility',
    prompt: 'Many people believe that individuals can do little to protect the environment and that governments and large companies should take responsibility. To what extent do you agree or disagree with this view?'
  }
];

// ============== LOCAL STORAGE ==============
function saveState(task: Task, answers: Record<string, string | number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ task, answers, timestamp: Date.now() }));
}

function loadState(): { task: Task; answers: Record<string, string | number> } | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const data = JSON.parse(saved);
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function saveEssayDraft(topicId: number, text: string): void {
  localStorage.setItem(ESSAY_STORAGE_KEY, JSON.stringify({ topicId, text, timestamp: Date.now() }));
}

function loadEssayDraft(): { topicId: number; text: string } | null {
  const saved = localStorage.getItem(ESSAY_STORAGE_KEY);
  if (!saved) return null;
  try {
    const data = JSON.parse(saved);
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(ESSAY_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearEssayDraft(): void {
  localStorage.removeItem(ESSAY_STORAGE_KEY);
}

// ============== API SERVICE ==============
async function generateTask(taskType: 'reading' | 'use-of-english'): Promise<Task> {
  const readingPrompt = `Generate a B2-C1 level English reading test in olympiad style. Return ONLY valid JSON (no markdown) with this EXACT structure:
{
  "type": "reading",
  "title": "Reading Comprehension Test",
  "section1": {
    "passage": "A long informative article (500-700 words) about an interesting topic like history, science, culture, or society. Include multiple paragraphs with detailed information.",
    "part1": {
      "instructions": "Decide if the statements are TRUE, FALSE, or NOT GIVEN based on the text.",
      "questions": [
        {"id": 1, "type": "true-false", "statement": "Statement about the text", "correctAnswer": "TRUE"}
      ]
    },
    "part2": {
      "instructions": "Choose the correct answer A, B, C, or D.",
      "questions": [
        {"id": 7, "type": "multiple-choice", "question": "Question about the text?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": 0}
      ]
    }
  },
  "section2": {
    "instructions": "Read the short texts and answer the questions.",
    "texts": [
      {
        "id": 1,
        "text": "A short story or anecdote (80-120 words).",
        "questions": [
          {"id": 12, "type": "multiple-choice", "question": "Question?", "options": ["A", "B", "C", "D"], "correctAnswer": 1}
        ]
      }
    ]
  }
}
REQUIREMENTS:
- Section 1 Part 1: 6 TRUE/FALSE/NOT GIVEN questions (ids 1-6)
- Section 1 Part 2: 5 multiple choice questions (ids 7-11)
- Section 2: 3 different short unrelated texts, each with 4 multiple choice questions (ids 12-23)
- Total: 23 questions
- correctAnswer for multiple-choice is index 0-3`;

  const useOfEnglishPrompt = `Generate a B2-C1 level Use of English test in olympiad style. Return ONLY valid JSON (no markdown) with this EXACT structure:
{
  "type": "use-of-english",
  "title": "Use of English Test",
  "task1": {
    "instructions": "Read the text and choose the best answer (A, B, C, or D) for each gap.",
    "passage": "Text with gaps marked as (1), (2), etc.",
    "questions": [
      {"id": 1, "type": "multiple-choice", "question": "Gap 1", "options": ["grasp", "capture", "seize", "trap"], "correctAnswer": 1}
    ]
  },
  "task2": {
    "instructions": "Put the verbs in brackets into the correct tense form.",
    "sentences": [
      {"id": 10, "type": "text-input", "question": "She ___ (work) here since 2020.", "correctAnswer": "has worked", "acceptableAnswers": ["has worked", "has been working"]}
    ]
  },
  "task3": {
    "instructions": "Think of ONE word that fits appropriately in all three sentences.",
    "questions": [
      {"id": 16, "type": "text-input", "question": "1) sentence one ___ \\n2) sentence two ___ \\n3) sentence three ___", "correctAnswer": "word", "acceptableAnswers": ["word"]}
    ]
  }
}
REQUIREMENTS:
- Task 1: 9 gap-fill multiple choice questions (ids 1-9)
- Task 2: 6 verb tense sentences (ids 10-15)
- Task 3: 5 one-word-fits-all questions (ids 16-20)
- Total: 20 questions`;

  const prompt = taskType === 'reading' ? readingPrompt : useOfEnglishPrompt;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error('Empty response from API');

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid JSON response');

  return JSON.parse(jsonMatch[0]) as Task;
}

async function evaluateEssay(essay: string, topic: EssayTopic): Promise<EssayEvaluation> {
  const prompt = `You are a strict B2-C1 level English essay examiner. Evaluate the following essay written for this prompt:

ESSAY TYPE: ${topic.type.toUpperCase()}
TOPIC: ${topic.title}
PROMPT: ${topic.prompt}
WORD COUNT REQUIREMENT: 150-160 words

STUDENT'S ESSAY:
"""
${essay}
"""

Evaluate this essay and return ONLY valid JSON (no markdown, no code blocks) with this EXACT structure:
{
  "totalScore": <number 0-40>,
  "categories": {
    "content": {
      "score": <number 0-10>,
      "feedback": "<specific feedback about how well the content addresses the task>"
    },
    "communicativeAchievement": {
      "score": <number 0-10>,
      "feedback": "<feedback about tone, register, and format appropriateness>"
    },
    "organisation": {
      "score": <number 0-10>,
      "feedback": "<feedback about structure, paragraphing, and coherence>"
    },
    "language": {
      "score": <number 0-10>,
      "feedback": "<feedback about grammar range and vocabulary>"
    }
  },
  "grammarMistakes": [
    {"original": "<exact wrong phrase>", "correction": "rrected version>", "explanation": "<brief grammar rule explanation>"}
  ],
  "spellingMistakes": [
    {"original": "<misspelled word>", "correction": "rrect spelling>", "explanation": "<brief note>"}
  ],
  "punctuationMistakes": [
    {"original": "<punctuation error>", "correction": "rrect punctuation>", "explanation": "<brief rule>"}
  ],
  "vocabularyAdvice": [
    "<specific suggestion for better word choice or phrase>"
  ],
  "structureAdvice": [
    "<specific suggestion for improving essay structure>"
  ]
}

IMPORTANT RULES:
- Be strict and thorough in finding ALL mistakes
- totalScore must equal the sum of all four category scores
- List EVERY grammar, spelling, and punctuation mistake found
- Provide actionable, specific advice
- Focus ONLY on errors and improvements, not praise
- If essay is too short or too long, reflect this in the content score`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error('Empty response from API');

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid JSON response');

  return JSON.parse(jsonMatch[0]) as EssayEvaluation;
}

async function generateEssayTopic(): Promise<EssayTopic> {
  const types = ['article', 'report', 'letter', 'review', 'essay'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  const prompt = `Generate a B2-C1 level English writing task. Return ONLY valid JSON (no markdown) with this EXACT structure:
{
  "id": 99,
  "type": "${randomType}",
  "title": "<short descriptive title>",
  "prompt": "<detailed writing prompt of 2-3 sentences explaining exactly what to write about>"
}

The task should be appropriate for an English olympiad and require 150-160 words.`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9 }
    })
  });

  if (!response.ok) throw new Error('Failed to generate topic');

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonMatch = responseText?.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response');

  return JSON.parse(jsonMatch[0]) as EssayTopic;
}

// ============== TEST RENDERER ==============
class TestRenderer {
  private task: Task;
  private container: HTMLElement;
  private answers: Record<string, string | number> = {};
  private submitted: boolean = false;

  constructor(task: Task, container: HTMLElement, savedAnswers?: Record<string, string | number>) {
    this.task = task;
    this.container = container;
    if (savedAnswers) this.answers = savedAnswers;
    this.render();
  }

  private render(): void {
    if (this.task.type === 'reading') {
      this.renderReadingTask(this.task);
    } else {
      this.renderUseOfEnglishTask(this.task);
    }
    this.attachEventListeners();
    this.restoreAnswers();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private renderReadingTask(task: ReadingTask): void {
    this.container.innerHTML = `
      <div class="test-wrapper">
        <div class="test-header">
          <h2>${this.escapeHtml(task.title)}</h2>
          <span class="test-badge">Reading • B2-C1 Level</span>
        </div>
        <section class="test-section">
          <h3>Section 1</h3>
          <div class="passage-card">
            <div class="passage-text">${this.escapeHtml(task.section1.passage)}</div>
          </div>
          <div class="task-block">
            <h4>Part A: True / False / Not Given</h4>
            <p class="task-instructions">${this.escapeHtml(task.section1.part1.instructions)}</p>
            <div class="questions-list">
              ${task.section1.part1.questions.map(q => this.renderTrueFalseQuestion(q)).join('')}
            </div>
          </div>
          <div class="task-block">
            <h4>Part B: Multiple Choice</h4>
            <p class="task-instructions">${this.escapeHtml(task.section1.part2.instructions)}</p>
            <div class="questions-list">
              ${task.section1.part2.questions.map(q => this.renderMultipleChoiceQuestion(q)).join('')}
            </div>
          </div>
        </section>
        <section class="test-section">
          <h3>Section 2: Short Texts</h3>
          <p class="task-instructions">${this.escapeHtml(task.section2.instructions)}</p>
          ${task.section2.texts.map(t => this.renderShortText(t)).join('')}
        </section>
        <button class="btn-submit">Submit Test</button>
        <div class="results-container"></div>
      </div>
    `;
  }

  private renderUseOfEnglishTask(task: UseOfEnglishTask): void {
    this.container.innerHTML = `
      <div class="test-wrapper">
        <div class="test-header">
          <h2>${this.escapeHtml(task.title)}</h2>
          <span class="test-badge">Use of English • B2-C1 Level</span>
        </div>
        <section class="test-section">
          <h3>Task 1: Gap Fill</h3>
          <p class="task-instructions">${this.escapeHtml(task.task1.instructions)}</p>
          <div class="passage-card">
            <div class="passage-text">${this.escapeHtml(task.task1.passage)}</div>
          </div>
          <div class="questions-list">
            ${task.task1.questions.map(q => this.renderMultipleChoiceQuestion(q)).join('')}
          </div>
        </section>
        <section class="test-section">
          <h3>Task 2: Verb Tenses</h3>
          <p class="task-instructions">${this.escapeHtml(task.task2.instructions)}</p>
          <div class="questions-list">
            ${task.task2.sentences.map(q => this.renderTextInputQuestion(q)).join('')}
          </div>
        </section>
        <section class="test-section">
          <h3>Task 3: One Word</h3>
          <p class="task-instructions">${this.escapeHtml(task.task3.instructions)}</p>
          <div class="questions-list">
            ${task.task3.questions.map(q => this.renderTextInputQuestion(q, true)).join('')}
          </div>
        </section>
        <button class="btn-submit">Submit Test</button>
        <div class="results-container"></div>
      </div>
    `;
  }

  private renderTrueFalseQuestion(q: TrueFalseQuestion): string {
    return `
      <div class="question-card" data-id="${q.id}" data-type="true-false" data-correct="${q.correctAnswer}">
        <p class="question-text"><strong>${q.id}.</strong> ${this.escapeHtml(q.statement)}</p>
        <div class="tf-options">
          <label class="tf-option"><input type="radio" name="q${q.id}" value="TRUE"><span>TRUE</span></label>
          <label class="tf-option"><input type="radio" name="q${q.id}" value="FALSE"><span>FALSE</span></label>
          <label class="tf-option"><input type="radio" name="q${q.id}" value="NOT GIVEN"><span>NOT GIVEN</span></label>
        </div>
      </div>
    `;
  }

  private renderMultipleChoiceQuestion(q: MultipleChoiceQuestion): string {
    const letters = ['A', 'B', 'C', 'D'];
    return `
      <div class="question-card" data-id="${q.id}" data-type="multiple-choice" data-correct="${q.correctAnswer}">
        <p class="question-text"><strong>${q.id}.</strong> ${this.escapeHtml(q.question)}</p>
        <div class="mc-options">
          ${q.options.map((opt, i) => `
            <label class="mc-option">
              <input type="radio" name="q${q.id}" value="${i}">
              <span class="option-letter">${letters[i]}</span>
              <span class="option-text">${this.escapeHtml(opt)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderTextInputQuestion(q: TextInputQuestion, _multiLine: boolean = false): string {
    const questionHtml = q.question.replace(/\\n/g, '<br>');
    return `
      <div class="question-card" data-id="${q.id}" data-type="text-input" data-correct="${this.escapeHtml(q.correctAnswer)}" data-acceptable='${JSON.stringify(q.acceptableAnswers || [])}'>
        <p class="question-text"><strong>${q.id}.</strong></p>
        <div class="question-context">${questionHtml}</div>
        <input type="text" class="text-answer" name="q${q.id}" placeholder="Type your answer..." autocomplete="off">
      </div>
    `;
  }

  private renderShortText(t: ShortText): string {
    return `
      <div class="short-text-block">
        <div class="short-text-card">
          <p class="short-text-label">Text ${t.id}</p>
          <p class="short-text-content">${this.escapeHtml(t.text)}</p>
        </div>
        <div class="questions-list">
          ${t.questions.map(q => this.renderMultipleChoiceQuestion(q)).join('')}
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    this.container.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.answers[target.name] = target.value;
        saveState(this.task, this.answers);
      });
    });

    this.container.querySelectorAll('input[type="text"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.answers[target.name] = target.value;
        saveState(this.task, this.answers);
      });
    });

    this.container.querySelector('.btn-submit')?.addEventListener('click', () => {
      if (!this.submitted) this.submitTest();
    });
  }

  private restoreAnswers(): void {
    Object.entries(this.answers).forEach(([name, value]) => {
      if (typeof value === 'string' && !value.match(/^\d+$/)) {
        const input = this.container.querySelector(`input[name="${name}"][value="${value}"]`) as HTMLInputElement;
        if (input) input.checked = true;
        else {
          const textInput = this.container.querySelector(`input[name="${name}"][type="text"]`) as HTMLInputElement;
          if (textInput) textInput.value = value;
        }
      } else {
        const input = this.container.querySelector(`input[name="${name}"][value="${value}"]`) as HTMLInputElement;
        if (input) input.checked = true;
      }
    });
  }

  private submitTest(): void {
    this.submitted = true;
    let correct = 0;
    let total = 0;

    this.container.querySelectorAll('.question-card').forEach(card => {
      const id = card.getAttribute('data-id');
      const type = card.getAttribute('data-type');
      const correctAnswer = card.getAttribute('data-correct');
      const userAnswer = this.answers[`q${id}`];
      total++;

      let isCorrect = false;
      if (type === 'text-input') {
        const acceptable = JSON.parse(card.getAttribute('data-acceptable') || '[]') as string[];
        const allAcceptable = [correctAnswer!, ...acceptable].map(a => a.toLowerCase().trim());
        isCorrect = allAcceptable.includes(String(userAnswer || '').toLowerCase().trim());
      } else if (type === 'multiple-choice') {
        isCorrect = String(userAnswer) === correctAnswer;
      } else {
        isCorrect = userAnswer === correctAnswer;
      }

      if (isCorrect) {
        correct++;
        card.classList.add('correct');
      } else {
        card.classList.add('incorrect');
        const feedback = document.createElement('div');
        feedback.className = 'answer-feedback';
        feedback.textContent = `Correct answer: ${type === 'multiple-choice' ? ['A', 'B', 'C', 'D'][parseInt(correctAnswer!)] : correctAnswer}`;
        card.appendChild(feedback);
      }
    });

    const submitBtn = this.container.querySelector('.btn-submit') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitted';

    const resultsContainer = this.container.querySelector('.results-container')!;
    const percentage = Math.round((correct / total) * 100);

    resultsContainer.innerHTML = `
      <div class="results-panel">
        <h3>Your Results</h3>
        <div class="score-circle ${percentage >= 70 ? 'passing' : 'failing'}">
          <span class="score-number">${percentage}%</span>
        </div>
        <p class="score-detail">${correct} out of ${total} correct</p>
        <p class="feedback">${this.getFeedback(percentage)}</p>
        <button class="btn-new-test">Take New Test</button>
      </div>
    `;

    resultsContainer.querySelector('.btn-new-test')?.addEventListener('click', () => {
      clearState();
      window.location.reload();
    });

    clearState();
  }

  private getFeedback(score: number): string {
    if (score >= 90) return '🏆 Excellent! Outstanding performance!';
    if (score >= 70) return '✨ Good job! You passed!';
    if (score >= 50) return '📚 Keep practicing, you\'re getting there!';
    return '💪 Don\'t give up! Review and try again!';
  }
}

// ============== ESSAY RENDERER ==============
class EssayRenderer {
  private container: HTMLElement;
  private currentTopic: EssayTopic | null = null;
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    const savedDraft = loadEssayDraft();
    
    this.container.innerHTML = `
      <div class="test-wrapper essay-wrapper">
        <div class="test-header">
          <h2>✍️ Essay Writing</h2>
          <span class="test-badge">Writing • B2-C1 Level</span>
        </div>

        <section class="test-section">
          <h3>Choose Your Topic</h3>
          <div class="topic-selection">
            <select id="topic-select" class="topic-dropdown">
              <option value="">-- Select a topic --</option>
              <option value="generate">🎲 Generate Random Topic</option>
              ${ESSAY_TOPICS.map(t => `<option value="${t.id}">[${t.type.toUpperCase()}] ${t.title}</option>`).join('')}
            </select>
          </div>
          <div id="topic-display" class="topic-display hidden">
            <div class="topic-type-badge"></div>
            <h4 class="topic-title"></h4>
            <p class="topic-prompt"></p>
            <p class="word-requirement">📝 Required: 150-160 words</p>
          </div>
        </section>

        <section class="test-section" id="writing-section" style="display: none;">
          <h3>Your Essay</h3>
          <div class="essay-container">
            <textarea id="essay-textarea" class="essay-textarea" placeholder="Write your essay here...">${savedDraft?.text || ''}</textarea>
            <div class="essay-footer">
              <span class="word-count">Words: 0</span>
              <span class="char-count">Characters: 0</span>
            </div>
          </div>
          <div class="essay-actions">
            <button class="btn-clear-essay">Clear</button>
            <button class="btn-help-essay" disabled>Give me help</button>
            <button class="btn-rate-essay" disabled>Rate My Essay</button>
          </div>
          <div id="essay-help" class="essay-help"></div>
        </section>

        <div id="evaluation-results" class="evaluation-results"></div>
      </div>
    `;

    this.attachEventListeners();
    
    // Restore saved draft topic
    if (savedDraft) {
      const topic = ESSAY_TOPICS.find(t => t.id === savedDraft.topicId);
      if (topic) {
        this.currentTopic = topic;
        (this.container.querySelector('#topic-select') as HTMLSelectElement).value = String(topic.id);
        this.displayTopic(topic);
        this.updateWordCount();
      }
    }
  }

  private attachEventListeners(): void {
    const topicSelect = this.container.querySelector('#topic-select') as HTMLSelectElement;
    const textarea = this.container.querySelector('#essay-textarea') as HTMLTextAreaElement;
    const rateBtn = this.container.querySelector('.btn-rate-essay') as HTMLButtonElement;
    const clearBtn = this.container.querySelector('.btn-clear-essay') as HTMLButtonElement;
    const helpBtn = this.container.querySelector('.btn-help-essay') as HTMLButtonElement;

    topicSelect.addEventListener('change', async () => {
      const value = topicSelect.value;
      if (!value) {
        this.hideTopic();
        return;
      }

      if (value === 'generate') {
        topicSelect.disabled = true;
        try {
          const topic = await generateEssayTopic();
          this.currentTopic = topic;
          this.displayTopic(topic);
        } catch (error) {
          alert('Failed to generate topic. Please try again.');
        } finally {
          topicSelect.disabled = false;
          topicSelect.value = '';
        }
      } else {
        const topic = ESSAY_TOPICS.find(t => t.id === parseInt(value));
        if (topic) {
          this.currentTopic = topic;
          this.displayTopic(topic);
        }
      }
    });

    textarea.addEventListener('input', () => {
      this.updateWordCount();
      if (this.currentTopic) {
        saveEssayDraft(this.currentTopic.id, textarea.value);
      }
    });

    helpBtn.addEventListener('click', () => {
      if (!this.currentTopic) return;
      this.showHelpAdvice();
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your essay?')) {
        textarea.value = '';
        this.updateWordCount();
        clearEssayDraft();
        this.container.querySelector('#evaluation-results')!.innerHTML = '';
      }
    });

    rateBtn.addEventListener('click', async () => {
      if (!this.currentTopic) return;
      
      const essay = textarea.value.trim();
      if (!essay) {
        alert('Please write your essay first.');
        return;
      }

      rateBtn.disabled = true;
      rateBtn.textContent = 'Evaluating...';

      const resultsDiv = this.container.querySelector('#evaluation-results')!;
      resultsDiv.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>AI is evaluating your essay...</p>
        </div>
      `;

      try {
        const evaluation = await evaluateEssay(essay, this.currentTopic);
        this.displayEvaluation(evaluation);
      } catch (error) {
        console.error('Evaluation error:', error);
        resultsDiv.innerHTML = `<div class="error">❌ Failed to evaluate essay. Please try again.</div>`;
      } finally {
        rateBtn.disabled = false;
        rateBtn.textContent = 'Rate My Essay';
      }
    });
  }

  private displayTopic(topic: EssayTopic): void {
    const display = this.container.querySelector('#topic-display')!;
    const writingSection = this.container.querySelector('#writing-section') as HTMLElement;
    
    display.classList.remove('hidden');
    display.querySelector('.topic-type-badge')!.textContent = topic.type.toUpperCase();
    display.querySelector('.topic-title')!.textContent = topic.title;
    display.querySelector('.topic-prompt')!.textContent = topic.prompt;
    
    writingSection.style.display = 'block';
    this.toggleHelpButton(true);
    this.updateWordCount();
  }

  private hideTopic(): void {
    this.container.querySelector('#topic-display')!.classList.add('hidden');
    (this.container.querySelector('#writing-section') as HTMLElement).style.display = 'none';
    this.currentTopic = null;
  }

  private updateWordCount(): void {
    const textarea = this.container.querySelector('#essay-textarea') as HTMLTextAreaElement;
    const text = textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;

    this.container.querySelector('.word-count')!.textContent = `Words: ${words}`;
    this.container.querySelector('.char-count')!.textContent = `Characters: ${chars}`;

    const rateBtn = this.container.querySelector('.btn-rate-essay') as HTMLButtonElement;
    rateBtn.disabled = words < 50;

    // Color code word count
    const wordCountEl = this.container.querySelector('.word-count') as HTMLElement;
    if (words > 200 || (words >= 150 && words <= 160)) {
      wordCountEl.style.color = 'var(--success)';
    } else if (words >= 140 && words <= 170) {
      wordCountEl.style.color = 'var(--warning)';
    } else {
      wordCountEl.style.color = 'var(--danger)';
    }
  }

  private toggleHelpButton(enabled: boolean): void {
    const helpBtn = this.container.querySelector('.btn-help-essay') as HTMLButtonElement;
    if (helpBtn) helpBtn.disabled = !enabled;
  }

  private showHelpAdvice(): void {
    if (!this.currentTopic) return;
    const helpDiv = this.container.querySelector('#essay-help') as HTMLElement;
    const advice = this.getHelpAdvice(this.currentTopic.type);
    helpDiv.innerHTML = `
      <div class="help-panel">
        <div class="help-header">
          <strong>Structure tips for ${this.currentTopic.type.toUpperCase()}</strong>
          <span>${this.escapeHtml(this.currentTopic.title)}</span>
        </div>
        <ul class="help-list">
          ${advice.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private getHelpAdvice(type: EssayTopic['type']): string[] {
    const tips: Record<EssayTopic['type'], string[]> = {
      article: [
        'Hook readers with a short intro that states the angle of your story.',
        'Use two or three body paragraphs, each focusing on a clear subtopic with engaging detail.',
        'Finish with a punchy recommendation or takeaway that relates back to the hook.'
      ],
      report: [
        'Open with purpose and background, mentioning how information was gathered.',
        'Group findings under logical subheadings, using formal, impersonal language.',
        'End with actionable recommendations and expected benefits.'
      ],
      letter: [
        'Start with an appropriate greeting and a friendly but purposeful opening.',
        'Develop each paragraph around a clear point, maintaining the right register throughout.',
        'Close with a polite call to action and a sign-off that matches the level of formality.'
      ],
      review: [
        'Begin by naming the work, genre, and context to orient the reader.',
        'Balance summary with critique—highlight strengths, weaknesses, and unique features.',
        'Conclude with a clear verdict and say who would enjoy it.'
      ],
      essay: [
        'Write an introduction that paraphrases the question and states your position.',
        'Use two main body paragraphs, each with a topic sentence, explanation, and example.',
        'Conclude by summarizing your stance and reinforcing the most convincing argument.'
      ]
    };
    return tips[type] ?? ['Plan an introduction, organised body paragraphs, and a concise conclusion tailored to the task.'];
  }

  private displayEvaluation(evaluation: EssayEvaluation): void {
    const resultsDiv = this.container.querySelector('#evaluation-results')!;
    const scoreClass = evaluation.totalScore >= 28 ? 'passing' : evaluation.totalScore >= 20 ? 'average' : 'failing';

    resultsDiv.innerHTML = `
      <div class="evaluation-panel">
        <div class="eval-header">
          <h3>📊 Evaluation Results</h3>
          <div class="total-score ${scoreClass}">
            <span class="score-value">${evaluation.totalScore}</span>
            <span class="score-max">/ 40</span>
          </div>
        </div>

        <div class="eval-categories">
          <div class="category-card">
            <div class="category-header">
              <span class="category-name">Content</span>
              <span class="category-score">${evaluation.categories.content.score}/10</span>
            </div>
            <div class="score-bar"><div class="score-fill" style="width: ${evaluation.categories.content.score * 10}%"></div></div>
            <p class="category-feedback">${this.escapeHtml(evaluation.categories.content.feedback)}</p>
          </div>

          <div class="category-card">
            <div class="category-header">
              <span class="category-name">Communicative Achievement</span>
              <span class="category-score">${evaluation.categories.communicativeAchievement.score}/10</span>
            </div>
            <div class="score-bar"><div class="score-fill" style="width: ${evaluation.categories.communicativeAchievement.score * 10}%"></div></div>
            <p class="category-feedback">${this.escapeHtml(evaluation.categories.communicativeAchievement.feedback)}</p>
          </div>

          <div class="category-card">
            <div class="category-header">
              <span class="category-name">Organisation</span>
              <span class="category-score">${evaluation.categories.organisation.score}/10</span>
            </div>
            <div class="score-bar"><div class="score-fill" style="width: ${evaluation.categories.organisation.score * 10}%"></div></div>
            <p class="category-feedback">${this.escapeHtml(evaluation.categories.organisation.feedback)}</p>
          </div>

          <div class="category-card">
            <div class="category-header">
              <span class="category-name">Language</span>
              <span class="category-score">${evaluation.categories.language.score}/10</span>
            </div>
            <div class="score-bar"><div class="score-fill" style="width: ${evaluation.categories.language.score * 10}%"></div></div>
            <p class="category-feedback">${this.escapeHtml(evaluation.categories.language.feedback)}</p>
          </div>
        </div>

        ${evaluation.grammarMistakes.length > 0 ? `
          <div class="mistakes-section">
            <h4>🔴 Grammar Mistakes</h4>
            <div class="mistakes-list">
              ${evaluation.grammarMistakes.map(m => `
                <div class="mistake-item">
                  <div class="mistake-original">"${this.escapeHtml(m.original)}"</div>
                  <div class="mistake-arrow">→</div>
                  <div class="mistake-correction">"${this.escapeHtml(m.correction)}"</div>
                  <div class="mistake-explanation">${this.escapeHtml(m.explanation)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${evaluation.spellingMistakes.length > 0 ? `
          <div class="mistakes-section">
            <h4>📝 Spelling Mistakes</h4>
            <div class="mistakes-list">
              ${evaluation.spellingMistakes.map(m => `
                <div class="mistake-item">
                  <div class="mistake-original">"${this.escapeHtml(m.original)}"</div>
                  <div class="mistake-arrow">→</div>
                  <div class="mistake-correction">"${this.escapeHtml(m.correction)}"</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${evaluation.punctuationMistakes.length > 0 ? `
          <div class="mistakes-section">
            <h4>✏️ Punctuation Mistakes</h4>
            <div class="mistakes-list">
              ${evaluation.punctuationMistakes.map(m => `
                <div class="mistake-item">
                  <div class="mistake-original">"${this.escapeHtml(m.original)}"</div>
                  <div class="mistake-arrow">→</div>
                  <div class="mistake-correction">"${this.escapeHtml(m.correction)}"</div>
                  <div class="mistake-explanation">${this.escapeHtml(m.explanation)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${evaluation.vocabularyAdvice.length > 0 ? `
          <div class="advice-section">
            <h4>💡 Vocabulary Advice</h4>
            <ul class="advice-list">
              ${evaluation.vocabularyAdvice.map(a => `<li>${this.escapeHtml(a)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${evaluation.structureAdvice.length > 0 ? `
          <div class="advice-section">
            <h4>🏗️ Structure Advice</h4>
            <ul class="advice-list">
              ${evaluation.structureAdvice.map(a => `<li>${this.escapeHtml(a)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }
}

// ============== STYLES ==============
const STYLES = `
  :root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --radius: 12px;
  }

  .test-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .test-page h1 { color: white; text-align: center; margin-bottom: 8px; font-size: 2.5rem; font-weight: 700; }
  .page-subtitle { color: rgba(255,255,255,0.8); text-align: center; margin-bottom: 32px; }

  .controls-card {
    max-width: 600px;
    margin: 0 auto 32px;
    background: var(--card-bg);
    border-radius: var(--radius);
    padding: 24px;
    box-shadow: var(--shadow);
  }

  .controls { display: flex; gap: 12px; flex-wrap: wrap; }
  .controls select {
    flex: 1;
    min-width: 200px;
    padding: 14px 16px;
    font-size: 16px;
    border-radius: 8px;
    border: 2px solid var(--border);
    background: white;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .controls select:focus { outline: none; border-color: var(--primary); }

  .btn-generate {
    padding: 14px 28px;
    font-size: 16px;
    font-weight: 600;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-generate:hover:not(:disabled) { background: var(--primary-dark); transform: translateY(-1px); }
  .btn-generate:disabled { background: #cbd5e1; cursor: not-allowed; }

  .loading { text-align: center; padding: 60px; color: white; }
  .loading-spinner {
    width: 48px; height: 48px;
    border: 4px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error { max-width: 600px; margin: 0 auto; padding: 24px; background: #fef2f2; color: var(--danger); border-radius: var(--radius); text-align: center; }

  .test-wrapper {
    max-width: 900px;
    margin: 0 auto;
    background: var(--card-bg);
    border-radius: var(--radius);
    padding: 32px;
    box-shadow: var(--shadow);
  }

  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border);
  }
  .test-header h2 { margin: 0; color: var(--text); font-size: 1.75rem; }
  .test-badge {
    background: linear-gradient(135deg, var(--primary), #8b5cf6);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
  }

  .test-section { margin-bottom: 40px; }
  .test-section h3 {
    color: var(--text);
    font-size: 1.25rem;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .test-section h3::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 24px;
    background: var(--primary);
    border-radius: 2px;
  }

  .task-block { margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 8px; }
  .task-block h4 { color: var(--text); margin: 0 0 8px 0; font-size: 1rem; }
  .task-instructions { color: var(--text-muted); font-style: italic; margin-bottom: 16px; }

  .passage-card {
    background: linear-gradient(to right, #fafafa, #f5f5f5);
    border-left: 4px solid var(--primary);
    padding: 24px;
    border-radius: 8px;
    margin-bottom: 24px;
  }
  .passage-text { line-height: 1.8; color: var(--text); white-space: pre-wrap; }

  .questions-list { display: flex; flex-direction: column; gap: 16px; }
  .question-card {
    background: white;
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    transition: all 0.2s;
  }
  .question-card:hover { border-color: #cbd5e1; }
  .question-card.correct { border-color: var(--success); background: #f0fdf4; }
  .question-card.incorrect { border-color: var(--danger); background: #fef2f2; }
  .question-text { margin: 0 0 12px 0; color: var(--text); font-weight: 500; }
  .question-context { margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 6px; line-height: 1.6; }

  .tf-options { display: flex; gap: 12px; flex-wrap: wrap; }
  .tf-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: 2px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tf-option:hover { border-color: var(--primary); background: #f8fafc; }
  .tf-option input:checked + span { color: var(--primary); font-weight: 600; }
  .tf-option:has(input:checked) { border-color: var(--primary); background: #eef2ff; }

  .mc-options { display: flex; flex-direction: column; gap: 8px; }
  .mc-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 2px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .mc-option:hover { border-color: var(--primary); background: #f8fafc; }
  .mc-option:has(input:checked) { border-color: var(--primary); background: #eef2ff; }
  .option-letter {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: var(--border);
    border-radius: 6px;
    font-weight: 600;
    font-size: 14px;
  }
  .mc-option:has(input:checked) .option-letter { background: var(--primary); color: white; }
  .option-text { flex: 1; }

  .text-answer {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    border: 2px solid var(--border);
    border-radius: 8px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .text-answer:focus { outline: none; border-color: var(--primary); }

  .short-text-block { margin-bottom: 32px; padding: 24px; background: #fafafa; border-radius: 12px; }
  .short-text-card { margin-bottom: 20px; }
  .short-text-label { font-weight: 600; color: var(--primary); margin-bottom: 8px; }
  .short-text-content { line-height: 1.7; color: var(--text); }

  .answer-feedback {
    margin-top: 12px;
    padding: 8px 12px;
    background: #fef3c7;
    border-radius: 6px;
    font-size: 14px;
    color: #92400e;
  }

  .btn-submit {
    width: 100%;
    padding: 16px;
    font-size: 18px;
    font-weight: 600;
    background: linear-gradient(135deg, var(--success), #059669);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 32px;
  }
  .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
  .btn-submit:disabled { background: #cbd5e1; cursor: not-allowed; }

  .results-panel {
    margin-top: 32px;
    padding: 40px;
    background: linear-gradient(135deg, #f8fafc, #eef2ff);
    border-radius: 12px;
    text-align: center;
  }
  .results-panel h3 { margin: 0 0 24px 0; font-size: 1.5rem; }
  .score-circle {
    width: 140px; height: 140px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
    border: 6px solid;
  }
  .score-circle.passing { border-color: var(--success); background: #f0fdf4; }
  .score-circle.failing { border-color: var(--danger); background: #fef2f2; }
  .score-number { font-size: 2.5rem; font-weight: 700; }
  .passing .score-number { color: var(--success); }
  .failing .score-number { color: var(--danger); }
  .score-detail { color: var(--text-muted); margin-bottom: 8px; }
  .feedback { font-size: 1.25rem; margin-bottom: 24px; }

  .btn-new-test {
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 600;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-new-test:hover { background: var(--primary-dark); }

  input[type="radio"] { width: 18px; height: 18px; cursor: pointer; }

  /* Essay Styles */
  .topic-dropdown {
    width: 100%;
    padding: 14px 16px;
    font-size: 16px;
    border-radius: 8px;
    border: 2px solid var(--border);
    background: white;
    cursor: pointer;
  }

  .topic-display {
    margin-top: 20px;
    padding: 24px;
    background: linear-gradient(135deg, #eef2ff, #faf5ff);
    border-radius: 12px;
    border-left: 4px solid var(--primary);
  }
  .topic-display.hidden { display: none; }
  .topic-type-badge {
    display: inline-block;
    padding: 4px 12px;
    background: var(--primary);
    color: white;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .topic-title { margin: 0 0 8px 0; color: var(--text); font-size: 1.25rem; }
  .topic-prompt { color: var(--text-muted); line-height: 1.6; margin-bottom: 12px; }
  .word-requirement { font-size: 14px; color: var(--primary); font-weight: 500; margin: 0; }

  .essay-container { margin-bottom: 16px; }
  .essay-textarea {
    width: 100%;
    min-height: 300px;
    padding: 20px;
    font-size: 16px;
    line-height: 1.8;
    border: 2px solid var(--border);
    border-radius: 12px;
    resize: vertical;
    font-family: inherit;
    box-sizing: border-box;
  }
  .essay-textarea:focus { outline: none; border-color: var(--primary); }
  .essay-footer {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 0 0 12px 12px;
    font-size: 14px;
    color: var(--text-muted);
  }

  .essay-actions { display: flex; gap: 12px; justify-content: flex-end; }
  .btn-clear-essay {
    padding: 12px 24px;
    font-size: 16px;
    background: #f1f5f9;
    color: var(--text);
    border: 2px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-clear-essay:hover { background: #e2e8f0; }
  .btn-help-essay {
    padding: 12px 24px;
    font-size: 16px;
    background: #dbeafe;
    color: var(--primary-dark);
    border: 2px solid #bfdbfe;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-help-essay:hover:not(:disabled) { background: #bfdbfe; }
  .btn-help-essay:disabled { background: #e2e8f0; border-color: #e2e8f0; cursor: not-allowed; }
  .btn-rate-essay {
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(135deg, var(--primary), #8b5cf6);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-rate-essay:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
  .btn-rate-essay:disabled { background: #cbd5e1; cursor: not-allowed; }

  .evaluation-panel {
    margin-top: 32px;
    padding: 32px;
    background: white;
    border-radius: 12px;
    border: 2px solid var(--border);
  }
  .eval-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--border);
  }
  .eval-header h3 { margin: 0; }
  .total-score {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 12px 24px;
    border-radius: 12px;
  }
  .total-score.passing { background: #f0fdf4; }
  .total-score.average { background: #fef3c7; }
  .total-score.failing { background: #fef2f2; }
  .score-value { font-size: 2rem; font-weight: 700; }
  .total-score.passing .score-value { color: var(--success); }
  .total-score.average .score-value { color: var(--warning); }
  .total-score.failing .score-value { color: var(--danger); }
  .score-max { font-size: 1rem; color: var(--text-muted); }

  .eval-categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .category-card { padding: 20px; background: #f8fafc; border-radius: 12px; }
  .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .category-name { font-weight: 600; color: var(--text); }
  .category-score { font-weight: 700; color: var(--primary); }
  .score-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
  .score-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #8b5cf6); border-radius: 4px; transition: width 0.5s ease; }
  .category-feedback { font-size: 14px; color: var(--text-muted); line-height: 1.5; margin: 0; }

  .mistakes-section, .advice-section { margin-bottom: 24px; }
  .mistakes-section h4, .advice-section h4 {
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--border);
  }
  .mistakes-list { display: flex; flex-direction: column; gap: 12px; }
  .mistake-item {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
    align-items: center;
    padding: 16px;
    background: #fef2f2;
    border-radius: 8px;
    border-left: 4px solid var(--danger);
  }
  .mistake-original { color: var(--danger); text-decoration: line-through; }
  .mistake-arrow { color: var(--text-muted); font-size: 1.25rem; }
  .mistake-correction { color: var(--success); font-weight: 500; }
  .mistake-explanation {
    grid-column: 1 / -1;
    font-size: 14px;
    color: var(--text-muted);
    padding-top: 8px;
    border-top: 1px solid #fecaca;
  }

  .advice-list {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .advice-list li { color: var(--text); line-height: 1.6; }

  @media (max-width: 640px) {
    .test-page { padding: 20px 12px; }
    .test-page h1 { font-size: 1.75rem; }
    .test-wrapper { padding: 20px; }
    .test-header { flex-direction: column; gap: 12px; text-align: center; }
    .controls { flex-direction: column; }
    .tf-options { flex-direction: column; }
    .eval-header { flex-direction: column; gap: 16px; }
    .mistake-item { grid-template-columns: 1fr; }
    .mistake-arrow { display: none; }
  }
`;

// ============== PAGE INITIALIZATION ==============
export function initTestPage(host: HTMLElement): void {
  const styleId = 'olympiad-test-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const saved = loadState();

  host.innerHTML = `
    <div class="test-page">
      <h1>📝 English Olympiad Trainer</h1>
      <p class="page-subtitle">Practice Reading, Use of English & Writing at B2-C1 level</p>
      
      <div class="controls-card">
        <div class="controls">
          <select id="task-type">
            <option value="reading">📖 Reading Comprehension</option>
            <option value="use-of-english">🔤 Use of English</option>
            <option value="essay">✍️ Essay Writing</option>
          </select>
          <button class="btn-generate" id="generate-btn">Start</button>
        </div>
      </div>

      <div id="test-area"></div>
    </div>
  `;

  const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
  const taskTypeSelect = document.getElementById('task-type') as HTMLSelectElement;
  const testArea = document.getElementById('test-area') as HTMLElement;

  // Restore saved test if exists
  if (saved) {
    new TestRenderer(saved.task, testArea, saved.answers);
    taskTypeSelect.value = saved.task.type;
  }

  // Check for saved essay draft
  const savedEssay = loadEssayDraft();
  if (savedEssay && !saved) {
    taskTypeSelect.value = 'essay';
    new EssayRenderer(testArea);
  }

  generateBtn.addEventListener('click', async () => {
    const taskType = taskTypeSelect.value;

    if (taskType === 'essay') {
      clearState();
      new EssayRenderer(testArea);
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    testArea.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Creating your personalized test...</p>
        <p style="font-size: 14px; opacity: 0.8;">This may take 10-20 seconds</p>
      </div>
    `;

    try {
      const task = await generateTask(taskType as 'reading' | 'use-of-english');
      saveState(task, {});
      new TestRenderer(task, testArea);
    } catch (error) {
      console.error('Error generating task:', error);
      testArea.innerHTML = `<div class="error">❌ ${error instanceof Error ? error.message : 'Failed to generate test. Please try again.'}</div>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Start';
    }
  });
}

// ============== REACT COMPONENT ==============
export default function GeneratedTestPage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    initTestPage(hostRef.current);
    return () => {
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
  }, []);

  return <div ref={hostRef} />;
}

