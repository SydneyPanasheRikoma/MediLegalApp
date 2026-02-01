/* ============================================
   MediLegal AI - Chatbot Logic
   ============================================ */

// ==========================================
// STATE MANAGEMENT
// ==========================================

const AppState = {
    selectedRole: null, // 'doctor' or 'patient'
    messages: [], // { id, sender, content, timestamp }
    messageCount: 0, // For unique message IDs
    initialPromptShown: false, // Track if initial prompt has been shown
    currentNodeId: null, // Current decision tree node
    flowCompleted: false // Track if guided flow is finished
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const roleSection = document.getElementById('roleSection');
const chatSection = document.getElementById('chatSection');
const doctorBtn = document.querySelector('.doctor-btn');
const patientBtn = document.querySelector('.patient-btn');
const messagesContainer = document.getElementById('messagesContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');
const clearBtn = document.getElementById('clearBtn');
const changeRoleBtn = document.getElementById('changeRoleBtn');
const currentRoleDisplay = document.getElementById('currentRole');

// ==========================================
// EVENT LISTENERS
// ==========================================

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Role selection buttons
    doctorBtn.addEventListener('click', () => selectRole('doctor'));
    patientBtn.addEventListener('click', () => selectRole('patient'));

    // Chat input
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // Guided yes/no buttons
    yesBtn.addEventListener('click', () => submitGuidedAnswer('yes'));
    noBtn.addEventListener('click', () => submitGuidedAnswer('no'));

    // Clear chat button
    clearBtn.addEventListener('click', clearChat);

    // Change role button
    changeRoleBtn.addEventListener('click', changeRole);
}

// ==========================================
// ROLE SELECTION LOGIC
// ==========================================

/**
 * Handle role selection
 * @param {string} role - 'doctor' or 'patient'
 */
function selectRole(role) {
    AppState.selectedRole = role;
    AppState.messages = [];
    AppState.messageCount = 0;
    AppState.initialPromptShown = false;
    AppState.currentNodeId = null;
    AppState.flowCompleted = false;

    // Update UI
    updateRoleButtonStates(role);
    roleSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    currentRoleDisplay.textContent = role === 'doctor' ? 'Doctor' : 'Patient';

    // Clear previous messages
    messagesContainer.innerHTML = '';

    // Enable input
    userInput.disabled = false;
    sendBtn.disabled = false;
    yesBtn.disabled = false;
    noBtn.disabled = false;

    // Show initial prompt
    showInitialPrompt();

    // Focus on input
    userInput.focus();
}

/**
 * Update visual state of role buttons
 * @param {string} activeRole - 'doctor' or 'patient'
 */
function updateRoleButtonStates(activeRole) {
    doctorBtn.classList.toggle('active', activeRole === 'doctor');
    patientBtn.classList.toggle('active', activeRole === 'patient');
}

/**
 * Change role - return to role selection
 */
function changeRole() {
    AppState.selectedRole = null;
    AppState.currentNodeId = null;
    AppState.flowCompleted = false;
    roleSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
    messagesContainer.innerHTML = '';
    userInput.value = '';
    yesBtn.disabled = true;
    noBtn.disabled = true;
    updateRoleButtonStates(null);
}

// ==========================================
// MESSAGING LOGIC
// ==========================================

/**
 * Display initial prompt from chatbot
 */
function showInitialPrompt() {
    if (!AppState.initialPromptShown) {
        addMessage(
            'I will guide you with yes/no questions to give focused medical-legal information. Please answer using the Yes/No buttons or type “yes” or “no”.',
            'bot'
        );
        startGuidedFlow();
        AppState.initialPromptShown = true;
    }
}

/**
 * Send user message and advance guided flow
 */
function sendMessage() {
    const message = userInput.value.trim();

    if (!message) return;

    if (AppState.flowCompleted) {
        addMessage('The guided flow is complete. Click “Clear Chat” to start over.', 'bot');
        userInput.value = '';
        userInput.focus();
        return;
    }

    const normalized = normalizeYesNo(message);
    if (!normalized) {
        addMessage('Please answer with “yes” or “no”.', 'bot');
        userInput.value = '';
        userInput.focus();
        return;
    }

    // Add user message
    addMessage(normalized, 'user');
    userInput.value = '';

    handleGuidedAnswer(normalized);
}

