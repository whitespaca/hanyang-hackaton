import { z } from "zod";
import { GARBAGE_CLASSES } from "./constants";

export const garbageClassSchema = z.enum(GARBAGE_CLASSES);
export const recyclabilitySchema = z.enum(["yes", "conditional", "no", "special"]);
export const inferenceModeSchema = z.enum(["mock", "model"]);

export const predictionSchema = z.object({
  className: garbageClassSchema,
  labelKo: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const classificationResponseSchema = z.object({
  classificationId: z.string().uuid(),
  predictions: z.array(predictionSchema).min(1).max(3),
  needsConfirmation: z.boolean(),
  confidenceThreshold: z.number().min(0).max(1),
  model: z.object({
    name: z.string(),
    version: z.string(),
    inferenceMode: inferenceModeSchema,
  }),
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("garbage-ai-api"),
  modelLoaded: z.boolean(),
  modelVersion: z.string(),
  inferenceMode: inferenceModeSchema,
  fallbackReason: z.string().nullable().optional(),
});

export const guideItemSchema = z.object({
  category: garbageClassSchema,
  subcategory: z.string(),
  title: z.string(),
  recyclability: recyclabilitySchema,
  steps: z.array(z.string()).min(2),
  warnings: z.array(z.string()),
  keywords: z.array(z.string()),
  sourceNote: z.string(),
  disclaimer: z.string(),
});

export const guideCategorySchema = z.object({
  id: garbageClassSchema,
  label: z.string(),
  description: z.string(),
  subcategories: z.array(guideItemSchema),
});

export const guidesResponseSchema = z.object({
  version: z.string(),
  locale: z.string(),
  disclaimer: z.string(),
  categories: z.array(guideCategorySchema),
});

export const categoryCountsSchema = z.object({
  className: garbageClassSchema,
  count: z.number().int().nonnegative(),
});

export const statisticsResponseSchema = z.object({
  totalClassifications: z.number().int().nonnegative(),
  correctionRate: z.number().min(0).max(1),
  averageTopConfidence: z.number().min(0).max(1),
  categoryCounts: z.array(categoryCountsSchema),
  dataMode: z.enum(["demo", "live"]),
});

export const feedbackResponseSchema = z.object({
  feedbackId: z.string().uuid(),
  classificationId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().nullable(),
  }),
});

export type ClassificationPrediction = z.infer<typeof predictionSchema>;
export type ClassificationResponse = z.infer<typeof classificationResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type GuideItem = z.infer<typeof guideItemSchema>;
export type GuideCategory = z.infer<typeof guideCategorySchema>;
export type GuidesResponse = z.infer<typeof guidesResponseSchema>;
export type StatisticsResponse = z.infer<typeof statisticsResponseSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;
export type Recyclability = z.infer<typeof recyclabilitySchema>;

export interface FeedbackInput {
  classificationId: string;
  predictedClass: z.infer<typeof garbageClassSchema>;
  selectedClass: z.infer<typeof garbageClassSchema>;
  subcategory?: string;
  reason: "confirmed" | "user_correction";
}
