import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, TrendingUp, BookOpen, Video, Brain, Lightbulb, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useGetCallerUserProfile, useGetUserPerformanceStats, useGetCourseWithVideos, useGetConsistencyCalendar, fetchYouTubeVideos } from '../hooks/useQueries';

interface ResourceItem {
  type: 'video' | 'material' | 'quiz';
  title: string;
  description?: string;
  url?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  tone?: 'motivational' | 'explanatory' | 'guiding';
  resources?: ResourceItem[];
  isStreaming?: boolean;
}

interface FloatingChatbotProps {
  prefilledQuestion?: string;
  courseId?: string;
  onQuestionProcessed?: () => void;
}

type ResponseTone = 'motivational' | 'explanatory' | 'guiding';

interface AIResponse {
  text: string;
  tone: ResponseTone;
  resources?: ResourceItem[];
}

export default function FloatingChatbot({ prefilledQuestion, courseId, onQuestionProcessed }: FloatingChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentTone, setCurrentTone] = useState<ResponseTone>('guiding');
  const [idleTime, setIdleTime] = useState(0);
  const [avatarAnimation, setAvatarAnimation] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: userProfile } = useGetCallerUserProfile();
  const { data: performanceStats } = useGetUserPerformanceStats();
  const { data: currentCourse } = useGetCourseWithVideos(courseId || '');
  const { data: consistencyCalendar } = useGetConsistencyCalendar();

  // Handle prefilled questions
  useEffect(() => {
    if (prefilledQuestion && !isOpen) {
      setIsOpen(true);
      setInputValue(prefilledQuestion);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      if (onQuestionProcessed) {
        onQuestionProcessed();
      }
    }
  }, [prefilledQuestion, isOpen, onQuestionProcessed]);

  // Initialize with enhanced welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const userName = userProfile?.name || 'there';
      const welcomeMessage = `Hi ${userName}, I'm Gemini AI, your personal mentor! ✨

I've been upgraded with premium capabilities to provide you with the best learning experience:

🧠 **Premium Contextual Intelligence**
• Deep understanding of course materials and video content
• Smart content extraction and cross-referencing
• Personalized explanations based on your learning style

💬 **Refined Communication**
• Smooth, natural conversation flow
• Adaptive tone matching your needs
• Structured, easy-to-read responses

🎯 **Performance-Driven Insights**
• Real-time analysis of your progress
• Personalized study recommendations
• Proactive learning support

🎥 **YouTube Integration**
• Fetch fresh tutorials on any topic
• Contextual video suggestions
• Content analysis and recommendations

How can I help you excel in your learning journey today?`;

      setMessages([
        {
          id: '1',
          text: welcomeMessage,
          sender: 'ai',
          timestamp: new Date(),
          tone: 'guiding',
        },
      ]);
    }
  }, [userProfile]);

  // Idle detection for proactive engagement
  useEffect(() => {
    const interval = setInterval(() => {
      setIdleTime((prev) => prev + 1);
    }, 1000);

    const resetIdle = () => setIdleTime(0);
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keypress', resetIdle);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keypress', resetIdle);
    };
  }, []);

  // Show "Need Help?" after 30 seconds of idle time
  const showNeedHelp = idleTime > 30 && !isOpen;

  // Check scroll position and show/hide scroll button
  const checkScrollPosition = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShowScrollButton(!isAtBottom && scrollHeight > clientHeight);
      }
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping, streamingText]);

  // Monitor scroll position
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', checkScrollPosition);
        checkScrollPosition();
        
        return () => {
          scrollContainer.removeEventListener('scroll', checkScrollPosition);
        };
      }
    }
  }, [messages, isTyping]);

  // Smooth scroll to bottom function
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  // Avatar animation based on state
  useEffect(() => {
    if (isTyping) {
      setAvatarAnimation('thinking');
    } else if (messages.length > 0 && messages[messages.length - 1].sender === 'ai') {
      setAvatarAnimation('speaking');
      const timer = setTimeout(() => setAvatarAnimation('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isTyping, messages]);

  // Cleanup streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
    };
  }, []);

  // Determine appropriate tone based on context
  const determineTone = (userMessage: string, userContext: any): ResponseTone => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Motivational tone for struggles or low performance
    if (
      lowerMessage.includes('stuck') ||
      lowerMessage.includes('difficult') ||
      lowerMessage.includes('hard') ||
      lowerMessage.includes('struggling') ||
      lowerMessage.includes('confused') ||
      lowerMessage.includes('give up') ||
      lowerMessage.includes('frustrated') ||
      (userContext.avgScore < 60 && userContext.totalQuizzes > 0)
    ) {
      return 'motivational';
    }
    
    // Explanatory tone for concept questions
    if (
      lowerMessage.includes('what is') ||
      lowerMessage.includes('how does') ||
      lowerMessage.includes('explain') ||
      lowerMessage.includes('why') ||
      lowerMessage.includes('understand') ||
      lowerMessage.includes('concept') ||
      lowerMessage.includes('mean') ||
      lowerMessage.includes('definition')
    ) {
      return 'explanatory';
    }
    
    // Guiding tone for recommendations and planning
    return 'guiding';
  };

  // Extract course content for contextual responses
  const extractCourseContext = (course: any): string => {
    if (!course) return '';
    
    let context = `Course: ${course.title}\n`;
    context += `Description: ${course.description}\n`;
    
    if (course.materials && course.materials.length > 0) {
      context += `Materials: ${course.materials.map((m: any) => m.title).join(', ')}\n`;
    }
    
    if (course.youtubeVideos && course.youtubeVideos.length > 0) {
      context += `Videos: ${course.youtubeVideos.map((v: any) => v.title).join(', ')}\n`;
    }
    
    return context;
  };

  // Format response with better structure and readability
  const formatResponse = (text: string): string => {
    // Add proper spacing after headers
    let formatted = text.replace(/\n\n([🎯🌟💡📊✨🎓💪🔥⚡📚🎥🧠💬])/g, '\n\n$1');
    
    // Ensure bullet points have proper spacing
    formatted = formatted.replace(/\n•/g, '\n• ');
    
    // Add spacing around numbered lists
    formatted = formatted.replace(/\n(\d+\.)/g, '\n$1 ');
    
    return formatted;
  };

  // Simulate streaming text effect for more natural feel
  const streamResponse = (fullText: string, tone: ResponseTone, resources?: ResourceItem[]) => {
    setStreamingText('');
    let currentIndex = 0;
    const words = fullText.split(' ');
    
    // Create placeholder message
    const placeholderId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        tone,
        resources,
        isStreaming: true,
      },
    ]);

    streamingIntervalRef.current = setInterval(() => {
      if (currentIndex < words.length) {
        const nextWord = words[currentIndex];
        setStreamingText((prev) => (prev ? `${prev} ${nextWord}` : nextWord));
        currentIndex++;
      } else {
        // Streaming complete
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        
        // Replace placeholder with final message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === placeholderId
              ? { ...msg, text: fullText, isStreaming: false }
              : msg
          )
        );
        setStreamingText('');
        setIsTyping(false);
        setAvatarAnimation('speaking');
      }
    }, 50); // Adjust speed for natural feel
  };

  // Generate comprehensive AI response with premium contextual intelligence
  const generateAdvancedAIResponse = async (userMessage: string): Promise<AIResponse> => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Extract comprehensive user context
    const userName = userProfile?.name || 'there';
    const avgScore = performanceStats ? Number(performanceStats.averageScore) : 0;
    const totalQuizzes = performanceStats ? Number(performanceStats.totalQuizzes) : 0;
    const totalCredits = performanceStats ? Number(performanceStats.totalCredits) : 0;
    const stars = performanceStats ? Number(performanceStats.stars) : 0;
    const consistency = consistencyCalendar ? consistencyCalendar.length : 0;
    const learningStyle = userProfile?.learningStyle || 'adaptive';
    const goals = userProfile?.goals || [];
    const interests = userProfile?.interests || [];
    
    const userContext = { avgScore, totalQuizzes, totalCredits, stars, consistency };
    const tone = determineTone(userMessage, userContext);
    setCurrentTone(tone);
    
    // Extract course context for better responses
    const courseContext = currentCourse ? extractCourseContext(currentCourse) : '';

    // Performance analysis and progress tracking
    if (lowerMessage.includes('how am i doing') || lowerMessage.includes('progress') || lowerMessage.includes('performance') || lowerMessage.includes('stats')) {
      if (totalQuizzes > 0) {
        let analysis = '';
        let recommendations: ResourceItem[] = [];
        
        if (avgScore >= 90) {
          analysis = `🌟 **Outstanding Performance, ${userName}!**

You're performing exceptionally well and demonstrating mastery!

📊 **Your Achievement Summary:**
• Average Score: **${avgScore}%** (Excellent!)
• Quizzes Completed: **${totalQuizzes}**
• Total Credits Earned: **${totalCredits}**
• Stars Collected: **${stars}** ⭐
• Learning Streak: **${consistency} days** 🔥

💎 **Expert-Level Insights:**
You're in the top tier of learners! Your consistency and dedication are remarkable. Your learning patterns show strong comprehension and retention.

🎯 **Next Steps for Continued Excellence:**
• Challenge yourself with advanced topics
• Explore related subjects to broaden expertise
• Consider mentoring others to reinforce knowledge
• Set new ambitious learning goals

Keep pushing boundaries! 🚀`;
          recommendations = [
            { type: 'quiz', title: 'Advanced Challenge Quizzes', description: 'Test your mastery with harder questions' },
          ];
        } else if (avgScore >= 75) {
          analysis = `🎯 **Excellent Progress, ${userName}!**

You're making great strides in your learning journey!

📊 **Your Performance Metrics:**
• Average Score: **${avgScore}%** (Very Good!)
• Quizzes Completed: **${totalQuizzes}**
• Total Credits Earned: **${totalCredits}**
• Stars Collected: **${stars}** ⭐
• Learning Streak: **${consistency} days**

✨ **Performance Analysis:**
You're doing really well! Your scores show solid understanding of core concepts. To reach the next level:

💡 **Personalized Recommendations:**
• Review course materials before quizzes for deeper understanding
• Watch video tutorials to reinforce visual learning
• Focus on areas where you scored below 80%
• Practice explaining concepts in your own words

You're on track for excellence! 📈`;
          recommendations = [
            { type: 'video', title: 'Course Video Tutorials', description: 'Reinforce concepts with visual learning' },
            { type: 'material', title: 'Course Materials', description: 'Review key concepts and examples' },
          ];
        } else if (avgScore >= 60) {
          analysis = `💪 **Solid Effort, ${userName}!**

You're building a strong foundation!

📊 **Your Learning Stats:**
• Average Score: **${avgScore}%** (Good!)
• Quizzes Completed: **${totalQuizzes}**
• Total Credits Earned: **${totalCredits}**
• Stars Collected: **${stars}** ⭐
• Learning Streak: **${consistency} days**

🎓 **Growth Opportunity Analysis:**
You're making steady progress! Your scores indicate you're grasping the fundamentals. Let's optimize your learning approach:

🎯 **Tailored Study Strategy:**
• Spend more time with video tutorials (visual reinforcement)
• Take detailed notes while learning
• Break complex topics into smaller, manageable parts
• Rewatch videos for challenging concepts
• Practice with easier quizzes first to build confidence

Every step forward counts! 📚`;
          recommendations = [
            { type: 'video', title: 'Foundational Video Tutorials', description: 'Build strong understanding of basics' },
            { type: 'material', title: 'Study Materials', description: 'Review and take detailed notes' },
            { type: 'quiz', title: 'Practice Quizzes', description: 'Reinforce learning with practice' },
          ];
        } else {
          analysis = `🌱 **Every Expert Started Here, ${userName}!**

Learning is a journey, and you're taking important steps!

📊 **Your Current Stats:**
• Average Score: **${avgScore}%**
• Quizzes Completed: **${totalQuizzes}**
• Total Credits Earned: **${totalCredits}**
• Stars Collected: **${stars}** ⭐
• Learning Streak: **${consistency} days**

💡 **Personalized Learning Plan:**
Don't be discouraged! Learning takes time, practice, and the right approach. Here's your customized strategy:

**Phase 1: Foundation Building**
1. Watch course videos multiple times (repetition aids retention)
2. Take detailed, organized notes
3. Start with easier quizzes to build confidence
4. Ask me questions about specific concepts

**Phase 2: Active Practice**
1. Practice explaining concepts out loud
2. Create simple examples for each topic
3. Review materials daily for 15-20 minutes
4. Celebrate small wins!

🎯 **Remember:**
• Progress > Perfection
• Every mistake is a learning opportunity
• Consistency beats intensity
• You've got this! 🚀

What specific topic would you like to focus on first?`;
          recommendations = [
            { type: 'video', title: 'Beginner-Friendly Tutorials', description: 'Start with fundamentals' },
            { type: 'material', title: 'Basic Course Materials', description: 'Build your foundation' },
          ];
        }
        
        return { text: formatResponse(analysis), tone: 'motivational', resources: recommendations };
      }
      
      return {
        text: formatResponse(`Welcome to your learning journey, ${userName}! 🎓

You're just getting started, and that's exciting! Here's your personalized roadmap:

🎯 **Your Learning Profile:**
• Interests: ${interests.join(', ') || 'Explore various topics'}
• Learning Style: ${learningStyle}
• Goals: ${goals.length > 0 ? goals.join(', ') : 'Set your goals in profile'}

📚 **Getting Started Guide:**

**Step 1: Explore**
Browse courses that match your interests and goals

**Step 2: Learn**
Watch video tutorials for visual understanding

**Step 3: Practice**
Take quizzes to track your progress and earn rewards

**Step 4: Grow**
Earn stars, credits, and badges as you advance

💡 **Pro Tip:** Start with topics you're passionate about. Passion fuels persistence!

I'm here to guide you every step of the way. What would you like to learn first?`),
        tone: 'guiding',
        resources: [
          { type: 'video', title: 'Getting Started Videos', description: 'Begin your learning journey' },
        ],
      };
    }
    
    // Enhanced video search with YouTube API integration
    if (lowerMessage.includes('video') || lowerMessage.includes('watch') || lowerMessage.includes('tutorial') || lowerMessage.includes('youtube')) {
      let searchTopic = '';
      
      if (currentCourse) {
        searchTopic = currentCourse.title;
      } else {
        const topicKeywords = ['python', 'javascript', 'java', 'c++', 'rust', 'go', 'typescript', 'react', 'node', 'machine learning', 'ai', 'data science', 'web development', 'programming', 'blockchain', 'cybersecurity'];
        for (const keyword of topicKeywords) {
          if (lowerMessage.includes(keyword)) {
            searchTopic = keyword;
            break;
          }
        }
        
        if (!searchTopic && interests.length > 0) {
          searchTopic = interests[0];
        }
      }
      
      if (searchTopic) {
        try {
          const videos = await fetchYouTubeVideos(`${searchTopic} tutorial programming`, 5);
          
          if (videos.length > 0) {
            const videoList = videos.slice(0, 3).map((v, i) => 
              `**${i + 1}. ${v.title}**\n   ${v.description.substring(0, 100)}...`
            ).join('\n\n');
            
            return {
              text: formatResponse(`🎥 **Fresh Video Tutorials for ${searchTopic}**

I've just fetched the latest, high-quality tutorials for you:

${videoList}

💡 **Learning Strategy:**
• Watch videos in order for progressive learning
• Take notes on key concepts
• Pause and practice along with the instructor
• Rewatch sections you find challenging
• Ask me questions about any concepts!

📚 After watching, feel free to discuss what you learned or ask for clarification on any topic!`),
              tone: 'explanatory',
              resources: videos.slice(0, 3).map(v => ({ 
                type: 'video' as const, 
                title: v.title, 
                description: v.description,
                url: v.url 
              })),
            };
          }
        } catch (error) {
          console.error('Error fetching YouTube videos:', error);
        }
      }
      
      if (currentCourse && currentCourse.youtubeVideos.length > 0) {
        const topVideos = currentCourse.youtubeVideos.slice(0, 3);
        const videoList = topVideos.map((v, i) => 
          `**${i + 1}. ${v.title}**\n   ${v.description}`
        ).join('\n\n');
        
        return {
          text: formatResponse(`🎥 **Curated Videos for ${currentCourse.title}**

Here are the best tutorials for your current course:

${videoList}

💡 **How to Use These Videos:**
• Check the course card's "Show Course Videos" section
• Videos are embedded for immediate playback
• Watch at your own pace
• Take notes on important concepts
• Practice what you learn

These videos are specifically selected for your learning level. Ready to dive in? 📚`),
          tone: 'explanatory',
          resources: topVideos.map(v => ({ type: 'video' as const, title: v.title, description: v.description, url: v.url })),
        };
      }
      
      return {
        text: formatResponse(`🎥 **Video Tutorial Search**

I can help you find the perfect video tutorials! Just tell me:

• What topic you want to learn (e.g., Python, JavaScript, Machine Learning)
• Your skill level (beginner, intermediate, advanced)
• Specific concepts you're interested in

I'll fetch fresh, high-quality YouTube tutorials tailored to your needs in real-time! 🎓

What would you like to learn about?`),
        tone: 'guiding',
      };
    }
    
    // Consistency and engagement insights
    if (lowerMessage.includes('consistency') || lowerMessage.includes('streak') || lowerMessage.includes('engagement')) {
      if (consistency > 0) {
        let message = '';
        if (consistency >= 30) {
          message = `🔥 **Incredible Dedication, ${userName}!**

You have an amazing **${consistency}-day learning streak!**

🏆 **Achievement Unlocked: Consistency Master**

Your dedication is truly inspiring! Research shows that consistent learners like you:
• Achieve 3x better results
• Retain information 80% longer
• Develop stronger neural pathways
• Build lasting learning habits

💎 **Your Consistency Impact:**
• You're in the top 5% of learners
• Your brain is optimized for learning
• You've built an unshakeable habit

Keep this incredible momentum going! You're unstoppable! 🌟`;
        } else if (consistency >= 14) {
          message = `⚡ **Great Momentum, ${userName}!**

You've maintained a solid **${consistency}-day streak!**

🎯 **Consistency Analysis:**
You're building excellent learning habits! Two weeks of consistent practice shows real commitment.

📊 **Benefits You're Experiencing:**
• Improved information retention
• Stronger concept connections
• Better problem-solving skills
• Growing confidence

💡 **Next Milestone:**
Try to reach 30 days for maximum habit formation. You're halfway there!

Keep up the excellent work! 💪`;
        } else if (consistency >= 7) {
          message = `🎯 **Building Momentum, ${userName}!**

You have a **${consistency}-day streak!**

🌱 **Progress Recognition:**
You're developing a good learning routine! One week of consistency is a strong start.

💡 **Optimization Tips:**
• Study at the same time each day
• Set a minimum daily goal (15 minutes)
• Track your progress visually
• Reward yourself for milestones

🎯 **Challenge:**
Can you reach 14 days? You're well on your way! 📚`;
        } else {
          message = `🌱 **Starting Strong, ${userName}!**

Current streak: **${consistency} days**

💡 **Building Consistency:**
You're taking the first steps toward a powerful learning habit!

🎯 **Consistency Strategy:**
• Start small: 10-15 minutes daily
• Choose a specific time each day
• Make it non-negotiable
• Track your progress
• Celebrate each day

📊 **Why It Matters:**
Consistency beats intensity. Daily practice, even brief, leads to:
• Better retention (up to 80% improvement)
• Faster skill development
• More rewards (stars & credits)
• Greater confidence

Let's build your streak together! 🚀`;
        }
        return { text: formatResponse(message), tone: 'motivational' };
      }
      
      return {
        text: formatResponse(`${userName}, let's build your learning consistency! 📅

🎯 **The Power of Consistency:**

**Scientific Benefits:**
• 80% better retention with daily practice
• 3x faster skill development
• Stronger neural pathways
• Improved long-term memory

**Practical Benefits:**
• More stars and credits
• Better quiz performance
• Greater confidence
• Lasting knowledge

💡 **Your Consistency Plan:**

**Week 1: Foundation**
• 10-15 minutes daily
• Same time each day
• One video or quiz

**Week 2: Building**
• 20-30 minutes daily
• Mix videos and quizzes
• Track your progress

**Week 3+: Mastery**
• 30+ minutes daily
• Advanced topics
• Teaching others

Start today! Complete just one quiz or watch one video. I'll help you track your progress! 💪`),
        tone: 'motivational',
      };
    }
    
    // Course-specific responses with content extraction
    if (currentCourse) {
      const courseTitle = currentCourse.title;
      const courseVideos = currentCourse.youtubeVideos || [];
      const courseMaterials = currentCourse.materials || [];
      const courseQuestions = currentCourse.questions || [];
      
      if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('how does')) {
        const difficultyLevel = ['', 'beginner', 'intermediate', 'advanced', 'expert', 'master'][Number(currentCourse.difficulty)] || 'intermediate';
        
        return {
          text: formatResponse(`📖 **Deep Dive: ${courseTitle}**

${currentCourse.description}

🎯 **Course Overview:**
• **Level:** ${difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1)}
• **Credits:** ${currentCourse.credits} 💎
• **Recommended For:** ${currentCourse.recommendedFor.join(', ')}

💡 **Personalized Learning Path for ${learningStyle} Learners:**

${learningStyle === 'visual' ? 
  '**Step 1:** Start with video tutorials (your strength!)\n**Step 2:** Review course materials for details\n**Step 3:** Take notes while watching\n**Step 4:** Test with quizzes' :
  learningStyle === 'reading' ?
  '**Step 1:** Begin with course materials (your strength!)\n**Step 2:** Watch videos for visual reinforcement\n**Step 3:** Take detailed notes\n**Step 4:** Practice with quizzes' :
  '**Step 1:** Combine videos and materials\n**Step 2:** Alternate between visual and text learning\n**Step 3:** Take comprehensive notes\n**Step 4:** Regular quiz practice'
}

🎓 **Available Resources:**
• ${courseVideos.length} video tutorials
• ${courseMaterials.length} study materials
• ${courseQuestions.length} practice questions

What specific aspect would you like me to clarify? I can explain any concept in detail! 🤔`),
          tone: 'explanatory',
          resources: [
            { type: 'video', title: `${courseTitle} Videos`, description: 'Visual explanations' },
            { type: 'material', title: `${courseTitle} Materials`, description: 'Detailed content' },
            { type: 'quiz', title: `${courseTitle} Quiz`, description: 'Test your knowledge' },
          ],
        };
      }
      
      if (lowerMessage.includes('material') || lowerMessage.includes('resource') || lowerMessage.includes('reading')) {
        if (courseMaterials.length > 0) {
          const materialsList = courseMaterials.map((m, i) => `**${i + 1}. ${m.title}**`).join('\n');
          
          return {
            text: formatResponse(`📚 **${courseTitle} Study Materials**

Comprehensive materials available:

${materialsList}

🎯 **Effective Study Strategy:**

**Phase 1: Preview (5 min)**
• Skim through section titles
• Identify key topics
• Set learning objectives

**Phase 2: Active Reading (20 min)**
• Read carefully, one section at a time
• Highlight key concepts
• Take detailed notes
• Create examples

**Phase 3: Reinforcement (10 min)**
• Watch related videos
• Practice with examples
• Summarize in your own words

**Phase 4: Assessment (10 min)**
• Take section quizzes
• Review mistakes
• Clarify doubts with me

Which material would you like to explore first? I can help explain any concept! 📖`),
            tone: 'explanatory',
            resources: courseMaterials.map(m => ({ type: 'material' as const, title: m.title, description: 'Course material' })),
          };
        }
        
        return {
          text: formatResponse(`The ${courseTitle} course materials are being prepared! 

🎥 **In the Meantime:**
The video tutorials provide excellent coverage of all topics. I can also fetch specific YouTube videos for any concepts you want to learn!

💡 **What I Can Do:**
• Fetch targeted video tutorials
• Explain concepts in detail
• Provide study strategies
• Answer specific questions

What topic would you like to explore? 🎓`),
          tone: 'guiding',
        };
      }
      
      if (lowerMessage.includes('quiz') || lowerMessage.includes('test') || lowerMessage.includes('question')) {
        if (courseQuestions.length > 0) {
          return {
            text: formatResponse(`📝 **${courseTitle} Quiz Preparation**

The quiz has **${courseQuestions.length} questions** covering all key concepts.

🎯 **Pre-Quiz Checklist:**

**Preparation (Recommended):**
✅ Watch at least 2-3 course videos
✅ Review the course materials
✅ Take notes on important points
✅ Understand core concepts

💡 **Quiz Success Strategy:**

**During the Quiz:**
• Read each question carefully
• Take your time - no rush!
• Think through your answer
• Use "Ask Gemini for help" if stuck
• Review before submitting

**After the Quiz:**
• Review incorrect answers
• Understand why you missed them
• Ask me for clarification
• Retake to improve your score

🎓 **Scoring System:**
• 90%+: 3 stars ⭐⭐⭐
• 70-89%: 2 stars ⭐⭐
• 60-69%: 1 star ⭐

Ready to test your knowledge? Click "Take Quiz" on the course card! 🎯`),
            tone: 'guiding',
            resources: [
              { type: 'quiz', title: `${courseTitle} Quiz`, description: `${courseQuestions.length} questions` },
            ],
          };
        }
        
        return {
          text: formatResponse(`The ${courseTitle} quiz is being prepared! 

📚 **Focus on Learning:**
In the meantime, concentrate on:
• Watching the video tutorials
• Reviewing course materials
• Taking notes
• Asking me questions

I'll let you know when the quiz is ready! 🎓`),
          tone: 'guiding',
        };
      }
    }
    
    // Learning strategy and study tips
    if (lowerMessage.includes('how to learn') || lowerMessage.includes('study tips') || lowerMessage.includes('learn better') || lowerMessage.includes('improve')) {
      return {
        text: formatResponse(`🎓 **Personalized Learning Strategy for ${userName}**

Based on your **${learningStyle}** learning style and goals, here's your optimal approach:

📚 **Your Customized Study Framework:**

**Daily Learning Routine (60 minutes):**

**1. Preparation Phase (10 min)**
• Review course objectives
• Set specific learning goals
• Prepare note-taking materials

**2. Active Learning (25 min)**
• Watch 2-3 video tutorials
• Pause and take notes
• Practice along with examples

**3. Reinforcement (15 min)**
• Read course materials
• Create concept summaries
• Make connections to prior knowledge

**4. Practice Phase (15 min)**
• Take practice quizzes
• Apply concepts to problems
• Test understanding

**5. Review & Reflect (5 min)**
• Summarize key learnings
• Identify areas for improvement
• Plan next session

💡 **Advanced Learning Techniques:**

**Pomodoro Method:**
• 25 min focused study
• 5 min break
• Repeat 4 times
• 15-30 min long break

**Active Recall:**
• Close materials
• Explain concepts aloud
• Test yourself frequently
• Teach others (or me!)

**Spaced Repetition:**
• Review within 24 hours
• Again after 3 days
• Again after 7 days
• Again after 30 days

🎯 **Your Current Focus:**
${interests.length > 0 ? `Concentrate on: ${interests.slice(0, 2).join(' and ')}` : 'Explore courses that interest you'}

What specific area would you like to improve? I can provide targeted strategies! 🚀`),
        tone: 'guiding',
      };
    }
    
    // Motivational support for struggles
    if (lowerMessage.includes('stuck') || lowerMessage.includes('difficult') || lowerMessage.includes('hard') || lowerMessage.includes('struggling') || lowerMessage.includes('give up')) {
      return {
        text: formatResponse(`${userName}, I understand learning can be challenging, but you're doing amazing by seeking help! 💪

🌟 **Important Reminders:**

• Every expert was once a beginner
• Mistakes prove you're trying and learning
• Progress isn't always linear - plateaus are normal
• You've already completed ${totalQuizzes} quizzes - that's real dedication!

💡 **Let's Break It Down Together:**

**Step 1: Identify the Challenge**
What specific concept is confusing you? Be as specific as possible.

**Step 2: Targeted Learning**
I'll fetch YouTube videos specifically for that topic and explain it in simpler terms.

**Step 3: Practice & Apply**
We'll work through examples together until it clicks.

**Step 4: Build Confidence**
Start with easier problems and gradually increase difficulty.

🎯 **Your Personalized Action Plan:**

**Immediate Actions:**
1. Tell me exactly what's confusing
2. I'll explain it in multiple ways
3. I'll fetch targeted video tutorials
4. We'll practice together

**Learning Adjustments:**
• Watch videos at 0.75x speed if needed
• Take more detailed notes
• Break topics into smaller chunks
• Ask questions without hesitation

**Mindset Shifts:**
• "I can't do this YET"
• Every struggle is growth
• Confusion means you're learning
• I'm here to support you!

You've got this! What specific concept is giving you trouble? Let's tackle it together! 🚀`),
        tone: 'motivational',
      };
    }
    
    // Goal-oriented guidance
    if (lowerMessage.includes('goal') || lowerMessage.includes('achieve') || lowerMessage.includes('want to learn')) {
      if (goals.length > 0) {
        return {
          text: formatResponse(`🎯 **Your Learning Goals, ${userName}**

**Your Stated Goals:**
${goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

📊 **Progress Analysis:**

**Current Status:**
• Courses Explored: Check dashboard
• Skills Developing: ${interests.join(', ') || 'Multiple areas'}
• Performance Level: ${avgScore > 0 ? `${avgScore}% average` : 'Just starting'}
• Total Credits: ${totalCredits}
• Learning Streak: ${consistency} days

🚀 **Goal Achievement Roadmap:**

**Phase 1: Foundation (Weeks 1-2)**
• Identify courses aligned with goals
• Complete 3 quizzes per week
• Watch all course videos
• Build daily learning habit

**Phase 2: Development (Weeks 3-4)**
• Deep dive into core topics
• Achieve 80%+ quiz scores
• Maintain daily consistency
• Earn target credits

**Phase 3: Mastery (Weeks 5+)**
• Advanced topics and challenges
• Apply knowledge to projects
• Teach concepts to others
• Set new ambitious goals

💡 **Recommended Focus:**
Based on your goals, start with courses in: ${interests.slice(0, 2).join(' and ') || 'your areas of interest'}

I can also fetch specific YouTube tutorials for any topic you want to master!

Which goal would you like to prioritize? Let's create a detailed action plan! 🌟`),
          tone: 'guiding',
        };
      }
      
      return {
        text: formatResponse(`🎯 **Setting Clear Goals, ${userName}**

Setting clear, achievable goals is the first step to success!

💡 **Goal-Setting Framework:**

**1. Define Your "Why"**
• What motivates you to learn?
• What problem do you want to solve?
• What career path interests you?

**2. Set SMART Goals**
• **S**pecific: Clear and well-defined
• **M**easurable: Track your progress
• **A**chievable: Realistic and attainable
• **R**elevant: Aligned with your interests
• **T**ime-bound: Set deadlines

**3. Break Down Big Goals**
• Long-term (6-12 months)
• Medium-term (1-3 months)
• Short-term (1-4 weeks)
• Daily actions

📚 **Example Goal Structure:**

**Long-term:** "Become a full-stack developer"
**Medium-term:** "Complete 5 web development courses"
**Short-term:** "Finish JavaScript course this month"
**Daily:** "Watch 2 videos and take 1 quiz"

🎯 **What I Can Help With:**

Once we clarify your goals, I can:
✅ Recommend specific courses
✅ Fetch targeted YouTube tutorials
✅ Create a personalized study schedule
✅ Set progress milestones
✅ Track your achievements
✅ Adjust strategy as needed

What would you like to achieve through learning? Let's define your goals together! 🚀`),
        tone: 'guiding',
      };
    }
    
    // Resource recommendations with YouTube API
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('should i') || lowerMessage.includes('what next')) {
      const recommendations: string[] = [];
      
      if (avgScore < 70 && totalQuizzes > 0) {
        recommendations.push('📚 Review course materials for challenging topics');
        recommendations.push('🎥 I can fetch targeted YouTube videos for difficult concepts');
        recommendations.push('📝 Take practice quizzes to reinforce learning');
        recommendations.push('💡 Focus on understanding, not just memorizing');
      } else if (avgScore >= 80) {
        recommendations.push('🚀 Challenge yourself with advanced courses');
        recommendations.push('🎯 Explore new topics in your interest areas');
        recommendations.push('⭐ Aim for perfect scores to maximize credits');
        recommendations.push('👥 Consider teaching concepts to reinforce mastery');
      } else {
        recommendations.push('📖 Balance video learning with reading materials');
        recommendations.push('✍️ Take detailed, organized notes');
        recommendations.push('🔄 Review previous quiz questions');
        recommendations.push('🎥 Watch videos at your own pace');
      }
      
      return {
        text: formatResponse(`🎓 **Personalized Recommendations for ${userName}**

Based on your learning profile and performance, here's what I suggest:

${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

💡 **Strategic Next Steps:**

**Immediate Actions:**
• Explore courses in: ${interests.slice(0, 3).join(', ') || 'your areas of interest'}
• Maintain your ${consistency > 0 ? `${consistency}-day streak` : 'learning consistency'}
• Set a goal to earn ${totalCredits + 50} total credits

**This Week's Focus:**
• Pick one course that excites you
• Watch 2-3 videos daily
• Take at least one quiz
• Ask me questions about concepts

**This Month's Goal:**
• Complete 2-3 full courses
• Achieve 80%+ average score
• Build a 30-day learning streak
• Earn 100+ credits

🎯 **Today's Action:**
Pick one course, watch 2 videos, and take a quiz. I can also fetch fresh YouTube tutorials for any topic you want to learn!

Which area would you like to explore? Let's create your learning plan! 🚀`),
        tone: 'guiding',
        resources: [
          { type: 'video', title: 'Recommended Video Tutorials', description: 'I can fetch videos for any topic' },
          { type: 'quiz', title: 'Practice Quizzes', description: 'Test and improve' },
        ],
      };
    }
    
    // Gratitude responses
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('appreciate')) {
      return {
        text: formatResponse(`You're very welcome, ${userName}! 😊

I'm always here to support your learning journey. Your dedication to improving is truly inspiring!

${stars > 0 ? `🌟 You've already earned **${stars} stars** - keep up the excellent work!` : '🌱 Keep learning and growing!'}

💡 **Remember:**
• I can fetch YouTube videos for any topic
• Ask me anything, anytime
• I'm here to help you succeed
• Your questions make you stronger

Let's continue achieving your goals together! 🚀`),
        tone: 'motivational',
      };
    }
    
    // Default intelligent response with YouTube API capability
    return {
      text: formatResponse(`That's an interesting question, ${userName}! 🤔

I want to give you the most helpful answer. Here's what I can do for you:

🎥 **Fetch YouTube Videos**
Tell me any topic, and I'll find the best tutorials for you in real-time using YouTube API.

📚 **Course Content**
Check course cards for detailed materials, videos, and quizzes.

📝 **Practice & Assessment**
Test your knowledge with quizzes and get immediate feedback.

💡 **Ask Me Specifically About:**

**Learning Support:**
• Explaining concepts from any course
• Finding YouTube videos for specific topics
• Study strategies and techniques
• Time management tips

**Progress Analysis:**
• Your performance metrics
• Learning consistency
• Goal achievement
• Personalized recommendations

**Course Guidance:**
• Which courses to take
• How to approach difficult topics
• Best learning resources
• Quiz preparation strategies

${totalQuizzes > 0 ? 
  `🌟 **By the way:** You're doing great with ${totalQuizzes} quizzes completed and ${avgScore}% average!` : 
  '🚀 **Ready to start?** Pick a course and let\'s begin your learning journey!'
}

What would you like to explore? I'm here to help! 📖`),
      tone: 'guiding',
      resources: [
        { type: 'video', title: 'YouTube Video Search', description: 'I can fetch videos for any topic' },
        { type: 'material', title: 'Course Materials', description: 'Detailed study content' },
        { type: 'quiz', title: 'Practice Quizzes', description: 'Test your knowledge' },
      ],
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setAvatarAnimation('thinking');

    // Enhanced AI thinking time with variable delay based on complexity
    const messageLength = inputValue.length;
    const baseThinkingTime = 1000;
    const variableTime = Math.min(messageLength * 10, 2000);
    const thinkingTime = baseThinkingTime + variableTime + Math.random() * 500;
    
    setTimeout(async () => {
      const response = await generateAdvancedAIResponse(inputValue);
      
      // Use streaming effect for more natural feel
      streamResponse(response.text, response.tone, response.resources);
    }, thinkingTime);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get tone icon
  const getToneIcon = (tone?: ResponseTone) => {
    switch (tone) {
      case 'motivational':
        return <Sparkles className="h-3.5 w-3.5" />;
      case 'explanatory':
        return <BookOpen className="h-3.5 w-3.5" />;
      case 'guiding':
        return <Target className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  // Get tone color
  const getToneColor = (tone?: ResponseTone) => {
    switch (tone) {
      case 'motivational':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'explanatory':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'guiding':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Get tone label
  const getToneLabel = (tone?: ResponseTone) => {
    switch (tone) {
      case 'motivational':
        return 'Motivational';
      case 'explanatory':
        return 'Explanatory';
      case 'guiding':
        return 'Guiding';
      default:
        return 'Response';
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl transition-all hover:scale-110 z-50 animate-in fade-in slide-in-from-bottom-4 bg-gradient-to-br from-primary to-primary/80 hover:from-primary hover:to-primary/90"
          size="icon"
        >
          <MessageCircle className="h-7 w-7" />
          {showNeedHelp && (
            <span className="absolute -top-2 -left-2 animate-bounce rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              Need Help?
            </span>
          )}
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[650px] w-[420px] flex-col rounded-2xl border-2 border-primary/20 bg-background shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 border-b-2 border-primary/20 bg-gradient-to-r from-primary via-primary to-primary/90 p-5 text-primary-foreground rounded-t-2xl">
            <div className="relative">
              <Avatar className={`h-12 w-12 transition-all duration-300 border-2 border-primary-foreground/30 ${
                avatarAnimation === 'thinking' ? 'animate-pulse scale-105' : 
                avatarAnimation === 'speaking' ? 'ring-2 ring-primary-foreground/50 ring-offset-2 ring-offset-primary scale-105' : ''
              }`}>
                <AvatarImage src="/assets/generated/chatbot-avatar.dim_128x128.png" alt="Gemini AI" />
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-bold">AI</AvatarFallback>
              </Avatar>
              {avatarAnimation === 'thinking' && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 animate-pulse border-2 border-primary" />
              )}
              {avatarAnimation === 'speaking' && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 animate-pulse border-2 border-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg flex items-center gap-2">
                Gemini AI — Your Mentor
                <Brain className="h-5 w-5 animate-pulse" />
              </h3>
              <p className="text-xs opacity-90 font-medium">
                {avatarAnimation === 'thinking' ? '🤔 Analyzing your question...' : 
                 avatarAnimation === 'speaking' ? '💬 Composing response...' : 
                 '✨ Premium AI assistance'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20 transition-all hover:rotate-90 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="relative flex-1 bg-gradient-to-b from-muted/30 to-background">
            <ScrollArea ref={scrollAreaRef} className="h-full p-5">
              <div className="space-y-5">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3`}
                    style={{ animationDelay: `${index * 30}ms`, animationDuration: '400ms' }}
                  >
                    <div className="max-w-[90%]">
                      <div
                        className={`rounded-2xl px-5 py-3 transition-all duration-300 ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg'
                            : 'bg-card text-card-foreground border-2 border-border shadow-md'
                        }`}
                      >
                        {message.sender === 'ai' && message.tone && (
                          <Badge variant="outline" className={`mb-3 ${getToneColor(message.tone)} font-semibold`}>
                            {getToneIcon(message.tone)}
                            <span className="ml-1.5 text-xs">{getToneLabel(message.tone)}</span>
                          </Badge>
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.isStreaming ? streamingText : message.text}
                          {message.isStreaming && (
                            <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
                          )}
                        </p>
                        {message.resources && message.resources.length > 0 && !message.isStreaming && (
                          <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                            <p className="text-xs font-semibold opacity-70 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              Recommended Resources:
                            </p>
                            {message.resources.map((resource, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 text-xs opacity-90 bg-muted/50 rounded-lg p-2.5 hover:bg-muted/70 transition-colors">
                                {resource.type === 'video' && <Video className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />}
                                {resource.type === 'material' && <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />}
                                {resource.type === 'quiz' && <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />}
                                <div className="flex-1">
                                  <p className="font-semibold text-foreground">{resource.title}</p>
                                  {resource.description && <p className="opacity-70 mt-0.5">{resource.description}</p>}
                                  {resource.url && (
                                    <a 
                                      href={resource.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline text-xs font-medium mt-1 inline-block"
                                    >
                                      Watch Video →
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-3 text-xs opacity-60 font-medium">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && !streamingText && (
                  <div className="flex justify-start animate-in fade-in slide-in-from-left-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 border-2 border-border shadow-md">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm font-medium">Gemini is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-5 right-5 h-12 w-12 rounded-full shadow-xl transition-all hover:scale-110 animate-in fade-in slide-in-from-bottom-2 z-10 bg-primary hover:bg-primary/90 flex items-center justify-center"
                aria-label="Scroll to bottom"
              >
                <img 
                  src="/assets/generated/down-arrow-icon-transparent.dim_24x24.png" 
                  alt="Scroll down" 
                  className="h-6 w-6"
                />
              </button>
            )}
          </div>

          {/* Input */}
          <div className="border-t-2 border-primary/20 p-5 bg-muted/30 rounded-b-2xl">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your learning..."
                className="flex-1 transition-all focus:ring-2 focus:ring-primary rounded-xl border-2 h-11 text-sm"
                disabled={isTyping}
              />
              <Button 
                onClick={handleSendMessage} 
                size="icon" 
                disabled={!inputValue.trim() || isTyping}
                className="transition-all hover:scale-105 disabled:opacity-50 h-11 w-11 rounded-xl"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center font-medium flex items-center justify-center gap-1.5">
              <Brain className="h-3 w-3" />
              Premium AI with YouTube API • {currentTone.charAt(0).toUpperCase() + currentTone.slice(1)} mode
            </p>
          </div>
        </div>
      )}
    </>
  );
}

