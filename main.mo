import Array "mo:core/Array";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Authorization "authorization/access-control";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  let courses = Map.empty<Text, Course.T>();
  let questions = Map.empty<Text, Question.T>();
  let quizSessions = Map.empty<Principal, QuizSession.T>();
  let userProfiles = Map.empty<Principal, UserProfile.T>();
  let consistencyRecords = Map.empty<Principal, [ConsistencyRecord.T]>();
  let accessControlState = Authorization.initState();
  let performanceStatsMap = Map.empty<Principal, PerformanceStats.T>();
  let notesMap = Map.empty<Principal, [Text]>();
  let courseQuestions = Map.empty<Text, [Question.T]>();

  module UserProfile {
    public type T = {
      name : Text;
      email : Text;
      preferences : [Text];
      goals : [Text];
      skillLevel : Nat;
      learningStyle : Text;
      interests : [Text];
      completedCourses : Nat;
      recommendedCourses : [Text];
      consistency : Nat;
    };

    public func compareByName(a : T, b : T) : Order.Order {
      Text.compare(a.name, b.name);
    };

    public func new(name : Text, email : Text, preferences : [Text], goals : [Text], skillLevel : Nat, learningStyle : Text, interests : [Text]) : T {
      {
        name;
        email;
        preferences;
        goals;
        skillLevel;
        learningStyle;
        interests;
        completedCourses = 0;
        recommendedCourses = [];
        consistency = 0;
      };
    };
  };

  module YouTubeVideo {
    public type T = {
      title : Text;
      url : Text;
      description : Text;
    };

    public func new(title : Text, url : Text, description : Text) : T {
      { title; url; description };
    };
  };

  module CourseMaterial {
    public type T = {
      title : Text;
      content : [Text];
    };

    public func new(title : Text, content : [Text]) : T {
      { title; content };
    };
  };

  module Course {
    public type T = {
      id : Text;
      title : Text;
      description : Text;
      difficulty : Nat;
      credits : Nat;
      recommendedFor : [Text];
      youtubeVideos : [YouTubeVideo.T];
      materials : [CourseMaterial.T];
    };

    public func new(id : Text, title : Text, description : Text, difficulty : Nat, credits : Nat, recommendedFor : [Text], youtubeVideos : [YouTubeVideo.T], materials : [CourseMaterial.T]) : T {
      {
        id;
        title;
        description;
        difficulty;
        credits;
        recommendedFor;
        youtubeVideos;
        materials;
      };
    };
  };

  module Question {
    public type T = {
      id : Text;
      questionText : Text;
      options : [Text];
      correctAnswer : Text;
      difficulty : Nat;
    };
  };

  module PerformanceStats {
    public type T = {
      totalQuizzes : Nat;
      averageScore : Nat;
      successRate : Nat;
      totalCredits : Nat;
      badges : [Text];
      stars : Nat;
      consistency : Nat;
    };
  };

  module QuizSession {
    public type T = {
      courseId : Text;
      questions : [Question.T];
      currentQuestionIndex : Nat;
      score : Nat;
      answers : [Text];
    };

    public func init(courseId : Text, questions : [Question.T]) : T {
      {
        courseId;
        questions;
        currentQuestionIndex = 0;
        score = 0;
        answers = [];
      };
    };

    public func getCurrentQuestion(session : T) : ?Question.T {
      if (session.currentQuestionIndex < session.questions.size()) {
        ?session.questions[session.currentQuestionIndex];
      } else {
        null;
      };
    };
  };

  module ConsistencyRecord {
    public type T = {
      date : Text;
      engagement : Nat;
    };

    public func new(date : Text, engagement : Nat) : T {
      { date; engagement };
    };
  };

  func textContains(text : Text, substring : Text) : Bool {
    text.contains(#text substring);
  };

  public type OnboardingData = {
    name : Text;
    email : Text;
    preferences : [Text];
    goals : [Text];
    skillLevel : Nat;
    learningStyle : Text;
    interests : [Text];
  };

  public type QuizProgressData = {
    courseId : Text;
    currentQuestion : ?Question.T;
    questions : [Question.T];
    progress : Nat;
    score : Nat;
  };

  public type CourseWithVideos = {
    id : Text;
    title : Text;
    description : Text;
    difficulty : Nat;
    credits : Nat;
    recommendedFor : [Text];
    youtubeVideos : [YouTubeVideo.T];
    materials : [CourseMaterial.T];
    questions : [Question.T];
  };

  public query ({ caller }) func searchCourses(searchText : Text) : async [Course.T] {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can search courses");
    };

    if (searchText.size() == 0) {
      return courses.values().toArray();
    };

    let allCourses = courses.values().toArray();
    allCourses.filter(
      func(course) {
        textContains(course.title, searchText) or
        textContains(course.description, searchText) or
        course.youtubeVideos.any(
          func(video) {
            textContains(video.title, searchText) or textContains(video.description, searchText);
          }
        );
      }
    );
  };

  public query ({ caller }) func getAllCoursesWithVideos() : async [CourseWithVideos] {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access courses");
    };

    let allCourses = courses.values().toArray();
    allCourses.map(
      func(course) {
        {
          id = course.id;
          title = course.title;
          description = course.description;
          difficulty = course.difficulty;
          credits = course.credits;
          recommendedFor = course.recommendedFor;
          youtubeVideos = course.youtubeVideos;
          materials = course.materials;
          questions = switch (courseQuestions.get(course.id)) {
            case (null) { [] };
            case (?questions) { questions };
          };
        };
      }
    );
  };

  public query ({ caller }) func getCourseWithVideos(courseId : Text) : async ?CourseWithVideos {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access courses");
    };
    switch (courses.get(courseId)) {
      case (null) { null };
      case (?course) {
        ?{
          id = course.id;
          title = course.title;
          description = course.description;
          difficulty = course.difficulty;
          credits = course.credits;
          recommendedFor = course.recommendedFor;
          youtubeVideos = course.youtubeVideos;
          materials = course.materials;
          questions = switch (courseQuestions.get(course.id)) {
            case (null) { [] };
            case (?questions) { questions };
          };
        };
      };
    };
  };

  public query ({ caller }) func getCourseQuestions(courseId : Text) : async [Question.T] {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get course questions");
    };
    switch (courseQuestions.get(courseId)) {
      case (null) { [] };
      case (?questions) { questions };
    };
  };

  public shared ({ caller }) func addCourseQuestions(courseId : Text, newQuestions : [Question.T]) : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add course questions");
    };

    switch (courses.get(courseId)) {
      case (null) { Runtime.trap("Course not found") };
      case (?_course) {
        courseQuestions.add(courseId, newQuestions);
      };
    };
  };

  public shared ({ caller }) func startQuiz(courseId : Text) : async QuizProgressData {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can start quizzes");
    };

    let questions = switch (courseQuestions.get(courseId)) {
      case (null) { [] };
      case (?questions) { questions };
    };
    if (questions.size() == 0) {
      Runtime.trap("No questions available for this course");
    };

    let session = QuizSession.init(courseId, questions);
    quizSessions.add(caller, session);

    {
      courseId;
      currentQuestion = QuizSession.getCurrentQuestion(session);
      questions;
      progress = 0;
      score = 0;
    };
  };

  public shared ({ caller }) func submitQuizAnswer(answer : Text) : async QuizProgressData {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can submit quiz answers");
    };

    switch (quizSessions.get(caller)) {
      case (null) { Runtime.trap("No active quiz session") };
      case (?session) {
        let currentQuestion = QuizSession.getCurrentQuestion(session);
        switch (currentQuestion) {
          case (null) { Runtime.trap("Quiz already completed") };
          case (?question) {
            let isCorrect = question.correctAnswer == answer;
            let newScore = if (isCorrect) { session.score + 1 } else { session.score };
            let newAnswers = session.answers.concat([answer]);
            let newIndex = session.currentQuestionIndex + 1;

            let updatedSession = {
              session with
              currentQuestionIndex = newIndex;
              score = newScore;
              answers = newAnswers;
            };

            quizSessions.add(caller, updatedSession);

            {
              courseId = session.courseId;
              currentQuestion = QuizSession.getCurrentQuestion(updatedSession);
              questions = session.questions;
              progress = newIndex;
              score = newScore;
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getQuizProgress() : async ?QuizProgressData {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get quiz progress");
    };

    switch (quizSessions.get(caller)) {
      case (null) { null };
      case (?session) {
        ?{
          courseId = session.courseId;
          currentQuestion = QuizSession.getCurrentQuestion(session);
          questions = session.questions;
          progress = session.currentQuestionIndex;
          score = session.score;
        };
      };
    };
  };

  public shared ({ caller }) func completeQuiz() : async Nat {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can complete quizzes");
    };

    switch (quizSessions.get(caller)) {
      case (null) { Runtime.trap("No active quiz session") };
      case (?session) {
        let finalScore = session.score;
        let totalQuestions = session.questions.size();
        let percentage = if (totalQuestions > 0) {
          (finalScore * 100) / totalQuestions;
        } else {
          0;
        };

        let currentStats = switch (performanceStatsMap.get(caller)) {
          case (null) {
            {
              totalQuizzes = 0;
              averageScore = 0;
              successRate = 0;
              totalCredits = 0;
              badges = [];
              stars = 0;
              consistency = 0;
            };
          };
          case (?stats) { stats };
        };

        let newTotalQuizzes = currentStats.totalQuizzes + 1;
        let newAverageScore = ((currentStats.averageScore * currentStats.totalQuizzes) + percentage) / newTotalQuizzes;

        let creditsEarned = if (percentage >= 80) { 3 } else if (percentage >= 60) { 2 } else { 1 };
        let newTotalCredits = currentStats.totalCredits + creditsEarned;

        let starsEarned = if (percentage >= 90) { 3 } else if (percentage >= 70) { 2 } else { 1 };
        let newStars = currentStats.stars + starsEarned;

        let updatedStats = {
          totalQuizzes = newTotalQuizzes;
          averageScore = newAverageScore;
          successRate = if (percentage >= 60) { currentStats.successRate + 1 } else { currentStats.successRate };
          totalCredits = newTotalCredits;
          badges = currentStats.badges;
          stars = newStars;
          consistency = currentStats.consistency;
        };

        performanceStatsMap.add(caller, updatedStats);

        quizSessions.remove(caller);

        finalScore;
      };
    };
  };

  public query ({ caller }) func getPerformanceStats() : async PerformanceStats.T {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access performance stats");
    };

    switch (performanceStatsMap.get(caller)) {
      case (null) {
        {
          totalQuizzes = 0;
          averageScore = 0;
          successRate = 0;
          totalCredits = 0;
          badges = [];
          stars = 0;
          consistency = 0;
        };
      };
      case (?stats) { stats };
    };
  };

  public query ({ caller }) func getAllYoutubeVideos() : async [YouTubeVideo.T] {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access videos");
    };

    let allVideos = courses.values().flatMap(
      func(course) { course.youtubeVideos.values() }
    ).toArray();
    allVideos;
  };

  public query ({ caller }) func getYoutubeVideosForCourse(courseId : Text) : async [YouTubeVideo.T] {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access videos");
    };
    switch (courses.get(courseId)) {
      case (null) { [] : [YouTubeVideo.T] };
      case (?course) { course.youtubeVideos };
    };
  };

  public shared ({ caller }) func addYoutubeVideoToCourse(courseId : Text, video : YouTubeVideo.T) : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add videos");
    };

    switch (courses.get(courseId)) {
      case (null) { Runtime.trap("Course not found") };
      case (?course) {
        let updatedVideos = course.youtubeVideos.concat([video]);
        let updatedCourse = { course with youtubeVideos = updatedVideos };
        courses.add(courseId, updatedCourse);
      };
    };
  };

  public shared ({ caller }) func addCourseMaterials(courseId : Text, materials : [CourseMaterial.T]) : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add materials");
    };

    switch (courses.get(courseId)) {
      case (null) { Runtime.trap("Course not found") };
      case (?course) {
        let updatedCourse = { course with materials };
        courses.add(courseId, updatedCourse);
      };
    };
  };

  public query ({ caller }) func getAllUserProfiles() : async [UserProfile.T] {
    if (not Authorization.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can retrieve all user profiles");
    };
    userProfiles.values().toArray().sort(UserProfile.compareByName);
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    Authorization.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async Authorization.UserRole {
    Authorization.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : Authorization.UserRole) : async () {
    Authorization.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    Authorization.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile.T {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile.T) : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func saveOnboardingProfile(onboardingData : OnboardingData) : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save onboarding profiles");
    };
    let profile = UserProfile.new(
      onboardingData.name,
      onboardingData.email,
      onboardingData.preferences,
      onboardingData.goals,
      onboardingData.skillLevel,
      onboardingData.learningStyle,
      onboardingData.interests
    );
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getOnboardingProfile() : async ?UserProfile.T {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can retrieve onboarding profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile.T {
    if (caller != user and not Authorization.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public query ({ caller }) func getConsistencyCalendar() : async ?[ConsistencyRecord.T] {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can retrieve consistency calendar");
    };
    consistencyRecords.get(caller);
  };

  public query ({ caller }) func getCourseCredits(courseId : Text) : async ?Nat {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access course credits");
    };
    switch (courses.get(courseId)) {
      case (null) { null };
      case (?course) { ?course.credits };
    };
  };

  public query ({ caller }) func getTotalCredits() : async Nat {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access total credits");
    };
    switch (performanceStatsMap.get(caller)) {
      case (null) { 0 };
      case (?stats) { stats.totalCredits };
    };
  };

  public shared ({ caller }) func recordDailyEngagement(date : Text) : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can record engagement");
    };

    let newRecord = ConsistencyRecord.new(date, 1);
    let currentRecords = switch (consistencyRecords.get(caller)) {
      case (null) { [] : [ConsistencyRecord.T] };
      case (?records) { records };
    };

    let updatedRecords = currentRecords.concat([newRecord]);
    consistencyRecords.add(caller, updatedRecords);

    let currentProfile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) { profile };
    };

    let updatedConsistency = currentProfile.consistency + 1;
    let updatedProfile = { currentProfile with consistency = updatedConsistency };
    userProfiles.add(caller, updatedProfile);
  };

  public shared ({ caller }) func addNote(note : Text) : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add notes");
    };
    let currentNotes = switch (notesMap.get(caller)) {
      case (null) { [] };
      case (?notes) { notes };
    };
    let updatedNotes = currentNotes.concat([note]);
    notesMap.add(caller, updatedNotes);
  };

  public query ({ caller }) func getNotes() : async [Text] {
    if (not Authorization.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access notes");
    };
    switch (notesMap.get(caller)) {
      case (null) { [] };
      case (?notes) { notes };
    };
  };

  public shared ({ caller }) func populateCourses() : async () {
    if (not Authorization.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can populate courses");
    };

    let codingCourses : [Course.T] = [
      Course.new(
        "python_course",
        "Learn Python Programming",
        "Master Python fundamentals, syntax, and advanced features.",
        2,
        5,
        ["Beginners", "Developers", "Data Scientists"],
        [
          YouTubeVideo.new("Python Crash Course", "https://www.youtube.com/watch?v=rfscVS0vtbw", "Comprehensive introduction to Python"),
          YouTubeVideo.new("Learn Python in One Hour", "https://www.youtube.com/watch?v=kqtD5dpn9C8", "Quick guide to core Python concepts"),
          YouTubeVideo.new("Python Programming Tutorial", "https://www.youtube.com/watch?v=WGJJIrtnfpk", "Complete Python course for beginners")
        ],
        []
      ),
      Course.new(
        "javascript_course",
        "Mastering JavaScript",
        "Comprehensive JavaScript course covering core language features, DOM manipulation, and modern ES6+ capabilities.",
        3,
        6,
        ["Beginners", "Web Developers", "Front-End Engineers"],
        [
          YouTubeVideo.new("JavaScript in 1 Hour", "https://www.youtube.com/watch?v=W6NZfCO5SIk", "Complete beginner's guide to JavaScript"),
          YouTubeVideo.new("JavaScript Tutorial for Beginners", "https://www.youtube.com/watch?v=hdI2bqOjy3c", "Step-by-step JavaScript lessons"),
          YouTubeVideo.new("Modern JavaScript with ES6+", "https://www.youtube.com/watch?v=NCwa_xi0Uuc", "Learn advanced JS features")
        ],
        []
      ),
      Course.new(
        "typescript_course",
        "TypeScript Essentials",
        "Learn TypeScript fundamentals, types, interfaces, and integration with JavaScript projects.",
        3,
        5,
        ["JavaScript Developers", "Angular Developers", "Front-End Engineers"],
        [
          YouTubeVideo.new("TypeScript Tutorial for Beginners", "https://www.youtube.com/watch?v=BwuLxPH8IDs", "Comprehensive TypeScript introduction"),
          YouTubeVideo.new("Learn TypeScript in One Hour", "https://www.youtube.com/watch?v=30LWjhZzg50", "Quick overview of TypeScript basics"),
          YouTubeVideo.new("Integrating TypeScript with JavaScript", "https://www.youtube.com/watch?v=d56mG7DezGs", "Best practices for TS integration")
        ],
        []
      ),
      Course.new(
        "cpp_course",
        "C++ Programming Fundamentals",
        "Explore C++ syntax, object-oriented programming, and advanced programming constructs.",
        4,
        7,
        ["Computer Science Students", "Engineers", "Systems Developers"],
        [
          YouTubeVideo.new("C++ Tutorial for Beginners", "https://www.youtube.com/watch?v=vLnPwxZdW4Y", "Complete guide to C++ programming"),
          YouTubeVideo.new("C++ Crash Course", "https://www.youtube.com/watch?v=ZzaPdXTrSb8", "Learn C++ essentials quickly"),
          YouTubeVideo.new("Object-Oriented Programming in C++", "https://www.youtube.com/watch?v=7oP2Q_-F5D8", "Deep dive into OOP with C++")
        ],
        []
      ),
      Course.new(
        "java_course",
        "Java Programming Masterclass",
        "Java language fundamentals, OOP concepts, and modern enterprise applications with Java.",
        3,
        6,
        ["Beginners", "Software Engineers", "Enterprise Developers"],
        [
          YouTubeVideo.new("Java Tutorial for Beginners", "https://www.youtube.com/watch?v=eIrMbAQSU34", "Comprehensive Java programming tutorial"),
          YouTubeVideo.new("Java in 1 Hour", "https://www.youtube.com/watch?v=grEKMHGYyns", "Learn Java essentials quickly"),
          YouTubeVideo.new("Object-Oriented Java Programming", "https://www.youtube.com/watch?v=d7PxEa0Q6Ww", "Master OOP concepts in Java")
        ],
        []
      ),
      Course.new(
        "csharp_course",
        "C# Programming Fundamentals",
        "Gain expertise in C# syntax, .NET development, and building robust applications.",
        3,
        6,
        ["Developers", "Software Engineers", ".NET Programmers"],
        [
          YouTubeVideo.new("C# Tutorial for Beginners", "https://www.youtube.com/watch?v=GhQdlIFylQ8", "Beginner-friendly C# programming course"),
          YouTubeVideo.new("Modern C# Programming", "https://www.youtube.com/watch?v=wbpFWaDPT_Y", "Advanced features of C# 8.0"),
          YouTubeVideo.new("Building Applications with .NET and C#", "https://www.youtube.com/watch?v=SDdCsgz_dxs", "Real-world projects in C#")
        ],
        []
      ),
      Course.new(
        "go_course",
        "Go Language Programming",
        "Master the Go language, concurrency, and building scalable web services.",
        4,
        7,
        ["System Programmers", "Back-End Developers", "Cloud Engineers"],
        [
          YouTubeVideo.new("Go Programming Tutorial", "https://www.youtube.com/watch?v=YS4e4q9oBaU", "Complete Go language course"),
          YouTubeVideo.new("Learn Go in 1 Hour", "https://www.youtube.com/watch?v=SqrbIlUwR0U", "Beginner's guide to Go essentials"),
          YouTubeVideo.new("Building REST APIs with Go", "https://www.youtube.com/watch?v=w7eI6DDc1tU", "Practical use cases for Go")
        ],
        []
      ),
      Course.new(
        "rust_course",
        "Rust Programming Fundamentals",
        "Learn Rust syntax, memory management, and building safe, high-performance applications.",
        5,
        8,
        ["System Programmers", "Security Engineers", "Back-End Developers"],
        [
          YouTubeVideo.new("Rust Programming Tutorial", "https://www.youtube.com/watch?v=ygL_xcavzQ4", "Complete introduction to Rust"),
          YouTubeVideo.new("Memory Management in Rust", "https://www.youtube.com/watch?v=rAl-9HwD858", "Learn ownership and lifetimes"),
          YouTubeVideo.new("Web Development with Rust", "https://www.youtube.com/watch?v=Hbc8hw7SgkE", "Building REST APIs in Rust")
        ],
        []
      ),
      Course.new(
        "motoko_course",
        "Motoko Programming for the Internet Computer",
        "Learn Motoko language and build applications on the DFINITY Internet Computer platform.",
        4,
        7,
        ["Web3 Developers", "DFINITY Enthusiasts", "Smart Contract Developers"],
        [
          YouTubeVideo.new("Motoko Language Tutorial", "https://www.youtube.com/watch?v=VAJPy-ycAK4", "Beginner-friendly Motoko course"),
          YouTubeVideo.new("Build DApps with Motoko", "https://www.youtube.com/watch?v=IjJsupercw", "Step-by-step DFINITY DApp tutorial"),
          YouTubeVideo.new("Internet Computer Smart Contracts", "https://www.youtube.com/watch?v=VX4H9Qkhyb4", "Deep dive into smart contract development")
        ],
        []
      ),
      Course.new(
        "php_course",
        "PHP Web Development Essentials",
        "Master PHP scripting, server-side web development, and database integration.",
        2,
        5,
        ["Web Developers", "Backend Engineers", "CMS Enthusiasts"],
        [
          YouTubeVideo.new("PHP Tutorial for Beginners", "https://www.youtube.com/watch?v=OK_JCtrrv-c", "Complete PHP course for web developers"),
          YouTubeVideo.new("PHP and MySQL Integration", "https://www.youtube.com/watch?v=6u7SYEShM08", "Build dynamic websites with PHP"),
          YouTubeVideo.new("Advanced PHP Programming", "https://www.youtube.com/watch?v=5M6k8rj2F9A", "Best practices in PHP development")
        ],
        []
      ),
      Course.new(
        "ruby_course",
        "Introduction to Ruby Programming",
        "Learn Ruby basics, object-oriented programming, and rapid web application development.",
        3,
        6,
        ["Web Developers", "Ruby on Rails Developers", "Agile Programmers"],
        [
          YouTubeVideo.new("Ruby Programming Tutorial", "https://www.youtube.com/watch?v=t_ispmWmdjY", "Comprehensive guide to Ruby programming"),
          YouTubeVideo.new("Building Web Apps with Ruby", "https://www.youtube.com/watch?v=fmyvWz5TUWg", "Ruby on Rails essentials"),
          YouTubeVideo.new("Advanced Ruby Techniques", "https://www.youtube.com/watch?v=ns9hzvF5Ed4", "Master advanced Ruby features")
        ],
        []
      ),
      Course.new(
        "swift_course",
        "Swift Programming for iOS Development",
        "Swift fundamentals, iOS mobile application development, and user interface design.",
        4,
        7,
        ["_ios Developers_", "Mobile App Creators", "Design Enthusiasts"],
        [
          YouTubeVideo.new("Swift Programming Tutorial", "https://www.youtube.com/watch?v=comQ1-x2a1Q", "Beginner-friendly Swift course"),
          YouTubeVideo.new("iOS App Development with Swift", "https://www.youtube.com/watch?v=KQ6mxQGeQbE", "Step-by-step iOS app tutorial"),
          YouTubeVideo.new("Mastering UI Design in Swift", "https://www.youtube.com/watch?v=8dUvOm7O6WQ", "Tips for building beautiful interfaces")
        ],
        []
      ),
      Course.new(
        "kotlin_course",
        "Kotlin Programming for Android Development",
        "Comprehensive Kotlin course for Android mobile app creation and advanced features.",
        4,
        7,
        ["Android Developers", "Mobile App Programmers", "Kotlin Enthusiasts"],
        [
          YouTubeVideo.new("Kotlin Tutorial for Beginners", "https://www.youtube.com/watch?v=F9UC9DY-vIU", "Learn Kotlin fundamentals"),
          YouTubeVideo.new("Advanced Kotlin Programming", "https://www.youtube.com/watch?v=3mwFC4SHY-Y", "Explore advanced topics"),
          YouTubeVideo.new("Building Android Apps with Kotlin", "https://www.youtube.com/watch?v=BtkKQbNDk84", "Step-by-step Android app development")
        ],
        []
      )
    ];

    let technicalCourses : [Course.T] = [
      Course.new(
        "ai_course",
        "Introduction to Artificial Intelligence",
        "Explore AI concepts, machine learning, and real-world applications of artificial intelligence.",
        5,
        8,
        ["Data Scientists", "AI Enthusiasts", "Engineers"],
        [
          YouTubeVideo.new("Artificial Intelligence Tutorial", "https://www.youtube.com/watch?v=JMUxmLyrhSk", "Following AI tutorial for beginners"),
          YouTubeVideo.new("Machine Learning Crash Course", "https://www.youtube.com/watch?v=GwIo3gDZCVQ", "Learn the basics of machine learning"),
          YouTubeVideo.new("Advanced AI Techniques", "https://www.youtube.com/watch?v=aircAruvnKk", "Deep dive into AI applications")
        ],
        []
      ),
      Course.new(
        "machine_learning_course",
        "Machine Learning Fundamentals",
        "Comprehensive course on foundational machine learning algorithms and real-world projects.",
        5,
        8,
        ["Data Scientists", "ML Engineers", "Analysts"],
        [
          YouTubeVideo.new("Machine Learning 101", "https://www.youtube.com/watch?v=7eh4d6sabA0", "Ultimate guide to machine learning essentials"),
          YouTubeVideo.new("Linear Regression Tutorial", "https://www.youtube.com/watch?v=ZkjP5RJLQF4", "Learn regression analysis"),
          YouTubeVideo.new("Neural Networks Explained", "https://www.youtube.com/watch?v=aircAruvnKk", "Master deep learning algorithms")
        ],
        []
      ),
      Course.new(
        "data_science_course",
        "Data Science Masterclass",
        "End-to-end data analysis, visualization, and predictive modeling using Python.",
        4,
        7,
        ["Analysts", "Business Intelligence", "Python Programmers"],
        [
          YouTubeVideo.new("Data Science Overview", "https://www.youtube.com/watch?v=xC-c7E5PK0Y", "Introductory data science concepts"),
          YouTubeVideo.new("Python Data Analysis", "https://www.youtube.com/watch?v=JRCJ6RtE3xU", "Pandas and dataframes in action"),
          YouTubeVideo.new("Data Visualization Techniques", "https://www.youtube.com/watch?v=hvK5N1R2aXk", "Graphs and visualization best practices")
        ],
        []
      ),
      Course.new(
        "cloud_computing_course",
        "Cloud Computing Fundamentals",
        "Cloud basics, AWS/Azure/GCP comparison, and building cloud-based applications.",
        3,
        6,
        ["DevOps Engineers", "IT Managers", "Developers"],
        [
          YouTubeVideo.new("Cloud Computing Basics", "https://www.youtube.com/watch?v=bHe1b0ySpPs", "Comprehensive introduction to cloud services"),
          YouTubeVideo.new("AWS for Beginners", "https://www.youtube.com/watch?v=ulprqHHWlng", "AWS setup and management guide"),
          YouTubeVideo.new("Azure vs. GCP Comparison", "https://www.youtube.com/watch?v=ZaGgZJd3rg8", "Cloud service provider analysis")
        ],
        []
      ),
      Course.new(
        "blockchain_course",
        "Blockchain Essentials",
        "Foundational blockchain concepts, cryptography, smart contracts, and decentralized applications.",
        5,
        8,
        ["Cryptocurrency Enthusiasts", "Web3 Programmers", "Investors"],
        [
          YouTubeVideo.new("Blockchain Explained", "https://www.youtube.com/watch?v=SSo_EIwHSd4", "Beginner's blockchain guide"),
          YouTubeVideo.new("Ethereum Smart Contracts", "https://www.youtube.com/watch?v=gyMwXuJrbJQ", "Build smart contracts on Ethereum"),
          YouTubeVideo.new("Decentralized App Development", "https://www.youtube.com/watch?v=9wA2iU1uHz4", "DApp development with Web3")
        ],
        []
      ),
      Course.new(
        "cybersecurity_course",
        "Cybersecurity Fundamentals",
        "Learn cybersecurity principles, ethical hacking, and protection strategies.",
        4,
        7,
        ["IT Managers", "Security Analysts", "Developers"],
        [
          YouTubeVideo.new("Cybersecurity Basics", "https://www.youtube.com/watch?v=inWWhr5tnEA", "Fundamental security course"),
          YouTubeVideo.new("Ethical Hacking Tutorial", "https://www.youtube.com/watch?v=3Kq1MIfTWCE", "Discover ethical hacking techniques"),
          YouTubeVideo.new("Network Security Best Practices", "https://www.youtube.com/watch?v=SHDgzhNAbdU", "Networking security guides")
        ],
        []
      ),
      Course.new(
        "networking_course",
        "Networking Fundamentals",
        "Master networking concepts, TCP/IP, protocols, and data transmission.",
        3,
        5,
        ["Network Engineers", "IT Professionals", "System Administrators"],
        [
          YouTubeVideo.new("Computer Networking Explained", "https://www.youtube.com/watch?v=qiQR5rTSshw", "Deep dive into networking basics"),
          YouTubeVideo.new("TCP/IP Fundamentals", "https://www.youtube.com/watch?v=2n0H3DOqQDM", "Comprehensive TCP/IP tutorial"),
          YouTubeVideo.new("Building Reliable Networks", "https://www.youtube.com/watch?v=qn9yAjx3E90", "Network design best practices")
        ],
        []
      ),
      Course.new(
        "web_dev_course",
        "Full Stack Web Development",
        "End-to-end full stack web development, HTML/CSS/JS, and modern frameworks.",
        2,
        5,
        ["Web Developers", "Front-End Engineers", "Back-End Programmers"],
        [
          YouTubeVideo.new("Web Dev Crash Course", "https://www.youtube.com/watch?v=kUMe1FH4CHE", "Complete HTML/CSS/JavaScript guide"),
          YouTubeVideo.new("Building Web Apps with React", "https://www.youtube.com/watch?v=w7ejDZ8SWv8", "React app fundamentals"),
          YouTubeVideo.new("Build REST APIs with Node.js", "https://www.youtube.com/watch?v=Oe421EPjeBE", "Server-side JS projects")
        ],
        []
      )
    ];

    let communicationCourses : [Course.T] = [
      Course.new(
        "communication_skills_course",
        "Effective Communication Skills",
        "Master verbal, written, and nonverbal communication for personal and professional growth.",
        2,
        5,
        ["Business Professionals", "Students", "Managers"],
        [
          YouTubeVideo.new("Communication Skills Mastery", "https://www.youtube.com/watch?v=oTIoRcbHkWw", "Beginner-friendly communication guide"),
          YouTubeVideo.new("Public Speaking Essentials", "https://www.youtube.com/watch?v=6VxvZQSdUSw", "Become a confident public speaker"),
          YouTubeVideo.new("Active Listening Techniques", "https://www.youtube.com/watch?v=7wucH7xDm5w", "Key listening skills for better communication")
        ],
        []
      ),
      Course.new(
        "leadership_skills_course",
        "Leadership Skills Development",
        "Build effective leadership qualities, team motivation, and strategic decision making.",
        3,
        6,
        ["Managers", "Team Leads", "Aspiring Executives"],
        [
          YouTubeVideo.new("Leadership Skills Explained", "https://www.youtube.com/watch?v=pyBBoMIsSQQ", "Develop strong leadership skills"),
          YouTubeVideo.new("Effective Leadership Strategies", "https://www.youtube.com/watch?v=Ts-_0MT_9B8", "Best practices for motivating teams"),
          YouTubeVideo.new("Decision Making for Leaders", "https://www.youtube.com/watch?v=5DzuI4HQuYY", "Improve your leadership decisions")
        ],
        []
      ),
      Course.new(
        "public_speaking_course",
        "Public Speaking Mastery",
        "Overcome public speaking anxiety, master presentation skills, and captivate your audience.",
        2,
        5,
        ["Business Professionals", "Students", "Speakers"],
        [
          YouTubeVideo.new("Public Speaking Tips", "https://www.youtube.com/watch?v=NU9D9bK2Q9w", "Conquer public speaking fears"),
          YouTubeVideo.new("Presentation Skills Masterclass", "https://www.youtube.com/watch?v=JbCkiJ_JDkk", "Deliver persuasive presentations"),
          YouTubeVideo.new("Mastering Body Language", "https://www.youtube.com/watch?v=qdPs47tlRY0", "Enhance your public speaking skills")
        ],
        []
      ),
      Course.new(
        "teamwork_collaboration_course",
        "Teamwork and Collaboration",
        "Improve team collaboration, workflow optimization, and effective project management.",
        2,
        5,
        ["Project Managers", "Team Members", "HR Professionals"],
        [
          YouTubeVideo.new("Effective Collaboration Explained", "https://www.youtube.com/watch?v=n4wzymeiFpo", "Create high-performing teams"),
          YouTubeVideo.new("Team Building Activities", "https://www.youtube.com/watch?v=9F6vwPyp9d8", "Enhance team cohesion and trust"),
          YouTubeVideo.new("Remote Team Communication", "https://www.youtube.com/watch?v=Q8A4Wv3zW58", "Best practices for remote work")
        ],
        []
      ),
      Course.new(
        "interview_skills_course",
        "Interview Skills and Preparation",
        "Ace your interviews, develop compelling answers, and showcase your strengths.",
        2,
        5,
        ["Job Seekers", "Career Changers", "Students"],
        [
          YouTubeVideo.new("Interview Tips Masterclass", "https://www.youtube.com/watch?v=5T08CNKV1ew", "Winning interview strategies"),
          YouTubeVideo.new("Resume and Cover Letter Building", "https://www.youtube.com/watch?v=qswWKmeGxlE", "Craft impressive resumes"),
          YouTubeVideo.new("Mastering Interview Questions", "https://www.youtube.com/watch?v=5NvjAicG7eI", "Answer tough questions with confidence")
        ],
        []
      ),
      Course.new(
        "time_management_course",
        "Advanced Time Management",
        "Boost productivity, prioritize tasks, and achieve work-life balance.",
        2,
        5,
        ["Professionals", "Students", "Teams"],
        [
          YouTubeVideo.new("Time Management Strategies", "https://www.youtube.com/watch?v=CyQ-EEhyzNg", "Plan and organize effectively"),
          YouTubeVideo.new("Productivity Boosting Techniques", "https://www.youtube.com/watch?v=XSyWq7WjH5b", "Maximize time usage"),
          YouTubeVideo.new("Work-Life Balance Improvements", "https://www.youtube.com/watch?v=Y8E7dQlrwVw", "Maintain balance")
        ],
        []
      )
    ];

    for (course in codingCourses.values()) {
      courses.add(course.id, course);
    };
    for (course in technicalCourses.values()) {
      courses.add(course.id, course);
    };
    for (course in communicationCourses.values()) {
      courses.add(course.id, course);
    };
  };
};
