import { useState, useEffect } from 'react';
import { useStartQuiz, useSubmitQuizAnswer, useCompleteQuiz, useGetQuizProgress } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Trophy, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface QuizInterfaceProps {
  courseId: string;
  onClose: () => void;
  onAskGemini?: (question: string, courseId: string) => void;
}

export default function QuizInterface({ courseId, onClose, onAskGemini }: QuizInterfaceProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const { mutate: startQuiz, isPending: isStarting } = useStartQuiz();
  const { mutate: submitAnswer, isPending: isSubmitting } = useSubmitQuizAnswer();
  const { mutate: completeQuiz, isPending: isCompleting } = useCompleteQuiz();
  const { data: quizProgress, refetch: refetchProgress } = useGetQuizProgress();

  // Start quiz on mount
  useEffect(() => {
    startQuiz(courseId, {
      onSuccess: () => {
        refetchProgress();
      },
      onError: (error) => {
        console.error('Failed to start quiz:', error);
        toast.error('Failed to start quiz. Please try again.');
      },
    });
  }, [courseId]);

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) {
      toast.error('Please select an answer');
      return;
    }

    const currentQuestion = quizProgress?.currentQuestion;
    if (!currentQuestion) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setIsAnswerSubmitted(true);

    submitAnswer(selectedAnswer, {
      onSuccess: (data) => {
        if (correct) {
          toast.success('Correct! 🎉');
        } else {
          toast.error(`Incorrect. The correct answer was: ${currentQuestion.correctAnswer}`);
        }
        refetchProgress();
      },
      onError: (error) => {
        console.error('Failed to submit answer:', error);
        toast.error('Failed to submit answer. Please try again.');
        setIsAnswerSubmitted(false);
        setIsCorrect(null);
      },
    });
  };

  const handleNextQuestion = () => {
    setSelectedAnswer('');
    setIsAnswerSubmitted(false);
    setIsCorrect(null);
  };

  const handleCompleteQuiz = () => {
    completeQuiz(undefined, {
      onSuccess: (finalScore) => {
        const totalQuestions = quizProgress?.questions.length || 0;
        const percentage = totalQuestions > 0 ? Math.round((Number(finalScore) / totalQuestions) * 100) : 0;
        
        toast.success(`Quiz completed! Your score: ${finalScore}/${totalQuestions} (${percentage}%)`);
        onClose();
      },
      onError: (error) => {
        console.error('Failed to complete quiz:', error);
        toast.error('Failed to complete quiz. Please try again.');
      },
    });
  };

  const handleAskGeminiAboutQuestion = () => {
    const currentQuestion = quizProgress?.currentQuestion;
    if (currentQuestion && onAskGemini) {
      onAskGemini(`Can you help me understand this question: "${currentQuestion.questionText}"?`, courseId);
    }
  };

  if (isStarting || !quizProgress) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quizProgress.currentQuestion;
  const progress = quizProgress.questions.length > 0 
    ? (Number(quizProgress.progress) / quizProgress.questions.length) * 100 
    : 0;
  const isQuizComplete = !currentQuestion;

  if (isQuizComplete) {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
          <h2 className="mb-2 text-2xl font-bold">Quiz Complete!</h2>
          <p className="mb-4 text-muted-foreground">
            You've answered all questions. Click below to see your final score.
          </p>
          <div className="mb-6">
            <p className="text-lg">
              Current Score: <span className="font-bold text-primary">{Number(quizProgress.score)}</span> / {quizProgress.questions.length}
            </p>
          </div>
          <Button onClick={handleCompleteQuiz} disabled={isCompleting} size="lg">
            {isCompleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              'Complete Quiz & See Results'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Question {Number(quizProgress.progress) + 1} of {quizProgress.questions.length}
          </span>
          <span className="text-muted-foreground">
            Score: {Number(quizProgress.score)} / {quizProgress.questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center justify-between">
            <Badge variant="outline">
              Difficulty: {['', 'Easy', 'Medium', 'Hard', 'Expert'][Number(currentQuestion.difficulty)] || 'Unknown'}
            </Badge>
            {isAnswerSubmitted && (
              <Badge variant={isCorrect ? 'default' : 'destructive'}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Correct
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-4 w-4" />
                    Incorrect
                  </>
                )}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">{currentQuestion.questionText}</CardTitle>
          <CardDescription>Select the correct answer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ask Gemini Button */}
          {onAskGemini && (
            <Button 
              variant="outline" 
              className="w-full border-primary/50 hover:bg-primary/5"
              onClick={handleAskGeminiAboutQuestion}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Ask Gemini for help with this question
            </Button>
          )}

          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            disabled={isAnswerSubmitted}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = option === currentQuestion.correctAnswer;
              const showCorrect = isAnswerSubmitted && isCorrectAnswer;
              const showIncorrect = isAnswerSubmitted && isSelected && !isCorrect;

              return (
                <div
                  key={idx}
                  className={`flex items-center space-x-3 rounded-lg border p-4 transition-all ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : showIncorrect
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label
                    htmlFor={`option-${idx}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {option}
                  </Label>
                  {showCorrect && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {showIncorrect && <XCircle className="h-5 w-5 text-red-600" />}
                </div>
              );
            })}
          </RadioGroup>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {!isAnswerSubmitted ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer || isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </Button>
            ) : (
              <Button onClick={handleNextQuestion} size="lg">
                Next Question
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
