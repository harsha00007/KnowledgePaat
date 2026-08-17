import { InterviewType } from '@/lib/mockInterview';

export interface InterviewTrackConfig {
  id: InterviewType;
  title: string;
  shortDescription: string;
  fullDescription: string;
  questionCount: number;
  estimatedDuration: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  instructions: string[];
  sampleQuestions: {
    questionText: string;
    helperText: string;
  }[];
}

export const MOCK_INTERVIEW_TRACKS: Record<InterviewType, InterviewTrackConfig> = {
  hr: {
    id: 'hr',
    title: 'HR Interview',
    shortDescription: 'Test your communication, confidence, and behavioral responses.',
    fullDescription: 'Practice answering behavioral, situational, and culture-fit questions designed to test your communication skills, career aspirations, and workplace problem handling.',
    questionCount: 10,
    estimatedDuration: '20–25 mins',
    difficulty: 'Medium',
    instructions: [
      'Use the STAR framework (Situation, Task, Action, Result) for situational questions.',
      'Answer clearly and authentically with concrete examples from your projects or internships.',
      'Be concise yet detailed; aim for structured responses between 50 to 200 words.',
      'Your answers are saved automatically as you navigate between questions.',
      'Once submitted, your session will be locked and an evaluation report will be generated.'
    ],
    sampleQuestions: [
      {
        questionText: 'Tell me about yourself, your educational background, and your key technical interests.',
        helperText: 'Structure your answer with: Introduction -> Academic background -> Projects/Skills -> Career objective.'
      },
      {
        questionText: 'Why do you want to join our organization, and what value can you bring to our engineering team?',
        helperText: 'Highlight alignment with company values, eagerness to learn, and relevant hands-on skills.'
      },
      {
        questionText: 'Describe a challenging situation or project roadblock you faced and how you overcame it.',
        helperText: 'Use the STAR method: Describe the Situation, the Task, the Action you took, and the positive Result.'
      },
      {
        questionText: 'What are your greatest professional strengths, and what is one area you are actively trying to improve?',
        helperText: 'State a strength with an example, and a real weakness followed by steps you take to overcome it.'
      },
      {
        questionText: 'Tell me about a time you had to work with a difficult team member or resolved a project disagreement.',
        helperText: 'Focus on empathy, active listening, open communication, and reaching a win-win consensus.'
      },
      {
        questionText: 'How do you prioritize your daily tasks and handle strict deadlines when multiple deadlines coincide?',
        helperText: 'Explain your time management approach (e.g. Eisenhower Matrix, daily triage, proactive communication).'
      },
      {
        questionText: 'Where do you see yourself professionally in the next 3 to 5 years?',
        helperText: 'Discuss skill mastery, taking on technical mentorship, and delivering impactful software solutions.'
      },
      {
        questionText: 'Describe a mistake you made in an academic project or assignment and what lesson you learned from it.',
        helperText: 'Demonstrate accountability, what corrective action was taken, and how it improved your future workflow.'
      },
      {
        questionText: 'How do you keep yourself updated with rapidly evolving software technologies and industry trends?',
        helperText: 'Mention tech blogs, open-source repositories, developer communities, online courses, and personal projects.'
      },
      {
        questionText: 'Do you have any questions for the hiring team or anything specific you would like to know about our culture?',
        helperText: 'Demonstrate genuine curiosity about team mentorship, development stack, or engineering onboarding.'
      }
    ]
  },
  technical: {
    id: 'technical',
    title: 'Technical Interview',
    shortDescription: 'Test your programming, technical concepts, and problem-solving skills.',
    fullDescription: 'Practice technical problem solving, data structures, algorithms, database optimization, object-oriented concepts, and software system design principles.',
    questionCount: 10,
    estimatedDuration: '25–30 mins',
    difficulty: 'Medium',
    instructions: [
      'Explain your thought process step-by-step before stating the final solution.',
      'Mention edge cases, time complexity (Big-O), and space complexity where relevant.',
      'Write clean pseudocode or structured explanations for algorithmic questions.',
      'Auto-save keeps your code and explanations safe continuously.',
      'Review your solutions carefully before clicking final submission.'
    ],
    sampleQuestions: [
      {
        questionText: 'Explain the four core principles of Object-Oriented Programming (OOP) with real-world software examples.',
        helperText: 'Detail Encapsulation, Abstraction, Inheritance, and Polymorphism with real code/entity examples.'
      },
      {
        questionText: 'What is the difference between SQL and NoSQL databases? In what scenarios would you choose one over the other?',
        helperText: 'Compare ACID compliance, schema flexibility, vertical vs horizontal scaling, and query complexity.'
      },
      {
        questionText: 'Explain how indexing works in relational databases. What are B-Tree indexes and what are their trade-offs?',
        helperText: 'Discuss speed of read queries vs overhead on write/insert/update operations and disk space.'
      },
      {
        questionText: 'How would you detect a cycle in a singly linked list? Describe Floyd’s Tortoise and Hare algorithm and its complexities.',
        helperText: 'Explain the two-pointer approach, time complexity O(N), and auxiliary space complexity O(1).'
      },
      {
        questionText: 'Explain the difference between Synchronous and Asynchronous programming in JavaScript/Node.js or Python.',
        helperText: 'Discuss the Event Loop, Call Stack, Microtask queue, Promises, async/await, and non-blocking I/O.'
      },
      {
        questionText: 'What is RESTful API design? Explain idempotency and how GET, POST, PUT, PATCH, and DELETE verbs differ.',
        helperText: 'Define statelessness, standard HTTP status codes (200, 201, 400, 401, 404, 500), and idempotent methods.'
      },
      {
        questionText: 'Explain the concept of caching. What are the common cache invalidation strategies and eviction policies (e.g. LRU)?',
        helperText: 'Explain Redis/in-memory caching, Cache-Aside, Write-Through, and Least Recently Used (LRU) mechanism.'
      },
      {
        questionText: 'What is the difference between process and thread? What is concurrency vs parallelism?',
        helperText: 'Discuss shared memory space, context switching, CPU cores, race conditions, and synchronization locks.'
      },
      {
        questionText: 'Explain how HTTPS works. What happens under the hood during an SSL/TLS handshake?',
        helperText: 'Mention asymmetric vs symmetric encryption, public/private keys, Certificate Authorities, and session keys.'
      },
      {
        questionText: 'How would you design a URL shortener service (like bit.ly)? Outline key components, data model, and hashing logic.',
        helperText: 'Mention Base62 encoding, database schema (id, original_url, short_code), caching, and unique collisions.'
      }
    ]
  },
  managerial: {
    id: 'managerial',
    title: 'Managerial Interview',
    shortDescription: 'Test leadership, ownership, decision-making, and workplace scenarios.',
    fullDescription: 'Practice situational leadership, conflict management, cross-functional collaboration, risk mitigation, and engineering delivery accountability.',
    questionCount: 10,
    estimatedDuration: '20–25 mins',
    difficulty: 'Hard',
    instructions: [
      'Focus on accountability, business value, stakeholder communication, and team mentorship.',
      'Clearly describe trade-offs between delivery speed, technical debt, and product quality.',
      'Show structured decision-making under ambiguous or high-pressure situations.',
      'All responses are auto-saved in your session.'
    ],
    sampleQuestions: [
      {
        questionText: 'Describe a project where you took full ownership from planning to deployment. What went well and what would you improve?',
        helperText: 'Demonstrate end-to-end responsibility, proactive milestone tracking, and post-mortem reflections.'
      },
      {
        questionText: 'How do you handle conflicting requirements between product management deadlines and technical code quality/refactoring?',
        helperText: 'Explain risk assessment, MVP scoping, addressing high-priority technical debt, and transparent negotiation.'
      },
      {
        questionText: 'Tell me about a time a project was falling behind schedule. How did you identify the bottleneck and realign delivery?',
        helperText: 'Discuss root-cause analysis, de-scoping non-critical features, team pairing, and stakeholder updates.'
      },
      {
        questionText: 'How do you provide constructive feedback to a peer whose low code quality is causing production bugs?',
        helperText: 'Emphasize private, empathetic communication, focusing on facts/code standards, and offering pairing help.'
      },
      {
        questionText: 'Describe a situation where you had to make a critical technical decision with incomplete information.',
        helperText: 'Discuss risk mitigation, fallback strategies, consulting domain experts, and rapid prototyping.'
      },
      {
        questionText: 'How do you foster an inclusive and productive culture when collaborating with cross-functional or remote teams?',
        helperText: 'Mention clear documentation, asynchronous communication, celebrating milestones, and psychological safety.'
      },
      {
        questionText: 'What is your approach to mentoring junior engineers or onboarding new teammates into a complex codebase?',
        helperText: 'Outline structured starter tasks, comprehensive documentation, architecture walkthroughs, and pair programming.'
      },
      {
        questionText: 'How do you manage personal stress and maintain team morale during high-stakes production outages or tight delivery cycles?',
        helperText: 'Focus on calm leadership, incident command procedures, blameless post-mortems, and team support.'
      },
      {
        questionText: 'Describe a time you advocated for a process improvement or modern architectural change that was initially met with resistance.',
        helperText: 'Explain gathering performance metrics, building a proof-of-concept, and demonstrating tangible business value.'
      },
      {
        questionText: 'How do you measure the success and impact of a software feature after it has been shipped to end users?',
        helperText: 'Discuss user engagement metrics, error rates, system latency, user feedback loops, and business KPIs.'
      }
    ]
  }
};
