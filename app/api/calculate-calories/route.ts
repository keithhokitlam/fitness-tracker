import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { APIError } from 'openai';

// Ensure this route runs on the Node.js runtime (not Edge)
export const runtime = 'nodejs';

// Simple GET to verify the route is reachable
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workoutType, duration, runningPace, weight, weightUnit } = body;

    // Validate input
    if (!workoutType || !duration) {
      return NextResponse.json(
        { error: 'Workout type and duration are required' },
        { status: 400 }
      );
    }

    const durationNum = parseFloat(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive number' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Check if API key starts correctly (basic validation)
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid API key format. OpenAI API keys should start with "sk-".' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client only after validating the API key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a prompt for OpenAI to calculate calories
    const isRunning = workoutType.toLowerCase() === 'run' || workoutType.toLowerCase() === 'running';
    const paceInfo = isRunning && runningPace ? `\nRunning Pace: ${runningPace} (in min/km format)` : '';
    
    // Handle weight - convert to kg for calculation
    let weightInfo = '';
    let weightForCalculation = '';
    if (weight) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum) && weightNum > 0) {
        const unit = weightUnit || 'kg';
        if (unit === 'lbs') {
          // Convert lbs to kg
          const weightKg = weightNum * 0.453592;
          weightInfo = `\nWeight: ${weightNum} lbs (${weightKg.toFixed(1)} kg)`;
          weightForCalculation = weightKg.toFixed(1) + ' kg';
        } else {
          // Already in kg
          weightInfo = `\nWeight: ${weightNum} kg`;
          weightForCalculation = weightNum + ' kg';
        }
      }
    }
    
    // Extract pace number for calculation guidance
    let paceGuidance = '';
    if (isRunning && runningPace) {
      const paceMatch = runningPace.match(/(\d+\.?\d*)/);
      if (paceMatch) {
        const paceNum = parseFloat(paceMatch[1]);
        paceGuidance = `\n\nIMPORTANT: The pace is ${paceNum} min/km. 
- A pace of ${paceNum} min/km means the runner covers 1 kilometer in ${paceNum} minutes.
- FASTER paces (LOWER min/km numbers) = HIGHER intensity = MORE calories burned per minute.
- For example: 5 min/km burns MORE calories than 7 min/km for the same duration.
- Calculate calories based on this intensity level. A ${paceNum} min/km pace is ${paceNum <= 5 ? 'very fast/high intensity' : paceNum <= 6 ? 'fast/moderate-high intensity' : paceNum <= 7 ? 'moderate intensity' : 'slow/moderate-low intensity'}.`;
      }
    }
    
    const prompt = `Calculate the approximate number of calories burned for the following workout:
    
Workout Type: ${workoutType}
Duration: ${durationNum} minutes${paceInfo}${weightInfo}${paceGuidance}

Please provide:
1. The estimated number of calories burned (as a single number, no text)
2. A brief explanation (1-2 sentences) of how you calculated this

${weightForCalculation ? `Use the person's weight of ${weightForCalculation} to calculate calories. Heavier people burn more calories for the same activity.` : 'Assume an average adult (weighing approximately 70kg/154lbs) performing this activity.'} ${isRunning && runningPace ? `Use the running pace to determine intensity. Remember: LOWER min/km = FASTER pace = MORE calories per minute. A ${runningPace} pace should result in higher calorie burn than a slower pace for the same duration.` : 'Use moderate intensity unless otherwise specified.'}

Format your response as JSON with this structure:
{
  "calories": <number>,
  "explanation": "<brief explanation>"
}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using a cost-effective model
      messages: [
        {
          role: 'system',
          content: 'You are a fitness expert that calculates calories burned for workouts. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    let result;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract the number from the response
      const caloriesMatch = responseContent.match(/\d+/);
      if (caloriesMatch) {
        result = {
          calories: parseInt(caloriesMatch[0]),
          explanation: responseContent,
        };
      } else {
        throw new Error('Could not parse OpenAI response');
      }
    }

    // Validate the result
    if (!result.calories || isNaN(result.calories)) {
      throw new Error('Invalid calorie calculation from OpenAI');
    }

    return NextResponse.json({
      calories: Math.round(result.calories),
      explanation: result.explanation || 'Calories calculated based on workout type and duration.',
      workoutType,
      duration: durationNum,
    });
  } catch (error: any) {
    console.error('Error calculating calories:', error);
    
    // Handle OpenAI-specific errors
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: `OpenAI API error: ${error.message}`,
          details: error.code ? `Error code: ${error.code}` : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to calculate calories. Please try again.' },
      { status: 500 }
    );
  }
}
