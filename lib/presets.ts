import type { PresetTopic } from "./types";

export const PRESET_TOPICS: PresetTopic[] = [
  {
    id: "festival",
    label: "City Light Festival",
    prompt:
      "Latest reactions to the City Light Festival — people love the glowing installations, calling it beautiful, magical and the best night out this year.",
    accent: "#39ffb0",
  },
  {
    id: "update",
    label: "App v3 Update",
    prompt:
      "Reactions to the App v3 update — users are frustrated, it feels slow, buggy and broken after the redesign, lots of disappointed and annoyed posts.",
    accent: "#ff4d6d",
  },
  {
    id: "election",
    label: "Policy Announcement",
    prompt:
      "Latest reactions to the new policy announcement — opinions are mixed, measured takes, some hopeful, some concerned, mostly wait and see.",
    accent: "#6ea8ff",
  },
  {
    id: "spacelaunch",
    label: "Aurora Rocket Launch",
    prompt:
      "Reactions to the Aurora rocket launch — incredible, stunning, a breakthrough moment, people are thrilled and excited about the future.",
    accent: "#9d7bff",
  },
];