// ==========================================
// GUIDED DECISION TREE
// ==========================================

const decisionTrees = {
    doctor: {
        start: 'd1',
        nodes: {
            d1: {
                question: 'Is there an immediate patient safety risk or emergency?',
                yes: 'd2',
                no: 'd3'
            },
            d2: {
                question: 'Have you activated emergency protocols or called emergency services?',
                yes: 'd2y',
                no: 'd2n'
            },
            d2y: {
                guidance: {
                    title: 'Emergency actions underway',
                    risk: 'high',
                    bullets: [
                        'Continue stabilizing the patient and document all actions',
                        'Notify appropriate supervisors and follow incident procedures',
                        'Preserve all clinical records and communications'
                    ],
                    nextSteps: [
                        'Complete required incident reports',
                        'Consult institutional legal/risk teams if needed',
                        'Follow up with the patient and family per policy'
                    ]
                }
            },
            d2n: {
                guidance: {
                    title: 'Urgent safety response needed',
                    risk: 'high',
                    bullets: [
                        'Patient safety is the first priority',
                        'Activate emergency protocols immediately',
                        'Document the timeline of events clearly'
                    ],
                    nextSteps: [
                        'Call emergency services or rapid response',
                        'Inform leadership and risk management',
                        'Document all clinical decisions and actions'
                    ]
                }
            },
            d3: {
                question: 'Is your concern mainly about informed consent or documentation?',
                yes: 'd4',
                no: 'd5'
            },
            d4: {
                question: 'Was consent obtained and documented before the procedure?',
                yes: 'd4y',
                no: 'd4n'
            },
            d4y: {
                guidance: {
                    title: 'Consent documentation review',
                    risk: 'medium',
                    bullets: [
                        'Confirm consent covered risks, benefits, and alternatives',
                        'Ensure documentation is complete and time-stamped',
                        'Verify patient understanding was noted'
                    ],
                    nextSteps: [
                        'Audit consent forms for completeness',
                        'Address gaps with supplemental documentation',
                        'Consult legal/risk for complex cases'
                    ]
                }
            },
            d4n: {
                guidance: {
                    title: 'Potential consent risk',
                    risk: 'high',
                    bullets: [
                        'Lack of documented consent increases liability risk',
                        'Document the clinical rationale and timeline',
                        'Seek guidance from legal/risk management'
                    ],
                    nextSteps: [
                        'Notify your supervisor or compliance lead',
                        'Document any patient communications',
                        'Consult a healthcare attorney if needed'
                    ]
                }
            },
            d5: {
                question: 'Is there a complaint, adverse event, or potential liability issue?',
                yes: 'd5y',
                no: 'd5n'
            },
            d5y: {
                guidance: {
                    title: 'Potential liability issue',
                    risk: 'high',
                    bullets: [
                        'Preserve records and communications',
                        'Follow institutional incident reporting',
                        'Avoid speculation or blame in notes'
                    ],
                    nextSteps: [
                        'Notify malpractice insurer if required',
                        'Consult legal/risk management',
                        'Document objective facts only'
                    ]
                }
            },
            d5n: {
                guidance: {
                    title: 'General compliance guidance',
                    risk: 'low',
                    bullets: [
                        'Maintain accurate records and follow policies',
                        'Use standardized consent and documentation workflows',
                        'Stay current on regulatory updates'
                    ],
                    nextSteps: [
                        'Review institutional protocols',
                        'Schedule training if needed',
                        'Consult legal for complex scenarios'
                    ]
                }
            }
        }
    },
    patient: {
        start: 'p1',
        nodes: {
            p1: {
                question: 'Is someone in immediate danger or a medical emergency?',
                yes: 'p2',
                no: 'p3'
            },
            p2: {
                guidance: {
                    title: 'Emergency response',
                    risk: 'high',
                    bullets: [
                        'Seek emergency medical care immediately',
                        'Call local emergency services',
                        'If safe, stay with the patient'
                    ],
                    nextSteps: [
                        'Call emergency services now',
                        'Provide key symptoms and location details',
                        'Follow instructions from responders'
                    ]
                }
            },
            p3: {
                question: 'Is your concern about informed consent or understanding treatment?',
                yes: 'p4',
                no: 'p5'
            },
            p4: {
                question: 'Were risks, benefits, and alternatives clearly explained to you?',
                yes: 'p4y',
                no: 'p4n'
            },
            p4y: {
                guidance: {
                    title: 'Clarify and document your understanding',
                    risk: 'medium',
                    bullets: [
                        'Request written materials or visit summaries',
                        'Ask follow-up questions in plain language',
                        'Keep copies of consent forms'
                    ],
                    nextSteps: [
                        'Request copies of your records',
                        'Write down remaining questions',
                        'Consider a second opinion if unsure'
                    ]
                }
            },
            p4n: {
                guidance: {
                    title: 'Possible informed consent concern',
                    risk: 'high',
                    bullets: [
                        'You have a right to understand your care',
                        'Ask for a clear explanation of risks/alternatives',
                        'Document what was explained and when'
                    ],
                    nextSteps: [
                        'Contact the provider to discuss concerns',
                        'Request your medical records',
                        'Consult a patient advocate or attorney if needed'
                    ]
                }
            },
            p5: {
                question: 'Is the issue about billing, insurance, or costs?',
                yes: 'p5y',
                no: 'p6'
            },
            p5y: {
                guidance: {
                    title: 'Billing or insurance concerns',
                    risk: 'medium',
                    bullets: [
                        'Request an itemized bill',
                        'Ask for a written explanation of charges',
                        'Document all communications with insurers'
                    ],
                    nextSteps: [
                        'Contact your insurer for coverage details',
                        'Ask the provider about financial assistance',
                        'Escalate to a billing advocate if needed'
                    ]
                }
            },
            p6: {
                guidance: {
                    title: 'General patient rights guidance',
                    risk: 'low',
                    bullets: [
                        'You can request and review your medical records',
                        'You can ask for a second opinion',
                        'You may file a complaint with the facility'
                    ],
                    nextSteps: [
                        'Write a timeline of events and concerns',
                        'Contact a patient advocate if available',
                        'Seek legal advice for complex situations'
                    ]
                }
            }
        }
    }
};

