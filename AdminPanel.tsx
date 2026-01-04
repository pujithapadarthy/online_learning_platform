import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookOpen, Video, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VideoInput {
  title: string;
  url: string;
  description: string;
}

interface CourseInput {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  credits: number;
  recommendedFor: string[];
  videos: VideoInput[];
}

// Comprehensive technical courses that should be in the system
const TECHNICAL_COURSES: CourseInput[] = [
  {
    id: 'python-basics',
    title: 'Python Programming Fundamentals',
    description: 'Master Python from scratch with hands-on projects. Learn syntax, data structures, OOP, and build real applications.',
    difficulty: 1,
    credits: 10,
    recommendedFor: ['Beginners', 'Career Switchers', 'Students'],
    videos: [
      {
        title: 'Python Tutorial for Beginners - Full Course in 12 Hours',
        url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
        description: 'Complete Python programming course covering basics to advanced concepts'
      },
      {
        title: 'Python for Everybody - Full Course',
        url: 'https://www.youtube.com/watch?v=8DvywoWv6fI',
        description: 'Learn Python fundamentals with practical examples and exercises'
      }
    ]
  },
  {
    id: 'javascript-modern',
    title: 'Modern JavaScript Development',
    description: 'Learn ES6+, async programming, DOM manipulation, and modern JavaScript frameworks. Build interactive web applications.',
    difficulty: 2,
    credits: 12,
    recommendedFor: ['Web Developers', 'Frontend Engineers', 'Intermediate Programmers'],
    videos: [
      {
        title: 'JavaScript Full Course for Beginners',
        url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
        description: 'Complete JavaScript tutorial from basics to advanced concepts'
      },
      {
        title: 'Modern JavaScript ES6+ Features',
        url: 'https://www.youtube.com/watch?v=NCwa_xi0Uuc',
        description: 'Learn modern JavaScript features and best practices'
      }
    ]
  },
  {
    id: 'cpp-programming',
    title: 'C++ Programming Mastery',
    description: 'Deep dive into C++ with memory management, STL, templates, and performance optimization. Build high-performance applications.',
    difficulty: 3,
    credits: 15,
    recommendedFor: ['System Programmers', 'Game Developers', 'Advanced Students'],
    videos: [
      {
        title: 'C++ Programming Course - Beginner to Advanced',
        url: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y',
        description: 'Comprehensive C++ course covering fundamentals to advanced topics'
      },
      {
        title: 'C++ Tutorial for Beginners - Full Course',
        url: 'https://www.youtube.com/watch?v=ZzaPdXTrSb8',
        description: 'Learn C++ programming from scratch with practical examples'
      }
    ]
  },
  {
    id: 'java-enterprise',
    title: 'Java Enterprise Development',
    description: 'Master Java for enterprise applications. Learn Spring Boot, microservices, JPA, and build scalable backend systems.',
    difficulty: 3,
    credits: 14,
    recommendedFor: ['Backend Developers', 'Enterprise Engineers', 'Java Developers'],
    videos: [
      {
        title: 'Java Full Course for Beginners',
        url: 'https://www.youtube.com/watch?v=xk4_1vDrzzo',
        description: 'Complete Java programming tutorial for beginners'
      },
      {
        title: 'Spring Boot Tutorial for Beginners',
        url: 'https://www.youtube.com/watch?v=9SGDpanrc8U',
        description: 'Learn Spring Boot framework for building Java applications'
      }
    ]
  },
  {
    id: 'rust-systems',
    title: 'Rust Systems Programming',
    description: 'Learn Rust for safe, concurrent systems programming. Master ownership, lifetimes, and build reliable software.',
    difficulty: 4,
    credits: 16,
    recommendedFor: ['Systems Programmers', 'Advanced Developers', 'Performance Engineers'],
    videos: [
      {
        title: 'Rust Programming Course for Beginners',
        url: 'https://www.youtube.com/watch?v=MsocPEZBd-M',
        description: 'Complete Rust tutorial covering ownership, borrowing, and more'
      },
      {
        title: 'Rust Crash Course',
        url: 'https://www.youtube.com/watch?v=zF34dRivLOw',
        description: 'Quick introduction to Rust programming language'
      }
    ]
  },
  {
    id: 'motoko-icp',
    title: 'Motoko & Internet Computer Development',
    description: 'Build decentralized applications on the Internet Computer using Motoko. Learn actor model, canister development, and Web3.',
    difficulty: 3,
    credits: 13,
    recommendedFor: ['Blockchain Developers', 'Web3 Engineers', 'Motoko Developers'],
    videos: [
      {
        title: 'Internet Computer Tutorial - Build Your First Dapp',
        url: 'https://www.youtube.com/watch?v=M2XnywvwxFM',
        description: 'Learn to build decentralized applications on Internet Computer'
      },
      {
        title: 'Motoko Programming Language Introduction',
        url: 'https://www.youtube.com/watch?v=4eSceDOS-Ms',
        description: 'Introduction to Motoko programming for Internet Computer'
      }
    ]
  },
  {
    id: 'frontend-react',
    title: 'Frontend Development with React',
    description: 'Master React, hooks, state management, and modern frontend architecture. Build responsive, performant web applications.',
    difficulty: 2,
    credits: 12,
    recommendedFor: ['Frontend Developers', 'Web Developers', 'UI Engineers'],
    videos: [
      {
        title: 'React Course - Beginner to Advanced',
        url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
        description: 'Complete React tutorial from basics to advanced concepts'
      },
      {
        title: 'React Hooks Tutorial',
        url: 'https://www.youtube.com/watch?v=TNhaISOUy6Q',
        description: 'Learn React Hooks and modern React patterns'
      }
    ]
  },
  {
    id: 'backend-nodejs',
    title: 'Backend Development with Node.js',
    description: 'Build scalable backend services with Node.js, Express, databases, and RESTful APIs. Deploy production-ready applications.',
    difficulty: 2,
    credits: 13,
    recommendedFor: ['Backend Developers', 'Full-Stack Developers', 'API Engineers'],
    videos: [
      {
        title: 'Node.js and Express.js Full Course',
        url: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
        description: 'Complete Node.js backend development course'
      },
      {
        title: 'Node.js Tutorial for Beginners',
        url: 'https://www.youtube.com/watch?v=TlB_eWDSMt4',
        description: 'Learn Node.js from scratch with practical examples'
      }
    ]
  },
  {
    id: 'fullstack-mern',
    title: 'Full-Stack Development (MERN Stack)',
    description: 'Master MongoDB, Express, React, and Node.js. Build complete full-stack applications from database to deployment.',
    difficulty: 3,
    credits: 15,
    recommendedFor: ['Full-Stack Developers', 'Web Developers', 'Software Engineers'],
    videos: [
      {
        title: 'MERN Stack Tutorial - Build a Full Stack App',
        url: 'https://www.youtube.com/watch?v=7CqJlxBYj-M',
        description: 'Complete MERN stack development tutorial'
      },
      {
        title: 'Full Stack Web Development Course',
        url: 'https://www.youtube.com/watch?v=nu_pCVPKzTk',
        description: 'Learn full-stack development with modern technologies'
      }
    ]
  },
  {
    id: 'data-science-python',
    title: 'Data Science with Python',
    description: 'Learn data analysis, visualization, and statistical modeling with Python. Master pandas, NumPy, and Matplotlib.',
    difficulty: 2,
    credits: 14,
    recommendedFor: ['Data Analysts', 'Data Scientists', 'Python Developers'],
    videos: [
      {
        title: 'Python for Data Science - Full Course',
        url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI',
        description: 'Complete data science course using Python'
      },
      {
        title: 'Data Analysis with Python',
        url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8',
        description: 'Learn data analysis techniques with Python libraries'
      }
    ]
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning Fundamentals',
    description: 'Master ML algorithms, neural networks, and deep learning. Build and deploy ML models with TensorFlow and PyTorch.',
    difficulty: 3,
    credits: 16,
    recommendedFor: ['ML Engineers', 'Data Scientists', 'AI Developers'],
    videos: [
      {
        title: 'Machine Learning Course for Beginners',
        url: 'https://www.youtube.com/watch?v=NWONeJKn6kc',
        description: 'Complete machine learning tutorial from basics to advanced'
      },
      {
        title: 'Deep Learning Crash Course',
        url: 'https://www.youtube.com/watch?v=VyWAvY2CF9c',
        description: 'Introduction to deep learning and neural networks'
      }
    ]
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity Essentials',
    description: 'Learn ethical hacking, network security, cryptography, and penetration testing. Protect systems and data from threats.',
    difficulty: 3,
    credits: 14,
    recommendedFor: ['Security Engineers', 'Network Administrators', 'IT Professionals'],
    videos: [
      {
        title: 'Cybersecurity Full Course for Beginners',
        url: 'https://www.youtube.com/watch?v=U_P23SqJaDc',
        description: 'Complete cybersecurity course covering essential concepts'
      },
      {
        title: 'Ethical Hacking Tutorial',
        url: 'https://www.youtube.com/watch?v=3Kq1MIfTWCE',
        description: 'Learn ethical hacking and penetration testing'
      }
    ]
  },
  {
    id: 'cloud-aws',
    title: 'Cloud Computing with AWS',
    description: 'Master AWS services, cloud architecture, and deployment. Learn EC2, S3, Lambda, and build scalable cloud applications.',
    difficulty: 3,
    credits: 15,
    recommendedFor: ['Cloud Engineers', 'DevOps Engineers', 'Backend Developers'],
    videos: [
      {
        title: 'AWS Certified Cloud Practitioner Training',
        url: 'https://www.youtube.com/watch?v=SOTamWNgDKc',
        description: 'Complete AWS cloud computing course'
      },
      {
        title: 'AWS Tutorial for Beginners',
        url: 'https://www.youtube.com/watch?v=k1RI5locZE4',
        description: 'Learn AWS services and cloud architecture'
      }
    ]
  },
  {
    id: 'devops-cicd',
    title: 'DevOps & CI/CD Pipeline',
    description: 'Master DevOps practices, Docker, Kubernetes, Jenkins, and automated deployment. Build efficient development workflows.',
    difficulty: 3,
    credits: 14,
    recommendedFor: ['DevOps Engineers', 'System Administrators', 'Software Engineers'],
    videos: [
      {
        title: 'DevOps Tutorial for Beginners',
        url: 'https://www.youtube.com/watch?v=Xrgk023l4lI',
        description: 'Complete DevOps course covering tools and practices'
      },
      {
        title: 'Docker and Kubernetes Full Course',
        url: 'https://www.youtube.com/watch?v=bhBSlnQcq2k',
        description: 'Learn containerization and orchestration with Docker and Kubernetes'
      }
    ]
  },
  {
    id: 'blockchain-development',
    title: 'Blockchain Development',
    description: 'Learn blockchain fundamentals, smart contracts, Solidity, and Web3. Build decentralized applications on Ethereum and beyond.',
    difficulty: 4,
    credits: 16,
    recommendedFor: ['Blockchain Developers', 'Web3 Engineers', 'Crypto Developers'],
    videos: [
      {
        title: 'Blockchain Development Full Course',
        url: 'https://www.youtube.com/watch?v=gyMwXuJrbJQ',
        description: 'Complete blockchain development tutorial'
      },
      {
        title: 'Solidity Smart Contracts Tutorial',
        url: 'https://www.youtube.com/watch?v=M576WGiDBdQ',
        description: 'Learn Solidity programming for smart contracts'
      }
    ]
  }
];

