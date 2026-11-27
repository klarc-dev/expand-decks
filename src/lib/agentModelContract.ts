import { z } from 'zod';

export const agentModelSchema = z
  .string()
  .trim()
  .min(1, 'Le modèle est requis')
  .max(128, 'Le nom du modèle est trop long')
  .regex(/^[A-Za-z0-9._:/-]+$/, 'Le nom du modèle contient des caractères invalides');
