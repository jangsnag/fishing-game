/**
 * Level Manager - Manages game level order and navigation
 */
export class LevelManager {
  // Level order list
  static readonly LEVEL_ORDER: string[] = [
    "Level1Scene",
    "Level2Scene"
  ];

  // Get the key of the next level scene
  static getNextLevelScene(currentSceneKey: string): string | null {
    const currentIndex = LevelManager.LEVEL_ORDER.indexOf(currentSceneKey);
    
    // If it's the last level or current level not found, return null
    if (currentIndex === -1 || currentIndex >= LevelManager.LEVEL_ORDER.length - 1) {
      return null;
    }
    
    return LevelManager.LEVEL_ORDER[currentIndex + 1];
  }

  // Check if it's the last level
  static isLastLevel(currentSceneKey: string): boolean {
    const currentIndex = LevelManager.LEVEL_ORDER.indexOf(currentSceneKey);
    return currentIndex === LevelManager.LEVEL_ORDER.length - 1;
  }

  // Get the key of the first level scene
  static getFirstLevelScene(): string | null {
    return LevelManager.LEVEL_ORDER.length > 0 ? LevelManager.LEVEL_ORDER[0] : null;
  }
}
