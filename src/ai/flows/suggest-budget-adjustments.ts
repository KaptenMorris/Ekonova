// src/ai/flows/suggest-budget-adjustments.ts
'use server';
/**
 * @fileOverview A flow that analyzes user financial data and suggests budget adjustments.
 *
 * - suggestBudgetAdjustments - A function that suggests budget adjustments based on user's financial data.
 * - SuggestBudgetAdjustmentsInput - The input type for the suggestBudgetAdjustments function.
 * - SuggestBudgetAdjustmentsOutput - The return type for the suggestBudgetAdjustments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBudgetAdjustmentsInputSchema = z.object({
  income: z.number().describe('Total månadsinkomst.'),
  expenses: z.array(
    z.object({
      category: z.string().describe('Utgiftskategori.'),
      amount: z.number().describe('Belopp spenderat i kategorin.'),
    })
  ).describe('Lista över månatliga utgifter med kategori och belopp.'),
});

export type SuggestBudgetAdjustmentsInput = z.infer<typeof SuggestBudgetAdjustmentsInputSchema>;

const SuggestBudgetAdjustmentsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      category: z.string().describe('Kategori att justera.'),
      adjustment: z
        .string()
        .describe(
          'Förslag för att justera budgeten i denna kategori, inklusive specifikt belopp och motivering.'
        ),
    })
  ).describe('Lista över budgetjusteringsförslag.'),
});

export type SuggestBudgetAdjustmentsOutput = z.infer<typeof SuggestBudgetAdjustmentsOutputSchema>;

export async function suggestBudgetAdjustments(input: SuggestBudgetAdjustmentsInput): Promise<SuggestBudgetAdjustmentsOutput> {
  return suggestBudgetAdjustmentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBudgetAdjustmentsPrompt',
  input: {schema: SuggestBudgetAdjustmentsInputSchema},
  output: {schema: SuggestBudgetAdjustmentsOutputSchema},
  prompt: `Du är en personlig ekonomisk rådgivare. Analysera användarens inkomster och utgifter och ge förslag på hur de kan justera sin budget för att förbättra sin ekonomiska hälsa.

  Inkomst: {{income}}
  Utgifter:
  {{#each expenses}}
  - Kategori: {{category}}, Belopp: {{amount}}
  {{/each}}

  Ge specifika och handlingsbara förslag. Fokusera på områden där användaren spenderar för mycket eller där de kan dra ner. Inkludera belopp att justera och motivering.
`,
});

const suggestBudgetAdjustmentsFlow = ai.defineFlow(
  {
    name: 'suggestBudgetAdjustmentsFlow',
    inputSchema: SuggestBudgetAdjustmentsInputSchema,
    outputSchema: SuggestBudgetAdjustmentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
