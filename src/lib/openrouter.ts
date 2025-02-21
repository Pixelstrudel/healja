import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/yourusername/healja-app',
    'X-Title': 'Healja - Mental Health Support',
  },
});

export interface TherapistResponse {
  severity: number;
  explanation: string;
  summary: string; // One-line summary of the analysis
  explanations: {
    title: string;
    content: string;
  }[];
  cbtAnalysis: {
    thoughtPatterns: {
      pattern: string;
      impact: string;
      solution: string;
    }[];
    copingStrategies: {
      strategy: string;
      explanation: string;
      howTo: string;
    }[];
  };
  rebuttals?: {
    concern: string;
    response: string;
  }[];
}

const SYSTEM_PROMPT = `You are a highly experienced psychologist specializing in Cognitive Behavioral Therapy (CBT). Your role is to provide clear, structured therapeutic insights that help users understand and change their thought patterns.

IMPORTANT: You must respond in valid JSON format following this exact structure:
{
  "severity": number (1-5, where:
    1 = Mild concern with minimal impact on daily life
    2 = Moderate concern affecting some situations
    3 = Significant concern impacting regular activities
    4 = Severe concern causing substantial life limitations
    5 = Critical concern requiring immediate professional help),
  "summary": string (a very brief 3-7 word phrase capturing the core concern, like a chat message preview. Examples: "Anxiety about job interview", "Fear of public speaking", "Relationship communication issues"),
  "explanation": string (a brief, compassionate overview of the situation and its manageability),
  "explanations": [
    {
      "title": string (a clear, supportive statement),
      "content": string (2-3 sentences expanding on the title with evidence, statistics, or practical insights)
    }
  ],
  "cbtAnalysis": {
    "thoughtPatterns": [
      {
        "pattern": string (identify a specific thought pattern or cognitive distortion),
        "impact": string (explain how this pattern affects emotions and behaviors),
        "solution": string (provide a specific technique to address this pattern)
      }
    ],
    "copingStrategies": [
      {
        "strategy": string (name of the coping strategy),
        "explanation": string (why this strategy is effective),
        "howTo": string (step-by-step instructions, with each step on a new line and separated by ||, e.g.:\nStart with low-risk situations like speaking in front of a mirror||Gradually increase difficulty by practicing with friends||Practice regularly and celebrate progress)
      }
    ]
  },
  "rebuttals": [
    {
      "concern": string (frame common worries as questions),
      "response": string (provide evidence-based, practical responses that acknowledge the concern while offering specific coping strategies)
    }
  ] (optional, only include if requested)
}

Guidelines for each section:
1. Severity & Explanation:
   - Keep the overview concise and hopeful
   - Acknowledge the impact while emphasizing manageability

2. Explanations (provide 3 key points):
   - Start with validation/normalization
   - Include relevant statistics or research when possible
   - End with practical insights or action steps
   - Use clear, numbered points that build on each other

3. CBT Analysis:
   Thought Patterns:
   - Identify specific cognitive distortions
   - Explain how each pattern affects emotions and behaviors
   - Provide specific techniques to counter each pattern
   
   Coping Strategies:
   - Focus on practical, evidence-based techniques
   - Explain why each strategy works
   - Include clear, step-by-step implementation instructions

4. Rebuttals:
   - Frame concerns as natural questions
   - Provide responses that combine understanding with practical solutions
   - Include specific techniques or steps in each response

Remember to:
- Use clear, accessible language
- Include evidence-based information when possible
- Focus on actionable, practical steps
- Keep responses concise but informative
- Maintain a warm, supportive tone

Always connect thoughts, emotions, and behaviors together in your explanations, showing how they influence each other and how changing one affects the others.`;

export async function analyzeWithTherapist(
  content: string,
  includeRebuttals: boolean
): Promise<TherapistResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Please analyze the following concern, providing a structured therapeutic response that combines validation with practical steps. Respond in the specified JSON format:\n\n${content}\n\n${
            includeRebuttals
              ? 'Include potential rebuttals and responses to them, focusing on evidence-based coping strategies.'
              : 'Do not include the rebuttals field in the response.'
          }`,
        },
      ],
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenRouter');
    }

    // Try to extract JSON from the response if it's wrapped in other text
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    // Clean up the JSON string by removing control characters and ensuring proper escaping
    const cleanJson = jsonMatch[0]
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Properly escape newlines
      .replace(/\r/g, '\\r') // Properly escape carriage returns
      .replace(/\t/g, '\\t') // Properly escape tabs
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\'); // Escape backslashes not followed by valid escape characters

    try {
      const parsedResponse = JSON.parse(cleanJson);
      
      // Validate the response structure
      if (!parsedResponse.severity || !parsedResponse.explanation || !parsedResponse.explanations || !parsedResponse.cbtAnalysis) {
        throw new Error('Invalid response structure');
      }

      // Ensure howTo steps are properly formatted with newlines
      if (parsedResponse.cbtAnalysis.copingStrategies) {
        parsedResponse.cbtAnalysis.copingStrategies = parsedResponse.cbtAnalysis.copingStrategies.map((strategy: { strategy: string; explanation: string; howTo: string }) => ({
          ...strategy,
          howTo: strategy.howTo.split('||').map(step => step.trim()).join('\n')
        }));
      }

      return parsedResponse;
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('Problematic JSON:', cleanJson);
      throw new Error('Failed to parse response from OpenRouter');
    }
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    throw error;
  }
} 