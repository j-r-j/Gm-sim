/**
 * Selectors for E2E tests.
 * These selectors target React Native Web elements by their accessible names,
 * text content, or testID attributes.
 */

export const selectors = {
  // Start Screen
  startScreen: {
    logo: 'text=GM Sim',
    newGameButton: 'text=New Game',
    continueButton: 'text=Continue',
    settingsButton: 'text=Settings',
    loadingIndicator: 'text=Loading...',
  },

  // Team Selection Screen
  teamSelection: {
    header: 'text=Select Your Team',
    backButton: 'text=← Back',
    byDivisionTab: 'text=By Division',
    allTeamsTab: 'text=All Teams',
    gmNameInput: 'input[placeholder="Enter your GM name"]',
    saveSlot1: 'text=1',
    saveSlot2: 'text=2',
    saveSlot3: 'text=3',
    startCareerButton: 'text=Start Career',
    // Dynamic team selection
    teamCard: (abbreviation: string) => `text=${abbreviation}`,
    divisionHeader: (conference: string, division: string) => `text=${conference} ${division}`,
  },

  // Staff Decision Screen
  staffDecision: {
    keepStaff: 'text=Keep Current Staff',
    hireNew: 'text=Hire New Staff',
    header: 'text=Staff Decision',
  },

  // Staff Hiring Screen
  staffHiring: {
    header: 'text=Hire Staff',
    continueButton: 'text=Continue',
    confirmButton: 'text=Confirm',
    coachCard: (name: string) => `text=${name}`,
  },

  // Dashboard
  dashboard: {
    teamBanner: '[data-testid="team-banner"]',
    gmName: (name: string) => `text=GM: ${name}`,
    // Menu cards
    rosterCard: 'text=Roster',
    depthChartCard: 'text=Depth Chart',
    staffCard: 'text=Staff',
    financesCard: 'text=Finances',
    contractsCard: 'text=Contracts',
    scheduleCard: 'text=Schedule',
    standingsCard: 'text=Standings',
    statsCard: 'text=Stats',
    newsCard: 'text=News',
    weeklyDigestCard: 'text=Weekly Digest',
    draftBoardCard: 'text=Draft Board',
    bigBoardCard: 'text=Big Board',
    freeAgencyCard: 'text=Free Agency',
    gamecastCard: 'text=Gamecast',
    offseasonTasksCard: 'text=Offseason Tasks',
    // Buttons
    advanceWeekButton: 'text=Advance Week',
    advancePhaseButton: 'text=Advance Phase',
    saveButton: 'text=Save',
    settingsButton: 'text=Settings',
    mainMenuButton: 'text=Menu',
    // Status bar items
    recordStatus: 'text=Record',
    capSpaceStatus: 'text=Cap Space',
    rosterStatus: 'text=Roster',
    // Job security
    jobSecure: 'text=JOB SECURE',
    stable: 'text=STABLE',
    warmSeat: 'text=WARM SEAT',
    hotSeat: 'text=HOT SEAT',
    danger: 'text=DANGER',
    // Division status
    divisionLeader: 'text=Division Leader',
    // Career stats
    careerStats: 'text=Career Stats',
  },

  // Roster Screen
  roster: {
    header: 'text=Roster',
    backButton: 'text=← Back',
    playerCard: (name: string) => `text=${name}`,
    positionFilter: (pos: string) => `text=${pos}`,
  },

  // Schedule Screen
  schedule: {
    header: 'text=Schedule',
    backButton: 'text=Back',
    weekHeader: (week: number) => `text=Week ${week}`,
  },

  // Standings Screen
  standings: {
    header: 'text=Standings',
    backButton: 'text=Back',
    conferenceTab: (conf: string) => `text=${conf}`,
  },

  // Gamecast Screen
  gamecast: {
    header: 'text=Gamecast',
    startGameButton: 'text=Start Game',
    simButton: 'text=Sim',
    simQuarterButton: 'text=Sim Quarter',
    simHalfButton: 'text=Sim Half',
    simGameButton: 'text=Sim Game',
    continueButton: 'text=Continue',
    viewResultsButton: 'text=View Results',
    backButton: 'text=Back',
  },

  // Offseason Screen
  offseason: {
    header: 'text=Offseason',
    currentPhase: (phase: string) => `text=${phase}`,
    advanceButton: 'text=Advance',
    completeButton: 'text=Complete',
    continueButton: 'text=Continue',
    // Phases
    seasonRecap: 'text=Season Recap',
    coachingDecisions: 'text=Coaching Decisions',
    contractManagement: 'text=Contract Management',
    combine: 'text=NFL Combine',
    freeAgency: 'text=Free Agency',
    draft: 'text=NFL Draft',
    udfa: 'text=UDFA',
    otas: 'text=OTAs',
    trainingCamp: 'text=Training Camp',
    preseason: 'text=Preseason',
    finalCuts: 'text=Final Cuts',
    seasonStart: 'text=Season Start',
  },

  // Draft Screen
  draft: {
    header: 'text=Draft',
    draftBoardHeader: 'text=Draft Board',
    draftRoomHeader: 'text=Draft Room',
    prospectCard: (name: string) => `text=${name}`,
    draftButton: 'text=Draft',
    selectButton: 'text=Select',
    passButton: 'text=Pass',
    tradeButton: 'text=Trade',
    autoPickToggle: 'text=Auto Pick',
    roundIndicator: (round: number) => `text=Round ${round}`,
    pickIndicator: (pick: number) => `text=Pick ${pick}`,
    onTheClockBanner: 'text=On the Clock',
  },

  // Free Agency Screen
  freeAgency: {
    header: 'text=Free Agency',
    playerCard: (name: string) => `text=${name}`,
    signButton: 'text=Sign',
    offerButton: 'text=Offer',
    backButton: 'text=Back',
  },

  // Trade Screen
  trade: {
    header: 'text=Trade',
    proposeButton: 'text=Propose',
    acceptButton: 'text=Accept',
    rejectButton: 'text=Reject',
    cancelButton: 'text=Cancel',
    backButton: 'text=Back',
  },

  // Staff Screen
  staff: {
    header: 'text=Staff',
    coachesTab: 'text=Coaches',
    scoutsTab: 'text=Scouts',
    fireButton: 'text=Fire',
    hireButton: 'text=Hire',
    coachCard: (name: string) => `text=${name}`,
    backButton: 'text=Back',
  },

  // Common
  common: {
    loadingSpinner: '[data-testid="loading-spinner"]',
    loadingText: 'text=Loading',
    errorMessage: 'text=Error',
    confirmButton: 'text=Confirm',
    cancelButton: 'text=Cancel',
    closeButton: 'text=Close',
    backButton: 'text=Back',
    modalOverlay: '[data-testid="modal-overlay"]',
  },

  // Playoffs
  playoffs: {
    bracketHeader: 'text=Playoff Bracket',
    wildCard: 'text=Wild Card',
    divisional: 'text=Divisional',
    conference: 'text=Conference',
    superBowl: 'text=Super Bowl',
  },
} as const;
