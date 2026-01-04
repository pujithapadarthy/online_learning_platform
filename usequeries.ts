mport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { OnboardingData, T, T__1, T__2, T__3, T__4, T__5, T__6, CourseWithVideos, QuizProgressData } from '../backend';

// YouTube Data API Configuration - Updated API Key
const YOUTUBE_API_KEY = 'AIzaSyBJ5WIYTjEFHNzj1p4A1GHBl-tSHGwvSRw';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// YouTube Video Interface
interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
  };
}

// Fetch YouTube videos for a given search query
export async function fetchYouTubeVideos(searchQuery: string, maxResults: number = 5): Promise<T__3[]> {
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: YouTubeSearchResult) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      description: item.snippet.description || `Tutorial by ${item.snippet.channelTitle}`,
    }));
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<T__4 | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveOnboardingProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnboardingData) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveOnboardingProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Course Population
export function usePopulateCourses() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.populateCourses();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coursesWithVideos'] });
      queryClient.invalidateQueries({ queryKey: ['searchCourses'] });
    },
  });
}

// Course Queries with YouTube Videos
export function useGetAllCoursesWithVideos() {
  const { actor, isFetching } = useActor();

  return useQuery<CourseWithVideos[]>({
    queryKey: ['coursesWithVideos'],
    queryFn: async () => {
      if (!actor) return [];
      const courses = await actor.getAllCoursesWithVideos();
      
      // Fetch real-time YouTube videos for each course
      const coursesWithLiveVideos = await Promise.all(
        courses.map(async (course) => {
          // Use course title as search query for educational videos
          const searchQuery = `${course.title} tutorial programming`;
          const liveVideos = await fetchYouTubeVideos(searchQuery, 3);
          
          // Combine backend videos with live fetched videos
          const allVideos = [...course.youtubeVideos, ...liveVideos];
          
          return {
            ...course,
            youtubeVideos: allVideos,
          };
        })
      );
      
      return coursesWithLiveVideos;
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useGetCourseWithVideos(courseId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<CourseWithVideos | null>({
    queryKey: ['courseWithVideos', courseId],
    queryFn: async () => {
      if (!actor) return null;
      const course = await actor.getCourseWithVideos(courseId);
      
      if (!course) return null;
      
      // Fetch real-time YouTube videos for this course
      const searchQuery = `${course.title} tutorial programming`;
      const liveVideos = await fetchYouTubeVideos(searchQuery, 3);
      
      return {
        ...course,
        youtubeVideos: [...course.youtubeVideos, ...liveVideos],
      };
    },
    enabled: !!actor && !isFetching && !!courseId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useSearchCourses(searchText: string) {
  const { actor, isFetching } = useActor();

  return useQuery<CourseWithVideos[]>({
    queryKey: ['searchCourses', searchText],
    queryFn: async () => {
      if (!actor) return [];
      const courses = await actor.searchCourses(searchText);
      
      // Convert T__1[] to CourseWithVideos[] by fetching questions for each course
      const coursesWithQuestions = await Promise.all(
        courses.map(async (course) => {
          const questions = await actor.getCourseQuestions(course.id);
          const searchQuery = `${course.title} tutorial programming`;
          const liveVideos = await fetchYouTubeVideos(searchQuery, 3);
          
          return {
            ...course,
            youtubeVideos: [...course.youtubeVideos, ...liveVideos],
            questions,
          };
        })
      );
      
      return coursesWithQuestions;
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useGetAllYoutubeVideos() {
  const { actor, isFetching } = useActor();

  return useQuery<T__3[]>({
    queryKey: ['allYoutubeVideos'],
    queryFn: async () => {
      if (!actor) return [];
      const backendVideos = await actor.getAllYoutubeVideos();
      
      // Fetch additional trending educational videos
      const trendingVideos = await fetchYouTubeVideos('programming tutorial educational', 10);
      
      return [...backendVideos, ...trendingVideos];
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

export function useGetYoutubeVideosForCourse(courseId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<T__3[]>({
    queryKey: ['youtubeVideos', courseId],
    queryFn: async () => {
      if (!actor) return [];
      const backendVideos = await actor.getYoutubeVideosForCourse(courseId);
      
      // Get course details to create better search query
      const course = await actor.getCourseWithVideos(courseId);
      if (course) {
        const searchQuery = `${course.title} tutorial programming`;
        const liveVideos = await fetchYouTubeVideos(searchQuery, 5);
        return [...backendVideos, ...liveVideos];
      }
      
      return backendVideos;
    },
    enabled: !!actor && !isFetching && !!courseId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Fetch YouTube videos by custom search query
export function useFetchYouTubeVideosByQuery(searchQuery: string, maxResults: number = 5) {
  return useQuery<T__3[]>({
    queryKey: ['youtubeSearch', searchQuery, maxResults],
    queryFn: async () => {
      if (!searchQuery) return [];
      return fetchYouTubeVideos(searchQuery, maxResults);
    },
    enabled: !!searchQuery,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

export function useGetCourseCredits(courseId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint | null>({
    queryKey: ['courseCredits', courseId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCourseCredits(courseId);
    },
    enabled: !!actor && !isFetching && !!courseId,
  });
}

export function useGetTotalCredits() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['totalCredits'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTotalCredits();
    },
    enabled: !!actor && !isFetching,
  });
}

// Quiz Operations
export function useStartQuiz() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.startQuiz(courseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizProgress'] });
    },
  });
}

export function useSubmitQuizAnswer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answer: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitQuizAnswer(answer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizProgress'] });
    },
  });
}

export function useCompleteQuiz() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.completeQuiz();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizProgress'] });
      queryClient.invalidateQueries({ queryKey: ['performanceStats'] });
      queryClient.invalidateQueries({ queryKey: ['totalCredits'] });
    },
  });
}

export function useGetQuizProgress() {
  const { actor, isFetching } = useActor();

  return useQuery<QuizProgressData | null>({
    queryKey: ['quizProgress'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getQuizProgress();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCourseQuestions(courseId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<T[]>({
    queryKey: ['courseQuestions', courseId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCourseQuestions(courseId);
    },
    enabled: !!actor && !isFetching && !!courseId,
  });
}

// Performance Stats
export function useGetUserPerformanceStats() {
  const { actor, isFetching } = useActor();

  return useQuery<T__5>({
    queryKey: ['performanceStats'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPerformanceStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// Consistency Tracking
export function useRecordDailyEngagement() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordDailyEngagement(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consistencyCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetConsistencyCalendar() {
  const { actor, isFetching } = useActor();

  return useQuery<T__6[] | null>({
    queryKey: ['consistencyCalendar'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getConsistencyCalendar();
    },
    enabled: !!actor && !isFetching,
  });
}

// Notes
export function useAddNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addNote(note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useGetNotes() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['notes'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotes();
    },
    enabled: !!actor && !isFetching,
  });
}

// Admin check
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}
