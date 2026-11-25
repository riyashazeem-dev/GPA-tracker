import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../core/supabase/supabase.client';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('recognizes a completed profile returned by Supabase', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: {
        user: {
          id: 'student-1',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '',
        },
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'student-1',
            email: 'student@example.test',
            role: 'student',
            department_id: 'department-1',
            curriculum_version_id: 'version-1',
            current_semester: 3,
            intake_year: null,
            faculty: null,
            created_at: '2026-01-01T00:00:00Z',
          },
          error: null,
        }),
      }),
    });
    const profileQuery = supabase.from('profiles');
    Reflect.set(profileQuery, 'select', select);
    vi.spyOn(supabase, 'from').mockReturnValue(profileQuery);

    const service = new ProfileService();
    const profile = await service.getMyProfile();

    expect(profile).toMatchObject({
      departmentId: 'department-1',
      curriculumVersionId: 'version-1',
      currentSemester: 3,
    });
    expect(service.needsOnboarding(profile)).toBe(false);
  });
});
