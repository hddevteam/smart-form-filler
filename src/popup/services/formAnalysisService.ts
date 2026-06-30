/**
 * FormAnalysisService — TypeScript migration of the backend formFillerController.js
 * AI prompts (Stage 1 & 2) and response parsing ported to pure frontend.
 *
 * Architecture:
 *   Stage 1: analyzeFormRelevance()  — AI identifies which form is most relevant
 *   Stage 2: analyzeFieldMapping()   — AI maps user content to form fields
 *
 * Both stages route via sendAIRequest → Background SW → AI provider.
 * No fetch() to localhost/backend.
 */
import type { DetectedForm } from '@/content/formDetector';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';
import type { ChatResponse } from '@/types/ai';
import type { ChatApiConfig, ChatDataSourceSelection } from '@/types/popup';
import { Logger } from '@/utils/logger';

const logger = Logger.forScope('FormAnalysisService');

// ── Return types ──────────────────────────────────────────────────────────────

export interface FieldDescription {
  fieldId: string;
  description: string;
}

export interface FormRelevanceResult {
  relevantForms: Array<{ formId: string; relevanceScore: number }>;
  recommendedForm: string;
  confidence: number;
  recommendedLanguage?: string;
  formDescription?: string;
  fieldDescriptions?: Record<string, FieldDescription>;
}

export interface FieldMapping {
  fieldId: string;
  suggestedValue: string;
  xpath?: string;
}

