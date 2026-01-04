import { useEffect, useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import Header from './components/Header';
import Footer from './components/Footer';
import OnboardingFlow from './components/OnboardingFlow';
import Dashboard from './pages/Dashboard';
import LoadingScreen from './components/LoadingScreen';
import FloatingChatbot from './components/FloatingChatbot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Sparkles, TrendingUp, Award } from 'lucide-react';

function App() {
  const { login, loginStatus, identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const [chatbotQuestion, setChatbotQuestion] = useState<string>('');
  const [chatbotCourseId, setChatbotCourseId] = useState<string>('');

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;
  const showDashboard = isAuthenticated && !profileLoading && userProfile !== null;

  const handleAskGemini = (question: string, courseId?: string) => {
    setChatbotQuestion(question);
    if (courseId) {
      setChatbotCourseId(courseId);
    }
  };

  const clearChatbotQuestion = () => {
    setChatbotQuestion('');
    setChatbotCourseId('');
  };

  if (isLoggingIn || (isAuthenticated && profileLoading)) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {!isAuthenticated ? (
          <LandingPage onLogin={login} />
        ) : showProfileSetup ? (
          <OnboardingFlow />
        ) : showDashboard ? (
          <Dashboard onAskGemini={handleAskGemini} />
        ) : (
          <LoadingScreen />
        )}
      </main>
      <Footer />
      {isAuthenticated && (
        <FloatingChatbot 
          prefilledQuestion={chatbotQuestion}
          courseId={chatbotCourseId}
          onQuestionProcessed={clearChatbotQuestion}
        />
      )}
    </div>
  );
}

function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="mb-16 text-center">
        <div className="mb-8 flex justify-center">
          <img
            src="/assets/generated/hero-banner.dim_1200x600.png"
            alt="Personalized Learning Platform"
            className="max-w-4xl rounded-2xl shadow-2xl"
          />
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Your Personalized Learning Journey Starts Here
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          Experience AI-powered education with dynamic course recommendations, gamification, and your personal Gemini AI mentor.
        </p>
        <Button onClick={onLogin} size="lg" className="text-lg px-8 py-6">
          <GraduationCap className="mr-2 h-6 w-6" />
          Start Learning Now
        </Button>
      </div>

      {/* Features Grid */}
      <div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Gemini AI Mentor</CardTitle>
            <CardDescription>
              Get personalized guidance, doubt clarification, and contextual answers from your AI mentor available 24/7.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Dynamic Recommendations</CardTitle>
            <CardDescription>
              Receive personalized course suggestions based on your performance, interests, and learning goals.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Gamification & Rewards</CardTitle>
            <CardDescription>
              Earn stars, badges, and credits as you progress. Track your consistency and celebrate achievements.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Transform Your Learning?</h2>
          <p className="mb-6 max-w-xl text-muted-foreground">
            Join thousands of learners who are achieving their goals with personalized AI-powered education.
          </p>
          <Button onClick={onLogin} size="lg" className="text-lg px-8 py-6">
            Get Started for Free
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
