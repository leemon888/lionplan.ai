// Searchable list of Columbia undergraduate majors and minors for onboarding.
// STARTER LIST: names are hand-entered; check against the bulletin before launch.
// `programId` marks the ones whose requirements we can track (data/programs.ts).

export interface StudyOption {
  id: string;
  name: string;
  schools: string[]; // where it's offered: "College", "Engineering"
  programId?: string;
  aliases?: string[]; // extra search words: "cs", "econ", "ORFE"
}

const m = (name: string, schools: string[], aliases: string[] = [], programId?: string): StudyOption => ({
  id: `${schools.join("-")}:${name}`.toLowerCase().replace(/[^a-z0-9:]+/g, "-"),
  name,
  schools,
  aliases,
  programId,
});

const C = ["College"];
const E = ["Engineering"];
const CE = ["College", "Engineering"];

export const MAJORS: StudyOption[] = [
  m("Economics", C, ["econ"], "cc-econ"),
  m("Mathematics", C, ["math"], "cc-math"),
  m("Computer Science", C, ["cs", "comp sci", "coms"], "cc-cs"),
  m("Statistics", C, ["stats", "stat"]),
  m("Economics–Mathematics", C, ["econ math"]),
  m("Economics–Statistics", C, ["econ stats"]),
  m("Economics–Political Science", C, ["econ poli sci"]),
  m("Economics–Philosophy", C, ["econ philo"]),
  m("Mathematics–Statistics", C, ["math stats"]),
  m("Computer Science–Mathematics", C, ["cs math"]),
  m("Information Science", C, ["info sci"]),
  m("Political Science", C, ["poli sci", "polisci"]),
  m("History", C),
  m("English", C, ["lit"]),
  m("Comparative Literature and Society", C, ["complit"]),
  m("Philosophy", C, ["philo"]),
  m("Psychology", C, ["psych"]),
  m("Neuroscience and Behavior", C, ["neuro"]),
  m("Biology", C, ["bio"]),
  m("Biochemistry", C, ["biochem"]),
  m("Chemistry", C, ["chem"]),
  m("Physics", C),
  m("Astrophysics", C, ["astro"]),
  m("Earth and Environmental Sciences", C, ["eesc"]),
  m("Sustainable Development", C, ["sus dev"]),
  m("Sociology", C, ["soc"]),
  m("Anthropology", C, ["anthro"]),
  m("Art History", C, ["arthist"]),
  m("Architecture", C, ["arch"]),
  m("Music", C),
  m("Film and Media Studies", C, ["film"]),
  m("Visual Arts", C, ["art"]),
  m("Linguistics", C, ["ling"]),
  m("Classics", C),
  m("East Asian Studies", C, ["ealac"]),
  m("Human Rights", C),
  m("Urban Studies", C, ["urban planning"]),
  m("Women's and Gender Studies", C, ["wgss"]),
  m("Applied Mathematics", E, ["apma", "applied math"]),
  m("Applied Physics", E, ["aphy"]),
  m("Operations Research", E, ["or", "ieor"]),
  m("Operations Research: Financial Engineering", E, ["orfe", "fin eng", "financial engineering"]),
  m("Operations Research: Engineering Management Systems", E, ["ems"]),
  m("Industrial Engineering", E, ["ieor"]),
  m("Computer Science", E, ["cs", "comp sci", "seas cs"]),
  m("Computer Engineering", E, ["ce", "comp e"]),
  m("Electrical Engineering", E, ["ee", "elen"]),
  m("Mechanical Engineering", E, ["mech e", "meche"]),
  m("Biomedical Engineering", E, ["bme"]),
  m("Chemical Engineering", E, ["cheme"]),
  m("Civil Engineering", E, ["civil"]),
  m("Earth and Environmental Engineering", E, ["eee"]),
  m("Materials Science and Engineering", E, ["mse"]),
];

export const MINORS: StudyOption[] = [
  m("Computer Science", CE, ["cs", "comp sci"]),
  m("Mathematics", C, ["math"]),
  m("Statistics", C, ["stats"]),
  m("Economics", CE, ["econ"]),
  m("Applied Mathematics", E, ["applied math"]),
  m("Philosophy", C, ["philo"]),
  m("Psychology", CE, ["psych"]),
  m("Political Science", C, ["poli sci"]),
  m("History", C),
  m("English", C),
  m("Sociology", C),
  m("Music", C),
  m("Art History", C),
  m("Linguistics", C),
  m("Sustainable Development", C),
  m("Architecture", C),
  m("Operations Research", E, ["or"]),
];

/** Options whose name or aliases contain every typed word, best matches first. */
export function searchStudies(list: StudyOption[], query: string, limit = 8): StudyOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored = list
    .map((o) => {
      const name = o.name.toLowerCase().replace(/–/g, " ");
      const hay = [name, ...(o.aliases ?? [])].join(" | ");
      if (!words.every((w) => hay.includes(w))) return null;
      const exactAlias = o.aliases?.includes(q) ? 0 : 1;
      const prefix = name.startsWith(q) ? 0 : 1;
      return { o, score: exactAlias * 2 + prefix + name.length / 1000 };
    })
    .filter((x): x is { o: StudyOption; score: number } => !!x)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((x) => x.o);
}
