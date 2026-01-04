import { useEffect, useState } from 'react';
import {
  useGetCallerUserProfile,
  useGetAllCoursesWithVideos,
  useGetUserPerformanceStats,
  useGetConsistencyCalendar,
  useGetNotes,
  useGetTotalCredits,
  useRecordDailyEngagement,
  useSearchCourses,
  useGetAllYoutubeVideos,
  useIsCallerAdmin,
  usePopulateCourses,
} from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Trophy, Star, Award, TrendingUp, Video, FileText, Calendar, Download, Search, ExternalLink, RefreshCw } from 'lucide-react';
import CourseCard from '../components/CourseCard';
import LoadingScreen from '../components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DashboardProps {
  onAskGemini?: (question: string, courseId?: string) => void;
}

export default function Dashboard({ onAskGemini }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const { data: courses, isLoading: coursesLoading } = useGetAllCoursesWithVideos();
  const { data: searchResults, isLoading: searchLoading } = useSearchCourses(searchQuery);
  const { data: allYoutubeVideos } = useGetAllYoutubeVideos();
  const { data: stats } = useGetUserPerformanceStats();
  const { data: consistencyData } = useGetConsistencyCalendar();
  const { data: notes } = useGetNotes();
  const { data: totalCredits } = useGetTotalCredits();
  const { data: isAdmin } = useIsCallerAdmin();
  const { mutate: recordEngagement } = useRecordDailyEngagement();
  const { mutate: populateCourses, isPending: isPopulating } = usePopulateCourses();

  // Record daily engagement on dashboard load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    recordEngagement(today);
  }, []);

  // Auto-populate courses if admin and no courses exist
  useEffect(() => {
    if (isAdmin && courses && courses.length === 0 && !isPopulating) {
      toast.info('Initializing course catalog...');
      populateCourses(undefined, {
        onSuccess: () => {
          toast.success('Course catalog populated successfully!');
        },
        onError: (error) => {
          console.error('Failed to populate courses:', error);
          toast.error('Failed to populate courses. Please try again.');
        },
      });
    }
  }, [isAdmin, courses, isPopulating]);

  if (profileLoading || coursesLoading) {
    return <LoadingScreen />;
  }

  const totalStars = stats ? Number(stats.stars) : 0;
  const totalBadges = stats ? stats.badges.length : 0;
  const credits = totalCredits ? Number(totalCredits) : 0;
  const consistency = userProfile ? Number(userProfile.consistency) : 0;

  // Determine which courses to display
  const displayedCourses = searchQuery.trim() ? searchResults : courses;
  const isSearching = searchQuery.trim().length > 0;

  // Get recommended videos from all courses
  const recommendedVideos = allYoutubeVideos?.slice(0, 6) || [];

  // Extract YouTube video ID from URL for embedding
  const getYouTubeEmbedUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    } catch {
      return url;
    }
  };

  const handlePopulateCourses = () => {
    populateCourses(undefined, {
      onSuccess: () => {
        toast.success('Course catalog refreshed successfully!');
      },
      onError: (error) => {
        console.error('Failed to populate courses:', error);
        toast.error('Failed to refresh courses. Please try again.');
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Welcome back, {userProfile?.name}! 👋</h1>
          <p className="text-muted-foreground">Continue your personalized learning journey</p>
        </div>
        {isAdmin && (
          <Button
            onClick={handlePopulateCourses}
            disabled={isPopulating}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isPopulating ? 'animate-spin' : ''}`} />
            {isPopulating ? 'Populating...' : 'Refresh Courses'}
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stars</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStars}</div>
            <p className="text-xs text-muted-foreground">Earned from activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Badges</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBadges}</div>
            <p className="text-xs text-muted-foreground">Achievements unlocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credits}</div>
            <p className="text-xs text-muted-foreground">Learning credits earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consistency}</div>
            <p className="text-xs text-muted-foreground">Days of learning</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="courses">
            <BookOpen className="mr-2 h-4 w-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="mr-2 h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="mr-2 h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="mr-2 h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {isSearching ? 'Search Results' : 'Available Courses'}
              </h2>
              {courses && courses.length > 0 && (
                <Badge variant="secondary">{courses.length} courses available</Badge>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search courses by title, description, or video topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Course Results */}
            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Searching courses...</p>
                </div>
              </div>
            ) : displayedCourses && displayedCourses.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} onAskGemini={onAskGemini} />
                ))}
              </div>
            ) : isSearching ? (
              <Card>
                <CardContent className="flex min-h-[200px] items-center justify-center">
                  <div className="text-center">
                    <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">No courses found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search terms or browse all courses
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex min-h-[200px] items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">Loading courses...</p>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin ? 'Initializing course catalog...' : 'Courses will appear here once they are added to the platform.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Your learning statistics and trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Quizzes Completed</span>
                      <span className="font-medium">{Number(stats.totalQuizzes)}</span>
                    </div>
                    <Progress value={Math.min(Number(stats.totalQuizzes) * 10, 100)} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average Score</span>
                      <span className="font-medium">{Number(stats.averageScore)}%</span>
                    </div>
                    <Progress value={Number(stats.averageScore)} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="font-medium">{Number(stats.successRate)}%</span>
                    </div>
                    <Progress value={Number(stats.successRate)} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Learning Consistency</span>
                      <span className="font-medium">{consistency} days</span>
                    </div>
                    <Progress value={Math.min(consistency * 2, 100)} />
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <p>No performance data yet. Start taking quizzes to see your stats!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consistency Calendar</CardTitle>
              <CardDescription>Your daily learning engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center rounded-lg border bg-muted/50 p-8">
                <img
                  src="/assets/generated/consistency-calendar.dim_400x300.png"
                  alt="Consistency Calendar"
                  className="max-w-full"
                />
              </div>
              {consistencyData && consistencyData.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Total active days: {consistencyData.length}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Videos</CardTitle>
              <CardDescription>Educational YouTube content from all courses</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendedVideos.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendedVideos.map((video, idx) => (
                    <div key={idx} className="overflow-hidden rounded-lg border transition-all hover:shadow-lg">
                      <div className="aspect-video w-full">
                        <iframe
                          src={getYouTubeEmbedUrl(video.url)}
                          title={video.title}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="mb-2 font-semibold line-clamp-2">{video.title}</h3>
                        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          Watch on YouTube
                          <ExternalLink className="ml-1 h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Video className="mx-auto mb-4 h-12 w-12" />
                  <p>No videos available yet. Videos will appear here once courses are added.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Notes</CardTitle>
              <CardDescription>Your personalized study materials and notes</CardDescription>
            </CardHeader>
            <CardContent>
              {notes && notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note, idx) => (
                    <div key={idx} className="rounded-lg border bg-muted/50 p-4">
                      <p className="text-sm">{note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="mx-auto mb-4 h-12 w-12" />
                  <p>No notes yet. Your AI mentor will generate personalized notes as you learn.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>Badges and milestones you've earned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats && stats.badges.length > 0 ? (
                  stats.badges.map((badge, idx) => (
                    <AchievementBadge
                      key={idx}
                      icon="/assets/generated/trophy-badge-transparent.dim_64x64.png"
                      title={badge}
                      description="Achievement unlocked"
                      locked={false}
                    />
                  ))
                ) : (
                  <>
                    <AchievementBadge
                      icon="/assets/generated/trophy-badge-transparent.dim_64x64.png"
                      title="First Steps"
                      description="Complete your first quiz"
                      locked={true}
                    />
                    <AchievementBadge
                      icon="/assets/generated/star-icon-transparent.dim_64x64.png"
                      title="Rising Star"
                      description="Earn 100 stars"
                      locked={true}
                    />
                    <AchievementBadge
                      icon="/assets/generated/certificate-template.dim_800x600.png"
                      title="Certified"
                      description="Complete your first course"
                      locked={true}
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>Your earned certifications</CardDescription>
            </CardHeader>
            <CardContent>
              {userProfile && Number(userProfile.completedCourses) > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Course Completion Certificate</h3>
                        <p className="text-sm text-muted-foreground">
                          Performance: {stats ? Number(stats.averageScore) : 0}% | Credits: {credits} | Consistency:{' '}
                          {consistency} days
                        </p>
                      </div>
                      <Button size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                    <img
                      src="/assets/generated/certificate-template.dim_800x600.png"
                      alt="Certificate"
                      className="w-full rounded-lg border"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Award className="mx-auto mb-4 h-12 w-12" />
                  <p>Complete courses to earn certificates that showcase your achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AchievementBadge({
  icon,
  title,
  description,
  locked,
}: {
  icon: string;
  title: string;
  description: string;
  locked: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${locked ? 'opacity-50 grayscale' : ''}`}>
      <div className="mb-3 flex items-center justify-center">
        <img src={icon} alt={title} className="h-16 w-16 object-contain" />
      </div>
      <h3 className="mb-1 text-center font-semibold">{title}</h3>
      <p className="text-center text-sm text-muted-foreground">{description}</p>
      {locked && (
        <Badge variant="secondary" className="mt-2 w-full justify-center">
          Locked
        </Badge>
      )}
    </div>
  );
}
