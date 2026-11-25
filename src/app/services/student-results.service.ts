import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase/supabase.client';
import { CourseResult, SemesterResultSummary } from '../models';

/**
 * CRUD access to the student's real course results.
 *
 * No sample results are created here. Results originate from the student's
 * own entry/import and are persisted in the `results` table.
 */
@Injectable({ providedIn: 'root' })
export class StudentResultsService {
  async getResults(studentId: string): Promise<CourseResult[]> {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('student_id', studentId)
      .order('academic_year', { ascending: true })
      .order('semester', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CourseResult[];
  }

  async addResult(result: Omit<CourseResult, 'id'>): Promise<CourseResult> {
    const { data, error } = await supabase.from('results').insert(result).select().single();
    if (error) throw error;
    return data as CourseResult;
  }

  async deleteResult(id: string): Promise<void> {
    const { error } = await supabase.from('results').delete().eq('id', id);
    if (error) throw error;
  }

  summarizeBySemester(results: CourseResult[]): SemesterResultSummary[] {
    const groups = new Map<string, CourseResult[]>();
    for (const r of results) {
      const key = `${r.academicYear}-${r.semester}`;
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    return [...groups.values()].map((list) => ({
      semester: list[0].semester,
      academicYear: list[0].academicYear,
      creditsAttempted: list.reduce((s, r) => s + (r.credits ?? 0), 0),
      creditsEarned: list.filter((r) => r.countsTowardGpa).reduce((s, r) => s + (r.credits ?? 0), 0),
      semesterGpa: 0,
    }));
  }
}