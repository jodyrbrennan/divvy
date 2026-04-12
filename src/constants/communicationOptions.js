/**
 * Shared communication profile field definitions.
 * Used by: ProfileSetupScreen, AddMemberScreen, Dashboard (settings).
 *
 * Each field has:
 *   - field: the key stored in user.communicationProfile
 *   - title: heading text
 *   - settingsLabel: shorter label for the settings view
 *   - sub: subtitle for self-setup (ProfileSetupScreen)
 *   - subForOther(name): subtitle for setting up another member (AddMemberScreen)
 *   - options: array of { v (value), l (label), d (long description) }
 *   - italic: if true, descriptions should render italic (used for askStyle examples)
 */

export const COMM_PROFILE_FIELDS = [
  {
    field: "tone",
    title: "Preferred tone",
    settingsLabel: "Preferred tone",
    sub: "How should Divvy sound when it talks to you?",
    subForOther: (name) => `How should Divvy sound when talking to ${name}?`,
    options: [
      { v: "casual", l: "Casual", d: "Relaxed and friendly, like a roommate" },
      { v: "direct", l: "Direct", d: "Straight to the point, no fluff" },
      { v: "gentle", l: "Gentle", d: "Soft and considerate, never pushy" },
      { v: "humorous", l: "Humorous", d: "Light-hearted with a bit of fun" },
    ],
  },
  {
    field: "sensitivity",
    title: "Task sensitivity",
    settingsLabel: "Task sensitivity",
    sub: "How sensitive are you to being asked to do tasks?",
    subForOther: (name) => `How sensitive is ${name} to being asked to do tasks?`,
    options: [
      { v: "low", l: "Low", d: "Ask me anything, I don't mind at all" },
      { v: "medium", l: "Medium", d: "I'm fine with most asks, just be reasonable" },
      { v: "high", l: "High", d: "Please be gentle when asking me to do things" },
    ],
  },
  {
    field: "askStyle",
    title: "How to be asked",
    settingsLabel: "Ask style",
    sub: "When Divvy needs you to do something, how should it phrase it?",
    subForOther: (name) => `When Divvy needs ${name} to do something, how should it phrase it?`,
    italic: true,
    options: [
      { v: "direct", l: "Direct request", d: '"Take out the trash"' },
      { v: "suggestion", l: "Suggestion", d: '"The trash could use taking out"' },
      { v: "question", l: "Question", d: '"Could you take out the trash?"' },
    ],
  },
  {
    field: "forgetfulness",
    title: "Forgetfulness",
    settingsLabel: "Forgetfulness",
    sub: "How likely are you to forget tasks? No judgment — this helps Divvy know when to remind you.",
    subForOther: (name) => `How likely is ${name} to forget tasks?`,
    options: [
      { v: "rarely", l: "Rarely", d: "I'm on top of things" },
      { v: "sometimes", l: "Sometimes", d: "Depends on the day" },
      { v: "often", l: "Often", d: "I definitely need reminders" },
    ],
  },
  {
    field: "undoneFeelings",
    title: "Undone tasks",
    settingsLabel: "Undone tasks feeling",
    sub: "When tasks pile up and don't get done, how does it make you feel?",
    subForOther: (name) => `When tasks pile up, how does ${name} feel?`,
    options: [
      { v: "unbothered", l: "Unbothered", d: "It can wait, no stress" },
      { v: "mildly_annoyed", l: "Mildly annoyed", d: "I notice and it bugs me a little" },
      { v: "very_stressed", l: "Very stressed", d: "I really need things to get done" },
    ],
  },
  {
    field: "notifFrequency",
    title: "Notifications",
    settingsLabel: "Notification frequency",
    sub: "How often should Divvy nudge you?",
    subForOther: (name) => `How often should Divvy nudge ${name}?`,
    options: [
      { v: "minimal", l: "Minimal", d: "Only for urgent things" },
      { v: "moderate", l: "Moderate", d: "A healthy nudge when needed" },
      { v: "frequent", l: "Frequent", d: "Keep me in the loop on everything" },
    ],
  },
  {
    field: "recognitionPref",
    title: "Recognition",
    settingsLabel: "Recognition preference",
    sub: "When someone thanks you or celebrates your contribution, how would you like to receive it?",
    subForOther: (name) => `When someone celebrates ${name}'s contribution, how should they receive it?`,
    options: [
      { v: "public", l: "In the household feed", d: "Everyone can see the shout-out" },
      { v: "private", l: "Privately", d: "Just between me and the person" },
      { v: "both", l: "Both", d: "Public and private" },
    ],
  },
];

/**
 * Default values for a new communication profile.
 */
export const DEFAULT_COMM_PROFILE = {
  tone: "casual",
  sensitivity: "medium",
  askStyle: "direct",
  forgetfulness: "sometimes",
  undoneFeelings: "mildly_annoyed",
  notifFrequency: "moderate",
  recognitionPref: "both",
};