export default function AdminPanel() {
  const [selectedCourse, setSelectedCourse] = useState<CourseInput | null>(null);

  const difficultyLabel = (level: number) => {
    return ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'][level] || 'Unknown';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage courses and content</p>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Backend Functionality Missing</AlertTitle>
        <AlertDescription>
          The backend does not have methods to add or manage courses. The following backend methods need to be
          implemented:
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <code className="text-xs">addCourse(course: Course.T): async Text</code> - Add a single course
            </li>
            <li>
              <code className="text-xs">addCourses(courses: [Course.T]): async ()</code> - Bulk add courses
            </li>
            <li>
              <code className="text-xs">deleteCourse(courseId: Text): async ()</code> - Delete a course
            </li>
            <li>
              <code className="text-xs">updateCourse(courseId: Text, course: Course.T): async ()</code> - Update a
              course
            </li>
          </ul>
          <p className="mt-2">
            Below is a preview of the {TECHNICAL_COURSES.length} comprehensive technical courses that should be
            populated in the system.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Course List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Technical Courses ({TECHNICAL_COURSES.length})</CardTitle>
            <CardDescription>Comprehensive course catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {TECHNICAL_COURSES.map((course) => (
                  <Button
                    key={course.id}
                    variant={selectedCourse?.id === course.id ? 'default' : 'outline'}
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedCourse(course)}
                  >
                    <BookOpen className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 truncate">
                      <div className="truncate font-medium">{course.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {difficultyLabel(course.difficulty)} • {course.credits} credits
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Course Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>
              {selectedCourse ? 'Preview course information' : 'Select a course to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedCourse ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold">Course ID</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedCourse.id}</p>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Title</Label>
                    <p className="mt-1 text-sm">{selectedCourse.title}</p>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Description</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedCourse.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-base font-semibold">Difficulty</Label>
                      <div className="mt-1">
                        <Badge variant="secondary">{difficultyLabel(selectedCourse.difficulty)}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-base font-semibold">Credits</Label>
                      <p className="mt-1 text-sm">{selectedCourse.credits}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Recommended For</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCourse.recommendedFor.map((audience, idx) => (
                        <Badge key={idx} variant="outline">
                          {audience}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-semibold">
                      <Video className="mr-2 inline h-4 w-4" />
                      YouTube Tutorial Videos ({selectedCourse.videos.length})
                    </Label>
                    <div className="mt-4 space-y-4">
                      {selectedCourse.videos.map((video, idx) => (
                        <div key={idx} className="rounded-lg border p-4">
                          <h4 className="mb-2 font-semibold">{video.title}</h4>
                          <p className="mb-2 text-sm text-muted-foreground">{video.description}</p>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {video.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button disabled className="flex-1">
                      <Plus className="mr-2 h-4 w-4" />
                      Add to System
                    </Button>
                    <Button disabled variant="destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buttons disabled - backend methods not implemented
                  </p>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-[600px] items-center justify-center text-center text-muted-foreground">
                <div>
                  <BookOpen className="mx-auto mb-4 h-12 w-12" />
                  <p>Select a course from the list to view details</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Course Catalog Summary</CardTitle>
          <CardDescription>Overview of technical courses ready to be added</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{TECHNICAL_COURSES.length}</div>
              <p className="text-sm text-muted-foreground">Total Courses</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">
                {TECHNICAL_COURSES.reduce((sum, c) => sum + c.videos.length, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Tutorial Videos</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">
                {TECHNICAL_COURSES.reduce((sum, c) => sum + c.credits, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Credits</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">
                {new Set(TECHNICAL_COURSES.flatMap((c) => c.recommendedFor)).size}
              </div>
              <p className="text-sm text-muted-foreground">Target Audiences</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-semibold">Course Categories</h3>
            <div className="flex flex-wrap gap-2">
              <Badge>Programming Languages (6)</Badge>
              <Badge>Web Development (3)</Badge>
              <Badge>Data Science & ML (2)</Badge>
              <Badge>Cybersecurity (1)</Badge>
              <Badge>Cloud Computing (1)</Badge>
              <Badge>DevOps (1)</Badge>
              <Badge>Blockchain (1)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
