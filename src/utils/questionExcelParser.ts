import * as XLSX from 'xlsx';
import { QuestionType } from '@/types/questionBank';

export interface ParsedQuestion {
  code: string;
  question_type: QuestionType;
  content: string;
  taxonomy_code: string;
  cognitive_level: string;
  difficulty: number;
  estimated_time: number;
  needs_rich_edit: boolean;
  answer_data: Record<string, unknown>;
}

export interface MCQOptionRow {
  question_code: string;
  option_A: string;
  option_B: string;
  option_C: string;
  option_D: string;
  correct: string;
}

export interface TFStatementRow {
  question_code: string;
  statement_1: string;
  is_true_1: boolean;
  statement_2: string;
  is_true_2: boolean;
  statement_3: string;
  is_true_3: boolean;
  statement_4: string;
  is_true_4: boolean;
}

export interface ShortAnswerRow {
  question_code: string;
  accepted_answers: string;
  case_sensitive: boolean;
}

export interface CodingTestCaseRow {
  question_code: string;
  test_order: number;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
}

export interface CodingConfigRow {
  question_code: string;
  languages: string;
  default_language: string;
  time_limit: number;
  memory_limit: number;
  scoring_method: string;
  starter_code_python?: string;
  starter_code_javascript?: string;
  starter_code_java?: string;
  starter_code_cpp?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: ValidationError[];
}

interface TaxonomyNode {
  id: string;
  code: string;
  name: string;
  parent_id?: string | null;
}

const VALID_QUESTION_TYPES: QuestionType[] = ['MCQ_SINGLE', 'TRUE_FALSE_4', 'SHORT_ANSWER', 'CODING'];

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const str = normalizeString(value).toUpperCase();
  return str === 'TRUE' || str === 'ĐÚNG' || str === '1' || str === 'YES' || str === 'X';
}

function normalizeNumber(value: unknown, defaultValue: number): number {
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return isNaN(num) ? defaultValue : num;
}

