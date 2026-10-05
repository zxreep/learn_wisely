/* ============================================================
   EMBERDESK — SAMPLE DATA
   Real subjects, real exams, real content. Global + India-relevant
   exam contexts both represented (SAT/AP + JEE/NEET/UPSC).
   ============================================================ */
window.SP = window.SP || {};

SP.data = (() => {

  /* `icon` is a key into SP.ui's stroke-icon set — no emoji anywhere. */
  const SUBJECTS = [
    { id: "bio",     name: "Biology",           icon: "dna" },
    { id: "ochem",   name: "Organic Chemistry", icon: "flask" },
    { id: "calc2",   name: "Calculus II",       icon: "integral" },
    { id: "hist",    name: "World History",     icon: "temple" },
    { id: "cs",      name: "Computer Science / DSA", icon: "keyboard" },
  ];

  const EXAMS = [
    { id: "jee",  name: "JEE",  note: "Joint Entrance Examination — India" },
    { id: "neet", name: "NEET", note: "National Eligibility cum Entrance Test — India" },
    { id: "upsc", name: "UPSC", note: "Civil Services Prelims — India" },
    { id: "sat",  name: "SAT",  note: "College Board — US" },
    { id: "ap",   name: "AP",   note: "Advanced Placement — US" },
    { id: "other", name: "Something else", note: "" },
  ];

  /* ---------- LIBRARY ---------- */
  /* Every item is chunked with a visible time/size estimate. */
  const LIBRARY = [
    // Biology — Genetics unit
    { id: "l1", subject: "bio", topic: "Genetics", type: "notes", title: "Mendelian Genetics: Dominance & Punnett Squares", est: "12 min read", author: "Dr. Meera Iyer", rating: 4.8, saves: 2411, explore: true,
      body: `<p>Gregor Mendel's pea-plant experiments (1856–1863) established the two laws that still frame how we teach inheritance.</p>
      <h4>Law of Segregation</h4><p>Each organism carries two alleles per trait; the alleles separate during gamete formation, so each gamete carries only one.</p>
      <h4>Law of Independent Assortment</h4><p>Alleles of different genes assort independently — true for genes on different chromosomes, and the classic exception is <strong>linkage</strong> (genes close together on one chromosome tend to travel together).</p>
      <h4>Working a monohybrid cross</h4><ul><li>Tall (T) is dominant over short (t).</li><li>Tt × Tt gives a 1 TT : 2 Tt : 1 tt genotype ratio — a 3:1 phenotype ratio.</li><li>For a dihybrid TtYy × TtYy cross, expect 9:3:3:1.</li></ul>
      <h4>Test cross</h4><p>Not sure if a tall plant is TT or Tt? Cross it with a homozygous recessive (tt). Any short offspring means the parent was Tt.</p>` },
    { id: "l2", subject: "bio", topic: "Genetics", type: "flashcards", title: "Genetics Vocabulary", est: "24-card deck", author: "You", rating: 4.6, saves: 388, explore: true, mine: true,
      cards: [["Allele","One of two or more versions of a gene at the same locus."],["Homozygous","Two identical alleles (TT or tt)."],["Heterozygous","Two different alleles (Tt)."],["Phenotype","The observable trait, e.g. tall stems."],["Genotype","The allele combination behind the trait."],["Locus","A gene's fixed position on a chromosome."],["Meiosis","Cell division producing 4 haploid gametes."],["Crossing over","Homologous chromosomes exchange segments in prophase I."],["Codominance","Both alleles fully expressed — e.g. AB blood type."],["Incomplete dominance","Blended phenotype — red × white snapdragons give pink."],["Polygenic trait","Many genes shape one trait, e.g. human height."],["Carrier","Heterozygous for a recessive disorder; unaffected but can pass it on."],["Punnett square","Grid for predicting offspring genotype ratios."],["Test cross","Cross with a homozygous recessive to reveal an unknown genotype."],["Linkage","Genes near each other on one chromosome are inherited together."],["Nondisjunction","Chromosomes fail to separate — cause of trisomies like Down syndrome."],["Epistasis","One gene masks or modifies the effect of another."],["Sex-linked","Gene on the X chromosome; males express X-recessive traits more often."],["Pedigree","Family tree diagram tracking a trait across generations."],["Karyotype","Ordered image of a person's chromosomes."],["Haploid (n)","One set of chromosomes — gametes."],["Diploid (2n)","Two sets — somatic cells."],["Law of Segregation","Alleles separate during gamete formation."],["Law of Independent Assortment","Different genes assort independently (unless linked)."]],
      reviewDue: 8 },
    { id: "l3", subject: "bio", topic: "Cell Biology", type: "mindmap", title: "Meiosis vs Mitosis", est: "1-page map", author: "Anaya S.", rating: 4.9, saves: 1876, explore: true },
    { id: "l4", subject: "bio", topic: "Genetics", type: "quiz", title: "Inheritance Patterns Check", est: "8 questions, 6 min", author: "Emberdesk Tutor AI", rating: 4.5, saves: 932, explore: true,
      questions: [
        { q: "A heterozygous tall pea plant (Tt) is crossed with a short plant (tt). What fraction of offspring is expected to be tall?", opts: ["None", "1/2", "3/4", "All"], a: 1 },
        { q: "ABO blood type where both A and B alleles are fully expressed is an example of:", opts: ["Incomplete dominance", "Codominance", "Epistasis", "Linkage"], a: 1 },
        { q: "Two genes close together on the same chromosome are likely to be:", opts: ["Unlinked", "Linked", "Codominant", "Polygenic"], a: 1 },
        { q: "A dihybrid cross TtYy × TtYy produces what classic phenotype ratio?", opts: ["3:1", "1:2:1", "9:3:3:1", "1:1:1:1"], a: 2 },
      ] },
    { id: "l5", subject: "bio", topic: "Cell Biology", type: "video", title: "DNA Replication, Walked Through", est: "9 min video", author: "Prof. Kavya Menon", rating: 4.7, saves: 1240, explore: true },
    { id: "l6", subject: "bio", topic: "Human Physiology", type: "flashcards", title: "NEET Biology: Human Physiology", est: "30-card deck", author: "NEET Biology", rating: 4.8, saves: 5210, explore: true, reviewDue: 6,
      cards: [["Systole","Contraction phase of the cardiac cycle."],["Diastole","Relaxation/filling phase of the heart."],["Hemoglobin","Oxygen-carrying protein in red blood cells; 4 heme groups."],["Alveoli","Air sacs where gas exchange occurs."],["Nephron","Functional unit of the kidney."],["Insulin","Hormone from pancreatic beta cells; lowers blood glucose."],["Villi","Finger-like projections in the small intestine that increase absorption area."]] },

    // Organic Chemistry
    { id: "l7", subject: "ochem", topic: "Mechanisms", type: "notes", title: "SN1 vs SN2: Choosing the Pathway", est: "10 min read", author: "Rohan D.", rating: 4.7, saves: 3021, explore: true,
      body: `<p>Nucleophilic substitution runs by two mechanisms. Identifying which one dominates is mostly about the substrate, the nucleophile, and the solvent.</p>
      <h4>SN2 — one concerted step</h4><ul><li>Backside attack; inversion of stereochemistry ("umbrella flip").</li><li>Favored by methyl &gt; primary &gt; secondary substrates; tertiary never.</li><li>Strong nucleophile, polar aprotic solvent (DMSO, acetone).</li><li>Rate = k[substrate][nucleophile].</li></ul>
      <h4>SN1 — two steps via carbocation</h4><ul><li>Leaving group departs first; planar carbocation intermediate → racemization.</li><li>Favored by tertiary &gt; secondary substrates (carbocation stability).</li><li>Weak nucleophile, polar protic solvent (water, alcohols).</li><li>Rate = k[substrate] only.</li></ul>
      <h4>Quick call</h4><p>Tertiary + weak Nu⁻ + protic → SN1 (with E1 competition under heat). Primary + strong Nu⁻ + aprotic → SN2.</p>` },
    { id: "l8", subject: "ochem", topic: "Functional Groups", type: "cheatsheet", title: "Functional Groups at a Glance", est: "2-page sheet", author: "AP Chemistry Hub", rating: 4.9, saves: 8843, explore: true },
    { id: "l9", subject: "ochem", topic: "Reagents", type: "flashcards", title: "Reagents & What They Do", est: "18-card deck", author: "Rohan D.", rating: 4.6, saves: 1502, explore: true, reviewDue: 4,
      cards: [["NaBH4","Mild reducing agent: aldehydes/ketones → alcohols."],["LiAlH4","Strong reducer: also reduces carboxylic acids & esters."],["PCC","Oxidizes primary alcohols to aldehydes (stops there)."],["KMnO4 (hot)","Strong oxidizer: alkenes cleave; primary alcohols → carboxylic acids."],["Grignard (RMgBr)","Carbon nucleophile: builds C–C bonds with carbonyls."],["H2 / Pd-C","Hydrogenation: alkenes → alkanes (syn addition)."],["SOCl2","Converts alcohols to alkyl chlorides."],["TsCl, pyridine","Tosylates an alcohol — great leaving group, no rearrangement."],["LDA","Bulky strong base: kinetic enolates, E2 with hindered substrates."],["NaOEt / EtOH","Small strong base: thermodynamic enolates, E2."],["BH3 · THF","Hydroboration precursor: anti-Markovnikov alcohol after H2O2/NaOH."],["mCPBA","Epoxidizes alkenes."],["OsO4","Syn dihydroxylation of alkenes."],["Br2 / FeBr3","Brominates aromatic rings (EAS)."],["HNO3 / H2SO4","Nitration of aromatic rings."],["DIBAL-H (−78 °C)","Ester → aldehyde, stopped at low temp."],["NaCN","SN2 with cyanide: adds one carbon."],["H3O+ / heat","Acid hydrolysis; drives elimination under heat."]] },
    { id: "l10", subject: "ochem", topic: "Past Papers", type: "paper", title: "AP Chemistry 2024 — Free Response Set", est: "45 min, PDF", author: "College Board", rating: 4.4, saves: 990, explore: true },

    // Calculus II
    { id: "l11", subject: "calc2", topic: "Integration Techniques", type: "notes", title: "Integration by Parts, Step by Step", est: "14 min read", author: "Prof. Alan Whitfield", rating: 4.8, saves: 4110, explore: true,
      body: `<p>The product rule, run backwards: <strong>∫u dv = uv − ∫v du</strong>.</p>
      <h4>Picking u — LIATE</h4><ul><li><strong>L</strong>ogarithmic (ln x)</li><li><strong>I</strong>nverse trig (arctan x)</li><li><strong>A</strong>lgebraic (x²)</li><li><strong>T</strong>rigonometric (sin x)</li><li><strong>E</strong>xponential (eˣ)</li></ul>
      <p>Whatever comes first in LIATE is your u.</p>
      <h4>Worked example: ∫ x eˣ dx</h4><ul><li>u = x → du = dx; dv = eˣ dx → v = eˣ.</li><li>∫ x eˣ dx = x eˣ − ∫ eˣ dx = x eˣ − eˣ + C.</li></ul>
      <h4>Worked example: ∫ ln x dx</h4><ul><li>u = ln x → du = dx/x; dv = dx → v = x.</li><li>= x ln x − ∫ x · (1/x) dx = x ln x − x + C.</li></ul>
      <h4>When parts loops back</h4><p>For ∫ eˣ sin x dx, applying parts twice returns the original integral — solve for it algebraically instead of continuing.</p>` },
    { id: "l12", subject: "calc2", topic: "Series", type: "quiz", title: "Series Convergence Drills", est: "10 questions, 8 min", author: "Prof. Alan Whitfield", rating: 4.6, saves: 2210, explore: true,
      questions: [
        { q: "Which test settles Σ 1/n² convergence fastest?", opts: ["Divergence test", "p-series test", "Ratio test", "Alternating series test"], a: 1 },
        { q: "Σ (−1)ⁿ/n converges by which test?", opts: ["Comparison", "Integral", "Alternating series", "Root"], a: 2 },
        { q: "If lim(n→∞) aₙ ≠ 0, then Σaₙ:", opts: ["Converges", "Diverges", "Converges conditionally", "No conclusion"], a: 1 },
        { q: "The Ratio Test is inconclusive when the limit L equals:", opts: ["0", "1/2", "1", "∞"], a: 2 },
      ] },
    { id: "l13", subject: "calc2", topic: "Series", type: "mindmap", title: "Which Test? A Convergence Decision Map", est: "1-page map", author: "Hana S.", rating: 4.9, saves: 3320, explore: true },

    // World History
    { id: "l14", subject: "hist", topic: "Revolutions", type: "notes", title: "The French Revolution: Timeline & Turning Points", est: "9 min read", author: "Sofia L.", rating: 4.5, saves: 1430, explore: true,
      body: `<p><strong>1789</strong> — Estates-General convenes (May); Tennis Court Oath (June); Bastille falls July 14; Declaration of the Rights of Man (August).</p>
      <p><strong>1791–92</strong> — Constitutional monarchy; war with Austria and Prussia; monarchy suspended.</p>
      <p><strong>1793–94</strong> — Louis XVI executed; Committee of Public Safety; the Terror under Robespierre; Thermidorian reaction ends it in July 1794.</p>
      <p><strong>1799</strong> — Napoleon's coup of 18 Brumaire closes the revolutionary decade.</p>
      <h4>Why it matters for essays</h4><p>Fiscal crisis + Enlightenment ideas + food scarcity is the standard causal triad; AP and UPSC prompts both reward tying the Terror back to wartime emergency powers.</p>` },
    { id: "l15", subject: "hist", topic: "World Wars", type: "summary", title: "Causes of WWI — 5-Minute Digest", est: "AI summary, 5 min", author: "Generated from your notes", rating: 4.2, saves: 310, mine: true },

    // CS / DSA
    { id: "l16", subject: "cs", topic: "Complexity", type: "flashcards", title: "Big-O Cheatsheet Cards", est: "16-card deck", author: "CS Study Group", rating: 4.7, saves: 6120, explore: true, reviewDue: 5,
      cards: [["Binary search","O(log n) on a sorted array."],["Merge sort","O(n log n) time, O(n) space, stable."],["Quick sort","O(n log n) average, O(n²) worst, in-place."],["Hash map lookup","O(1) average, O(n) worst (all collisions)."],["Heap push/pop","O(log n); peek is O(1)."],["BFS / DFS","O(V + E) with adjacency lists."],["Dijkstra (binary heap)","O((V + E) log V)."],["0/1 Knapsack DP","O(nW) time and space."],["Two pointers on sorted array","O(n) — e.g. pair sum."],["Sliding window","O(n) for fixed/growing window scans."],["Trie insert/search","O(L) for a word of length L."],["Matrix multiply (naive)","O(n³)."],["Amortized array append","O(1) average per push."],["Lower bound, comparison sort","Ω(n log n)."],["Kruskal / Prim MST","O(E log E) with a union-find / heap."],["Floyd–Warshall","O(V³) all-pairs shortest paths."]] },
    { id: "l17", subject: "cs", topic: "Graphs", type: "notes", title: "Graph Traversals: BFS & DFS Without the Fog", est: "11 min read", author: "Tanish R.", rating: 4.8, saves: 2980, explore: true,
      body: `<p>Both traversals visit every reachable node; the data structure you use decides the order.</p>
      <h4>BFS — queue</h4><ul><li>Explores level by level; shortest path in unweighted graphs.</li><li>Mark visited when you <em>enqueue</em>, not when you dequeue, or nodes queue up twice.</li></ul>
      <h4>DFS — stack (or recursion)</h4><ul><li>Dives deep first; the basis for topological sort, cycle detection, and connected components.</li><li>Recursion depth can blow the stack on long chains — use an explicit stack for 10⁵+ nodes.</li></ul>
      <h4>Picking one</h4><p>"Fewest steps?" → BFS. "Does a path/ordering exist?" → DFS. Weighted shortest path → Dijkstra or Bellman-Ford, neither is plain BFS.</p>` },
    { id: "l18", subject: "cs", topic: "Dynamic Programming", type: "video", title: "Dynamic Programming Patterns", est: "22 min video", author: "CS Study Group", rating: 4.9, saves: 4402, explore: true },

    // Exam prep contexts
    { id: "l19", subject: "bio", topic: "JEE / NEET Prep", type: "paper", title: "JEE Main Previous Year: Rotational Motion", est: "12 problems, 40 min", author: "JEE Physics", rating: 4.7, saves: 7310, explore: true },
    { id: "l20", subject: "hist", topic: "UPSC Prep", type: "notes", title: "Polity Basics: Fundamental Rights (Articles 12–35)", est: "15 min read", author: "UPSC Wall", rating: 4.6, saves: 3910, explore: true,
      body: `<p><strong>Article 14</strong> — Equality before law and equal protection of laws.</p>
      <p><strong>Article 19</strong> — Six freedoms: speech and expression, assembly, association, movement, residence, profession. Each carries reasonable-restriction clauses.</p>
      <p><strong>Article 21</strong> — Protection of life and personal liberty; the basis for the right-to-privacy reading in <em>Puttaswamy (2017)</em>.</p>
      <p><strong>Articles 25–28</strong> — Freedom of religion. <strong>Article 32</strong> — Constitutional remedies; Ambedkar called it the "heart and soul" of the Constitution.</p>
      <h4>Prelims trap</h4><p>Rights under Articles 20–21 remain available to <em>everyone</em>, citizens and non-citizens; most others in this block are citizen-only.</p>` },
    { id: "l21", subject: "calc2", topic: "SAT Prep", type: "quiz", title: "SAT Math: Heart of Algebra Drills", est: "10 questions, 9 min", author: "SAT Prep Circle", rating: 4.4, saves: 1830, explore: true,
      questions: [
        { q: "If 3x − 7 = 2x + 5, then x =", opts: ["2", "7", "12", "−12"], a: 2 },
        { q: "The slope of the line through (1, 2) and (4, 11) is:", opts: ["3", "1/3", "9", "2"], a: 0 },
        { q: "y = 2x + 6 crosses the y-axis at:", opts: ["(2, 0)", "(6, 0)", "(0, 6)", "(0, 2)"], a: 2 },
      ] },
  ];

  const CONTENT_TYPE_LABEL = {
    notes: "Notes", mindmap: "Mindmap", quiz: "Quiz", flashcards: "Flashcard deck",
    video: "Video lesson", paper: "Past paper / PDF", cheatsheet: "Cheat sheet", summary: "AI summary",
  };
  const CONTENT_TYPE_ICON = {
    notes: "file", mindmap: "network", quiz: "help", flashcards: "cards",
    video: "play", paper: "file", cheatsheet: "bolt", summary: "sparkle",
  };

  /* ---------- COMMUNITIES ---------- */
  const COMMUNITIES = [
    { id: "c1", name: "JEE Physics", members: 42100, initials: "JP", desc: "Mechanics to modern physics — doubts, solutions, and score reports." },
    { id: "c2", name: "NEET Biology", members: 68900, initials: "NB", desc: "NCERT line-by-line, diagrams, and last-mile revision." },
    { id: "c3", name: "CS Study Group", members: 31400, initials: "CS", desc: "DSA practice, project feedback, and interview prep." },
    { id: "c4", name: "Organic Chem Survivors", members: 18700, initials: "OC", desc: "Mechanisms, synthesis puzzles, and moral support." },
    { id: "c5", name: "AP World History", members: 12300, initials: "AW", desc: "LEQ practice, source analysis, and timeline trades." },
  ];

  const POSTS = [
    { id: "p1", community: "c2", flair: "doubt", author: "priya_neet26", time: "2h ago", upvotes: 128,
      title: "Why is the answer 'linkage' and not 'independent assortment' in this dihybrid question?",
      text: "NCERT exercise, Genetics unit: two genes 6 map units apart give way more parental-type offspring than 9:3:3:1 predicts. I keep defaulting to independent assortment — what's the trigger phrase in the question that should tell me otherwise?",
      comments: [
        { author: "bio_bhaiya", text: "Look for the distance. Anything under ~50 map units on the SAME chromosome means the genes are linked — recombination frequency < 50%. Independent assortment is the special case of genes on different chromosomes (or very far apart).", votes: 42 },
        { author: "meera.teaches", text: "Quick heuristic: if the parental phenotypes dominate the F2 counts, it's linkage. If you see a clean 9:3:3:1, it's independent assortment.", votes: 27 },
      ] },
    { id: "p2", community: "c1", flair: "resource", author: "tanish_r", time: "5h ago", upvotes: 341,
      title: "Made a one-page formula sheet for Rotational Motion — JEE Main 2021–2025 frequency tags included",
      text: "Every formula from torque to rolling motion, with a small tag showing how many times it appeared in the last five years of JEE Main. Moment of inertia table is on page 2. Feedback welcome before I post the SHM one.",
      comments: [ { author: "jee_aspirant_07", text: "The frequency tags are genius. I've been revising everything equally, which is obviously wrong.", votes: 55 } ] },
    { id: "p3", community: "c3", flair: "win", author: "hana.codes", time: "8h ago", upvotes: 512,
      title: "Solved my first hard DP problem without looking at the editorial — 0/1 Knapsack with space optimization",
      text: "Three weeks ago I couldn't even explain why the 1D array iterates backwards. Today I derived it myself on a whiteboard in 20 minutes. The flashcard deck in the Library ('Big-O Cheatsheet Cards') helped more than I expected.",
      comments: [
        { author: "arjun_p", text: "The backwards iteration clicked for me when I wrote out which previous-row cells each cell reads. Congrats!", votes: 38 },
        { author: "sofia_l", text: "This is the post I needed today. I'm still stuck on LCS.", votes: 12 },
      ] },
    { id: "p4", community: "c4", flair: "doubt", author: "grignard_gremlin", time: "11h ago", upvotes: 87,
      title: "PCC vs Jones reagent — when does the oxidation stop at the aldehyde?",
      text: "I know PCC stops at aldehyde for primary alcohols, but my professor says 'anhydrous conditions' like it explains everything. Why does water change the outcome?",
      comments: [ { author: "rohan_d", text: "Because the aldehyde only oxidizes further after it forms a hydrate (gem-diol), and that needs water. PCC in dry CH2Cl2 never makes the hydrate, so the reaction stops. Jones (aqueous acid) keeps hydrate forming, so you get the carboxylic acid.", votes: 61 } ] },
    { id: "p5", community: "c2", flair: "motivation", author: "night_owl_ishita", time: "1d ago", upvotes: 894,
      title: "Day 47 of the 11pm study session. The streak is the only reason I opened the book tonight.",
      text: "Not glamorous: 24 flashcards on human physiology and one past-paper question. But 47 days ago I was at zero. Whoever designed the streak flame knew exactly what they were doing.",
      comments: [ { author: "emberdesk_mod", text: "Consistency beats intensity every single time. 47 days is a rare tier — check your badge shelf.", votes: 104 } ] },
    { id: "p6", community: "c5", flair: "resource", author: "sofia_l", time: "1d ago", upvotes: 156,
      title: "Poll: which review format actually works for you?",
      poll: { question: "", options: [ { text: "Flashcards with spaced repetition", votes: 412 }, { text: "Rewriting notes from memory", votes: 233 }, { text: "Practice questions under a timer", votes: 388 }, { text: "Teaching it to a study room", votes: 129 } ] },
      comments: [] },
  ];

  /* ---------- ROOMS & GROUPS ---------- */
  const ROOMS = [
    { id: "r1", name: "Late Night NEET Grind", live: true, people: 6, capacity: 12, host: "ishita", focus: "NEET Biology — Human Physiology",
      members: [ { name: "Ishita", cam: false }, { name: "Dev", cam: true }, { name: "Aisha", cam: false }, { name: "Kabir", cam: true }, { name: "Meera", cam: false }, { name: "You", cam: false } ] },
    { id: "r2", name: "CS50 Study Hall", live: true, people: 11, capacity: 20, host: "tanish_r", focus: "Problem set 4 — memory & pointers",
      members: [ { name: "Tanish", cam: true }, { name: "Hana", cam: true }, { name: "Leo", cam: false }, { name: "Ava", cam: false } ] },
    { id: "r3", name: "Silent Library (cameras off)", live: true, people: 23, capacity: 50, host: "system", focus: "Any subject — pure body doubling",
      members: [] },
    { id: "r4", name: "JEE Maths Sprint", live: false, people: 0, capacity: 10, host: "arjun_p", focus: "Definite integrals — 6 problem sprint", members: [] },
  ];

  const GROUPS = [
    { id: "g1", name: "Bio Midterm Squad", members: 5, unread: 2,
      messages: [
        { author: "Dev", time: "9:41 PM", text: "Anyone else confused about epistasis vs dominance? The 12:3:1 ratio in Lab 4 isn't clicking." },
        { author: "Meera", time: "9:44 PM", text: "Dominance is between alleles of ONE gene. Epistasis is one GENE masking another gene entirely. The 12:3:1 is dominant epistasis." },
        { author: "Dev", time: "9:45 PM", text: "ohh that actually makes sense now" },
      ],
      threads: [ { name: "Lab 4 report", replies: 7, last: "Kabir: submitted the revised Punnett tables" } ] },
    { id: "g2", name: "DSA Daily Drill", members: 12, unread: 0,
      messages: [
        { author: "Tanish", time: "7:02 PM", text: "Today's problem: LeetCode 322 Coin Change. Post your recurrence before any code." },
        { author: "Hana", time: "7:20 PM", text: "dp[i] = min(dp[i - coin] + 1) for each coin ≤ i, dp[0] = 0." },
      ],
      threads: [ { name: "Graph week recap", replies: 23, last: "Leo: BFS vs Dijkstra summary posted" } ] },
  ];

  const FRIENDS = [
    { name: "Meera K", status: "Studying Organic Chemistry", online: true, level: 11 },
    { name: "Tanish R", status: "In CS50 Study Hall", online: true, level: 14 },
    { name: "Sofia L", status: "Last seen 2h ago", online: false, level: 9 },
    { name: "Hana S", status: "Studying Calculus II", online: true, level: 12 },
    { name: "Arjun P", status: "On a 3-day streak freeze", online: false, level: 8 },
  ];

  /* ---------- LEADERBOARD ---------- */
  /* League ladder in the product's own language: graphite up to gilt. */
  const LEAGUES = ["Graphite", "Slate", "Obsidian", "Brass", "Aurum", "Gilt", "Sovereign"];
  const LEADERBOARD = [
    { name: "Tanish R", xp: 3820, avatarColor: "#0B0B0A", level: 14 },
    { name: "Meera K", xp: 3540, avatarColor: "#2A2A27", level: 11 },
    { name: "Hana S", xp: 3390, avatarColor: "#454540", level: 12 },
    { name: "sofia_leq", xp: 3110, avatarColor: "#5F5F5A", level: 10 },
    { name: "arjun_p", xp: 2870, avatarColor: "#7C7C75", level: 8 },
    { name: "priya_neet26", xp: 2640, avatarColor: "#96968F", level: 9 },
    { name: "hana.codes", xp: 2510, avatarColor: "#0B0B0A", level: 12 },
    { name: "You", xp: 0, avatarColor: "", level: 0, me: true },   // filled from state at render
    { name: "grignard_gremlin", xp: 2180, avatarColor: "#2A2A27", level: 7 },
    { name: "night_owl_ishita", xp: 1990, avatarColor: "#454540", level: 8 },
    { name: "dev_bio", xp: 1720, avatarColor: "#5F5F5A", level: 6 },
    { name: "kabir.m", xp: 1540, avatarColor: "#7C7C75", level: 6 },
    { name: "leo_ptr", xp: 1310, avatarColor: "#96968F", level: 5 },
    { name: "ava_stack", xp: 1105, avatarColor: "#0B0B0A", level: 4 },
    { name: "jay_hist", xp: 880, avatarColor: "#2A2A27", level: 4 },
  ];

  /* ---------- BADGES — specific unlock conditions, never vague ---------- */
  const BADGES = [
    { id: "b1", cat: "Consistency", name: "7-Day Flame", cond: "Keep a 7-day study streak", icon: "flame", tier: "common", earned: true },
    { id: "b2", cat: "Consistency", name: "Night Owl", cond: "Finish a session after 10 PM", icon: "moon", tier: "common", earned: true },
    { id: "b3", cat: "Consistency", name: "Month Keeper", cond: "Reach a 30-day streak", icon: "calendar", tier: "rare", earned: false, progress: "12 / 30 days" },
    { id: "b4", cat: "Mastery", name: "Clean Sweep", cond: "Score 100% on a 20+ card deck review", icon: "target", tier: "common", earned: true },
    { id: "b5", cat: "Mastery", name: "Genetics Guru", cond: "Finish every Genetics item in Biology", icon: "dna", tier: "rare", earned: false, progress: "3 / 4 items" },
    { id: "b6", cat: "Mastery", name: "Mechanism Machine", cond: "Answer 200 organic chemistry questions correctly", icon: "flask", tier: "legendary", earned: false, progress: "143 / 200" },
    { id: "b7", cat: "Social", name: "First Answer", cond: "Answer a Doubt post in any community", icon: "comment", tier: "common", earned: true },
    { id: "b8", cat: "Social", name: "Room Regular", cond: "Join study rooms on 5 different days", icon: "sofa", tier: "rare", earned: false, progress: "2 / 5 days" },
    { id: "b9", cat: "Explorer", name: "Board Builder", cond: "Place 10 widgets across your boards", icon: "pin", tier: "common", earned: true },
    { id: "b10", cat: "Explorer", name: "Librarian", cond: "Save 25 items to your library", icon: "book", tier: "rare", earned: false, progress: "18 / 25 saved" },
    { id: "b11", cat: "Explorer", name: "Firefly Whisperer", cond: "Fully customize Ember, then study with lights off (dark mode) for a week", icon: "sparkle", tier: "legendary", earned: false, progress: "3 / 7 nights" },
  ];

  /* ---------- QUESTS (variable pool — rotates weekly) ---------- */
  const QUESTS = [
    { id: "q1", title: "Review 20 flashcards", cur: 12, goal: 20, xp: 30, period: "daily" },
    { id: "q2", title: "Complete one focus session", cur: 0, goal: 1, xp: 40, period: "daily" },
    { id: "q3", title: "Earn 300 XP", cur: 240, goal: 300, xp: 50, period: "weekly" },
    { id: "q4", title: "Help 3 classmates in communities", cur: 1, goal: 3, xp: 60, period: "weekly" },
    { id: "q5", title: "Study 4 different subjects", cur: 2, goal: 4, xp: 45, period: "weekly" },
  ];

  /* ---------- BOARD TEMPLATES ---------- */
  const BOARD_TEMPLATES = [
    { id: "blank", name: "Blank", desc: "An empty desk. Your call.", icon: "square" },
    { id: "countdown", name: "Exam Countdown", desc: "Days-left counter, syllabus checklist, and formula sheet.", icon: "hourglass" },
    { id: "planner", name: "Daily Planner", desc: "To-do list, habit tracker, and a pomodoro to keep the clock honest.", icon: "calendar" },
    { id: "mindmap", name: "Mindmap Hub", desc: "Big mindmap canvas with sticky notes around the edges.", icon: "network" },
  ];

  const DEFAULT_BOARDS = [
    {
      id: "board-bio", name: "Bio Midterm",
      widgets: [
        { id: "w1", type: "countdown", x: 60, y: 50, w: 250, h: 210, rot: -1.2,
          config: { exam: "Biology Midterm", date: futureDate(9) } },
        { id: "w2", type: "todo", x: 350, y: 40, w: 300, h: 290, rot: 0.8,
          config: { title: "Midterm checklist", items: [
            { text: "Reread Mendelian Genetics notes", done: true },
            { text: "Genetics Vocabulary deck — daily 8", done: true },
            { text: "Meiosis vs Mitosis mindmap", done: false },
            { text: "Inheritance Patterns Check quiz", done: false },
            { text: "Lab 4 report revision", done: false },
          ] } },
        { id: "w3", type: "flashcards", x: 60, y: 300, w: 300, h: 330, rot: 1.4,
          config: { deckTitle: "Genetics Vocabulary", libId: "l2" } },
        { id: "w4", type: "note", x: 700, y: 60, w: 230, h: 220, rot: -2,
          config: { text: "Test cross trick:\nunknown tall × tt\n→ any short kids = Tt parent", color: "yellow" } },
        { id: "w5", type: "pomodoro", x: 700, y: 320, w: 250, h: 300, rot: 0.6,
          config: {} },
      ],
    },
    {
      id: "board-planner", name: "Daily Planner",
      widgets: [
        { id: "w6", type: "habit", x: 60, y: 50, w: 300, h: 240, rot: -0.8,
          config: { habit: "20 min/day commitment", done: [true, true, false, true, true, true, false, true, true, true, false, true, true, false] } },
        { id: "w7", type: "room", x: 400, y: 60, w: 280, h: 200, rot: 1.2,
          config: { roomId: "r1" } },
      ],
    },
    { id: "board-hist", name: "World History Unit 4", widgets: [] },  // empty-state showcase
  ];

  function futureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /* Streak heatmap history — deterministic pseudo-random, honest shape */
  const HEATMAP_HISTORY = (() => {
    const out = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 111; i >= 1; i--) {
      const r = rnd();
      let level = 0;
      if (r > 0.28) level = 1;
      if (r > 0.6) level = 2;
      if (r > 0.86) level = 3;
      // recent stretch should read as a hot streak
      if (i <= 14 && r > 0.12) level = Math.max(level, 2);
      if (i <= 14 && i > 12) level = 3;
      out.push(level);
    }
    return out;
  })();

  return {
    SUBJECTS, EXAMS, LIBRARY, CONTENT_TYPE_LABEL, CONTENT_TYPE_ICON,
    COMMUNITIES, POSTS, ROOMS, GROUPS, FRIENDS,
    LEAGUES, LEADERBOARD, BADGES, QUESTS,
    BOARD_TEMPLATES, DEFAULT_BOARDS, HEATMAP_HISTORY, futureDate,
  };
})();
