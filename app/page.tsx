'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface WorkoutHistory {
  id: string;
  workoutType: string;
  duration: number;
  reps?: number;
  calories: number;
  explanation?: string;
  timestamp: string;
}

export default function Home() {
  const [workoutType, setWorkoutType] = useState('');
  const [duration, setDuration] = useState('');
  const [reps, setReps] = useState('');
  const [runningPace, setRunningPace] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ 
    calories: number; 
    workoutType: string; 
    duration: number;
    reps?: number;
    explanation?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([]);


  // Helper function to check if workout is a push-up variation
  const isPushUp = (workout: string): boolean => {
    try {
      if (!workout) return false;
      const trimmed = workout.trim();
      if (!trimmed) return false;
      
      // Convert to lowercase and remove all spaces and hyphens
      const normalized = trimmed.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
      
      // Check if it matches pushup variations
      // This handles: "push up", "push-up", "pushup", "pushups", "push ups", etc.
      return normalized === 'pushup' || normalized === 'pushups' || normalized.startsWith('pushup');
    } catch (error) {
      console.error('[isPushUp error]', error);
      return false;
    }
  };

  // Memoize the push-up check to ensure proper reactivity
  const isPushUpWorkout = useMemo(() => {
    return isPushUp(workoutType);
  }, [workoutType]);

  // Load workout history and weight from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fitness-tracker-history');
      if (saved) {
        try {
          setWorkoutHistory(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading workout history:', e);
        }
      }
      
      // Only load weight unit preference, not the weight value itself
      const savedWeightUnit = localStorage.getItem('fitness-tracker-weight-unit');
      if (savedWeightUnit) {
        setWeightUnit(savedWeightUnit);
      } else {
        // Default to lbs if no saved preference
        setWeightUnit('lbs');
      }
    }
  }, []);

  // Only save weight unit preference, not the weight value itself
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fitness-tracker-weight-unit', weightUnit);
    }
  }, [weightUnit]);

  // Save workout history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && workoutHistory.length > 0) {
      localStorage.setItem('fitness-tracker-history', JSON.stringify(workoutHistory));
    }
  }, [workoutHistory]);

  const addToHistory = (workout: { 
    calories: number; 
    workoutType: string; 
    duration: number;
    reps?: number;
    explanation?: string;
  }) => {
    const newWorkout: WorkoutHistory = {
      id: Date.now().toString(),
      ...workout,
      timestamp: new Date().toISOString(),
    };
    setWorkoutHistory(prev => [newWorkout, ...prev]);
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all workout history?')) {
      setWorkoutHistory([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fitness-tracker-history');
      }
    }
  };

  const deleteWorkout = (id: string) => {
    if (confirm('Are you sure you want to delete this workout?')) {
      const updatedHistory = workoutHistory.filter(workout => workout.id !== id);
      setWorkoutHistory(updatedHistory);
      if (typeof window !== 'undefined') {
        if (updatedHistory.length > 0) {
          localStorage.setItem('fitness-tracker-history', JSON.stringify(updatedHistory));
        } else {
          localStorage.removeItem('fitness-tracker-history');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPushUpWorkout = isPushUp(workoutType);
    
    if (!workoutType.trim()) {
      alert('Please fill in the workout type');
      return;
    }

    if (isPushUpWorkout) {
      if (!reps.trim()) {
        alert('Please fill in the number of reps');
        return;
      }
      const repsNum = parseFloat(reps);
      if (isNaN(repsNum) || repsNum <= 0 || !Number.isInteger(repsNum)) {
        alert('Please enter a valid number of reps (must be a positive whole number)');
        return;
      }
    } else {
      if (!duration.trim()) {
        alert('Please fill in the duration');
        return;
      }
      const durationNum = parseFloat(duration);
      if (isNaN(durationNum) || durationNum <= 0) {
        alert('Please enter a valid duration (in minutes)');
        return;
      }
    }

    setIsSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const isRunning = workoutType.trim().toLowerCase() === 'run' || workoutType.trim().toLowerCase() === 'running';
      
      const response = await fetch('/api/calculate-calories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workoutType: workoutType.trim(),
          ...(isPushUpWorkout 
            ? { reps: parseInt(reps) } 
            : { duration: parseFloat(duration) }
          ),
          ...(isRunning && runningPace.trim() && { runningPace: runningPace.trim() }),
          ...(weight.trim() && { weight: weight.trim(), weightUnit }),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to calculate calories');
        }
        setResult(data);
        addToHistory(data);
        
        // Clear form after successful submission
        setWorkoutType('');
        setDuration('');
        setReps('');
        setRunningPace('');
        setWeight(''); // Clear weight so it must be entered each time
      } else {
        const text = await response.text();
        throw new Error(
          `Server returned an error page. Details: ${text.slice(0, 200)}`
        );
      }
      
      // Clear form after successful submission
      setWorkoutType('');
      setDuration('');
      setReps('');
    } catch (error: any) {
      console.error('Error submitting workout:', error);
      setError(error.message || 'Failed to calculate calories. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="container mx-auto px-4 py-8 sm:py-12 md:py-16 max-w-4xl space-y-6">
        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 mb-6 border border-gray-100 dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-0.5 mb-3">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 flex-shrink-0">
                <Image
                  src="/logos/Main Logo.png"
                  alt="Fitness Tracker Logo"
                  fill
                  className="object-contain"
                  style={{
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
                  }}
                  priority
                  unoptimized
                />
              </div>
              {/* Metal Plate Background behind Fitness Tracker text only */}
              <div className="flex flex-col items-center">
                <div 
                  className="relative inline-block px-6 py-4 rounded-lg"
                  style={{
                    position: 'relative',
                    minHeight: '120px',
                    minWidth: '400px',
                  }}
                >
                  {/* Metal Plate Image Background */}
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <img
                      src="/logos/Metal Plate.jpg"
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ position: 'absolute', top: 0, left: 0 }}
                    />
                  </div>
                  <div className="relative z-10">
                    <h1 
                      className="font-extrabold text-white leading-none"
                      style={{
                        fontFamily: "'Chicago Athletic', Arial, sans-serif",
                        textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 0, 0, 0.5)',
                        letterSpacing: '0.05em',
                        fontWeight: 'normal',
                        fontSize: 'clamp(5.63rem, 7.8vw + 1rem, 12rem)',
                      }}
                    >
                      <div>Fitness</div>
                      <div style={{ marginTop: '-0.3em' }}>Tracker</div>
                    </h1>
                  </div>
                </div>
                <p 
                  className="text-2xl sm:text-2xl md:text-3xl text-white mt-1"
                  style={{
                    fontFamily: "'Althetic', 'Arial Black', 'Impact', sans-serif",
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 1px 1px 2px rgba(0, 0, 0, 0.9)',
                    fontWeight: 'normal',
                  }}
                >
                  by Keith L
                </p>
              </div>
            </div>
            <div className="max-w-md mx-auto">
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                Track your workouts and discover how many calories you burned with AI-powered insights
              </p>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500 mt-1">
                記錄您的運動並透過 AI 驅動的洞察發現您燃燒了多少卡路里
              </p>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mt-2">
                Try typing "run" or "running" where it gives more optional fields to fill out or "push ups" for the duration field to change to Reps instead!
              </p>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-500 mt-1">
                試著輸入「run」或「running」以獲得更多可選欄位，或輸入「push ups」將持續時間欄位改為次數！
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label 
                htmlFor="workoutType" 
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Workout Type
              </label>
              <input
                type="text"
                id="workoutType"
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                placeholder="e.g., Running, Weightlifting, Yoga, Swimming, Cycling..."
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         transition-all duration-200 shadow-sm hover:shadow-md
                         disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              />
            </div>

            {/* Weight Input - Only show for Run/Running */}
            {(workoutType.trim().toLowerCase() === 'run' || workoutType.trim().toLowerCase() === 'running') && (
              <div className="space-y-2">
                <label 
                  htmlFor="weight" 
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Your Weight (optional, for more accurate calculations)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g., 70"
                    min="1"
                    step="0.1"
                    className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                             transition-all duration-200 shadow-sm hover:shadow-md
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  />
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                             transition-all duration-200"
                    disabled={isSubmitting}
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter your weight for more accurate calorie calculations. This is saved and used for all future running calculations.
                </p>
              </div>
            )}

            {/* Running Pace Field - Only show for Run/Running */}
            {(workoutType.trim().toLowerCase() === 'run' || workoutType.trim().toLowerCase() === 'running') && (
              <div className="space-y-2">
                <label 
                  htmlFor="runningPace" 
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Running Pace min/km (optional)
                </label>
                <input
                  type="text"
                  id="runningPace"
                  value={runningPace}
                  onChange={(e) => setRunningPace(e.target.value)}
                  placeholder="e.g., 5 min/km, 6 min/km, 4.5 min/km..."
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           transition-all duration-200 shadow-sm hover:shadow-md
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter your pace in min/km format (e.g., "5 min/km" or "6 min/km") for more accurate calorie calculation
                </p>
              </div>
            )}

            {/* Reps Field - Only show for Push-up variations */}
            {isPushUpWorkout ? (
              <div className="space-y-2">
                <label 
                  htmlFor="reps" 
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Reps
                </label>
                <input
                  type="number"
                  id="reps"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="e.g., 10, 20, 50..."
                  min="1"
                  step="1"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           transition-all duration-200 shadow-sm hover:shadow-md
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label 
                  htmlFor="duration" 
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 30, 45, 60..."
                  min="1"
                  step="1"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                           transition-all duration-200 shadow-sm hover:shadow-md
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                       disabled:from-red-300 disabled:to-red-400
                       text-white font-bold py-4 px-6 rounded-xl 
                       transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]
                       focus:outline-none focus:ring-4 focus:ring-red-500/50
                       disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculating calories...
                </span>
              ) : (
                '🔥 Calculate Calories Burned'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800 
                          animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h2 className="text-lg font-bold text-red-800 dark:text-red-300 mb-1">
                    Error
                  </h2>
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 
                          rounded-xl border-2 border-green-200 dark:border-green-800 
                          animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-lg">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-green-300 mb-3">
                  🎉 Workout Complete!
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-lg">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{result.workoutType}</span>{' '}
                  {result.reps ? (
                    <>for <span className="font-bold text-indigo-600 dark:text-indigo-400">{result.reps} reps</span></>
                  ) : (
                    <>for <span className="font-bold text-indigo-600 dark:text-indigo-400">{result.duration} minutes</span></>
                  )}
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-4 shadow-inner">
                  <p className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    {result.calories}
                  </p>
                  <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                    calories burned
                  </p>
                </div>
                {result.explanation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                    💡 {result.explanation}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Workout History Section */}
        {workoutHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border border-gray-100 dark:border-gray-700 
                        animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                📊 Workout History
              </h2>
              <button
                onClick={clearHistory}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 
                         font-semibold transition-all duration-200 hover:underline px-3 py-1.5 rounded-lg
                         hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                🗑️ Clear History
              </button>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {workoutHistory.map((workout, index) => (
                <div
                  key={workout.id}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-700/30 
                           rounded-xl border border-gray-200 dark:border-gray-600 
                           hover:shadow-md hover:scale-[1.02] transition-all duration-200
                           animate-in fade-in slide-in-from-right-4 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {workout.workoutType}
                        </h3>
                        {workout.reps ? (
                          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                            {workout.reps} reps
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                            {workout.duration} min
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {workout.calories} calories
                      </p>
                      {workout.explanation && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic line-clamp-2">
                          {workout.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                        {new Date(workout.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <button
                        onClick={() => deleteWorkout(workout.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 
                                 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg 
                                 transition-all duration-200 opacity-0 group-hover:opacity-100
                                 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        title="Delete workout"
                        aria-label="Delete workout"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 p-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 
                          rounded-xl border-2 border-indigo-200 dark:border-indigo-800 shadow-inner">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Workouts</p>
                  <p className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {workoutHistory.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Calories</p>
                  <p className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {workoutHistory.reduce((sum, w) => sum + w.calories, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {workoutHistory.length === 0 && !result && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 md:p-12 text-center border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No workouts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start tracking your fitness journey by logging your first workout above!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