export interface FieldMappingResult {
  fieldMappings: FieldMapping[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RELEVANCE_SYSTEM_PROMPT =
  'You are an intelligent form analysis assistant. Your task is to determine which forms on a page are most relevant to the provided content for form filling.';

const MAPPING_SYSTEM_PROMPT =
  'You are an intelligent form filling assistant. Your task is to map user content to form fields with appropriate values.';

const MAX_HTML_CHARS = 80_000; // ~20k tokens

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateHtml(html: string): string {
  if (html.length <= MAX_HTML_CHARS) return html;
  return html.slice(0, MAX_HTML_CHARS) + '\n<!-- [truncated for token limit] -->';
}

function parseJsonFromResponse(content: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch {
    // Extract JSON block from markdown
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? content.match(/(\{[\s\S]*\})/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        /* fall through */
      }
    }
    throw new Error('Failed to parse AI JSON response');
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export class FormAnalysisService {
  constructor(
    private readonly sendAIRequest: (
      options: MakeRequestOptions
    ) => Promise<{ response: ChatResponse; logs: string[] }>,
    private readonly getApiConfig: () => Promise<ChatApiConfig>
  ) {}

  // ── Stage 1 ──────────────────────────────────────────────────────────────────

  async analyzeFormRelevance(
    content: string,
    forms: DetectedForm[],
    model: string,
    language: string = 'zh',
    pageHtml: string = ''
  ): Promise<FormRelevanceResult> {
    const prompt = this.buildRelevancePrompt(content, forms, pageHtml, language);
    const { apiUrl, apiKey } = await this.getApiConfig();

    const requestOptions: MakeRequestOptions = {
      apiUrl,
      model,
      messages: [
        { role: 'system', content: RELEVANCE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      params: { temperature: 0.2, max_tokens: 1500 },
    };
    if (apiKey) requestOptions.apiKey = apiKey;

    const { response } = await this.sendAIRequest(requestOptions);
    const raw = response.choices[0]?.message?.content ?? '';
    logger.debug('Stage 1 raw response length:', raw.length);

    const parsed = parseJsonFromResponse(raw) as FormRelevanceResult;
    return parsed;
  }

  private buildRelevancePrompt(
    userContent: string,
    forms: DetectedForm[],
    pageHtml: string,
    _language: string
  ): string {
    const processedHtml = truncateHtml(pageHtml);

    const formsDescription = forms
      .map((form, index) => {
        const id = form.id ?? `form-${index}`;
        const lines = [
          `Form ${index + 1} (ID: ${id})`,
          `  Field count: ${form.fields.length}`,
          '  Field details:',
        ];
        for (const [fi, field] of form.fields.entries()) {
          let desc = `    ${fi + 1}. ${field.id ?? field.name}`;
          if (field.label) desc += ` - "${field.label}"`;
          if (field.label !== undefined && field.name !== field.label)
            desc += ` (name: ${field.name})`;
          desc += ` (${field.type})`;
          if (field.required) desc += ' [Required]';
          if (field.options?.length) {
            const opts = field.options.map(o => `"${o.text ?? o.value}"`).join(', ');
            desc += ` [Options: ${opts}]`;
          }
          lines.push(desc);
        }
        return lines.join('\n');
      })
      .join('\n\n');

    return `Please analyze webpage content and user input to identify the most relevant forms and generate field descriptions.

${userContent ? `User content to fill:\n"${userContent}"\n` : ''}

Page HTML context:
\`\`\`html
${processedHtml || 'No page HTML content'}
\`\`\`

Form structure on the page:
${formsDescription}

Return JSON format:
{
  "relevantForms": [{"formId": "form ID", "relevanceScore": 0.95}],
  "recommendedForm": "recommended form ID",
  "confidence": 0.90,
  "recommendedLanguage": "en or zh",
  "formDescription": "Concise description of what this form is for",
  "fieldDescriptions": {
    "fieldId": {"fieldId": "field ID", "description": "Field purpose and available options"}
  }
}`;
  }

  // ── Stage 2 ──────────────────────────────────────────────────────────────────

  async analyzeFieldMapping(
    content: string,
    targetForm: DetectedForm,
    model: string,
    analysisResult?: FormRelevanceResult,
    language: string = 'zh',
    dataSources?: Pick<ChatDataSourceSelection, 'sources'>
  ): Promise<FieldMappingResult> {
    const prompt = this.buildMappingPrompt(
      content,
      targetForm,
      analysisResult,
      language,
      dataSources
    );
    const { apiUrl, apiKey } = await this.getApiConfig();

    const requestOptions: MakeRequestOptions = {
      apiUrl,
      model,
      messages: [
        { role: 'system', content: MAPPING_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      params: { temperature: 0.3, max_tokens: 2000 },
    };
    if (apiKey) requestOptions.apiKey = apiKey;

    const { response } = await this.sendAIRequest(requestOptions);
    const raw = response.choices[0]?.message?.content ?? '';
    logger.debug('Stage 2 raw response length:', raw.length);

    const parsed = parseJsonFromResponse(raw) as FieldMappingResult;
    return parsed;
  }

  private buildMappingPrompt(
    content: string,
    targetForm: DetectedForm,
    analysisResult: FormRelevanceResult | undefined,
    language: string,
    dataSources?: Pick<ChatDataSourceSelection, 'sources'>
  ): string {
    const hasContent = content.trim().length > 0;
    const hasDataSources = (dataSources?.sources?.length ?? 0) > 0;
    const langInstruction = `Please respond in ${language} language`;

    const parts: string[] = [];

    if (hasContent && hasDataSources) {
      parts.push(
        `Analyze user content and data sources to generate appropriate values for each form field. ${langInstruction}.`
      );
    } else if (hasDataSources) {
      parts.push(
        `Generate appropriate form field values based on the provided data sources. ${langInstruction}.`
      );
    } else {
      parts.push(
        `Analyze user content and generate appropriate values for each form field. ${langInstruction}.`
      );
    }

    if (hasContent) parts.push(`\nUser input content:\n"${content}"\n`);

    if (hasDataSources && dataSources?.sources) {
      const combined = dataSources.sources
        .map(s => `[${s.title}]\n${s.content}`)
        .join('\n\n---\n\n');
      parts.push(`\nData sources:\n${combined}\n`);
    }

    if (analysisResult?.formDescription) {
      parts.push(`Form description: ${analysisResult.formDescription}\n`);
    }

    if (analysisResult?.fieldDescriptions) {
      parts.push('Field analysis results (for reference):');
      for (const [fid, fd] of Object.entries(analysisResult.fieldDescriptions)) {
        parts.push(`- ${fid}: ${fd.description}`);
      }
      parts.push('');
    }

    const simplifiedForm = {
      id: targetForm.id ?? `form-${targetForm.index}`,
      fields: targetForm.fields.map(f => ({
        id: f.id ?? f.name,
        name: f.name,
        type: f.type,
        description: f.label ?? f.id ?? f.name,
        required: f.required,
        options: f.options,
      })),
    };

    parts.push(`Target form structure:\n${JSON.stringify(simplifiedForm, null, 2)}\n`);

    parts.push(`**CRITICAL**: ALL field values MUST be in ${language} language.

Return JSON format:
{
  "fieldMappings": [
    {"fieldId": "field ID", "suggestedValue": "value in ${language}"}
  ]
}`);

    return parts.join('\n');
  }
}

export default FormAnalysisService;
