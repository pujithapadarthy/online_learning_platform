import { useState } from 'react';
import { useGetCourseCredits } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Award, Video, ExternalLink, ChevronDown, ChevronUp, FileText, PlayCircle, MessageCircle } from 'lucide-react';
import type { CourseWithVideos } from '../backend';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import QuizInterface from './QuizInterface';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CourseCardProps {
  course: CourseWithVideos;
  onAskGemini?: (question: string, courseId: string) => void;
}

export default function CourseCard({ course, onAskGemini }: CourseCardProps) {
  const [showVideos, setShowVideos] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const { data: courseCredits } = useGetCourseCredits(course.id);

  const difficultyLabel =
    ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'][Number(course.difficulty)] || 'Unknown';
  const credits = courseCredits ? Number(courseCredits) : Number(course.credits);
  
  // Use videos directly from course object (includes both backend and live-fetched videos)
  const courseVideos = course.youtubeVideos || [];
  const hasVideos = courseVideos.length > 0;
  const hasMaterials = course.materials && course.materials.length > 0;
  const hasQuestions = course.questions && course.questions.length > 0;

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

  const handleAskGemini = () => {
    if (onAskGemini) {
      onAskGemini(`Can you explain ${course.title} and help me understand the key concepts?`, course.id);
    }
  };

  const handleAskAboutVideo = (videoTitle: string) => {
    if (onAskGemini) {
      onAskGemini(`Can you explain the key concepts from the video "${videoTitle}" in the ${course.title} course?`, course.id);
    }
  };

  return (
    <>
      <Card className="transition-all hover:shadow-lg">
        <CardHeader>
          <div className="mb-2 flex items-center justify-between">
            <Badge variant="secondary">{difficultyLabel}</Badge>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle>{course.title}</CardTitle>
          <CardDescription>{course.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4 text-green-500" />
            <span className="font-medium">{credits} Credits</span>
          </div>

          {/* Ask Gemini Button */}
          <Button 
            variant="outline" 
            className="w-full border-primary/50 hover:bg-primary/5"
            onClick={handleAskGemini}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Ask Gemini about this course
          </Button>

          {/* Course Materials Section */}
          {hasMaterials && (
            <Collapsible open={showMaterials} onOpenChange={setShowMaterials}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  {showMaterials ? 'Hide' : 'Show'} Course Materials ({course.materials.length})
                  {showMaterials ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {course.materials.map((material, idx) => (
                  <div key={idx} className="rounded-lg border bg-muted/30 p-4">
                    <h4 className="mb-2 font-semibold text-sm">{material.title}</h4>
                    <div className="space-y-2">
                      {material.content.map((item, itemIdx) => (
                        <p key={itemIdx} className="text-sm text-muted-foreground">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Videos Section - Shows ALL associated videos */}
          {hasVideos && (
            <Collapsible open={showVideos} onOpenChange={setShowVideos}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Video className="mr-2 h-4 w-4" />
                  {showVideos ? 'Hide' : 'Show'} Course Videos ({courseVideos.length})
                  {showVideos ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {courseVideos.map((video, idx) => (
                  <div key={idx} className="overflow-hidden rounded-lg border bg-muted/30">
                    <div className="aspect-video w-full">
                      <iframe
                        src={getYouTubeEmbedUrl(video.url)}
                        title={video.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="mb-1 font-semibold text-sm line-clamp-1">{video.title}</h4>
                      <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                      <div className="flex items-center gap-2">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-primary hover:underline"
                        >
                          Watch on YouTube
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-7 text-xs"
                          onClick={() => handleAskAboutVideo(video.title)}
                        >
                          <MessageCircle className="mr-1 h-3 w-3" />
                          Ask Gemini
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Take Quiz Button */}
          {hasQuestions && (
            <Button onClick={() => setShowQuiz(true)} className="w-full" variant="default">
              <PlayCircle className="mr-2 h-4 w-4" />
              Take Quiz ({course.questions.length} questions)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quiz Dialog */}
      <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{course.title} - Quiz</DialogTitle>
          </DialogHeader>
          <QuizInterface 
            courseId={course.id} 
            onClose={() => setShowQuiz(false)}
            onAskGemini={onAskGemini}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
