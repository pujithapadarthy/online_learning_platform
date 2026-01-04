import { useState } from 'react';
import { useSaveOnboardingProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const PREFERENCES = [
  'Video Tutorials',
  'Interactive Quizzes',
  'Reading Materials',
  'Hands-on Projects',
  'Live Sessions',
  'Self-paced Learning',
];

const GOALS = [
  'Career Advancement',
  'Skill Development',
  'Personal Growth',
  'Certification',
  'Academic Excellence',
  'Hobby Learning',
];

const INTERESTS = [
  'Programming',
  'Data Science',
  'Web Development',
  'Mobile Development',
  'Machine Learning',
  'Design',
  'Business',
  'Marketing',
  'Languages',
  'Mathematics',
];

const LEARNING_STYLES = [
  { value: 'Visual', desc: 'Learn best through images, diagrams, and videos' },
  { value: 'Auditory', desc: 'Learn best through listening and discussion' },
  { value: 'Reading/Writing', desc: 'Learn best through reading and taking notes' },
  { value: 'Kinesthetic', desc: 'Learn best through hands-on practice' },
];

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    preferences: [] as string[],
    goals: [] as string[],
    interests: [] as string[],
    skillLevel: 1,
    learningStyle: '',
  });

  const { mutate: saveProfile, isPending } = useSaveOnboardingProfile();

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.interests.length === 0) {
      toast.error('Please select at least one interest');
      return;
    }

    if (!formData.learningStyle) {
      toast.error('Please select a learning style');
      return;
    }

    saveProfile(
      {
        name: formData.name,
        email: formData.email,
        preferences: formData.preferences,
        goals: formData.goals,
        interests: formData.interests,
        skillLevel: BigInt(formData.skillLevel),
        learningStyle: formData.learningStyle,
      },
      {
        onSuccess: () => {
          toast.success('Profile created successfully! Welcome to your personalized learning journey!');
        },
        onError: (error) => {
          toast.error(`Failed to create profile: ${error.message}`);
        },
      }
    );
  };

  const togglePreference = (pref: string) => {
    setFormData((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter((p) => p !== pref)
        : [...prev.preferences, pref],
    }));
  };

  const toggleGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }));
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Welcome to LearnHub!</h1>
        <p className="text-muted-foreground">Let's personalize your learning experience</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-1 items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 5 && <div className={`h-1 flex-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Basic Information'}
            {step === 2 && 'Your Interests'}
            {step === 3 && 'Learning Preferences'}
            {step === 4 && 'Your Goals'}
            {step === 5 && 'Capabilities & Learning Style'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Tell us about yourself'}
            {step === 2 && 'What topics interest you?'}
            {step === 3 && 'How do you prefer to learn?'}
            {step === 4 && 'What do you want to achieve?'}
            {step === 5 && 'Rate your current skill level and learning style'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select topics you're interested in learning about</p>
              <div className="grid grid-cols-2 gap-4">
                {INTERESTS.map((interest) => (
                  <div key={interest} className="flex items-center space-x-2">
                    <Checkbox
                      id={interest}
                      checked={formData.interests.includes(interest)}
                      onCheckedChange={() => toggleInterest(interest)}
                    />
                    <Label htmlFor={interest} className="cursor-pointer font-normal">
                      {interest}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose your preferred learning methods</p>
              {PREFERENCES.map((pref) => (
                <div key={pref} className="flex items-center space-x-2">
                  <Checkbox
                    id={pref}
                    checked={formData.preferences.includes(pref)}
                    onCheckedChange={() => togglePreference(pref)}
                  />
                  <Label htmlFor={pref} className="cursor-pointer font-normal">
                    {pref}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">What are your learning objectives?</p>
              {GOALS.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal}
                    checked={formData.goals.includes(goal)}
                    onCheckedChange={() => toggleGoal(goal)}
                  />
                  <Label htmlFor={goal} className="cursor-pointer font-normal">
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Current Skill Level</Label>
                {[
                  { level: 1, label: 'Beginner', desc: 'Just starting out' },
                  { level: 2, label: 'Intermediate', desc: 'Some experience' },
                  { level: 3, label: 'Advanced', desc: 'Experienced learner' },
                  { level: 4, label: 'Expert', desc: 'Highly skilled' },
                ].map(({ level, label, desc }) => (
                  <div
                    key={level}
                    onClick={() => setFormData({ ...formData, skillLevel: level })}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      formData.skillLevel === level
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-semibold">{label}</div>
                    <div className="text-sm text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <Label>Learning Style</Label>
                {LEARNING_STYLES.map(({ value, desc }) => (
                  <div
                    key={value}
                    onClick={() => setFormData({ ...formData, learningStyle: value })}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      formData.learningStyle === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-semibold">{value}</div>
                    <div className="text-sm text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Creating Profile...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
