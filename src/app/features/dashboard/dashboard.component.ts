import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Profile } from '../../models';
import { isSupabaseConfigured } from '../../core/supabase/supabase.client';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { GpaCalculationService } from '../../services/gpa-calculation.service';
import { OFFICIAL_GRADE_SCALE } from '../../services/gpa';
import { isRegisteredModule, latestProgrammeResults, programmeCurrentSemester, programmeGpaModule, savedGrade } from '../../services/programme-progress';

type ProgrammeRecords = Awaited<ReturnType<StudentRecordsService['getProgrammeRecords']>>;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly profiles = inject(ProfileService);
  private readonly studentRecords = inject(StudentRecordsService);
  private readonly gpa = inject(GpaCalculationService);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  private readonly profile = signal<Profile | null>(null);
  private readonly records = signal<ProgrammeRecords | null>(null);
  private readonly edits = signal(new Map<string, string | null>());
  readonly connected = isSupabaseConfigured;
  readonly programme = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly gradeScale = OFFICIAL_GRADE_SCALE;
  readonly semesters = Array.from({ length: 8 }, (_, index) => index + 1);

  private readonly savedResults = computed(() => {
    const records = this.records();
    return latestProgrammeResults(records?.courses ?? [], records?.results ?? []);
  });
  readonly currentSemester = computed(() => programmeCurrentSemester(this.profile()?.currentSemester ?? null, this.savedResults()));
  readonly semester = computed(() => {
    const selected = Number(this.query()?.get('semester'));
    return this.semesters.includes(selected) ? selected : this.currentSemester();
  });
  readonly future = computed(() => this.semester() > this.currentSemester());
  private readonly programmeRows = computed(() => {
    const records = this.records();
    if (!records) return [];
    return records.courses.map((course) => {
      const result = this.savedResults().get(course.id);
      const registered = isRegisteredModule(course, result, records.electiveSelections, records.academicYear);
      return { course, registered, grade: savedGrade(result), module: programmeGpaModule(course, result, registered) };
    });
  });
  readonly rows = computed(() => this.programmeRows().filter((row) => row.course.semester === this.semester()));
  readonly completed = computed(() => this.rows().filter((row) => row.registered && row.grade !== null).length);
  readonly pending = computed(() => this.future() ? [] : this.rows().filter((row) => row.registered && row.grade === null));
  readonly semesterGpa = computed(() => this.gpa.semesterGpa(this.rows().map((row) => row.module)));
  readonly cumulativeGpa = computed(() => this.gpa.semesterGpa(this.programmeRows().map((row) => row.module)));
  readonly provisional = computed(() => this.programmeRows().some((row) => row.registered && row.grade === null));
  readonly semesterStatus = computed(() => {
    if (!this.rows().some((row) => row.registered)) return 'No registered modules';
    if (this.future()) return 'Upcoming';
    return this.pending().length ? 'In progress' : 'Complete';
  });
  readonly hasSemesterEdits = computed(() => this.rows().some((row) => this.edits().has(row.course.id)));

  constructor() {
    if (this.connected) void this.load();
    else this.loading.set(false);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const profile = await this.profiles.getMyProfile();
      if (!profile?.departmentId || !profile.curriculumVersionId) throw new Error('Your degree programme could not be loaded.');
      const [departments, records] = await Promise.all([
        this.profiles.getDepartments(),
        this.studentRecords.getProgrammeRecords(profile),
      ]);
      const department = departments.find((item) => item.id === profile.departmentId);
      this.programme.set(department ? `${department.name} (${department.code})` : 'Degree programme');
      this.profile.set(profile);
      this.records.set(records);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not load your grades. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  selectedGrade(courseId: string, grade: string | null): string {
    const edits = this.edits();
    return (edits.has(courseId) ? edits.get(courseId) : grade) ?? '';
  }

  editGrade(courseId: string, value: string, saved: string | null): void {
    const grade = value || null;
    this.edits.update((edits) => {
      const next = new Map(edits);
      if (grade === saved) next.delete(courseId);
      else next.set(courseId, grade);
      return next;
    });
    this.success.set('');
  }

  async save(): Promise<void> {
    const profile = this.profile();
    if (!profile || this.saving()) return;
    const semester = this.semester();
    const edits = this.edits();
    const grades = Object.fromEntries(this.rows().flatMap(({ course }) =>
      edits.has(course.id) ? [[course.id, edits.get(course.id) ?? null]] : [],
    ));
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    let saved = false;
    try {
      await this.studentRecords.saveSemesterGrades(semester, grades);
      saved = true;
      const [records, refreshedProfile] = await Promise.all([
        this.studentRecords.getProgrammeRecords(profile),
        this.profiles.getMyProfile(),
      ]);
      this.records.set(records);
      if (refreshedProfile) this.profile.set(refreshedProfile);
      this.edits.update((pending) => {
        const next = new Map(pending);
        for (const id of Object.keys(grades)) next.delete(id);
        return next;
      });
      this.success.set(`Semester ${this.semesterLabel(semester)} grades saved and GPA updated.`);
    } catch (error) {
      const detail = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
      this.error.set(saved
        ? 'Grades were saved. The dashboard could not refresh. Reload the page to see the new GPA.'
        : `Could not save grades. Your selections are still here. ${detail}`.trim());
    } finally {
      this.saving.set(false);
    }
  }

  semesterLabel(semester: number): string {
    return String(semester).padStart(2, '0');
  }

  formatGpa(value: number | null): string {
    return value === null ? '—' : value.toFixed(2);
  }
}
