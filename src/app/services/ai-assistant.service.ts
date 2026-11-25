import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase/supabase.client';
import { CourseResult, GpaModuleInput } from '../models';
import { ProfileService } from './profile.service';
import { StudentRecordsService } from './student-records.service';
import { ElectiveService } from './elective.service';
import { GpaService } from './gpa.service';
import { PredictionService } from './prediction.service';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Builds a VERIFIED academic context (numbers come from the GPA/prediction
 * engines, never the AI) and calls the secure `ai-assistant` Edge Function.
 * The API key never touches the frontend.
 */
@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  constructor(
    private readonly profiles: ProfileService,
    private readonly records: StudentRecordsService,
    private readonly electives: ElectiveService,
    private readonly gpa: GpaService,
    private readonly prediction: PredictionService,
  ) {}

  /** Ask the assistant a question with prior chat history. */
  async ask(question: string, history: ChatTurn[]): Promise<{ reply: string; model?: string }> {
    const context = await this.buildContext();
    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ];

    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { messages, context },
    });
    if (error) {
      throw new Error(error.message ?? 'AI request failed.');
    }
    if (data?.error) {
      throw new Error(data.error as string);
    }
    return { reply: (data?.reply as string) ?? '', model: data?.model as string | undefined };
  }

  /** Assemble verified context from the engine + DB (own student only). */
  private async buildContext(): Promise<Record<string, unknown>> {
    const profile = await this.profiles.getMyProfile();
    if (!profile) {
      return { note: 'No student profile available.' };
    }
    const [modules, actual, predicted, selected, target] = await Promise.all([
      this.records.getRegisteredModules(profile),
      this.records.getResults(profile.id, false),
      this.records.getResults(profile.id, true),
      this.electives.getSelections(profile.id, new Date().getFullYear()),
      this.getTargetGpa(profile.id),
    ]);

    const completedCredits = actual
      .filter((r) => r.countsTowardGpa)
      .reduce((s, r) => s + (r.credits ?? 0), 0);

    const semesterGpas = [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
      semester: sem,
      gpa: this.gpa.semesterGpa(this.toModules(actual.filter((r) => r.semester === sem))),
    }));

    const yearGpas = [1, 2, 3, 4].map((year) => ({
      year,
      gpa: this.gpa.semesterGpa(
        this.toModules(actual.filter((r) => Math.ceil(r.semester / 2) === year)),
      ),
    }));

    const resultIds = new Set(actual.map((r) => r.courseId));
    const remaining = modules
      .filter(
        (m) =>
          m.gpaEligible !== false &&
          (!m.isElective || selected.includes(m.id)) &&
          !resultIds.has(m.id),
      )
      .map((m) => ({ code: m.code, credits: m.credits }));

    return {
      department: profile.departmentId,
      currentSemester: profile.currentSemester,
      actualGrades: actual.map((r) => ({
        code: r.courseCode,
        grade: r.letterGrade,
        gradePoint: r.gradePoint,
        credits: r.credits,
      })),
      completedGpaCredits: completedCredits,
      semesterGpas,
      yearGpas,
      provisionalFgpa: this.gpa.officialFgpa(yearGpas.map((y) => y.gpa)),
      targetFgpa: target,
      remainingModules: remaining,
      expectedGrades: predicted.map((r) => ({ code: r.courseCode, grade: r.letterGrade })),
    };
  }

  private async getTargetGpa(studentId: string): Promise<number | null> {
    const { data } = await supabase
      .from('prediction_settings')
      .select('target_gpa')
      .eq('student_id', studentId)
      .maybeSingle();
    return (data?.target_gpa as number | null) ?? null;
  }

  private toModules(results: CourseResult[]): GpaModuleInput[] {
    return results.map((r) => ({
      credits: r.credits,
      gradePoint: r.gradePoint,
      isGpaEligible: r.countsTowardGpa,
      isElective: false,
      isSelected: true,
      hasResult: true,
    }));
  }
}