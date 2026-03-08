'use strict';

/**
 * Smart Intent Detector
 * 
 * Classifies a user's message as one of:
 *   - greeting      → "hi", "hello", "hey", etc.
 *   - thanks        → "thanks", "great", "awesome", etc.
 *   - help          → "help", "what can you do", "commands"
 *   - identity      → "who are you", "what are you"
 *   - farewell      → "bye", "goodbye"
 *   - smalltalk     → "how are you", "what's up" (casual, not research)
 *   - research      → anything that looks like a real query/topic
 * 
 * Non-research intents return an instant `reply` string.
 * Research intent returns null reply → caller should queue the research job.
 */

// ─── Patterns ────────────────────────────────────────────────────────────────

const PATTERNS = {
  greeting: /^(h+e+l+o+|h+i+|hey+|hiya|howdy|yo+|hola|namaste|salut|bonjour|ciao|good\s*(morning|afternoon|evening|night|day)|greetings|what'?s?\s*up|sup|waddup|whats+up)\s*[!?.😊👋]*$/i,
  thanks: /^(thanks?\.?|thank\s*you\.?|thx|ty|cheers|appreciate\s*(it|that)|great(ly)?|nice|cool|awesome|wonderful|amazing|brilliant|perfect|got\s*it|understood|makes?\s*sense|ok+ay?\.?|sure|noted)\s*[!?.]*$/i,
  help: /^(help|commands?|what\s+can\s+you\s+do|how\s+does?\s+this\s+work|usage|guide|menu|features?|options?|show\s+me\s+what\s+you\s+can\s+do|how\s+to\s+use|instructions?)\s*[!?.]*$/i,
  identity: /^(who\s+are\s+you|what\s+are\s+you|your\s+name|tell\s+me\s+about\s+you(rself)?|about\s+(you|this\s+(app|system|platform|assistant|bot))|what\s+is\s+this)\s*[!?.]*$/i,
  farewell: /^(bye+|goodbye|good\s*bye|see\s*ya|later|cya|take\s*care|farewell|exit|quit|adios)\s*[!?.]*$/i,
  smalltalk: /^(how\s+are\s+(you|things?)|you\s+ok|all\s+good|what'?s?\s*(new|going\s*on)|how'?s?\s+(it\s+going|life|things?)|nice\s+to\s+meet|good\s+to\s+be\s+here|i'?m\s+(back|here|ready)|are\s+you\s+(there|ready|awake|alive))\s*[!?.]*$/i,
};

// ─── Response Templates ───────────────────────────────────────────────────────

function greetingReply(name) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const greets = [
    `Good ${timeOfDay}, ${name}! 👋 Ready to help you dive into some research. What topic would you like to explore today?`,
    `Hello, ${name}! 😊 I'm your AI research assistant powered by 20+ specialized agents. Drop a topic or question and I'll get started!`,
    `Hey ${name}! Great to see you. I can research any topic in depth — just type your question or use **/research**, **/deepresearch**, or **/gatherdata**.`,
    `Hi ${name}! 👋 The research engines are warm and ready. What would you like to investigate today?`,
  ];
  return greets[Math.floor(Math.random() * greets.length)];
}

function thanksReply(name) {
  const replies = [
    `You're welcome, ${name}! Feel free to ask another question anytime. 🙂`,
    `Happy to help, ${name}! Got another topic in mind? Just type it and I'll run the research.`,
    `Anytime, ${name}! Research is what I do best — ask away whenever you're ready. 📚`,
    `Glad that helped, ${name}! What would you like to explore next?`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function helpReply(name) {
  return `**Your Research Assistant Commands, ${name}:**

📌 **Just type anything** — I'll automatically run a standard research on it.

Or use slash commands for specific modes:

| Command | Mode | Description |
|---|---|---|
| \`/research [topic]\` | Standard | Faster, concise overview |
| \`/deepresearch [topic]\` | Deep | Thorough multi-source analysis |
| \`/gatherdata [topic]\` | Gather | Sources & raw data only, no report |

**Examples:**
- \`What are the latest breakthroughs in quantum computing?\`
- \`/deepresearch CRISPR gene editing mechanisms\`
- \`/gatherdata climate change datasets 2024\`

Once research completes, switch to the **Report**, **Sources**, or **Raw Data** tabs on the right panel. You can also chat with the results using the **AI Chat** tab. 💬`;
}

function identityReply(name) {
  return `I'm the **Deep Research AI Assistant**, ${name}! 🤖

I'm built on a multi-agent pipeline with 20+ specialized agents working in parallel:

🔍 **Discovery** — Topic analysis, domain intelligence
📚 **Review** — Systematic literature review, historical review  
🌐 **Scraping** — Web scraping, data collection, news feeds
🧩 **Synthesis** — Gap analysis, innovation proposals
🔬 **Verification** — Fact checking, bias detection, technical review
📋 **Reporting** — Scientific writing, LaTeX generation, quality scoring
💬 **Chatbot** — That's me! Interactive Q&A about your research

Just type any research question and I'll orchestrate all these agents to deliver a comprehensive, source-backed report. What would you like to research today?`;
}

function farewellReply(name) {
  const replies = [
    `Goodbye, ${name}! Your research sessions are saved and ready whenever you return. 👋`,
    `See you later, ${name}! All your research is safely stored. Come back anytime. 🚀`,
    `Take care, ${name}! Your workspace will be here waiting for you. 📚`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function smalltalkReply(name) {
  const replies = [
    `I'm doing great, ${name}! Fully operational and ready to research just about anything. What topic can I help you explore? 🔬`,
    `All systems go, ${name}! 20+ agents standing by. What shall we research today?`,
    `Ready and waiting, ${name}! I don't get tired — research is my favorite thing to do. What's your question?`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

// ─── Main Classifier ─────────────────────────────────────────────────────────

/**
 * @param {string} message
 * @param {string} userName
 * @returns {{ intent: string, reply: string|null, isResearch: boolean }}
 */
function detectIntent(message, userName = 'there') {
  const name = userName && userName !== 'there' ? userName.split(' ')[0] : 'there';
  const trimmed = (message || '').trim();

  // Short messages (≤3 words) are likely not research queries
  const wordCount = trimmed.split(/\s+/).length;

  if (PATTERNS.greeting.test(trimmed)) {
    return { intent: 'greeting', reply: greetingReply(name), isResearch: false };
  }
  if (PATTERNS.farewell.test(trimmed)) {
    return { intent: 'farewell', reply: farewellReply(name), isResearch: false };
  }
  if (PATTERNS.thanks.test(trimmed)) {
    return { intent: 'thanks', reply: thanksReply(name), isResearch: false };
  }
  if (PATTERNS.help.test(trimmed)) {
    return { intent: 'help', reply: helpReply(name), isResearch: false };
  }
  if (PATTERNS.identity.test(trimmed)) {
    return { intent: 'identity', reply: identityReply(name), isResearch: false };
  }
  if (PATTERNS.smalltalk.test(trimmed)) {
    return { intent: 'smalltalk', reply: smalltalkReply(name), isResearch: false };
  }

  // Very short messages that don't match patterns — likely typos or casual
  if (wordCount === 1 && trimmed.length <= 6 && /^[a-z]+$/i.test(trimmed)) {
    // Single short word that isn't a research topic
    return {
      intent: 'unclear',
      reply: `Hey ${name}! I didn't quite catch that — are you looking for something specific? Try asking a research question or use **/help** to see available commands. 😊`,
      isResearch: false,
    };
  }

  // Everything else is treated as a research query
  return { intent: 'research', reply: null, isResearch: true };
}

module.exports = { detectIntent };