function normalizeYesNo(text) {
    const value = text.trim().toLowerCase();
    if (['yes', 'y', 'yeah', 'yep'].includes(value)) return 'Yes';
    if (['no', 'n', 'nope'].includes(value)) return 'No';
    return null;
}

function startGuidedFlow() {
    const tree = decisionTrees[AppState.selectedRole] || decisionTrees.patient;
    AppState.currentNodeId = tree.start;
    AppState.flowCompleted = false;
    showQuestion(tree.nodes[AppState.currentNodeId]);
}

function submitGuidedAnswer(answer) {
    if (!AppState.selectedRole) return;
    if (AppState.flowCompleted) {
        addMessage('The guided flow is complete. Click “Clear Chat” to start over.', 'bot');
        return;
    }

    const normalized = normalizeYesNo(answer);
    if (!normalized) {
        addMessage('Please answer with “yes” or “no”.', 'bot');
        return;
    }

    addMessage(normalized, 'user');
    handleGuidedAnswer(normalized);
}

function handleGuidedAnswer(answer) {
    const tree = decisionTrees[AppState.selectedRole] || decisionTrees.patient;
    const node = tree.nodes[AppState.currentNodeId];

    if (!node) {
        addMessage('Something went wrong. Please clear the chat and try again.', 'bot');
        return;
    }

    const isYes = answer.toLowerCase() === 'yes';
    const nextId = isYes ? node.yes : node.no;

    if (!nextId) {
        AppState.flowCompleted = true;
        showGuidance(node.guidance);
        return;
    }

    const nextNode = tree.nodes[nextId];
    AppState.currentNodeId = nextId;

    if (nextNode && nextNode.guidance && !nextNode.question) {
        AppState.flowCompleted = true;
        showGuidance(nextNode.guidance);
        return;
    }

    showQuestion(nextNode);
}

