import { Injectable } from '@angular/core';
import { isProfileComplete } from '../core/auth/profile-completeness';
import { supabase } from '../core/supabase/supabase.client';
import {
  CurriculumVersionOption,
  DepartmentOption,
  OnboardingSelection,
  Profile,
} from '../models';

/**
 * Student profile management + first-login onboarding.
 * RLS ensures a student can only read/update their own profile.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  /** Returns the current user's profile, or null if none yet. */
  async getMyProfile(): Promise<Profile | null> {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      role: data.role,
      departmentId: data.department_id,
      curriculumVersionId: data.curriculum_version_id,
      currentSemester: data.current_semester,
      intakeYear: data.intake_year,
      faculty: data.faculty,
      createdAt: data.created_at,
    };
  }

  /** True when the student has not yet saved a degree programme. */
  needsOnboarding(profile: Profile | null): boolean {
    return !isProfileComplete(profile);
  }

  async getDepartments(): Promise<DepartmentOption[]> {
    const { data, error } = await supabase.from('departments').select('id, code, name').order('code');
    if (error) throw error;
    return (data ?? []) as DepartmentOption[];
  }

  async getCurriculumVersions(departmentId: string): Promise<CurriculumVersionOption[]> {
    const { data, error } = await supabase
      .from('curriculum_versions')
      .select('id, department_id, version')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('version', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      departmentId: r.department_id as string,
      version: r.version as string,
    }));
  }

  /** Total programme credits for a curriculum version (null if unset). */
  async getTotalCredits(curriculumVersionId: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('curriculum_versions')
      .select('total_credits')
      .eq('id', curriculumVersionId)
      .maybeSingle();
    if (error) throw error;
    return (data?.total_credits as number | null) ?? null;
  }

  /** Save onboarding choices to the student's profile. */
  async saveOnboarding(selection: OnboardingSelection): Promise<void> {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update({
        department_id: selection.departmentId,
        curriculum_version_id: selection.curriculumVersionId,
        current_semester: selection.currentSemester,
      })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Your profile could not be found. Please sign in again.');
  }
}
