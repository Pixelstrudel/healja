import { NextResponse } from 'next/server';
import { analyzeWithTherapist } from '@/lib/openrouter';

export async function POST(request: Request) {
  try {
    const { content, includeRebuttals } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    try {
      const analysis = await analyzeWithTherapist(content, includeRebuttals);
      return NextResponse.json(analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to analyze your concern. Please try again or rephrase your message.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
} 