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
  income: z.number().describe('Total monthly income.'),
  expenses: z.array(
    z.object({
      category: z.string().describe('Category of the expense.'),
      amount: z.number().describe('Amount spent on the category.'),
    })
  ).describe('List of monthly expenses with category and amount.'),
});

export type SuggestBudgetAdjustmentsInput = z.infer<typeof SuggestBudgetAdjustmentsInputSchema>;

const SuggestBudgetAdjustmentsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      category: z.string().describe('Category to adjust.'),
      adjustment: z
        .string()
        .describe(
          'Suggestion for adjusting the budget in this category, including specific amount and reasoning.'
        ),
    })
  ).describe('List of budget adjustment suggestions.'),
});

export type SuggestBudgetAdjustmentsOutput = z.infer<typeof SuggestBudgetAdjustmentsOutputSchema>;

export async function suggestBudgetAdjustments(input: SuggestBudgetAdjustmentsInput): Promise<SuggestBudgetAdjustmentsOutput> {
  return suggestBudgetAdjustmentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBudgetAdjustmentsPrompt',
  input: {schema: SuggestBudgetAdjustmentsInputSchema},
  output: {schema: SuggestBudgetAdjustmentsOutputSchema},
  prompt: `You are a personal finance advisor. Analyze the user's income and expenses and provide suggestions for adjusting their budget to improve their financial health.

  Income: {{income}}
  Expenses:
  {{#each expenses}}
  - Category: {{category}}, Amount: {{amount}}
  {{/each}}

  Provide specific and actionable suggestions. Focus on areas where the user is overspending or where they can cut back. Include the amount to adjust and reasoning.
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
