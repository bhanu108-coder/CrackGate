import {
  BranchCode,
  DailyStudyLog,
  GatePulseState,
  LectureItem,
  MockQuestion,
  MockTestAttempt,
  SyllabusSubject,
} from '../types/gate';

export const GATE_BRANCHES: {
  code: BranchCode;
  name: string;
  shortName: string;
  paperCode: string;
  QualifyingCutoff: number;
  topRankTarget: number;
}[] = [
  {
    code: 'CS',
    name: 'Computer Science & Information Technology',
    shortName: 'Computer Science',
    paperCode: 'GATE CS',
    QualifyingCutoff: 28.5,
    topRankTarget: 72.0,
  },
  {
    code: 'DA',
    name: 'Data Science & Artificial Intelligence',
    shortName: 'Data Science & AI',
    paperCode: 'GATE DA',
    QualifyingCutoff: 32.0,
    topRankTarget: 75.0,
  },
  {
    code: 'EC',
    name: 'Electronics & Communication Engineering',
    shortName: 'Electronics & Comm.',
    paperCode: 'GATE EC',
    QualifyingCutoff: 26.0,
    topRankTarget: 65.0,
  },
  {
    code: 'EE',
    name: 'Electrical Engineering',
    shortName: 'Electrical Engg.',
    paperCode: 'GATE EE',
    QualifyingCutoff: 25.5,
    topRankTarget: 64.0,
  },
  {
    code: 'ME',
    name: 'Mechanical Engineering',
    shortName: 'Mechanical Engg.',
    paperCode: 'GATE ME',
    QualifyingCutoff: 30.0,
    topRankTarget: 74.0,
  },
  {
    code: 'CE',
    name: 'Civil Engineering',
    shortName: 'Civil Engineering',
    paperCode: 'GATE CE',
    QualifyingCutoff: 27.5,
    topRankTarget: 68.0,
  },
];