function showQuestion(node) {
    if (!node || !node.question) return;
    const content = `
        <div class="bot-response">
            <div class="response-section">
                <div class="response-section-title">❓ Question</div>
                <div class="response-section-content">${escapeHtml(node.question)}</div>
            </div>
            <div class="response-section">
                <div class="response-section-content"><strong>Answer:</strong> Yes or No.</div>
            </div>
        </div>
    `;
    addMessage(content, 'bot');
}

function showGuidance(guidance) {
    if (!guidance) {
        addMessage('No guidance available. Please clear the chat and try again.', 'bot');
        return;
    }

    const riskBadge = getRiskBadge(guidance.risk);
    const bullets = guidance.bullets
        .map(item => `<li class="list-item">${escapeHtml(item)}</li>`)
        .join('');
    const nextSteps = guidance.nextSteps
        .map(item => `<li class="list-item">${escapeHtml(item)}</li>`)
        .join('');

    const content = `
        <div class="bot-response">
            <div class="response-section">
                <div class="response-section-title">📋 Guidance</div>
                <div class="response-section-content">${escapeHtml(guidance.title)}</div>
            </div>
            <div class="response-section">
                <div class="response-section-title">🎯 Risk Level</div>
                <div class="response-section-content">${riskBadge}</div>
            </div>
            <div class="response-section">
                <div class="response-section-title">✅ Key Points</div>
                <div class="response-section-content"><ul style="margin: 0; padding-left: 0;">${bullets}</ul></div>
            </div>
            <div class="response-section">
                <div class="response-section-title">🔍 Next Steps</div>
                <div class="response-section-content"><ul style="margin: 0; padding-left: 0;">${nextSteps}</ul></div>
            </div>
            <div class="response-section">
                <div class="response-section-content"><strong>⚠️ This is legal information, not legal advice. Consult a qualified professional for your situation.</strong></div>
            </div>
        </div>
    `;

    addMessage(content, 'bot');
}

function getRiskBadge(level) {
    const normalized = (level || 'medium').toLowerCase();
    if (normalized === 'high') {
        return '<span class="risk-badge high">🔴 High Risk</span>';
    }
    if (normalized === 'low') {
        return '<span class="risk-badge low">🟢 Low Risk</span>';
    }
    return '<span class="risk-badge medium">⚠️ Medium Risk</span>';
}

/**
 * Add message to chat
 * @param {string} content - Message content
 * @param {string} sender - 'user' or 'bot'
 */
function addMessage(content, sender) {
    const messageId = `msg-${++AppState.messageCount}`;
    const timestamp = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const messageObj = {
        id: messageId,
        sender: sender,
        content: content,
        timestamp: timestamp
    };

    AppState.messages.push(messageObj);

    // Create message element
    const messageEl = createMessageElement(messageObj);
    messagesContainer.appendChild(messageEl);

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Create message DOM element
 * @param {Object} messageObj - Message object
 * @returns {HTMLElement}
 */
function createMessageElement(messageObj) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${messageObj.sender}`;
    messageDiv.id = messageObj.id;

    if (messageObj.sender === 'bot') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = messageObj.content;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
    } else {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = escapeHtml(messageObj.content);

        messageDiv.appendChild(contentDiv);
    }

    return messageDiv;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Clear all chat messages
 */
function clearChat() {
    if (confirm('Are you sure you want to clear all messages?')) {
        AppState.messages = [];
        AppState.messageCount = 0;
        AppState.initialPromptShown = false;
        AppState.currentNodeId = null;
        AppState.flowCompleted = false;
        messagesContainer.innerHTML = '';
        userInput.value = '';
        showInitialPrompt();
        userInput.focus();
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('MediLegal AI Chatbot initialized');
    initializeEventListeners();

    // Ensure proper initial state
    roleSection.classList.remove('hidden');
    chatSection.classList.add('hidden');
    yesBtn.disabled = true;
    noBtn.disabled = true;
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
