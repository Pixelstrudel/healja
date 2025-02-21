import { NextResponse } from 'next/server';
import { analyzeWithTherapist, transcribeAudio } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    let content = formData.get('content') as string;
    const audioBlob = formData.get('audio') as Blob | null;
    const includeRebuttals = formData.get('includeRebuttals') === 'true';

    console.log('Received request:', {
      hasContent: !!content,
      hasAudio: !!audioBlob,
      audioType: audioBlob?.type,
      audioSize: audioBlob?.size,
      includeRebuttals
    });

    // If audio is provided, transcribe it
    if (audioBlob) {
      try {
        console.log('Starting transcription...');
        const transcription = await transcribeAudio(audioBlob);
        console.log('Transcription successful:', transcription);

        // If no content was provided, return just the transcription
        if (!content) {
          return NextResponse.json({
            transcription: transcription.text
          });
        }

        // Otherwise, use the transcription for analysis
        content = transcription.text;
      } catch (error) {
        console.error('Transcription error details:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to transcribe audio. Please try again.' },
          { status: 500 }
        );
      }
    }

    // If no content for analysis, return error
    if (!content) {
      return NextResponse.json(
        { error: 'No content or audio provided' },
        { status: 400 }
      );
    }

    // Proceed with analysis
    try {
      console.log('Starting analysis with text:', content.substring(0, 100) + '...');
      const analysis = await analyzeWithTherapist(content, includeRebuttals);
      console.log('Analysis successful');
      return NextResponse.json({
        analysis,
        transcription: audioBlob ? content : null
      });
    } catch (error) {
      console.error('Analysis error details:', error);
      return NextResponse.json(
        { 
          error: 'Failed to analyze your concern. Please try again or rephrase your message.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request error details:', error);
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }
} 