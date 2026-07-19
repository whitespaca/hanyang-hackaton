import { z } from "zod";
import { GARBAGE_CLASSES } from "./constants";

export const garbageClassSchema = z.enum(GARBAGE_CLASSES);
export const recyclabilitySchema = z.enum(["yes", "conditional", "no", "special"]);
export const inferenceModeSchema = z.enum(["mock", "model"]);

export const disposalReasonSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
});

export const disposalSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().nullable(),
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const disposalItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nameKo: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  keywords: z.array(z.string().min(1)).min(1),
  classificationCategory: garbageClassSchema.nullable(),
  group: z.string().min(1),
  groupLabel: z.string().min(1),
  recyclability: recyclabilitySchema,
  summary: z.string().min(1),
  steps: z.array(z.string().min(1)).min(2),
  warnings: z.array(z.string().min(1)).min(1),
  reasons: z.array(disposalReasonSchema).min(1),
  spotTypes: z.array(z.string().min(1)),
  regionalNote: z.string().min(1),
  source: disposalSourceSchema,
  popular: z.boolean(),
});

export const itemSummarySchema = disposalItemSchema.pick({
  id: true,
  nameKo: true,
  aliases: true,
  classificationCategory: true,
  group: true,
  groupLabel: true,
  recyclability: true,
  summary: true,
  popular: true,
});

export const itemsResponseSchema = z.object({
  version: z.string(),
  locale: z.string(),
  items: z.array(itemSummarySchema),
});

export const itemSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(itemSummarySchema),
  suggestions: z.array(itemSummarySchema),
});

export const recentSearchItemSchema = z.object({
  itemId: z.string().min(1),
  query: z.string(),
  nameKo: z.string().min(1),
  searchedAt: z.string().datetime(),
});

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

export const guideItemSchema = disposalItemSchema.extend({
  category: garbageClassSchema,
  subcategory: z.string(),
  title: z.string(),
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
export type DisposalReason = z.infer<typeof disposalReasonSchema>;
export type DisposalSource = z.infer<typeof disposalSourceSchema>;
export type DisposalItem = z.infer<typeof disposalItemSchema>;
export type ItemSummary = z.infer<typeof itemSummarySchema>;
export type ItemsResponse = z.infer<typeof itemsResponseSchema>;
export type ItemSearchResponse = z.infer<typeof itemSearchResponseSchema>;
export type RecentSearchItem = z.infer<typeof recentSearchItemSchema>;
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