export const INITIAL_SUBJECTS: SyllabusSubject[] = [
  // ==================== DA BRANCH (ALL 8 OFFICIAL SUBJECTS AT 0% PROGRESS) ====================
  {
    id: 'da-prob',
    branch: 'DA',
    code: 'DA-01',
    name: 'Probability and Statistics',
    weightageMarks: 16,
    topics: [
      { id: 'da-pr1', name: 'Counting, Permutations, Combinations & Probability Axioms', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-pr2', name: 'Sample Space, Conditional Probability & Bayes Theorem', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-pr3', name: 'Random Variables, Expectation, Variance, Covariance & Correlation', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'da-pr4', name: 'Discrete & Continuous Distributions (Binomial, Poisson, Normal, Exponential, t, Chi-Square)', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'da-pr5', name: 'Central Limit Theorem, MLE, Confidence Intervals & Hypothesis Testing (z, t, χ²)', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
    ],
  },
  {
    id: 'da-la',
    branch: 'DA',
    code: 'DA-02',
    name: 'Linear Algebra',
    weightageMarks: 12,
    topics: [
      { id: 'da-la1', name: 'Vector Spaces, Subspaces, Linear Dependence & Independence', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-la2', name: 'Projection, Orthogonal, Idempotent, Partition Matrices & Quadratic Forms', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-la3', name: 'Systems of Linear Equations, Gaussian Elimination, Rank & Nullity', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-la4', name: 'Eigenvalues, Eigenvectors, Determinant & Spectral Decomposition', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-la5', name: 'LU Decomposition & Singular Value Decomposition (SVD)', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
    ],
  },
  {
    id: 'da-calc',
    branch: 'DA',
    code: 'DA-03',
    name: 'Calculus and Optimization',
    weightageMarks: 10,
    topics: [
      { id: 'da-ca1', name: 'Functions of a Single Variable, Limits, Continuity & Differentiability', status: 'not_started', studiedHours: 0, targetHours: 9, isHighYield: true },
      { id: 'da-ca2', name: 'Taylor Series Approximations & Mean Value Theorems', status: 'not_started', studiedHours: 0, targetHours: 8 },
      { id: 'da-ca3', name: 'Maxima, Minima, Convexity & Single-Variable Optimization', status: 'not_started', studiedHours: 0, targetHours: 11, isHighYield: true },
      { id: 'da-ca4', name: 'Gradient Descent Convergence & Unconstrained Optimization Basics', status: 'not_started', studiedHours: 0, targetHours: 8, isHighYield: true },
    ],
  },
  {
    id: 'da-pdsa',
    branch: 'DA',
    code: 'DA-04',
    name: 'Programming, Data Structures and Algorithms',
    weightageMarks: 15,
    topics: [
      { id: 'da-pd1', name: 'Programming in Python (List Comprehensions, Recursion, Scope & OOP)', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-pd2', name: 'Linear Data Structures: Stacks, Queues, Linked Lists & Hash Tables', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-pd3', name: 'Search & Sorting: Binary Search, Insertion, Merge Sort & Quick Sort', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-pd4', name: 'Trees, Binary Search Trees & Heaps', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-pd5', name: 'Graph Theory Basics, BFS/DFS Traversals & Shortest Path Algorithms', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'da-dbdw',
    branch: 'DA',
    code: 'DA-05',
    name: 'Database Management and Warehousing',
    weightageMarks: 8,
    topics: [
      { id: 'da-db1', name: 'ER-Model, Relational Algebra, Tuple Relational Calculus & SQL Queries', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-db2', name: 'Integrity Constraints, Functional Dependencies & Normal Forms', status: 'not_started', studiedHours: 0, targetHours: 8, isHighYield: true },
      { id: 'da-db3', name: 'File Organization, B/B+ Tree Indexing & Data Transformation (Normalization, Sampling, Compression)', status: 'not_started', studiedHours: 0, targetHours: 8 },
      { id: 'da-db4', name: 'Data Warehouse Modelling: Star/Snowflake Schema, Concept Hierarchies & OLAP Operations', status: 'not_started', studiedHours: 0, targetHours: 8, isHighYield: true },
    ],
  },
  {
    id: 'da-ml',
    branch: 'DA',
    code: 'DA-06',
    name: 'Machine Learning',
    weightageMarks: 13,
    topics: [
      { id: 'da-ml1', name: 'Regression: Simple/Multiple Linear Regression, Ridge Regression & Closed-Form OLS', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-ml2', name: 'Classification: Logistic Regression, k-NN, Naive Bayes, LDA & Decision Trees', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'da-ml3', name: 'Support Vector Machines (SVM), Margin Maximization & Kernel Trick', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-ml4', name: 'Bias-Variance Trade-Off, Cross-Validation (LOO, k-Fold) & MLP Neural Networks', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'da-ml5', name: 'Unsupervised Learning: k-Means/k-Medoids, Hierarchical Clustering & PCA', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'da-ai',
    branch: 'DA',
    code: 'DA-07',
    name: 'Artificial Intelligence',
    weightageMarks: 11,
    topics: [
      { id: 'da-ai1', name: 'Uninformed & Informed Search (BFS, UCS, Greedy, A* Admissibility & Consistency)', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-ai2', name: 'Adversarial Search: Minimax Algorithm & Alpha-Beta Pruning', status: 'not_started', studiedHours: 0, targetHours: 8, isHighYield: true },
      { id: 'da-ai3', name: 'Propositional Logic & First-Order Predicate Logic Inference', status: 'not_started', studiedHours: 0, targetHours: 8, isHighYield: true },
      { id: 'da-ai4', name: 'Reasoning under Uncertainty: Bayesian Networks, d-Separation, Variable Elimination & Sampling', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'da-ga',
    branch: 'DA',
    code: 'DA-08',
    name: 'General Aptitude (GA)',
    weightageMarks: 15,
    topics: [
      { id: 'da-ga1', name: 'Quantitative Aptitude (Data Interpretation, Ratios, Powers & Logarithms)', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'da-ga2', name: 'Analytical & Logical Reasoning (Deduction, Seating & Coding)', status: 'not_started', studiedHours: 0, targetHours: 8, isHighYield: true },
      { id: 'da-ga3', name: 'Spatial Aptitude (Paper Folding, Rotation, Mirroring & Grouping)', status: 'not_started', studiedHours: 0, targetHours: 6 },
      { id: 'da-ga4', name: 'Verbal Ability (Reading Comprehension, Critical Reasoning & Grammar)', status: 'not_started', studiedHours: 0, targetHours: 6 },
    ],
  },

  // ==================== CS BRANCH (0% PROGRESS) ====================
  {
    id: 'cs-math',
    branch: 'CS',
    code: 'CS-01',
    name: 'Engineering & Discrete Mathematics',
    weightageMarks: 15,
    topics: [
      { id: 'cs-m1', name: 'Propositional & First-Order Logic', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'cs-m2', name: 'Graph Theory & Combinatorics', status: 'not_started', studiedHours: 0, targetHours: 15, isHighYield: true },
      { id: 'cs-m3', name: 'Linear Algebra: Eigenvalues & Rank', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'cs-m4', name: 'Probability Distributions & Bayes Theorem', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'cs-os',
    branch: 'CS',
    code: 'CS-02',
    name: 'Operating Systems',
    weightageMarks: 10,
    topics: [
      { id: 'cs-os1', name: 'CPU Scheduling & Process Synchronization', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'cs-os2', name: 'Deadlocks & Banker Algorithm', status: 'not_started', studiedHours: 0, targetHours: 8 },
      { id: 'cs-os3', name: 'Virtual Memory, Paging & TLB Hit Ratio', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'cs-os4', name: 'File Systems & Disk Scheduling', status: 'not_started', studiedHours: 0, targetHours: 8 },
    ],
  },
  {
    id: 'cs-algo',
    branch: 'CS',
    code: 'CS-03',
    name: 'Data Structures & Algorithms',
    weightageMarks: 14,
    topics: [
      { id: 'cs-al1', name: 'Asymptotic Analysis & Recurrence Relations', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'cs-al2', name: 'Trees, Binary Heaps & AVL Rotations', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'cs-al3', name: 'Dynamic Programming & Greedy Paradigm', status: 'not_started', studiedHours: 0, targetHours: 16, isHighYield: true },
      { id: 'cs-al4', name: 'Shortest Paths & Minimum Spanning Trees', status: 'not_started', studiedHours: 0, targetHours: 12 },
    ],
  },
  {
    id: 'cs-cn',
    branch: 'CS',
    code: 'CS-04',
    name: 'Computer Networks',
    weightageMarks: 9,
    topics: [
      { id: 'cs-cn1', name: 'IPv4 Subnetting, CIDR & Supernetting', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'cs-cn2', name: 'Sliding Window Protocols (Stop-and-Wait, GBN, SR)', status: 'not_started', studiedHours: 0, targetHours: 11, isHighYield: true },
      { id: 'cs-cn3', name: 'TCP Congestion Control & Flow Control', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'cs-cn4', name: 'Distance Vector & Link State Routing', status: 'not_started', studiedHours: 0, targetHours: 8 },
    ],
  },
  {
    id: 'cs-dbms',
    branch: 'CS',
    code: 'CS-05',
    name: 'Database Management Systems',
    weightageMarks: 8,
    topics: [
      { id: 'cs-db1', name: 'Functional Dependencies & Normal Forms (BCNF/3NF)', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'cs-db2', name: 'Relational Algebra & SQL Aggregations', status: 'not_started', studiedHours: 0, targetHours: 10 },
      { id: 'cs-db3', name: 'Conflict Serializability & 2PL Concurrency', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'cs-db4', name: 'B and B+ Tree Indexing Structure', status: 'not_started', studiedHours: 0, targetHours: 8, isHighYield: true },
    ],
  },
  {
    id: 'cs-coa',
    branch: 'CS',
    code: 'CS-06',
    name: 'Computer Organization & Architecture',
    weightageMarks: 10,
    topics: [
      { id: 'cs-co1', name: 'Cache Memory Mapping & Average Memory Access Time', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'cs-co2', name: '5-Stage Instruction Pipelining & Hazards', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'cs-co3', name: 'IEEE-754 Floating Point Representation', status: 'not_started', studiedHours: 0, targetHours: 6 },
    ],
  },
  {
    id: 'cs-toc',
    branch: 'CS',
    code: 'CS-07',
    name: 'Theory of Computation & Compilers',
    weightageMarks: 12,
    topics: [
      { id: 'cs-tc1', name: 'DFA/NFA, Regular Languages & Myhill-Nerode', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'cs-tc2', name: 'PDA, Context-Free Grammars & LL(1)/LR Parsing', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'cs-tc3', name: 'Decidability, Rice Theorem & Halting Reductions', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
    ],
  },

  // ==================== EC BRANCH (0% PROGRESS) ====================
  {
    id: 'ec-net',
    branch: 'EC',
    code: 'EC-01',
    name: 'Network Theory & Signals',
    weightageMarks: 18,
    topics: [
      { id: 'ec-n1', name: 'Thevenin, Norton & Maximum Power Transfer', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ec-n2', name: 'Transient Analysis of RLC Circuits', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ec-n3', name: 'Continuous & Discrete Fourier Transforms', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ec-n4', name: 'Two-Port Network Parameters (Z, Y, h, ABCD)', status: 'not_started', studiedHours: 0, targetHours: 10 },
    ],
  },
  {
    id: 'ec-edc',
    branch: 'EC',
    code: 'EC-02',
    name: 'Electronic Devices & Analog Circuits',
    weightageMarks: 19,
    topics: [
      { id: 'ec-e1', name: 'Fermi Level, Carrier Transport & PN Junctions', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ec-e2', name: 'MOSFET Capacitance & Threshold Voltage', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ec-e3', name: 'Operational Amplifiers & Negative Feedback', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'ec-comm',
    branch: 'EC',
    code: 'EC-03',
    name: 'Communication Systems & Electromagnetics',
    weightageMarks: 22,
    topics: [
      { id: 'ec-c1', name: 'PCM, Quantization Noise & Nyquist Sampling', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ec-c2', name: 'Matched Filter, BER in AWGN & Shannon Capacity', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ec-c3', name: 'Transmission Lines, VSWR & Smith Chart', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'ec-ctrl',
    branch: 'EC',
    code: 'EC-04',
    name: 'Control Systems & Digital Design',
    weightageMarks: 18,
    topics: [
      { id: 'ec-ct1', name: 'Routh-Hurwitz, Root Locus & Bode Plots', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ec-ct2', name: 'Nyquist Stability Criterion & State Space', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'ec-ct3', name: 'Sequential Counters, Setup/Hold Time & FSM', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },

  // ==================== EE BRANCH (0% PROGRESS) ====================
  {
    id: 'ee-mach',
    branch: 'EE',
    code: 'EE-01',
    name: 'Electrical Machines',
    weightageMarks: 14,
    topics: [
      { id: 'ee-m1', name: 'Single & Three-Phase Transformers Efficiency', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ee-m2', name: '3-Phase Induction Motor Torque-Slip Characteristics', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ee-m3', name: 'Synchronous Generators & Voltage Regulation', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'ee-ps',
    branch: 'EE',
    code: 'EE-02',
    name: 'Power Systems',
    weightageMarks: 14,
    topics: [
      { id: 'ee-p1', name: 'Per-Unit System, Y-Bus & Newton-Raphson Load Flow', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ee-p2', name: 'Symmetrical & Unsymmetrical Fault Analysis', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ee-p3', name: 'Equal Area Criterion & Rotor Angle Stability', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
    ],
  },
  {
    id: 'ee-pe',
    branch: 'EE',
    code: 'EE-03',
    name: 'Power Electronics & Control Systems',
    weightageMarks: 20,
    topics: [
      { id: 'ee-pe1', name: 'DC-DC Buck, Boost & Buck-Boost Converters', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ee-pe2', name: 'Single & 3-Phase Thyristor Controlled Rectifiers', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ee-pe3', name: 'Frequency Response, Bode & Nyquist Stability', status: 'not_started', studiedHours: 0, targetHours: 12 },
    ],
  },

  // ==================== ME BRANCH (0% PROGRESS) ====================
  {
    id: 'me-thermo',
    branch: 'ME',
    code: 'ME-01',
    name: 'Thermodynamics & Heat Transfer',
    weightageMarks: 20,
    topics: [
      { id: 'me-t1', name: 'First & Second Law, Entropy & Exergy Analysis', status: 'not_started', studiedHours: 0, targetHours: 15, isHighYield: true },
      { id: 'me-t2', name: 'Rankine, Brayton & Vapor Compression Cycles', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'me-t3', name: 'Conduction, Biot Number & LMTD Heat Exchangers', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'me-som',
    branch: 'ME',
    code: 'ME-02',
    name: 'Strength of Materials & Theory of Machines',
    weightageMarks: 19,
    topics: [
      { id: 'me-s1', name: 'Mohr Circle, Principal Stresses & Bending Moment', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'me-s2', name: 'Deflection of Beams & Euler Buckling of Columns', status: 'not_started', studiedHours: 0, targetHours: 12 },
      { id: 'me-s3', name: 'Natural Frequency, Damping & Gear Trains', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'me-mfg',
    branch: 'ME',
    code: 'ME-03',
    name: 'Manufacturing & Industrial Engineering',
    weightageMarks: 22,
    topics: [
      { id: 'me-m1', name: 'Merchant Circle, Taylor Tool Life & Metal Cutting', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'me-m2', name: 'Casting Solidification (Chvorinov Rule) & Rolling', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'me-m3', name: 'EOQ Inventory Models, PERT/CPM & Simplex', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },

  // ==================== CE BRANCH (0% PROGRESS) ====================
  {
    id: 'ce-geotech',
    branch: 'CE',
    code: 'CE-01',
    name: 'Geotechnical Engineering',
    weightageMarks: 16,
    topics: [
      { id: 'ce-g1', name: 'Three-Phase Soil Relationships & Effective Stress', status: 'not_started', studiedHours: 0, targetHours: 14, isHighYield: true },
      { id: 'ce-g2', name: 'Terzaghi 1D Consolidation & Settlement Analysis', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ce-g3', name: 'Mohr-Coulomb Shear Strength & Bearing Capacity', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
  {
    id: 'ce-env',
    branch: 'CE',
    code: 'CE-02',
    name: 'Environmental Engineering',
    weightageMarks: 13,
    topics: [
      { id: 'ce-e1', name: 'BOD Kinetics, DO Sag Curve & Sedimentation', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ce-e2', name: 'Activated Sludge Process & Trickling Filters', status: 'not_started', studiedHours: 0, targetHours: 10, isHighYield: true },
      { id: 'ce-e3', name: 'Air Pollution Plume Dispersion & Alkalinity', status: 'not_started', studiedHours: 0, targetHours: 8 },
    ],
  },
  {
    id: 'ce-trans',
    branch: 'CE',
    code: 'CE-03',
    name: 'Transportation & Fluid Mechanics',
    weightageMarks: 18,
    topics: [
      { id: 'ce-t1', name: 'Stopping Sight Distance, Superelevation & OSD', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ce-t2', name: 'Greenshields Traffic Flow & Webster Signal Design', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
      { id: 'ce-t3', name: 'Open Channel Flow, Specific Energy & Hydraulic Jump', status: 'not_started', studiedHours: 0, targetHours: 12, isHighYield: true },
    ],
  },
];

export const INITIAL_QUESTIONS: MockQuestion[] = [];

export const INITIAL_STUDY_LOGS: DailyStudyLog[] = [];

export const INITIAL_TEST_ATTEMPTS: MockTestAttempt[] = [];

export const INITIAL_LECTURES: LectureItem[] = [];

export const DEFAULT_GATE_PULSE_STATE: GatePulseState = {
  activeBranch: 'CS',
  targetExamDate: '2027-02-07',
  dailyHourGoal: 6,
  subjects: INITIAL_SUBJECTS,
  studyLogs: INITIAL_STUDY_LOGS,
  questions: INITIAL_QUESTIONS,
  testAttempts: INITIAL_TEST_ATTEMPTS,
  lectures: INITIAL_LECTURES,
  diagnosticsByBranch: {},
};
