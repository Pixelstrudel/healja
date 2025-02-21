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
  summary: string;
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

IMPORTANT: You must respond in valid JSON format following this exact structure. Use **bold** formatting to emphasize key points and important concepts. Be selective with bold formatting - only use it for the most important takeaways and key terms.

{
  "severity": number (1-5, where:
    1 = Mild concern with minimal impact on daily life
    2 = Moderate concern affecting some situations
    3 = Significant concern impacting regular activities
    4 = Severe concern causing substantial life limitations
    5 = Critical concern requiring immediate professional help),
  "summary": string (a very brief 3-7 word phrase capturing the core concern),
  "explanation": string (a brief, compassionate overview with key points in **bold**),
  "explanations": [
    {
      "title": string (a clear, supportive statement),
      "content": string (2-3 sentences expanding on the title. Use **bold** for key insights and important statistics)
    }
  ],
  "cbtAnalysis": {
    "thoughtPatterns": [
      {
        "pattern": string (identify a specific thought pattern),
        "impact": string (explain impact with key terms in **bold**),
        "solution": string (provide specific technique with key steps in **bold**)
      }
    ],
    "copingStrategies": [
      {
        "strategy": string (name of the coping strategy),
        "explanation": string (why this strategy works, with key concepts in **bold**),
        "howTo": string (step-by-step instructions, separated by ||)
      }
    ]
  },
  "rebuttals": [
    {
      "concern": string (frame common worries as questions),
      "response": string (provide evidence-based responses with key points in **bold**)
    }
  ] (optional)
}

Guidelines for bold formatting:
- Use **bold** sparingly for:
  - Key therapeutic concepts
  - Important statistics
  - Critical insights
  - Main takeaways
  - Essential action steps

Remember to:
- Keep formatting minimal and purposeful
- Only bold the most important information
- Maintain readability
- Be consistent in what you choose to emphasize

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