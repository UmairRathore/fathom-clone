import { z } from "zod";
export const MAX_BYTES = 24_000_000;
export const MAX_SECONDS = 300;
export const acceptedFiles: Record<string, string[]> = {
  mp4: ["video/mp4", "audio/mp4"],
  webm: ["video/webm", "audio/webm"],
  mp3: ["audio/mpeg", "audio/mp3"],
  m4a: ["audio/mp4", "audio/x-m4a"],
  wav: ["audio/wav", "audio/x-wav", "audio/wave"],
};
export const uploadSchema = z
  .object({
    requestKey: z.uuid(),
    title: z.string().trim().min(1).max(180),
    filename: z
      .string()
      .min(1)
      .max(200)
      .refine((s) => !/[\/\\\u0000-\u001f]/.test(s)),
    size: z.number().int().positive().max(MAX_BYTES),
    mime: z.string().max(80),
    duration: z.number().finite().positive().max(MAX_SECONDS),
  })
  .strict()
  .refine(
    (v) => acceptedFiles[v.filename.split(".").at(-1)!.toLowerCase()]?.includes(v.mime),
    "Unsupported recording format",
  );
const evidenceSchema = z
  .object({ segmentId: z.string().max(100), quote: z.string().min(1).max(1000) })
  .strict();
const pointSchema = z
  .object({ text: z.string().min(1).max(1000), sources: z.array(evidenceSchema).min(1).max(6) })
  .strict();
export const analysisSchema = z
  .object({
    purpose: pointSchema.nullable(),
    executiveSummary: z.array(pointSchema).max(6),
    takeaways: z.array(pointSchema).max(12),
    topics: z.array(pointSchema).max(15),
    decisions: z.array(pointSchema).max(15),
    risks: z.array(pointSchema).max(12),
    openQuestions: z.array(pointSchema).max(12),
    nextSteps: z.array(pointSchema).max(15),
    actions: z
      .array(
        z
          .object({
            title: z.string().min(1).max(300),
            description: z.string().max(600),
            assignee: z.string().max(120).nullable(),
            dueDate: z.string().max(120).nullable(),
            source: evidenceSchema,
          })
          .strict(),
      )
      .max(30),
    highlights: z
      .array(
        z
          .object({
            title: z.string().min(1).max(120),
            description: z.string().max(600),
            source: evidenceSchema,
          })
          .strict(),
      )
      .max(15),
  })
  .strict();
export type Analysis = z.infer<typeof analysisSchema>;
export const transcriptionSchema = z.object({
  language: z.string().max(80).nullable(),
  model: z.enum(["gpt-4o-transcribe-diarize", "whisper-1"]),
  text: z.string().min(1).max(60000),
  segments: z
    .array(
      z.object({
        id: z.string(),
        start: z.number().finite().nonnegative(),
        end: z.number().finite().positive(),
        text: z.string().min(1).max(6000),
        speakerId: z.string(),
      }),
    )
    .min(1)
    .max(2000),
  speakers: z
    .array(z.object({ id: z.string(), name: z.string(), role: z.string(), color: z.string() }))
    .min(1)
    .max(30),
});
export type Transcription = z.infer<typeof transcriptionSchema>;
export class ProcessingError extends Error {
  constructor(
    public code: string,
    public retryable = false,
  ) {
    super(code);
  }
}
