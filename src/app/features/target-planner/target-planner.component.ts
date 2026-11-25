import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { isSupabaseConfigured } from '../../core/supabase/supabase.client';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { isGpaEligible } from '../../services/gpa';
import { CgpaPlan, planTargetCgpa } from '../../services/prediction/target-cgpa';
import { isRegisteredModule, latestProgrammeResults, programmeCurrentSemester, programmeGpaModule, savedGrade } from '../../services/programme-progress';

type ProgrammeRecords = Awaited<ReturnType<StudentRecordsService['getProgrammeRecords']>>;

@Component({
  selector: 'app-target-planner',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './target-planner.component.html',
})
export class TargetPlannerComponent {
  private readonly profiles = inject(ProfileService);
  private readonly studentRecords = inject(StudentRecordsService);
  private readonly records = signal<ProgrammeRecords | null>(null);
  readonly futureSemesters = signal<number[]>([]);
  readonly semester = signal(0);
  readonly target = signal<number | null>(null);
  readonly plan = signal<CgpaPlan | null>(null);
  readonly error = signal('');
  readonly loading = signal(true);
  readonly ready = computed(() => this.records() !== null);
  readonly hasUnregisteredElectives = computed(() => {
    const records = this.records();
    if (!records) return false;
    const registered = records.electiveSelections.get(records.academicYear);
    return records.courses.some((course) =>
      course.semester === this.semester() && course.isElective && course.gpaEligible && !registered?.has(course.id),
    );
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      if (!isSupabaseConfigured) {
        this.error.set('Connect Supabase and sign in to plan with your saved grades.');
        return;
      }
      const profile = await this.profiles.getMyProfile();
      if (!profile) throw new Error('Sign in to load your programme.');
      const records = await this.studentRecords.getProgrammeRecords(profile);
      const results = latestProgrammeResults(records.courses, records.results);
      const current = programmeCurrentSemester(profile.currentSemester, results);
      const semesters = Array.from({ length: 8 }, (_, index) => index + 1).filter((value) => value > current);
      this.futureSemesters.set(semesters);
      this.semester.set(semesters[0] ?? 0);
      this.records.set(records);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load your saved results.');
    } finally {
      this.loading.set(false);
    }
  }

  changeTarget(target: number | null): void {
    this.target.set(target);
    this.plan.set(null);
    this.error.set('');
  }

  changeSemester(semester: number): void {
    this.semester.set(semester);
    this.plan.set(null);
    this.error.set('');
  }

  calculate(): void {
    const records = this.records();
    const target = this.target();
    this.error.set('');
    this.plan.set(null);
    if (!records) return;
    if (target === null || !Number.isFinite(target) || target < 0 || target > 4) {
      this.error.set('Enter a target cumulative GPA from 0.00 to 4.00.');
      return;
    }
    const results = latestProgrammeResults(records.courses, records.results);
    let earnedPoints = 0;
    let completedCredits = 0;
    const remaining = [];
    for (const course of records.courses) {
      const result = results.get(course.id);
      const registered = isRegisteredModule(course, result, records.electiveSelections, records.academicYear);
      const module = programmeGpaModule(course, result, registered);
      const credits = course.credits;
      if (credits === null || credits <= 0) continue;
      if (isGpaEligible(module) && module.gradePoint !== null) {
        earnedPoints += module.gradePoint * credits;
        completedCredits += credits;
      } else if (course.semester === this.semester() && course.gpaEligible && registered && savedGrade(result) === null) {
        remaining.push({ id: course.id, code: course.code, title: course.title, credits });
      }
    }
    const plan = planTargetCgpa(target, earnedPoints, completedCredits, remaining);
    if (!plan) {
      this.error.set('No remaining GPA-bearing credits are available for this semester. Register any applicable electives first.');
      return;
    }
    this.plan.set(plan);
  }
}
