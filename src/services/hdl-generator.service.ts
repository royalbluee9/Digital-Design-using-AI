
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

export interface HdlFile {
  filename: string;
  language: string;
  code: string;
}

export interface GeneratedOutput {
  rtlCode?: HdlFile;
  testbench?: HdlFile;
  testCases?: HdlFile;
  designSpec?: HdlFile;
}

export interface Deliverable {
  id: keyof GeneratedOutput;
  name: string;
  checked: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class HdlGeneratorService {
  private readonly ai: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateHdl(
    description: string,
    hdlLanguage: 'VHDL' | 'Verilog',
    deliverables: string[]
  ): Promise<GeneratedOutput> {

    const fileSchema = {
      type: Type.OBJECT,
      properties: {
        filename: { type: Type.STRING, description: "The filename for the code, e.g., 'counter.v' or 'spec.md'." },
        language: { type: Type.STRING, description: "The programming/markup language, e.g., 'Verilog', 'SystemVerilog', 'Markdown'." },
        code: { type: Type.STRING, description: "The complete, syntactically correct code or document content." },
      },
      required: ['filename', 'language', 'code'],
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        rtlCode: fileSchema,
        testbench: fileSchema,
        testCases: fileSchema,
        designSpec: fileSchema,
      },
      // Note: We define all properties but the prompt will instruct the AI to only generate the requested ones.
    };

    const prompt = this.buildPrompt(description, hdlLanguage, deliverables);

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      });

      const jsonText = response.text.trim();
      const parsedJson = JSON.parse(jsonText);

      // Filter out null/undefined values from the response
      const cleanOutput: GeneratedOutput = {};
      for (const key in parsedJson) {
        if (Object.prototype.hasOwnProperty.call(parsedJson, key) && parsedJson[key]) {
          cleanOutput[key as keyof GeneratedOutput] = parsedJson[key];
        }
      }
      return cleanOutput;

    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw new Error('The AI model failed to generate a valid response.');
    }
  }

  private buildPrompt(
    description: string,
    hdlLanguage: string,
    deliverables: string[]
  ): string {
    const deliverableList = deliverables.map(d => {
        switch(d) {
            case 'rtlCode': return `RTL Code in ${hdlLanguage}`;
            case 'testbench': return 'SystemVerilog/UVM Testbench';
            case 'testCases': return 'Test Cases Description (in Markdown)';
            case 'designSpec': return 'Design Specification (in Markdown)';
            default: return d;
        }
    }).join(', ');

    return `
      You are an expert Hardware Design and Verification Engineer AI assistant. Your role is to help users develop, verify, and test digital designs.
      Follow best practices for synthesizable, modular, and well-documented code.

      User's Design Request:
      "${description}"

      Generation Task:
      - Target RTL Language: ${hdlLanguage}
      - Verification Environment: SystemVerilog with UVM.
      - Required Deliverables: ${deliverableList}.

      Instructions:
      1.  Analyze the user's request and generate all the required deliverables.
      2.  Ensure all generated code is syntactically correct and complete.
      3.  For testbenches, create a comprehensive UVM-based environment.
      4.  For documentation (like specs or test cases), use Markdown format.
      5.  Return the output as a single, valid JSON object that adheres to the provided schema. Do not include any text, markdown formatting, or code blocks before or after the JSON object.
      6.  Only generate properties in the JSON for the deliverables that were explicitly requested.
    `;
  }
}
