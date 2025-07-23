'use server';

/**
 * @fileOverview Clock-in verification flow using facial recognition and geolocation.
 *
 * - verifyClockIn - A function that handles the clock-in verification process.
 * - VerifyClockInInput - The input type for the verifyClockIn function.
 * - VerifyClockInOutput - The return type for the verifyClockIn function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const LocationSchema = z.union([
    z.object({
        latitude: z.number().describe('The latitude of the employee.'),
        longitude: z.number().describe('The longitude of the employee.'),
    }).describe('The current GPS location of the employee.'),
    z.string().describe("A manually entered location string (e.g., 'Main Office').")
]);

const VerifyClockInInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A selfie photo of the employee as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  currentLocation: LocationSchema,
  employeeName: z.string().describe('The name of the employee clocking in.'),
});
export type VerifyClockInInput = z.infer<typeof VerifyClockInInputSchema>;

const VerificationResultSchema = z.object({
  isVerified: z.boolean().describe('Whether or not the employee is verified.'),
  confidenceLevel: z.number().describe('The confidence level of the verification (0-1).'),
  message: z.string().describe('A message describing the verification result.'),
});

const VerifyClockInOutputSchema = z.object({
  verificationResult: VerificationResultSchema,
  audioFeedback: z.string().describe('Audio feedback based on the verification result, as a data URI.'),
});
export type VerifyClockInOutput = z.infer<typeof VerifyClockInOutputSchema>;

export async function verifyClockIn(input: VerifyClockInInput): Promise<VerifyClockInOutput> {
  return verifyClockInFlow(input);
}

const verificationPrompt = ai.definePrompt({
  name: 'verificationPrompt',
  input: {schema: VerifyClockInInputSchema},
  output: {schema: z.object({ verificationResult: VerificationResultSchema })},
  prompt: `You are an AI assistant specializing in employee clock-in verification.

Your task is to analyze the provided selfie to ensure it's a valid photo for clocking in. You are NOT performing a biometric comparison against a database, but rather checking the quality and authenticity of the image itself.

Focus on these checks:
1.  **Image Quality:** Is the photo clear and not excessively blurry?
2.  **Liveness:** Does it look like a live photo of a person? Check for signs it might be a photo of a screen, another picture, or a non-human subject.
3.  **Face Presence:** Is there a clear face visible in the photo?

The employee's name is '{{{employeeName}}}'. Use this name for the output message, but DO NOT use it to make any assumptions about the person in the photo (like gender).

Based on your analysis, determine if the verification is successful. The verification should only fail if there are clear signs of fraud or a very poor quality image as described above.

Here is the employee's information:
Employee Name: {{{employeeName}}}
Selfie: {{media url=photoDataUri}}
Location: {{#if currentLocation.latitude}}Latitude: {{{currentLocation.latitude}}}, Longitude: {{{currentLocation.longitude}}}{{else}}{{{currentLocation}}}{{/if}}

Return your response in the following JSON format:
{{output}}
  `,
});

async function toWav(
    pcmData: Buffer,
    channels = 1,
    rate = 24000,
    sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const verifyClockInFlow = ai.defineFlow(
  {
    name: 'verifyClockInFlow',
    inputSchema: VerifyClockInInputSchema,
    outputSchema: VerifyClockInOutputSchema,
  },
  async input => {
    const {output} = await verificationPrompt(input);

    if (!output) {
      throw new Error("Verification prompt failed to return output.");
    }
    
    const verificationResult = output.verificationResult;

    // Generate audio feedback based on the verification result
    let feedbackText = '';
    if (verificationResult.isVerified) {
      feedbackText = `Clock-in verified for ${input.employeeName}. Welcome!`;
    } else {
      feedbackText = `Clock-in failed for ${input.employeeName}. Please try again.`;
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: feedbackText,
    });

    if (!media) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
    );

    const audioFeedback = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

    return {
      verificationResult: verificationResult,
      audioFeedback: audioFeedback,
    };
  }
);