export function parseExcelFile(
  file: ArrayBuffer,
  taxonomyNodes: TaxonomyNode[],
  cognitiveLevels: string[]
): ParseResult {
  const workbook = XLSX.read(file, { type: 'array' });
  const errors: ValidationError[] = [];
  const questions: ParsedQuestion[] = [];

  // Parse Questions sheet
  const questionsSheet = workbook.Sheets['Questions'];
  if (!questionsSheet) {
    errors.push({ row: 0, field: 'sheet', message: 'Không tìm thấy sheet "Questions"' });
    return { questions: [], errors };
  }

  const questionsData = XLSX.utils.sheet_to_json<Record<string, unknown>>(questionsSheet);

  // Parse option sheets
  const mcqSheet = workbook.Sheets['MCQ_Options'];
  const mcqData = mcqSheet ? XLSX.utils.sheet_to_json<MCQOptionRow>(mcqSheet) : [];
  const mcqMap = new Map<string, MCQOptionRow>();
  mcqData.forEach(row => mcqMap.set(normalizeString(row.question_code), row));

  const tfSheet = workbook.Sheets['TF_Statements'];
  const tfData = tfSheet ? XLSX.utils.sheet_to_json<TFStatementRow>(tfSheet) : [];
  const tfMap = new Map<string, TFStatementRow>();
  tfData.forEach(row => tfMap.set(normalizeString(row.question_code), row));

  const shortSheet = workbook.Sheets['Short_Answers'];
  const shortData = shortSheet ? XLSX.utils.sheet_to_json<ShortAnswerRow>(shortSheet) : [];
  const shortMap = new Map<string, ShortAnswerRow>();
  shortData.forEach(row => shortMap.set(normalizeString(row.question_code), row));

  const codingTestSheet = workbook.Sheets['Coding_TestCases'];
  const codingTestData = codingTestSheet ? XLSX.utils.sheet_to_json<CodingTestCaseRow>(codingTestSheet) : [];
  const codingTestMap = new Map<string, CodingTestCaseRow[]>();
  codingTestData.forEach(row => {
    const code = normalizeString(row.question_code);
    if (!codingTestMap.has(code)) {
      codingTestMap.set(code, []);
    }
    codingTestMap.get(code)!.push(row);
  });

  const codingConfigSheet = workbook.Sheets['Coding_Config'];
  const codingConfigData = codingConfigSheet ? XLSX.utils.sheet_to_json<CodingConfigRow>(codingConfigSheet) : [];
  const codingConfigMap = new Map<string, CodingConfigRow>();
  codingConfigData.forEach(row => codingConfigMap.set(normalizeString(row.question_code), row));

  // Build taxonomy code to ID map
  const taxonomyCodeMap = new Map<string, string>();
  taxonomyNodes.forEach(node => taxonomyCodeMap.set(node.code, node.id));

  // Validate and parse each question row
  questionsData.forEach((row, index) => {
    const rowNum = index + 2; // Excel rows start at 1, plus header row
    const code = normalizeString(row.code);
    const questionType = normalizeString(row.type) as QuestionType;
    const content = normalizeString(row.content);
    const taxonomyCode = normalizeString(row.taxonomy_code);
    const cognitiveLevel = normalizeString(row.cognitive_level);
    const difficulty = normalizeNumber(row.difficulty, 0.5);
    const estimatedTime = normalizeNumber(row.estimated_time, 60);
    const needsRichEdit = normalizeBoolean(row.needs_rich_edit);

    // Validate required fields
    if (!code) {
      errors.push({ row: rowNum, field: 'code', message: 'Mã câu hỏi không được để trống' });
      return;
    }
    if (!content) {
      errors.push({ row: rowNum, field: 'content', message: 'Nội dung câu hỏi không được để trống' });
      return;
    }
    if (!VALID_QUESTION_TYPES.includes(questionType)) {
      errors.push({ row: rowNum, field: 'type', message: `Loại câu hỏi không hợp lệ: ${questionType}` });
      return;
    }

    // Validate taxonomy code exists
    if (taxonomyCode && !taxonomyCodeMap.has(taxonomyCode)) {
      errors.push({ row: rowNum, field: 'taxonomy_code', message: `Mã phân loại không tồn tại: ${taxonomyCode}` });
    }

    // Validate cognitive level
    if (cognitiveLevel && !cognitiveLevels.includes(cognitiveLevel)) {
      errors.push({ row: rowNum, field: 'cognitive_level', message: `Mức độ không hợp lệ: ${cognitiveLevel}` });
    }

    // Build answer_data based on question type
    let answerData: Record<string, unknown> = {};

    if (questionType === 'MCQ_SINGLE') {
      const mcqRow = mcqMap.get(code);
      if (!mcqRow) {
        errors.push({ row: rowNum, field: 'MCQ_Options', message: 'Thiếu đáp án trong sheet MCQ_Options' });
      } else {
        const options = [
          { id: 'A', text: normalizeString(mcqRow.option_A), isCorrect: mcqRow.correct?.toUpperCase() === 'A' },
          { id: 'B', text: normalizeString(mcqRow.option_B), isCorrect: mcqRow.correct?.toUpperCase() === 'B' },
          { id: 'C', text: normalizeString(mcqRow.option_C), isCorrect: mcqRow.correct?.toUpperCase() === 'C' },
          { id: 'D', text: normalizeString(mcqRow.option_D), isCorrect: mcqRow.correct?.toUpperCase() === 'D' },
        ].filter(opt => opt.text);

        if (options.length < 2) {
          errors.push({ row: rowNum, field: 'MCQ_Options', message: 'Cần ít nhất 2 đáp án' });
        }
        if (!options.some(opt => opt.isCorrect)) {
          errors.push({ row: rowNum, field: 'MCQ_Options', message: 'Chưa chọn đáp án đúng' });
        }

        answerData = { options };
      }
    } else if (questionType === 'TRUE_FALSE_4') {
      const tfRow = tfMap.get(code);
      if (!tfRow) {
        errors.push({ row: rowNum, field: 'TF_Statements', message: 'Thiếu mệnh đề trong sheet TF_Statements' });
      } else {
        const statements = [];
        for (let i = 1; i <= 4; i++) {
          const statementKey = `statement_${i}` as keyof TFStatementRow;
          const isTrueKey = `is_true_${i}` as keyof TFStatementRow;
          const statement = normalizeString(tfRow[statementKey]);
          const isTrue = normalizeBoolean(tfRow[isTrueKey]);
          if (statement) {
            statements.push({ id: String(i), text: statement, isTrue });
          }
        }

        if (statements.length < 2) {
          errors.push({ row: rowNum, field: 'TF_Statements', message: 'Cần ít nhất 2 mệnh đề' });
        }

        answerData = { statements };
      }
    } else if (questionType === 'SHORT_ANSWER') {
      const shortRow = shortMap.get(code);
      if (!shortRow) {
        errors.push({ row: rowNum, field: 'Short_Answers', message: 'Thiếu đáp án trong sheet Short_Answers' });
      } else {
        const acceptedAnswers = normalizeString(shortRow.accepted_answers)
          .split(',')
          .map(a => a.trim())
          .filter(a => a);

        if (acceptedAnswers.length === 0) {
          errors.push({ row: rowNum, field: 'Short_Answers', message: 'Cần ít nhất 1 đáp án' });
        }

        answerData = {
          acceptedAnswers,
          caseSensitive: normalizeBoolean(shortRow.case_sensitive),
        };
      }
    } else if (questionType === 'CODING') {
      const testCases = codingTestMap.get(code) || [];
      const config = codingConfigMap.get(code);

      if (testCases.length === 0) {
        errors.push({ row: rowNum, field: 'Coding_TestCases', message: 'Cần ít nhất 1 test case' });
      }

      const parsedTestCases = testCases
        .sort((a, b) => normalizeNumber(a.test_order, 0) - normalizeNumber(b.test_order, 0))
        .map((tc, idx) => ({
          id: String(idx + 1),
          input: normalizeString(tc.input),
          expectedOutput: normalizeString(tc.expected_output),
          isHidden: normalizeBoolean(tc.is_hidden),
          weight: normalizeNumber(tc.weight, 1),
        }));

      const languages = config?.languages
        ? normalizeString(config.languages).split(',').map(l => l.trim())
        : ['python'];

      const starterCode: Record<string, string> = {};
      if (config?.starter_code_python) starterCode.python = config.starter_code_python;
      if (config?.starter_code_javascript) starterCode.javascript = config.starter_code_javascript;
      if (config?.starter_code_java) starterCode.java = config.starter_code_java;
      if (config?.starter_code_cpp) starterCode.cpp = config.starter_code_cpp;

      answerData = {
        testCases: parsedTestCases,
        languages,
        defaultLanguage: config?.default_language || 'python',
        timeLimit: normalizeNumber(config?.time_limit, 5),
        memoryLimit: normalizeNumber(config?.memory_limit, 256),
        scoringMethod: config?.scoring_method || 'proportional',
        starterCode,
      };
    }

    questions.push({
      code,
      question_type: questionType,
      content,
      taxonomy_code: taxonomyCode,
      cognitive_level: cognitiveLevel,
      difficulty,
      estimated_time: estimatedTime,
      needs_rich_edit: needsRichEdit,
      answer_data: answerData,
    });
  });

  return { questions, errors };
}

export function mapTaxonomyCodeToId(
  code: string,
  taxonomyNodes: TaxonomyNode[]
): string | null {
  const node = taxonomyNodes.find(n => n.code === code);
  return node?.id || null;
}

export function buildTaxonomyPath(
  nodeId: string,
  taxonomyNodes: TaxonomyNode[]
): string[] {
  const path: string[] = [];
  const nodeMap = new Map<string, TaxonomyNode>();
  taxonomyNodes.forEach(n => nodeMap.set(n.id, n));

  let current = nodeMap.get(nodeId);
  while (current) {
    path.unshift(current.name);
    current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
  }

  return path;
}
