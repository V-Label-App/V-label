/**
 * Utility functions for calculating user level and reputation milestones.
 */

/**
 * Option 1: Linear Scaling (User's suggestion)
 * Level = Points / 10 + 1
 * Good for simple systems where leveling up speed is constant.
 */
export const calculateLevelLinear = (points: number, step: number = 10): number => {
    return Math.floor((points || 0) / step) + 1;
};

/**
 * Option 2: Quadratic Scaling (RPG Style - RECOMMENDED)
 * Points for Level N = Coefficient * (N-1)^2
 * Level = sqrt(Points / Coefficient) + 1
 * 
 * Pros: Easy to level up early (Levels 1-5), but harder as you progress.
 * This encourages new users and rewards long-term persistence.
 */
export const calculateLevelQuadratic = (points: number, coefficient: number = 5): number => {
    if (!points || points < 0) return 1;
    // Level 1: 0 pts
    // Level 2: 5 pts
    // Level 3: 20 pts
    // Level 4: 45 pts
    // Level 5: 80 pts
    // Level 10: 405 pts
    return Math.floor(Math.sqrt(points / coefficient)) + 1;
};

/**
 * Get the points required for a specific level (Quadratic)
 */
export const getPointsForLevel = (level: number, coefficient: number = 5): number => {
    if (level <= 1) return 0;
    return coefficient * Math.pow(level - 1, 2);
};

/**
 * Calculate progress percentage towards the next level
 */
export const calculateLevelProgress = (points: number, coefficient: number = 5): number => {
    const currentLevel = calculateLevelQuadratic(points, coefficient);
    const pointsThisLevelBase = getPointsForLevel(currentLevel, coefficient);
    const pointsNextLevelBase = getPointsForLevel(currentLevel + 1, coefficient);
    
    const earnedInCurrentLevel = points - pointsThisLevelBase;
    const requiredForNextLevel = pointsNextLevelBase - pointsThisLevelBase;
    
    return Math.min(100, Math.max(0, (earnedInCurrentLevel / requiredForNextLevel) * 100));
};

// Default export uses the recommended Quadratic formula
export const calculateLevel = calculateLevelQuadratic;
