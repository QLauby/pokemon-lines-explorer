import { StatProfile, RollProfile } from "@/types/types"

export class DistributionEngine {
  /**
   * Creates an initial distribution array with 100% probability at currentHp.
   */
  static createInitialDistribution(currentHp: number, maxHp: number): number[] {
    const dist = new Array(Math.ceil(maxHp) + 1).fill(0);
    const validHp = Math.max(0, Math.min(Math.ceil(maxHp), Math.ceil(currentHp)));
    dist[validHp] = 1.0;
    return dist;
  }

  /**
   * Applies a discrete damage array (rolls) to an existing distribution.
   */
  static applyDiscreteDamage(currentDist: number[], rolls: readonly number[], isHeal: boolean, maxHp: number): number[] {
    const nextDist = new Array(Math.ceil(maxHp) + 1).fill(0);
    if (!rolls || rolls.length === 0) {
        return [...currentDist];
    }
    const cap = Math.ceil(maxHp);
    const P = 1.0 / rolls.length;

    for (let hp = 0; hp <= cap; hp++) {
      const prob = currentDist[hp];
      if (!prob) continue; // skip 0 and undefined

      // Edge case: if already dead, stays dead (unless we add resurrection items later, but right now heals on 0 hp do nothing in standard Pokemon, though here we'll let it heal if isHeal is true)
      if (hp === 0 && !isHeal) {
          nextDist[0] += prob;
          continue;
      }

      for (let i = 0; i < rolls.length; i++) {
        let newHp = isHeal ? hp + rolls[i] : hp - rolls[i];
        if (newHp < 0) newHp = 0;
        if (newHp > cap) newHp = cap;
        
        nextDist[newHp] += prob * P;
      }
    }
    
    return nextDist;
  }

  /**
   * Computes the new distribution from a generic numerical amount (fixed damage/heal)
   */
  static applyFixedDamage(currentDist: number[], deltaHp: number, maxHp: number): number[] {
    const cap = Math.ceil(maxHp);
    const nextDist = new Array(cap + 1).fill(0);
    
    const delta = Math.trunc(deltaHp);
    
    for (let hp = 0; hp <= cap; hp++) {
      const prob = currentDist[hp];
      if (!prob) continue;

      let newHp = hp + delta;
      if (newHp < 0) newHp = 0;
      if (newHp > cap) newHp = cap;

      nextDist[newHp] += prob;
    }
    return nextDist;
  }

  /**
   * Sets the HP explicitly to a given value.
   */
  static applySetHp(currentDist: number[], setHpValue: number, maxHp: number): number[] {
    const cap = Math.ceil(maxHp);
    const nextDist = new Array(cap + 1).fill(0);
    let newHp = Math.trunc(setHpValue);
    if (newHp < 0) newHp = 0;
    if (newHp > cap) newHp = cap;
    
    let totalP = 0;
    for (let hp = 0; hp <= cap; hp++) {
      if (currentDist[hp]) totalP += currentDist[hp];
    }
    nextDist[newHp] = totalP; 
    return nextDist;
  }

  /**
   * Computes a full suite of metrics from a distribution.
   */
  static getProfileStats(dist: number[]): { 
    minHp: number, 
    maxHp: number, 
    meanHp: number, 
    median: number,
    koRisk: number 
  } {
     let minHp = -1;
     let maxHp = -1;
     let meanHp = 0;
     
     for (let hp = 0; hp < dist.length; hp++) {
         const p = dist[hp];
         if (p > 0) {
             if (minHp === -1) minHp = hp;
             maxHp = hp;
             meanHp += hp * p;
         }
     }
     
     if (minHp === -1) return { minHp: 0, maxHp: 0, meanHp: 0, median: 0, koRisk: 0 }; 

     // Median calculation
     let cumulative = 0;
     let median = 0;
     for (let hp = 0; hp < dist.length; hp++) {
         cumulative += dist[hp] || 0;
         if (cumulative >= 0.5) {
             median = hp;
             break;
         }
     }

     return {
         minHp, maxHp, meanHp, median,
         koRisk: dist[0] || 0
     };
  }

  /**
   * Calculates the exact percentiles (Q5, Q25, MEDIAN, Q75, Q95)
   * The returned array is [Q5, Q25, Median, Q75, Q95]
   */
  static getPercentiles(dist: number[]): { q5: number, q25: number, median: number, q75: number, q95: number } {
     let cumulative = 0;
     const thresholds = [0.05, 0.25, 0.50, 0.75, 0.95];
     const results = [0, 0, 0, 0, 0];
     let tIndex = 0;

     for (let hp = 0; hp < dist.length; hp++) {
        const p = dist[hp] || 0;
        if (p === 0 && cumulative < thresholds[tIndex]) continue;
        
        cumulative += p;
        while (tIndex < thresholds.length && cumulative >= thresholds[tIndex]) {
           results[tIndex] = hp;
           tIndex++;
        }
        if (tIndex >= thresholds.length) break;
     }

     return {
         q5: results[0],
         q25: results[1],
         median: results[2],
         q75: results[3],
         q95: results[4]
     };
  }
}
