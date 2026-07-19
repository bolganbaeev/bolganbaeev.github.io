import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  pin: string;
  streak: number;
  totalScore: number;
  completedTestsCount: number;
  lastActiveDate?: string;
  totalHistory?: number[];
  histHistory?: number[];
  mathHistory?: number[];
  readHistory?: number[];
  sub1History?: number[];
  sub2History?: number[];
}

export interface TestResult {
  id: string;
  userId: string;
  subject: string;
  topicTitle: string;
  score: number;
  totalQuestions: number;
  date: string;
}

export interface QuizMistake {
  id: string; // uuid or composite
  userId: string;
  subject: string;
  topicId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  date: string;
}

interface UBTDatabaseSchema extends DBSchema {
  profiles: {
    key: string;
    value: UserProfile;
  };
  results: {
    key: string;
    value: TestResult;
    indexes: { 'by-userId': string };
  };
  mistakes: {
    key: string;
    value: QuizMistake;
    indexes: { 'by-userId': string; 'by-subject': string };
  };
  settings: {
    key: string;
    value: { key: string; value: any };
  };
}

const DB_NAME = 'ubt-prep-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<UBTDatabaseSchema>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<UBTDatabaseSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Profiles store
        db.createObjectStore('profiles', { keyPath: 'id' });
        
        // Test Results store
        const resultsStore = db.createObjectStore('results', { keyPath: 'id' });
        resultsStore.createIndex('by-userId', 'userId');

        // Mistakes store
        const mistakesStore = db.createObjectStore('mistakes', { keyPath: 'id' });
        mistakesStore.createIndex('by-userId', 'userId');
        mistakesStore.createIndex('by-subject', 'subject');

        // Settings store
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// Helper: Save current user profile
export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('profiles', profile);
  // Also keep current user ID in settings for easy retrieval
  await db.put('settings', { key: 'currentUser', value: profile.id });
}

// Helper: Get user profile by ID
export async function getProfile(id: string): Promise<UserProfile | undefined> {
  const db = await getDB();
  return db.get('profiles', id);
}

// Helper: Get active current profile
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const db = await getDB();
  const currentUserIdRef = await db.get('settings', 'currentUser');
  if (!currentUserIdRef) return null;
  const user = await db.get('profiles', currentUserIdRef.value);
  return user || null;
}

// Helper: Clear current user session
export async function logoutUser(): Promise<void> {
  const db = await getDB();
  await db.delete('settings', 'currentUser');
}

// Helper: Save test results
export async function saveTestResult(result: TestResult): Promise<void> {
  const db = await getDB();
  await db.put('results', result);

  // Update profile scores
  const profile = await getCurrentProfile();
  if (profile) {
    profile.totalScore = (profile.totalScore || 0) + result.score;
    profile.completedTestsCount = (profile.completedTestsCount || 0) + 1;
    
    // Calculate streak
    const today = new Date().toISOString().split('T')[0];
    if (profile.lastActiveDate) {
      const lastDate = new Date(profile.lastActiveDate);
      const diffTime = Math.abs(new Date(today).getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        profile.streak += 1;
      } else if (diffDays > 1) {
        profile.streak = 1;
      }
    } else {
      profile.streak = 1;
    }
    profile.lastActiveDate = today;
    await db.put('profiles', profile);
  }
}

// Helper: Get test results for active user
export async function getTestResults(userId: string): Promise<TestResult[]> {
  const db = await getDB();
  const results = await db.getAllFromIndex('results', 'by-userId', userId);
  return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Helper: Save a quiz mistake
export async function saveQuizMistake(mistake: QuizMistake): Promise<void> {
  const db = await getDB();
  await db.put('mistakes', mistake);
}

// Helper: Get mistakes for user
export async function getQuizMistakes(userId: string): Promise<QuizMistake[]> {
  const db = await getDB();
  return db.getAllFromIndex('mistakes', 'by-userId', userId);
}

// Helper: Delete a single mistake (when corrected)
export async function deleteQuizMistake(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('mistakes', id);
}

// Helper: Clear all database data
export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  await db.clear('profiles');
  await db.clear('results');
  await db.clear('mistakes');
  await db.clear('settings');
}

// Settings helpers
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDB();
  const res = await db.get('settings', key);
  return res ? (res.value as T) : defaultValue;
}

export async function saveSetting(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}
