// Configuration rules for Multi-Signal Persona Engine
module.exports = {
  // Minimum items logged in a year before giving a personalized persona
  MIN_ITEMS_FOR_PERSONA: 5,

  // Persona rule thresholds
  RULES: {
    theatricalVip: {
      minCount: 4,
      minShare: 0.30, // 30% of movies
    },
    marathonViewer: {
      minBingeDays: 2, // 2+ days with 3+ items logged
      minWeeklyBurst: 5,
    },
    masterGamer: {
      minHours: 15,
      minShare: 0.15,
    },
    weekendWarrior: {
      minItems: 5,
      minShare: 0.55, // 55%+ logged on Sat/Sun
    },
    backlogBuilder: {
      minPlanToWatch: 8,
      backlogRatio: 1.5, // backlog is >= 1.5x completed
    },
    critic: {
      minRated: 8,
      maxAvgRating: 3.2, // tough crowd
    },
    generousCurator: {
      minRated: 8,
      minAvgRating: 4.4, // loves almost everything
    },
  },
};
